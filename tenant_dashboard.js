// Sidebar Navigation
const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menu-toggle");
const closeSidebar = document.getElementById("close-sidebar");
const navItems = document.querySelectorAll(".nav-item");
const contentSections = document.querySelectorAll(".content-section");

// Global variable to store the current user data
let currentTenantData = null;

// --- Modal Control Functions ---

window.openEditProfileModal = function () {
  const modal = document.getElementById("edit-profile-modal");
  if (modal) {
    // Populate inputs just before showing the modal
    if (currentTenantData) {
      document.getElementById("profile-edit-name").value =
        currentTenantData.name || "";
      document.getElementById("profile-edit-email").value =
        currentTenantData.email || "";
      document.getElementById("profile-edit-phone").value =
        currentTenantData.phone || "";

      // --- POPULATE NEW FIELDS ---
      document.getElementById("profile-edit-dob").value =
        currentTenantData.dob || "";
      document.getElementById("profile-edit-tax-id").value =
        currentTenantData.taxId || "";
      document.getElementById("profile-edit-emergency-phone").value =
        currentTenantData.emergencyPhone || "";
      document.getElementById("profile-edit-permanent-address").value =
        currentTenantData.permanentAddress || "";
      document.getElementById("profile-edit-previous-address").value =
        currentTenantData.previousAddress || "";
      // ---------------------------
    }
    modal.style.display = "block";
  }
};

window.closeEditProfileModal = function () {
  const modal = document.getElementById("edit-profile-modal");
  if (modal) {
    modal.style.display = "none";
    // Clear status message on close
    const messageEl = document.getElementById("profile-status-message");
    if (messageEl) {
      messageEl.style.display = "none";
      messageEl.textContent = "";
    }
  }
};

// --- UI Utility Functions ---

/**
 * Utility function to display status messages in a designated area.
 * @param {string} message - The message to display.
 * @param {string} type - 'success', 'error', or 'info'.
 */
function showStatusMessage(message, type) {
  const messageEl = document.getElementById("profile-status-message");
  if (messageEl) {
    messageEl.textContent = message;
    messageEl.className = `status-message ${type}`;
    messageEl.style.display = "block";
    // Clear the message after 5 seconds
    setTimeout(() => {
      messageEl.style.display = "none";
      messageEl.textContent = "";
    }, 5000);
  }
}

/**
 * Global function called by app.js to populate the profile and dashboard UI. (UPDATED)
 * This function now includes logic for the new profile fields.
 * @param {object} userData - The tenant's data from Firestore, including UID and email.
 */
