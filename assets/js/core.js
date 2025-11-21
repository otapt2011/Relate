// ----------------- UTILITY FUNCTIONS -----------------
function $(selector) {
  return document.querySelector(selector);
}

function escapeHtml(text) {
  return (text || "").replace(/[&<>"]/g, char =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': '&quot;' } [char])
  );
}

// ----------------- DATA FUNCTIONS -----------------
window.MAX_ONLINE = 10;
window.BADGE_POOL = ["vip", "mod", "creator", "founder"];

// Add badge icon mapping
window.BADGE_ICONS = {
  'vip': `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
    </svg>
  `,
  'mod': `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1ZM12 7C13.1 7 14 7.9 14 9C14 10.1 13.1 11 12 11C10.9 11 10 10.1 10 9C10 7.9 10.9 7 12 7ZM14 15.88C14 13.63 12.35 12 10 12H8V14H10C11.1 14 12 14.9 12 16V17H14V15.88Z"/>
    </svg>
  `,
  'creator': `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.71 7.04C21.1 6.65 21.1 6 20.71 5.63L18.37 3.29C18 2.9 17.35 2.9 16.96 3.29L15.12 5.12L18.87 8.87L20.71 7.04ZM3 17.25V21H6.75L17.81 9.93L14.06 6.18L3 17.25Z"/>
    </svg>
  `,
  'founder': `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 5.5V7H9V5.5L3 7V9L9 10.5V12.5L3 14V16L9 17.5V21H11V18.33C11 18.33 14 18 14 17V12.5L21 11V9Z"/>
    </svg>
  `
};

// Update badge titles for accessibility
window.BADGE_TITLES = {
  'vip': 'VIP Member',
  'mod': 'Moderator',
  'creator': 'Content Creator',
  'founder': 'Founding Member'
};

async function fetchUsers() {
  try {
    const response = await fetch("./assets/users.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch users.json");
    const raw = await response.json();
    return normalizeUsers(raw);
  } catch (error) {
    console.error("Data fetch error:", error);
    throw error;
  }
}

function normalizeUsers(rawUsers) {
  const users = Array.isArray(rawUsers) ? rawUsers : [];
  
  return users.map((user, index) => ({
    id: `u${index + 1}`,
    nickname: user.nickname || `User ${index + 1}`,
    username: user.username || `user${index + 1}`,
    avatar: user.avatar || "",
    rank: index + 1,
    online: false,
    badges: [],
    relationship: user.relationship || "none"
  }));
}

function enrichUsers(users) {
  const enriched = users.slice();
  
  // Assign online status
  const total = enriched.length;
  const count = Math.min(window.MAX_ONLINE, total);
  const picked = new Set();
  while (picked.size < count) {
    picked.add(Math.floor(Math.random() * total));
  }
  picked.forEach(i => enriched[i].online = true);
  
  // Assign badges to ~20% of users
  enriched.forEach(user => {
    if (sampleChance(0.18)) {
      const badgeCount = Math.random() < 0.85 ? 1 : 2;
      user.badges = shuffle(window.BADGE_POOL).slice(0, badgeCount);
    }
  });
  
  return enriched;
}

function sampleChance(probability) {
  return Math.random() < probability;
}

function shuffle(array) {
  return array.slice().sort(() => Math.random() - 0.5);
}

function generateRandomBadges() {
  const badges = [];
  const badgeOptions = ['vip', 'mod', 'creator', 'founder']; // Updated to use keys
  
  if (Math.random() < 0.2) {
    const badgeCount = Math.random() < 0.85 ? 1 : 2;
    const shuffledBadges = badgeOptions.sort(() => Math.random() - 0.5);
    for (let i = 0; i < badgeCount && i < shuffledBadges.length; i++) {
      if (!badges.includes(shuffledBadges[i])) {
        badges.push(shuffledBadges[i]);
      }
    }
  }
  
  return badges;
}

// ----------------- STATE MANAGEMENT -----------------
window.LS_FOLLOWING = "friends.following.v1";
window.LS_FOLLOWERS = "friends.followers.v1";
window.LS_FAVORITES = "friends.favorites.v1";
window.LS_THEME = "friends.theme.v1";

// State
window.USERS = [];
window.allUsers = [];
window.following = new Set(JSON.parse(localStorage.getItem(window.LS_FOLLOWING) || "[]"));
window.followers = new Set(JSON.parse(localStorage.getItem(window.LS_FOLLOWERS) || "[]"));
window.favorites = new Set(JSON.parse(localStorage.getItem(window.LS_FAVORITES) || "[]"));
window.activeFilters = new Set();
window.currentSort = "original";
window.searchTerm = "";
window.currentTheme = localStorage.getItem(window.LS_THEME) || "dark";

async function initializeUsers() {
  try {
    const rawUsers = await window.fetchUsers();
    const normalized = window.enrichUsers(rawUsers);
    window.USERS = normalized;
    window.allUsers = normalized.slice();
    
    // Initialize relationships based on JSON data
    initializeRelationshipsFromData();
    return true;
  } catch (error) {
    console.error("User initialization failed:", error);
    return false;
  }
}

function initializeRelationshipsFromData() {
  // Clear existing relationships to start fresh from JSON data
  const newFollowing = new Set();
  const newFollowers = new Set();
  
  window.allUsers.forEach(user => {
    // Set relationships based on the relationship field in JSON
    switch (user.relationship) {
      case "friend":
        // Friends are both following and followers
        newFollowing.add(user.username);
        newFollowers.add(user.username);
        break;
      case "following":
        // Only you follow them (they don't follow you back)
        newFollowing.add(user.username);
        break;
      case "follower":
        // Only they follow you (you don't follow them back)
        newFollowers.add(user.username);
        break;
      case "none":
      default:
        // No relationship - do nothing
        break;
    }
  });
  
  // Update the global state
  window.following = newFollowing;
  window.followers = newFollowers;
  
  // Save to localStorage
  localStorage.setItem(window.LS_FOLLOWING, JSON.stringify([...window.following]));
  localStorage.setItem(window.LS_FOLLOWERS, JSON.stringify([...window.followers]));
}

function updateFollowing(username) {
  if (window.following.has(username)) {
    window.following.delete(username);
  } else {
    window.following.add(username);
  }
  localStorage.setItem(window.LS_FOLLOWING, JSON.stringify([...window.following]));
}

function updateFavorites(username) {
  if (window.favorites.has(username)) {
    window.favorites.delete(username);
  } else {
    window.favorites.add(username);
  }
  localStorage.setItem(window.LS_FAVORITES, JSON.stringify([...window.favorites]));
}

function getRelationshipType(user) {
  const isFollowing = window.following.has(user.username);
  const isFollower = window.followers.has(user.username);
  
  if (isFollowing && isFollower) {
    return "friends";
  } else if (isFollowing) {
    return "following";
  } else if (isFollower) {
    return "followers";
  } else {
    return "none";
  }
}

function toggleFilter(filter) {
  if (window.activeFilters.has(filter)) {
    window.activeFilters.delete(filter);
  } else {
    window.activeFilters.add(filter);
  }
}

function clearFilters() {
  window.activeFilters.clear();
}

function setSort(sortType) {
  window.currentSort = sortType;
}

function setSearch(term) {
  window.searchTerm = term.trim();
}

function setTheme(theme) {
  window.currentTheme = theme;
  localStorage.setItem(window.LS_THEME, theme);
}

function toggleTheme() {
  const newTheme = window.currentTheme === "dark" ? "light" : "dark";
  setTheme(newTheme);
  return newTheme;
}

// ----------------- FILTER FUNCTIONS -----------------
function filterUsers(users) {
  let filtered = users.slice();
  
  if (window.searchTerm) {
    const query = window.searchTerm.toLowerCase();
    filtered = filtered.filter(user =>
      (user.nickname || "").toLowerCase().includes(query) ||
      (user.username || "").toLowerCase().includes(query)
    );
  }
  
  // Apply relationship filters
  if (window.activeFilters.has("friends")) {
    filtered = filtered.filter(user =>
      window.following.has(user.username) && window.followers.has(user.username)
    );
  }
  
  if (window.activeFilters.has("following")) {
    filtered = filtered.filter(user =>
      window.following.has(user.username) && !window.followers.has(user.username)
    );
  }
  
  if (window.activeFilters.has("followers")) {
    filtered = filtered.filter(user =>
      !window.following.has(user.username) && window.followers.has(user.username)
    );
  }
  
  if (window.activeFilters.has("suggested")) {
    filtered = filtered.filter(user =>
      !window.following.has(user.username) && !window.followers.has(user.username)
    );
  }
  
  // Special filters
  if (window.activeFilters.has("online")) {
    filtered = filtered.filter(user => user.online);
  }
  
  if (window.activeFilters.has("favorites")) {
    filtered = filtered.filter(user => window.favorites.has(user.username));
  }
  
  // Additional filters
  if (window.activeFilters.has("emoji")) {
    filtered = filtered.filter(user => /(\p{Emoji_Presentation}|\p{Emoji})/u.test(user.nickname));
  }
  
  if (window.activeFilters.has("long")) {
    filtered = filtered.filter(user => (user.username || "").length > 12);
  }
  
  if (window.activeFilters.has("has-badge")) {
    filtered = filtered.filter(user => Array.isArray(user.badges) && user.badges.length > 0);
  }
  
  return filtered;
}

function getFilterLabel(filter) {
  const labels = {
    'friends': 'Friends',
    'following': 'Following',
    'followers': 'Followers',
    'suggested': 'Suggested',
    'online': 'Online',
    'favorites': 'Favorites',
    'emoji': 'Has emoji',
    'long': 'Long username',
    'has-badge': 'Has badge'
  };
  return labels[filter] || filter;
}

// ----------------- SORTING FUNCTIONS -----------------
function sortUsers(users) {
  const sorted = users.slice();
  
  switch (window.currentSort) {
    case "following":
      sorted.sort(sortByRelationship);
      break;
    case "favorites":
      sorted.sort(sortByFavorites);
      break;
    case "rank-asc":
      sorted.sort((a, b) => a.rank - b.rank);
      break;
    case "rank-desc":
      sorted.sort((a, b) => b.rank - a.rank);
      break;
    case "az":
      sorted.sort((a, b) => a.nickname.localeCompare(b.nickname));
      break;
    case "za":
      sorted.sort((a, b) => b.nickname.localeCompare(a.nickname));
      break;
    case "original":
      // Keep the original order from users.json (by rank ascending)
      sorted.sort((a, b) => a.rank - b.rank);
      break;
    default:
      // Default to original order
      sorted.sort((a, b) => a.rank - b.rank);
  }
  
  return sorted;
}

function sortByRelationship(a, b) {
  const aRel = getRelationshipPriority(a);
  const bRel = getRelationshipPriority(b);
  
  if (aRel !== bRel) return aRel - bRel;
  return a.rank - b.rank;
}

function sortByFavorites(a, b) {
  const aFav = window.favorites.has(a.username) ? 0 : 1;
  const bFav = window.favorites.has(b.username) ? 0 : 1;
  if (aFav !== bFav) return aFav - bFav;
  return a.rank - b.rank;
}

function getRelationshipPriority(user) {
  const isFollowing = window.following.has(user.username);
  const isFollower = window.followers.has(user.username);
  
  if (isFollowing && isFollower) return 0;
  if (isFollowing) return 1;
  if (isFollower) return 2;
  return 3;
}

// ----------------- ANIMATION FUNCTIONS -----------------
function setupCardAnimations() {
  requestAnimationFrame(() => {
    document.querySelectorAll("#listArea .card").forEach((card, index) => {
      setTimeout(() => card.classList.add("entered"), 30 + index * 18);
    });
  });
}

function setupBadgeAnimations() {
  document.querySelectorAll(".badge-pill").forEach((badge, index) => {
    badge.style.transform = "translateY(8px) scale(.96)";
    badge.style.opacity = "0";
    
    setTimeout(() => {
      badge.style.transition = "all .42s cubic-bezier(.2,.9,.25,1)";
      badge.style.transform = "translateY(0) scale(1)";
      badge.style.opacity = "1";
    }, 120 + index * 40);
  });
}