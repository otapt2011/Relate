// ----------------- ADD FRIEND FORM FUNCTIONS -----------------
function initializeAddData() {
  setupAddFriendButton();
}

function setupAddFriendButton() {
  const addFriendBtn = document.createElement('button');
  addFriendBtn.className = 'icon-btn';
  addFriendBtn.textContent = '+';
  addFriendBtn.title = 'Add New Friend';
  addFriendBtn.setAttribute('aria-label', 'Add new friend');
  
  const actionsRow = document.querySelector('.actions-row');
  if (actionsRow) {
    actionsRow.insertBefore(addFriendBtn, actionsRow.firstChild);
    addFriendBtn.addEventListener('click', showAddFriendForm);
  }
}

function showAddFriendForm() {
  const existingForm = document.getElementById('addFriendForm');
  if (existingForm) {
    existingForm.remove();
    document.getElementById('formOverlay').remove();
    return;
  }
  
  const form = document.createElement('div');
  form.id = 'addFriendForm';
  form.setAttribute('role', 'dialog');
  form.setAttribute('aria-labelledby', 'addFriendTitle');
  form.setAttribute('aria-modal', 'true');
  
  form.innerHTML = `
    <div class="form-header">
      <h3 id="addFriendTitle">Add New Friend</h3>
      <button id="closeForm" class="icon-btn" aria-label="Close form">✕</button>
    </div>
    <form id="friendForm">
      <div class="form-group">
        <label for="nicknameInput">Nickname:</label>
        <input type="text" id="nicknameInput" required 
               placeholder="Enter friend's display name"
               aria-required="true">
      </div>
      <div class="form-group">
        <label for="usernameInput">Username:</label>
        <input type="text" id="usernameInput" required 
               placeholder="Enter unique username"
               aria-required="true">
      </div>
      <div class="form-group">
        <label for="avatarInput">Avatar URL (optional):</label>
        <input type="text" id="avatarInput" 
               placeholder="assets/img/username.jpeg">
      </div>
      <div class="form-group">
        <label for="relationshipSelect">Relationship:</label>
        <select id="relationshipSelect" style="width:100%;padding:8px;border-radius:6px;background:var(--bg-input);color:var(--text-primary);border:1px solid var(--border-color);">
          <option value="friend">Friend (Mutual Follow)</option>
          <option value="following">Following Only</option>
          <option value="follower">Follower Only</option>
          <option value="none">No Relationship</option>
        </select>
      </div>
      <div class="form-actions">
        <button type="button" id="cancelBtn" class="icon-btn">Cancel</button>
        <button type="submit" class="icon-btn submit-btn">Add Friend</button>
      </div>
    </form>
  `;
  
  const overlay = document.createElement('div');
  overlay.id = 'formOverlay';
  overlay.setAttribute('aria-hidden', 'true');
  
  document.body.appendChild(overlay);
  document.body.appendChild(form);
  
  setTimeout(() => {
    document.getElementById('nicknameInput').focus();
  }, 100);
  
  setupFormEvents();
}

function setupFormEvents() {
  const form = document.getElementById('friendForm');
  const closeBtn = document.getElementById('closeForm');
  const cancelBtn = document.getElementById('cancelBtn');
  const overlay = document.getElementById('formOverlay');
  
  function closeForm() {
    const form = document.getElementById('addFriendForm');
    const overlay = document.getElementById('formOverlay');
    if (form) form.remove();
    if (overlay) overlay.remove();
  }
  
  function handleEscapeKey(e) {
    if (e.key === 'Escape') {
      closeForm();
      document.removeEventListener('keydown', handleEscapeKey);
    }
  }
  
  closeBtn.addEventListener('click', closeForm);
  cancelBtn.addEventListener('click', closeForm);
  overlay.addEventListener('click', closeForm);
  document.addEventListener('keydown', handleEscapeKey);
  
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    addNewFriend();
  });
}

function addNewFriend() {
  const nickname = document.getElementById('nicknameInput').value.trim();
  const username = document.getElementById('usernameInput').value.trim();
  const avatar = document.getElementById('avatarInput').value.trim();
  const relationship = document.getElementById('relationshipSelect').value;
  
  if (!nickname || !username) {
    showErrorMessage('Please fill in both nickname and username');
    return;
  }
  
  if (window.allUsers.some(user => user.username === username)) {
    showErrorMessage('Username already exists! Please choose a different one.');
    return;
  }
  
  const newFriend = {
    nickname: nickname,
    username: username,
    avatar: avatar || `assets/img/${username}.jpeg`,
    relationship: relationship
  };
  
  addFriendToGlobalState(newFriend);
  closeForm();
  showSuccessMessage(`Added ${nickname} to friends list!`);
}

function addFriendToGlobalState(friendData) {
  const newUser = {
    id: `u${window.USERS.length + 1}`,
    nickname: friendData.nickname,
    username: friendData.username,
    avatar: friendData.avatar,
    rank: window.USERS.length + 1,
    online: Math.random() < 0.3,
    badges: generateRandomBadges(),
    relationship: friendData.relationship
  };
  
  // Add to both USERS and allUsers arrays
  window.USERS.push(newUser);
  window.allUsers.push(newUser);
  
  // Update relationship sets based on the selected relationship type
  switch (friendData.relationship) {
    case "friend":
      window.following.add(newUser.username);
      window.followers.add(newUser.username);
      break;
    case "following":
      window.following.add(newUser.username);
      break;
    case "follower":
      window.followers.add(newUser.username);
      break;
    case "none":
    default:
      // No relationship - don't add to any set
      break;
  }
  
  // Save updated relationships to localStorage
  localStorage.setItem(window.LS_FOLLOWING, JSON.stringify([...window.following]));
  localStorage.setItem(window.LS_FOLLOWERS, JSON.stringify([...window.followers]));
  
  if (window.renderList) {
    window.renderList({ animate: true });
  }
  
  if (window.updatePills) {
    window.updatePills();
  }
  
  // Update segment counts after adding new user
  if (window.updateSegmentCounts) {
    window.updateSegmentCounts();
  }
}

function showSuccessMessage(message) {
  const successMsg = document.createElement('div');
  successMsg.className = 'success-message';
  successMsg.textContent = message;
  
  document.body.appendChild(successMsg);
  
  setTimeout(() => {
    if (successMsg.parentNode) {
      successMsg.parentNode.removeChild(successMsg);
    }
  }, 3000);
}

function showErrorMessage(message) {
  alert(message);
}

function closeForm() {
  const form = document.getElementById('addFriendForm');
  const overlay = document.getElementById('formOverlay');
  if (form) form.remove();
  if (overlay) overlay.remove();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAddData);
} else {
  initializeAddData();
}