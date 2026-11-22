
// =========================================================
// FARMBRIDGE - dashboard.js
// Waits for Firebase authentication AND Firestore data.
// =========================================================

let user = null;

const pageRole = document.body.dataset.role || "any";

window.FB_USER_READY = (async function () {
  try {
    // First, check the Firebase login session.
    const loggedInUser = await getCurrentUser();

    if (!loggedInUser) {
      window.location.href = "login.html";
      return null;
    }

    // Then wait for Firestore records to load.
    if (window.FB_DATA_READY) {
      await window.FB_DATA_READY;
    }

    // Check the role required by this page.
    if (pageRole !== "any" && loggedInUser.role !== pageRole) {
      window.location.href = dashboardFor(loggedInUser);
      return null;
    }

    user = loggedInUser;
    window.FB_CURRENT_USER = loggedInUser;

    // Display profile information.
    document.querySelectorAll("[data-user]").forEach(function (el) {
      const field = el.dataset.user;
      el.textContent = loggedInUser[field] || "";
    });

    // Display role-based avatar.
    document.querySelectorAll("[data-avatar]").forEach(function (el) {
      el.textContent =
        loggedInUser.role === "farmer" ? "🌾" : "🛒";
    });

    // Update dashboard navigation.
    document.querySelectorAll("[data-back]").forEach(function (el) {
      el.href = dashboardFor(loggedInUser);
    });

    // Display first name.
    document.querySelectorAll("[data-first-name]").forEach(function (el) {
      el.textContent = (loggedInUser.name || "").split(" ")[0];
    });

    return loggedInUser;

  } catch (error) {
    console.error("Dashboard initialization failed:", error);
    alert("Unable to load your FarmBridge account. Please log in again.");
    window.location.href = "login.html";
    return null;
  }
})();

// ---------- Logout ----------
const logoutBtn = document.getElementById("logout");

if (logoutBtn) {
  logoutBtn.addEventListener("click", async function () {
    logoutBtn.disabled = true;

    try {
      await logoutUser();
      window.location.href = "index.html";
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Unable to log out. Please try again.");
      logoutBtn.disabled = false;
    }
  });
}

