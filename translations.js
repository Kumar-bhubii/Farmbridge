
/* =========================================================
   FARMBRIDGE - translations.js
   English, Bengali and Hindi translations.
   ========================================================= */

(function () {
  "use strict";

  const translations = {
    en: {
      nav_gap: "The Gap",
      nav_how: "How it works",
      nav_agg: "Small-lot magic",
      nav_features: "Features",
      get_started: "Get started",
      logout: "Log out",
      back: "← Back to dashboard",
      demands: "Demands",
      lots: "Crop lots",
      tools: "Tools",
      users: "Users",
      admin_title: "Admin dashboard",
      admin_sub: "Manage FarmBridge activity",
      insights_title: "Demand insights",
      insights_sub: "Trends calculated from activity on FarmBridge.",
      map_title: "FarmBridge map",
      map_sub: "Explore local crop supply and demand.",
      prices_title: "Market prices",
      prices_sub: "View dated reference prices."
    },

    bn: {
      nav_gap: "সমস্যা",
      nav_how: "কীভাবে কাজ করে",
      nav_agg: "ছোট পরিমাণের সুবিধা",
      nav_features: "বৈশিষ্ট্য",
      get_started: "শুরু করুন",
      logout: "লগ আউট",
      back: "← ড্যাশবোর্ডে ফিরে যান",
      demands: "চাহিদা",
      lots: "ফসলের তালিকা",
      tools: "সরঞ্জাম",
      users: "ব্যবহারকারী",
      admin_title: "অ্যাডমিন ড্যাশবোর্ড",
      admin_sub: "FarmBridge কার্যক্রম পরিচালনা করুন",
      insights_title: "চাহিদার বিশ্লেষণ",
      insights_sub: "FarmBridge-এর কার্যকলাপ থেকে তৈরি প্রবণতা।",
      map_title: "FarmBridge মানচিত্র",
      map_sub: "স্থানীয় ফসলের সরবরাহ ও চাহিদা দেখুন।",
      prices_title: "বাজারদর",
      prices_sub: "তারিখসহ রেফারেন্স মূল্য দেখুন।"
    },

    hi: {
      nav_gap: "समस्या",
      nav_how: "यह कैसे काम करता है",
      nav_agg: "छोटी मात्रा का लाभ",
      nav_features: "विशेषताएँ",
      get_started: "शुरू करें",
      logout: "लॉग आउट",
      back: "← डैशबोर्ड पर वापस जाएँ",
      demands: "माँग",
      lots: "फसल की सूची",
      tools: "टूल्स",
      users: "उपयोगकर्ता",
      admin_title: "एडमिन डैशबोर्ड",
      admin_sub: "FarmBridge गतिविधियों का प्रबंधन करें",
      insights_title: "माँग का विश्लेषण",
      insights_sub: "FarmBridge गतिविधियों से तैयार रुझान।",
      map_title: "FarmBridge नक्शा",
      map_sub: "स्थानीय फसल की आपूर्ति और माँग देखें।",
      prices_title: "बाज़ार भाव",
      prices_sub: "तारीख सहित संदर्भ मूल्य देखें।"
    }
  };

  function applyTranslations(language) {
    const selected = translations[language] || translations.en;

    document.documentElement.lang = language;

    document.querySelectorAll("[data-i18n]").forEach(function (element) {
      const key = element.dataset.i18n;

      if (selected[key]) {
        element.textContent = selected[key];
      }
    });
  }

  function setLanguage(language) {
    if (!translations[language]) language = "en";

    localStorage.setItem("fb_language", language);
    applyTranslations(language);

    const selector = document.getElementById("language");
    if (selector) selector.value = language;
  }

  window.FB_TRANSLATIONS = translations;
  window.fbSetLanguage = setLanguage;

  document.addEventListener("DOMContentLoaded", function () {
    const selector = document.getElementById("language");
    const savedLanguage = localStorage.getItem("fb_language") || "en";

    applyTranslations(savedLanguage);

    if (selector) {
      selector.value = savedLanguage;

      selector.addEventListener("change", function () {
        setLanguage(selector.value);
      });
    }
  });
})();
