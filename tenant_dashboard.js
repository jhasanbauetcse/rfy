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
  n == null ? "—" : `৳${Number(n).toLocaleString("en-BD")}`;
const fmtDate = (d) => {
  if (!d) return "—";
  // Handles Firestore Timestamps, ISO strings, and Date objects
  const dt = d instanceof Date ? d : d?.toDate ? d.toDate() : new Date(d);
  // Return date in YYYY-MM-DD for input[type=date] compatibility and display
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${day}-${month}-${year}`;
};
const fmtDateForInput = (d) => {
  if (!d) return "";
  const dt = d instanceof Date ? d : d?.toDate ? d.toDate() : new Date(d);
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function setActiveSection(name) {
  $$(".nav-link").forEach((a) =>
    a.classList.toggle("active", a.dataset.section === name)
  );
  $$(".section").forEach((s) =>
    s.classList.toggle("active", s.id === `section-${name}`)
  );
}

/* ---------------- Sidebar navigation ---------------- */
$$(".nav-link").forEach((a) =>
  a.addEventListener("click", () => setActiveSection(a.dataset.section))
);

/* ---------------- State ---------------- */
let currentUser = null;
let tenantProfile = null;
let leases = [];

/* ---------------- Auth guard (tenant only) ---------------- */
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "auth.html";
    return;
  }
  currentUser = user;

  try {
    const tDoc = await db.collection("tenants").doc(user.uid).get();
    if (!tDoc.exists) {
      const lDoc = await db.collection("landlords").doc(user.uid).get();
      if (lDoc.exists) {
        window.location.href = "landlord_dashboard.html";
        return;
      }
      await auth.signOut();
      window.location.href = "auth.html";
      return;
    }

    tenantProfile = { uid: user.uid, ...tDoc.data() };
    $("#tenantName").textContent = tenantProfile.fullName || "Tenant";

    renderProfileDetails();

    await loadLeasesAndStats();
    await loadMaintenance();
    await loadPayments();
    await loadAnnouncements();
  } catch (e) {
    console.error("Error loading tenant data:", e);
  }
});

function renderProfileDetails() {
  $("#pName").textContent = tenantProfile.fullName || "—";
  $("#pEmail").textContent = tenantProfile.email || currentUser.email || "—";
  $("#pPhone").textContent = tenantProfile.phone || "—";
  $("#pDob").textContent = tenantProfile.dob ? fmtDate(tenantProfile.dob) : "—";
  $("#pAddress").textContent = tenantProfile.address || "—";
  $("#pNid").textContent = tenantProfile.nid || "—";
  if (tenantProfile.createdAt?.toDate) {
    $("#pCreated").textContent = fmtDate(tenantProfile.createdAt);
  }
}

async function loadLeasesAndStats() {
  leases = [];
  if (tenantProfile && tenantProfile.propertyId) {
    leases.push(tenantProfile);
  }

  const today = new Date();
  leases = leases.map((l) => {
    let next = l.leaseDate ? l.leaseDate.toDate() : null;
    if (next && l.rentPayDate) {
      const dueDay = l.rentPayDate;
      let dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
      if (dueDate < today) {
        dueDate.setMonth(dueDate.getMonth() + 1);
      }
      next = dueDate;
    }
    return { ...l, _next: next };
  });

  const totalRent = leases.reduce(
    (acc, l) => acc + (Number(l.rentAmount) || 0),
    0
  );
  $("#monthlyRentTotal").textContent = fmtMoney(totalRent);

  if (leases.length) {
    const soonest = leases.sort(
      (a, b) => new Date(a._next) - new Date(b._next)
    )[0];
    $("#nextDue").textContent = fmtDate(soonest?._next);
    if (soonest?.propertyId) {
      $("#nextDueLease").textContent = `Lease: ${await getPropertyIdentifier(
        soonest.propertyId
      )}`;
    }
  } else {
    $("#nextDue").textContent = "—";
    $("#nextDueLease").textContent = "No leases found";
  }

  renderQuickActions();
  renderLeasesList();
}

async function renderLeasesList() {
  const list = $("#leasesList");
  list.innerHTML = "";

  if (!leases.length) {
    list.innerHTML = `<div class="list-item">No leases found.</div>`;
    return;
  }

  for (const l of leases) {
    let propertyIdentifier = await getPropertyIdentifier(l.propertyId);
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div>
                <strong>${propertyIdentifier}</strong><br/>
                <span class="muted">Monthly Rent:</span> ${fmtMoney(
                  l.rentAmount
                )} &nbsp;•&nbsp;
                <span class="muted">Advance Paid:</span> ${fmtMoney(
                  l.advancePayment || 0
                )} <br/>
                <span class="muted">Next Due:</span> ${fmtDate(
                  l._next
                )} &nbsp;•&nbsp;
                <span class="muted">Expires on:</span> ${fmtDate(
                  l.leaseExpiryDate
                )}
            </div>
            <button class="btn" data-action="details" data-property-id="${
              l.propertyId
            }">Details</button>
        </div>
        `;
    list.appendChild(div);
  }
}

