
// =========================================================
// FARMBRIDGE - login.js
// Handles login and signup using Firebase Authentication.
// =========================================================

const tabLogin = document.getElementById("tab-login");
const tabSignup = document.getElementById("tab-signup");
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const messageBox = document.getElementById("message");

// ---------- Show messages ----------

function showMessage(text) {
  messageBox.textContent = text;
  messageBox.hidden = false;
}

function hideMessage() {
  messageBox.hidden = true;
}

// ---------- Switch between tabs ----------

function showTab(which) {
  hideMessage();

  const isLogin = which === "login";

  loginForm.hidden = !isLogin;
  signupForm.hidden = isLogin;

  tabLogin.classList.toggle("active", isLogin);
  tabSignup.classList.toggle("active", !isLogin);
}

tabLogin.addEventListener("click", function () {
  showTab("login");
});

tabSignup.addEventListener("click", function () {
  showTab("signup");
});

// ---------- Check existing login ----------

async function checkExistingUser() {
  try {
    const existingUser = await getCurrentUser();

    if (existingUser) {
      window.location.href = dashboardFor(existingUser);
    }
  } catch (error) {
    console.error("Could not check existing user:", error);
  }
}

checkExistingUser();

// ---------- Read role from URL ----------

const params = new URLSearchParams(window.location.search);
const roleFromUrl = params.get("role");

if (roleFromUrl === "farmer" || roleFromUrl === "buyer") {
  showTab("signup");

  const roleInput = document.querySelector(
    'input[name="role"][value="' + roleFromUrl + '"]'
  );

  if (roleInput) {
    roleInput.checked = true;
  }
}

// ---------- LOGIN submit ----------

loginForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  hideMessage();

  const submitButton = loginForm.querySelector(
    'button[type="submit"]'
  );

  if (submitButton) submitButton.disabled = true;

  try {
    const user = await loginUser(
      document.getElementById("login-phone").value.trim(),
      document.getElementById("login-password").value
    );

    window.location.href = dashboardFor(user);

  } catch (error) {
    console.error("Login failed:", error);
    showMessage(error.message || "Login failed. Please try again.");

  } finally {
    if (submitButton) submitButton.disabled = false;
  }
});

// ---------- SIGNUP submit ----------

signupForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  hideMessage();

  const submitButton = signupForm.querySelector(
    'button[type="submit"]'
  );

  if (submitButton) submitButton.disabled = true;

  try {
    const selectedRole = document.querySelector(
      'input[name="role"]:checked'
    );

    if (!selectedRole) {
      throw new Error("Please select Farmer or Buyer.");
    }

    const user = await signupUser({
      name: document.getElementById("signup-name").value,
      phone: document.getElementById("signup-phone").value,
      area: document.getElementById("signup-area").value,
      password: document.getElementById("signup-password").value,
      role: selectedRole.value
    });

    window.location.href = dashboardFor(user);

  } catch (error) {
    console.error("Signup failed:", error);
    showMessage(error.message || "Signup failed. Please try again.");

  } finally {
    if (submitButton) submitButton.disabled = false;
  }
});
