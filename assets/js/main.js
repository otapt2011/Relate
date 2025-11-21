// ----------------- APP INITIALIZATION -----------------
const listArea = document.getElementById("listArea");

async function initializeApp() {
  try {
    // Show loading state
    listArea.setAttribute("aria-busy", "true");
    
    // Initialize data
    const success = await window.initializeUsers();
    if (!success) {
      throw new Error("Failed to initialize users");
    }
    
    // Initialize UI components
    window.initializeUI();
    window.setupDropdown(document.getElementById("sortDropdown"));
    window.setupDropdown(document.getElementById("filterDropdown"));
    window.setupSegmentedControls();
    window.setupFavoriteDelegation();
    window.updatePills();
    window.initializeAddData();
    
    // Initial render
    listArea.setAttribute("aria-busy", "false");
    window.renderList({ animate: false });
    
    // Initialize segment counts after everything is loaded
    if (window.updateSegmentCounts) {
      window.updateSegmentCounts();
    }
    
  } catch (error) {
    console.error("App initialization failed:", error);
    listArea.innerHTML = `
      <div class="card" style="padding:20px">
        Unable to load users.json — check path or server. Open console for details.
      </div>
    `;
    listArea.setAttribute("aria-busy", "false");
  }
}

// Start the application
document.addEventListener('DOMContentLoaded', initializeApp);