function renderQuickActions() {
  const wrap = $("#quickActions");
  wrap.innerHTML = "";

  if (!leases.length) {
    wrap.innerHTML = `<div class="qa" style="text-align: left; cursor: default;"><div class="qa-title">No leases</div>
            <p class="qa-meta" style="margin-top: 8px;">When your landlord adds a lease, quick actions will appear here.</p></div>`;
    return;
  }

  leases.forEach(async (l) => {
    const el = document.createElement("div");
    el.className = "qa";
    let propertyIdentifier = await getPropertyIdentifier(l.propertyId);

    el.innerHTML = `
            <div class="qa-title">Lease at ${propertyIdentifier}</div>
            <div class="qa-meta">Next Due: ${fmtDate(
              l._next
            )} • Monthly: ${fmtMoney(l.rentAmount)}</div>
            <div class="qa-actions">
              <button class="btn primary" data-action="pay" data-lease='${JSON.stringify(
                l
              )}'>Pay Rent</button>
              <button class="btn" data-action="maint" data-lease='${JSON.stringify(
                l
              )}'>Request Maintenance</button>
            </div>
          `;
    wrap.appendChild(el);
  });
  wrap.addEventListener("click", qaHandler);
}

async function qaHandler(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const leaseData = JSON.parse(btn.dataset.lease);

  leaseData.propertyIdentifier = await getPropertyIdentifier(
    leaseData.propertyId
  );

  if (btn.dataset.action === "pay") openPayDialog(leaseData);
  if (btn.dataset.action === "maint") openMaintDialog(leaseData);
}

async function loadMaintenance() {
  const list = $("#maintenanceList");
  list.innerHTML = "";

  let rows = [];
  const maintQuery = await db
    .collection("maintenance_requests")
    .where("tenantId", "==", currentUser.uid)
    .get();

  maintQuery.forEach((d) => rows.push({ id: d.id, ...d.data() }));

  rows.sort(
    (a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0)
  );

  const openCount = rows.filter((r) => (r.status || "open") === "open").length;
  $("#openMaintCount").textContent = String(openCount);
  $("#lastMaintUpdate").textContent = rows[0]?.createdAt
    ? `Updated ${fmtDate(rows[0].createdAt)}`
    : "—";

  if (!rows.length) {
    list.innerHTML = `<div class="list-item">No maintenance requests yet.</div>`;
    return;
  }

  for (const r of rows) {
    const d = document.createElement("div");
    d.className = "list-item maintenance-item"; // Use consistent class
    const status = r.status || "open";

    // Conditionally create the action button
    const actionButton =
      status !== "completed"
        ? `<button class="btn primary" data-action="mark-complete" data-request-id="${r.id}">Mark as Solved</button>`
        : `<button class="btn" disabled>Solved</button>`;

    d.innerHTML = `
      <div class="maintenance-info">
        <strong>${r.title || "Request"}</strong>
        <span class="muted">
          Lease: ${await getPropertyIdentifier(r.propertyId)}
        </span>
        <span class="muted">
          Reported: ${fmtDate(r.createdAt)}
        </span>
      </div>
      <div class="maintenance-assignment">
        <span class="status-badge ${status}">
          ${status.replace("-", " ")}
        </span>
        <span class="muted" style="font-size: 13px;">
          Technician: ${r.technicianName || "None"}
        </span>
      </div>
      <div class="maintenance-actions">
        ${actionButton}
      </div>
    `;
    list.appendChild(d);
  }
}

// NEW: Event listener for "Mark as Solved" button
$("#maintenanceList").addEventListener("click", async (e) => {
  const target = e.target.closest("button[data-action='mark-complete']");
  if (!target) return;

  const id = target.dataset.requestId;
  if (!id) return;

  await markMaintenanceAsCompleted(id, target);
});

