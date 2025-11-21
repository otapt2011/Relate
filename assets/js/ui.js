// ----------------- UI INITIALIZATION -----------------
function initializeUI() {
  setupSearch();
  setupThemeToggle();
  setupScrollToTop();
  setupKeyboardEvents();
  setupFollowDelegation();
  setupFavoriteDelegation();
  updateSegmentCounts(); // Initialize segment counts
}

// ----------------- SEARCH & CONTROLS -----------------
function setupSearch() {
  const searchInput = document.getElementById("searchInput");
  const clearSearch = document.getElementById("clearSearch");
  
  searchInput.addEventListener("input", e => {
    window.setSearch(e.target.value);
    window.renderList({ animate: true });
    updateSegmentCounts(); // Update counts when search changes
  });
  
  clearSearch.addEventListener("click", () => {
    window.setSearch("");
    searchInput.value = "";
    window.renderList({ animate: true });
    updateSegmentCounts(); // Update counts when search is cleared
  });
}

function setupThemeToggle() {
  const themeToggle = document.getElementById("themeToggle");
  
  function applyTheme(name) {
    document.body.setAttribute("data-theme", name);
    window.setTheme(name);
    themeToggle.textContent = name === "dark" ? "🌙" : "☀️";
  }
  
  applyTheme(window.currentTheme);
  
  themeToggle.onclick = () => {
    const newTheme = window.toggleTheme();
    applyTheme(newTheme);
  };
}

// ----------------- DROPDOWNS -----------------
function setupDropdown(dropEl) {
  const btn = dropEl.querySelector(".icon-btn");
  const panel = dropEl.querySelector(".select-panel");
  
  btn.addEventListener("click", e => {
    e.stopPropagation();
    dropEl.classList.toggle("open");
  });
  
  document.addEventListener("click", () => {
    dropEl.classList.remove("open");
  });
  
  panel.querySelectorAll("button[data-sort], button[data-filter]").forEach(button => {
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      
      if (button.dataset.sort) {
        window.setSort(button.dataset.sort);
      }
      
      if (button.dataset.filter) {
        const filter = button.dataset.filter;
        if (filter === "clear-all") {
          window.clearFilters();
        } else {
          window.toggleFilter(filter);
        }
      }
      
      dropEl.classList.remove("open");
      window.renderList({ animate: true });
      window.updatePills();
      updateSegmentCounts(); // Update counts after filter changes
    });
  });
}

// ----------------- SEGMENTED CONTROLS -----------------
function setupSegmentedControls() {
  document.querySelectorAll(".segmented button").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".segmented button").forEach(b => b.classList.remove("active"));
      button.classList.add("active");
      
      const key = button.dataset.seg;
      handleSegmentedAction(key);
      window.renderList({ animate: true });
      window.updatePills();
      updateSegmentCounts(); // Update counts after segment change
    });
  });
}

function handleSegmentedAction(key) {
  window.clearFilters();
  
  switch (key) {
    case "all":
      window.setSort("original");
      break;
    case "friends":
      window.toggleFilter("friends");
      break;
    case "following":
      window.toggleFilter("following");
      break;
    case "followers":
      window.toggleFilter("followers");
      break;
    case "suggested":
      window.toggleFilter("suggested");
      break;
    case "online":
      window.toggleFilter("online");
      break;
    case "favorites":
      window.toggleFilter("favorites");
      break;
  }
}

