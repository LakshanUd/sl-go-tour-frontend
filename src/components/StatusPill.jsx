// src/components/StatusPill.jsx
const STYLES = {
  active: "bg-green-100 text-green-800 border-green-200",
  inactive: "bg-red-100 text-red-800 border-red-200",
  under_maintenance: "bg-amber-100 text-amber-800 border-amber-200",
};

export default function StatusPill({ value = "" }) {
  const key = String(value).toLowerCase();
  const cls = STYLES[key] || "bg-neutral-100 text-neutral-700 border-neutral-200";
  const label =
    key === "under_maintenance" ? "Under maintenance" :
    key.charAt(0).toUpperCase() + key.slice(1);

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
}
