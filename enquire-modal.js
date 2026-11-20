    // =========================================================
// FARMBRIDGE - enquire-modal.js
// The pop-up used by:
//   - Browse Supply  (a buyer enquires about a farmer's lot)
//   - Demand Board   (a farmer responds to a buyer's requirement)
// Needs: auth.js, dashboard.js (for `user`) and data.js loaded before it.
//
// Usage from other files:
//   openEnquiryDialog({ mode: "buy",     lot: lot,       onDone: refreshFunction });
//   openEnquiryDialog({ mode: "respond", demand: demand, onDone: refreshFunction });
// =========================================================

(function () {

  // create the empty pop-up once and keep it on the page
  const dialog = document.createElement("dialog");
  dialog.className = "enq-dialog";
  document.body.appendChild(dialog);

  let afterClose = null;   // function to run when the pop-up closes after a send
  let sent = false;        // did the user actually send something?

  dialog.addEventListener("close", function () {
    if (sent && afterClose) afterClose();
    sent = false;
  });

  // clicking the dark background closes it
  dialog.addEventListener("click", function (event) {
    if (event.target === dialog) dialog.close();
  });

  function show(html) {
    dialog.innerHTML = '<div class="enq-inner">' + html + "</div>";
  }

  function showError(text) {
    const box = dialog.querySelector("#enq-error");
    box.textContent = text;
    box.hidden = false;
  }

  function summary(emoji, title, subtitle) {
    return '<div class="enq-summary"><span>' + emoji + "</span><div><b>" + title +
           "</b><small>" + subtitle + "</small></div></div>";
  }

  // ---------- "sent!" screen ----------
  function showSuccess(otherName) {
    sent = true;
    show(
      '<div class="enq-success">' +
        "<span>✅</span>" +
        "<h3>Sent!</h3>" +
        "<p><b>" + escapeHtml(otherName) + "</b> will see this on their Enquiries page. " +
        "Contact details are shared only once they start the discussion.</p>" +
        '<div class="form-buttons">' +
          '<a href="enquiries.html" class="btn btn-solid">View my enquiries</a>' +
          '<button class="btn btn-ghost" type="button" id="enq-close">Close</button>' +
        "</div>" +
      "</div>"
    );
    dialog.querySelector("#enq-close").addEventListener("click", function () { dialog.close(); });
  }

  // ---------- BUYER: enquire about a lot ----------
  function renderBuy(lot) {
    const info = cropInfo(lot.crop);

    show(
      "<h3>Enquire about this lot</h3>" +
      summary(info.emoji,
        escapeHtml(info.name) + " • " + lot.quantityKg + " kg",
        escapeHtml(lot.farmerName) + " • " + escapeHtml(lot.area) + " • Harvest " + prettyDate(lot.harvestDate)) +
      '<div id="enq-error" class="message" hidden></div>' +
      '<form id="enq-form" class="form">' +
        '<label>Quantity you want (kg)' +
          '<input type="text" id="enq-qty" inputmode="numeric" value="' + lot.quantityKg + '" required></label>' +
        '<label>Message (optional)' +
          '<input type="text" id="enq-msg" placeholder="e.g. Can you deliver to the market?"></label>' +
        '<div class="form-buttons">' +
          '<button class="btn btn-solid" type="submit">Send enquiry</button>' +
          '<button class="btn btn-ghost" type="button" id="enq-cancel">Cancel</button>' +
        "</div>" +
      "</form>"
    );

    dialog.querySelector("#enq-cancel").addEventListener("click", function () { dialog.close(); });
    dialog.querySelector("#enq-form").addEventListener("submit", function (event) {
      event.preventDefault();
      const result = createEnquiry({
        lotId: lot.id,
        quantityKg: dialog.querySelector("#enq-qty").value,
        message: dialog.querySelector("#enq-msg").value
      }, user);

      if (!result.ok) { showError(result.error); return; }
      showSuccess(lot.farmerName);
    });
  }

  // ---------- FARMER: respond to a requirement ----------
  function renderRespond(demand) {
    const info = cropInfo(demand.crop);
    const mine = getListingsByFarmer(user.phone).filter(function (l) {
      return l.crop === demand.crop && l.status === "available";
    });

    const head = "<h3>Respond to this requirement</h3>" +
      summary(info.emoji,
        escapeHtml(info.name) + " • " + demand.quantityKg + " kg needed",
        escapeHtml(demand.buyerName) + " • " + escapeHtml(demand.area) + " • By " + prettyDate(demand.requiredDate));

    // no suitable lot yet
    if (mine.length === 0) {
      show(
        head +
        '<div class="match-warn">You have no available ' + escapeHtml(info.name) +
        " lot. Add one from your dashboard first, then respond.</div>" +
        '<div class="form-buttons">' +
          '<a href="farmer.html" class="btn btn-solid">Go to my dashboard</a>' +
          '<button class="btn btn-ghost" type="button" id="enq-cancel">Close</button>' +
        "</div>"
      );
      dialog.querySelector("#enq-cancel").addEventListener("click", function () { dialog.close(); });
      return;
    }

    const options = mine.map(function (l) {
      return '<option value="' + l.id + '">' + l.quantityKg + " kg • " + escapeHtml(l.area) +
             " • harvest " + prettyDate(l.harvestDate) + "</option>";
    }).join("");

    show(
      head +
      '<div id="enq-error" class="message" hidden></div>' +
      '<form id="enq-form" class="form">' +
        '<label>Which of your lots?<select id="enq-lot">' + options + "</select></label>" +
        '<label>Quantity you offer (kg)<input type="text" id="enq-qty" inputmode="numeric" required></label>' +
        '<label>Message (optional)<input type="text" id="enq-msg" placeholder="e.g. Fresh, can be picked up on harvest day"></label>' +
        '<div class="form-buttons">' +
          '<button class="btn btn-solid" type="submit">Send response</button>' +
          '<button class="btn btn-ghost" type="button" id="enq-cancel">Cancel</button>' +
        "</div>" +
      "</form>"
    );

    const lotSelect = dialog.querySelector("#enq-lot");
    const qtyInput = dialog.querySelector("#enq-qty");

    // suggest the smaller of: what the lot has, what the buyer needs
    function suggestQty() {
      const lot = mine.find(function (l) { return l.id === lotSelect.value; });
      qtyInput.value = Math.min(lot.quantityKg, demand.quantityKg);
    }
    suggestQty();
    lotSelect.addEventListener("change", suggestQty);

    dialog.querySelector("#enq-cancel").addEventListener("click", function () { dialog.close(); });
    dialog.querySelector("#enq-form").addEventListener("submit", function (event) {
      event.preventDefault();
      const result = createEnquiry({
        demandId: demand.id,
        lotId: lotSelect.value,
        quantityKg: qtyInput.value,
        message: dialog.querySelector("#enq-msg").value
      }, user);

      if (!result.ok) { showError(result.error); return; }
      showSuccess(demand.buyerName);
    });
  }

  // ---------- public function ----------
  window.openEnquiryDialog = function (options) {
    if (typeof user === "undefined" || !user) return;
    afterClose = options.onDone || null;
    sent = false;

    if (options.mode === "buy") renderBuy(options.lot);
    else renderRespond(options.demand);

    dialog.showModal();
  };
})();