// =========================================================
// FARMBRIDGE - firebase-sync.js
// Initializes Firebase and exposes shared Firebase services.
// Firebase SDK version: 10.12.2 (Compat)
// =========================================================

(function () {
  "use strict";

  if (!window.firebase) {
    console.error("Firebase SDK has not loaded.");
    return;
  }

  if (!window.FIREBASE_CONFIG) {
    console.error("Firebase configuration is missing.");
    return;
  }

  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(window.FIREBASE_CONFIG);
    }

    window.fbAuth = firebase.auth();
    window.fbDb = firebase.firestore();
    window.FB_CLOUD = true;

    console.log("FarmBridge Firebase initialized.");
  } catch (error) {
    window.FB_CLOUD = false;
    console.error("Firebase initialization failed:", error);
  }
})();

