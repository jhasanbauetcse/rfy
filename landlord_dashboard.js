/* ---------------- Mobile Menu Toggle ---------------- */
function setupMenu() {
  const menuToggle = document.querySelector(".menu-toggle");
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.querySelector(".overlay");
  const navLinks = document.querySelectorAll(".nav-link");

  const closeMenu = () => {
    if (sidebar.classList.contains("active")) {
      sidebar.classList.remove("active");
      overlay.classList.remove("active");
    }
  };

  if (menuToggle && sidebar && overlay) {
    menuToggle.addEventListener("click", () => {
      sidebar.classList.toggle("active");
      overlay.classList.toggle("active");
    });

    overlay.addEventListener("click", closeMenu);
    navLinks.forEach((link) => link.addEventListener("click", closeMenu));
  }
}
setupMenu(); // Initialize the menu functionality

/* ---------------- Firebase Init ---------------- */
const firebaseConfig = {
  apiKey: "AIzaSyA-Fv4SsvvMu8K2-eEk4t3ffWB_brbMoJU",
  authDomain: "rentify-58df7.firebaseapp.com",
  projectId: "rentify-58df7",
  storageBucket: "rentify-58df7.appspot.com",
  messagingSenderId: "892024907401",
  appId: "1:892024907401:web:35876b5cd252f9f81c0858",
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

/* ---------------- Small helpers ---------------- */
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const fmtMoney = (n) =>
  n == null || n === 0 ? "—" : `৳${Number(n).toLocaleString("en-BD")}`;
const fmtDate = (d) => {
  if (!d) return "—";
  const dt = d instanceof Date ? d : d?.toDate ? d.toDate() : new Date(d);
  return dt.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* ---------------- Modal Refs ---------------- */
const addTenantModal = $("#addTenantModal");
const addPropertyModal = $("#addPropertyModal");
const propertyDetailsModal = $("#propertyDetailsModal");
const addAnnouncementModal = $("#addAnnouncementModal");
const specificTenantsListWrapper = $("#specificTenantsListWrapper");
// TECHNICIAN MODAL REFS
const addTechnicianModal = $("#addTechnicianModal");
const addTechnicianForm = $("#addTechnicianForm");
const technicianModalTitle = $("#technicianModalTitle");
const technicianIdInput = $("#technicianId");
// MAINTENANCE MODAL REFS
const maintenanceDetailsModal = $("#maintenanceDetailsModal");
const updateMaintenanceForm = $("#updateMaintenanceForm");
// NEW: MESSAGE MODAL
const messageModal = $("#messageModal");
const messageModalTitle = $("#messageModalTitle");
const messageModalText = $("#messageModalText");
const messageModalClose = $("#messageModalClose");

// NEW: Custom Message Box
function showMessage(title, text) {
  messageModalTitle.textContent = title;
  messageModalText.textContent = text;
  messageModal.showModal();
}
messageModalClose.addEventListener("click", () => messageModal.close());

/* EDIT PROFILE: Added references to profile elements */
const profileSection = $("#section-profile");
const editProfileBtn = $("#editProfileBtn");
const saveProfileBtn = $("#saveProfileBtn");
const cancelEditBtn = $("#cancelEditBtn");
const pName = $("#pName");
const pPhone = $("#pPhone");
const pNameInput = $("#pNameInput");
const pPhoneInput = $("#pPhoneInput");
const pEmail = $("#pEmail");
const pEmailInput = $("#pEmailInput");
const pNid = $("#pNid");
const pNidInput = $("#pNidInput");
const pDob = $("#pDob");
const pDobInput = $("#pDobInput");

/* ---------------- State ---------------- */
let currentUser = null;
let landlordProfile = null;
let properties = [];
let tenants = [];
let maintenanceRequests = [];
let announcements = [];
let technicians = [];
let payments = []; // NEW: Payments state
let verifiedTenant = null;

/* ---------------- Auth guard (landlord only) ---------------- */
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "auth.html";
    return;
  }
  currentUser = user;

  try {
    const lDoc = await db.collection("landlords").doc(user.uid).get();
    if (!lDoc.exists) {
      const tDoc = await db.collection("tenants").doc(user.uid).get();
      if (tDoc.exists) {
        window.location.href = "tenant_dashboard.html";
      } else {
        await auth.signOut();
        window.location.href = "auth.html";
      }
      return;
    }

    landlordProfile = { uid: user.uid, ...lDoc.data() };
    $("#landlordName").textContent = landlordProfile.fullName || "Landlord";
    pName.textContent = landlordProfile.fullName || "—";
    pEmail.textContent = landlordProfile.email || user.email || "—";
    pPhone.textContent = landlordProfile.phone || "—";
    pNid.textContent = landlordProfile.nid || "—";
    pDob.textContent = landlordProfile.dob ? fmtDate(landlordProfile.dob) : "—";
    $("#pCreated").textContent = fmtDate(landlordProfile.createdAt);

    await loadData();
  } catch (e) {
    console.error(e);
    showMessage("Error", "Unable to load landlord dashboard.");
  }
});

