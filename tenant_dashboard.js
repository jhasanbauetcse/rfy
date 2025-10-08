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
  const dt = d instanceof Date ? d : d?.toDate ? d.toDate() : new Date(d);
  return dt.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
  } catch (e) {
    console.error(e);
    alert("Unable to load tenant dashboard.");
  }
});

function renderProfileDetails() {
  $("#pName").textContent = tenantProfile.fullName || "—";
  $("#pEmail").textContent = tenantProfile.email || currentUser.email || "—";
  $("#pPhone").textContent = tenantProfile.phone || "—";
  $("#pDob").textContent = tenantProfile.dob ? fmtDate(tenantProfile.dob) : "—";
  $("#pAddress").textContent = tenantProfile.address || "—";
  $("#pTaxId").textContent = tenantProfile.taxId || "—";
  if (tenantProfile.createdAt?.toDate) {
    $("#pCreated").textContent = fmtDate(tenantProfile.createdAt);
  }
}

async function loadLeasesAndStats() {
  leases = [];
  const leaseQuery = await db
    .collection("tenants")
    .where("landlordId", "==", tenantProfile.landlordId)
    .get();
  leaseQuery.forEach((doc) => {
    if (doc.id === currentUser.uid) {
      leases.push({ id: doc.id, ...doc.data() });
    }
  });

  const today = new Date();
  leases = leases.map((l) => {
    let next = l.leaseDate;
    if (next) {
      const due = new Date(
        today.getFullYear(),
        today.getMonth(),
        next.toDate().getDate()
      );
      next =
        due >= today
          ? due
          : new Date(
              today.getFullYear(),
              today.getMonth() + 1,
              next.toDate().getDate()
            );
    }
    return { ...l, _next: next };
  });

  const totalRent = leases.reduce(
    (acc, l) => acc + (Number(l.rentAmount) || 0),
    0
  );
  $("#monthlyRentTotal").textContent = fmtMoney(totalRent);

  if (leases.length) {
    const soonest =
      leases
        .filter((l) => !!l._next)
        .sort((a, b) => new Date(a._next) - new Date(b._next))[0] || leases[0];
    $("#nextDue").textContent = fmtDate(soonest?._next);
    const prop = tenantProfile.propertyId;
    const propDoc = await db.collection("properties").doc(prop).get();
    $("#nextDueLease").textContent = propDoc.data()?.address
      ? `Lease: ${propDoc.data()?.address}`
      : "—";
  } else {
    $("#nextDue").textContent = "—";
    $("#nextDueLease").textContent = "No leases found";
  }

  renderQuickActions();
  renderLeasesList();
}

/* ---------------- Quick Actions (per lease) ---------------- */
function renderQuickActions() {
  const wrap = $("#quickActions");
  wrap.innerHTML = "";

  if (!leases.length) {
    wrap.innerHTML = `<div class="qa" style="text-align: left; cursor: default;"><div class="qa-title">No leases</div>
            <p class="qa-meta" style="margin-top: 8px;">When your landlord adds a lease, quick actions will appear here.</p></div>`;
    return;
  }

  leases.forEach((l) => {
    const el = document.createElement("div");
    el.className = "qa";
    el.innerHTML = `
            <div class="qa-title">Lease Actions</div>
            <div class="qa-meta">Next Due: ${fmtDate(
              l._next
            )} • Monthly: ${fmtMoney(l.rentAmount)}</div>
            <div class="qa-actions">
              <button class="btn primary" data-action="pay" data-lease="${
                l.id
              }">Pay Rent</button>
              <button class="btn" data-action="maint" data-lease="${
                l.id
              }">Request Maintenance</button>
            </div>
          `;
    wrap.appendChild(el);
  });
  wrap.addEventListener("click", qaHandler);
}

async function qaHandler(e) {
  const btn = e.target.closest("button");
  if (!btn) return;
  const leaseId = btn.dataset.lease;
  const lease = leases.find((x) => x.id === leaseId);
  if (!lease) return;
  const prop = await db.collection("properties").doc(lease.propertyId).get();
  lease.address = prop.data().address;

  if (btn.dataset.action === "pay") openPayDialog(lease);
  if (btn.dataset.action === "maint") openMaintDialog(lease);
}

