// FARMBRIDGE - firebase-sync.js
// Load on EVERY page, after firebase-config.js and BEFORE auth.js.
// - Firebase Authentication (phone number + password)
// - Firestore: listings, demands, enquiries, reports and profiles shared live between phones.
// Your existing code still uses localStorage; this file copies it to Firestore,
// so no other file needs rewriting. Without a config the app runs offline as before.
(function () {
  if (typeof firebase === "undefined" || !FIREBASE_CONFIG || FIREBASE_CONFIG.apiKey.indexOf("PASTE") === 0) {
    console.info("FarmBridge: Firebase not configured - running in offline demo mode.");
    window.FB_CLOUD = false;
    return;
  }
  firebase.initializeApp(FIREBASE_CONFIG);
  const auth = firebase.auth();
  const db = firebase.firestore();
  db.enablePersistence({ synchronizeTabs: true }).catch(function () {});
  window.FB_CLOUD = true;
  window.fbAuth = auth;
  window.fbDb = db;

  const SYNCED = { fb_listings: "listings", fb_demands: "demands", fb_enquiries: "enquiries", fb_reports: "reports" };
  const nativeSet = Storage.prototype.setItem;
  const nativeGet = Storage.prototype.getItem;
  let applyingRemote = false;

  function parse(v) { try { return JSON.parse(v) || []; } catch (e) { return []; } }
  function byId(list) { const m = {}; list.forEach(function (x) { if (x && x.id) m[x.id] = x; }); return m; }

  // 1. push local changes up
  Storage.prototype.setItem = function (key, value) {
    const oldValue = nativeGet.call(this, key);
    nativeSet.call(this, key, value);
    if (this !== window.localStorage || applyingRemote || !SYNCED[key] || !auth.currentUser) return;
    const before = byId(parse(oldValue)), after = byId(parse(value));
    const batch = db.batch(), col = db.collection(SYNCED[key]);
    let n = 0;
    Object.keys(after).forEach(function (id) {
      if (JSON.stringify(before[id]) !== JSON.stringify(after[id])) { batch.set(col.doc(id), after[id]); n++; }
    });
    Object.keys(before).forEach(function (id) { if (!after[id]) { batch.delete(col.doc(id)); n++; } });
    if (n) batch.commit().catch(function (e) { console.warn("FarmBridge sync failed:", e.message); badge(false); });
  };

  // 2. pull everyone's changes down in real time
  const firstSync = {};
  function listen() {
    Object.keys(SYNCED).forEach(function (key) {
      db.collection(SYNCED[key]).onSnapshot(function (snap) {
        const remote = snap.docs.map(function (d) { return d.data(); });
        const local = nativeGet.call(localStorage, key);
        const sameAsLocal = JSON.stringify(byId(remote)) === JSON.stringify(byId(parse(local)));
        applyingRemote = true;
        nativeSet.call(localStorage, key, JSON.stringify(remote));
        applyingRemote = false;
        badge(true);
        if (!sameAsLocal) refreshPage(!firstSync[key]);
        firstSync[key] = true;
      }, function (e) { console.warn(e.message); badge(false); });
    });
    // profiles (passwords are never stored in the cloud)
    db.collection("users").onSnapshot(function (snap) {
      const local = parse(nativeGet.call(localStorage, "fb_users"));
      const pw = {}; local.forEach(function (u) { pw[u.phone] = u.password; });
      const merged = snap.docs.map(function (d) { const u = d.data(); u.password = pw[u.phone] || ""; return u; });
      nativeSet.call(localStorage, "fb_users", JSON.stringify(merged));
    });
  }

  function refreshPage(isFirst) {
    if (document.querySelector("form:focus-within, dialog[open]")) return; // don't interrupt typing
    if (isFirst) {
      const k = "fb_reloaded_" + location.pathname;
      if (sessionStorage.getItem(k)) return;
      sessionStorage.setItem(k, "1");
      location.reload();
    } else if (typeof fbToast === "function") {
      fbToast("🔄 New updates — refreshing…");
      setTimeout(function () { location.reload(); }, 1200);
    }
  }

  function badge(on) {
    let el = document.querySelector(".fb-cloud");
    if (!el && document.body) { el = document.createElement("div"); document.body.appendChild(el); }
    if (!el) return;
    el.className = "fb-cloud " + (on ? "on" : "off");
    el.textContent = on ? "☁️ Synced" : "⚠️ Offline";
  }

  // 3. Authentication (phone + password)
  function emailFor(phone) { return String(phone).trim() + "@farmbridge.app"; }

  document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");
    function msg(text) {
      const box = document.getElementById("message");
      if (box) { box.textContent = text; box.hidden = false; } else alert(text);
    }
    function friendly(e) {
      const c = e.code || "";
      if (c.indexOf("email-already-in-use") >= 0) return "This phone number is already registered. Please log in.";
      if (c.indexOf("invalid") >= 0 || c.indexOf("wrong-password") >= 0 || c.indexOf("user-not-found") >= 0) return "Phone number or password is incorrect.";
      if (c.indexOf("network") >= 0) return "No internet connection. Please try again.";
      return e.message;
    }

    if (signupForm) signupForm.addEventListener("submit", function (ev) {
      if (signupForm.dataset.cloudOk) return;
      ev.preventDefault(); ev.stopImmediatePropagation();
      const phone = document.getElementById("signup-phone").value.trim();
      const pass = document.getElementById("signup-password").value;
      if (!/^[0-9]{10}$/.test(phone) || pass.length < 6) { return pass2(); }
      auth.createUserWithEmailAndPassword(emailFor(phone), pass).then(function (cred) {
        return db.collection("users").doc(phone).set({
          id: cred.user.uid, uid: cred.user.uid, phone: phone,
          name: document.getElementById("signup-name").value.trim(),
          area: document.getElementById("signup-area").value.trim(),
          role: document.querySelector('input[name="role"]:checked').value,
          createdAt: new Date().toISOString()
        });
      }).then(pass2).catch(function (e) { msg(friendly(e)); });
      function pass2() { signupForm.dataset.cloudOk = "1"; signupForm.requestSubmit(); delete signupForm.dataset.cloudOk; }
    }, true);

    if (loginForm) loginForm.addEventListener("submit", function (ev) {
      if (loginForm.dataset.cloudOk) return;
      ev.preventDefault(); ev.stopImmediatePropagation();
      const phone = document.getElementById("login-phone").value.trim();
      const pass = document.getElementById("login-password").value;
      auth.signInWithEmailAndPassword(emailFor(phone), pass).then(function () {
        return db.collection("users").doc(phone).get();
      }).then(function (doc) {
        const users = parse(nativeGet.call(localStorage, "fb_users")).filter(function (u) { return u.phone !== phone; });
        const p = doc.exists ? doc.data() : { phone: phone, name: phone, area: "", role: "farmer" };
        p.password = pass;
        users.push(p);
        nativeSet.call(localStorage, "fb_users", JSON.stringify(users));
        loginForm.dataset.cloudOk = "1"; loginForm.requestSubmit(); delete loginForm.dataset.cloudOk;
      }).catch(function (e) { msg(friendly(e)); });
    }, true);

    const logout = document.getElementById("logout");
    if (logout) logout.addEventListener("click", function () { auth.signOut(); }, true);
  });

  auth.onAuthStateChanged(function (user) {
    if (user) listen();
    else if (document.body) badge(false);
  });
})();
