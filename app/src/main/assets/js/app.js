// ── Screen routing ────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + id).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const navBtn = document.querySelector(`.nav-btn[data-screen="${id}"]`);
  if (navBtn) navBtn.classList.add('active');
  currentScreen = id;
}

function navigate(id) {
  showScreen(id);
  if (id === 'swipe')    { renderDeckTabs(); renderDeck(); }
  if (id === 'library')  renderLibrary();
  if (id === 'settings') renderSettings();
}

// ── Onboarding ────────────────────────────────────────────────
function toggleCategory(id) {
  if (selectedCategories.includes(id)) {
    selectedCategories = selectedCategories.filter(c => c !== id);
  } else {
    selectedCategories.push(id);
  }
  saveCategories(selectedCategories);
  renderOnboarding();
}

function finishOnboarding() {
  if (selectedCategories.length < 3) return;
  saveSetupDone();
  navigate('swipe');
  loadPool();
}

// ── Book pool ─────────────────────────────────────────────────
async function loadPool() {
  isLoadingPool = true;
  renderDeck();
  try {
    bookPool = await fetchBookPool(selectedCategories, 30);
  } catch (e) {
    showToast('Could not load books: ' + e.message);
    bookPool = [];
  }
  isLoadingPool = false;
  renderDeck();
}

async function reloadPool() {
  await loadPool();
}

async function switchDeckFilter(filterId) {
  deckFilter = filterId;
  renderDeckTabs();
  isLoadingPool = true;
  renderDeck();
  try {
    if (filterId === 'for-you') {
      bookPool = await fetchBookPool(selectedCategories, 30);
    } else if (filterId === 'trending') {
      const nytKey = Object.values(NYT_LISTS)[0];
      bookPool = await fetchNYTList(nytKey);
    } else {
      const startIndex = Math.floor(Math.random() * 40);
      bookPool = await fetchGoogleBooks(filterId, 20, startIndex);
    }
    bookPool = bookPool.filter(b => !isSeen(b.id) && b.cover);
  } catch (e) {
    showToast('Could not load: ' + e.message);
    bookPool = [];
  }
  isLoadingPool = false;
  renderDeck();
}

// ── Swipe handling ────────────────────────────────────────────
function handleSwipe(direction, book) {
  const topCard = document.querySelector('.swipe-card.top');
  if (!topCard) return;

  animateSwipe(topCard, direction, () => {
    addSeen(book.id);
    bookPool.shift();

    if (direction === 'right') {
      addLiked(book);
      showToast('Saved! ✓');
      // Prompt to rate if they've read it
      activeBook = book;
      openRateModal(book);
    } else {
      addDisliked(book.id);
    }

    // Prefetch when running low
    if (bookPool.length < 5 && !isLoadingPool) {
      fetchBookPool(selectedCategories, 20).then(more => {
        bookPool.push(...more.filter(b => !isSeen(b.id)));
      }).catch(() => {});
    }

    renderDeck();
  });
}

function swipeLeft()  { const b = bookPool[0]; if (b) handleSwipe('left', b); }
function swipeRight() { const b = bookPool[0]; if (b) handleSwipe('right', b); }

// ── Book detail modal ─────────────────────────────────────────
function openBookDetail(bookId) {
  const book = getLiked().find(b => b.id === bookId);
  if (!book) return;
  activeBook = book;

  const rated = getRated();
  const stars = rated[book.id] || 0;

  const modal = document.getElementById('modal-detail');
  const coverHtml = book.cover
    ? `<img class="modal-cover" src="${book.cover}" alt="${book.title}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
    : '';
  const placeholderStyle = book.cover ? 'style="display:none"' : '';

  modal.querySelector('.modal-sheet').innerHTML = `
    <div class="modal-handle"></div>
    ${coverHtml}
    <div class="modal-cover-placeholder" ${placeholderStyle}>📖</div>
    <div class="modal-title">${book.title}</div>
    <div class="modal-author">by ${book.author}${book.published ? ` · ${book.published}` : ''}</div>
    ${book.description ? `<div class="modal-desc">${book.description}</div>` : ''}
    <div class="star-row" style="margin-bottom:16px">
      ${[1,2,3,4,5].map(i => `<span class="star${i <= stars ? ' filled' : ''}">★</span>`).join('')}
      ${stars ? `<span style="font-size:12px;color:var(--muted);margin-left:6px">Your rating</span>` : ''}
    </div>
    ${book.link ? `<a class="card-link" href="${book.link}" style="display:block;margin-bottom:16px">View on Google Books ↗</a>` : ''}
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="openRateModal(activeBook)">⭐ Rate</button>
      <button class="btn btn-ghost" onclick="removeFromLibrary('${book.id}')">🗑 Remove</button>
      <button class="btn btn-primary" style="flex:1" onclick="closeModal('modal-detail')">Done</button>
    </div>
  `;
  openModal('modal-detail');
}

function removeFromLibrary(id) {
  removeLiked(id);
  closeModal('modal-detail');
  renderLibrary();
  showToast('Removed from library');
}

// ── Rate modal ────────────────────────────────────────────────
function openRateModal(book) {
  activeBook = book;
  const existing = getRated()[book.id] || 0;
  const modal = document.getElementById('modal-rate');

  modal.querySelector('.rate-prompt').innerHTML = `
    <div class="modal-handle"></div>
    <div class="modal-title" style="font-size:18px;margin-bottom:4px">${book.title}</div>
    <p>Have you already read this book?<br>Rate it to get better recommendations.</p>
  `;

  // Set stars
  let selectedStars = existing;
  function updateStars() {
    modal.querySelectorAll('.star-pick').forEach((s, i) => {
      s.classList.toggle('active', i < selectedStars);
    });
  }
  modal.querySelectorAll('.star-pick').forEach((s, i) => {
    s.onclick = () => { selectedStars = i + 1; updateStars(); };
  });
  updateStars();

  modal.querySelector('#btn-rate-save').onclick = () => {
    if (selectedStars > 0) rateBook(book.id, selectedStars);
    closeModal('modal-rate');
    renderLibrary();
  };
  modal.querySelector('#btn-rate-skip').onclick = () => closeModal('modal-rate');

  openModal('modal-rate');
}

// ── Modal helpers ─────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('visible'); }
function closeModal(id) { document.getElementById(id).classList.remove('visible'); }

// ── Settings save ─────────────────────────────────────────────
function saveSettings() {
  saveApiKeys({
    gbooks: document.getElementById('input-gbooks').value.trim(),
    nyt:    document.getElementById('input-nyt').value.trim(),
    claude: document.getElementById('input-claude').value.trim(),
  });
  showToast('Settings saved ✓');
}

function goEditCategories() {
  navigate('swipe');
  // Swap to onboarding for re-pick
  showScreen('onboarding');
  renderOnboarding();
}

// ── Library tab switch ────────────────────────────────────────
function switchLibTab(tab) {
  libTab = tab;
  document.querySelectorAll('.lib-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  renderLibrary();
}

// ── Toast ─────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// ── Init ──────────────────────────────────────────────────────
function init() {
  if (isSetupDone() && selectedCategories.length >= 3) {
    navigate('swipe');
    loadPool();
  } else {
    showScreen('onboarding');
    renderOnboarding();
  }
}

document.addEventListener('DOMContentLoaded', init);
