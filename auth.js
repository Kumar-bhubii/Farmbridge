// =========================================================
// FARMBRIDGE - auth.js
// Handles accounts and login sessions.
// For now data is stored in the browser (localStorage).
// In Step 6 we will replace the inside of these functions
// with Firebase Authentication. The rest of the app will not change.
// =========================================================

const FB_USERS_KEY = "fb_users";      // list of all accounts
const FB_SESSION_KEY = "fb_session";  // phone number of logged-in user

// ---------- helpers ----------
function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(FB_USERS_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(FB_USERS_KEY, JSON.stringify(users));
}

// ---------- sign up ----------
// Returns { ok: true, user } or { ok: false, error: "message" }
function signupUser(data) {
  const name = data.name.trim();
  const phone = data.phone.trim();
  const area = data.area.trim();

  if (name.length < 2) return { ok: false, error: "Please enter your full name." };
  if (!/^[0-9]{10}$/.test(phone)) return { ok: false, error: "Phone number must be exactly 10 digits." };
  if (area.length < 2) return { ok: false, error: "Please enter your village / town." };
  if (data.password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
  if (data.role !== "farmer" && data.role !== "buyer") return { ok: false, error: "Please choose Farmer or Buyer." };

  const users = getUsers();
  if (users.some(function (u) { return u.phone === phone; })) {
    return { ok: false, error: "This phone number is already registered. Please log in." };
  }

  const user = {
    id: "u_" + Date.now(),
    name: name,
    phone: phone,
    area: area,
    role: data.role,
    password: data.password, // NOTE: prototype only. Firebase will secure this later.
    createdAt: new Date().toISOString()
  };

  users.push(user);
  saveUsers(users);
  localStorage.setItem(FB_SESSION_KEY, user.phone);
  return { ok: true, user: user };
}

// ---------- log in ----------
function loginUser(phone, password) {
  const user = getUsers().find(function (u) {
    return u.phone === phone.trim() && u.password === password;
  });

  if (!user) return { ok: false, error: "Wrong phone number or password." };

  localStorage.setItem(FB_SESSION_KEY, user.phone);
  return { ok: true, user: user };
}

// ---------- who is logged in? ----------
function getCurrentUser() {
  const phone = localStorage.getItem(FB_SESSION_KEY);
  if (!phone) return null;
  return getUsers().find(function (u) { return u.phone === phone; }) || null;
}

// ---------- log out ----------
function logoutUser() {
  localStorage.removeItem(FB_SESSION_KEY);
}

// ---------- send user to the right dashboard ----------
function dashboardFor(user) {
  return user.role === "farmer" ? "farmer.html" : "buyer.html";
}