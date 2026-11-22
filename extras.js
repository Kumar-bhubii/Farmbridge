
/* =========================================================
   FARMBRIDGE - extras.js
   Shared notifications and small UI helpers.
   ========================================================= */

(function () {
  "use strict";

  window.fbToast = function (message, duration) {
    let toast = document.getElementById("fb-toast");

    if (!toast) {
      toast = document.createElement("div");
      toast.id = "fb-toast";

      toast.style.position = "fixed";
      toast.style.left = "50%";
      toast.style.bottom = "25px";
      toast.style.transform = "translateX(-50%)";
      toast.style.zIndex = "99999";
      toast.style.maxWidth = "90%";
      toast.style.padding = "12px 20px";
      toast.style.borderRadius = "12px";
      toast.style.background = "#1d4d3c";
      toast.style.color = "#ffffff";
      toast.style.fontFamily = "DM Sans, sans-serif";
      toast.style.fontSize = "14px";
      toast.style.boxShadow = "0 5px 20px rgba(0,0,0,.2)";
      toast.style.textAlign = "center";
      toast.style.opacity = "0";
      toast.style.transition = "opacity .2s ease";

      document.body.appendChild(toast);
    }

    toast.textContent = String(message);
    toast.style.opacity = "1";

    clearTimeout(window.FB_TOAST_TIMEOUT);

    window.FB_TOAST_TIMEOUT = setTimeout(function () {
      toast.style.opacity = "0";
    }, duration || 2600);
  };
})();
