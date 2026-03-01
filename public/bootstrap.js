// Apply dark mode immediately to prevent theme flash.
(function () {
  try {
    var root = document.documentElement;
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    root.style.colorScheme = 'dark';
  } catch (e) {
    // ignore
  }
})();

// Suppress noisy browser-extension connection errors before app modules execute.
(function () {
  try {
    var extensionConnectionErrorRegex = /^(?:Error:\s*)?Could not establish connection\. Receiving end does not exist\.?$/i;

    var getReasonMessage = function (reason) {
      if (typeof reason === 'string') return reason;
      if (reason && typeof reason.message === 'string') return reason.message;
      return '';
    };

    window.addEventListener('unhandledrejection', function (event) {
      var message = getReasonMessage(event.reason).trim();
      if (!extensionConnectionErrorRegex.test(message)) return;

      event.preventDefault();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }
    }, { capture: true });

    window.addEventListener('error', function (event) {
      var message = (event && typeof event.message === 'string' ? event.message : '').trim();
      if (!extensionConnectionErrorRegex.test(message)) return;

      event.preventDefault();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }
    }, { capture: true });
  } catch (e) {
    // ignore bootstrap noise filter errors
  }
})();
