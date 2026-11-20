// =========================================================
// FARMBRIDGE - matching.js  (THE MATCHING ENGINE)
//
// Scores farmer lots against a buyer requirement using the
// transparent 100-point system from the proposal:
//   Crop compatibility  40 pts
//   Quantity fit        30 pts
//   Location fit        20 pts
//   Date fit            10 pts
//
// It also finds the best COMBINATION of small lots that
// together meet one large requirement (small-lot aggregation).
//
// This file only does calculations (no page code), so it is easy
// to test. A match is a LEAD for users to verify, not a guarantee.
// =========================================================

const MATCH_WEIGHTS = { crop: 40, quantity: 30, location: 20, date: 10 };

// ---------- known places (approximate centre points: latitude, longitude) ----------
// Used to estimate straight-line distance. Unknown places still work,
// but get a neutral location score. Leaflet/OpenStreetMap comes later.
const PLACE_COORDS = {
  "bankura":   [23.2324, 87.0746],
  "bishnupur": [23.0730, 87.3190],
  "sonamukhi": [23.3000, 87.4170],
  "khatra":    [22.9967, 86.8500],
  "onda":      [23.1300, 87.2000],
  "durgapur":  [23.5204, 87.3119],
  "asansol":   [23.6739, 86.9524],
  "bardhaman": [23.2324, 87.8615],
  "burdwan":   [23.2324, 87.8615],
  "purulia":   [23.3320, 86.3649],
  "bolpur":    [23.6693, 87.7159],
  "midnapore": [22.4257, 87.3199],
  "jhargram":  [22.4500, 86.9833],
  "kolkata":   [22.5726, 88.3639]
};

// longest names first, so "bishnupur" is checked before shorter ones
const PLACE_KEYS = Object.keys(PLACE_COORDS).sort(function (a, b) { return b.length - a.length; });

// ---------- small helpers ----------
function cleanText(text) {
  return String(text || "").trim().toLowerCase();
}

