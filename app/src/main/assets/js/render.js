// ── Onboarding ────────────────────────────────────────────────
function renderOnboarding() {
  const grid = document.getElementById('category-grid');
  grid.innerHTML = CATEGORIES.map(c => `
    <div class="cat-chip${selectedCategories.includes(c.id) ? ' selected' : ''}"
         onclick="toggleCategory('${c.id}')">
      <span class="cat-icon">${c.icon}</span>
      <span class="cat-name">${c.name}</span>
    </div>
  `).join('');
  updateOnboardingBtn();
}

function updateOnboardingBtn() {
  const btn = document.getElementById('onboarding-btn');
  const n = selectedCategories.length;
  btn.disabled = n < 3;
  btn.textContent = n < 3
    ? `Pick at least ${3 - n} more`
    : `Start Reading →`;
  btn.style.opacity = n < 3 ? '0.5' : '1';
}

// ── Swipe Deck ────────────────────────────────────────────────
function renderDeck() {
  const area = document.getElementById('deck-area');
  area.innerHTML = '';

  if (isLoadingPool) {
    area.innerHTML = '<div class="loading-card"><div class="spinner"></div></div>';
    return;
  }

  if (bookPool.length === 0) {
    area.innerHTML = `
      <div class="deck-empty">
        <div class="empty-icon">📚</div>
        <h3>You're all caught up!</h3>
        <p>No more books to show right now.<br>Check back later or change your categories.</p>
        <button class="btn btn-primary" style="margin-top:20px" onclick="reloadPool()">Load More</button>
      </div>`;
    return;
  }

  // Show up to 3 stacked cards, top first
  bookPool.slice(0, 3).reverse().forEach((book, i) => {
    const card = buildCard(book);
    if (i === bookPool.slice(0, 3).length - 1) {
      card.classList.add('top');
      initSwipe(card, dir => handleSwipe(dir, book));
    }
    area.appendChild(card);
  });
}

function buildCard(book) {
  const card = document.createElement('div');
  card.className = 'swipe-card';
  card.dataset.id = book.id;

  const coverHtml = book.cover
    ? `<img class="card-cover" src="${book.cover}" alt="${book.title}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
    : '';
  const placeholderStyle = book.cover ? 'style="display:none"' : '';
  const cat = CATEGORIES.find(c => selectedCategories.includes(c.id));
  const emoji = cat ? cat.icon : '📖';

  const nytBadge = book.source === 'nyt'
    ? `<div class="card-nyt-badge">📰 NYT Bestseller${book.weeksOnList > 1 ? ` · ${book.weeksOnList} weeks` : ''}</div>`
    : '';

  const tags = book.genres.slice(0, 2).map(g =>
    `<span class="card-genre-tag">${g.split(' / ').pop()}</span>`).join('');

  card.innerHTML = `
    <div class="swipe-indicator like">SAVE</div>
    <div class="swipe-indicator nope">SKIP</div>
    ${coverHtml}
    <div class="card-cover-placeholder" ${placeholderStyle}>${emoji}</div>
    <div class="card-body">
      ${nytBadge}
      ${tags ? `<div class="card-genres">${tags}</div>` : ''}
      <div class="card-title">${book.title}</div>
      <div class="card-author">by ${book.author}</div>
      ${book.description ? `<div class="card-desc">${book.description}</div>` : ''}
      ${book.link ? `<a class="card-link" href="${book.link}" onclick="event.stopPropagation()">View on Google Books ↗</a>` : ''}
    </div>
  `;
  return card;
}

// ── Library ───────────────────────────────────────────────────
function renderLibrary() {
  const liked = getLiked();
  const rated = getRated();
  const container = document.getElementById('lib-content');

  if (libTab === 'saved') {
    if (liked.length === 0) {
      container.innerHTML = `<div class="lib-empty"><div class="empty-icon">💾</div><p>Books you save will appear here.<br>Swipe right to save a book!</p></div>`;
      return;
    }
    container.innerHTML = `<div class="book-grid">${liked.map(b => bookThumbHtml(b, rated[b.id])).join('')}</div>`;
  } else {
    const ratedIds = Object.keys(rated);
    const ratedBooks = liked.filter(b => rated[b.id]);
    if (ratedBooks.length === 0) {
      container.innerHTML = `<div class="lib-empty"><div class="empty-icon">⭐</div><p>Rate books you've read<br>to get better recommendations.</p></div>`;
      return;
    }
    container.innerHTML = `<div class="book-grid">${ratedBooks.map(b => bookThumbHtml(b, rated[b.id])).join('')}</div>`;
  }
}

function bookThumbHtml(book, stars) {
  const coverHtml = book.cover
    ? `<img src="${book.cover}" alt="${book.title}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
    : '';
  const cat = CATEGORIES.find(c => selectedCategories.includes(c.id));
  const emoji = cat ? cat.icon : '📖';
  const placeholderStyle = book.cover ? 'style="display:none"' : '';
  const starHtml = stars
    ? `<div class="star-row">${[1,2,3,4,5].map(i => `<span class="star${i <= stars ? ' filled' : ''}">★</span>`).join('')}</div>`
    : '';
  return `
    <div class="book-thumb" onclick="openBookDetail('${book.id}')">
      ${coverHtml}
      <div class="book-thumb-placeholder" ${placeholderStyle}>${emoji}</div>
      <div class="book-thumb-info">
        <div class="book-thumb-title">${book.title}</div>
        <div class="book-thumb-author">${book.author}</div>
        ${starHtml}
      </div>
    </div>`;
}

// ── Settings ──────────────────────────────────────────────────
function renderSettings() {
  document.getElementById('input-gbooks').value  = getGBooksKey();
  document.getElementById('input-nyt').value     = getNYTKey();
  document.getElementById('input-claude').value  = getClaudeKey();

  const cats = getCategories();
  document.getElementById('setting-categories').textContent =
    cats.length ? cats.map(id => CATEGORIES.find(c => c.id === id)?.icon || '').join('') : 'None selected';
}

// ── Deck tabs ─────────────────────────────────────────────────
function renderDeckTabs() {
  const bar = document.getElementById('deck-tabs');
  const tabs = [
    { id: 'for-you',  label: '✨ For You' },
    { id: 'trending', label: '📰 Trending' },
    ...selectedCategories.slice(0, 4).map(id => {
      const c = CATEGORIES.find(c => c.id === id);
      return { id, label: `${c.icon} ${c.name}` };
    }),
  ];
  bar.innerHTML = tabs.map(t =>
    `<div class="deck-tab${deckFilter === t.id ? ' active' : ''}" onclick="switchDeckFilter('${t.id}')">${t.label}</div>`
  ).join('');
}
