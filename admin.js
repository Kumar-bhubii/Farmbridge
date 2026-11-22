
// FARMBRIDGE - admin.js
// Admin moderation is temporarily disabled.
// A browser-side PIN is not secure authentication.

(function () {
  "use strict";

  const gate = document.getElementById("gate");
  const panel = document.getElementById("admin");
  const lockButton = document.getElementById("admin-lock");

  if (panel) {
    panel.hidden = true;
  }

  if (lockButton) {
    lockButton.hidden = true;
  }

  if (gate) {
    gate.innerHTML =
      '<div class="icon-bubble" style="margin:0 auto 10px">🛡️</div>' +
      '<h3>Admin access unavailable</h3>' +
      '<p class="section-sub">' +
      'The moderation panel is being secured. It will be available ' +
      'after proper Firebase administrator permissions are configured.' +
      '</p>';
  }
})();