async function loadData() {
  await loadProperties();
  await loadTenants();
  await loadTechnicians(); // Load technicians BEFORE maintenance
  await loadMaintenanceRequests();
  await loadAnnouncements();
  await loadPayments(); // NEW: Load payments
}

/* ---------------- Load Properties ---------------- */
async function loadProperties() {
  properties = [];
  const propSnap = await db
    .collection("properties")
    .where("landlordId", "==", currentUser.uid)
    .get();
  propSnap.forEach((d) => properties.push({ id: d.id, ...d.data() }));

  const totalRent = properties.reduce(
    (acc, p) => acc + (Number(p.rentAmount) || 0),
    0
  );
  const totalProperties = properties.length;
  const occupiedProperties = properties.filter((p) => p.occupants > 0).length;
  const occupancyRate =
    totalProperties > 0 ? (occupiedProperties / totalProperties) * 100 : 0;

  $("#monthlyRentCollected").textContent = fmtMoney(totalRent);
  $("#occupancyRate").textContent = `${occupancyRate.toFixed(1)}%`;

  renderQuickActions();
  renderProperties();
}

/* ---------------- Render Properties ---------------- */
function renderProperties() {
  const grid = $("#propertiesGrid");
  grid.innerHTML = "";

  if (!properties.length) {
    grid.innerHTML = `<div class="list-item" style="grid-column: 1 / -1;">You haven't added any properties yet. Click "Add Property" to get started.</div>`;
    return;
  }

  properties.forEach((p) => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
          <div class="card-label" style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${
            p.propertyName || p.address
          }</div>
           <div class="card-meta" style="font-size: 14px;">${p.address} ${
      p.unit ? `(Unit ${p.unit})` : ""
    }</div>
          <div class="card-value">${fmtMoney(p.rentAmount)}</div>
          <div class="card-meta">
              ${p.bedrooms || "N/A"} beds • ${p.bathrooms || "N/A"} baths
          </div>
          <div class="qa-actions">
              <button class="btn" data-property-id="${p.id}">Details</button>
          </div>
          `;
    grid.appendChild(div);
  });
}

/* ---------------- Add/View Property Logic ---------------- */
$("#addPropertyBtn").addEventListener("click", () => {
  addPropertyModal.showModal();
});

$("#cancelAddPropertyBtn").addEventListener("click", () => {
  addPropertyModal.close();
  $("#addPropertyForm").reset();
});

addPropertyModal.addEventListener("close", () => {
  $("#addPropertyForm").reset();
});

$("#addPropertyForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const propertyData = {
    landlordId: currentUser.uid,
    propertyName: $("#propertyName").value,
    unit: $("#propertyUnit").value,
    address: $("#propertyAddress").value,
    rentAmount: Number($("#propertyRent").value) || 0,
    bedrooms: Number($("#propertyBedrooms").value) || 0,
    bathrooms: Number($("#propertyBathrooms").value) || 0,
    sqft: Number($("#propertySqft").value) || 0,
    details: $("#propertyDetails").value || "",
    occupants: 0,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  };

  try {
    await db.collection("properties").add(propertyData);
    addPropertyModal.close();
    await loadProperties();
  } catch (error) {
    console.error("Error adding property: ", error);
    showMessage("Error", "Failed to add property. Please try again.");
  }
});

$("#propertiesGrid").addEventListener("click", (e) => {
  if (e.target.dataset.propertyId) {
    const propertyId = e.target.dataset.propertyId;
    const prop = properties.find((p) => p.id === propertyId);
    if (prop) {
      showPropertyDetails(prop);
    }
  }
});

function showPropertyDetails(prop) {
  $("#detailsAddress").textContent = prop.address;
  $("#detailsName").textContent = prop.propertyName || "—";
  $("#detailsUnit").textContent = prop.unit || "—";
  $("#detailsRent").textContent = fmtMoney(prop.rentAmount);
  $("#detailsBedrooms").textContent = prop.bedrooms || "—";
  $("#detailsBathrooms").textContent = prop.bathrooms || "—";
  $("#detailsSqft").textContent = prop.sqft ? `${prop.sqft} sqft` : "—";
  $("#detailsOther").textContent =
    prop.details || "No additional details provided.";
  propertyDetailsModal.showModal();
}

$("#closeDetailsBtn").addEventListener("click", () => {
  propertyDetailsModal.close();
});

/* ---------------- Quick Actions ---------------- */
function renderQuickActions() {
  const wrap = $("#quickActions");
  wrap.innerHTML = `
      <button class="qa" id="quickAddProperty">
      <div class="qa-title">Add Property</div>
      <div class="qa-meta">Add new properties to your portfolio</div>
      </button>
      <button class="qa" id="quickAddTenant">
      <div class="qa-title">Add Tenant</div>
      <div class="qa-meta">Onboard a new tenant to a property</div>
      </button>
  `;
  $("#quickAddProperty").addEventListener("click", () => {
    addPropertyModal.showModal();
  });
  $("#quickAddTenant").addEventListener("click", () => {
    addTenantModal.showModal();
  });
}

/* ---------------- Sidebar navigation ---------------- */
$$(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    const sectionName = link.dataset.section;
    $$(".nav-link").forEach((l) => l.classList.remove("active"));
    link.classList.add("active");
    $$(".section").forEach((s) => s.classList.remove("active"));
    const sectionToShow = $(`#section-${sectionName}`);
    if (sectionToShow) sectionToShow.classList.add("active");
  });
});

