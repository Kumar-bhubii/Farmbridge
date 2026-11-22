
// =========================================================
// FARMBRIDGE - demo.js
// Handles sample data buttons.
// Requires data.js and dashboard.js.
// =========================================================

const loadSampleBtn = document.getElementById("load-sample");
const clearSampleBtn = document.getElementById("clear-sample");

// Wait for authentication before enabling demo controls.
if (window.FB_USER_READY) {

  window.FB_USER_READY.then(function (user) {

    if (!user) return;

    if (loadSampleBtn) {
      loadSampleBtn.addEventListener("click", function () {

        if (!confirm("Load sample data for demonstration?")) {
          return;
        }

        seedSampleData();
        window.location.reload();
      });
    }

    if (clearSampleBtn) {
      clearSampleBtn.addEventListener("click", function () {

        if (!confirm("Remove all sample data? Your own lots and requirements stay.")) {
          return;
        }

        clearSampleData();
        window.location.reload();
      });
    }

  }).catch(function (error) {
    console.error("Demo initialization failed:", error);
  });
}
