(function () {
  var script = document.currentScript;
  var target = script && script.getAttribute('data-redirect');
  if (!target) return;
  setTimeout(function () {
    window.location.href = target;
  }, 3000);
})();
