// ── Google Books ──────────────────────────────────────────────
async function fetchGoogleBooks(categoryId, maxResults = 20, startIndex = 0) {
  const key = getGBooksKey();
  if (!key) throw new Error('No Google Books API key');
  const subject = GBOOKS_SUBJECTS[categoryId] || 'subject:fiction';
  const url = `https://www.googleapis.com/books/v1/volumes?q=${subject}&orderBy=relevance&maxResults=${maxResults}&startIndex=${startIndex}&printType=books&langRestrict=en&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google Books error: ${res.status}`);
  const data = await res.json();
  return (data.items || []).map(normalizeGBook);
}

function normalizeGBook(item) {
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
    source: 'google',
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
    source: 'nyt',
    nytRank: b.rank,
    weeksOnList: b.weeks_on_list,
  };
}

// ── Book pool manager ─────────────────────────────────────────
// Fetches a mixed pool of books for the selected categories
async function fetchBookPool(categories, count = 30) {
  const seen = getSeen();
  const books = [];

  // Pick up to 3 random categories to query
  const cats = [...categories].sort(() => Math.random() - 0.5).slice(0, 3);

  for (const catId of cats) {
    try {
      // Mix NYT (if available) and Google Books
      const nytSlug = NYT_LISTS[catId];
      if (nytSlug && getNYTKey()) {
        const nytBooks = await fetchNYTList(nytSlug);
        books.push(...nytBooks);
      }
      const startIndex = Math.floor(Math.random() * 40);
      const gbBooks = await fetchGoogleBooks(catId, 15, startIndex);
      books.push(...gbBooks);
    } catch (e) {
      console.warn('Fetch error for', catId, e.message);
    }
  }

  // Deduplicate and filter already seen
  const seen_set = new Set(seen);
  const unique = [];
  const ids = new Set();
  for (const b of books) {
    if (!ids.has(b.id) && !seen_set.has(b.id) && b.title && b.cover) {
      ids.add(b.id);
      unique.push(b);
    }
  }

  return unique.sort(() => Math.random() - 0.5).slice(0, count);
}
