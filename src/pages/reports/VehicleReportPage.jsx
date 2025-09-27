// src/pages/reports/VehicleReportPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast, Toaster } from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ArrowLeft, RefreshCcw, Download, FileText, Search } from "lucide-react";

/* ---- Theme ---- */
const gradFrom = "from-[#DA22FF]";
const gradTo = "to-[#9733EE]";
const gradBG = `bg-gradient-to-r ${gradFrom} ${gradTo}`;
const gradText = `text-transparent bg-clip-text bg-gradient-to-r ${gradFrom} ${gradTo}`;

/* ---- Backend base ---- */
const RAW_BASE =
  (import.meta.env?.VITE_BACKEND_URL || "").toString() ||
  (import.meta.env?.VITE_API_URL || "").toString() ||
  "http://localhost:5000";
const BASE = RAW_BASE.replace(/\/+$/, "");

/* ---- axios ---- */
const api = axios.create({ baseURL: BASE });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ---- helpers ---- */
function norm(v = {}) {
  return {
    id: v.vehicleID || v._id || "—",
    regNo: v.regNo || "—",
    brand: v.brand || "—",
    model: v.model || "",
    type: v.type || "—",
    fuel: v.fuelType || "—",
    status: v.status || "—",
    seats: Number.isFinite(Number(v.seatingCapacity)) ? Number(v.seatingCapacity) : null,
    price: Number.isFinite(Number(v.price)) ? Number(v.price) : 0,
    createdAt: v.createdAt ? new Date(v.createdAt) : null,
  };
}
function capital(s) {
  if (!s) return "—";
  return String(s).replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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
async function loadSvgAsPngDataUrl(url, outW = 280, outH = 80) {
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
  const r = Math.min(outW / img.width, outH / img.height);
  const w = img.width * r;
  const h = img.height * r;
  ctx.drawImage(img, (outW - w) / 2, (outH - h) / 2, w, h);
  return canvas.toDataURL("image/png");
}

export default function VehicleReportPage() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [fuel, setFuel] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await api.get("/api/vehicles");
        const data = Array.isArray(res?.data) ? res.data : res?.data?.vehicles || [];
        setRows((data || []).map(norm));
      } catch (e) {
        console.error(e);
        toast.error(e?.response?.data?.message || "Failed to load vehicles");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows
      .filter((r) => (!type ? true : r.type === type))
      .filter((r) => (!status ? true : r.status === status))
      .filter((r) => (!fuel ? true : r.fuel === fuel))
      .filter((r) => {
        if (!t) return true;
        return [
          r.id, r.regNo, r.brand, r.model, r.type, r.fuel, r.status, String(r.seats), String(r.price),
        ]
          .join(" ")
          .toLowerCase()
          .includes(t);
      });
  }, [rows, q, type, status, fuel]);

  /* ---- stats ---- */
  const stats = useMemo(() => {
    const n = filtered.length;
    const prices = filtered.map((x) => x.price).filter((v) => Number.isFinite(v));
    const seats = filtered.map((x) => x.seats).filter((v) => Number.isFinite(v));
    const total = prices.reduce((s, v) => s + v, 0);
    const avgPrice = n ? total / n : 0;
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;
    const avgSeats = seats.length ? seats.reduce((s, v) => s + v, 0) / seats.length : 0;

    const countBy = (fn) =>
      filtered.reduce((m, x) => {
        const k = fn(x) || "—";
        m[k] = (m[k] || 0) + 1;
        return m;
      }, {});
    const byType = countBy((x) => x.type);
    const byStatus = countBy((x) => x.status);
    const byFuel = countBy((x) => x.fuel);
    const byBrand = countBy((x) => x.brand);

    const topBrands = Object.entries(byBrand)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([k, v]) => `${k} (${v})`);

    // price buckets
    const priceBuckets = [
      { label: "< 5M", test: (p) => p < 5_000_000, count: 0 },
      { label: "5–10M", test: (p) => p >= 5_000_000 && p < 10_000_000, count: 0 },
      { label: "10–20M", test: (p) => p >= 10_000_000 && p < 20_000_000, count: 0 },
      { label: "≥ 20M", test: (p) => p >= 20_000_000, count: 0 },
    ];
    prices.forEach((p) => {
      const b = priceBuckets.find((x) => x.test(p));
      if (b) b.count += 1;
    });

    // seats buckets
    const seatBuckets = [
      { label: "2", test: (s) => s === 2, count: 0 },
      { label: "3–5", test: (s) => s >= 3 && s <= 5, count: 0 },
      { label: "6–8", test: (s) => s >= 6 && s <= 8, count: 0 },
      { label: "9+", test: (s) => s >= 9, count: 0 },
      { label: "Unknown", test: (s) => s == null, count: 0 },
    ];
    filtered.forEach((v) => {
      const b = seatBuckets.find((x) => x.test(v.seats));
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
    filtered.forEach((v) => {
      const k = monthKey(v.createdAt);
      if (k in byMonth) byMonth[k] += 1;
    });
    const monthsArr = monthsKeys.map((k) => ({ key: k, label: monthLabel(k), count: byMonth[k] }));

    return {
      n,
      avgPrice,
      minPrice,
      maxPrice,
      avgSeats,
      byType,
      byStatus,
      byFuel,
      topBrands,
      priceBuckets,
      seatBuckets,
      monthsArr,
    };
  }, [filtered]);

  /* ---- PDF (logo, filters, rich summary + single summary table) ---- */
  async function generatePDF() {
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" }); // 595 x 842
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      let logo = null;
      try {
        logo = await loadSvgAsPngDataUrl("/mainlogo.svg", 280, 80);
      } catch { /* ignore */ }

      // header band
      doc.setFillColor(151, 51, 238);
      doc.rect(0, 0, pageW, 70, "F");
      doc.setFillColor(218, 34, 255);
      doc.rect(0, 70, pageW, 6, "F");
      if (logo) doc.addImage(logo, "PNG", 36, 18, 140, 40);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text("Vehicle Inventory Report", pageW - 36, 38, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageW - 36, 56, { align: "right" });

      // filter chips
      const chips = [
        q ? `Search: "${q}"` : null,
        type ? `Type: ${type}` : null,
        status ? `Status: ${status}` : null,
        fuel ? `Fuel: ${fuel}` : null,
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

      // summary cards (2 rows)
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

      card(36, cardTop, "Total Vehicles", stats.n, stats.topBrands.length ? `Top brands: ${stats.topBrands.join(" • ")}` : "");
      card(36 + cardW + 16, cardTop, "Avg Price", fmtMoney(stats.avgPrice), `Min ${fmtMoney(stats.minPrice)} • Max ${fmtMoney(stats.maxPrice)}`);

      const row2Y = cardTop + cardH + 16;
      const byTypeLine = Object.entries(stats.byType).map(([k, v]) => `${capital(k)}: ${v}`).join(" • ");
      card(36, row2Y, "By Type", byTypeLine || "—");
      card(36 + cardW + 16, row2Y, "Avg Seats", stats.avgSeats.toFixed(2), `Fuel mix: ${Object.entries(stats.byFuel).map(([k,v])=>`${capital(k)}: ${v}`).join(" • ") || "—"}`);

      // divider
      let y = row2Y + cardH + 22;
      doc.setDrawColor(230);
      doc.line(36, y, pageW - 36, y);
      y += 22;

      // two small tables: price buckets + seats buckets
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(35);
      doc.text("Price Buckets", 36, y);
      autoTable(doc, {
        startY: y + 6,
        margin: { left: 36, right: (pageW - 36 - ((pageW - 72 - 16) / 2) - 16) },
        tableWidth: (pageW - 72 - 16) / 2,
        headStyles: { fillColor: [151, 51, 238] },
        styles: { fontSize: 9, cellPadding: 6 },
        head: [["Bucket", "Count"]],
        body: stats.priceBuckets.map((b) => [b.label, b.count]),
        theme: "striped",
      });

      doc.text("Seats Buckets", 36 + (pageW - 72 - 16) / 2 + 16, y);
      autoTable(doc, {
        startY: y + 6,
        margin: { left: 36 + (pageW - 72 - 16) / 2 + 16, right: 36 },
        tableWidth: (pageW - 72 - 16) / 2,
        headStyles: { fillColor: [151, 51, 238] },
        styles: { fontSize: 9, cellPadding: 6 },
        head: [["Bucket", "Count"]],
        body: stats.seatBuckets.map((b) => [b.label, b.count]),
        theme: "striped",
      });

      y = (doc.lastAutoTable?.finalY || y) + 18;

      // created by month (last 6)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(35);
      doc.text("Created by Month (Last 6 Months)", 36, y);
      autoTable(doc, {
        startY: y + 6,
        margin: { left: 36, right: 36 },
        headStyles: { fillColor: [151, 51, 238] },
        styles: { fontSize: 9, cellPadding: 6 },
        head: [["Month", "Count"]],
        body: stats.monthsArr.map((m) => [m.label, m.count]),
        theme: "striped",
        didDrawPage: ({ pageNumber }) => {
          doc.setFontSize(9);
          doc.setTextColor(120);
          const ts = new Date().toLocaleString();
          doc.text(`Generated ${ts}`, 36, doc.internal.pageSize.getHeight() - 18);
          doc.text(`Page ${pageNumber}`, pageW - 36, doc.internal.pageSize.getHeight() - 18, { align: "right" });
        },
      });

      // new page: summary table only
      doc.addPage();
      const pageW2 = doc.internal.pageSize.getWidth();
      const pageH2 = doc.internal.pageSize.getHeight();

      // soft band + logo
      doc.setFillColor(246, 243, 255);
      doc.rect(0, 0, pageW2, 56, "F");
      if (logo) doc.addImage(logo, "PNG", 36, 14, 110, 30);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(60);
      doc.text("Summary Table", pageW2 - 36, 36, { align: "right" });

      const body = filtered.map((v) => [
        v.id,
        v.regNo,
        `${v.brand} ${v.model}`.trim(),
        capital(v.type),
        v.seats ?? "—",
        capital(v.fuel),
        capital(v.status),
        fmtMoney(v.price),
      ]);

      autoTable(doc, {
        startY: 56 + 16,
        headStyles: { fillColor: [151, 51, 238] },
        styles: { fontSize: 9, cellPadding: 6 },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { cellWidth: 80 },
          2: { cellWidth: 130 },
          3: { cellWidth: 70 },
          4: { cellWidth: 45, halign: "right" },
          5: { cellWidth: 60 },
          6: { cellWidth: 60 },
          7: { cellWidth: 80, halign: "right" },
        },
        head: [["ID", "Reg No", "Brand/Model", "Type", "Seats", "Fuel", "Status", "Price"]],
        body,
        theme: "striped",
        margin: { left: 36, right: 36 },
        didDrawPage: ({ pageNumber }) => {
          doc.setFontSize(9);
          doc.setTextColor(120);
          const ts = new Date().toLocaleString();
          doc.text(`Generated ${ts}`, 36, pageH2 - 18);
          doc.text(`Page ${pageNumber}`, pageW2 - 36, pageH2 - 18, { align: "right" });
        },
      });

      doc.save(`vehicles-report-${Date.now()}.pdf`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate PDF");
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
            Download <span className={gradText}>Vehicles</span> Report
          </h1>
          <p className="text-sm text-neutral-500">Live data · modern PDF layout · reusable structure</p>
          <p className="text-[10px] text-neutral-400 mt-1">
            Backend: <span className="font-mono">{BASE}/api/vehicles</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setLoading(true);
              api.get("/api/vehicles")
                .then((res) => {
                  const data = Array.isArray(res?.data) ? res.data : res?.data?.vehicles || [];
                  setRows((data || []).map(norm));
                })
                .catch((e) => toast.error(e?.response?.data?.message || "Failed to reload"))
                .finally(() => setLoading(false));
            }}
            className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
            title="Reload"
          >
            <RefreshCcw className={["h-4 w-4", loading ? "animate-spin" : ""].join(" ")} /> Reload
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
          <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 border border-neutral-200">
            <Search className="h-4 w-4 text-neutral-500" />
            <input
              className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-700"
              placeholder="Search brand, reg no, type, status…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-neutral-500 mb-1">Type</div>
          <input
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
            placeholder="e.g., Car, Van, SUV"
            value={type}
            onChange={(e) => setType(e.target.value)}
          />
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-neutral-500 mb-1">Status</div>
          <input
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
            placeholder="e.g., Available, Booked"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-neutral-500 mb-1">Fuel</div>
          <input
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#DA22FF]/30"
            placeholder="e.g., Petrol, Diesel, Hybrid, EV"
            value={fuel}
            onChange={(e) => setFuel(e.target.value)}
          />
        </div>
      </div>

      {/* Preview list */}
      <div className="rounded-2xl border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="text-sm text-neutral-700">
            {loading ? "Loading…" : `${filtered.length} of ${rows.length} vehicles`}
          </div>
          <div className="inline-flex items-center gap-1 text-xs text-neutral-500">
            <FileText className="h-4 w-4" />
            Preview of table to be exported
          </div>
        </div>

        <div className="divide-y">
          {loading && <div className="p-6 text-neutral-500">Loading…</div>}
          {!loading && !filtered.length && <div className="p-6 text-neutral-500">No data</div>}
          {!loading &&
            filtered.slice(0, 12).map((v) => (
              <div key={v.id + v.regNo} className="px-4 py-3 text-sm flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">{v.brand} {v.model}</div>
                  <div className="text-xs text-neutral-500 truncate">
                    {v.regNo} · {capital(v.type)} · {capital(v.fuel)} · {capital(v.status)} · Seats: {v.seats ?? "—"}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-semibold">{fmtMoney(v.price)}</div>
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
