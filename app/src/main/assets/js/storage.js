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
const KEY_GBOOKS_KEY   = 'bm_gbooks_key';
const KEY_NYT_KEY      = 'bm_nyt_key';
const KEY_CLAUDE_KEY   = 'bm_claude_key';

const isSetupDone   = ()      => LS.get(KEY_SETUP_DONE, false);
const getCategories = ()      => LS.get(KEY_CATEGORIES, []);
const getLiked      = ()      => LS.get(KEY_LIKED, []);
const getDisliked   = ()      => LS.get(KEY_DISLIKED, []);
const getRated      = ()      => LS.get(KEY_RATED, {});
const getSeen       = ()      => LS.get(KEY_SEEN, []);
const getGBooksKey  = ()      => LS.get(KEY_GBOOKS_KEY, '');
const getNYTKey     = ()      => LS.get(KEY_NYT_KEY, '');
const getClaudeKey  = ()      => LS.get(KEY_CLAUDE_KEY, '');

function saveSetupDone()         { LS.set(KEY_SETUP_DONE, true); }
function saveCategories(cats)    { LS.set(KEY_CATEGORIES, cats); }
function addLiked(book)          { const l = getLiked(); if (!l.find(b => b.id === book.id)) { l.push(book); LS.set(KEY_LIKED, l); } }
function addDisliked(id)         { const d = getDisliked(); if (!d.includes(id)) { d.push(id); LS.set(KEY_DISLIKED, d); } }
function addSeen(id)             { const s = getSeen(); if (!s.includes(id)) { s.push(id); LS.set(KEY_SEEN, s); } }
function rateBook(id, stars)     { const r = getRated(); r[id] = stars; LS.set(KEY_RATED, r); }
function removeLiked(id)         { LS.set(KEY_LIKED, getLiked().filter(b => b.id !== id)); }
function isSeen(id)              { return getSeen().includes(id); }
function isLiked(id)             { return getLiked().some(b => b.id === id); }

function saveApiKeys({ gbooks, nyt, claude }) {
  if (gbooks  !== undefined) LS.set(KEY_GBOOKS_KEY, gbooks);
  if (nyt     !== undefined) LS.set(KEY_NYT_KEY, nyt);
  if (claude  !== undefined) LS.set(KEY_CLAUDE_KEY, claude);
}