/* ---------------- Tenants list ---------------- */
async function loadTenants() {
  const list = $("#tenantsList");
  list.innerHTML = "";

  tenants = [];
  const tenantSnap = await db
    .collection("tenants")
    .where("landlordId", "==", currentUser.uid)
    .get();
  tenantSnap.forEach((d) => tenants.push({ id: d.id, ...d.data() }));

  if (!tenants.length) {
    list.innerHTML = `<div class="list-item">No tenants found.</div>`;
    return;
  }

  tenants.forEach((t) => {
    const property = properties.find((p) => p.id === t.propertyId);
    const propertyIdentifier = property
      ? `${property.propertyName} (Unit ${property.unit || "N/A"})`
      : "Not Assigned";
    const div = document.createElement("div");
    div.className = "tenant-card";
    div.innerHTML = `
          <h4>${t.fullName || "Tenant"}</h4>
          <p><strong>Email:</strong> ${t.email || "—"}</p>
          <p><strong>Property:</strong> ${propertyIdentifier}</p>
          <p><strong>Rent Amount:</strong> ${fmtMoney(t.rentAmount)}</p>
      `;
    list.appendChild(div);
  });
}

/* ---------------- Maintenance Requests ---------------- */
async function loadMaintenanceRequests() {
  const list = $("#maintenanceList");
  list.innerHTML = "";
  maintenanceRequests = [];
  const maintSnap = await db
    .collection("maintenance_requests")
    .where("landlordId", "==", currentUser.uid)
    .get();
  maintSnap.forEach((doc) => {
    maintenanceRequests.push({ id: doc.id, ...doc.data() });
  });

  maintenanceRequests.sort(
    (a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0)
  );

  $("#pendingMaintenance").textContent = maintenanceRequests.filter(
    (r) => r.status === "open"
  ).length;

  if (!maintenanceRequests.length) {
    list.innerHTML = `<div class="list-item">No maintenance requests found.</div>`;
    return;
  }

  for (const req of maintenanceRequests) {
    const tenant = tenants.find((t) => t.id === req.tenantId);
    const property = properties.find((p) => p.id === req.propertyId);
    const propertyIdentifier = property
      ? `${property.propertyName} (Unit ${property.unit || "N/A"})`
      : "N/A";
    const status = req.status || "open";

    const div = document.createElement("div");
    div.className = "list-item maintenance-item";
    div.innerHTML = `
      <div class="maintenance-info">
        <strong>${req.title}</strong>
        <span class="muted">
          Tenant: ${tenant ? tenant.fullName : "N/A"}
        </span>
        <span class="muted">
          Property: ${propertyIdentifier}
        </span>
      </div>
      <div class="maintenance-assignment">
        <span class="status-badge ${status}">
          ${status.replace("-", " ")}
        </span>
        <span class="muted" style="font-size: 13px;">
          Technician: ${req.technicianName || "None"}
        </span>
      </div>
      <div class="maintenance-actions">
        <button class="btn" data-action="open-maint" data-request-id="${
          req.id
        }">View</button>
      </div>
    `;
    list.appendChild(div);
  }
}

