// --- Sidebar and Navigation Logic ---
const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menu-toggle");
const closeSidebar = document.getElementById("close-sidebar");
const navItems = document.querySelectorAll(".nav-item");
const contentSections = document.querySelectorAll(".content-section");
const pageTitle = document.querySelector(".page-title");

// Global variable to store the current user data
let currentLandlordData = null;

// Tenant Management Variables
let foundTenant = null;

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

    navItems.forEach((nav) => nav.classList.remove("active"));
    item.classList.add("active");

    const sectionName = item.dataset.section;

    contentSections.forEach((section) => section.classList.remove("active"));

    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
      targetSection.classList.add("active");
    }

    if (pageTitle) {
      // Capitalize first letter of section name for the title
      pageTitle.textContent =
        sectionName.charAt(0).toUpperCase() + sectionName.slice(1);
    }

    if (window.innerWidth <= 992) {
      sidebar.classList.remove("active");
    }
  });
});

// --- Profile Modal Control Functions ---
window.openEditProfileModal = function () {
  const modal = document.getElementById("edit-profile-modal");
  if (modal) {
    // Populate inputs with current data
    if (currentLandlordData) {
      document.getElementById("profile-edit-name").value =
        currentLandlordData.name || "";
      document.getElementById("profile-edit-email").value =
        currentLandlordData.email || "";
      document.getElementById("profile-edit-phone").value =
        currentLandlordData.phone || "";
      document.getElementById("profile-edit-dob").value =
        currentLandlordData.dob || "";
      document.getElementById("profile-edit-tax-id").value =
        currentLandlordData.taxId || "";
      document.getElementById("profile-edit-company-name").value =
        currentLandlordData.companyName || "";
      document.getElementById("profile-edit-office-address").value =
        currentLandlordData.officeAddress || "";
      document.getElementById("profile-edit-business-type").value =
        currentLandlordData.businessType || "";
      document.getElementById("profile-edit-business-years").value =
        currentLandlordData.businessYears || "";
      document.getElementById("profile-edit-emergency-contact").value =
        currentLandlordData.emergencyContact || "";
      document.getElementById("profile-edit-emergency-phone").value =
        currentLandlordData.emergencyPhone || "";
      document.getElementById("profile-edit-license").value =
        currentLandlordData.license || "";
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
function showStatusMessage(message, type) {
  const messageEl = document.getElementById("profile-status-message");
  if (messageEl) {
    messageEl.textContent = message;
    messageEl.className = `status-message ${type}`;
    messageEl.style.display = "block";
    setTimeout(() => {
      messageEl.style.display = "none";
      messageEl.textContent = "";
    }, 5000);
  }
}

/**
 * Global function called by app.js to populate the profile and dashboard UI.
 * @param {object} userData - The landlord's data from Firestore, including UID and email.
 */
window.updateLandlordProfileUI = function (userData) {
  currentLandlordData = userData;
  console.log("Updating Landlord UI with data:", userData);

  if (!userData) return;

  // Populate header username
  const userNameElement = document.getElementById("user-name");
  if (userNameElement) {
    userNameElement.textContent = userData.name || userData.email || "Landlord";
  }

  // Populate profile section with enhanced fields
  const profileName = document.getElementById("profile-name");
  if (profileName) profileName.textContent = userData.name || "N/A";

  const profileEmail = document.getElementById("profile-email");
  if (profileEmail) profileEmail.textContent = userData.email || "N/A";

  const profilePhone = document.getElementById("profile-phone");
  if (profilePhone) profilePhone.textContent = userData.phone || "N/A";

  const profileDob = document.getElementById("profile-dob");
  if (profileDob) profileDob.textContent = userData.dob || "N/A";

  const profileTaxId = document.getElementById("profile-tax-id");
  if (profileTaxId) profileTaxId.textContent = userData.taxId || "N/A";

  const profileCompanyName = document.getElementById("profile-company-name");
  if (profileCompanyName)
    profileCompanyName.textContent = userData.companyName || "N/A";

  const profileOfficeAddress = document.getElementById(
    "profile-office-address"
  );
  if (profileOfficeAddress)
    profileOfficeAddress.textContent = userData.officeAddress || "N/A";

  const profileBusinessType = document.getElementById("profile-business-type");
  if (profileBusinessType)
    profileBusinessType.textContent = userData.businessType || "N/A";

  const profileBusinessYears = document.getElementById(
    "profile-business-years"
  );
  if (profileBusinessYears)
    profileBusinessYears.textContent = userData.businessYears || "N/A";

  const profileEmergencyContact = document.getElementById(
    "profile-emergency-contact"
  );
  if (profileEmergencyContact)
    profileEmergencyContact.textContent = userData.emergencyContact || "N/A";

  const profileEmergencyPhone = document.getElementById(
    "profile-emergency-phone"
  );
  if (profileEmergencyPhone)
    profileEmergencyPhone.textContent = userData.emergencyPhone || "N/A";

  const profileLicense = document.getElementById("profile-license");
  if (profileLicense) profileLicense.textContent = userData.license || "N/A";
};

/**
 * Handles the profile form submission and updates Firestore.
 * @param {Event} e - The form submission event.
 */
async function saveLandlordProfile(e) {
  e.preventDefault();

  if (!firebase.auth().currentUser || !currentLandlordData.uid) {
    showStatusMessage("Authentication error. Please log in again.", "error");
    return;
  }

  const uid = currentLandlordData.uid;
  const db = firebase.firestore();

  // Get data from form inputs
  const newName = document.getElementById("profile-edit-name").value.trim();
  const newPhone = document.getElementById("profile-edit-phone").value.trim();
  const newDob = document.getElementById("profile-edit-dob").value.trim();
  const newTaxId = document.getElementById("profile-edit-tax-id").value.trim();
  const newCompanyName = document
    .getElementById("profile-edit-company-name")
    .value.trim();
  const newOfficeAddress = document
    .getElementById("profile-edit-office-address")
    .value.trim();
  const newBusinessType = document
    .getElementById("profile-edit-business-type")
    .value.trim();
  const newBusinessYears = document
    .getElementById("profile-edit-business-years")
    .value.trim();
  const newEmergencyContact = document
    .getElementById("profile-edit-emergency-contact")
    .value.trim();
  const newEmergencyPhone = document
    .getElementById("profile-edit-emergency-phone")
    .value.trim();
  const newLicense = document
    .getElementById("profile-edit-license")
    .value.trim();

  if (!newName) {
    showStatusMessage("Full Name cannot be empty.", "error");
    return;
  }

  // Construct the update object
  const updateData = {
    name: newName,
    phone: newPhone,
    dob: newDob,
    taxId: newTaxId,
    companyName: newCompanyName,
    officeAddress: newOfficeAddress,
    businessType: newBusinessType,
    businessYears: newBusinessYears,
    emergencyContact: newEmergencyContact,
    emergencyPhone: newEmergencyPhone,
    license: newLicense,
    lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
  };

  // Disable button and show loading state
  const saveBtn = document.getElementById("save-profile-btn");
  const originalHtml = saveBtn.innerHTML;
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

  try {
    const docRef = db.collection("landlords").doc(uid);
    await docRef.update(updateData);

    // Update the local data
    currentLandlordData = { ...currentLandlordData, ...updateData };

    // Refresh UI
    window.updateLandlordProfileUI(currentLandlordData);

    showStatusMessage("Profile updated successfully!", "success");
  } catch (error) {
    console.error("Error updating profile:", error);
    showStatusMessage(`Failed to update profile: ${error.message}`, "error");
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = originalHtml;
  }
}

// --- Tenant Management Functions ---

// Modal Control Functions for Tenant Management
window.openAddTenantModal = function () {
  const modal = document.getElementById("add-tenant-modal");
  if (modal) {
    resetAddTenantModal();
    modal.style.display = "block";
  }
};

window.closeAddTenantModal = function () {
  const modal = document.getElementById("add-tenant-modal");
  if (modal) {
    modal.style.display = "none";
    resetAddTenantModal();
  }
};

function resetAddTenantModal() {
  // Reset form
  document.getElementById("add-tenant-form").reset();

  // Reset steps
  document.getElementById("step-search").classList.add("active");
  document.getElementById("step-assign").classList.remove("active");

  // Clear status message
  const messageEl = document.getElementById("tenant-status-message");
  if (messageEl) {
    messageEl.style.display = "none";
    messageEl.textContent = "";
  }

  // Clear found tenant
  foundTenant = null;
}

function backToSearch() {
  document.getElementById("step-search").classList.add("active");
  document.getElementById("step-assign").classList.remove("active");
}

// Search Tenant Function
async function searchTenant() {
  const email = document.getElementById("tenant-search-email").value.trim();
  const phone = document.getElementById("tenant-search-phone").value.trim();

  if (!email || !phone) {
    showTenantStatusMessage(
      "Please enter both email and phone number.",
      "error"
    );
    return;
  }

  const searchBtn = document.querySelector("#step-search .btn-primary");
  const originalText = searchBtn.innerHTML;
  searchBtn.disabled = true;
  searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';

  try {
    const db = firebase.firestore();

    // Search for tenant by email
    const tenantsSnapshot = await db
      .collection("tenants")
      .where("email", "==", email)
      .where("phone", "==", phone)
      .get();

    if (tenantsSnapshot.empty) {
      showTenantStatusMessage(
        "No tenant found with matching email and phone number. Please check the details and try again.",
        "error"
      );
      return;
    }

    // Get the first matching tenant
    const tenantDoc = tenantsSnapshot.docs[0];
    foundTenant = {
      id: tenantDoc.id,
      ...tenantDoc.data(),
    };

    // Check if tenant is already assigned to this landlord
    const landlordId = currentLandlordData.uid;
    if (foundTenant.landlordId === landlordId) {
      showTenantStatusMessage(
        "This tenant is already assigned to your property.",
        "error"
      );
      return;
    }

    // Update UI with tenant info
    document.getElementById("found-tenant-name").textContent =
      foundTenant.name || "N/A";
    document.getElementById("found-tenant-email").textContent =
      foundTenant.email || "N/A";
    document.getElementById("found-tenant-phone").textContent =
      foundTenant.phone || "N/A";

    // Move to next step
    document.getElementById("step-search").classList.remove("active");
    document.getElementById("step-assign").classList.add("active");

    showTenantStatusMessage(
      "Tenant found! Please assign property details.",
      "success"
    );
  } catch (error) {
    console.error("Error searching for tenant:", error);
    showTenantStatusMessage(
      `Error searching for tenant: ${error.message}`,
      "error"
    );
  } finally {
    searchBtn.disabled = false;
    searchBtn.innerHTML = originalText;
  }
}

// Assign Property to Tenant
async function assignPropertyToTenant() {
  if (!foundTenant) {
    showTenantStatusMessage(
      "No tenant selected. Please search for a tenant first.",
      "error"
    );
    return;
  }

  const propertyAddress = document
    .getElementById("property-address")
    .value.trim();
  const unitNumber = document.getElementById("unit-number").value.trim();
  const rentAmount = parseFloat(document.getElementById("rent-amount").value);
  const leaseStart = document.getElementById("lease-start").value;
  const leaseEnd = document.getElementById("lease-end").value;
  const securityDeposit = parseFloat(
    document.getElementById("security-deposit").value
  );

  // Validation
  if (
    !propertyAddress ||
    !unitNumber ||
    !rentAmount ||
    !leaseStart ||
    !leaseEnd ||
    !securityDeposit
  ) {
    showTenantStatusMessage("Please fill in all property details.", "error");
    return;
  }

  if (rentAmount <= 0 || securityDeposit < 0) {
    showTenantStatusMessage(
      "Rent amount and security deposit must be positive values.",
      "error"
    );
    return;
  }

  const assignBtn = document.querySelector("#step-assign .btn-primary");
  const originalText = assignBtn.innerHTML;
  assignBtn.disabled = true;
  assignBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Assigning...';

  try {
    const db = firebase.firestore();
    const landlordId = currentLandlordData.uid;

    // Update tenant document with landlord and property information
    await db
      .collection("tenants")
      .doc(foundTenant.id)
      .update({
        landlordId: landlordId,
        landlordName: currentLandlordData.name,
        propertyAddress: propertyAddress,
        unit: unitNumber,
        rentAmount: rentAmount,
        leaseStart: leaseStart,
        leaseEnd: leaseEnd,
        securityDeposit: securityDeposit,
        leaseTerm: `${leaseStart} to ${leaseEnd}`,
        status: "active",
        assignedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

    // Add tenant to landlord's tenants subcollection
    await db
      .collection("landlords")
      .doc(landlordId)
      .collection("tenants")
      .doc(foundTenant.id)
      .set({
        tenantId: foundTenant.id,
        tenantName: foundTenant.name,
        tenantEmail: foundTenant.email,
        tenantPhone: foundTenant.phone,
        propertyAddress: propertyAddress,
        unit: unitNumber,
        rentAmount: rentAmount,
        leaseStart: leaseStart,
        leaseEnd: leaseEnd,
        securityDeposit: securityDeposit,
        status: "active",
        assignedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

    showTenantStatusMessage(
      "Tenant successfully assigned to property!",
      "success"
    );

    // Refresh tenants list
    setTimeout(() => {
      closeAddTenantModal();
      loadLandlordTenants();
    }, 1500);
  } catch (error) {
    console.error("Error assigning property to tenant:", error);
    showTenantStatusMessage(
      `Error assigning property: ${error.message}`,
      "error"
    );
  } finally {
    assignBtn.disabled = false;
    assignBtn.innerHTML = originalText;
  }
}

// Load Landlord's Tenants
async function loadLandlordTenants() {
  if (!currentLandlordData || !currentLandlordData.uid) {
    console.error("No landlord data available");
    return;
  }

  try {
    const db = firebase.firestore();
    const landlordId = currentLandlordData.uid;

    const tenantsSnapshot = await db
      .collection("landlords")
      .doc(landlordId)
      .collection("tenants")
      .orderBy("assignedAt", "desc")
      .get();

    const tenantsList = document.getElementById("tenants-list");

    if (tenantsSnapshot.empty) {
      tenantsList.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-users" style="font-size: 3rem; color: var(--text-light); margin-bottom: 1rem;"></i>
          <h3>No Tenants Added Yet</h3>
          <p>Click "Add New Tenant" to onboard your first tenant.</p>
        </div>
      `;
      return;
    }

    let tenantsHTML = "";

    tenantsSnapshot.forEach((doc) => {
      const tenant = doc.data();
      tenantsHTML += `
        <div class="tenant-card">
          <div class="tenant-card-header">
            <h4>${tenant.tenantName}</h4>
            <span class="tenant-status status-active">Active</span>
          </div>
          <div class="tenant-details">
            <p><strong>Email:</strong> ${tenant.tenantEmail}</p>
            <p><strong>Phone:</strong> ${tenant.tenantPhone}</p>
            <p><strong>Property:</strong> ${tenant.propertyAddress}</p>
            <p><strong>Unit:</strong> ${tenant.unit}</p>
            <p><strong>Rent:</strong> $${tenant.rentAmount}/month</p>
            <p><strong>Lease:</strong> ${tenant.leaseStart} to ${tenant.leaseEnd}</p>
          </div>
          <div class="tenant-actions">
            <button class="btn btn-secondary btn-sm" onclick="viewTenantDetails('${doc.id}')">
              <i class="fas fa-eye"></i> View
            </button>
            <button class="btn btn-warning btn-sm" onclick="editTenantAssignment('${doc.id}')">
              <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn btn-danger btn-sm" onclick="removeTenant('${doc.id}')">
              <i class="fas fa-trash"></i> Remove
            </button>
          </div>
        </div>
      `;
    });

    tenantsList.innerHTML = tenantsHTML;
  } catch (error) {
    console.error("Error loading tenants:", error);
    const tenantsList = document.getElementById("tenants-list");
    tenantsList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--danger-color); margin-bottom: 1rem;"></i>
        <h3>Error Loading Tenants</h3>
        <p>Please try refreshing the page.</p>
      </div>
    `;
  }
}

// Tenant Action Functions
function viewTenantDetails(tenantId) {
  // Implement view tenant details functionality
  console.log("View tenant:", tenantId);
  alert("View tenant details functionality to be implemented");
}

function editTenantAssignment(tenantId) {
  // Implement edit tenant assignment functionality
  console.log("Edit tenant:", tenantId);
  alert("Edit tenant assignment functionality to be implemented");
}

async function removeTenant(tenantId) {
  if (
    !confirm(
      "Are you sure you want to remove this tenant? This will unassign them from your property but won't delete their account."
    )
  ) {
    return;
  }

  try {
    const db = firebase.firestore();
    const landlordId = currentLandlordData.uid;

    // Remove from landlord's tenants collection
    await db
      .collection("landlords")
      .doc(landlordId)
      .collection("tenants")
      .doc(tenantId)
      .delete();

    // Clear landlord info from tenant's main document
    await db.collection("tenants").doc(tenantId).update({
      landlordId: firebase.firestore.FieldValue.delete(),
      landlordName: firebase.firestore.FieldValue.delete(),
      propertyAddress: firebase.firestore.FieldValue.delete(),
      unit: firebase.firestore.FieldValue.delete(),
      rentAmount: firebase.firestore.FieldValue.delete(),
      leaseStart: firebase.firestore.FieldValue.delete(),
      leaseEnd: firebase.firestore.FieldValue.delete(),
      securityDeposit: firebase.firestore.FieldValue.delete(),
      leaseTerm: firebase.firestore.FieldValue.delete(),
      status: firebase.firestore.FieldValue.delete(),
    });

    showTenantStatusMessage("Tenant removed successfully!", "success");
    loadLandlordTenants();
  } catch (error) {
    console.error("Error removing tenant:", error);
    showTenantStatusMessage(`Error removing tenant: ${error.message}`, "error");
  }
}

// Utility function for tenant status messages
function showTenantStatusMessage(message, type) {
  const messageEl = document.getElementById("tenant-status-message");
  if (messageEl) {
    messageEl.textContent = message;
    messageEl.className = `status-message ${type}`;
    messageEl.style.display = "block";
    setTimeout(() => {
      messageEl.style.display = "none";
      messageEl.textContent = "";
    }, 5000);
  }
}

// --- Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
  // Profile form event listener
  const profileForm = document.getElementById("profile-edit-form");
  if (profileForm) {
    profileForm.addEventListener("submit", saveLandlordProfile);
  }

  // Load tenants when the tenants section is active
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      const sectionName = item.dataset.section;
      if (sectionName === "tenants") {
        setTimeout(loadLandlordTenants, 100);
      }
    });
  });

  // Auto-load tenants if already on tenants section
  const currentSection = document.querySelector(".content-section.active");
  if (currentSection && currentSection.id === "tenants-section") {
    setTimeout(loadLandlordTenants, 500);
  }
});

// --- Global Function Exports ---
window.openEditProfileModal = openEditProfileModal;
window.closeEditProfileModal = closeEditProfileModal;
window.showStatusMessage = showStatusMessage;
window.openAddTenantModal = openAddTenantModal;
window.closeAddTenantModal = closeAddTenantModal;
window.searchTenant = searchTenant;
window.backToSearch = backToSearch;
window.assignPropertyToTenant = assignPropertyToTenant;
window.viewTenantDetails = viewTenantDetails;
window.editTenantAssignment = editTenantAssignment;
window.removeTenant = removeTenant;
