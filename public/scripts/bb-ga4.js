(function () {
  var script = document.currentScript;
  if (!script) return;
  var ga4Id = script.getAttribute('data-ga4-id');
  if (!ga4Id || !/^G-[A-Z0-9]+$/i.test(ga4Id) || ga4Id.indexOf('G-XXXX') === 0) return;

  var loaded = false;

  function loadGa4() {
    if (loaded) return;
    if (!window.__privacySettings || !window.__privacySettings.enableAnalytics) return;
    loaded = true;

    var s = document.createElement('script');
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ga4Id);
    s.async = true;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', ga4Id, {
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
  }

  window.__loadGa4IfConsented = loadGa4;
  loadGa4();
  document.addEventListener('privacy-settings-updated', loadGa4);
})();
