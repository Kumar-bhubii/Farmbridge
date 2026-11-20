// =========================================================
// FARMBRIDGE - dashboard.js
// Used by farmer.html and buyer.html.
// 1. Blocks people who are not logged in
// 2. Blocks a buyer from opening the farmer page (and vice versa)
// 3. Fills in the user's name and handles logout
// =========================================================

const user = getCurrentUser();
const pageRole = document.body.dataset.role; // "farmer" or "buyer"

if (!user) {
  // not logged in -> go to login
  window.location.href = "login.html";
} else if (pageRole !== "any" && user.role !== pageRole) {
  // wrong dashboard -> send to the correct one
  window.location.href = dashboardFor(user);
} else {
  // fill in every element marked data-user="name" / "area" / "phone"
  document.querySelectorAll("[data-user]").forEach(function (el) {
    el.textContent = user[el.dataset.user];
  });

  // avatar emoji and "back to dashboard" links adapt to the role
  document.querySelectorAll("[data-avatar]").forEach(function (el) {
    el.textContent = user.role === "farmer" ? "🌾" : "🛒";
  });
  document.querySelectorAll("[data-back]").forEach(function (el) {
    el.href = dashboardFor(user);
  });

  // first name for greeting
  document.querySelectorAll("[data-first-name]").forEach(function (el) {
    el.textContent = user.name.split(" ")[0];
  });
}

// ---------- logout ----------
const logoutBtn = document.getElementById("logout");
if (logoutBtn) {
  logoutBtn.addEventListener("click", function () {
    logoutUser();
    window.location.href = "index.html";
  });
}