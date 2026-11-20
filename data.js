// =========================================================
// FARMBRIDGE - data.js
// Crop list + storage for farmer listings.
// For now data lives in the browser (localStorage).
// In Step 6 we will move it to Firebase Firestore.
// =========================================================

const FB_LISTINGS_KEY = "fb_listings";

// The crops supported in the pilot (keep this list small and clear)
const CROPS = [
  { id: "tomato",  name: "Tomato",  emoji: "🍅" },
  { id: "potato",  name: "Potato",  emoji: "🥔" },
  { id: "brinjal", name: "Brinjal", emoji: "🍆" },
  { id: "carrot",  name: "Carrot",  emoji: "🥕" },
  { id: "chilli",  name: "Chilli",  emoji: "🌶️" },
  { id: "cabbage", name: "Cabbage", emoji: "🥬" },
  { id: "maize",   name: "Maize",   emoji: "🌽" },
  { id: "onion",   name: "Onion",   emoji: "🧅" }
];

// Find a crop's details by its id, e.g. cropInfo("tomato")
function cropInfo(id) {
  return CROPS.find(function (c) { return c.id === id; }) ||
         { id: id, name: id, emoji: "🌱" };
}

// unique id part: time + random letters (so two items never share an id)
function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ---------- read / write ----------
function getListings() {
  try {
    return JSON.parse(localStorage.getItem(FB_LISTINGS_KEY)) || [];
  } catch (e) {
    return [];
  }
}

// returns true if saved, false if the browser storage is full
function saveListings(list) {
  try {
    localStorage.setItem(FB_LISTINGS_KEY, JSON.stringify(list));
    return true;
  } catch (e) {
    return false;
  }
}

function getListingsByFarmer(phone) {
  return getListings()
    .filter(function (l) { return l.farmerPhone === phone; })
    .sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); }); // newest first
}

// ---------- add a listing ----------
// Returns { ok: true } or { ok: false, error: "message" }
function addListing(data, farmer) {
  const qty = Number(data.quantityKg);

  if (!data.crop) return { ok: false, error: "Please choose a crop." };
  if (!qty || qty <= 0) return { ok: false, error: "Please enter a quantity greater than 0." };
  if (qty > 100000) return { ok: false, error: "Quantity looks too large. Please check it." };
  if (!data.harvestDate) return { ok: false, error: "Please choose the expected harvest date." };
  if (data.area.trim().length < 2) return { ok: false, error: "Please enter the collection location." };

  const listing = {
    id: "l_" + newId(),
    farmerPhone: farmer.phone,
    farmerName: farmer.name,
    crop: data.crop,
    quantityKg: qty,
    harvestDate: data.harvestDate,   // format: YYYY-MM-DD
    area: data.area.trim(),
    grade: data.grade || "",
    notes: data.notes.trim(),
    photo: data.photo || "",
    status: "available",             // available | reserved | sold
    createdAt: new Date().toISOString()
  };

  const list = getListings();
  list.push(listing);

  if (!saveListings(list)) {
    return { ok: false, error: "Browser storage is full. Try without a photo or delete old lots." };
  }
  return { ok: true, listing: listing };
}

// ---------- change status / delete ----------
function updateListingStatus(id, status) {
  const list = getListings();
  const item = list.find(function (l) { return l.id === id; });
  if (item) {
    item.status = status;
    saveListings(list);
  }
}

function deleteListing(id) {
  const list = getListings().filter(function (l) { return l.id !== id; });
  saveListings(list);
}

// only lots that are still "available" (used by the buyer's Browse Supply page)
function getAvailableListings() {
  return getListings().filter(function (l) { return l.status === "available"; });
}

// =========================================================
// STEP 4: BUYER REQUIREMENTS ("demands")
// =========================================================
const FB_DEMANDS_KEY = "fb_demands";