// Event listener for maintenance list
$("#maintenanceList").addEventListener("click", (e) => {
  const target = e.target.closest("button");
  if (!target) return;

  if (target.dataset.action === "open-maint") {
    openMaintenanceDetailsModal(target.dataset.requestId);
  }
});

// Function to open and populate maintenance details modal
function openMaintenanceDetailsModal(id) {
  const req = maintenanceRequests.find((r) => r.id === id);
  if (!req) return;

  const tenant = tenants.find((t) => t.id === req.tenantId);
  const property = properties.find((p) => p.id === req.propertyId);

  $("#maintenanceModalTitle").textContent = `Request: ${req.title}`;

  // Populate details
  $("#maintModalTenant").textContent = tenant ? tenant.fullName : "N/A";
  $("#maintModalProperty").textContent = property
    ? `${property.propertyName} (Unit ${property.unit || "N/A"})`
    : "N/A";
  $("#maintModalReported").textContent = fmtDate(req.createdAt);
  $("#maintModalIssueTitle").textContent = req.title;
  $("#maintModalIssueDetails").textContent = req.details;

  // Populate form
  $("#maintenanceRequestId").value = id;
  $("#updateStatusSelect").value = req.status || "open";

  const techSelect = $("#assignTechnicianSelect");
  techSelect.innerHTML = '<option value="">None</option>'; // Reset
  technicians.forEach((tech) => {
    techSelect.innerHTML += `
      <option value="${tech.id}">${tech.name} (${tech.role})</option>
    `;
  });
  techSelect.value = req.technicianId || "";

  maintenanceDetailsModal.showModal();
}

// Event listener for closing maintenance modal
$("#cancelUpdateMaintenanceBtn").addEventListener("click", () => {
  maintenanceDetailsModal.close();
});