function updateSegmentCounts() {
  // Calculate counts for each segment
  const counts = {
    all: window.allUsers.length,
    friends: window.allUsers.filter(user =>
      window.following.has(user.username) && window.followers.has(user.username)
    ).length,
    following: window.allUsers.filter(user =>
      window.following.has(user.username) && !window.followers.has(user.username)
    ).length,
    followers: window.allUsers.filter(user =>
      !window.following.has(user.username) && window.followers.has(user.username)
    ).length,
    suggested: window.allUsers.filter(user =>
      !window.following.has(user.username) && !window.followers.has(user.username)
    ).length,
    online: window.allUsers.filter(user => user.online).length,
    favorites: window.allUsers.filter(user => window.favorites.has(user.username)).length
  };
  
  // Update each segment button with its count
  Object.keys(counts).forEach(segment => {
    const button = document.querySelector(`.segmented button[data-seg="${segment}"]`);
    if (button) {
      let countElement = button.querySelector('.segment-count');
      
      // Create count element if it doesn't exist
      if (!countElement) {
        countElement = document.createElement('span');
        countElement.className = 'segment-count';
        button.appendChild(countElement);
      }
      
      // Update count text
      countElement.textContent = counts[segment];
      
      // Hide count if it's 0
      if (counts[segment] === 0) {
        countElement.style.display = 'none';
      } else {
        countElement.style.display = 'flex';
      }
    }
  });
}

// ----------------- BUTTON DELEGATION -----------------
function setupFollowDelegation() {
  document.addEventListener("click", e => {
    if (e.target.classList.contains("follow-btn")) {
      e.stopPropagation();
      const username = e.target.dataset.id;
      window.updateFollowing(username);
      
      // Update button icon and state
      e.target.classList.toggle("active");
      e.target.textContent = e.target.classList.contains("active") ? "✓" : "+";
      e.target.title = e.target.classList.contains("active") ? "Unfollow" : "Follow";
      e.target.setAttribute("aria-label", e.target.classList.contains("active") ? "Unfollow" : "Follow");
      
      setTimeout(() => {
        window.renderList({ animate: true });
        updateSegmentCounts(); // Update counts after follow/unfollow
      }, 100);
    }
  });
}

function setupFavoriteDelegation() {
  document.addEventListener("click", e => {
    if (e.target.classList.contains("favorite")) {
      e.stopPropagation();
      const username = e.target.dataset.id;
      window.updateFavorites(username);
      
      e.target.classList.toggle("active");
      e.target.textContent = window.favorites.has(username) ? '♥' : '♡';
      
      setTimeout(() => {
        window.renderList({ animate: true });
        updateSegmentCounts(); // Update counts after favorite/unfavorite
      }, 100);
    }
  });
}

// ----------------- PILLS -----------------
function updatePills() {
  const pillsRow = document.getElementById("pillsRow");
  
  pillsRow.innerHTML = "";
  
  if (window.searchTerm) {
    pillsRow.appendChild(createPill(`Search: "${window.searchTerm}"`, "search"));
  }
  
  for (const filter of Array.from(window.activeFilters)) {
    const label = getFilterLabel(filter);
    pillsRow.appendChild(createPill(label, filter));
  }
}

function createPill(text, key) {
  const pill = document.createElement("div");
  pill.className = "pill";
  pill.style.cssText = "display:inline-flex;gap:8px;align-items:center;background:var(--pill-bg);padding:6px 10px;border-radius:999px;margin-right:8px;font-weight:600;color:var(--text)";
  pill.textContent = text;
  
  const removeBtn = document.createElement("span");
  removeBtn.textContent = "✕";
  removeBtn.style.cssText = "margin-left:6px;cursor:pointer;opacity:.8";
  
  removeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    removePill(key);
  });
  
  pill.appendChild(removeBtn);
  return pill;
}

function removePill(key) {
  if (key === "search") {
    window.setSearch("");
    document.getElementById("searchInput").value = "";
  } else {
    window.toggleFilter(key);
  }
  
  window.renderList({ animate: true });
  updatePills();
}

// ----------------- SCROLL & KEYBOARD -----------------
function setupScrollToTop() {
  const scrollTopBtn = document.getElementById("scrollTop");
  
  window.addEventListener("scroll", () => {
    if (window.scrollY > 320) {
      scrollTopBtn.classList.add("show");
    } else {
      scrollTopBtn.classList.remove("show");
    }
  });
  
  scrollTopBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function setupKeyboardEvents() {
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      document.querySelectorAll(".dropdown").forEach(dropdown => {
        dropdown.classList.remove("open");
      });
    }
  });
}