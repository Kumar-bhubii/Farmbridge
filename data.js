
// =========================================================
// FARMBRIDGE - data.js
// Firestore-backed listings, demands and enquiries.
// Firebase Compat SDK 10.12.2
// =========================================================

"use strict";

// ---------- Collections ----------
const FB_LISTINGS_COLLECTION = "listings";
const FB_DEMANDS_COLLECTION = "demands";
const FB_ENQUIRIES_COLLECTION = "enquiries";

// ---------- In-memory cache ----------
let fbListings = [];
let fbDemands = [];
let fbEnquiries = [];

let fbSampleListings = [];
let fbSampleDemands = [];
let fbSampleEnquiries = [];

let fbDataLoaded = false;
// ---------- Sample data storage ----------
const FB_SAMPLE_STORAGE_KEY = "fb_sample_data_v1";

function saveSampleDataToStorage() {
  try {
    const sampleData = {
      listings: fbSampleListings,
      demands: fbSampleDemands,
      enquiries: fbSampleEnquiries
    };

    localStorage.setItem(
      FB_SAMPLE_STORAGE_KEY,
      JSON.stringify(sampleData)
    );
  } catch (error) {
    console.error("Could not save sample data:", error);
  }
}

function loadSampleDataFromStorage() {
  try {
    const savedData = localStorage.getItem(FB_SAMPLE_STORAGE_KEY);

    if (!savedData) return;

    const sampleData = JSON.parse(savedData);

    if (!sampleData || typeof sampleData !== "object") return;

    fbSampleListings = Array.isArray(sampleData.listings)
      ? sampleData.listings
      : [];

    fbSampleDemands = Array.isArray(sampleData.demands)
      ? sampleData.demands
      : [];

    fbSampleEnquiries = Array.isArray(sampleData.enquiries)
      ? sampleData.enquiries
      : [];

  } catch (error) {
    console.error("Could not load sample data:", error);

    fbSampleListings = [];
    fbSampleDemands = [];
    fbSampleEnquiries = [];
  }
}

// Restore saved sample data when this file loads.
loadSampleDataFromStorage();

// ---------- Crops ----------
const CROPS = [
  { id: "tomato", name: "Tomato", emoji: "🍅" },
  { id: "potato", name: "Potato", emoji: "🥔" },
  { id: "brinjal", name: "Brinjal", emoji: "🍆" },
  { id: "carrot", name: "Carrot", emoji: "🥕" },
  { id: "chilli", name: "Chilli", emoji: "🌶️" },
  { id: "cabbage", name: "Cabbage", emoji: "🥬" },
  { id: "maize", name: "Maize", emoji: "🌽" },
  { id: "onion", name: "Onion", emoji: "🧅" }
];

function cropInfo(id) {
  return CROPS.find(c => c.id === id) ||
    { id: id, name: id, emoji: "🌱" };
}

function newId() {
  return Date.now().toString(36) +
    Math.random().toString(36).slice(2, 9);
}

// ---------- Firebase helpers ----------
function fbCollection(name) {
  if (!window.fbDb || !window.FB_CLOUD) {
    throw new Error("Firebase is not initialized.");
  }

  return window.fbDb.collection(name);
}

function currentUid() {
  const authUser = window.fbAuth && window.fbAuth.currentUser;
  return authUser ? authUser.uid : null;
}

function saveCloudDocument(collection, item) {
  if (!currentUid()) {
    console.error("Cannot save: no authenticated user.");
    return Promise.reject(new Error("You must be logged in."));
  }

  return fbCollection(collection).doc(item.id).set(item);
}

function updateCloudDocument(collection, id, changes) {
  return fbCollection(collection).doc(id).update(changes);
}

function deleteCloudDocument(collection, id) {
  return fbCollection(collection).doc(id).delete();
}

// ---------- Initial Firestore loading ----------


// ---------- Initial Firestore loading ----------

