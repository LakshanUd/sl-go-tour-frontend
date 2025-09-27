// src/pages/reports/MealsReportPage.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import { ArrowLeft, Download, RefreshCcw, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* Theme */
const gradFrom = "from-[#DA22FF]";
const gradTo = "to-[#9733EE]";
const gradBG = `bg-gradient-to-r ${gradFrom} ${gradTo}`;
const gradText = `text-transparent bg-clip-text bg-gradient-to-r ${gradFrom} ${gradTo}`;

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

/* Normalizer */
function norm(m = {}) {
  return {
    id: m._id,
    name: m.name || "—",
    description: m.description || "",
    category: m.catogery || "—",
    price: Number(m.price ?? 0),
    available: !!m.avalability,
    createdAt: m.createdAt ? new Date(m.createdAt) : null,
  };
}

/* ----- Helpers: logo & tiny utils ----- */
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

function money(n) {
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
function fmtDate(d) {
  try {
    return d ? d.toLocaleDateString() : "—";
  } catch {
    return "—";
  }
}

export default function MealsReportPage() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [availability, setAvailability] = useState("");

  async function load() {
    try {
      setLoading(true);
      const res = await api.get("/api/meals");
      const list = Array.isArray(res?.data?.meals) ? res.data.meals : [];
      setRows(list.map(norm));
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to load meals");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows
      .filter((r) => (!cat ? true : r.category.toLowerCase() === cat.toLowerCase()))
      .filter((r) => {
        if (availability === "") return true;
        return availability === "true" ? r.available : !r.available;
      })
      .filter((r) => {
        if (!t) return true;
        return [
          r.name,
          r.category,
          r.description,
          String(r.price),
          r.available ? "available" : "unavailable",
        ]
          .join(" ")
          .toLowerCase()
          .includes(t);
      });
  }, [rows, q, cat, availability]);

  /* Stats */
  const stats = useMemo(() => {
    const n = filtered.length;
    const prices = filtered.map((x) => x.price).filter((v) => Number.isFinite(v));
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;
    const avgPrice = prices.length ? prices.reduce((s, v) => s + v, 0) / prices.length : 0;
    const availableCount = filtered.filter((x) => x.available).length;

    // categories
    const byCategory = {};
    filtered.forEach((x) => { byCategory[x.category] = (byCategory[x.category] || 0) + 1; });
    const topCats = Object.entries(byCategory)
      .sort((a,b)=>b[1]-a[1])
      .slice(0, 8)
      .map(([k,v])=>`${k} (${v})`);

    // availability
    const byAvailability = {
      Available: availableCount,
      Unavailable: n - availableCount,
    };

    // price buckets
    const priceBuckets = [
      { label: "< 500", test: (p) => p < 500, count: 0 },
      { label: "500–1,000", test: (p) => p >= 500 && p < 1000, count: 0 },
      { label: "1,000–2,500", test: (p) => p >= 1000 && p < 2500, count: 0 },
      { label: "2,500–5,000", test: (p) => p >= 2500 && p < 5000, count: 0 },
      { label: "≥ 5,000", test: (p) => p >= 5000, count: 0 },
    ];
    prices.forEach((p) => {
      const bucket = priceBuckets.find((b) => b.test(p));
      if (bucket) bucket.count += 1;
    });

    // created by month (last 6 months)
    const now = new Date();
    const monthsKeys = Array.from({length: 6}).map((_,i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return monthKey(d);
    });
    const byMonth = {};
    monthsKeys.forEach((k) => { byMonth[k] = 0; });
    filtered.forEach((m) => {
      const k = monthKey(m.createdAt);
      if (k in byMonth) byMonth[k] += 1;
    });
    const monthsArr = monthsKeys.map((k) => ({ key: k, label: monthLabel(k), count: byMonth[k] }));

    // date range
    const dates = filtered.map((m) => m.createdAt).filter(Boolean).sort((a,b)=>a-b);
    const firstDate = dates[0] || null;
    const lastDate  = dates[dates.length-1] || null;

    return {
      n, minPrice, maxPrice, avgPrice, availableCount,
      byCategory, byAvailability, topCats,
      priceBuckets, monthsArr, firstDate, lastDate
    };
  }, [filtered]);

  /* ---------------- Stylish PDF generator (richer summaries) ---------------- */
  async function generatePDF() {
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" }); // 595 x 842
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      // Load & place logo (from /public)
      let logoDataUrl = null;
      try {
        logoDataUrl = await loadSvgAsPngDataUrl("/mainlogo.svg", 280, 80);
      } catch {
        /* ignore if not found */
      }

      /* ---- HEADER ---- */
      doc.setFillColor(151, 51, 238); // #9733EE
      doc.rect(0, 0, pageW, 70, "F");
      doc.setFillColor(218, 34, 255); // #DA22FF
      doc.rect(0, 70, pageW, 6, "F");

      if (logoDataUrl) doc.addImage(logoDataUrl, "PNG", 36, 18, 140, 40);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text("Meals Report", pageW - 36, 38, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageW - 36, 56, { align: "right" });

      /* ---- FILTER CHIPS ---- */
      const chips = [
        q ? `Search: "${q}"` : null,
        cat ? `Category: ${cat}` : null,
        availability !== "" ? `Availability: ${availability === "true" ? "Available" : "Unavailable"}` : null,
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

      /* ---- SUMMARY CARDS ---- */
      const cardTop = chips.length ? chipY : 100;
      const cardW = (pageW - 36 - 36 - 16) / 2; // 2 columns
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

      const rangeSubtitle =
        stats.firstDate && stats.lastDate
          ? `${fmtDate(stats.firstDate)} – ${fmtDate(stats.lastDate)}`
          : "—";
      card(36, cardTop, "Total Items", stats.n, rangeSubtitle);
      card(36 + cardW + 16, cardTop, "Avg Price", money(stats.avgPrice), `Min ${money(stats.minPrice)} • Max ${money(stats.maxPrice)}`);

      const row2Y = cardTop + cardH + 16;
      card(36, row2Y, "Available", stats.availableCount, `Unavailable ${stats.n - stats.availableCount}`);
      card(36 + cardW + 16, row2Y, "Top Categories", stats.topCats?.[0] || "—", stats.topCats.slice(1, 4).join(" • ") || "");

      // Divider
      let y = row2Y + cardH + 22;
      doc.setDrawColor(230);
      doc.line(36, y, pageW - 36, y);
      y += 22;

      /* ---- SIDE-BY-SIDE: By Category / By Availability ---- */
      const colGap = 16;
      const colWidth = (pageW - 36 - 36 - colGap) / 2;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(35);
      doc.text("By Category", 36, y);
      autoTable(doc, {
        startY: y + 6,
        margin: { left: 36, right: pageW - 36 - colWidth },
        tableWidth: colWidth,
        headStyles: { fillColor: [151, 51, 238], halign: "left", fontStyle: "bold" },
        styles: { fontSize: 9, cellPadding: 6, overflow: "linebreak" },
        head: [["Category", "Count"]],
        body: Object.entries(stats.byCategory).sort((a,b)=>b[1]-a[1]).map(([k,v]) => [k, v]),
        theme: "striped",
      });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(35);
      doc.text("By Availability", 36 + colWidth + colGap, y);
      autoTable(doc, {
        startY: y + 6,
        margin: { left: 36 + colWidth + colGap, right: 36 },
        tableWidth: colWidth,
        headStyles: { fillColor: [151, 51, 238], halign: "left", fontStyle: "bold" },
        styles: { fontSize: 9, cellPadding: 6, overflow: "linebreak" },
        head: [["Status", "Count"]],
        body: Object.entries(stats.byAvailability).map(([k,v]) => [k, v]),
        theme: "striped",
      });

      y = (doc.lastAutoTable?.finalY || y) + 18;

      /* ---- Price Buckets ---- */
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(35);
      doc.text("Price Buckets", 36, y);
      autoTable(doc, {
        startY: y + 6,
        margin: { left: 36, right: 36 },
        headStyles: { fillColor: [151, 51, 238], halign: "left", fontStyle: "bold" },
        styles: { fontSize: 9, cellPadding: 6, overflow: "linebreak" },
        head: [["Bucket", "Count"]],
        body: stats.priceBuckets.map(b => [b.label, b.count]),
        theme: "striped",
        didDrawPage: ({ pageNumber }) => {
          doc.setFontSize(9);
          doc.setTextColor(120);
          const ts = new Date().toLocaleString();
          doc.text(`Generated ${ts}`, 36, pageH - 18);
          doc.text(`Page ${pageNumber}`, pageW - 36, pageH - 18, { align: "right" });
        },
      });

      y = (doc.lastAutoTable?.finalY || y) + 18;

      /* ---- Created by Month (Last 6 Months) ---- */
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
        body: stats.monthsArr.map(m => [m.label, m.count]),
        theme: "striped",
        didDrawPage: ({ pageNumber }) => {
          doc.setFontSize(9);
          doc.setTextColor(120);
          const ts = new Date().toLocaleString();
          doc.text(`Generated ${ts}`, 36, pageH - 18);
          doc.text(`Page ${pageNumber}`, pageW - 36, pageH - 18, { align: "right" });
        },
      });

      // Final summary table of meals
      doc.addPage();

      const topBandH = 56;
      doc.setFillColor(246, 243, 255);
      doc.rect(0, 0, pageW, topBandH, "F");
      if (logoDataUrl) doc.addImage(logoDataUrl, "PNG", 36, 14, 110, 30);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(60);
      doc.text("Summary Table", pageW - 36, 36, { align: "right" });

      const body = filtered.map((m) => ([
        m.name,
        m.category,
        money(m.price),
        m.available ? "Yes" : "No",
        m.description || "—",
      ]));

      autoTable(doc, {
        startY: topBandH + 16,
        headStyles: { fillColor: [151, 51, 238], halign: "left", fontStyle: "bold" },
        styles: { fontSize: 9, cellPadding: 6, overflow: "linebreak" },
        columnStyles: {
          0: { cellWidth: 150 }, // Name
          1: { cellWidth: 120 }, // Category
          2: { cellWidth: 80 },  // Price
          3: { cellWidth: 70 },  // Available
          4: { cellWidth: 150 }, // Description
        },
        head: [["Name", "Category", "Price", "Available", "Description"]],
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

      doc.save(`meals-report-${Date.now()}.pdf`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate report");
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      <Toaster position="top-right" />

      {/* Top */}
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
            Download <span className={gradText}>Meals</span> Report
          </h1>
          <p className="text-sm text-neutral-500">Filter, preview and export a modern PDF.</p>
          <p className="text-[10px] text-neutral-400 mt-1">
            Backend: <span className="font-mono">{BASE}/api/meals</span>
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
            disabled={loading || !filtered.length}
            className={`cursor-pointer inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white ${gradBG} hover:opacity-95 active:opacity-90`}
          >
            <Download className="h-4 w-4" /> Download PDF
          </button>
        </div>
      </div>

      {/* Filters / mini stats */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-neutral-500 mb-1">Search</div>
          <input
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
            placeholder="Search name, category, price…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-neutral-500 mb-1">Category</div>
          <input
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
            placeholder="e.g., Sri Lankan, Drinks"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
          />
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-neutral-500 mb-1">Availability</div>
          <select
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
          >
            <option value="">All</option>
            <option value="true">Available</option>
            <option value="false">Unavailable</option>
          </select>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-neutral-500 mb-1">Overview</div>
          <div className="text-sm">
            <span className="mr-3">Shown: <b>{filtered.length}</b></span>
            <span className="mr-3">Avg Price: <b>{money(stats.avgPrice)}</b></span>
            <span>Avail: <b>{stats.availableCount}</b></span>
          </div>
        </div>
      </div>

      {/* Preview list */}
      <div className="rounded-2xl border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="text-sm text-neutral-700">
            {loading ? "Loading…" : `${filtered.length} of ${rows.length} meals`}
          </div>
        </div>

        <div className="divide-y">
          {loading && <div className="p-6 text-neutral-500">Loading…</div>}
          {!loading && !filtered.length && <div className="p-6 text-neutral-500">No data</div>}
          {!loading && filtered.slice(0, 12).map((m) => (
            <div key={m.id} className="px-4 py-3 text-sm flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium">{m.name}</div>
                <div className="text-xs text-neutral-500 truncate">
                  <span className="mr-2">{m.category}</span>
                  <span className="mr-2">{m.available ? "Available" : "Unavailable"}</span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-semibold">{money(m.price)}</div>
                <div className="text-[11px] text-neutral-500 truncate max-w-[36ch]">
                  {m.description || "—"}
                </div>
              </div>
            </div>
          ))}
          {!loading && filtered.length > 12 && (
            <div className="px-4 py-3 text-xs text-neutral-500">+ {filtered.length - 12} more…</div>
          )}
        </div>
      </div>
    </div>
  );
}