// Event listener for saving maintenance updates
updateMaintenanceForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = $("#maintenanceRequestId").value;
  const newStatus = $("#updateStatusSelect").value;
  const newTechnicianId = $("#assignTechnicianSelect").value;

  const tech = technicians.find((t) => t.id === newTechnicianId);
  const newTechnicianName = tech ? tech.name : "";

  const updates = {
    status: newStatus,
    technicianId: newTechnicianId,
    technicianName: newTechnicianName,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };

  try {
    const btn = updateMaintenanceForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = "Saving...";

    await db.collection("maintenance_requests").doc(id).update(updates);

    maintenanceDetailsModal.close();
    await loadMaintenanceRequests(); // Refresh the list
  } catch (error) {
    console.error("Error updating maintenance request: ", error);
    showMessage("Error", "Failed to update request.");
  } finally {
    const btn = updateMaintenanceForm.querySelector('button[type="submit"]');
    btn.disabled = false;
    btn.textContent = "Save Changes";
  }
});

/* ---------------- NEW: Payments Logic ---------------- */
async function loadPayments() {
  const list = $("#paymentsList");
  list.innerHTML = "";
  payments = [];

  const snap = await db
    .collection("payments")
    .where("landlordId", "==", currentUser.uid)
    .get();

  snap.forEach((doc) => payments.push({ id: doc.id, ...doc.data() }));

  // Sort by paymentDate, newest first
  payments.sort(
    (a, b) => (b.paymentDate?.toDate() || 0) - (a.paymentDate?.toDate() || 0)
  );

  if (!payments.length) {
    list.innerHTML = `<div class="list-item">No payments received yet.</div>`;
    return;
  }

  list.innerHTML = payments
    .map(
      (p) => `
    <div class="list-item payment-item">
      <div class="payment-info">
        <strong>${fmtMoney(p.amount)}</strong>
        <span class="muted">From: ${p.tenantName || "N/A"}</span>
      </div>
      <div class="payment-details">
        <span class="muted">For: ${p.propertyIdentifier || "N/A"}</span>
        <span class="muted">Month: ${p.forMonthYear || "N/A"}</span>
      </div>
      <div class="payment-status">
        <span class="status-badge completed">Received</span>
        <span class="muted" style="font-size: 13px;">
          On: ${fmtDate(p.paymentDate)}
        </span>
      </div>
    </div>
  `
    )
    .join("");
}

/* ---------------- Announcements Logic ---------------- */
async function loadAnnouncements() {
  const list = $("#announcementsList");
  list.innerHTML = "";
  announcements = [];
  const snap = await db
    .collection("announcements")
    .where("landlordId", "==", currentUser.uid)
    .get();
  snap.forEach((doc) => announcements.push({ id: doc.id, ...doc.data() }));

  announcements.sort(
    (a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0)
  );

  renderAnnouncements();
}

function renderAnnouncements() {
  const list = $("#announcementsList");
  if (!announcements.length) {
    list.innerHTML = `<div class="list-item">You have not sent any announcements.</div>`;
    return;
  }

  list.innerHTML = announcements
    .map(
      (a) => `
        <div class="list-item">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <strong>${a.title}</strong>
                <span class="muted">${fmtDate(a.createdAt)}</span>
            </div>
            <p class="muted" style="margin-top: 8px; white-space: pre-wrap;">${
              a.details
            }</p>
        </div>
    `
    )
    .join("");
}

function populateTenantSelector() {
  specificTenantsListWrapper.innerHTML = ""; // Clear previous list
  if (!tenants.length) {
    specificTenantsListWrapper.innerHTML = `<p class="muted">No tenants found to select from.</p>`;
    return;
  }

  tenants.forEach((t) => {
    const property = properties.find((p) => p.id === t.propertyId);
    const address = property
      ? `${property.propertyName} - Unit ${property.unit || "N/A"}`
      : "Unassigned";
    const div = document.createElement("div");
    div.innerHTML = `
      <label style="display: flex; align-items: center; gap: 8px; font-weight: normal; margin: 8px 0;">
        <input type="checkbox" value="${
          t.id
        }" class="tenant-select-checkbox" style="width: auto;">
        <span>${
          t.fullName || "Tenant"
        } (<span class="muted">${address}</span>)</span>
      </label>
    `;
    specificTenantsListWrapper.appendChild(div);
  });
}