function titleCase(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function cropLabel(id) {
  if (typeof cropInfo === "function") return cropInfo(id).name; // from data.js
  return titleCase(id);
}

// finds a known place inside text like "Bankura Town, West Bengal"
function findPlace(text) {
  const t = cleanText(text);
  for (let i = 0; i < PLACE_KEYS.length; i++) {
    if (t.indexOf(PLACE_KEYS[i]) !== -1) return PLACE_KEYS[i];
  }
  return null;
}

// straight-line distance between two [lat, lng] points, in km (haversine formula)
function distanceKm(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad;
  const dLng = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(a[0] * rad) * Math.cos(b[0] * rad) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

// whole days from date A to date B (both "YYYY-MM-DD")
function daysBetween(a, b) {
  const ms = new Date(b + "T00:00:00") - new Date(a + "T00:00:00");
  return Math.round(ms / 86400000);
}

// =========================================================
// 1. SCORE PARTS
// =========================================================

// ---- Location (max 20) ----
function scoreLocation(lotArea, demandArea) {
  const a = findPlace(lotArea);
  const b = findPlace(demandArea);

  if (a && b) {
    if (a === b) return { points: 20, km: 0, note: "Same area (" + titleCase(a) + ")" };

    const km = Math.round(distanceKm(PLACE_COORDS[a], PLACE_COORDS[b]));
    if (km <= 15) return { points: 17, km: km, note: "Nearby: about " + km + " km away" };
    if (km <= 40) return { points: 13, km: km, note: "Within reach: about " + km + " km away" };
    if (km <= 80) return { points: 8,  km: km, note: "About " + km + " km away" };
    return { points: 3, km: km, note: "Far: about " + km + " km away" };
  }

  // place not in our list: compare the typed text
  const na = cleanText(lotArea);
  const nb = cleanText(demandArea);
  if (na === nb || na.indexOf(nb) !== -1 || nb.indexOf(na) !== -1) {
    return { points: 20, km: null, note: "Same area (" + lotArea + ")" };
  }
  return { points: 6, km: null, note: "Distance unknown (place not in the pilot list)" };
}

// ---- Date (max 10) ----
function scoreDate(harvestDate, requiredDate) {
  const diff = daysBetween(requiredDate, harvestDate); // negative = ready early

  if (diff <= 0) {
    const early = Math.abs(diff);
    return { points: 10, note: early === 0 ? "Harvest ready on the needed date" : "Harvest ready " + early + " day" + (early === 1 ? "" : "s") + " before the needed date" };
  }
  if (diff <= 3) {
    return { points: 5, note: "Harvest " + diff + " day" + (diff === 1 ? "" : "s") + " after the needed date (slightly late)" };
  }
  return { points: 0, note: "Harvest " + diff + " days after the needed date (too late)" };
}

// =========================================================
// 2. SCORE ONE LOT AGAINST ONE REQUIREMENT
// Returns null if the crop is different.
// =========================================================
function scoreListing(lot, demand) {
  if (lot.crop !== demand.crop) return null;

  const ratio = Math.min(1, lot.quantityKg / demand.quantityKg);
  const loc = scoreLocation(lot.area, demand.area);
  const dt = scoreDate(lot.harvestDate, demand.requiredDate);

  const parts = {
    crop: MATCH_WEIGHTS.crop,
    quantity: Math.round(MATCH_WEIGHTS.quantity * ratio),
    location: loc.points,
    date: dt.points
  };

  const qtyNote = ratio >= 1
    ? "Covers the full " + demand.quantityKg + " kg on its own"
    : "Covers " + Math.round(ratio * 100) + "% of the requirement (" + lot.quantityKg + " of " + demand.quantityKg + " kg)";

  return {
    listing: lot,
    parts: parts,
    total: parts.crop + parts.quantity + parts.location + parts.date,
    km: loc.km,
    reasons: [
      "Same crop: " + cropLabel(lot.crop),
      qtyNote,
      loc.note,
      dt.note
    ]
  };
}

// a lot is "usable" if it can be ready in time (date score above 0)
function isCompatible(scored) {
  return scored.parts.date > 0;
}

// =========================================================
// 3. RANK ALL AVAILABLE LOTS FOR A REQUIREMENT
// =========================================================
function rankListings(demand, lots) {
  const scored = [];

  lots.forEach(function (lot) {
    if (lot.status !== "available") return;
    const s = scoreListing(lot, demand);
    if (s) scored.push(s);
  });

  // best score first; if tied, earlier harvest first
  scored.sort(function (a, b) {
    return b.total - a.total || a.listing.harvestDate.localeCompare(b.listing.harvestDate);
  });

  return scored;
}

// =========================================================
// 4. SMALL-LOT AGGREGATION: best combination of lots
// =========================================================

// Score a group of lots as one combined offer
function scoreGroup(items, demand) {
  const need = demand.quantityKg;
  const totalKg = items.reduce(function (sum, i) { return sum + i.listing.quantityKg; }, 0);
  const coverage = Math.min(1, totalKg / need);

  // location: average of each lot's location points, weighted by kg
  const locWeighted = items.reduce(function (sum, i) { return sum + i.parts.location * i.listing.quantityKg; }, 0);

  // date: the group is only as ready as its LAST harvest
  const datePts = Math.min.apply(null, items.map(function (i) { return i.parts.date; }));

  const parts = {
    crop: MATCH_WEIGHTS.crop,
    quantity: Math.round(MATCH_WEIGHTS.quantity * coverage),
    location: Math.round(locWeighted / totalKg),
    date: datePts
  };

  const sorted = items.slice().sort(function (a, b) { return b.listing.quantityKg - a.listing.quantityKg; });
  const lastHarvest = items.map(function (i) { return i.listing.harvestDate; }).sort().pop();

  return {
    items: sorted,
    farmerCount: items.length,
    totalKg: totalKg,
    coverage: coverage,
    shortKg: Math.max(0, need - totalKg),
    parts: parts,
    total: parts.crop + parts.quantity + parts.location + parts.date,
    lastHarvest: lastHarvest
  };
}

// Finds the best way to meet the requirement:
//  1) if one lot can cover everything, use the best-scoring such lot (fewest farmers to coordinate)
//  2) otherwise combine lots, best scores first, until the quantity is covered
//  3) then drop any lot that is not actually needed
function buildBestGroup(demand, ranked) {
  const eligible = ranked.filter(isCompatible);
  if (eligible.length === 0) return null;

  const need = demand.quantityKg;

  // 1. a single lot is enough
  const singles = eligible.filter(function (s) { return s.listing.quantityKg >= need; });
  if (singles.length > 0) {
    singles.sort(function (a, b) { return b.total - a.total; });
    return scoreGroup([singles[0]], demand);
  }

  // 2. combine lots (highest score first)
  const sorted = eligible.slice().sort(function (a, b) {
    return b.total - a.total || b.listing.quantityKg - a.listing.quantityKg;
  });

  let chosen = [];
  let sum = 0;
  for (let i = 0; i < sorted.length; i++) {
    chosen.push(sorted[i]);
    sum += sorted[i].listing.quantityKg;
    if (sum >= need) break;
  }

  // 3. remove lots that are not needed (lowest score first)
  if (sum >= need) {
    chosen.slice().sort(function (a, b) { return a.total - b.total; }).forEach(function (s) {
      if (sum - s.listing.quantityKg >= need) {
        chosen = chosen.filter(function (c) { return c !== s; });
        sum -= s.listing.quantityKg;
      }
    });
  }

  return scoreGroup(chosen, demand);
}

// =========================================================
// 5. NUMBERS FOR THE DASHBOARDS
// (these use functions from data.js)
// =========================================================

// buyer dashboard: how many different lots could serve my open requirements?
function countMatchedLotsForBuyer(phone) {
  const lots = getAvailableListings();
  const seen = {};

  getDemandsByBuyer(phone).forEach(function (d) {
    if (d.status !== "open") return;
    rankListings(d, lots).filter(isCompatible).forEach(function (s) {
      seen[s.listing.id] = true;
    });
  });

  return Object.keys(seen).length;
}

// farmer dashboard: how many open requirements can my lots serve?
function countMatchedDemandsForFarmer(phone) {
  const myLots = getListingsByFarmer(phone);
  return getOpenDemands().filter(function (d) {
    return rankListings(d, myLots).filter(isCompatible).length > 0;
  }).length;
}

// farmer's best-scoring lot for one requirement (or null)
function bestMatchForFarmer(demand, phone) {
  const ranked = rankListings(demand, getListingsByFarmer(phone));
  return ranked.length ? ranked[0] : null;
}

// lets us test this file in Node (ignored in the browser)
if (typeof module !== "undefined" && module.exports) {
  module.exports = { scoreListing: scoreListing, rankListings: rankListings, buildBestGroup: buildBestGroup, scoreGroup: scoreGroup, isCompatible: isCompatible };
}