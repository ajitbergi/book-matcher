const OL_FIELDS = 'key,title,author_name,author_key,first_publish_year,cover_i,subject,number_of_pages_median,ratings_average,ratings_count,first_sentence';

// ── Open Library ──────────────────────────────────────────────
async function fetchOpenLibrary(categoryId, limit = 20, offset = 0) {
  const subject = OL_SUBJECTS[categoryId] || 'fiction';
  const url = `https://openlibrary.org/search.json?subject=${encodeURIComponent(subject)}&limit=${limit}&offset=${offset}&fields=${OL_FIELDS}&language=eng`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open Library error: ${res.status}`);
  const data = await res.json();
  return (data.docs || []).map(doc => normalizeOLBook(doc, categoryId));
}

async function fetchByAuthor(author) {
  const url = `https://openlibrary.org/search.json?author=${encodeURIComponent(author)}&limit=8&fields=${OL_FIELDS}&language=eng`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.docs || []).map(doc => normalizeOLBook(doc, null));
}

function normalizeOLBook(doc, categoryId) {
  const coverId = doc.cover_i;
  const cover = coverId
    ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
    : null;
  const key = doc.key || '';
  const link = key ? `https://openlibrary.org${key}` : null;

  let description = '';
  if (doc.first_sentence) {
    description = typeof doc.first_sentence === 'string'
      ? doc.first_sentence
      : doc.first_sentence.value || '';
  }

  return {
    id: 'ol_' + key.replace('/works/', ''),
    title: doc.title || 'Unknown Title',
    author: (doc.author_name || ['Unknown Author']).slice(0, 2).join(', '),
    description,
    cover,
    link,
    genres: (doc.subject || []).slice(0, 4),
    pageCount: doc.number_of_pages_median || null,
    published: doc.first_publish_year ? String(doc.first_publish_year) : null,
    rating: doc.ratings_average ? Math.round(doc.ratings_average * 10) / 10 : null,
    ratingsCount: doc.ratings_count || 0,
    source: 'openlibrary',
    category: categoryId,
  };
}

// ── NYT Books ────────────────────────────────────────────────
async function fetchNYTList(listSlug) {
  const key = getNYTKey();
  if (!key) throw new Error('No NYT API key');
  const url = `https://api.nytimes.com/svc/books/v3/lists/current/${listSlug}.json?api-key=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`NYT error: ${res.status}`);
  const data = await res.json();
  return (data.results?.books || []).map(normalizeNYTBook);
}

function normalizeNYTBook(b) {
  return {
    id: 'nyt_' + b.primary_isbn13,
    title: b.title,
    author: b.author,
    description: b.description || '',
    cover: b.book_image || null,
    link: b.amazon_product_url || null,
    genres: [],
    pageCount: null,
    published: null,
    rating: null,
    ratingsCount: 0,
    source: 'nyt',
    category: null,
    nytRank: b.rank,
    weeksOnList: b.weeks_on_list,
  };
}

// ── Quality filter ────────────────────────────────────────────
function isGoodBook(book) {
  if (!book.cover) return false;
  if (book.source === 'nyt') return true;
  if (book.rating !== null) {
    if (book.rating < 4.0) return false;
    if (book.ratingsCount < 20) return false;
  }
  return true;
}

// ── Weighted category selection ───────────────────────────────
function pickWeightedCategories(categories, stats, n) {
  const scored = categories.map(id => {
    const s = stats[id] || { right: 0, left: 0 };
    const total = s.right + s.left;
    const score = total >= 5 ? (s.right / total) : 0.5;
    return { id, score: Math.max(score, 0.1) };
  });

  const picked = [];
  const pool = [...scored];
  while (picked.length < n && pool.length > 0) {
    const totalWeight = pool.reduce((sum, c) => sum + c.score, 0);
    let r = Math.random() * totalWeight;
    for (let i = 0; i < pool.length; i++) {
      r -= pool[i].score;
      if (r <= 0) {
        picked.push(pool[i].id);
        pool.splice(i, 1);
        break;
      }
    }
  }
  return picked;
}

// ── Book pool manager ─────────────────────────────────────────
async function fetchBookPool(categories, count = 30) {
  const seen = getSeen();
  const seen_set = new Set(seen);
  const stats = getSwipeStats();
  const books = [];

  const cats = pickWeightedCategories(categories, stats, Math.min(3, categories.length));

  for (const catId of cats) {
    try {
      const nytSlug = NYT_LISTS[catId];
      if (nytSlug && getNYTKey()) {
        const nytBooks = await fetchNYTList(nytSlug);
        books.push(...nytBooks);
      }
      const offset = Math.floor(Math.pow(Math.random(), 2) * 60);
      const olBooks = await fetchOpenLibrary(catId, 20, offset);
      books.push(...olBooks);
    } catch (e) {
      console.warn('Fetch error for', catId, e.message);
    }
  }

  // Author discovery
  const liked = getLiked();
  if (liked.length > 0) {
    const authors = [...new Set(liked.map(b => b.author))];
    const pick = authors[Math.floor(Math.random() * authors.length)];
    try {
      const authorBooks = await fetchByAuthor(pick);
      books.push(...authorBooks);
    } catch (e) {}
  }

  // Deduplicate, filter seen, apply quality filter
  const ids = new Set();
  const unique = [];
  for (const b of books) {
    if (!ids.has(b.id) && !seen_set.has(b.id) && b.title && isGoodBook(b)) {
      ids.add(b.id);
      unique.push(b);
    }
  }

  return unique.sort(() => Math.random() - 0.5).slice(0, count);
}
