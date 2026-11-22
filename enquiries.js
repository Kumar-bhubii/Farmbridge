
// =========================================================
// FARMBRIDGE - enquiries.js
// Enquiries & orders page for both roles.
// Waits for Firebase profile loading.
// =========================================================

if (window.FB_USER_READY) {

  window.FB_USER_READY.then(function (readyUser) {

    if (!readyUser) return;

    const user = readyUser;

    const list = document.getElementById("enq-list");
    const emptyState = document.getElementById("empty-state");
    const emptyTitle = document.getElementById("empty-title");
    const emptyText = document.getElementById("empty-text");
    const tabs = document.querySelectorAll("#enq-tabs .tab");

    let filter = "active";
    const otherRole = user.role === "buyer" ? "farmer" : "buyer";

    function matchesFilter(e, which) {
      if (which === "active") return isActiveEnquiry(e);
      if (which === "completed") return e.status === "completed";
      if (which === "closed") return e.status === "declined" || e.status === "cancelled";
      return true;
    }

    function prettyTime(iso) {
      return new Date(iso).toLocaleString("en-IN", {
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
      });
    }

    function whoLabel(role) {
      return role === user.role ? "You" : (role === "buyer" ? "Buyer" : "Farmer");
    }

    // Enquiry - Discussion - Accepted - Collected - Completed
    function stepperHtml(e) {
      if (e.status === "declined" || e.status === "cancelled") {
        return '<div class="match-warn">' + ENQ_LABELS[e.status] + " — this enquiry has ended.</div>";
      }

      const current = ENQ_STEPS.indexOf(e.status);

      return '<div class="stepper">' + ENQ_STEPS.map(function (step, i) {
        const cls = i < current ? "done" : (i === current ? "current" : "");
        return '<div class="step-dot ' + cls + '">' + ENQ_LABELS[step] + "</div>";
      }).join("") + "</div>";
    }

    function cardHtml(e) {
      const info = cropInfo(e.crop);
      const iAmBuyer = user.role === "buyer";
      const otherName = iAmBuyer ? e.farmerName : e.buyerName;
      const otherPhone = iAmBuyer ? e.farmerPhone : e.buyerPhone;
      const otherLabel = iAmBuyer ? "Farmer" : "Buyer";

      // Contact details only after discussion starts
      const contactShared =
        e.status === "discussion" ||
        e.status === "accepted" ||
        e.status === "collected" ||
        e.status === "completed";

      let contact;

      if (!contactShared) {
        contact = "🔒 Contact details are shared once the discussion starts";
      } else if (isSamplePhone(otherPhone)) {
        contact = "📞 Demo contact (sample account has no real number)";
      } else {
        contact = "📞 " + escapeHtml(otherPhone);
      }

      const recipient = user.role !== e.initiatorRole;
      const yourTurn = recipient && (e.status === "enquiry" || e.status === "discussion");

      // My available actions
      const myActions = enquiryActions(e, user.role);

      const buttons = myActions.map(function (a) {
        return '<button class="' + (a.danger ? "btn-delete" : "btn btn-solid") + ' enq-act" type="button" ' +
          'data-id="' + e.id + '" data-to="' + a.to + '">' + a.label + "</button>";
      }).join("");

      // Demo helper
      let demoButton = "";

      if (isSamplePhone(otherPhone)) {
        const hasMyMove = myActions.some(function (a) {
          return !a.danger;
        });

        const theirMoves = enquiryActions(e, otherRole).filter(function (a) {
          return !a.danger;
        });

        if (!hasMyMove && theirMoves.length) {
          demoButton =
            '<button class="btn-small-dark enq-demo" type="button" data-id="' + e.id +
            '" data-to="' + theirMoves[0].to + '">🧪 Demo: simulate ' +
            escapeHtml(otherName) + " (" + theirMoves[0].label + ")</button>";
        }
      }

      const timeline = e.history.map(function (h) {
        return "<li><b>" + ENQ_LABELS[h.status] + "</b> • " +
          whoLabel(h.by) + " • " + prettyTime(h.at) + "</li>";
      }).join("");

      return '<article class="enq-card">' +
        '<div class="enq-top">' +
          "<h3>" + info.emoji + " " + escapeHtml(info.name) + " • " + e.quantityKg + " kg</h3>" +
          '<span class="badge ' + e.status + '">' + ENQ_LABELS[e.status] + "</span>" +
        "</div>" +
        (yourTurn ? '<span class="turn-tag">⏳ Waiting for your reply</span>' : "") +
        '<ul class="listing-meta">' +
          "<li>" + (iAmBuyer ? "👩‍🌾" : "🛒") + " " + otherLabel +
          ": <b>" + escapeHtml(otherName) + "</b>" +
          (isSamplePhone(otherPhone) ? ' <span class="tag-sample">Sample</span>' : "") + "</li>" +
          "<li>📍 " + escapeHtml(e.area) + " • 📅 Harvest " + prettyDate(e.harvestDate) + "</li>" +
          "<li>" + contact + "</li>" +
          (e.message ? "<li>💬 “" + escapeHtml(e.message) + "”</li>" : "") +
          "<li>" + (e.initiatorRole === user.role ? "You started this" : "Started by the " + otherLabel.toLowerCase()) +
          (e.demandId ? " (response to a requirement)" : "") + "</li>" +
        "</ul>" +
        stepperHtml(e) +
        ((buttons || demoButton) ? '<div class="enq-actions">' + buttons + demoButton + "</div>" : "") +
        '<details class="enq-history"><summary>History</summary><ul>' + timeline + "</ul></details>" +
      "</article>";
    }

    function render() {
      const all = getEnquiriesForUser(user.phone);

      tabs.forEach(function (tab) {
        const which = tab.dataset.filter;
        const label = which.charAt(0).toUpperCase() + which.slice(1);

        tab.textContent = label + " (" +
          all.filter(function (e) {
            return matchesFilter(e, which);
          }).length + ")";

        tab.classList.toggle("active", which === filter);
      });

      const shown = all.filter(function (e) {
        return matchesFilter(e, filter);
      });

      list.innerHTML = shown.map(cardHtml).join("");

      emptyState.hidden = shown.length > 0;

      if (all.length === 0) {
        emptyTitle.textContent = "No enquiries yet";

        emptyText.textContent = user.role === "buyer"
          ? 'Open "Browse supply" and click Enquire on a lot. You can also load sample data below.'
          : 'Open the demand board and click Respond on a requirement. You can also load sample data below.';
      } else {
        emptyTitle.textContent = "Nothing in this tab";
        emptyText.textContent = "Try another tab above.";
      }
    }

    // Filter tabs
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        filter = tab.dataset.filter;
        render();
      });
    });

    // Enquiry and demo actions
 
list.addEventListener("click", async function (event) {
  const act = event.target.closest(".enq-act");
  const demo = event.target.closest(".enq-demo");

  if (act) {
    const to = act.dataset.to;

    if (
      (to === "declined" || to === "cancelled") &&
      !confirm("Are you sure? This ends the enquiry.")
    ) {
      return;
    }

    const success = await setEnquiryStatus(
      act.dataset.id,
      to,
      user.role
    );

    if (!success) {
      alert("Could not update the enquiry. Please try again.");
    }

    render();

  } else if (demo) {
    await setEnquiryStatus(
      demo.dataset.id,
      demo.dataset.to,
      otherRole
    );

    render();
  }
});

    render();
  });
}