async function initializeFarmBridgeData() {
  if (fbDataLoaded) return true;

  if (!window.fbAuth || !window.fbDb) {
    throw new Error("Firebase services are unavailable.");
  }

  // Wait until Firebase restores the login session.
  let authUser = window.fbAuth.currentUser;

  if (!authUser) {
    authUser = await new Promise(function (resolve, reject) {
      const unsubscribe = window.fbAuth.onAuthStateChanged(
        function (user) {
          unsubscribe();
          resolve(user);
        },
        function (error) {
          unsubscribe();
          reject(error);
        }
      );
    });
  }

  if (!authUser) {
    fbDataLoaded = true;
    return false;
  }

  const uid = authUser.uid;

  // Load listings, demands and only this user's enquiries.
  const results = await Promise.all([
    fbCollection(FB_LISTINGS_COLLECTION).get(),
    fbCollection(FB_DEMANDS_COLLECTION).get(),
    fbCollection(FB_ENQUIRIES_COLLECTION)
      .where("buyerUid", "==", uid)
      .get(),
    fbCollection(FB_ENQUIRIES_COLLECTION)
      .where("farmerUid", "==", uid)
      .get()
  ]);

  const listingSnapshot = results[0];
  const demandSnapshot = results[1];
  const buyerEnquiries = results[2];
  const farmerEnquiries = results[3];

  fbListings = listingSnapshot.docs.map(function (doc) {
    return { id: doc.id, ...doc.data() };
  });

  fbDemands = demandSnapshot.docs.map(function (doc) {
    return { id: doc.id, ...doc.data() };
  });

  // Combine both enquiry queries without duplicates.
  const enquiryMap = new Map();

  buyerEnquiries.docs.concat(farmerEnquiries.docs).forEach(function (doc) {
    enquiryMap.set(doc.id, { id: doc.id, ...doc.data() });
  });

  fbEnquiries = Array.from(enquiryMap.values());

  fbDataLoaded = true;

  console.log("FarmBridge Firestore data loaded.");

  return true;
}



// Other scripts can wait for this before rendering data.
window.FB_DATA_READY = initializeFarmBridgeData()
  .catch(error => {
    console.error("FarmBridge data loading failed:", error);
    throw error;
  });

// ---------- Listings ----------
function getListings() {
  return fbListings.concat(fbSampleListings);
}

function saveListings(list) {
  // Kept for compatibility with older scripts.
  // Real listing changes should use the functions below.
  fbListings = list.filter(item => !item.sample);
  return true;
}

function getListingsByFarmer(phone) {
  return getListings()
    .filter(item => item.farmerPhone === phone)
    .sort((a, b) =>
      String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
    );
}

async function addListing(data, farmer) {
  const qty = Number(data.quantityKg);

  if (!data.crop) {
    return { ok: false, error: "Please choose a crop." };
  }

  if (!qty || qty <= 0) {
    return { ok: false, error: "Please enter a quantity greater than 0." };
  }

  if (qty > 100000) {
    return { ok: false, error: "Quantity looks too large. Please check it." };
  }

  if (!data.harvestDate) {
    return { ok: false, error: "Please choose the expected harvest date." };
  }

  if (!data.area || data.area.trim().length < 2) {
    return { ok: false, error: "Please enter the collection location." };
  }

  const uid = currentUid();

  if (!uid) {
    return { ok: false, error: "Please log in again." };
  }

  const listing = {
    id: "l_" + newId(),
    ownerUid: uid,
    farmerUid: uid,
    farmerPhone: farmer.phone,
    farmerName: farmer.name,
    crop: data.crop,
    quantityKg: qty,
    harvestDate: data.harvestDate,
    area: data.area.trim(),
    grade: data.grade || "",
    notes: (data.notes || "").trim(),
    photo: data.photo || "",
    status: "available",
    createdAt: new Date().toISOString()
  };

  try {
    await saveCloudDocument(FB_LISTINGS_COLLECTION, listing);

    fbListings.push(listing);

    return { ok: true, listing: listing };

  } catch (error) {
    console.error("Listing save failed:", error);

    return {
      ok: false,
      error: "Could not save your listing to Firebase. Please try again."
    };
  }
}

function updateListingStatus(id, status) {
  const item = fbListings.find(item => item.id === id);

  if (!item) {
    const sample = fbSampleListings.find(item => item.id === id);
    if (sample) sample.status = status;
    return;
  }

  item.status = status;

  updateCloudDocument(FB_LISTINGS_COLLECTION, id, {
    status: status,
    updatedAt: new Date().toISOString()
  }).catch(error => {
    console.error("Listing status update failed:", error);
  });
}

