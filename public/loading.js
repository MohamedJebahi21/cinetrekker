(function() {
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.crossOrigin = 'anonymous';
  link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@400;600;700;800&family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap';
  document.head.appendChild(link);
})();

window.addEventListener('load', function() {
  var shell = document.getElementById('app-shell');
  if (shell) {
    shell.classList.add('loaded');
    setTimeout(function() { shell.style.display = 'none'; }, 300);
  }
});