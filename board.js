// =========================================================
// FARMBRIDGE - board.js  (Buyer Demand Board for farmers)
// Needs: auth.js, dashboard.js, data.js loaded before it.
// =========================================================

if (user) {

  const cropFilter = document.getElementById("f-crop");
  const areaFilter = document.getElementById("f-area");
  const resetBtn = document.getElementById("f-reset");
  const summary = document.getElementById("result-summary");
  const grid = document.getElementById("board-grid");
  const emptyState = document.getElementById("empty-state");

  CROPS.forEach(function (c) {
    const option = document.createElement("option");
    option.value = c.id;
    option.textContent = c.emoji + " " + c.name;
    cropFilter.appendChild(option);
  });

  // how many kg of a crop THIS farmer has available (to show "you can supply...")
  function myAvailableKg(cropId) {
    return getListingsByFarmer(user.phone)
      .filter(function (l) { return l.crop === cropId && l.status === "available"; })
      .reduce(function (sum, l) { return sum + l.quantityKg; }, 0);
  }

  function render() {
    const crop = cropFilter.value;
    const area = areaFilter.value.trim().toLowerCase();

    const demands = getOpenDemands()
      .filter(function (d) {
        if (crop && d.crop !== crop) return false;
        if (area && d.area.toLowerCase().indexOf(area) === -1) return false;
        return true;
      })
      .sort(function (a, b) { return a.requiredDate.localeCompare(b.requiredDate); }); // most urgent first

    summary.innerHTML = demands.length
      ? "<b>" + demands.length + " open requirements</b>"
      : "";

    emptyState.hidden = demands.length > 0;
    grid.innerHTML = "";

    demands.forEach(function (d) {
      const info = cropInfo(d.crop);
      const mine = myAvailableKg(d.crop);
      const alreadyResponded = getEnquiries().some(function (e) {
        return isActiveEnquiry(e) && e.demandId === d.id && e.farmerPhone === user.phone;
      });
      const respondBtn = alreadyResponded
        ? '<a href="enquiries.html" class="btn btn-ghost btn-wide">Responded ✓ View</a>'
        : '<button class="btn btn-solid btn-wide respond-btn" data-id="' + d.id + '" type="button">Respond</button>';
      const card = document.createElement("article");
      card.className = "listing-card";

      const best = bestMatchForFarmer(d, user.phone);
      let supplyNote = "";
      if (best && isCompatible(best)) {
        supplyNote = '<li class="note-good">✅ Your best lot scores ' + best.total + "/100 for this requirement</li>";
      } else if (mine > 0) {
        supplyNote = '<li class="note-good">ℹ️ You have ' + mine + " kg of " + escapeHtml(info.name) + " but it may not be ready in time</li>";
      }

      card.innerHTML =
        '<div class="listing-photo small"><span class="listing-emoji">' + info.emoji + "</span></div>" +
        '<div class="listing-body">' +
          '<div class="listing-top">' +
            "<h3>" + escapeHtml(info.name) + "</h3>" +
            (d.sample ? '<span class="tag-sample">Sample</span>' : "") +
          "</div>" +
          '<p class="listing-qty">' + d.quantityKg + " kg needed</p>" +
          '<ul class="listing-meta">' +
            "<li>🛒 " + escapeHtml(d.buyerName) + "</li>" +
            "<li>📍 " + escapeHtml(d.area) + "</li>" +
            "<li>📅 Needed by: " + prettyDate(d.requiredDate) + "</li>" +
            (d.quality ? "<li>⭐ Quality: " + escapeHtml(d.quality) + "</li>" : "") +
            (d.notes ? "<li>📝 " + escapeHtml(d.notes) + "</li>" : "") +
            supplyNote +
          "</ul>" +
          '<div class="listing-actions">' +
            respondBtn +
          "</div>" +
        "</div>";

      grid.appendChild(card);
    });
  }

  [cropFilter, areaFilter].forEach(function (el) {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  });

  resetBtn.addEventListener("click", function () {
    cropFilter.value = "";
    areaFilter.value = "";
    render();
  });

  // Respond button (one listener for all cards)
  grid.addEventListener("click", function (event) {
    const btn = event.target.closest(".respond-btn");
    if (!btn) return;
    const demand = getDemands().find(function (d) { return d.id === btn.dataset.id; });
    if (demand) openEnquiryDialog({ mode: "respond", demand: demand, onDone: render });
  });

  render();
}