function deleteListing(id) {
  const item = fbListings.find(item => item.id === id);
  if (!item) return;

  fbListings = fbListings.filter(item => item.id !== id);

  deleteCloudDocument(FB_LISTINGS_COLLECTION, id)
    .catch(error => console.error("Listing deletion failed:", error));
}

function getAvailableListings() {
  return getListings().filter(item => item.status === "available");
}

// ---------- Buyer demands ----------
function getDemands() {
  return fbDemands.concat(fbSampleDemands);
}

function saveDemands(list) {
  fbDemands = list.filter(item => !item.sample);
  return true;
}

function getDemandsByBuyer(phone) {
  return getDemands()
    .filter(item => item.buyerPhone === phone)
    .sort((a, b) =>
      String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
    );
}

function getOpenDemands() {
  return getDemands().filter(item => item.status === "open");
}

async function addDemand(data, buyer) {
  const qty = Number(data.quantityKg);

  if (!data.crop) {
    return { ok: false, error: "Please choose a crop." };
  }

  if (!qty || qty <= 0) {
    return { ok: false, error: "Please enter a quantity greater than 0." };
  }

  if (qty > 1000000) {
    return { ok: false, error: "Quantity looks too large. Please check it." };
  }

  if (!data.area || data.area.trim().length < 2) {
    return { ok: false, error: "Please enter the collection area." };
  }

  if (!data.requiredDate) {
    return { ok: false, error: "Please choose the date you need it by." };
  }

  const uid = currentUid();

  if (!uid) {
    return { ok: false, error: "Please log in again." };
  }

  const demand = {
    id: "d_" + newId(),
    ownerUid: uid,
    buyerUid: uid,
    buyerPhone: buyer.phone,
    buyerName: buyer.name,
    crop: data.crop,
    quantityKg: qty,
    area: data.area.trim(),
    requiredDate: data.requiredDate,
    quality: data.quality || "",
    notes: (data.notes || "").trim(),
    status: "open",
    createdAt: new Date().toISOString()
  };

    try {
    await saveCloudDocument(FB_DEMANDS_COLLECTION, demand);

    fbDemands.push(demand);

    return { ok: true, demand: demand };

  } catch (error) {
    console.error("Demand save failed:", error);

    return {
      ok: false,
      error: "Could not save your requirement to Firebase. Please try again."
    };
  }
}

function updateDemandStatus(id, status) {
  const item = fbDemands.find(item => item.id === id);

  if (!item) {
    const sample = fbSampleDemands.find(item => item.id === id);
    if (sample) sample.status = status;
    return;
  }

  item.status = status;

  updateCloudDocument(FB_DEMANDS_COLLECTION, id, {
    status: status,
    updatedAt: new Date().toISOString()
  }).catch(error => {
    console.error("Demand status update failed:", error);
  });
}

function deleteDemand(id) {
  const item = fbDemands.find(item => item.id === id);
  if (!item) return;

  fbDemands = fbDemands.filter(item => item.id !== id);

  deleteCloudDocument(FB_DEMANDS_COLLECTION, id)
    .catch(error => console.error("Demand deletion failed:", error));
}

// ---------- Shared helpers ----------
function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value == null ? "" : value);
  return div.innerHTML;
}

function prettyDate(iso) {
  if (!iso) return "";
  const date = new Date(iso + "T00:00:00");
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function dateInDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return date.getFullYear() + "-" + month + "-" + day;
}

// ---------- Sample data ----------
function isSamplePhone(phone) {
  return String(phone || "").indexOf("sample_") === 0;
}

function clearSampleData() {
  fbSampleListings = [];
  fbSampleDemands = [];
  fbSampleEnquiries = [];

  saveSampleDataToStorage();
}

