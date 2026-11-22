
// =========================================================
// FARMBRIDGE - supply.js
// Browse Supply page for buyers.
// Waits for Firebase profile loading.
// =========================================================

if (window.FB_USER_READY) {

  window.FB_USER_READY.then(function (readyUser) {

    if (!readyUser || readyUser.role !== "buyer") return;

    const user = readyUser;

    const cropFilter = document.getElementById("f-crop");
    const minFilter = document.getElementById("f-min");
    const areaFilter = document.getElementById("f-area");
    const dateFilter = document.getElementById("f-date");
    const resetBtn = document.getElementById("f-reset");
    const summary = document.getElementById("result-summary");
    const grid = document.getElementById("supply-grid");
    const emptyState = document.getElementById("empty-state");

    // Fill crop dropdown
    CROPS.forEach(function (c) {
      const option = document.createElement("option");
      option.value = c.id;
      option.textContent = c.emoji + " " + c.name;
      cropFilter.appendChild(option);
    });

    function render() {
      const crop = cropFilter.value;
      const minKg = Number(minFilter.value) || 0;
      const area = areaFilter.value.trim().toLowerCase();
      const readyBy = dateFilter.value;

      // 1. Filter available lots
      const lots = getAvailableListings()
        .filter(function (l) {
          if (crop && l.crop !== crop) return false;
          if (l.quantityKg < minKg) return false;
          if (area && l.area.toLowerCase().indexOf(area) === -1) return false;
          if (readyBy && l.harvestDate > readyBy) return false;
          return true;
        })
        .sort(function (a, b) {
          return a.harvestDate.localeCompare(b.harvestDate);
        });

      // 2. Summary
      const totalKg = lots.reduce(function (sum, l) {
        return sum + l.quantityKg;
      }, 0);

      if (lots.length === 0) {
        summary.textContent = "";
      } else if (crop) {
        summary.innerHTML =
          "<b>" + lots.length + " lots</b> of " +
          escapeHtml(cropInfo(crop).name) +
          " from different farmers • combined <b>" +
          totalKg + " kg</b> available";
      } else {
        summary.innerHTML =
          "<b>" + lots.length + " lots</b> found • combined <b>" +
          totalKg + " kg</b>";
      }

      // 3. Draw listing cards
      emptyState.hidden = lots.length > 0;
      grid.innerHTML = "";

      lots.forEach(function (lot) {
        const info = cropInfo(lot.crop);

        const alreadyAsked = getEnquiries().some(function (e) {
          return isActiveEnquiry(e) &&
            e.lotId === lot.id &&
            e.buyerPhone === user.phone &&
            !e.demandId;
        });

        const enquireBtn = alreadyAsked
          ? '<a href="enquiries.html" class="btn btn-ghost btn-wide">Enquiry sent ✓ View</a>'
          : '<button class="btn btn-solid btn-wide enquire-btn" data-id="' + lot.id + '" type="button">Enquire</button>';

        const card = document.createElement("article");
        card.className = "listing-card";

        const photoHtml = lot.photo
          ? '<img src="' + lot.photo + '" alt="' + escapeHtml(info.name) + '">'
          : '<span class="listing-emoji">' + info.emoji + "</span>";

        card.innerHTML =
          '<div class="listing-photo">' + photoHtml + "</div>" +
          '<div class="listing-body">' +
            '<div class="listing-top">' +
              "<h3>" + info.emoji + " " + escapeHtml(info.name) + "</h3>" +
              (lot.sample ? '<span class="tag-sample">Sample</span>' : "") +
            "</div>" +
            '<p class="listing-qty">' + lot.quantityKg + " kg</p>" +
            '<ul class="listing-meta">' +
              "<li>👩‍🌾 " + escapeHtml(lot.farmerName) + "</li>" +
              "<li>📍 " + escapeHtml(lot.area) + "</li>" +
              "<li>📅 Harvest: " + prettyDate(lot.harvestDate) + "</li>" +
              (lot.grade ? "<li>⭐ Quality (self-reported): " + escapeHtml(lot.grade) + "</li>" : "") +
              (lot.notes ? "<li>📝 " + escapeHtml(lot.notes) + "</li>" : "") +
            "</ul>" +
            '<div class="listing-actions">' +
              enquireBtn +
            "</div>" +
          "</div>";

        grid.appendChild(card);
      });
    }

    // Re-run filters when values change
    [cropFilter, minFilter, areaFilter, dateFilter].forEach(function (el) {
      el.addEventListener("input", render);
      el.addEventListener("change", render);
    });

    // Reset filters
    resetBtn.addEventListener("click", function () {
      cropFilter.value = "";
      minFilter.value = "";
      areaFilter.value = "";
      dateFilter.value = "";
      render();
    });

    // Enquire button
    grid.addEventListener("click", function (event) {
      const btn = event.target.closest(".enquire-btn");
      if (!btn) return;

      const lot = getListings().find(function (l) {
        return l.id === btn.dataset.id;
      });

      if (lot) {
        openEnquiryDialog({
          mode: "buy",
          lot: lot,
          onDone: render
        });
      }
    });

    render();

  }).catch(function (error) {
    console.error("Supply page initialization failed:", error);
  });
}
