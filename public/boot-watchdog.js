(() => {
  async function triggerImmediateRecovery() {
    if (sessionStorage.getItem("cinetrekker_boot_recovery_attempted")) return;
    sessionStorage.setItem("cinetrekker_boot_recovery_attempted", "1");
    try {
      if ("caches" in window) {
        const keys = await window.caches.keys();
        await Promise.all(keys.map((k) => window.caches.delete(k)));
      }
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((reg) => reg.update()));
      }
      window.sessionStorage.removeItem("cinetrekker_chunk_retry_count");
    } catch (_) {}
    const url = new URL(window.location.href);
    url.searchParams.set("_cb", Date.now().toString());
    window.location.replace(url.toString());
  }

  window.addEventListener(
    "error",
    (e) => {
      if (document.documentElement.dataset.cinetrekkerMounted === "true") return;
      const target = e.target;
      if (
        target &&
        (target.tagName === "SCRIPT" || target.tagName === "LINK")
      ) {
        triggerImmediateRecovery();
      }
    },
    true
  );
  const root = document.getElementById("root");
  if (!root) return;

  const testDelay = Number(window.__CT_BOOT_TIMEOUT_MS__);
  const delayMs = Number.isFinite(testDelay) && testDelay >= 0 ? testDelay : 12_000;

  const clearWatchdog = () => window.clearTimeout(watchdog);
  const watchdog = window.setTimeout(() => {
    if (
      document.documentElement.dataset.cinetrekkerMounted === "true" ||
      !root.querySelector("#app-shell")
    ) {
      return;
    }

    const panel = document.createElement("main");
    panel.setAttribute("role", "alert");
    panel.setAttribute("aria-labelledby", "startup-recovery-title");
    panel.style.cssText = [
      "min-height:100vh",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "padding:24px",
      "background:#0e0e12",
      "color:#f8fafc",
      "font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    ].join(";");

    const content = document.createElement("section");
    content.style.cssText = [
      "width:min(100%,480px)",
      "border:1px solid rgba(255,255,255,.16)",
      "border-radius:16px",
      "padding:28px",
      "background:#17171d",
      "box-shadow:0 20px 48px rgba(0,0,0,.35)",
      "text-align:center",
    ].join(";");

    const title = document.createElement("h1");
    title.id = "startup-recovery-title";
    title.textContent = "CineTrekker could not finish loading";
    title.style.cssText = "margin:0 0 12px;font-size:1.25rem;line-height:1.35";

    const message = document.createElement("p");
    message.textContent = "This can happen after an update or an interrupted connection. Reload this tab to try again.";
    message.style.cssText = "margin:0 0 20px;color:#cbd5e1;line-height:1.55";

    const reload = document.createElement("a");
    reload.href = window.location.href;
    reload.textContent = "Reload page";
    reload.style.cssText = [
      "display:inline-block",
      "padding:11px 16px",
      "border-radius:10px",
      "background:#e11d48",
      "color:#fff",
      "font-weight:700",
      "text-decoration:none",
      "cursor:pointer",
    ].join(";");
    reload.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        if ("caches" in window) {
          const keys = await window.caches.keys();
          await Promise.all(keys.map((k) => window.caches.delete(k)));
        }
        if ("serviceWorker" in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((reg) => reg.update()));
        }
        window.sessionStorage.removeItem("cinetrekker_chunk_retry_count");
      } catch (_) {
        // ignore storage/cleanup errors
      }
      const url = new URL(window.location.href);
      url.searchParams.set("_cb", Date.now().toString());
      window.location.replace(url.toString());
    });

    content.append(title, message, reload);
    panel.append(content);
    root.replaceChildren(panel);
  }, delayMs);

  window.addEventListener("cinetrekker:mounted", clearWatchdog, { once: true });
})();
