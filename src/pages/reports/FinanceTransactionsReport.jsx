// src/pages/reports/FinanceTransactionReport.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; // <-- IMPORTANT: use function import
import { Download, Calendar, Filter, RefreshCw, Wallet } from "lucide-react";

/* ---------- Branding ---------- */
const BRAND = {
  name: "GoTour SL",
  primary: "#9733EE",
  secondary: "#DA22FF",
  textDark: "#111827",
  textLight: "#6B7280",
  bgSoft: "#F8F7FB",
  footer: "© GoTour SL • Finance Report",
  logo: "", // optional CORS-safe logo URL
};

/* ---------- Backend base & axios ---------- */
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
api.interceptors.response.use(
  (r) => r,
  (err) => {
    const s = err?.response?.status;
    if (s === 401 || s === 403) toast.error(err?.response?.data?.message || "Unauthorized.");
    return Promise.reject(err);
  }
);

/* ---------- Helpers ---------- */
function money(n, c = "USD") {
  const val = Number(n || 0);
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: c }).format(val);
  } catch {
    return `${c} ${val.toFixed(2)}`;
  }
}
function parseDate(d) {
  try {
    if (!d) return null;
    return typeof d === "string" ? parseISO(d) : new Date(d);
  } catch {
    return null;
  }
}
function monthKey(d) {
  return format(d, "yyyy-MM");
}
function rangeFilter(tx, from, to) {
  if (!from && !to) return true;
  const created = parseDate(tx.createdAt);
  if (!created) return false;
  const interval = {
    start: from ? startOfDay(from) : startOfDay(new Date(2000, 0, 1)),
    end: to ? endOfDay(to) : endOfDay(new Date(2100, 0, 1)),
  };
  return isWithinInterval(created, interval);
}
const TYPES = ["invoice", "payment", "refund", "adjustment"];
const STATUS = ["open", "paid", "partial", "void", "refunded"];

