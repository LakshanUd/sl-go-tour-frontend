// src/pages/reports/TourPackageReportPage.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import { ArrowLeft, Download, RefreshCcw, FileText, Tag } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useNavigate } from "react-router-dom";

/* Theme */
const gradFrom = "from-[#DA22FF]";
const gradTo = "to-[#9733EE]";
const gradBG = `bg-gradient-to-r ${gradFrom} ${gradTo}`;
const gradText = `text-transparent bg-clip-text bg-gradient-to-r ${gradFrom} ${gradTo}`;

const TYPES = ["City Tour", "Village Tour", "Sea Tour", "Lagoon Tour"];

/* API base */
const RAW_BASE =
  (import.meta.env?.VITE_BACKEND_URL || "").toString() ||
  (import.meta.env?.VITE_API_URL || "").toString() ||
  "http://localhost:5000";
const BASE = RAW_BASE.replace(/\/+$/, "");
const api = axios.create({ baseURL: BASE });

api.interceptors.request.use((config) => {
  const t = localStorage.getItem("token");
  if (t) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

/* -------- Helpers -------- */
function norm(p = {}) {
  return {
    id: p.tourPakage_ID || p.tourPackage_ID || p.code || "—",
    name: p.name || "—",
    type: p.type || "—",
    price: Number(p.price ?? 0),
    duration: p.duration || "—",            // e.g., "3 days" / "2 nights"
    durationDays: extractDays(p.duration),  // numeric heuristic
    accCount: Array.isArray(p.accommodations) ? p.accommodations.length : 0,
    vehCount: Array.isArray(p.vehicles) ? p.vehicles.length : 0,
    mealCount: Array.isArray(p.meals) ? p.meals.length : 0,
    createdAt: p.createdAt ? new Date(p.createdAt) : null,
  };
}

function extractDays(raw) {
  if (!raw) return null;
  // try to find first number in the string, assume it's "days"
  const m = String(raw).match(/(\d+(\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

async function loadSvgAsPngDataUrl(url, outW = 320, outH = 90) {
  const res = await fetch(url, { cache: "no-cache" });
  const svgText = await res.text();
  const svg64 = btoa(unescape(encodeURIComponent(svgText)));
  const svgUrl = "data:image/svg+xml;base64," + svg64;

  const img = await new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = svgUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, outW, outH);
  const ratio = Math.min(outW / img.width, outH / img.height);
  const w = img.width * ratio;
  const h = img.height * ratio;
  const x = (outW - w) / 2;
  const y = (outH - h) / 2;
  ctx.drawImage(img, x, y, w, h);
  return canvas.toDataURL("image/png");
}

function fmtMoney(n) {
  return `LKR ${Number(n || 0).toFixed(2)}`;
}
function monthKey(d) {
  if (!d) return "—";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key) {
  const [y, m] = key.split("-");
  const dt = new Date(Number(y), Number(m) - 1, 1);
  return dt.toLocaleString(undefined, { month: "short", year: "numeric" });
}

/* -------- Page -------- */
export default function TourPackageReportPage() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [type, setType] = useState("");
  const [q, setQ] = useState("");

  async function load() {
    try {
      setLoading(true);
      const res = await api.get("/api/tour-packages");
      const arr = Array.isArray(res?.data) ? res.data : res?.data || [];
      setRows(arr.map(norm));
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load tour packages");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows
      .filter((r) => (!type ? true : r.type === type))
      .filter((r) => {
        if (!t) return true;
        return [r.id, r.name, r.type, r.duration, String(r.price)]
          .join(" ")
          .toLowerCase()
          .includes(t);
      });
  }, [rows, q, type]);

  /* -------- Stats -------- */
  const stats = useMemo(() => {
    const n = filtered.length;
    const prices = filtered.map((x) => x.price).filter((v) => Number.isFinite(v));
    const total = prices.reduce((s, v) => s + v, 0);
    const avg = n ? total / n : 0;
    const min = prices.length ? Math.min(...prices) : 0;
    const max = prices.length ? Math.max(...prices) : 0;

    const byType = TYPES.reduce((acc, t) => {
      acc[t] = filtered.filter((x) => x.type === t).length;
      return acc;
    }, {});

    const totalAcc = filtered.reduce((s, r) => s + r.accCount, 0);
    const totalVeh = filtered.reduce((s, r) => s + r.vehCount, 0);
    const totalMeals = filtered.reduce((s, r) => s + r.mealCount, 0);

    // duration buckets (by days; fallbacks to "Unknown")
    const durBuckets = [
      { label: "1 day", test: (d) => d === 1, count: 0 },
      { label: "2–3 days", test: (d) => d >= 2 && d <= 3, count: 0 },
      { label: "4–5 days", test: (d) => d >= 4 && d <= 5, count: 0 },
      { label: "6–7 days", test: (d) => d >= 6 && d <= 7, count: 0 },
      { label: "> 7 days", test: (d) => d > 7, count: 0 },
      { label: "Unknown", test: (d) => d == null, count: 0 },
    ];
    filtered.forEach((p) => {
      const d = p.durationDays;
      const bucket = durBuckets.find((b) => b.test(d));
      if (bucket) bucket.count += 1;
    });

    // price buckets
    const priceBuckets = [
      { label: "< 50k", test: (p) => p < 50000, count: 0 },
      { label: "50k–100k", test: (p) => p >= 50000 && p < 100000, count: 0 },
      { label: "100k–250k", test: (p) => p >= 100000 && p < 250000, count: 0 },
      { label: "250k–500k", test: (p) => p >= 250000 && p < 500000, count: 0 },
      { label: "≥ 500k", test: (p) => p >= 500000, count: 0 },
    ];
    prices.forEach((p) => {
      const b = priceBuckets.find((x) => x.test(p));
      if (b) b.count += 1;
    });

    // created by month (last 6 months)
    const now = new Date();
    const monthsKeys = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return monthKey(d);
    });
    const byMonth = {};
    monthsKeys.forEach((k) => (byMonth[k] = 0));
    filtered.forEach((p) => {
      const k = monthKey(p.createdAt);
      if (k in byMonth) byMonth[k] += 1;
    });
    const monthsArr = monthsKeys.map((k) => ({ key: k, label: monthLabel(k), count: byMonth[k] }));

    return { n, avg, min, max, byType, totalAcc, totalVeh, totalMeals, durBuckets, priceBuckets, monthsArr };
  }, [filtered]);

  /* -------- PDF (stylish summaries + single summary table) -------- */
  async function generatePDF() {
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" }); // 595 x 842
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      // Logo
      let logo = null;
      try {
        logo = await loadSvgAsPngDataUrl("/mainlogo.svg", 280, 80);
      } catch {
        /* ignore */
      }

      /* Header band */
      doc.setFillColor(151, 51, 238);
      doc.rect(0, 0, pageW, 70, "F");
      doc.setFillColor(218, 34, 255);
      doc.rect(0, 70, pageW, 6, "F");

      if (logo) doc.addImage(logo, "PNG", 36, 18, 140, 40);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text("Tour Packages Report", pageW - 36, 38, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageW - 36, 56, { align: "right" });

      /* Filter chips */
      const chips = [
        q ? `Search: "${q}"` : null,
        type ? `Type: ${type}` : null,
      ].filter(Boolean);

      let chipY = 100;
      if (chips.length) {
        doc.setFontSize(11);
        doc.setTextColor(40);
        doc.text("Filters", 36, chipY);
        chipY += 8;
        let x = 36;
        const padX = 8;
        chips.forEach((txt) => {
          const w = doc.getTextWidth(txt) + padX * 2;
          doc.setFillColor(245, 242, 255);
          doc.setDrawColor(220);
          doc.roundedRect(x, chipY, w, 20, 6, 6, "FD");
          doc.setTextColor(90);
          doc.text(txt, x + padX, chipY + 13);
          x += w + 8;
          if (x > pageW - 200) { x = 36; chipY += 26; }
        });
        chipY += 30;
      }

      /* Summary cards */
      const cardTop = chips.length ? chipY : 100;
      const cardW = (pageW - 36 - 36 - 16) / 2;
      const cardH = 80;

      function card(x, y, title, value, subtitle) {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(230);
        doc.roundedRect(x, y, cardW, cardH, 12, 12, "S");
        doc.setFontSize(11);
        doc.setTextColor(120);
        doc.text(title, x + 14, y + 20);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(35);
        doc.setFontSize(18);
        doc.text(String(value), x + 14, y + 44);
        if (subtitle) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(110);
          doc.text(subtitle, x + 14, y + 62);
        }
      }

      card(36, cardTop, "Total Packages", stats.n, `Acc ${stats.totalAcc} • Veh ${stats.totalVeh} • Meals ${stats.totalMeals}`);
      card(36 + cardW + 16, cardTop, "Avg Price", fmtMoney(stats.avg), `Min ${fmtMoney(stats.min)} • Max ${fmtMoney(stats.max)}`);

      const row2Y = cardTop + cardH + 16;
      const typesLine = TYPES.map((t) => `${t.split(" ")[0]}: ${stats.byType[t] || 0}`).join(" • ");
      card(36, row2Y, "By Type", typesLine || "—", "");
      const topDur = stats.durBuckets.find((b) => b.count === Math.max(...stats.durBuckets.map(x => x.count))) || { label: "—", count: 0 };
      card(36 + cardW + 16, row2Y, "Top Duration", `${topDur.label}`, `Count ${topDur.count}`);

      // Divider
      let y = row2Y + cardH + 22;
      doc.setDrawColor(230);
      doc.line(36, y, pageW - 36, y);
      y += 22;

      /* Side-by-side tables: Duration Buckets / Price Buckets */
      const colGap = 16;
      const colWidth = (pageW - 36 - 36 - colGap) / 2;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(35);
      doc.text("Duration Buckets", 36, y);
      autoTable(doc, {
        startY: y + 6,
        margin: { left: 36, right: pageW - 36 - colWidth },
        tableWidth: colWidth,
        headStyles: { fillColor: [151, 51, 238], halign: "left", fontStyle: "bold" },
        styles: { fontSize: 9, cellPadding: 6, overflow: "linebreak" },
        head: [["Bucket", "Count"]],
        body: stats.durBuckets.map((b) => [b.label, b.count]),
        theme: "striped",
      });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(35);
      doc.text("Price Buckets", 36 + colWidth + colGap, y);
      autoTable(doc, {
        startY: y + 6,
        margin: { left: 36 + colWidth + colGap, right: 36 },
        tableWidth: colWidth,
        headStyles: { fillColor: [151, 51, 238], halign: "left", fontStyle: "bold" },
        styles: { fontSize: 9, cellPadding: 6, overflow: "linebreak" },
        head: [["Bucket", "Count"]],
        body: stats.priceBuckets.map((b) => [b.label, b.count]),
        theme: "striped",
      });

      y = (doc.lastAutoTable?.finalY || y) + 18;

      /* Created by Month (last 6 months) */
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(35);
      doc.text("Created by Month (Last 6 Months)", 36, y);
      autoTable(doc, {
        startY: y + 6,
        margin: { left: 36, right: 36 },
        headStyles: { fillColor: [151, 51, 238], halign: "left", fontStyle: "bold" },
        styles: { fontSize: 9, cellPadding: 6, overflow: "linebreak" },
        head: [["Month", "Count"]],
        body: stats.monthsArr.map((m) => [m.label, m.count]),
        theme: "striped",
        didDrawPage: ({ pageNumber }) => {
          doc.setFontSize(9);
          doc.setTextColor(120);
          const ts = new Date().toLocaleString();
          doc.text(`Generated ${ts}`, 36, pageH - 18);
          doc.text(`Page ${pageNumber}`, pageW - 36, pageH - 18, { align: "right" });
        },
      });

      // New page: Summary Table ONLY
      doc.addPage();

      // soft header strip
      const topBandH = 56;
      doc.setFillColor(246, 243, 255);
      doc.rect(0, 0, pageW, topBandH, "F");
      if (logo) doc.addImage(logo, "PNG", 36, 14, 110, 30);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(60);
      doc.text("Summary Table", pageW - 36, 36, { align: "right" });

      const body = filtered.map((r) => [
        r.id,
        r.name,
        r.type,
        r.duration || "—",
        fmtMoney(r.price),
        `${r.accCount}`,
        `${r.vehCount}`,
        `${r.mealCount}`,
      ]);

      autoTable(doc, {
        startY: topBandH + 16,
        headStyles: { fillColor: [151, 51, 238], halign: "left", fontStyle: "bold" },
        styles: { fontSize: 9, cellPadding: 6, overflow: "linebreak" },
        columnStyles: {
          0: { cellWidth: 80 },   // ID
          1: { cellWidth: 160 },  // Name
          2: { cellWidth: 90 },   // Type
          3: { cellWidth: 70 },   // Duration
          4: { cellWidth: 80 },   // Price
          5: { cellWidth: 50 },   // Acc
          6: { cellWidth: 50 },   // Veh
          7: { cellWidth: 60 },   // Meals
        },
        head: [["ID", "Name", "Type", "Duration", "Price", "Acc", "Veh", "Meals"]],
        body,
        theme: "striped",
        margin: { left: 36, right: 36 },
        didDrawPage: ({ pageNumber }) => {
          doc.setFontSize(9);
          doc.setTextColor(120);
          const ts = new Date().toLocaleString();
          doc.text(`Generated ${ts}`, 36, pageH - 18);
          doc.text(`Page ${pageNumber}`, pageW - 36, pageH - 18, { align: "right" });
        },
      });

      doc.save(`tour-packages-report-${Date.now()}.pdf`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate report");
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      <Toaster position="top-right" />

      {/* Top bar */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            onClick={() => nav(-1)}
            className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
            title="Back"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold">
            Download <span className={gradText}>Tour Packages</span> Report
          </h1>
          <p className="text-sm text-neutral-500">Live data · modern PDF layout · reusable structure</p>
          <p className="text-[10px] text-neutral-400 mt-1">
            Backend: <span className="font-mono">{BASE}/api/tour-packages</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
            title="Reload"
          >
            <RefreshCcw className="h-4 w-4" /> Reload
          </button>
          <button
            onClick={generatePDF}
            className={`cursor-pointer inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white ${gradBG} hover:opacity-95 active:opacity-90`}
            title="Download PDF"
            disabled={loading || !filtered.length}
          >
            <Download className="h-4 w-4" /> Download PDF
          </button>
        </div>
      </div>

      {/* Filters / quick stats preview */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-neutral-500 mb-1">Search</div>
          <input
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
            placeholder="Search id, name, type, duration…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-neutral-500 mb-1">Type</div>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
          >
            <option value="">All</option>
            {TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
          </select>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-neutral-500 mb-1">Overview</div>
          <div className="text-sm">
            <span className="mr-3">Shown: <b>{filtered.length}</b></span>
            <span className="mr-3">Avg: <b>{fmtMoney((filtered.reduce((s, r) => s + r.price, 0) / (filtered.length || 1)) || 0)}</b></span>
            <span>Totals: <b>Acc {stats.totalAcc}</b> · <b>Veh {stats.totalVeh}</b> · <b>Meals {stats.totalMeals}</b></span>
          </div>
        </div>
      </div>

      {/* Preview list */}
      <div className="rounded-2xl border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="text-sm text-neutral-700">
            {loading ? "Loading…" : `${filtered.length} of ${rows.length} packages`}
          </div>
          <div className="inline-flex items-center gap-1 text-xs text-neutral-500">
            <FileText className="h-4 w-4" />
            Preview of table to be exported
          </div>
        </div>

        <div className="divide-y">
          {loading && <div className="p-6 text-neutral-500">Loading…</div>}
          {!loading && !filtered.length && <div className="p-6 text-neutral-500">No data</div>}
          {!loading && filtered.slice(0, 12).map((p) => (
            <div key={p.id} className="px-4 py-3 text-sm flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-neutral-500 truncate">
                  <span className="inline-flex items-center gap-1 mr-2"><Tag className="h-3 w-3" />{p.type}</span>
                  <span className="mr-2">ID: {p.id}</span>
                  <span>{p.duration}</span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-semibold">{fmtMoney(p.price)}</div>
                <div className="text-[11px] text-neutral-500">
                  {p.accCount} acc · {p.vehCount} veh · {p.mealCount} meals
                </div>
              </div>
            </div>
          ))}
          {!loading && filtered.length > 12 && (
            <div className="px-4 py-3 text-xs text-neutral-500">
              + {filtered.length - 12} more…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
