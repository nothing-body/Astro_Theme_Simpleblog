(function () {
  var navbar = document.getElementById('navbar');
  var mobileToggle = document.getElementById('mobile-toggle');
  var mobileMenu = document.getElementById('mobile-menu');
  var langTrigger = document.getElementById('lang-trigger-btn');
  var langDropdown = document.getElementById('lang-dropdown');

  var lastScrollY = 0;
  var rafPending = false;

  function handleScroll() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(function () {
      var scrollY = window.scrollY;
      if (navbar) navbar.classList.toggle('nav-header--scrolled', scrollY > 10);

      if (mobileMenu && !mobileMenu.classList.contains('is-open') && navbar) {
        navbar.style.transform =
          scrollY > lastScrollY && scrollY > 80 ? 'translateY(-100%)' : 'translateY(0)';
      }

      lastScrollY = Math.max(scrollY, 0);
      rafPending = false;
    });
  }

  function closeMobileMenu() {
    if (mobileMenu) {
      mobileMenu.classList.remove('is-open');
      mobileMenu.setAttribute('aria-hidden', 'true');
    }
    if (mobileToggle) {
      mobileToggle.classList.remove('is-open');
      mobileToggle.setAttribute('aria-expanded', 'false');
    }
    document.body.style.overflow = '';
  }

  function openMobileMenu() {
    if (mobileMenu) {
      mobileMenu.classList.add('is-open');
      mobileMenu.setAttribute('aria-hidden', 'false');
    }
    if (mobileToggle) {
      mobileToggle.classList.add('is-open');
      mobileToggle.setAttribute('aria-expanded', 'true');
    }
    document.body.style.overflow = 'hidden';
  }

  function closeLangDropdown() {
    if (langDropdown) {
      langDropdown.classList.remove('is-open');
      langDropdown.setAttribute('aria-hidden', 'true');
    }
    if (langTrigger) langTrigger.setAttribute('aria-expanded', 'false');
  }

  if (mobileToggle) {
    mobileToggle.addEventListener('click', function () {
      if (mobileMenu && mobileMenu.classList.contains('is-open')) closeMobileMenu();
      else openMobileMenu();
    });
  }

  if (mobileMenu) {
    mobileMenu.addEventListener('click', function (event) {
      if (event.target && event.target.tagName === 'A') closeMobileMenu();
    });
  }

  if (langTrigger) {
    langTrigger.addEventListener('click', function (event) {
      event.stopPropagation();
      var isOpen = langDropdown && langDropdown.classList.toggle('is-open');
      if (langDropdown) langDropdown.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
      langTrigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  document.addEventListener('click', closeLangDropdown);
  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener(
    'pagehide',
    function () {
      closeMobileMenu();
      closeLangDropdown();
      document.removeEventListener('click', closeLangDropdown);
      window.removeEventListener('scroll', handleScroll);
    },
    { once: true }
  );
})();