document.querySelectorAll('input[name="recipientType"]').forEach((radio) => {
  radio.addEventListener("change", (e) => {
    if (e.target.value === "specific") {
      specificTenantsListWrapper.classList.remove("hidden");
    } else {
      specificTenantsListWrapper.classList.add("hidden");
    }
  });
});

$("#addAnnouncementBtn").addEventListener("click", () => {
  populateTenantSelector(); // Populate the list when modal is opened
  addAnnouncementModal.showModal();
});

$("#cancelAddAnnouncementBtn").addEventListener("click", () => {
  addAnnouncementModal.close();
});

addAnnouncementModal.addEventListener("close", () => {
  $("#addAnnouncementForm").reset();
  document.querySelector(
    'input[name="recipientType"][value="all"]'
  ).checked = true;
  specificTenantsListWrapper.classList.add("hidden");
});

$("#addAnnouncementForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = $("#announcementTitle").value.trim();
  const details = $("#announcementDetails").value.trim();
  const recipientType = document.querySelector(
    'input[name="recipientType"]:checked'
  ).value;

  if (!title || !details) {
    showMessage("Error", "Please fill out both title and details.");
    return;
  }

  const payload = {
    landlordId: currentUser.uid,
    title,
    details,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    recipientType: recipientType,
  };

  if (recipientType === "specific") {
    const selectedTenants = [
      ...document.querySelectorAll(".tenant-select-checkbox:checked"),
    ].map((cb) => cb.value);
    if (selectedTenants.length === 0) {
      showMessage("Error", "Please select at least one tenant.");
      return;
    }
    payload.recipientIds = selectedTenants;
  }

  try {
    await db.collection("announcements").add(payload);
    addAnnouncementModal.close();
    await loadAnnouncements();
  } catch (error) {
    console.error("Error adding announcement: ", error);
    showMessage("Error", "Failed to send announcement.");
  }
});

/* ---------------- Profile Editing Logic ---------------- */
function toggleProfileEditMode(isEditing) {
  // Toggle visibility of buttons
  editProfileBtn.classList.toggle("hidden", isEditing);
  saveProfileBtn.classList.toggle("hidden", !isEditing);
  cancelEditBtn.classList.toggle("hidden", !isEditing);

  // Toggle visibility of text vs. input fields
  pName.classList.toggle("hidden", isEditing);
  pEmail.classList.toggle("hidden", isEditing);
  pPhone.classList.toggle("hidden", isEditing);
  pNid.classList.toggle("hidden", isEditing);
  pDob.classList.toggle("hidden", isEditing);

  pNameInput.classList.toggle("hidden", !isEditing);
  pEmailInput.classList.toggle("hidden", !isEditing);
  pPhoneInput.classList.toggle("hidden", !isEditing);
  pNidInput.classList.toggle("hidden", !isEditing);
  pDobInput.classList.toggle("hidden", !isEditing);

  if (isEditing) {
    // When entering edit mode, populate inputs with current data
    pNameInput.value = landlordProfile.fullName || "";
    pEmailInput.value = landlordProfile.email || "";
    pPhoneInput.value = landlordProfile.phone || "";
    pNidInput.value = landlordProfile.nid || "";
    pDobInput.value = landlordProfile.dob || "";
  }
}

editProfileBtn.addEventListener("click", () => {
  toggleProfileEditMode(true);
});

cancelEditBtn.addEventListener("click", () => {
  toggleProfileEditMode(false);
});

