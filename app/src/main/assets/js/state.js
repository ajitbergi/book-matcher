let currentScreen = 'onboarding'; // 'onboarding' | 'swipe' | 'library' | 'settings'
let selectedCategories = getCategories(); // array of category IDs
let bookPool = [];       // books queued for swiping
let activeBook = null;   // book currently being detailed/rated
let deckFilter = 'for-you'; // 'for-you' | 'trending' | category ID
let libTab = 'saved';   // 'saved' | 'rated'
let isLoadingPool = false;