/* ---------------- Leases list ---------------- */
async function renderLeasesList() {
  const list = $("#leasesList");
  list.innerHTML = "";

  if (!leases.length) {
    list.innerHTML = `<div class="list-item">No leases found.</div>`;
    return;
  }

  for (const l of leases) {
    const prop = await db.collection("properties").doc(l.propertyId).get();
    l.address = prop.data().address;
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `
            <strong>${l.address || "Lease"}</strong><br/>
            <span class="muted">Monthly Rent:</span> ${fmtMoney(
              l.rentAmount
            )} &nbsp;•&nbsp;
            <span class="muted">Next Due:</span> ${fmtDate(l._next)}
            `;
    list.appendChild(div);
  }
}

async function loadMaintenance() {
  const list = $("#maintenanceList");
  list.innerHTML = "";

  let rows = [];
  const maintQuery = await db
    .collection("maintenance_requests")
    .where("tenantId", "==", currentUser.uid)
    .orderBy("createdAt", "desc")
    .get();
  maintQuery.forEach((d) => rows.push({ id: d.id, ...d.data() }));

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
    d.className = "list-item";
    d.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
              <div>
                <strong>${r.title || "Request"}</strong>
                <p class="muted" style="margin: 4px 0 0;">
                  Lease: ${await leaseAddress(
                    r.propertyId
                  )} • Created: ${fmtDate(r.createdAt)}
                </p>
              </div>
              <span class="muted" style="text-transform: capitalize; flex-shrink: 0;">${
                r.status || "open"
              }</span>
            </div>
            `;
    list.appendChild(d);
  }
}

async function leaseAddress(propertyId) {
  const propDoc = await db.collection("properties").doc(propertyId).get();
  return propDoc.data()?.address || "—";
}

async function loadPayments() {
  const list = $("#paymentsList");
  list.innerHTML = "";
  // You would fetch and display payment history here
  list.innerHTML = `<div class="list-item">No payment history found.</div>`;
}

/* ---------------- Modals Logic ---------------- */
const editProfileDialog = $("#editProfileDialog");
const payDialog = $("#payDialog");
const maintDialog = $("#maintDialog");

$("#editProfileBtn").addEventListener("click", () => {
  if (!tenantProfile) return;
  $("#profileName").value = tenantProfile.fullName || "";
  $("#profileEmail").value = tenantProfile.email || "";
  $("#profilePhone").value = tenantProfile.phone || "";
  $("#profileDob").value = tenantProfile.dob || "";
  $("#profileAddress").value = tenantProfile.address || "";
  $("#profileTaxId").value = tenantProfile.taxId || "";
  editProfileDialog.showModal();
});

$("#cancelProfileEdit").addEventListener("click", () =>
  editProfileDialog.close()
);
$("#profileForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    fullName: $("#profileName").value.trim(),
    email: $("#profileEmail").value.trim(),
    phone: $("#profilePhone").value.trim(),
    dob: $("#profileDob").value,
    address: $("#profileAddress").value.trim(),
    taxId: $("#profileTaxId").value.trim(),
  };

  if (!payload.fullName || !payload.email) {
    alert("Full Name and Email are required.");
    return;
  }

  try {
    await db.collection("tenants").doc(currentUser.uid).update(payload);
    tenantProfile = { ...tenantProfile, ...payload };
    renderProfileDetails();
    editProfileDialog.close();
  } catch (err) {
    console.error("Error updating profile: ", err);
    alert("Failed to update profile. Please try again.");
  }
});

let payDialogLease = null;
function openPayDialog(lease) {
  payDialogLease = lease;
  $("#payLeaseLabel").textContent = lease.address || "Lease";
  $("#payAmount").value = lease.rentAmount || "";
  const d =
    lease._next instanceof Date
      ? lease._next
      : lease._next?.toDate
      ? lease._next.toDate()
      : null;
  if (d) {
    $("#payForDate").value = d.toISOString().split("T")[0];
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
  $("#maintLeaseLabel").textContent = lease.address || "Lease";
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

/* ---------------- Logout ---------------- */
$("#logoutBtn").addEventListener("click", async () => {
  await auth.signOut();
  window.location.href = "auth.html";
});
