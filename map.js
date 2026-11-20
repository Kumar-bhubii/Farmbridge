// FARMBRIDGE - map.js  (Leaflet + OpenStreetMap, town-level pins only)
const cropSel = document.getElementById("m-crop");
const showSel = document.getElementById("m-show");
cropSel.innerHTML += CROPS.map(function (c) { return '<option value="' + c.id + '">' + c.emoji + " " + c.name + "</option>"; }).join("");

const map = L.map("fb-map", { scrollWheelZoom: false }).setView([23.2324, 87.0746], 9);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "&copy; OpenStreetMap contributors" }).addTo(map);
const layer = L.layerGroup().addTo(map);

function pinIcon(color, emoji) {
  return L.divIcon({ className: "", iconSize: [34, 34], iconAnchor: [17, 34],
    html: '<div class="fb-pin" style="background:' + color + '"><span>' + emoji + "</span></div>" });
}
function jitter(c, i) { const a = i * 2.4, r = 0.012 * Math.sqrt(i); return [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]; }

function render() {
  layer.clearLayers();
  const crop = cropSel.value, show = showSel.value;
  const placed = {}, bounds = [];
  let lots = 0, demands = 0, unknown = 0;
  function place(area) {
    const key = findPlace(area);
    if (!key) { unknown++; return null; }
    placed[key] = (placed[key] || 0) + 1;
    const c = jitter(PLACE_COORDS[key], placed[key]); bounds.push(c); return c;
  }
  if (show !== "demands") {
    getAvailableListings().filter(function (l) { return !crop || l.crop === crop; }).forEach(function (l) {
      const c = place(l.area); if (!c) return; const info = cropInfo(l.crop); lots++;
      L.marker(c, { icon: pinIcon("#2f7a45", info.emoji) }).addTo(layer).bindPopup(
        "<b>" + info.emoji + " " + info.name + " • " + l.quantityKg + " kg</b><br>Farmer: " + escapeHtml(l.farmerName) +
        "<br>Area: " + escapeHtml(l.area) + "<br>Harvest: " + prettyDate(l.harvestDate));
    });
  }
  if (show !== "lots") {
    getOpenDemands().filter(function (d) { return !crop || d.crop === crop; }).forEach(function (d) {
      const c = place(d.area); if (!c) return; const info = cropInfo(d.crop); demands++;
      L.marker(c, { icon: pinIcon("#c06f4c", "🛒") }).addTo(layer).bindPopup(
        "<b>Needs " + info.emoji + " " + info.name + " • " + d.quantityKg + " kg</b><br>Buyer: " + escapeHtml(d.buyerName) +
        "<br>Area: " + escapeHtml(d.area) + "<br>By: " + prettyDate(d.requiredDate));
    });
  }
  if (bounds.length) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
  document.getElementById("map-summary").innerHTML =
    "🌾 <b>" + lots + "</b> crop lots • 🛒 <b>" + demands + "</b> requirements" +
    (unknown ? " • " + unknown + " with unrecognised location (not shown)" : "") +
    (lots + demands === 0 ? " — try <b>Load sample data</b> from your dashboard." : "");
}
cropSel.addEventListener("change", render);
showSel.addEventListener("change", render);
render();
