// ── Google Books ──────────────────────────────────────────────
async function fetchGoogleBooks(categoryId, maxResults = 20, startIndex = 0) {
  const key = getGBooksKey();
  if (!key) throw new Error('No Google Books API key');
  const subject = GBOOKS_SUBJECTS[categoryId] || 'subject:fiction';
  const url = `https://www.googleapis.com/books/v1/volumes?q=${subject}&orderBy=relevance&maxResults=${maxResults}&startIndex=${startIndex}&printType=books&langRestrict=en&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google Books error: ${res.status}`);
  const data = await res.json();
  return (data.items || []).map(item => normalizeGBook(item, categoryId));
}

async function fetchByAuthor(author) {
  const key = getGBooksKey();
  if (!key) return [];
  const q = encodeURIComponent(`inauthor:"${author}"`);
  const url = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=8&orderBy=relevance&printType=books&langRestrict=en&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items || []).map(item => normalizeGBook(item, null));
}

function normalizeGBook(item, categoryId) {
  const v = item.volumeInfo || {};
  return {
    id: item.id,
    title: v.title || 'Unknown Title',
    author: (v.authors || ['Unknown Author']).join(', '),
    description: v.description || '',
    cover: v.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
    link: v.infoLink?.replace('http:', 'https:') || null,
    genres: v.categories || [],
    pageCount: v.pageCount || null,
    published: v.publishedDate?.split('-')[0] || null,
    rating: v.averageRating || null,
    ratingsCount: v.ratingsCount || 0,
    source: 'google',
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
  if (book.description.length < 80) return false;
  // NYT books are pre-curated — always pass
  if (book.source === 'nyt') return true;
  // For rated books: min 3.5 stars and at least 20 ratings
  if (book.rating !== null) {
    if (book.rating < 4.0) return false;
    if (book.ratingsCount < 20) return false;
  }
  return true;
}

// ── Weighted category selection ───────────────────────────────
// Categories with higher right-swipe rate get more slots
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

  // Weighted category pick — genres the user likes more get more slots
  const cats = pickWeightedCategories(categories, stats, Math.min(3, categories.length));

  for (const catId of cats) {
    try {
      const nytSlug = NYT_LISTS[catId];
      if (nytSlug && getNYTKey()) {
        const nytBooks = await fetchNYTList(nytSlug);
        books.push(...nytBooks);
      }
      // Vary startIndex but favour lower values (more popular results)
      const startIndex = Math.floor(Math.pow(Math.random(), 2) * 40);
      const gbBooks = await fetchGoogleBooks(catId, 20, startIndex);
      books.push(...gbBooks);
    } catch (e) {
      console.warn('Fetch error for', catId, e.message);
    }
  }

  // Author discovery — fetch more from authors the user already liked
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
