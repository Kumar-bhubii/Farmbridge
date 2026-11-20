// =========================================================
// FARMBRIDGE - listings.js  (controls the farmer dashboard)
// Needs: auth.js, dashboard.js, data.js loaded before it.
// `user` comes from dashboard.js
// =========================================================

if (user) {

  // ---------- grab page elements ----------
  const formSection = document.getElementById("form-section");
  const listingForm = document.getElementById("listing-form");
  const openBtn = document.getElementById("open-form");
  const cancelBtn = document.getElementById("cancel-form");
  const formMessage = document.getElementById("form-message");
  const cropSelect = document.getElementById("crop");
  const harvestInput = document.getElementById("harvest-date");
  const areaInput = document.getElementById("area");
  const photoInput = document.getElementById("photo");
  const photoPreview = document.getElementById("photo-preview");
  const listingGrid = document.getElementById("listing-grid");
  const emptyState = document.getElementById("empty-state");

  let photoData = ""; // resized photo (as text) waiting to be saved

  // ---------- small helpers ----------
  // Makes user-typed text safe to show on the page
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // "2026-12-05" -> "5 Dec 2026"
  function prettyDate(iso) {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  // today as YYYY-MM-DD (so the date picker blocks past dates)
  function todayString() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  // ---------- fill the crop dropdown ----------
  CROPS.forEach(function (c) {
    const option = document.createElement("option");
    option.value = c.id;
    option.textContent = c.emoji + " " + c.name;
    cropSelect.appendChild(option);
  });

  harvestInput.min = todayString();

  // ---------- show / hide the form ----------
  function openForm() {
    areaInput.value = user.area; // pre-fill with their village
    formSection.hidden = false;
    formSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function closeForm() {
    formSection.hidden = true;
    listingForm.reset();
    photoData = "";
    photoPreview.hidden = true;
    formMessage.hidden = true;
  }

  openBtn.addEventListener("click", openForm);
  cancelBtn.addEventListener("click", closeForm);

  // ---------- photo: shrink it so it fits in browser storage ----------
  photoInput.addEventListener("change", function () {
    const file = photoInput.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      formMessage.textContent = "Please choose an image file.";
      formMessage.hidden = false;
      photoInput.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        const maxWidth = 500;
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);

        photoData = canvas.toDataURL("image/jpeg", 0.7);
        photoPreview.src = photoData;
        photoPreview.hidden = false;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

  // ---------- submit the form ----------
  listingForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const result = addListing({
      crop: cropSelect.value,
      quantityKg: document.getElementById("quantity").value,
      harvestDate: harvestInput.value,
      area: areaInput.value,
      grade: document.getElementById("grade").value,
      notes: document.getElementById("notes").value,
      photo: photoData
    }, user);

    if (!result.ok) {
      formMessage.textContent = result.error;
      formMessage.hidden = false;
      return;
    }

    closeForm();
    renderListings();
  });

  // ---------- show all of this farmer's lots ----------
  function renderListings() {
    const lots = getListingsByFarmer(user.phone);

    // update the dashboard number
    document.getElementById("stat-listings").textContent = lots.length;
    document.getElementById("stat-matches").textContent = countMatchedDemandsForFarmer(user.phone);
    document.getElementById("stat-enquiries").textContent = countActiveEnquiries(user.phone);

    emptyState.hidden = lots.length > 0;
    listingGrid.innerHTML = "";

    lots.forEach(function (lot) {
      const crop = cropInfo(lot.crop);
      const card = document.createElement("article");
      card.className = "listing-card";

      const photoHtml = lot.photo
        ? '<img src="' + lot.photo + '" alt="' + escapeHtml(crop.name) + '">'
        : '<span class="listing-emoji">' + crop.emoji + "</span>";

      card.innerHTML =
        '<div class="listing-photo">' + photoHtml + "</div>" +
        '<div class="listing-body">' +
          '<div class="listing-top">' +
            "<h3>" + crop.emoji + " " + escapeHtml(crop.name) + "</h3>" +
            '<span class="badge ' + lot.status + '">' + lot.status + "</span>" +
          "</div>" +
          '<p class="listing-qty">' + lot.quantityKg + " kg</p>" +
          '<ul class="listing-meta">' +
            "<li>📅 Harvest: " + prettyDate(lot.harvestDate) + "</li>" +
            "<li>📍 " + escapeHtml(lot.area) + "</li>" +
            (lot.grade ? "<li>⭐ Quality (self-reported): " + escapeHtml(lot.grade) + "</li>" : "") +
            (lot.notes ? "<li>📝 " + escapeHtml(lot.notes) + "</li>" : "") +
          "</ul>" +
          '<div class="listing-actions">' +
            '<select class="status-select" data-id="' + lot.id + '">' +
              '<option value="available"' + (lot.status === "available" ? " selected" : "") + ">Available</option>" +
              '<option value="reserved"' + (lot.status === "reserved" ? " selected" : "") + ">Reserved</option>" +
              '<option value="sold"' + (lot.status === "sold" ? " selected" : "") + ">Sold</option>" +
            "</select>" +
            '<button class="btn-delete" data-id="' + lot.id + '" type="button">Delete</button>' +
          "</div>" +
        "</div>";

      listingGrid.appendChild(card);
    });
  }

  // status dropdown + delete button (one listener handles all cards)
  listingGrid.addEventListener("change", function (event) {
    if (event.target.classList.contains("status-select")) {
      updateListingStatus(event.target.dataset.id, event.target.value);
      renderListings();
    }
  });

  listingGrid.addEventListener("click", function (event) {
    if (event.target.classList.contains("btn-delete")) {
      if (confirm("Delete this crop lot?")) {
        deleteListing(event.target.dataset.id);
        renderListings();
      }
    }
  });

  // first draw when the page opens
  renderListings();
}