saveProfileBtn.addEventListener("click", async () => {
  const newFullName = pNameInput.value.trim();
  const newEmail = pEmailInput.value.trim();
  const newPhone = pPhoneInput.value.trim();
  const newNid = pNidInput.value.trim();
  const newDob = pDobInput.value.trim();

  if (!newFullName || !newEmail) {
    showMessage("Error", "Full Name and Email cannot be empty.");
    return;
  }

  const updates = {
    fullName: newFullName,
    email: newEmail,
    phone: newPhone,
    nid: newNid,
    dob: newDob,
  };

  saveProfileBtn.disabled = true;
  saveProfileBtn.textContent = "Saving...";

  try {
    // NOTE: This updates the email in our Firestore database, but not the
    // Firebase Auth email. Updating the auth email is a sensitive action
    // and often requires the user to re-authenticate. For simplicity,
    // we'll just keep the login email the same.
    await db.collection("landlords").doc(currentUser.uid).update(updates);

    // Update local state object
    landlordProfile.fullName = newFullName;
    landlordProfile.email = newEmail;
    landlordProfile.phone = newPhone;
    landlordProfile.nid = newNid;
    landlordProfile.dob = newDob;

    // Update UI text fields
    $("#landlordName").textContent = newFullName || "Landlord"; // Top bar name
    pName.textContent = newFullName || "—";
    pEmail.textContent = newEmail || "—";
    pPhone.textContent = newPhone || "—";
    pNid.textContent = newNid || "—";
    pDob.textContent = newDob ? fmtDate(newDob) : "—";

    toggleProfileEditMode(false);
  } catch (error) {
    console.error("Error updating profile: ", error);
    showMessage("Error", "Failed to update profile. Please try again.");
  } finally {
    saveProfileBtn.disabled = false;
    saveProfileBtn.textContent = "Save Changes";
  }
});

/* ---------------- Add Tenant Modal Logic ---------------- */
const verifyTenantForm = $("#verifyTenantForm");
const addLeaseSection = $("#addLeaseSection");
const addLeaseForm = $("#addLeaseForm");
const propertySelect = $("#propertySelect");

$("#addTenantBtn").addEventListener("click", () => {
  addTenantModal.showModal();
});

function closeAddTenantModal() {
  addTenantModal.close();
}

$("#cancelVerifyBtn").addEventListener("click", closeAddTenantModal);
$("#cancelLeaseBtn").addEventListener("click", closeAddTenantModal);
addTenantModal.addEventListener("close", () => {
  resetAddTenantForm();
});

verifyTenantForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("#tenantEmail").value;
  const phone = $("#tenantPhone").value;

  const tenantQuery = await db
    .collection("tenants")
    .where("email", "==", email)
    .where("phone", "==", phone)
    .get();

  if (tenantQuery.empty) {
    showMessage("Error", "Tenant not found with that email and phone number.");
    return;
  }

  verifiedTenant = {
    id: tenantQuery.docs[0].id,
    ...tenantQuery.docs[0].data(),
  };

  $("#verifiedTenantInfo").textContent = `Name: ${verifiedTenant.fullName}`;
  addLeaseSection.classList.remove("hidden");
  verifyTenantForm.classList.add("hidden");

  propertySelect.innerHTML = properties
    .map(
      (p) =>
        `<option value="${p.id}">${p.propertyName} - Unit ${
          p.unit || "N/A"
        }</option>`
    )
    .join("");
});

addLeaseForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!verifiedTenant) return;
  const propertyId = $("#propertySelect").value;

  const leaseData = {
    landlordId: currentUser.uid,
    propertyId: propertyId,
    leaseDate: new Date($("#leaseDate").value),
    leaseExpiryDate: new Date($("#leaseExpiryDate").value),
    rentAmount: Number($("#rentAmount").value),
    advancePayment: Number($("#advancePayment").value) || 0,
    rentPayDate: Number($("#rentPayDate").value),
  };

  try {
    const tenantUpdate = db
      .collection("tenants")
      .doc(verifiedTenant.id)
      .update(leaseData);
    const propertyUpdate = db
      .collection("properties")
      .doc(propertyId)
      .update({
        occupants: firebase.firestore.FieldValue.increment(1),
      });

    await Promise.all([tenantUpdate, propertyUpdate]);

    showMessage("Success", "Tenant lease added successfully!");
    addTenantModal.close();
    await loadData();
  } catch (error) {
    console.error("Error adding lease:", error);
    showMessage("Error", "Failed to add lease.");
  }
});

function resetAddTenantForm() {
  verifyTenantForm.reset();
  addLeaseForm.reset();
  addLeaseSection.classList.add("hidden");
  verifyTenantForm.classList.remove("hidden");
  verifiedTenant = null;
}

