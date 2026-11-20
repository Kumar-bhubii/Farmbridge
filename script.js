// =========================================================
// FARMBRIDGE - main JavaScript
// =========================================================

// ---------- 0. Tell CSS that JavaScript is working ----------
// Scroll-reveal sections are only hidden once this class exists.
document.documentElement.classList.add("js-ready");

// Very old browsers without IntersectionObserver: just show everything
if (!("IntersectionObserver" in window)) {
  document.querySelectorAll(".reveal").forEach(function (el) {
    el.classList.add("visible");
  });
  document.querySelectorAll(".fill").forEach(function (bar) {
    bar.style.width = bar.dataset.width;
  });
}

// ---------- 1. Navbar changes colour after you scroll ----------
const navbar = document.getElementById("navbar");

window.addEventListener("scroll", function () {
  if (window.scrollY > 40) {
    navbar.classList.add("scrolled");
  } else {
    navbar.classList.remove("scrolled");
  }
});

// ---------- 2. Scroll reveal animation ----------
// IntersectionObserver tells us when an element enters the screen.
// When it does, we add the class "visible" and CSS does the animation.
const revealObserver = new IntersectionObserver(
  function (entries) {
    entries.forEach(function (entry, index) {
      if (entry.isIntersecting) {
        // small stagger so cards in a row appear one after another
        setTimeout(function () {
          entry.target.classList.add("visible");
        }, index * 90);

        // if this element contains animated bars, fill them
        entry.target.querySelectorAll(".fill").forEach(function (bar) {
          bar.style.width = bar.dataset.width;
        });

        revealObserver.unobserve(entry.target); // animate only once
      }
    });
  },
  { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
);

document.querySelectorAll(".reveal").forEach(function (el) {
  revealObserver.observe(el);
});

// ---------- 3. Counting numbers (0 -> target) ----------
function runCounter(el) {
  const target = Number(el.dataset.target);
  const duration = 1400; // milliseconds
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    el.textContent = Math.floor(progress * target);
    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      el.textContent = target;
    }
  }
  requestAnimationFrame(tick);
}

const counterObserver = new IntersectionObserver(
  function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        runCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.6 }
);

document.querySelectorAll(".count").forEach(function (el) {
  counterObserver.observe(el);
});

// ---------- 4. Remember chosen language ----------
const languageSelect = document.getElementById("language");

if (languageSelect) {
  const saved = localStorage.getItem("fb_language");
  if (saved) {
    languageSelect.value = saved;
  }
  languageSelect.addEventListener("change", function () {
    localStorage.setItem("fb_language", languageSelect.value);
    // Real translation will be added in Step 6
  });
}