/* ---------- Component ---------- */
export default function FinanceTransactionsReport() {
  const [tx, setTx] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [from, setFrom] = useState(() => {
    const d = startOfMonth(new Date());
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [to, setTo] = useState(() => {
    const d = endOfMonth(new Date());
    d.setHours(23, 59, 59, 999);
    return d;
  });
  const [type, setType] = useState("all");
  const [currency, setCurrency] = useState("all");

  // Load data
  async function load() {
    try {
      setLoading(true);
      const res = await api.get("/api/finance/transactions");
      const list = Array.isArray(res?.data) ? res.data : [];
      setTx(list);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load transactions");
      setTx([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  // Distinct currencies
  const currencies = useMemo(() => {
    const set = new Set();
    tx.forEach((t) => t.currency && set.add(t.currency));
    return ["all", ...Array.from(set)];
  }, [tx]);

  // Filtered transactions
  const filtered = useMemo(() => {
    return tx
      .filter((r) => rangeFilter(r, from, to))
      .filter((r) => (type === "all" ? true : r.type === type))
      .filter((r) => (currency === "all" ? true : r.currency === currency))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [tx, from, to, type, currency]);

  // KPIs
  const kpis = useMemo(() => {
    const ccy = currency === "all" ? (filtered[0]?.currency || "USD") : currency;
    const totalInvoices = filtered.filter((r) => r.type === "invoice").reduce((s, r) => s + (r.total || 0), 0);
    const totalPayments = filtered.filter((r) => r.type === "payment").reduce((s, r) => s + (r.total || 0), 0);
    const totalRefunds  = filtered.filter((r) => r.type === "refund").reduce((s, r) => s + (r.total || 0), 0);
    const net = totalPayments - totalRefunds;

    return {
      currency: ccy,
      count: filtered.length,
      invoices: totalInvoices,
      payments: totalPayments,
      refunds: totalRefunds,
      net,
    };
  }, [filtered, currency]);

  // Monthly buckets
  const monthly = useMemo(() => {
    const map = {};
    filtered.forEach((r) => {
      const d = parseDate(r.createdAt);
      if (!d) return;
      const key = monthKey(d);
      map[key] ||= { month: key, invoices: 0, payments: 0, refunds: 0, count: 0 };
      if (r.type === "invoice") map[key].invoices += r.total || 0;
      if (r.type === "payment") map[key].payments += r.total || 0;
      if (r.type === "refund")  map[key].refunds  += r.total || 0;
      map[key].count += 1;
    });
    return Object.values(map).sort((a, b) => (a.month < b.month ? -1 : 1));
  }, [filtered]);

  // PDF generation
  async function downloadPDF() {
    try {
      if (!filtered.length) return toast.error("No data in current filters");

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();

      // --- Header band
      drawHeader(doc, W, BRAND);

      // Logo (optional)
      if (BRAND.logo) {
        try {
          const img = await fetchAsDataUrl(BRAND.logo);
          doc.addImage(img, "PNG", 36, 30, 60, 60);
        } catch {}
      }

      // Title & dates
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(34, 34, 34);
      doc.text("Finance Transactions — Monthly Report", 36, 120);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(90);
      doc.text(`${BRAND.name}`, 36, 138);
      doc.text(`Period: ${format(from, "yyyy-MM-dd")} → ${format(to, "yyyy-MM-dd")}`, 36, 154);
      doc.text(`Filters: Type=${type.toUpperCase()} • Currency=${currency.toUpperCase()}`, 36, 170);

      // --- KPI strip
      const ccy = kpis.currency || "USD";
      const kpiY = 200;
      drawKPI(doc, 36,  kpiY, "Total Records", String(kpis.count));
      drawKPI(doc, 186, kpiY, "Invoices",      money(kpis.invoices, ccy));
      drawKPI(doc, 336, kpiY, "Payments",      money(kpis.payments, ccy));
      drawKPI(doc, 486, kpiY, "Refunds",       money(kpis.refunds, ccy));

      // Net line
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(40);
      doc.text(`Net Cashflow: ${money(kpis.net, ccy)}`, 36, 250);

      // --- Monthly bars
      const chartTop = 290;
      doc.setFontSize(12);
      doc.setTextColor(34);
      doc.text("Monthly Overview", 36, chartTop);

      drawMonthlyBars(doc, {
        x: 36,
        y: chartTop + 10,
        width: W - 72,
        height: 160,
        data: monthly,
        currency: ccy,
        primary: BRAND.primary,
        secondary: BRAND.secondary,
      });

      // --- Table (autoTable) — use function, not doc.autoTable
      doc.addPage();
      drawHeader(doc, W, BRAND);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(34);
      doc.text("Transactions Detail", 36, 100);

      const body = filtered.map((r) => [
        r.referenceID || r._id,
        (r.type || "").toUpperCase(),
        (r.status || "").toUpperCase(),
        r.currency || "",
        money(r.total || 0, r.currency || ccy),
        r.method || "-",
        r.gateway || "-",
        r.externalRef || "-",
        format(parseDate(r.createdAt) || new Date(), "yyyy-MM-dd HH:mm"),
      ]);

      autoTable(doc, { // <-- FIXED
        startY: 118,
        headStyles: { fillColor: hexToRgb(BRAND.primary), textColor: 255 },
        styles: { fontSize: 9, cellPadding: 6 },
        head: [[
          "Ref / ID",
          "Type",
          "Status",
          "CCY",
          "Total",
          "Method",
          "Gateway",
          "Ext. Ref",
          "Created At",
        ]],
        body,
        theme: "striped",
        alternateRowStyles: { fillColor: [248, 247, 251] },
        didDrawPage: () => drawFooter(doc, W, H, BRAND),
        margin: { left: 36, right: 36 },
      });

      doc.save(`FinanceReport_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`);
      toast.success("PDF exported");
    } catch (e) {
      console.error(e);
      toast.error("Failed to export PDF");
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      <Toaster position="top-right" />
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Finance Monthly Report</h1>
          <p className="text-sm text-neutral-500">
            Filter the window and export a polished PDF. Data from <code>/api/finance/transactions</code>.
          </p>
        </div>
        <button
          onClick={downloadPDF}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-white bg-gradient-to-r from-[#DA22FF] to-[#9733EE] hover:opacity-95"
          disabled={loading || !filtered.length}
        >
          <Download className="h-4 w-4" />
          Download PDF
        </button>
      </div>

      {/* Filters */}
      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <Labeled>
          <span className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700">
            <Calendar className="h-4 w-4" /> From
          </span>
          <input
            type="date"
            className="w-full rounded-lg border px-3 py-2"
            value={format(from, "yyyy-MM-dd")}
            onChange={(e) => setFrom(parseISO(`${e.target.value}T00:00:00`))}
          />
        </Labeled>

        <Labeled>
          <span className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700">
            <Calendar className="h-4 w-4" /> To
          </span>
          <input
            type="date"
            className="w-full rounded-lg border px-3 py-2"
            value={format(to, "yyyy-MM-dd")}
            onChange={(e) => setTo(parseISO(`${e.target.value}T23:59:59`))}
          />
        </Labeled>

        <Labeled>
          <span className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700">
            <Filter className="h-4 w-4" /> Type
          </span>
          <select className="w-full rounded-lg border px-3 py-2" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">All</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Labeled>

        <Labeled>
          <span className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700">
            <Wallet className="h-4 w-4" /> Currency
          </span>
          <select className="w-full rounded-lg border px-3 py-2" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {currencies.map((c) => (
              <option key={c} value={c}>{c.toUpperCase()}</option>
            ))}
          </select>
        </Labeled>

        <div className="flex items-end">
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 hover:bg-neutral-50"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-4">
        <KPI label="Records" value={kpis.count} />
        <KPI label="Invoices" value={money(kpis.invoices, kpis.currency)} />
        <KPI label="Payments" value={money(kpis.payments, kpis.currency)} />
        <KPI label="Refunds" value={money(kpis.refunds, kpis.currency)} />
        <KPI label="Net Cashflow" value={money(kpis.net, kpis.currency)} />
      </div>

      {/* Preview table */}
      <div className="mt-4 rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="text-left p-3">Ref / ID</th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Currency</th>
                <th className="text-left p-3">Total</th>
                <th className="text-left p-3">Method</th>
                <th className="text-left p-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {!loading && filtered.slice(0, 12).map((r) => (
                <tr key={r._id} className="border-t hover:bg-neutral-50/60">
                  <td className="p-3">{r.referenceID || r._id}</td>
                  <td className="p-3 uppercase">{r.type}</td>
                  <td className="p-3 uppercase">{r.status}</td>
                  <td className="p-3">{r.currency}</td>
                  <td className="p-3">{money(r.total, r.currency || kpis.currency)}</td>
                  <td className="p-3">{r.method || "-"}</td>
                  <td className="p-3">{format(parseDate(r.createdAt) || new Date(), "yyyy-MM-dd HH:mm")}</td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td className="p-6 text-center text-neutral-500" colSpan={7}>No data for current filters.</td></tr>
              )}
              {loading && (
                <tr><td className="p-6 text-center text-neutral-500" colSpan={7}>Loading…</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------- small UI bits ---------- */
function KPI({ label, value }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-2 text-xl font-semibold text-neutral-900">{value}</div>
    </div>
  );
}
function Labeled({ children }) {
  return <label className="grid gap-1">{children}</label>;
}

/* ---------- PDF helpers ---------- */

function drawHeader(doc, W, brand) {
  doc.setFillColor(...hexToRgb(brand.secondary));
  doc.rect(0, 0, W, 28, "F");
  doc.setFillColor(...hexToRgb(brand.primary));
  doc.rect(0, 28, W, 44, "F");
}

function drawFooter(doc, W, H, brand) {
  doc.setDrawColor(230);
  doc.line(36, H - 40, W - 36, H - 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110);
  const stamp = `Generated ${format(new Date(), "yyyy-MM-dd HH:mm")}  |  ${brand.footer}`;
  doc.text(stamp, 36, H - 20);
  doc.text(String(doc.getCurrentPageInfo().pageNumber), W - 36, H - 20, { align: "right" });
}

function drawKPI(doc, x, y, label, value) {
  doc.setFillColor(248, 247, 251);
  doc.roundedRect(x, y, 130, 40, 6, 6, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(label, x + 10, y + 16);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(30);
  doc.text(value, x + 10, y + 32);
}

function drawMonthlyBars(doc, { x, y, width, height, data, currency, primary, secondary }) {
  const left = x, top = y, right = x + width, bottom = y + height;
  doc.setDrawColor(230);
  doc.line(left, bottom, right, bottom);
  doc.line(left, top, left, bottom);

  const maxVal = Math.max(
    1,
    ...data.flatMap((d) => [d.invoices || 0, d.payments || 0, d.refunds || 0])
  );

  const barW = Math.max(12, Math.min(36, (width - 40) / Math.max(1, data.length) / 3));
  const gapGroup = Math.max(8, (width - 40) / Math.max(1, data.length) - 3 * barW);
  let cx = left + 20;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(90);

  data.forEach((d) => {
    doc.text(d.month, cx + barW, bottom + 12, { align: "center" });

    const hInv = (d.invoices / maxVal) * (height - 24);
    const hPay = (d.payments / maxVal) * (height - 24);
    const hRef = (d.refunds  / maxVal) * (height - 24);

    doc.setFillColor(...hexToRgb(secondary));
    doc.rect(cx, bottom - hInv, barW, hInv, "F");

    doc.setFillColor(...hexToRgb(primary));
    doc.rect(cx + barW + 2, bottom - hPay, barW, hPay, "F");

    doc.setFillColor(200, 200, 200);
    doc.rect(cx + 2 * (barW + 2), bottom - hRef, barW, hRef, "F");

    cx += 3 * (barW + 2) + gapGroup;
  });

  // Legend
  const ly = top - 6;
  let lx = right - 240;
  const items = [
    { label: "Invoices", color: hexToRgb(secondary) },
    { label: "Payments", color: hexToRgb(primary) },
    { label: "Refunds",  color: [200, 200, 200] },
  ];
  items.forEach((it) => {
    doc.setFillColor(...it.color);
    doc.rect(lx, ly, 10, 10, "F");
    doc.setTextColor(60);
    doc.text(it.label, lx + 14, ly + 9);
    lx += 90;
  });
}

function hexToRgb(hex) {
  const c = hex.replace("#", "");
  const bigint = parseInt(c, 16);
  return [ (bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255 ];
}

async function fetchAsDataUrl(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}
