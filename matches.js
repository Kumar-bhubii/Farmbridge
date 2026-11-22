// =========================================================
// FARMBRIDGE - matches.js  (Matches page for buyers)
// Needs: auth.js, dashboard.js, data.js, matching.js before it.
// The scoring itself lives in matching.js; this file only shows it.
// =========================================================

window.FB_USER_READY.then(function (readyUser) {
  if (!readyUser || readyUser.role !== "buyer") return;

  const user = readyUser;

  const picker = document.getElementById("picker");
  const select = document.getElementById("demand-select");
  const noDemands = document.getElementById("no-demands");
  const result = document.getElementById("match-result");

  function myOpenDemands() {
    return getDemandsByBuyer(user.phone).filter(function (d) { return d.status === "open"; });
  }

  // one "Crop 40 / 40" style bar
  function partRow(label, pts, max) {
    const pct = Math.round((pts / max) * 100);
    return '<div class="part-row"><span>' + label + '</span>' +
           '<div class="bar"><div class="fill" style="width:' + pct + '%"></div></div>' +
           "<b>" + pts + "/" + max + "</b></div>";
  }

  function reasonList(reasons) {
    return '<ul class="reason-list">' +
      reasons.map(function (r) { return "<li>" + escapeHtml(r) + "</li>"; }).join("") +
      "</ul>";
  }

  function sampleTag(lot) {
    return lot.sample ? ' <span class="tag-sample">Sample</span>' : "";
  }

  function render() {
    const demand = myOpenDemands().find(function (d) { return d.id === select.value; });
    if (!demand) { result.innerHTML = ""; return; }

    const info = cropInfo(demand.crop);
    const ranked = rankListings(demand, getAvailableListings());
    const group = buildBestGroup(demand, ranked);
    let html = "";

    // ---------- best combination ----------
    if (group) {
      const need = demand.quantityKg;
      let banner;
      if (group.shortKg === 0) {
        banner = '<div class="match-good">✅ This combination covers your full ' + need + " kg</div>";
      } else {
        banner = '<div class="match-warn">⚠️ These lots cover only ' + Math.round(group.coverage * 100) +
                 "% of your requirement. Short by " + group.shortKg + " kg.</div>";
      }

      const farmerRows = group.items.map(function (s) {
        const lot = s.listing;
        const pct = Math.min(100, Math.round((lot.quantityKg / need) * 100));
        return '<div class="farmer-bar">' +
          '<div class="who"><b style="text-align:left">' + escapeHtml(lot.farmerName) + "</b>" + sampleTag(lot) +
          "<small>📍 " + escapeHtml(lot.area) + " • 📅 " + prettyDate(lot.harvestDate) + "</small></div>" +
          "<b>" + lot.quantityKg + " kg</b>" +
          '<div class="bar"><div class="fill" style="width:' + pct + '%"></div></div>' +
          "</div>";
      }).join("");

      html +=
        '<section class="match-group">' +
          '<div class="match-head">' +
            "<div><small>BEST COMBINATION</small>" +
            "<h3>" + info.emoji + " " + group.farmerCount + (group.farmerCount === 1 ? " farmer" : " farmers") +
            " • " + group.totalKg + " kg of " + need + " kg</h3></div>" +
            '<div class="score-badge"><b>' + group.total + "</b><span>OUT OF 100</span></div>" +
          "</div>" +
          banner +
          farmerRows +
          '<div class="breakdown"><h4>How this score was calculated</h4>' +
            partRow("Crop", group.parts.crop, MATCH_WEIGHTS.crop) +
            partRow("Quantity", group.parts.quantity, MATCH_WEIGHTS.quantity) +
            partRow("Location", group.parts.location, MATCH_WEIGHTS.location) +
            partRow("Date", group.parts.date, MATCH_WEIGHTS.date) +
          "</div>" +
          '<p class="match-note">Last harvest in this group: ' + prettyDate(group.lastHarvest) +
          ". A match is a lead for you to verify, not a guaranteed sale, quality certification or transport booking.</p>" +
        "</section>";
    } else {
      html +=
        '<div class="empty-state"><span>🔍</span><h3>No lot can be ready in time</h3>' +
        "<p>No available " + escapeHtml(info.name) + " is expected to be harvested by " + prettyDate(demand.requiredDate) +
        ". Try a later date, or load sample data.</p></div>";
    }

    // ---------- every lot, ranked ----------
    if (ranked.length) {
      html += '<h2 class="ranked-title">All ' + escapeHtml(info.name) + " lots, ranked</h2>";
      ranked.forEach(function (s) {
        const lot = s.listing;
        html +=
          '<div class="rank-card">' +
            "<h4>" + escapeHtml(lot.farmerName) + sampleTag(lot) +
            " <small>• " + lot.quantityKg + " kg • " + escapeHtml(lot.area) + "</small></h4>" +
            '<div class="rank-score">' + s.total + "<small> /100</small></div>" +
            reasonList(s.reasons) +
          "</div>";
      });
    }

    result.innerHTML = html;
  }

  function init() {
    const demands = myOpenDemands();
    noDemands.hidden = demands.length > 0;
    picker.hidden = demands.length === 0;

    select.innerHTML = "";
    demands.forEach(function (d) {
      const option = document.createElement("option");
      option.value = d.id;
      option.textContent = cropInfo(d.crop).emoji + " " + cropInfo(d.crop).name + " • " +
        d.quantityKg + " kg • " + d.area + " • by " + prettyDate(d.requiredDate);
      select.appendChild(option);
    });

    render();
  }

  select.addEventListener("change", render);
  init();
});