export default function handler(_req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  return res.status(404).json({ error: "Not found" });
}
