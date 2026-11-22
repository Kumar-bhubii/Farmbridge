
// =========================================================
// FARMBRIDGE - buyer.js
// Controls the buyer dashboard.
// Waits for Firebase profile loading before initialization.
// =========================================================

if (window.FB_USER_READY) {

  window.FB_USER_READY.then(function (readyUser) {

    if (!readyUser || readyUser.role !== "buyer") return;

    const user = readyUser;

    const formSection = document.getElementById("form-section");
    const demandForm = document.getElementById("demand-form");
    const openBtn = document.getElementById("open-form");
    const cancelBtn = document.getElementById("cancel-form");
    const formMessage = document.getElementById("form-message");
    const cropSelect = document.getElementById("crop");
    const areaInput = document.getElementById("area");
    const dateInput = document.getElementById("required-date");
    const demandGrid = document.getElementById("demand-grid");
    const emptyState = document.getElementById("empty-state");

    // Fill the crop dropdown
    CROPS.forEach(function (c) {
      const option = document.createElement("option");
      option.value = c.id;
      option.textContent = c.emoji + " " + c.name;
      cropSelect.appendChild(option);
    });

    dateInput.min = dateInDays(0);

    // ---------- Show / hide the form ----------

    function openForm() {
      areaInput.value = user.area;
      formSection.hidden = false;
      formSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }

    function closeForm() {
      formSection.hidden = true;
      demandForm.reset();
      formMessage.hidden = true;
    }

    openBtn.addEventListener("click", openForm);
    cancelBtn.addEventListener("click", closeForm);

    // ---------- Submit demand ----------
demandForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const submitButton = demandForm.querySelector(
    'button[type="submit"]'
  );

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Saving...";
  }

  const result = await addDemand({
    crop: cropSelect.value,
    quantityKg: document.getElementById("quantity").value,
    area: areaInput.value,
    requiredDate: dateInput.value,
    quality: document.getElementById("quality").value,
    notes: document.getElementById("notes").value
  }, user);

  if (submitButton) {
    submitButton.disabled = false;
    submitButton.textContent = "Post requirement";
  }

  if (!result.ok) {
    formMessage.textContent = result.error;
    formMessage.hidden = false;
    return;
  }

  closeForm();
  renderDemands();
});

    // ---------- Show this buyer's requirements ----------

    function renderDemands() {
      const demands = getDemandsByBuyer(user.phone);

      document.getElementById("stat-requests").textContent =
        demands.length;

      document.getElementById("stat-matches").textContent =
        countMatchedLotsForBuyer(user.phone);

      document.getElementById("stat-enquiries").textContent =
        countActiveEnquiries(user.phone);

      emptyState.hidden = demands.length > 0;
      demandGrid.innerHTML = "";

      demands.forEach(function (d) {
        const crop = cropInfo(d.crop);
        const card = document.createElement("article");
        card.className = "listing-card";

        card.innerHTML =
          '<div class="listing-photo small"><span class="listing-emoji">' + crop.emoji + "</span></div>" +
          '<div class="listing-body">' +
            '<div class="listing-top">' +
              "<h3>" + escapeHtml(crop.name) + "</h3>" +
              '<span class="badge ' + d.status + '">' + d.status + "</span>" +
            "</div>" +
            '<p class="listing-qty">' + d.quantityKg + " kg needed</p>" +
            '<ul class="listing-meta">' +
              "<li>📅 Needed by: " + prettyDate(d.requiredDate) + "</li>" +
              "<li>📍 " + escapeHtml(d.area) + "</li>" +
              (d.quality ? "<li>⭐ Quality: " + escapeHtml(d.quality) + "</li>" : "") +
              (d.notes ? "<li>📝 " + escapeHtml(d.notes) + "</li>" : "") +
            "</ul>" +
            '<div class="listing-actions">' +
              '<select class="status-select" data-id="' + d.id + '">' +
                '<option value="open"' + (d.status === "open" ? " selected" : "") + ">Open</option>" +
                '<option value="fulfilled"' + (d.status === "fulfilled" ? " selected" : "") + ">Fulfilled</option>" +
                '<option value="closed"' + (d.status === "closed" ? " selected" : "") + ">Closed</option>" +
              "</select>" +
              '<button class="btn-delete" data-id="' + d.id + '" type="button">Delete</button>' +
            "</div>" +
          "</div>";

        demandGrid.appendChild(card);
      });
    }

    // ---------- Update demand status ----------

    demandGrid.addEventListener("change", function (event) {
      if (event.target.classList.contains("status-select")) {
        updateDemandStatus(
          event.target.dataset.id,
          event.target.value
        );

        renderDemands();
      }
    });

    // ---------- Delete demand ----------

    demandGrid.addEventListener("click", function (event) {
      if (event.target.classList.contains("btn-delete")) {
        if (confirm("Delete this requirement?")) {
          deleteDemand(event.target.dataset.id);
          renderDemands();
        }
      }
    });

    renderDemands();

  }).catch(function (error) {
    console.error("Buyer dashboard initialization failed:", error);
  });
}