function seedSampleData() {
  clearSampleData();

  const sampleLots = [
    ["Sukumar Mahato", "tomato", 100, 5, "Bankura", "Fresh"],
    ["Bimal Das", "tomato", 150, 7, "Bishnupur", "Good"],
    ["Rina Mondal", "tomato", 250, 9, "Sonamukhi", "Fresh"],
    ["Anil Pal", "potato", 400, 6, "Bankura", "Good"],
    ["Lakshmi Hembram", "brinjal", 120, 4, "Khatra", "Fresh"],
    ["Gopal Ghosh", "carrot", 80, 10, "Bishnupur", "Good"],
    ["Mina Bauri", "chilli", 60, 8, "Onda", "Fresh"],
    ["Kartik Roy", "cabbage", 200, 12, "Bankura", "Mixed"],
    ["Sanjay Saha", "onion", 350, 14, "Sonamukhi", "Good"],
    ["Pooja Kar", "potato", 300, 11, "Bishnupur", "Fresh"],
    ["Habul Sk", "maize", 500, 15, "Khatra", "Good"],
    ["Tarak Majhi", "tomato", 90, 20, "Onda", "Mixed"]
  ];

  const sampleRequirements = [
    ["Bankura Fresh Mart", "tomato", 500, "Bankura", 14, "Fresh"],
    ["Bishnupur Wholesale", "potato", 600, "Bishnupur", 16, "Good"],
    ["Sonamukhi Retailers", "brinjal", 100, "Sonamukhi", 10, "Fresh"],
    ["Mahato Traders", "onion", 300, "Sonamukhi", 18, "Good"],
    ["Khatra Hostel Kitchen", "cabbage", 150, "Khatra", 15, ""],
    ["Green Basket Co-op", "carrot", 70, "Bishnupur", 13, "Good"]
  ];

  sampleLots.forEach((item, index) => {
    fbSampleListings.push({
      id: "s_l_" + index,
      farmerUid: "sample_farmer_" + index,
      farmerPhone: "sample_f" + index,
      farmerName: item[0],
      crop: item[1],
      quantityKg: item[2],
      harvestDate: dateInDays(item[3]),
      area: item[4],
      grade: item[5],
      notes: "",
      photo: "",
      status: "available",
      createdAt: new Date(Date.now() - index * 1000).toISOString(),
      sample: true
    });
  });

  sampleRequirements.forEach((item, index) => {
    fbSampleDemands.push({
      id: "s_d_" + index,
      buyerUid: "sample_buyer_" + index,
      buyerPhone: "sample_b" + index,
      buyerName: item[0],
      crop: item[1],
      quantityKg: item[2],
      area: item[3],
      requiredDate: dateInDays(item[4]),
      quality: item[5],
      notes: "",
      status: "open",
      createdAt: new Date(Date.now() - index * 1000).toISOString(),
      sample: true
    });
  });

  // Save sample data so it survives page reloads.
  saveSampleDataToStorage();
}

// ---------- Enquiries ----------
const ENQ_STEPS = [
  "enquiry", "discussion", "accepted", "collected", "completed"
];

const ENQ_LABELS = {
  enquiry: "Enquiry sent",
  discussion: "In discussion",
  accepted: "Accepted",
  collected: "Collected",
  completed: "Completed",
  declined: "Declined",
  cancelled: "Cancelled"
};

function getEnquiries() {
  return fbEnquiries.concat(fbSampleEnquiries);
}

function saveEnquiries(list) {
  fbEnquiries = list.filter(item => !item.sample);
  return true;
}

function isActiveEnquiry(enquiry) {
  return [
    "enquiry", "discussion", "accepted", "collected"
  ].includes(enquiry.status);
}

function getEnquiriesForUser(phone) {
  return getEnquiries()
    .filter(item =>
      item.buyerPhone === phone || item.farmerPhone === phone
    )
    .sort((a, b) =>
      String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
    );
}

function countActiveEnquiries(phone) {
  return getEnquiriesForUser(phone).filter(isActiveEnquiry).length;
}