function getDemands() {
  try {
    return JSON.parse(localStorage.getItem(FB_DEMANDS_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveDemands(list) {
  try {
    localStorage.setItem(FB_DEMANDS_KEY, JSON.stringify(list));
    return true;
  } catch (e) {
    return false;
  }
}

function getDemandsByBuyer(phone) {
  return getDemands()
    .filter(function (d) { return d.buyerPhone === phone; })
    .sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); });
}

// only requirements that are still "open" (used by the farmer's Demand Board)
function getOpenDemands() {
  return getDemands().filter(function (d) { return d.status === "open"; });
}

// Returns { ok: true } or { ok: false, error: "message" }
function addDemand(data, buyer) {
  const qty = Number(data.quantityKg);

  if (!data.crop) return { ok: false, error: "Please choose a crop." };
  if (!qty || qty <= 0) return { ok: false, error: "Please enter a quantity greater than 0." };
  if (qty > 1000000) return { ok: false, error: "Quantity looks too large. Please check it." };
  if (data.area.trim().length < 2) return { ok: false, error: "Please enter the collection area." };
  if (!data.requiredDate) return { ok: false, error: "Please choose the date you need it by." };

  const demand = {
    id: "d_" + newId(),
    buyerPhone: buyer.phone,
    buyerName: buyer.name,
    crop: data.crop,
    quantityKg: qty,
    area: data.area.trim(),
    requiredDate: data.requiredDate,   // YYYY-MM-DD
    quality: data.quality || "",
    notes: data.notes.trim(),
    status: "open",                    // open | fulfilled | closed
    createdAt: new Date().toISOString()
  };

  const list = getDemands();
  list.push(demand);

  if (!saveDemands(list)) {
    return { ok: false, error: "Browser storage is full. Please delete old requirements." };
  }
  return { ok: true, demand: demand };
}

function updateDemandStatus(id, status) {
  const list = getDemands();
  const item = list.find(function (d) { return d.id === id; });
  if (item) {
    item.status = status;
    saveDemands(list);
  }
}

function deleteDemand(id) {
  saveDemands(getDemands().filter(function (d) { return d.id !== id; }));
}

// =========================================================
// SHARED HELPERS (used by several pages)
// =========================================================

// Makes user-typed text safe to show on the page
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// "2026-12-05" -> "5 Dec 2026"
function prettyDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// a date N days from today, as YYYY-MM-DD  (0 = today)
function dateInDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + m + "-" + day;
}

// =========================================================
// SAMPLE DATA (clearly labelled "Sample" on screen)
// Used so the demo looks full before real users join.
// =========================================================
function clearSampleData() {
  // enquiries that involve a sample farmer/buyer go too (free up any lot they had reserved)
  const enquiries = getEnquiries();
  enquiries.forEach(function (e) {
    const involvesSample = isSamplePhone(e.buyerPhone) || isSamplePhone(e.farmerPhone);
    if (involvesSample && (e.status === "accepted" || e.status === "collected")) {
      updateListingStatus(e.lotId, "available");
    }
  });
  saveEnquiries(enquiries.filter(function (e) {
    return !(isSamplePhone(e.buyerPhone) || isSamplePhone(e.farmerPhone));
  }));

  saveListings(getListings().filter(function (l) { return !l.sample; }));
  saveDemands(getDemands().filter(function (d) { return !d.sample; }));
}

