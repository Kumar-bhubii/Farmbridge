// =========================================================
// FARMBRIDGE - demo.js
// Powers the "Load sample data" / "Remove sample data" buttons.
// Needs data.js loaded before it.
// =========================================================

const loadSampleBtn = document.getElementById("load-sample");
const clearSampleBtn = document.getElementById("clear-sample");

if (loadSampleBtn) {
  loadSampleBtn.addEventListener("click", function () {
    seedSampleData();
    window.location.reload(); // redraw the page with the new data
  });
}

if (clearSampleBtn) {
  clearSampleBtn.addEventListener("click", function () {
    if (confirm("Remove all sample data? Your own lots and requirements stay.")) {
      clearSampleData();
      window.location.reload();
    }
  });
}