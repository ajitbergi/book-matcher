const LS = {
  get: (k, def = null) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  remove: k => localStorage.removeItem(k),
};

// Keys
const KEY_SETUP_DONE   = 'bm_setup_done';
const KEY_CATEGORIES   = 'bm_categories';
const KEY_LIKED        = 'bm_liked';
const KEY_DISLIKED     = 'bm_disliked';
const KEY_RATED        = 'bm_rated';
const KEY_SEEN         = 'bm_seen';
const KEY_NYT_KEY      = 'bm_nyt_key';
const KEY_CLAUDE_KEY   = 'bm_claude_key';
const KEY_SWIPE_STATS  = 'bm_swipe_stats';

const isSetupDone   = ()      => LS.get(KEY_SETUP_DONE, false);
const getCategories = ()      => LS.get(KEY_CATEGORIES, []);
const getLiked      = ()      => LS.get(KEY_LIKED, []);
const getDisliked   = ()      => LS.get(KEY_DISLIKED, []);
const getRated      = ()      => LS.get(KEY_RATED, {});
const getSeen       = ()      => LS.get(KEY_SEEN, []);
const getNYTKey    = () => LS.get(KEY_NYT_KEY, '')   || CONFIG.NYT_API_KEY;
const getClaudeKey = () => LS.get(KEY_CLAUDE_KEY, '');

function saveSetupDone()         { LS.set(KEY_SETUP_DONE, true); }
function saveCategories(cats)    { LS.set(KEY_CATEGORIES, cats); }
function addLiked(book)          { const l = getLiked(); if (!l.find(b => b.id === book.id)) { l.push(book); LS.set(KEY_LIKED, l); } }
function addDisliked(id)         { const d = getDisliked(); if (!d.includes(id)) { d.push(id); LS.set(KEY_DISLIKED, d); } }
function addSeen(id)             { const s = getSeen(); if (!s.includes(id)) { s.push(id); LS.set(KEY_SEEN, s); } }
function rateBook(id, stars)     { const r = getRated(); r[id] = stars; LS.set(KEY_RATED, r); }
function removeLiked(id)         { LS.set(KEY_LIKED, getLiked().filter(b => b.id !== id)); }
function isSeen(id)              { return getSeen().includes(id); }
function isLiked(id)             { return getLiked().some(b => b.id === id); }

function getSwipeStats() { return LS.get(KEY_SWIPE_STATS, {}); }
function recordSwipe(categoryId, direction) {
  if (!categoryId) return;
  const stats = getSwipeStats();
  if (!stats[categoryId]) stats[categoryId] = { right: 0, left: 0 };
  stats[categoryId][direction]++;
  LS.set(KEY_SWIPE_STATS, stats);
}

function saveApiKeys({ nyt, claude }) {
  if (nyt    !== undefined) LS.set(KEY_NYT_KEY, nyt);
  if (claude !== undefined) LS.set(KEY_CLAUDE_KEY, claude);
}