function seedSampleData() {
  clearSampleData();

  // [farmer name, crop, kg, days until harvest, area, quality]
  const sampleLots = [
    ["Sukumar Mahato",  "tomato",  100, 5,  "Bankura",    "Fresh"],
    ["Bimal Das",       "tomato",  150, 7,  "Bishnupur",  "Good"],
    ["Rina Mondal",     "tomato",  250, 9,  "Sonamukhi",  "Fresh"],
    ["Anil Pal",        "potato",  400, 6,  "Bankura",    "Good"],
    ["Lakshmi Hembram", "brinjal", 120, 4,  "Khatra",     "Fresh"],
    ["Gopal Ghosh",     "carrot",   80, 10, "Bishnupur",  "Good"],
    ["Mina Bauri",      "chilli",   60, 8,  "Onda",       "Fresh"],
    ["Kartik Roy",      "cabbage", 200, 12, "Bankura",    "Mixed"],
    ["Sanjay Saha",     "onion",   350, 14, "Sonamukhi",  "Good"],
    ["Pooja Kar",       "potato",  300, 11, "Bishnupur",  "Fresh"],
    ["Habul Sk",        "maize",   500, 15, "Khatra",     "Good"],
    ["Tarak Majhi",     "tomato",   90, 20, "Onda",       "Mixed"]
  ];

  // [buyer name, crop, kg, area, days until needed, quality]
  const sampleDemands = [
    ["Bankura Fresh Mart",     "tomato",  500, "Bankura",    14, "Fresh"],
    ["Bishnupur Wholesale",    "potato",  600, "Bishnupur",  16, "Good"],
    ["Sonamukhi Retailers",    "brinjal", 100, "Sonamukhi",  10, "Fresh"],
    ["Mahato Traders",         "onion",   300, "Sonamukhi",  18, "Good"],
    ["Khatra Hostel Kitchen",  "cabbage", 150, "Khatra",     15, ""],
    ["Green Basket Co-op",     "carrot",   70, "Bishnupur",  13, "Good"]
  ];

  const listings = getListings();
  sampleLots.forEach(function (s, i) {
    listings.push({
      id: "s_l_" + i,
      farmerPhone: "sample_f" + i,
      farmerName: s[0],
      crop: s[1],
      quantityKg: s[2],
      harvestDate: dateInDays(s[3]),
      area: s[4],
      grade: s[5],
      notes: "",
      photo: "",
      status: "available",
      createdAt: new Date(Date.now() - i * 1000).toISOString(),
      sample: true
    });
  });
  saveListings(listings);

  const demands = getDemands();
  sampleDemands.forEach(function (s, i) {
    demands.push({
      id: "s_d_" + i,
      buyerPhone: "sample_b" + i,
      buyerName: s[0],
      crop: s[1],
      quantityKg: s[2],
      area: s[3],
      requiredDate: dateInDays(s[4]),
      quality: s[5],
      notes: "",
      status: "open",
      createdAt: new Date(Date.now() - i * 1000).toISOString(),
      sample: true
    });
  });
  saveDemands(demands);
}

// =========================================================
// STEP 6: ENQUIRIES & ORDER STATUS
// A buyer enquires about a farmer's lot, OR a farmer responds to a
// buyer's requirement. Either way it becomes one "enquiry" that moves:
//   enquiry -> discussion -> accepted -> collected -> completed
// (or ends as declined / cancelled)
// =========================================================
const FB_ENQUIRIES_KEY = "fb_enquiries";

const ENQ_STEPS = ["enquiry", "discussion", "accepted", "collected", "completed"];
const ENQ_LABELS = {
  enquiry: "Enquiry sent",
  discussion: "In discussion",
  accepted: "Accepted",
  collected: "Collected",
  completed: "Completed",
  declined: "Declined",
  cancelled: "Cancelled"
};

function isSamplePhone(phone) {
  return String(phone || "").indexOf("sample_") === 0;
}

