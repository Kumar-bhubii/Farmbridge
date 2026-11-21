// FARMBRIDGE - voice.js (load after extras.js)
// Adds a 🎤 button to every text box. Listens in the chosen language:
// Bengali (bn-IN), Hindi (hi-IN), English (en-IN). Free, built into Chrome/Edge/Android.
(function () {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) return;

  const LANG_CODES = { en: "en-IN", bn: "bn-IN", hi: "hi-IN" };
  const BN_DIGITS = "০১২৩৪৫৬৭৮৯", HI_DIGITS = "०१२३४५६७८९";
  let active = null;

  function toLatinDigits(text) {
    return text.replace(/[০-৯]/g, function (d) { return BN_DIGITS.indexOf(d); })
               .replace(/[०-९]/g, function (d) { return HI_DIGITS.indexOf(d); });
  }
  function wantsNumber(input) {
    return input.inputMode === "numeric" || input.type === "tel" || input.type === "number";
  }

  function attach(input) {
    if (input.dataset.voice || input.type === "password" || input.type === "date" || input.readOnly) return;
    input.dataset.voice = "1";
    const wrap = document.createElement("span");
    wrap.className = "fb-voice-wrap";
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "fb-mic";
    btn.title = "Speak";
    btn.setAttribute("aria-label", "Speak instead of typing");
    btn.textContent = "🎤";
    wrap.appendChild(btn);
    btn.addEventListener("click", function () { listen(input, btn); });
  }

  function listen(input, btn) {
    if (active) { active.stop(); return; }
    const rec = new Recognition();
    rec.lang = LANG_CODES[localStorage.getItem("fb_language") || "en"] || "en-IN";
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    const before = input.value ? input.value + " " : "";
    active = rec;
    btn.classList.add("listening");

    rec.onresult = function (e) {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      if (wantsNumber(input)) text = toLatinDigits(text).replace(/[^0-9]/g, "");
      input.value = wantsNumber(input) ? text : before + text;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    rec.onerror = function (e) {
      if (typeof fbToast === "function") {
        fbToast(e.error === "not-allowed" ? "Please allow microphone access 🎤" : "Didn't catch that — try again");
      }
    };
    rec.onend = function () {
      active = null;
      btn.classList.remove("listening");
      input.dispatchEvent(new Event("change", { bubbles: true }));
    };
    rec.start();
    if (typeof fbToast === "function") fbToast("Listening… 🎙️");
  }

  function scan(root) {
    (root.querySelectorAll ? root : document)
      .querySelectorAll('input[type="text"], input[type="tel"], input[type="search"], input:not([type]), textarea')
      .forEach(attach);
  }
  scan(document);
  new MutationObserver(function (list) {
    list.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) scan(n); }); });
  }).observe(document.body, { childList: true, subtree: true });
})();