window.updateTenantProfileUI = function (userData) {
  currentTenantData = userData;

  // Derive display values
  const name = userData.name || "Tenant";
  const email = userData.email || "N/A";
  const phone = userData.phone || "N/A";

  // --- NEW FIELDS ---
  const dob = userData.dob || "N/A";
  const taxId = userData.taxId || "N/A"; // Tax ID is NOT masked here
  const emergencyPhone = userData.emergencyPhone || "N/A";
  const permanentAddress = userData.permanentAddress || "N/A";
  const previousAddress = userData.previousAddress || "N/A";
  // ------------------

  // Mapping available HTML fields to incoming data
  const propertyAddress = userData.propertyAddress || "N/A";
  const unitNumber = userData.unit || "N/A";
  const leaseTerm = userData.leaseTerm || "N/A";
  const moveInDate = userData.moveInDate || "N/A";
  const rentAmountDisplay = userData.rentAmount
    ? `$${userData.rentAmount.toLocaleString()}`
    : "N/A";

  // 1. Populate Dashboard/Header Data
  const userNameElements = document.querySelectorAll(
    ".user-name-display, #user-name"
  );
  userNameElements.forEach((el) => {
    el.textContent = name;
  });

  const rentAmountEl = document.getElementById("rent-amount-display");
  if (rentAmountEl) rentAmountEl.textContent = rentAmountDisplay;

  const dueDateEl = document.getElementById("due-date-display");
  if (dueDateEl) dueDateEl.textContent = userData.dueDate || "N/A";

  const propertyNameEl = document.getElementById("property-name-display");
  if (propertyNameEl) propertyNameEl.textContent = propertyAddress;

  // 2. Populate Read-Only Profile Display
  // Contact Information
  const readOnlyName = document.getElementById("profile-name");
  if (readOnlyName) readOnlyName.textContent = name;

  const readOnlyEmail = document.getElementById("profile-email");
  if (readOnlyEmail) readOnlyEmail.textContent = email;

  const readOnlyPhone = document.getElementById("profile-phone");
  if (readOnlyPhone) readOnlyPhone.textContent = phone;

  // --- DISPLAY NEW FIELDS ---
  const profileDob = document.getElementById("profile-dob");
  if (profileDob) profileDob.textContent = dob;

  const profileTaxId = document.getElementById("profile-tax-id");
  if (profileTaxId) profileTaxId.textContent = taxId;

  const profileEmergencyPhone = document.getElementById(
    "profile-emergency-phone"
  );
  if (profileEmergencyPhone) profileEmergencyPhone.textContent = emergencyPhone;

  const profilePermanentAddress = document.getElementById(
    "profile-permanent-address"
  );
  if (profilePermanentAddress)
    profilePermanentAddress.textContent = permanentAddress.replace(/\n/g, ", "); // Display multi-line address as comma-separated

  const profilePreviousAddress = document.getElementById(
    "profile-previous-address"
  );
  if (profilePreviousAddress)
    profilePreviousAddress.textContent = previousAddress.replace(/\n/g, ", ");
  // --------------------------

  // Lease Details
  const profileProperty = document.getElementById("profile-property");
  if (profileProperty) profileProperty.textContent = propertyAddress;

  const profileUnit = document.getElementById("profile-unit");
  if (profileUnit) profileUnit.textContent = unitNumber;

  const profileLeaseTerm = document.getElementById("profile-lease-term");
  if (profileLeaseTerm) profileLeaseTerm.textContent = leaseTerm;

  const profileMoveIn = document.getElementById("profile-move-in");
  if (profileMoveIn) profileMoveIn.textContent = moveInDate;
};

/**
 * Handles the profile form submission and updates Firestore. (UPDATED)
 * Now includes logic for the new profile fields.
 * @param {Event} e - The form submission event.
 */
async function saveTenantProfile(e) {
  e.preventDefault();

  if (!firebase.auth().currentUser || !currentTenantData.uid) {
    showStatusMessage("Authentication error. Please log in again.", "error");
    return;
  }

  const uid = currentTenantData.uid;
  const db = firebase.firestore();

  // Get data from form inputs
  const newName = document.getElementById("profile-edit-name").value.trim();
  const newPhone = document.getElementById("profile-edit-phone").value.trim();
  // --- GET NEW FIELDS ---
  const newDob = document.getElementById("profile-edit-dob").value.trim();
  const newTaxId = document.getElementById("profile-edit-tax-id").value.trim();
  const newEmergencyPhone = document
    .getElementById("profile-edit-emergency-phone")
    .value.trim();
  const newPermanentAddress = document
    .getElementById("profile-edit-permanent-address")
    .value.trim();
  const newPreviousAddress = document
    .getElementById("profile-edit-previous-address")
    .value.trim();
  // ----------------------

  if (!newName) {
    showStatusMessage("Full Name cannot be empty.", "error");
    return;
  }

  // Construct the update object
  const updateData = {
    name: newName,
    phone: newPhone,
    // --- ADD NEW FIELDS TO UPDATE OBJECT ---
    dob: newDob,
    taxId: newTaxId,
    emergencyPhone: newEmergencyPhone,
    permanentAddress: newPermanentAddress,
    previousAddress: newPreviousAddress,
    // --------------------------------------
    lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
  };

  // Disable button and show loading state
  const saveBtn = document.getElementById("save-profile-btn");
  const originalHtml = saveBtn.innerHTML;
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

  try {
    const docRef = db.collection("tenants").doc(uid);
    // Use .update() to merge changes without overwriting the whole document
    await docRef.update(updateData);

    // Update the local data
    currentTenantData = { ...currentTenantData, ...updateData };

    // RE-RUN FULL UI UPDATE to refresh all read-only spans and header
    window.updateTenantProfileUI(currentTenantData);

    showStatusMessage("Profile updated successfully!", "success");
  } catch (error) {
    console.error("Error updating profile:", error);
    // Display a user-friendly error
    showStatusMessage(`Failed to update profile: ${error.message}`, "error");
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = originalHtml;
  }
}