async function createEnquiry(data, me) {
  const qty = Number(data.quantityKg);

  if (!qty || qty <= 0) {
    return { ok: false, error: "Please enter a quantity greater than 0." };
  }

  const lot = getListings().find(item => item.id === data.lotId);

  if (!lot) {
    return { ok: false, error: "That lot is no longer listed." };
  }

  if (lot.status !== "available") {
    return { ok: false, error: "That lot is not available any more." };
  }

  if (qty > lot.quantityKg) {
    return {
      ok: false,
      error: "This lot has only " + lot.quantityKg + " kg."
    };
  }

  const uid = currentUid();

  if (!uid) {
    return { ok: false, error: "Please log in again." };
  }

  let buyerUid, buyerPhone, buyerName;
  let farmerUid, farmerPhone, farmerName;
  let demandId = null;

  if (me.role === "buyer") {
    buyerUid = uid;
    buyerPhone = me.phone;
    buyerName = me.name;

    farmerUid = lot.farmerUid;
    farmerPhone = lot.farmerPhone;
    farmerName = lot.farmerName;
  } else {
    const demand = getDemands().find(item => item.id === data.demandId);

    if (!demand || demand.status !== "open") {
      return {
        ok: false,
        error: "That requirement is no longer open."
      };
    }

    if (lot.farmerUid !== uid) {
      return { ok: false, error: "You can only offer your own lots." };
    }

    if (lot.crop !== demand.crop) {
      return {
        ok: false,
        error: "That lot is a different crop from the requirement."
      };
    }

    buyerUid = demand.buyerUid;
    buyerPhone = demand.buyerPhone;
    buyerName = demand.buyerName;

    farmerUid = uid;
    farmerPhone = me.phone;
    farmerName = me.name;

    demandId = demand.id;
  }

  const duplicate = getEnquiries().some(item =>
    isActiveEnquiry(item) &&
    item.lotId === lot.id &&
    item.buyerPhone === buyerPhone &&
    (item.demandId || null) === demandId
  );

  if (duplicate) {
    return {
      ok: false,
      error: "You already have an active enquiry for this lot."
    };
  }

  const now = new Date().toISOString();

  const enquiry = {
    id: "e_" + newId(),
    lotId: lot.id,
    demandId: demandId,
    crop: lot.crop,
    quantityKg: qty,
    area: lot.area,
    harvestDate: lot.harvestDate,
    buyerUid: buyerUid,
    buyerPhone: buyerPhone,
    buyerName: buyerName,
    farmerUid: farmerUid,
    farmerPhone: farmerPhone,
    farmerName: farmerName,
    message: (data.message || "").trim(),
    initiatorRole: me.role,
    status: "enquiry",
    history: [{
      status: "enquiry",
      at: now,
      by: me.role
    }],
    createdAt: now
  };
  try {
    await saveCloudDocument(FB_ENQUIRIES_COLLECTION, enquiry);

    fbEnquiries.push(enquiry);

    return { ok: true, enquiry: enquiry };

  } catch (error) {
    console.error("Enquiry save failed:", error);

    return {
      ok: false,
      error: "Could not send the enquiry. Please try again."
    };
  }
}

function enquiryActions(enquiry, role) {
  const isRecipient = role !== enquiry.initiatorRole;
  const actions = [];

  if (enquiry.status === "enquiry" && isRecipient) {
    actions.push({ to: "discussion", label: "Start discussion" });
    actions.push({ to: "declined", label: "Decline", danger: true });
  }

  if (enquiry.status === "discussion" && isRecipient) {
    actions.push({ to: "accepted", label: "Accept order" });
    actions.push({ to: "declined", label: "Decline", danger: true });
  }

  if (enquiry.status === "accepted") {
    actions.push({ to: "collected", label: "Mark collected" });
  }

  if (enquiry.status === "collected") {
    actions.push({ to: "completed", label: "Mark completed" });
  }

  if (!isRecipient &&
      ["enquiry", "discussion", "accepted"].includes(enquiry.status)) {
    actions.push({ to: "cancelled", label: "Cancel", danger: true });
  }

  return actions;
}


async function setEnquiryStatus(id, status, byRole) {
  const enquiry = fbEnquiries.find(item => item.id === id);

  // Sample enquiries stay local.
  if (!enquiry) {
    const sample = fbSampleEnquiries.find(item => item.id === id);

    if (sample) {
      sample.status = status;
      sample.history = sample.history || [];
      sample.history.push({
        status: status,
        at: new Date().toISOString(),
        by: byRole
      });

      return true;
    }

    return false;
  }

  // Only allow actions available to this participant.
  const actions = enquiryActions(enquiry, byRole);

  if (!actions.some(action => action.to === status)) {
    return false;
  }

  const history = (enquiry.history || []).concat([{
    status: status,
    at: new Date().toISOString(),
    by: byRole
  }]);

  try {
    await updateCloudDocument(FB_ENQUIRIES_COLLECTION, id, {
      status: status,
      history: history,
      updatedAt: new Date().toISOString()
    });

    enquiry.status = status;
    enquiry.history = history;

    return true;

  } catch (error) {
    console.error("Enquiry update failed:", error);
    return false;
  }
}

