// ----------------- RENDERING FUNCTIONS -----------------
function renderList({ animate = true } = {}) {
  const listArea = document.getElementById("listArea");
  
  if (animate) {
    listArea.classList.add("list-transition");
    setTimeout(() => {
      populateList();
      listArea.classList.remove("list-transition");
      window.setupCardAnimations();
    }, 140);
  } else {
    populateList();
    window.setupCardAnimations();
  }
}

function populateList() {
  const listArea = document.getElementById("listArea");
  const filtered = window.filterUsers(window.allUsers);
  const sorted = window.sortUsers(filtered);
  
  if (sorted.length === 0) {
    renderEmptyState();
    return;
  }
  
  const fragment = document.createDocumentFragment();
  sorted.forEach(user => {
    fragment.appendChild(createUserCard(user));
  });
  
  listArea.innerHTML = "";
  listArea.appendChild(fragment);
  window.setupBadgeAnimations();
}

function renderEmptyState() {
  const listArea = document.getElementById("listArea");
  const empty = document.createElement("div");
  empty.className = "card entered";
  empty.style.padding = "20px";
  empty.textContent = "No users match your search / filters.";
  listArea.innerHTML = "";
  listArea.appendChild(empty);
}

function createUserCard(user) {
  const card = document.createElement("article");
  card.className = "card";
  card.setAttribute("role", "listitem");
  card.dataset.id = user.id;
  
  // FIXED: Use icon badges instead of text
  const badgesHtml = (user.badges || [])
    .map(badge => {
      const badgeKey = badge.toLowerCase();
      const icon = window.BADGE_ICONS[badgeKey] || `<span>${window.escapeHtml(badge)}</span>`;
      const title = window.BADGE_TITLES[badgeKey] || badge;
      return `<span class="badge-pill" title="${window.escapeHtml(title)}">${icon}</span>`;
    })
    .join(" ");
  
  const favoriteClass = window.favorites.has(user.username) ? 'favorite active' : 'favorite';
  
  // Determine if we should show the follow button
  const showFollowButton = !(user.relationship === "following" || user.relationship === "friend");
  
  // Only create follow button HTML if needed
  const followButtonHtml = showFollowButton ? `
    <button class="follow-btn" 
            data-id="${user.username}" 
            aria-label="Follow"
            title="Follow">
      +
    </button>
  ` : '';
  
  card.innerHTML = `
    <div class="card-top">
      <div class="avatar-wrapper">
        <img src="${window.escapeHtml(user.avatar)}" class="avatar-img" 
             onerror="this.style.display='none';this.parentNode.style.background='linear-gradient(135deg,#1b1f25,#111217)';" />
        <div class="online-dot ${user.online ? '' : 'offline'}" 
             title="${user.online ? 'Online' : 'Offline'}"></div>
      </div>

      <div class="meta">
        <div class="nick">${window.escapeHtml(user.nickname)}</div>
        <div class="handle">@${window.escapeHtml(user.username)}</div>
        <div class="badges-container">${badgesHtml}</div>
      </div>

      <div class="action-buttons">
        <button class="${favoriteClass}" 
                data-id="${user.username}" 
                aria-label="Toggle favorite">
          ${window.favorites.has(user.username) ? '♥' : '♡'}
        </button>
        ${followButtonHtml}
      </div>
    </div>
  `;
  
  return card;
}