// --- Event Listeners and Sidebar Logic (kept for completeness) ---

// Toggle mobile menu
if (menuToggle) {
  menuToggle.addEventListener("click", () => {
    sidebar.classList.add("active");
  });
}

if (closeSidebar) {
  closeSidebar.addEventListener("click", () => {
    sidebar.classList.remove("active");
  });
}

// Navigation between sections
navItems.forEach((item) => {
  item.addEventListener("click", (e) => {
    e.preventDefault();

    // Remove active class from all items
    navItems.forEach((nav) => nav.classList.remove("active"));

    // Add active class to clicked item
    item.classList.add("active");

    // Get section name
    const sectionName = item.dataset.section;

    // Hide all sections
    contentSections.forEach((section) => section.classList.remove("active"));

    // Show selected section
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
      targetSection.classList.add("active");
    }

    // Update page title
    const pageTitle = document.querySelector(".page-title");
    if (pageTitle) {
      pageTitle.textContent =
        sectionName.charAt(0).toUpperCase() + sectionName.slice(1);
    }

    // For mobile: close sidebar after navigation
    sidebar.classList.remove("active");
  });
});

// Change avatar logic
document
  .getElementById("change-avatar-btn")
  ?.addEventListener("click", function () {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = function (e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (event) {
          document.getElementById("profile-avatar-img").src =
            event.target.result;
          showStatusMessage(
            "Avatar image changed locally. Upload to storage functionality needed.",
            "info"
          );
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  });

// Change banner logic
document
  .getElementById("change-banner-btn")
  ?.addEventListener("click", function () {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = function (e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (event) {
          document.getElementById("profile-banner-img").src =
            event.target.result;
          showStatusMessage(
            "Banner image changed locally. Upload to storage functionality needed.",
            "info"
          );
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  });

// Add event listener to the profile form
document.addEventListener("DOMContentLoaded", () => {
  const profileForm = document.getElementById("profile-edit-form");
  if (profileForm) {
    profileForm.addEventListener("submit", saveTenantProfile);
  }
});

// Modal functions (placeholders - using console.log instead of alerts)
function openPaymentModal() {
  console.log("Payment modal would open here - integrate with payment gateway");
}

function downloadLease() {
  console.log("Lease download would start here");
}

function contactLandlord() {
  console.log("Contact landlord modal would open here");
}

function openMaintenanceModal() {
  console.log("New Maintenance Request modal would open here");
}

function composeMessage() {
  console.log("Compose new message modal would open here");
}

// Password change function
function changePassword() {
  console.log(
    "Password change functionality would be implemented here with a modal"
  );
}

// Two-factor auth logic (placeholder)
function toggleTwoFactor(event) {
  console.log("Two-factor authentication toggle logic (placeholder)");
}

// Ensure global functions are attached to the window for inline HTML calls
window.openPaymentModal = openPaymentModal;
window.downloadLease = downloadLease;
window.contactLandlord = contactLandlord;
window.openMaintenanceModal = openMaintenanceModal;
window.composeMessage = composeMessage;
window.changePassword = changePassword;
window.toggleTwoFactor = toggleTwoFactor;
window.showStatusMessage = showStatusMessage;
window.openEditProfileModal = openEditProfileModal; // Exposed modal functions
window.closeEditProfileModal = closeEditProfileModal;
