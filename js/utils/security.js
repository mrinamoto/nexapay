export function sanitizeDemoAssetUrl(value = "") {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";

  if (/^(assets\/|\.{0,2}\/assets\/)/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") throw new Error("Only HTTPS image URLs are allowed.");
    return url.toString();
  } catch {
    throw new Error("Use a blank value, an HTTPS image URL, or a project asset path.");
  }
}
