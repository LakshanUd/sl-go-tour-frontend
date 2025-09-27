// src/pages/reports/AccommodationReportPage.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import { ArrowLeft, Download, RefreshCcw, FileText, BedDouble } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useNavigate } from "react-router-dom";

/* Theme */
const gradFrom = "from-[#DA22FF]";
const gradTo = "to-[#9733EE]";
const gradBG = `bg-gradient-to-r ${gradFrom} ${gradTo}`;
const gradText = `text-transparent bg-clip-text bg-gradient-to-r ${gradFrom} ${gradTo}`;

/* Filters/options (mirror admin page) */
const TYPES = ["Hotel", "Villa", "Apartment", "Guest House", "Hostel", "Resort", "Homestay"];
const STATUSES = ["Available", "Fully Booked", "Temporarily Closed"];

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

/* Normalize */
function norm(a = {}) {
  return {
    id: a._id,
    name: a.name || "—",
    type: a.type || "—",
    pricePerNight: Number(a.pricePerNight ?? 0),
    capacity: Number(a.capacity ?? 0),
    amenities: Array.isArray(a.amenities) ? a.amenities : [],
    status: a.status || "—",
    createdAt: a.createdAt ? new Date(a.createdAt) : null,
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

export default function AccommodationReportPage() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");

  async function load() {
    try {
      setLoading(true);
      const res = await api.get("/api/accommodations");
      const list = Array.isArray(res?.data) ? res.data : [];
      setRows(list.map(norm));
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to load accommodations");
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
      .filter((r) => (!status ? true : r.status === status))
      .filter((r) => {
        if (!t) return true;
        return [
          r.name, r.type, r.status, String(r.pricePerNight), String(r.capacity), ...(r.amenities || []),
        ].join(" ").toLowerCase().includes(t);
      });
  }, [rows, q, type, status]);

  /* Stats */
  const stats = useMemo(() => {
    const n = filtered.length;
    const prices = filtered.map((x) => x.pricePerNight).filter((v) => Number.isFinite(v));
    const caps = filtered.map((x) => x.capacity).filter((v) => Number.isFinite(v));
    const sumP = prices.reduce((s, v) => s + v, 0);
    const sumC = caps.reduce((s, v) => s + v, 0);
    const avgPrice = n ? sumP / n : 0;
    const avgCap = n ? sumC / n : 0;
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;

    const byType = {};
    filtered.forEach((x) => { byType[x.type] = (byType[x.type] || 0) + 1; });

    const byStatus = {};
    filtered.forEach((x) => { byStatus[x.status] = (byStatus[x.status] || 0) + 1; });

    // Top amenities
    const amenityCounts = {};
    filtered.forEach((x) => (x.amenities || []).forEach((am) => {
      amenityCounts[am] = (amenityCounts[am] || 0) + 1;
    }));
    const topAmenitiesArr = Object.entries(amenityCounts).sort((a,b)=>b[1]-a[1]);
    const topAmenities = topAmenitiesArr.slice(0, 8).map(([k, v]) => `${k} (${v})`);

    // Price buckets (tweak thresholds as needed)
    const priceBuckets = [
      { label: "< 10k", test: (p) => p < 10000, count: 0 },
      { label: "10k–25k", test: (p) => p >= 10000 && p < 25000, count: 0 },
      { label: "25k–50k", test: (p) => p >= 25000 && p < 50000, count: 0 },
      { label: "≥ 50k", test: (p) => p >= 50000, count: 0 },
    ];
    prices.forEach((p) => {
      const bucket = priceBuckets.find((b) => b.test(p));
      if (bucket) bucket.count += 1;
    });

    // Capacity buckets
    const capBuckets = [
      { label: "1–2", test: (c) => c >= 1 && c <= 2, count: 0 },
      { label: "3–4", test: (c) => c >= 3 && c <= 4, count: 0 },
      { label: "5–8", test: (c) => c >= 5 && c <= 8, count: 0 },
      { label: "9+", test: (c) => c >= 9, count: 0 },
    ];
    caps.forEach((c) => {
      const bucket = capBuckets.find((b) => b.test(c));
      if (bucket) bucket.count += 1;
    });

    // Created by month (last 6 months)
    const now = new Date();
    const monthsKeys = Array.from({length: 6}).map((_,i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return monthKey(d);
    });
    const byMonth = {};
    monthsKeys.forEach((k) => { byMonth[k] = 0; });
    filtered.forEach((a) => {
      const k = monthKey(a.createdAt);
      if (k in byMonth) byMonth[k] += 1;
    });
    const monthsArr = monthsKeys.map((k) => ({ key: k, label: monthLabel(k), count: byMonth[k] }));

    // Date range
    const dates = filtered.map((a) => a.createdAt).filter(Boolean).sort((a,b)=>a-b);
    const firstDate = dates[0] || null;
    const lastDate  = dates[dates.length-1] || null;

    return {
      n, avgPrice, avgCap, minPrice, maxPrice,
      byType, byStatus, topAmenities, topAmenitiesArr,
      priceBuckets, capBuckets, monthsArr,
      firstDate, lastDate
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
      doc.text("Accommodations Report", pageW - 36, 38, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageW - 36, 56, { align: "right" });

      /* ---- FILTER CHIPS ---- */
      const chips = [
        q ? `Search: "${q}"` : null,
        type ? `Type: ${type}` : null,
        status ? `Status: ${status}` : null,
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

      card(36, cardTop, "Total Properties", stats.n, "After filters");
      card(36 + cardW + 16, cardTop, "Avg Price / Night", money(stats.avgPrice), `Min ${money(stats.minPrice)} • Max ${money(stats.maxPrice)}`);

      const row2Y = cardTop + cardH + 16;
      const rangeSubtitle =
        stats.firstDate && stats.lastDate
          ? `${fmtDate(stats.firstDate)} – ${fmtDate(stats.lastDate)}`
          : "—";
      card(36, row2Y, "Date Range (Created)", stats.firstDate ? "" : "—", rangeSubtitle);
      card(36 + cardW + 16, row2Y, "Avg Capacity", stats.avgCap.toFixed(2), "Guests per property");

      // Divider
      let y = row2Y + cardH + 22;
      doc.setDrawColor(230);
      doc.line(36, y, pageW - 36, y);
      y += 22;

      /* ---- SIDE-BY-SIDE: By Type / By Status ---- */
      const colGap = 16;
      const colWidth = (pageW - 36 - 36 - colGap) / 2;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(35);
      doc.text("By Type", 36, y);
      autoTable(doc, {
        startY: y + 6,
        margin: { left: 36, right: pageW - 36 - colWidth },
        tableWidth: colWidth,
        headStyles: { fillColor: [151, 51, 238], halign: "left", fontStyle: "bold" },
        styles: { fontSize: 9, cellPadding: 6, overflow: "linebreak" },
        head: [["Type", "Count"]],
        body: Object.entries(stats.byType).sort((a,b)=>b[1]-a[1]).map(([k,v]) => [k, v]),
        theme: "striped",
      });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(35);
      doc.text("By Status", 36 + colWidth + colGap, y);
      autoTable(doc, {
        startY: y + 6,
        margin: { left: 36 + colWidth + colGap, right: 36 },
        tableWidth: colWidth,
        headStyles: { fillColor: [151, 51, 238], halign: "left", fontStyle: "bold" },
        styles: { fontSize: 9, cellPadding: 6, overflow: "linebreak" },
        head: [["Status", "Count"]],
        body: Object.entries(stats.byStatus).sort((a,b)=>b[1]-a[1]).map(([k,v]) => [k, v]),
        theme: "striped",
      });

      y = (doc.lastAutoTable?.finalY || y) + 18;

      /* ---- Top Amenities ---- */
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(35);
      doc.text("Top Amenities", 36, y);
      autoTable(doc, {
        startY: y + 6,
        margin: { left: 36, right: 36 },
        headStyles: { fillColor: [151, 51, 238], halign: "left", fontStyle: "bold" },
        styles: { fontSize: 9, cellPadding: 6, overflow: "linebreak" },
        head: [["Amenity", "Count"]],
        body: stats.topAmenitiesArr.map(([name,count]) => [name, count]),
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

      /* ---- SIDE-BY-SIDE: Price Buckets / Capacity Buckets ---- */
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(35);
      doc.text("Price Buckets", 36, y);
      autoTable(doc, {
        startY: y + 6,
        margin: { left: 36, right: pageW - 36 - colWidth },
        tableWidth: colWidth,
        headStyles: { fillColor: [151, 51, 238], halign: "left", fontStyle: "bold" },
        styles: { fontSize: 9, cellPadding: 6, overflow: "linebreak" },
        head: [["Bucket", "Count"]],
        body: stats.priceBuckets.map(b => [b.label, b.count]),
        theme: "striped",
      });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(35);
      doc.text("Capacity Buckets", 36 + colWidth + colGap, y);
      autoTable(doc, {
        startY: y + 6,
        margin: { left: 36 + colWidth + colGap, right: 36 },
        tableWidth: colWidth,
        headStyles: { fillColor: [151, 51, 238], halign: "left", fontStyle: "bold" },
        styles: { fontSize: 9, cellPadding: 6, overflow: "linebreak" },
        head: [["Bucket", "Count"]],
        body: stats.capBuckets.map(b => [b.label, b.count]),
        theme: "striped",
      });

      y = (doc.lastAutoTable?.finalY || y) + 18;

      /* ---- Created by Month (last 6 months) ---- */
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

      // Final summary table of properties
      doc.addPage();

      const topBandH = 56;
      doc.setFillColor(246, 243, 255);
      doc.rect(0, 0, pageW, topBandH, "F");
      if (logoDataUrl) doc.addImage(logoDataUrl, "PNG", 36, 14, 110, 30);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(60);
      doc.text("Summary Table", pageW - 36, 36, { align: "right" });

      const body = filtered.map((a) => ([
        a.name,
        a.type,
        money(a.pricePerNight),
        String(a.capacity),
        a.status,
        (a.amenities || []).join(", "),
      ]));

      autoTable(doc, {
        startY: topBandH + 16,
        headStyles: { fillColor: [151, 51, 238], halign: "left", fontStyle: "bold" },
        styles: { fontSize: 9, cellPadding: 6, overflow: "linebreak" },
        columnStyles: {
          0: { cellWidth: 140 }, // Name
          1: { cellWidth: 86 },  // Type
          2: { cellWidth: 88 },  // Price/Night
          3: { cellWidth: 60 },  // Capacity
          4: { cellWidth: 86 },  // Status
          5: { cellWidth: 130 }, // Amenities
        },
        head: [["Name", "Type", "Price/Night", "Capacity", "Status", "Amenities"]],
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

      doc.save(`accommodations-report-${Date.now()}.pdf`);
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
            Download <span className={gradText}>Accommodations</span> Report
          </h1>
          <p className="text-sm text-neutral-500">Live data · modern PDF layout · reusable structure</p>
          <p className="text-[10px] text-neutral-400 mt-1">
            Backend: <span className="font-mono">{BASE}/api/accommodations</span>
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
            disabled={loading || !filtered.length}
            title="Download PDF"
          >
            <Download className="h-4 w-4" /> Download PDF
          </button>
        </div>
      </div>

      {/* Filters / Quick stats preview */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-neutral-500 mb-1">Search</div>
          <input
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
            placeholder="Search name, type, status, amenity…"
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
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-neutral-500 mb-1">Status</div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
          >
            <option value="">All</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-neutral-500 mb-1">Overview</div>
          <div className="text-sm">
            <span className="mr-3">Shown: <b>{filtered.length}</b></span>
            <span className="mr-3">Avg Price: <b>{money(stats.avgPrice)}</b></span>
            <span>Cap Avg: <b>{Number.isFinite(stats.avgCap) ? stats.avgCap.toFixed(2) : "0.00"}</b></span>
          </div>
        </div>
      </div>

      {/* Mini preview list */}
      <div className="rounded-2xl border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="text-sm text-neutral-700">
            {loading ? "Loading…" : `${filtered.length} of ${rows.length} accommodations`}
          </div>
          <div className="inline-flex items-center gap-1 text-xs text-neutral-500">
            <FileText className="h-4 w-4" />
            Preview of tables to be exported
          </div>
        </div>

        <div className="divide-y">
          {loading && <div className="p-6 text-neutral-500">Loading…</div>}
          {!loading && !filtered.length && <div className="p-6 text-neutral-500">No data</div>}
          {!loading && filtered.slice(0, 12).map((a) => (
            <div key={a.id} className="px-4 py-3 text-sm flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium">{a.name}</div>
                <div className="text-xs text-neutral-500 truncate">
                  <span className="inline-flex items-center gap-1 mr-2"><BedDouble className="h-3 w-3" />{a.type}</span>
                  <span className="mr-2">{a.status}</span>
                  <span>Cap: {a.capacity}</span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-semibold">{money(a.pricePerNight)}</div>
                <div className="text-[11px] text-neutral-500">
                  {(a.amenities || []).slice(0, 3).join(", ") || "—"}
                  {a.amenities.length > 3 ? "…" : ""}
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
