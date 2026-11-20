// FARMBRIDGE - admin.js  (moderation desk, prototype PIN 2026)
const ADMIN_PIN = "2026";
const ADMIN_KEY = "fb_admin_ok";
let currentTab = "reports";
const gate = document.getElementById("gate");
const panel = document.getElementById("admin");
const lockBtn = document.getElementById("admin-lock");

function unlock() { gate.hidden = true; panel.hidden = false; lockBtn.hidden = false; render(); }
if (sessionStorage.getItem(ADMIN_KEY) === "1") unlock();

document.getElementById("pin-form").addEventListener("submit", function (e) {
  e.preventDefault();
  if (document.getElementById("pin").value === ADMIN_PIN) { sessionStorage.setItem(ADMIN_KEY, "1"); unlock(); fbToast("Welcome, moderator 🛡️"); }
  else fbToast("Wrong PIN");
});
lockBtn.addEventListener("click", function () { sessionStorage.removeItem(ADMIN_KEY); location.reload(); });

document.querySelectorAll("[data-tab]").forEach(function (b) {
  b.addEventListener("click", function () {
    document.querySelectorAll("[data-tab]").forEach(function (x) { x.classList.remove("active"); });
    b.classList.add("active"); currentTab = b.dataset.tab; render();
  });
});

function row(main, sub, actions) {
  return '<div class="admin-row"><div><b>' + main + "</b><br><small>" + sub + '</small></div><div class="actions">' + actions + "</div></div>";
}
function empty(text) { return '<div class="empty-state"><span>✨</span><h3>' + text + "</h3></div>"; }

function render() {
  const reports = getReports(), lots = getListings(), demands = getDemands(), users = getUsers();
  document.getElementById("a-users").textContent = users.length;
  document.getElementById("a-lots").textContent = lots.length;
  document.getElementById("a-demands").textContent = demands.length;
  document.getElementById("a-reports").textContent = reports.filter(function (r) { return r.status === "open"; }).length;
  let html = "";
  if (currentTab === "reports") {
    html = reports.slice().reverse().map(function (r) {
      return row((r.status === "open" ? "🔴 " : "✅ ") + escapeHtml(r.reason),
        escapeHtml(r.details || "No details") + " • " + escapeHtml(r.by) + " • " + escapeHtml(r.page) + " • " + prettyDate(r.createdAt.slice(0, 10)),
        r.status === "open" ? '<button class="btn-ok" data-act="resolve" data-id="' + r.id + '">Mark resolved</button>' : "");
    }).join("") || empty("No reports — all calm in the fields.");
  }
  if (currentTab === "lots") {
    html = lots.map(function (l) {
      const c = cropInfo(l.crop);
      return row(c.emoji + " " + c.name + " • " + l.quantityKg + " kg <span class='badge'>" + l.status + "</span>",
        escapeHtml(l.farmerName) + " • " + escapeHtml(l.area) + " • harvest " + prettyDate(l.harvestDate),
        (l.status !== "removed" ? '<button class="btn-ok" data-act="hide-lot" data-id="' + l.id + '">Hide</button>'
                                : '<button class="btn-ok" data-act="restore-lot" data-id="' + l.id + '">Restore</button>') +
        '<button class="btn-danger" data-act="del-lot" data-id="' + l.id + '">Delete</button>');
    }).join("") || empty("No crop lots yet.");
  }
  if (currentTab === "demands") {
    html = demands.map(function (d) {
      const c = cropInfo(d.crop);
      return row(c.emoji + " " + c.name + " • " + d.quantityKg + " kg <span class='badge'>" + d.status + "</span>",
        escapeHtml(d.buyerName) + " • " + escapeHtml(d.area) + " • by " + prettyDate(d.requiredDate),
        (d.status === "open" ? '<button class="btn-ok" data-act="close-dem" data-id="' + d.id + '">Close</button>' : "") +
        '<button class="btn-danger" data-act="del-dem" data-id="' + d.id + '">Delete</button>');
    }).join("") || empty("No buyer requirements yet.");
  }
  if (currentTab === "users") {
    html = users.map(function (u) {
      return row((u.role === "farmer" ? "🌾 " : "🛒 ") + escapeHtml(u.name),
        u.role + " • " + escapeHtml(u.area) + " • ******" + u.phone.slice(-4) + " • joined " + prettyDate(u.createdAt.slice(0, 10)), "");
    }).join("") || empty("No registered users yet.");
  }
  document.getElementById("admin-list").innerHTML = html;
}

document.getElementById("admin-list").addEventListener("click", function (e) {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const id = b.dataset.id, act = b.dataset.act;
  if (act === "resolve") { const list = getReports(); const r = list.find(function (x) { return x.id === id; }); if (r) { r.status = "resolved"; saveReports(list); } }
  if (act === "hide-lot") updateListingStatus(id, "removed");
  if (act === "restore-lot") updateListingStatus(id, "available");
  if (act === "del-lot" && confirm("Delete this crop lot permanently?")) deleteListing(id);
  if (act === "close-dem") updateDemandStatus(id, "closed");
  if (act === "del-dem" && confirm("Delete this requirement permanently?")) deleteDemand(id);
  fbToast("Updated ✓");
  render();
});