function getEnquiries() {
  try {
    return JSON.parse(localStorage.getItem(FB_ENQUIRIES_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveEnquiries(list) {
  try {
    localStorage.setItem(FB_ENQUIRIES_KEY, JSON.stringify(list));
    return true;
  } catch (e) {
    return false;
  }
}

// "still going": not finished and not ended
function isActiveEnquiry(e) {
  return e.status === "enquiry" || e.status === "discussion" ||
         e.status === "accepted" || e.status === "collected";
}

// all enquiries where this phone number is the buyer or the farmer (newest first)
function getEnquiriesForUser(phone) {
  return getEnquiries()
    .filter(function (e) { return e.buyerPhone === phone || e.farmerPhone === phone; })
    .sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); });
}

function countActiveEnquiries(phone) {
  return getEnquiriesForUser(phone).filter(isActiveEnquiry).length;
}

// Create an enquiry.
//  - buyer:  data = { lotId, quantityKg, message }
//  - farmer: data = { demandId, lotId, quantityKg, message }  (responding to a requirement)
// Returns { ok: true, enquiry } or { ok: false, error: "message" }
function createEnquiry(data, me) {
  const qty = Number(data.quantityKg);
  if (!qty || qty <= 0) return { ok: false, error: "Please enter a quantity greater than 0." };

  const lot = getListings().find(function (l) { return l.id === data.lotId; });
  if (!lot) return { ok: false, error: "That lot is no longer listed." };
  if (lot.status !== "available") return { ok: false, error: "That lot is not available any more." };
  if (qty > lot.quantityKg) return { ok: false, error: "This lot has only " + lot.quantityKg + " kg." };

  let buyerPhone, buyerName, farmerPhone, farmerName, demandId = null;

  if (me.role === "buyer") {
    buyerPhone = me.phone;
    buyerName = me.name;
    farmerPhone = lot.farmerPhone;
    farmerName = lot.farmerName;
  } else {
    const demand = getDemands().find(function (d) { return d.id === data.demandId; });
    if (!demand || demand.status !== "open") return { ok: false, error: "That requirement is no longer open." };
    if (lot.farmerPhone !== me.phone) return { ok: false, error: "You can only offer your own lots." };
    if (lot.crop !== demand.crop) return { ok: false, error: "That lot is a different crop from the requirement." };
    buyerPhone = demand.buyerPhone;
    buyerName = demand.buyerName;
    farmerPhone = me.phone;
    farmerName = me.name;
    demandId = demand.id;
  }

  // no duplicates while an earlier one is still going
  const duplicate = getEnquiries().some(function (e) {
    return isActiveEnquiry(e) && e.lotId === lot.id && e.buyerPhone === buyerPhone &&
           (e.demandId || null) === demandId;
  });
  if (duplicate) return { ok: false, error: "You already have an active enquiry for this lot. See the Enquiries page." };

  const now = new Date().toISOString();
  const enquiry = {
    id: "e_" + newId(),
    lotId: lot.id,
    demandId: demandId,
    crop: lot.crop,
    quantityKg: qty,
    area: lot.area,
    harvestDate: lot.harvestDate,
    buyerPhone: buyerPhone,
    buyerName: buyerName,
    farmerPhone: farmerPhone,
    farmerName: farmerName,
    message: (data.message || "").trim(),
    initiatorRole: me.role,
    status: "enquiry",
    history: [{ status: "enquiry", at: now, by: me.role }],
    createdAt: now
  };

  const list = getEnquiries();
  list.push(enquiry);
  if (!saveEnquiries(list)) return { ok: false, error: "Browser storage is full. Please clear old enquiries." };
  return { ok: true, enquiry: enquiry };
}

// What buttons should this role see for this enquiry?
// Returns a list like [{ to: "accepted", label: "Accept order", danger: false }]
function enquiryActions(e, role) {
  const isRecipient = role !== e.initiatorRole;
  const actions = [];

  if (e.status === "enquiry" && isRecipient) {
    actions.push({ to: "discussion", label: "Start discussion" });
    actions.push({ to: "declined", label: "Decline", danger: true });
  }
  if (e.status === "discussion" && isRecipient) {
    actions.push({ to: "accepted", label: "Accept order" });
    actions.push({ to: "declined", label: "Decline", danger: true });
  }
  if (e.status === "accepted") actions.push({ to: "collected", label: "Mark collected" });
  if (e.status === "collected") actions.push({ to: "completed", label: "Mark completed" });

  if (!isRecipient && (e.status === "enquiry" || e.status === "discussion" || e.status === "accepted")) {
    actions.push({ to: "cancelled", label: "Cancel", danger: true });
  }
  return actions;
}

// Move an enquiry to a new status, and keep the lot / requirement in step:
//   accepted  -> lot becomes "reserved"
//   completed -> lot becomes "sold", the linked requirement becomes "fulfilled"
//   cancelled/declined after being accepted -> lot becomes "available" again
function setEnquiryStatus(id, status, byRole) {
  const list = getEnquiries();
  const e = list.find(function (x) { return x.id === id; });
  if (!e) return false;

  const previous = e.status;
  e.status = status;
  e.history.push({ status: status, at: new Date().toISOString(), by: byRole });
  saveEnquiries(list);

  if (status === "accepted") {
    updateListingStatus(e.lotId, "reserved");
  } else if (status === "completed") {
    updateListingStatus(e.lotId, "sold");
    if (e.demandId) updateDemandStatus(e.demandId, "fulfilled");
  } else if ((status === "cancelled" || status === "declined") &&
             (previous === "accepted" || previous === "collected")) {
    updateListingStatus(e.lotId, "available");
  }
  return true;
}