export function money(value = 0) {
  const amount = Number(value || 0);
  return `৳${amount.toLocaleString("en-BD", {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  })}`;
}

export function dateTime(value) {
  const date = new Date(value);
  return date.toLocaleString("en-BD", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

export function dateOnly(value) {
  const date = new Date(value);
  return date.toLocaleDateString("en-BD", { dateStyle: "medium" });
}

export function initials(name = "NP") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "NP";
}

export function txLabel(type = "") {
  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function percent(current, target) {
  const safeTarget = Number(target || 0);
  if (safeTarget <= 0) return 0;
  return Math.min(100, Math.round((Number(current || 0) / safeTarget) * 100));
}
