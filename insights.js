// FARMBRIDGE - insights.js (Chart.js dashboards from platform activity)
const lots = getListings(), demands = getDemands(), enquiries = getEnquiries();
function sumKg(list) { return list.reduce(function (s, x) { return s + Number(x.quantityKg || 0); }, 0); }
function countUp(id, value) {
  const el = document.getElementById(id), start = performance.now();
  (function tick(now) {
    const p = Math.min((now - start) / 1200, 1);
    el.textContent = Math.round(value * (1 - Math.pow(1 - p, 3))).toLocaleString("en-IN");
    if (p < 1) requestAnimationFrame(tick);
  })(start);
}
const available = lots.filter(function (l) { return l.status === "available"; });
const open = demands.filter(function (d) { return d.status === "open"; });
countUp("k-supply", sumKg(available));
countUp("k-demand", sumKg(open));
countUp("k-farmers", new Set(available.map(function (l) { return l.farmerPhone; })).size);
countUp("k-deals", enquiries.filter(function (e) { return e.status === "completed"; }).length);

if (typeof Chart !== "undefined") {
  Chart.defaults.font.family = "DM Sans";
  Chart.defaults.color = "#22302b";

  new Chart(document.getElementById("c-crop"), {
    type: "bar",
    data: {
      labels: CROPS.map(function (c) { return c.emoji + " " + c.name; }),
      datasets: [
        { label: "Available supply", backgroundColor: "#5e7f55", borderRadius: 8,
          data: CROPS.map(function (c) { return sumKg(available.filter(function (l) { return l.crop === c.id; })); }) },
        { label: "Open demand", backgroundColor: "#d9a84a", borderRadius: 8,
          data: CROPS.map(function (c) { return sumKg(open.filter(function (d) { return d.crop === c.id; })); }) }
      ]
    },
    options: { animation: { duration: 1400, easing: "easeOutBack" } }
  });

  if (!enquiries.length) document.getElementById("c-pipe").insertAdjacentHTML("beforebegin",
    '<p class="section-sub">No enquiries yet — send one from the supply or demand board to see the pipeline fill up.</p>');
  const stages = ENQ_STEPS.concat(["declined", "cancelled"]);
  new Chart(document.getElementById("c-pipe"), {
    type: "doughnut",
    data: {
      labels: stages.map(function (s) { return ENQ_LABELS[s] || s; }),
      datasets: [{
        data: stages.map(function (s) { return enquiries.filter(function (e) { return e.status === s; }).length; }),
        backgroundColor: ["#f1d9a0", "#d9a84a", "#5e7f55", "#1d4d3c", "#123329", "#c06f4c", "#e2d9c6"],
        borderWidth: 3, borderColor: "#fffdf8"
      }]
    },
    options: { cutout: "62%", animation: { animateRotate: true, duration: 1600 } }
  });

  const days = [];
  for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d.toISOString().slice(0, 10)); }
  function perDay(list) { return days.map(function (day) { return list.filter(function (x) { return (x.createdAt || "").slice(0, 10) === day; }).length; }); }
  new Chart(document.getElementById("c-time"), {
    type: "line",
    data: {
      labels: days.map(function (d) { return d.slice(5); }),
      datasets: [
        { label: "Crop lots", data: perDay(lots), borderColor: "#1d4d3c", backgroundColor: "rgba(29,77,60,.15)", fill: true, tension: .4 },
        { label: "Requirements", data: perDay(demands), borderColor: "#c06f4c", backgroundColor: "rgba(192,111,76,.12)", fill: true, tension: .4 }
      ]
    },
    options: { scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
  });
}
