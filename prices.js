// FARMBRIDGE - prices.js
// Dated, source-labelled reference prices + 14-day trend chart.
window.FB_USER_READY.then(function (readyUser) {
  if (!readyUser) return;
const PRICE_BASE = {
  tomato:  { price: 24, market: "Bankura Regulated Market" },
  potato:  { price: 16, market: "Bishnupur Market" },
  brinjal: { price: 22, market: "Bankura Regulated Market" },
  carrot:  { price: 30, market: "Durgapur Market" },
  chilli:  { price: 60, market: "Sonamukhi Market" },
  cabbage: { price: 14, market: "Bishnupur Market" },
  maize:   { price: 21, market: "Khatra Market" },
  onion:   { price: 28, market: "Durgapur Market" }
};

function seeded(seedText) {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i++) { h ^= seedText.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 1000) / 1000;
}
function isoDay(offset) { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); }
function priceOn(cropId, day) {
  const base = PRICE_BASE[cropId].price;
  const wave = Math.sin(new Date(day).getTime() / 86400000 / 3) * 0.08;
  const noise = (seeded(cropId + day) - 0.5) * 0.1;
  return Math.max(1, Math.round(base * (1 + wave + noise)));
}
function demandKgFor(cropId) {
  return getOpenDemands().filter(function (d) { return d.crop === cropId; })
    .reduce(function (s, d) { return s + d.quantityKg; }, 0);
}

const body = document.getElementById("price-body");
const today = isoDay(0), weekAgo = isoDay(-7);

body.innerHTML = CROPS.filter(function (c) { return PRICE_BASE[c.id]; }).map(function (c, i) {
  const modal = priceOn(c.id, today), old = priceOn(c.id, weekAgo);
  const change = Math.round(((modal - old) / old) * 100);
  const trend = change >= 0 ? '<span class="trend-up">▲ ' + change + "%</span>" : '<span class="trend-down">▼ ' + Math.abs(change) + "%</span>";
  const demand = demandKgFor(c.id);
  return '<tr style="animation-delay:' + i * 70 + 'ms">' +
    "<td>" + c.emoji + " <b>" + c.name + "</b></td>" +
    "<td>" + PRICE_BASE[c.id].market + "</td>" +
    "<td>₹" + Math.round(modal * 0.85) + " – ₹" + Math.round(modal * 1.15) + "</td>" +
    "<td><b>₹" + modal + "</b></td><td>" + trend + "</td>" +
    "<td>" + (demand ? demand.toLocaleString("en-IN") + " kg" : "—") + "</td>" +
    '<td><span class="src-tag">Sample reference</span><br><small>' + prettyDate(today) + "</small></td></tr>";
}).join("");

const select = document.getElementById("trend-crop");
select.innerHTML = CROPS.map(function (c) { return '<option value="' + c.id + '">' + c.emoji + " " + c.name + "</option>"; }).join("");

let chart = null;
function drawTrend(cropId) {
  const days = [], values = [];
  for (let i = -13; i <= 0; i++) { const d = isoDay(i); days.push(d.slice(5)); values.push(priceOn(cropId, d)); }
  if (typeof Chart === "undefined") return;
  const ctx = document.getElementById("trend-chart").getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, 0, 260);
  grad.addColorStop(0, "rgba(217,168,74,0.45)");
  grad.addColorStop(1, "rgba(217,168,74,0)");
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "line",
    data: { labels: days, datasets: [{
      label: "Modal price (₹/kg) — sample reference", data: values,
      borderColor: "#1d4d3c", backgroundColor: grad, fill: true, tension: 0.4,
      pointBackgroundColor: "#d9a84a", pointRadius: 4, borderWidth: 3 }] },
    options: {
      animation: { duration: 1200, easing: "easeOutQuart" },
      plugins: { legend: { labels: { font: { family: "DM Sans" } } } },
      scales: { y: { beginAtZero: false, ticks: { callback: function (v) { return "₹" + v; } } } }
    }
  });
}
select.addEventListener("change", function () { drawTrend(select.value); });
drawTrend(select.value);
});