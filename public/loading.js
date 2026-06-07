window.addEventListener('load', function() {
  const shell = document.getElementById('app-shell');
  if (shell) {
    shell.classList.add('loaded');
    setTimeout(() => shell.style.display = 'none', 300);
  }
});