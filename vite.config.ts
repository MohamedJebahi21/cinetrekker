import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import type { Plugin } from 'vite';

// Security: Content Security Policy plugin
const cspPlugin = (): Plugin => ({
  name: 'csp-plugin',
  transformIndexHtml(html) {
    return html.replace(
      '<head>',
      `<head>
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://api.themoviedb.org https://*.supabase.co wss://*.supabase.co; media-src 'self' blob:; frame-src 'self' https://www.youtube.com https://player.vimeo.com; object-src 'none'; base-uri 'self'; form-action 'self';">`
    );
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), cspPlugin()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
}));
