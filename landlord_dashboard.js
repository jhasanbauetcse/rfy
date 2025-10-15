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

/* ---------------- State ---------------- */
let currentUser = null;
let landlordProfile = null;
let properties = [];
let tenants = [];
let maintenanceRequests = [];
let announcements = [];
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
    $("#pName").textContent = landlordProfile.fullName || "—";
    $("#pEmail").textContent = landlordProfile.email || user.email || "—";
    $("#pPhone").textContent = landlordProfile.phone || "—";
    $("#pCreated").textContent = fmtDate(landlordProfile.createdAt);

    await loadData();
  } catch (e) {
    console.error(e);
    alert("Unable to load landlord dashboard.");
  }
});

async function loadData() {
  await loadProperties();
  await loadTenants();
  await loadMaintenanceRequests();
  await loadAnnouncements();
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
    alert("Failed to add property. Please try again.");
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
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <div>
              <strong>${req.title}</strong>
              <p class="muted" style="margin: 4px 0 0;">
                  Tenant: ${tenant ? tenant.fullName : "N/A"} •
                  Property: ${propertyIdentifier} •
                  Reported: ${fmtDate(req.createdAt)}
              </p>
          </div>
          <span class="muted" style="text-transform: capitalize; flex-shrink: 0;">${
            req.status
          }</span>
      </div>
    `;
    list.appendChild(div);
  }
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
    alert("Please fill out both title and details.");
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
      alert("Please select at least one tenant.");
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
    alert("Failed to send announcement.");
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
    alert("Tenant not found.");
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
    rentAmount: Number($("#rentAmount").value),
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

    alert("Tenant lease added successfully!");
    addTenantModal.close();
    await loadData();
  } catch (error) {
    console.error("Error adding lease:", error);
    alert("Failed to add lease.");
  }
});

function resetAddTenantForm() {
  verifyTenantForm.reset();
  addLeaseForm.reset();
  addLeaseSection.classList.add("hidden");
  verifyTenantForm.classList.remove("hidden");
  verifiedTenant = null;
}

/* ---------------- Logout ---------------- */
$("#logoutBtn").addEventListener("click", async () => {
  await auth.signOut();
  window.location.href = "auth.html";
});
