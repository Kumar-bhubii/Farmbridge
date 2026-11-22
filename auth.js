
// =========================================================
// FARMBRIDGE - auth.js
// Firebase Authentication and user profiles.
// Waits for Firebase authentication to initialize.
// =========================================================

const FB_SESSION_KEY = "fb_session";

let FB_AUTH_READY_PROMISE = null;

// Wait until Firebase restores the saved login session.
function waitForFirebaseAuthReady() {
  if (!window.fbAuth) {
    return Promise.reject(
      new Error("Firebase Authentication is unavailable.")
    );
  }

  if (!FB_AUTH_READY_PROMISE) {
    FB_AUTH_READY_PROMISE = new Promise(function (resolve, reject) {
      let unsubscribe = function () {};

      unsubscribe = window.fbAuth.onAuthStateChanged(
        function (user) {
          unsubscribe();
          resolve(user);
        },
        function (error) {
          unsubscribe();
          reject(error);
        }
      );
    });
  }

  return FB_AUTH_READY_PROMISE;
}

// Convert phone number into a Firebase-compatible email.
// This is email/password authentication, NOT SMS verification.
function emailFor(phone) {
  const cleanPhone = String(phone).replace(/\D/g, "");

  if (cleanPhone.length < 10) {
    throw new Error("Please enter a valid phone number.");
  }

  return cleanPhone + "@farmbridge.app";
}

// Get the current Firebase user.
function getFirebaseUser() {
  return window.fbAuth ? window.fbAuth.currentUser : null;
}

// Get a user's profile from Firestore.
async function getUserProfile(uid) {
  if (!window.fbDb) {
    throw new Error("Firebase database is unavailable.");
  }

  const doc = await window.fbDb.collection("users").doc(uid).get();

  return doc.exists ? { uid, ...doc.data() } : null;
}

// Register a new user.
async function signupUser(data) {
  await waitForFirebaseAuthReady();

  const { name, phone, area, password, role } = data;

  if (!name || !phone || !area || !password) {
    throw new Error("Please fill in all required fields.");
  }

  if (password.length < 6) {
    throw new Error("Password must contain at least 6 characters.");
  }

  if (!["farmer", "buyer"].includes(role)) {
    throw new Error("Please select a valid account type.");
  }

  const email = emailFor(phone);

  const credential = await window.fbAuth.createUserWithEmailAndPassword(
    email,
    password
  );

  const profile = {
    name: name.trim(),
    phone: String(phone).replace(/\D/g, ""),
    area: area.trim(),
    role,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    await window.fbDb.collection("users")
      .doc(credential.user.uid)
      .set(profile);
  } catch (error) {
    try {
      await credential.user.delete();
    } catch (deleteError) {
      console.error("Account cleanup failed:", deleteError);
    }

    throw error;
  }

  return {
    uid: credential.user.uid,
    ...profile
  };
}

// Login an existing user.
async function loginUser(phone, password) {
  await waitForFirebaseAuthReady();

  const email = emailFor(phone);

  const credential = await window.fbAuth.signInWithEmailAndPassword(
    email,
    password
  );

  const profile = await getUserProfile(credential.user.uid);

  if (!profile) {
    await window.fbAuth.signOut();
    throw new Error("Your account profile was not found.");
  }

  return profile;
}

// Get the current user's profile.
async function getCurrentUser() {
  await waitForFirebaseAuthReady();

  const firebaseUser = getFirebaseUser();

  if (!firebaseUser) {
    return null;
  }

  return await getUserProfile(firebaseUser.uid);
}

// Logout.
async function logoutUser() {
  if (window.fbAuth) {
    await window.fbAuth.signOut();
  }

  localStorage.removeItem(FB_SESSION_KEY);
}

// Select the correct dashboard.
function dashboardFor(user) {
  return user && user.role === "farmer"
    ? "farmer.html"
    : "buyer.html";
}

