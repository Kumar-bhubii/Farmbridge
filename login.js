// =========================================================
// FARMBRIDGE - login.js  (controls login.html)
// =========================================================

const tabLogin = document.getElementById("tab-login");
const tabSignup = document.getElementById("tab-signup");
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const messageBox = document.getElementById("message");

// If already logged in, skip this page
const existingUser = getCurrentUser();
if (existingUser) {
  window.location.href = dashboardFor(existingUser);
}

// ---------- show a message (red for errors) ----------
function showMessage(text) {
  messageBox.textContent = text;
  messageBox.hidden = false;
}

function hideMessage() {
  messageBox.hidden = true;
}

// ---------- switch between Log in / Sign up ----------
function showTab(which) {
  hideMessage();
  const isLogin = which === "login";
  loginForm.hidden = !isLogin;
  signupForm.hidden = isLogin;
  tabLogin.classList.toggle("active", isLogin);
  tabSignup.classList.toggle("active", !isLogin);
}

tabLogin.addEventListener("click", function () { showTab("login"); });
tabSignup.addEventListener("click", function () { showTab("signup"); });

// ---------- read ?role=farmer or ?role=buyer from the URL ----------
// (the homepage buttons send people here with this)
const params = new URLSearchParams(window.location.search);
const roleFromUrl = params.get("role");
if (roleFromUrl === "farmer" || roleFromUrl === "buyer") {
  showTab("signup");
  document.querySelector('input[name="role"][value="' + roleFromUrl + '"]').checked = true;
}

// ---------- LOGIN submit ----------
loginForm.addEventListener("submit", function (event) {
  event.preventDefault(); // stop the page from reloading
  const result = loginUser(
    document.getElementById("login-phone").value,
    document.getElementById("login-password").value
  );

  if (result.ok) {
    window.location.href = dashboardFor(result.user);
  } else {
    showMessage(result.error);
  }
});

// ---------- SIGNUP submit ----------
signupForm.addEventListener("submit", function (event) {
  event.preventDefault();
  const result = signupUser({
    name: document.getElementById("signup-name").value,
    phone: document.getElementById("signup-phone").value,
    area: document.getElementById("signup-area").value,
    password: document.getElementById("signup-password").value,
    role: document.querySelector('input[name="role"]:checked').value
  });

  if (result.ok) {
    window.location.href = dashboardFor(result.user);
  } else {
    showMessage(result.error);
  }
});