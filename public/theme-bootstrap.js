(function () {
  try {
    var storedTheme = window.localStorage.getItem("cinetrekker-theme");
    var theme = storedTheme === "light" || storedTheme === "oled" || storedTheme === "dark"
      ? storedTheme
      : "dark";
    var root = document.documentElement;

    root.setAttribute("data-theme", theme);
    root.classList.toggle("dark", theme !== "light");
    root.style.colorScheme = theme === "light" ? "light" : "dark";
  } catch (_error) {
    // Preserve the dark HTML fallback if storage is unavailable.
  }
}());