// NEW: Function to update maintenance status to 'completed'
async function markMaintenanceAsCompleted(id, button) {
  // Disable button to prevent double-click
  if (button) {
    button.disabled = true;
    button.textContent = "Updating...";
  }

  try {
    await db.collection("maintenance_requests").doc(id).update({
      status: "completed",
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    // Refresh the list to show the change
    await loadMaintenance();
  } catch (error) {
    console.error("Error marking as completed:", error);
    alert("Failed to update status. Please try again.");
    // Re-enable button on failure
    if (button) {
      button.disabled = false;
      button.textContent = "Mark as Solved";
    }
  }
}

async function getPropertyIdentifier(propertyId) {
  if (!propertyId) return "—";
  try {
    const propDoc = await db.collection("properties").doc(propertyId).get();
    if (propDoc.exists) {
      const prop = propDoc.data();
      const name = prop.propertyName || prop.address;
      const unit = prop.unit ? ` (Unit ${prop.unit})` : "";
      return `${name}${unit}`;
    }
  } catch (error) {
    console.error("Error getting property identifier:", error);
  }
  return "—";
}

async function loadPayments() {
  const list = $("#paymentsList");
  list.innerHTML = "";
  list.innerHTML = `<div class="list-item">No payment history found.</div>`;
}

async function loadAnnouncements() {
  const list = $("#announcementsList");
  list.innerHTML = "";

  if (!tenantProfile?.landlordId) {
    list.innerHTML = `<div class="list-item">No announcements found. You will see announcements here once your landlord assigns you to a property.</div>`;
    return;
  }

  try {
    // Query 1: Get announcements sent specifically to this tenant
    const specificAnnouncementsPromise = db
      .collection("announcements")
      .where("recipientIds", "array-contains", currentUser.uid)
      .get();

    // Query 2: Get all other announcements from the landlord
    const generalAnnouncementsPromise = db
      .collection("announcements")
      .where("landlordId", "==", tenantProfile.landlordId)
      .get();

    const [specificSnap, generalSnap] = await Promise.all([
      specificAnnouncementsPromise,
      generalAnnouncementsPromise,
    ]);

    const announcementsMap = new Map();

    // Add specific announcements to the map
    specificSnap.forEach((doc) => {
      announcementsMap.set(doc.id, { id: doc.id, ...doc.data() });
    });

    // Add general announcements, ensuring they aren't 'specific' ones
    // meant for other tenants and haven't already been added.
    generalSnap.forEach((doc) => {
      const data = doc.data();
      if (data.recipientType !== "specific" && !announcementsMap.has(doc.id)) {
        announcementsMap.set(doc.id, { id: doc.id, ...data });
      }
    });

    const announcements = Array.from(announcementsMap.values());

    announcements.sort(
      (a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0)
    );

    if (!announcements.length) {
      list.innerHTML = `<div class="list-item">No announcements from your landlord yet.</div>`;
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
  } catch (error) {
    console.error("Error fetching announcements: ", error);
    list.innerHTML = `<div class="list-item">Error loading announcements.</div>`;
  }
}

/* ---------------- Profile Editing Logic ---------------- */
const editProfileBtn = $("#editProfileBtn");
const saveProfileBtn = $("#saveProfileBtn");
const cancelEditBtn = $("#cancelEditBtn");

const pName = $("#pName");
const pEmail = $("#pEmail");
const pPhone = $("#pPhone");
const pDob = $("#pDob");
const pAddress = $("#pAddress");
const pNid = $("#pNid");

const pNameInput = $("#pNameInput");
const pEmailInput = $("#pEmailInput");
const pPhoneInput = $("#pPhoneInput");
const pDobInput = $("#pDobInput");
const pAddressInput = $("#pAddressInput");
const pNidInput = $("#pNidInput");

function toggleProfileEditMode(isEditing) {
  // Toggle visibility of buttons
  editProfileBtn.classList.toggle("hidden", isEditing);
  saveProfileBtn.classList.toggle("hidden", !isEditing);
  cancelEditBtn.classList.toggle("hidden", !isEditing);

  // Toggle visibility of text vs. input fields
  [pName, pEmail, pPhone, pDob, pAddress, pNid].forEach((el) =>
    el.classList.toggle("hidden", isEditing)
  );

  [
    pNameInput,
    pEmailInput,
    pPhoneInput,
    pDobInput,
    pAddressInput,
    pNidInput,
  ].forEach((el) => el.classList.toggle("hidden", !isEditing));

  if (isEditing) {
    // When entering edit mode, populate inputs with current data
    pNameInput.value = tenantProfile.fullName || "";
    pEmailInput.value = tenantProfile.email || "";
    pPhoneInput.value = tenantProfile.phone || "";
    pDobInput.value = fmtDateForInput(tenantProfile.dob);
    pAddressInput.value = tenantProfile.address || "";
    pNidInput.value = tenantProfile.nid || "";
  }
}

editProfileBtn.addEventListener("click", () => {
  toggleProfileEditMode(true);
});

cancelEditBtn.addEventListener("click", () => {
  toggleProfileEditMode(false);
});

saveProfileBtn.addEventListener("click", async () => {
  const updates = {
    fullName: pNameInput.value.trim(),
    email: pEmailInput.value.trim(),
    phone: pPhoneInput.value.trim(),
    dob: pDobInput.value,
    address: pAddressInput.value.trim(),
    nid: pNidInput.value.trim(),
  };

  if (!updates.fullName || !updates.email) {
    alert("Full Name and Email are required.");
    return;
  }

  saveProfileBtn.disabled = true;
  saveProfileBtn.textContent = "Saving...";

  try {
    await db.collection("tenants").doc(currentUser.uid).update(updates);
    tenantProfile = { ...tenantProfile, ...updates };
    renderProfileDetails();
    toggleProfileEditMode(false);
  } catch (err) {
    console.error("Error updating profile: ", err);
    alert("Failed to update profile. Please try again.");
  } finally {
    saveProfileBtn.disabled = false;
    saveProfileBtn.textContent = "Save Changes";
  }
});

/* ---------------- Modals Logic (Non-Profile) ---------------- */
const payDialog = $("#payDialog");
const maintDialog = $("#maintDialog");
const propertyDetailsModal = $("#propertyDetailsModal");

let payDialogLease = null;
function openPayDialog(lease) {
  payDialogLease = lease;
  $("#payLeaseLabel").textContent = lease.propertyIdentifier || "Lease";
  $("#payAmount").value = lease.rentAmount || "";

  let nextDueDate = lease._next;
  if (nextDueDate && !(nextDueDate instanceof Date)) {
    nextDueDate = new Date(nextDueDate.seconds * 1000);
  }

  if (nextDueDate) {
    $("#payForDate").value = nextDueDate.toISOString().split("T")[0];
  } else {
    $("#payForDate").value = "";
  }
  payDialog.showModal();
}

$("#cancelPay").addEventListener("click", () => payDialog.close());
$("#payForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!payDialogLease) return;
  console.log("payment submitted");
  payDialog.close();
  alert("Payment submitted for processing. This is a demo.");
});

let maintDialogLease = null;
function openMaintDialog(lease) {
  maintDialogLease = lease;
  $("#maintLeaseLabel").textContent = lease.propertyIdentifier || "Lease";
  maintDialog.showModal();
}

$("#cancelMaint").addEventListener("click", () => maintDialog.close());
$("#maintForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!maintDialogLease) return;

  const title = $("#maintTitle").value.trim();
  const details = $("#maintDetails").value.trim();
  if (!title || !details) return;

  const payload = {
    tenantId: currentUser.uid,
    landlordId: maintDialogLease.landlordId,
    propertyId: maintDialogLease.propertyId,
    title,
    details,
    status: "open",
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    technicianId: "", // Initialize empty
    technicianName: "", // Initialize empty
  };

  try {
    await db.collection("maintenance_requests").add(payload);
    maintDialog.close();
    $("#maintForm").reset();
    loadMaintenance();
  } catch (err) {
    console.error(err);
    alert("Failed to submit request.");
  }
});

$("#newMaintBtn").addEventListener("click", () => {
  if (!leases.length) {
    alert("No leases available to submit a request for.");
    return;
  }
  openMaintDialog(leases[0]);
});

$("#leasesList").addEventListener("click", async (e) => {
  const btn = e.target.closest('button[data-action="details"]');
  if (btn) {
    const propertyId = btn.dataset.propertyId;
    if (propertyId) {
      try {
        const propDoc = await db.collection("properties").doc(propertyId).get();
        if (propDoc.exists) {
          showPropertyDetails(propDoc.data());
        } else {
          alert("Property details not found.");
        }
      } catch (error) {
        console.error("Error fetching property details:", error);
        alert("Could not fetch property details.");
      }
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

/* ---------------- Logout ---------------- */
$("#logoutBtn").addEventListener("click", async () => {
  await auth.signOut();
  window.location.href = "auth.html";
});