/* ---------------- Technicians Logic ---------------- */

async function loadTechnicians() {
  technicians = [];
  const snap = await db
    .collection("technicians")
    .where("landlordId", "==", currentUser.uid)
    .get();
  snap.forEach((doc) => {
    technicians.push({ id: doc.id, ...doc.data() });
  });
  renderTechnicians();
}

function renderTechnicians() {
  const list = $("#techniciansList");
  list.innerHTML = "";

  if (!technicians.length) {
    list.innerHTML = `<div class="list-item">You have not added any technicians yet.</div>`;
    return;
  }

  technicians.forEach((tech) => {
    const div = document.createElement("div");
    div.className = "list-item technician-item";
    div.innerHTML = `
      <div class="technician-info">
        <strong>${tech.name}</strong>
        <span class="technician-role">${tech.role}</span>
      </div>
      <div class="technician-contact">
        <span>${tech.phone}</span>
        <span>${tech.email || "No email"}</span>
      </div>
      <div class="technician-actions">
        <button class="btn ghost" data-action="edit-tech" data-technician-id="${
          tech.id
        }">Edit</button>
        <button class="btn ghost danger" data-action="remove-tech" data-technician-id="${
          tech.id
        }">Remove</button>
      </div>
    `;
    list.appendChild(div);
  });
}

// Open modal to add
$("#addTechnicianBtn").addEventListener("click", () => {
  addTechnicianForm.reset();
  technicianIdInput.value = "";
  technicianModalTitle.textContent = "Add Technician";
  addTechnicianModal.showModal();
});

// Cancel modal
$("#cancelAddTechnicianBtn").addEventListener("click", () => {
  addTechnicianModal.close();
});

addTechnicianModal.addEventListener("close", () => {
  addTechnicianForm.reset();
  technicianIdInput.value = "";
});

// Handle form submission (Add or Edit)
addTechnicianForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const technicianId = technicianIdInput.value;

  const data = {
    landlordId: currentUser.uid,
    name: $("#technicianName").value,
    role: $("#technicianRole").value,
    phone: $("#technicianPhone").value,
    email: $("#technicianEmail").value || "",
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };

  try {
    if (technicianId) {
      // Editing existing technician
      await db.collection("technicians").doc(technicianId).update(data);
    } else {
      // Adding new technician
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection("technicians").add(data);
    }
    addTechnicianModal.close();
    await loadTechnicians(); // Refresh the list
  } catch (error) {
    console.error("Error saving technician: ", error);
    showMessage("Error", "Failed to save technician.");
  }
});

// Handle Edit and Remove buttons
$("#techniciansList").addEventListener("click", (e) => {
  const target = e.target.closest("button");
  if (!target) return;

  const action = target.dataset.action;
  const id = target.dataset.technicianId;

  if (action === "edit-tech") {
    const tech = technicians.find((t) => t.id === id);
    if (tech) {
      technicianModalTitle.textContent = "Edit Technician";
      technicianIdInput.value = tech.id;
      $("#technicianName").value = tech.name;
      $("#technicianRole").value = tech.role;
      $("#technicianPhone").value = tech.phone;
      $("#technicianEmail").value = tech.email;
      addTechnicianModal.showModal();
    }
  }

  if (action === "remove-tech") {
    // We are avoiding confirm() as per instructions
    // In a real app, a custom confirmation modal would be best.
    // For now, we delete directly.
    deleteTechnician(id);
  }
});

async function deleteTechnician(id) {
  try {
    await db.collection("technicians").doc(id).delete();
    await loadTechnicians(); // Refresh the list
  } catch (error) {
    console.error("Error removing technician: ", error);
    showMessage("Error", "Failed to remove technician.");
  }
}

/* ---------------- Logout ---------------- */
$("#logoutBtn").addEventListener("click", async () => {
  await auth.signOut();
  window.location.href = "auth.html";
});
