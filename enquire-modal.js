
// =========================================================
// FARMBRIDGE - enquire-modal.js
// Enquiry modal for buyers and farmers.
// Waits for Firebase profile loading.
// =========================================================

(function () {

  let currentUser = null;

  // Receive the authenticated user profile.
  if (window.FB_USER_READY) {
    window.FB_USER_READY.then(function (readyUser) {
      currentUser = readyUser;
    }).catch(function (error) {
      console.error("Enquiry modal authentication failed:", error);
    });
  }

  // Create the pop-up once.
  const dialog = document.createElement("dialog");
  dialog.className = "enq-dialog";
  document.body.appendChild(dialog);

  let afterClose = null;
  let sent = false;

  dialog.addEventListener("close", function () {
    if (sent && afterClose) afterClose();
    sent = false;
  });

  // Clicking the dark background closes it.
  dialog.addEventListener("click", function (event) {
    if (event.target === dialog) dialog.close();
  });

  function show(html) {
    dialog.innerHTML = '<div class="enq-inner">' + html + "</div>";
  }

  function showError(text) {
    const box = dialog.querySelector("#enq-error");

    if (!box) return;

    box.textContent = text;
    box.hidden = false;
  }

  function summary(emoji, title, subtitle) {
    return '<div class="enq-summary"><span>' + emoji + "</span><div><b>" + title +
      "</b><small>" + subtitle + "</small></div></div>";
  }

  // ---------- Success screen ----------

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

    dialog.querySelector("#enq-close").addEventListener("click", function () {
      dialog.close();
    });
  }

  // ---------- Buyer: enquire about a lot ----------

  function renderBuy(lot) {
    const info = cropInfo(lot.crop);

    show(
      "<h3>Enquire about this lot</h3>" +
      summary(
        info.emoji,
        escapeHtml(info.name) + " • " + lot.quantityKg + " kg",
        escapeHtml(lot.farmerName) + " • " + escapeHtml(lot.area) +
        " • Harvest " + prettyDate(lot.harvestDate)
      ) +
      '<div id="enq-error" class="message" hidden></div>' +
      '<form id="enq-form" class="form">' +
        '<label>Quantity you want (kg)' +
          '<input type="text" id="enq-qty" inputmode="numeric" value="' +
          lot.quantityKg + '" required></label>' +
        '<label>Message (optional)' +
          '<input type="text" id="enq-msg" placeholder="e.g. Can you deliver to the market?"></label>' +
        '<div class="form-buttons">' +
          '<button class="btn btn-solid" type="submit">Send enquiry</button>' +
          '<button class="btn btn-ghost" type="button" id="enq-cancel">Cancel</button>' +
        "</div>" +
      "</form>"
    );

    dialog.querySelector("#enq-cancel").addEventListener("click", function () {
      dialog.close();
    });

    // Save buyer enquiry to Firebase.
    dialog.querySelector("#enq-form").addEventListener("submit", async function (event) {
      event.preventDefault();

      const submitButton = dialog.querySelector('#enq-form button[type="submit"]');

      if (submitButton.disabled) return;

      submitButton.disabled = true;
      submitButton.textContent = "Sending...";

      try {
        const result = await createEnquiry({
          lotId: lot.id,
          quantityKg: dialog.querySelector("#enq-qty").value,
          message: dialog.querySelector("#enq-msg").value
        }, currentUser);

        if (!result.ok) {
          showError(result.error);
          return;
        }

        showSuccess(lot.farmerName);

      } catch (error) {
        console.error("Buyer enquiry failed:", error);
        showError("Could not send the enquiry. Please try again.");

      } finally {
        if (submitButton.isConnected) {
          submitButton.disabled = false;
          submitButton.textContent = "Send enquiry";
        }
      }
    });
  }

  // ---------- Farmer: respond to a requirement ----------

  function renderRespond(demand) {
    const info = cropInfo(demand.crop);

    const mine = getListingsByFarmer(currentUser.phone).filter(function (l) {
      return l.crop === demand.crop && l.status === "available";
    });

    const head =
      "<h3>Respond to this requirement</h3>" +
      summary(
        info.emoji,
        escapeHtml(info.name) + " • " + demand.quantityKg + " kg needed",
        escapeHtml(demand.buyerName) + " • " + escapeHtml(demand.area) +
        " • By " + prettyDate(demand.requiredDate)
      );

    // No suitable lot yet.
    if (mine.length === 0) {
      show(
        head +
        '<div class="match-warn">You have no available ' +
        escapeHtml(info.name) +
        " lot. Add one from your dashboard first, then respond.</div>" +
        '<div class="form-buttons">' +
          '<a href="farmer.html" class="btn btn-solid">Go to my dashboard</a>' +
          '<button class="btn btn-ghost" type="button" id="enq-cancel">Close</button>' +
        "</div>"
      );

      dialog.querySelector("#enq-cancel").addEventListener("click", function () {
        dialog.close();
      });

      return;
    }

    const options = mine.map(function (l) {
      return '<option value="' + l.id + '">' +
        l.quantityKg + " kg • " + escapeHtml(l.area) +
        " • harvest " + prettyDate(l.harvestDate) + "</option>";
    }).join("");

    show(
      head +
      '<div id="enq-error" class="message" hidden></div>' +
      '<form id="enq-form" class="form">' +
        '<label>Which of your lots?<select id="enq-lot">' + options + "</select></label>" +
        '<label>Quantity you offer (kg)' +
          '<input type="text" id="enq-qty" inputmode="numeric" required></label>' +
        '<label>Message (optional)' +
          '<input type="text" id="enq-msg" placeholder="e.g. Fresh, can be picked up on harvest day"></label>' +
        '<div class="form-buttons">' +
          '<button class="btn btn-solid" type="submit">Send response</button>' +
          '<button class="btn btn-ghost" type="button" id="enq-cancel">Cancel</button>' +
        "</div>" +
      "</form>"
    );

    const lotSelect = dialog.querySelector("#enq-lot");
    const qtyInput = dialog.querySelector("#enq-qty");

    // Suggest the smaller of the lot quantity and buyer requirement.
    function suggestQty() {
      const lot = mine.find(function (l) {
        return l.id === lotSelect.value;
      });

      if (lot) {
        qtyInput.value = Math.min(lot.quantityKg, demand.quantityKg);
      }
    }

    suggestQty();
    lotSelect.addEventListener("change", suggestQty);

    dialog.querySelector("#enq-cancel").addEventListener("click", function () {
      dialog.close();
    });

    // Save farmer response to Firebase.
    dialog.querySelector("#enq-form").addEventListener("submit", async function (event) {
      event.preventDefault();

      const submitButton = dialog.querySelector('#enq-form button[type="submit"]');

      if (submitButton.disabled) return;

      submitButton.disabled = true;
      submitButton.textContent = "Sending...";

      try {
        const result = await createEnquiry({
          demandId: demand.id,
          lotId: lotSelect.value,
          quantityKg: qtyInput.value,
          message: dialog.querySelector("#enq-msg").value
        }, currentUser);

        if (!result.ok) {
          showError(result.error);
          return;
        }

        showSuccess(demand.buyerName);

      } catch (error) {
        console.error("Farmer response failed:", error);
        showError("Could not send the response. Please try again.");

      } finally {
        if (submitButton.isConnected) {
          submitButton.disabled = false;
          submitButton.textContent = "Send response";
        }
      }
    });
  }

  // ---------- Public function ----------

  window.openEnquiryDialog = function (options) {

    if (!currentUser) {
      console.error("Enquiry modal: authenticated user is not ready.");
      return;
    }

    afterClose = options.onDone || null;
    sent = false;

    if (options.mode === "buy") {
      renderBuy(options.lot);
    } else if (options.mode === "respond") {
      renderRespond(options.demand);
    } else {
      console.error("Unknown enquiry mode:", options.mode);
      return;
    }

    dialog.showModal();
  };

})();

