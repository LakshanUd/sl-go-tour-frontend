import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import toast, { Toaster } from "react-hot-toast";
import {
  Calendar,
  Download,
  TrendingUp,
  Users,
  Coins,
  Receipt,
  Sparkles,
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

/* ---------- Theme ---------- */
const GRAD_BG = `bg-gradient-to-r from-[#DA22FF] to-[#9733EE]`;
const CARD = "rounded-2xl border border-neutral-200 bg-white shadow-sm";

/* ---------- API base ---------- */
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

/* ---------- Helper: Date Range ---------- */
function buildMonthRange(year, monthIdx0) {
  const from = startOfMonth(new Date(year, monthIdx0, 1));
  const to = endOfMonth(from);
  return { from, to };
}

/* ---------- Colors for charts ---------- */
const ROLE_COLORS = [
  "#7C3AED", "#0EA5E9", "#22C55E", "#F97316", "#EF4444",
  "#8B5CF6", "#06B6D4", "#84CC16", "#F59E0B", "#F43F5E",
];

/* ---------- Page ---------- */
export default function MonthlyReport() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0..11
  const [loading, setLoading] = useState(true);

  // Data
  const [summary, setSummary] = useState({
    revenue: 0,
    invoices: 0,
    payments: 0,
    refunds: 0,
  });
  const [revenueDaily, setRevenueDaily] = useState([]); // [{date, amount}]
  const [usersByRole, setUsersByRole] = useState([]);   // [{role, count}]
  const [highlights, setHighlights] = useState({
    newUsers: 0,
    activeUsers: 0,
    bookings: 0,
  });

  // PDF ref
  const pdfRef = useRef(null);

  // Load data for month
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { from, to } = buildMonthRange(year, month);

        const fromISO = from.toISOString();
        const toISO = to.toISOString();

        // ---- Finance summary for month
        // Expect backend route you already have (based on previous work):
        // GET /api/finance/summary?from=ISO&to=ISO
        // -> { totalRevenue, invoiceCount, paymentCount, refundCount, revenueByDay: [{date, amount}] }
        const fin = await api.get("/api/finance/summary", { params: { from: fromISO, to: toISO } })
          .catch(() => ({ data: {} }));
        const finData = fin?.data || {};

        // ---- Users for role breakdown and highlights
        // GET /api/user (array); we derive counts for month
        const usr = await api.get("/api/user").catch(() => ({ data: [] }));
        const allUsers = Array.isArray(usr.data) ? usr.data : (usr.data?.users || []);

        // New users in month
        const newUsers = allUsers.filter(u => u.createdAt && new Date(u.createdAt) >= startOfMonth(from) && new Date(u.createdAt) <= to).length;
        // Active users (if status field exists, else assume active)
        const activeUsers = allUsers.filter(u => (u.status || "active") === "active").length;

        // Users by role (all-time snapshot)
        const roleMap = new Map();
        allUsers.forEach(u => {
          const r = u.role || "Customer";
          roleMap.set(r, (roleMap.get(r) || 0) + 1);
        });
        const byRole = Array.from(roleMap.entries()).map(([role, count]) => ({ role, count }));

        // ---- Bookings for month (optional)
        // If you have bookings endpoint like GET /api/booking?from&to or /api/bookings:
        // We’ll compute quick count for the month, fallback 0 if missing.
        let bookingCount = 0;
        try {
          const bk = await api.get("/api/booking", { params: { from: fromISO, to: toISO } });
          const bks = Array.isArray(bk.data) ? bk.data : (bk.data?.bookings || []);
          bookingCount = bks.length;
        } catch {
          bookingCount = 0;
        }

        const days = eachDayOfInterval({ start: startOfMonth(from), end: to });
        const dailyTemplate = days.map(d => ({ date: format(d, "MMM d"), amount: 0 }));
        const revenueByDay = Array.isArray(finData.revenueByDay) ? finData.revenueByDay : [];
        // Merge server daily revenue with template (ensures bars exist for all days)
        const merged = dailyTemplate.map(dt => {
          const hit = revenueByDay.find(r => {
            const rd = new Date(r.date);
            return format(rd, "MMM d") === dt.date;
          });
          return { ...dt, amount: hit ? Number(hit.amount || 0) : 0 };
        });

        setSummary({
          revenue: Number(finData.totalRevenue || 0),
          invoices: Number(finData.invoiceCount || 0),
          payments: Number(finData.paymentCount || 0),
          refunds: Number(finData.refundCount || 0),
        });
        setRevenueDaily(merged);
        setUsersByRole(byRole);
        setHighlights({
          newUsers,
          activeUsers,
          bookings: bookingCount,
        });
      } catch (e) {
        console.error(e);
        toast.error("Failed to load monthly report");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [year, month]);

  // Total days & month label
  const monthLabel = useMemo(() => format(new Date(year, month, 1), "MMMM yyyy"), [year, month]);

  // PDF export: capture the report container (A4-friendly)
  async function exportPDF() {
  try {
    const el = pdfRef.current;
    if (!el) {
      toast.error("Report container not found");
      return;
    }

    // Wait a tick to ensure charts finished rendering
    await new Promise((r) => setTimeout(r, 250));

    // Force a white background and stable width for consistent capture
    const originalBg = el.style.backgroundColor;
    const originalWidth = el.style.width;
    el.style.backgroundColor = "#ffffff";
    // A4 width at 96dpi ~ 794px; keeps raster scale reasonable and prevents huge canvases
    el.style.width = "794px";

    const canvas = await html2canvas(el, {
      scale: Math.min(2, window.devicePixelRatio || 1.5), // guard memory
      backgroundColor: "#ffffff",
      useCORS: true,         // allow cross-origin images (if they set proper headers)
      allowTaint: false,     // safer default
      logging: false,
      windowWidth: el.scrollWidth,
      windowHeight: el.scrollHeight,
    });

    // Restore styles
    el.style.backgroundColor = originalBg;
    el.style.width = originalWidth;

    const imgData = canvas.toDataURL("image/png");

    // A4 portrait (mm)
    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();   // 210
    const pageH = pdf.internal.pageSize.getHeight();  // 297
    const margin = 10;

    // Calculate image dimensions to fit page width
    const imgW = pageW - margin * 2;
    const imgH = (canvas.height * imgW) / canvas.width;

    // Header
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    const title = `Monthly Report — ${monthLabel}`;
    pdf.text(title, margin, 12);
    pdf.setDrawColor(151, 51, 238);
    pdf.setLineWidth(0.7);
    pdf.line(margin, 14.5, pageW - margin, 14.5);

    let y = 18;
    const usableH = pageH - y - margin; // remaining height on first page

    if (imgH <= usableH) {
      // Single page
      pdf.addImage(imgData, "PNG", margin, y, imgW, imgH, undefined, "FAST");
    } else {
      // Multi-page: slice the tall image into page-sized chunks
      let remainingH = imgH;
      let srcY = 0;

      // Create an offscreen canvas that represents one PDF page slice (in source pixel space)
      const sliceHpx = Math.floor((usableH * canvas.width) / imgW);
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHpx;
      const ctx = pageCanvas.getContext("2d");

      // First page header already placed, so we draw the first slice at current page
      while (remainingH > 0) {
        ctx.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(
          canvas,
          0, srcY, canvas.width, sliceHpx,
          0, 0, pageCanvas.width, pageCanvas.height
        );

        const pageImg = pageCanvas.toDataURL("image/png");
        pdf.addImage(pageImg, "PNG", margin, y, imgW, usableH, undefined, "FAST");

        remainingH -= usableH;
        srcY += sliceHpx;

        if (remainingH > 0) {
          pdf.addPage();
          // Repeat the header on each page
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(14);
          pdf.text(title, margin, 12);
          pdf.setDrawColor(151, 51, 238);
          pdf.setLineWidth(0.7);
          pdf.line(margin, 14.5, pageW - margin, 14.5);
          y = 18;
        }
      }
    }

    pdf.save(`Monthly_Report_${format(new Date(year, month, 1), "yyyy_MM")}.pdf`);
    toast.success("PDF downloaded");
  } catch (e) {
    console.error("exportPDF error:", e);
    toast.error("Failed to export PDF");
  }
}


  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#DA22FF] to-[#9733EE]">Monthly</span> Report
          </h2>
          <p className="text-sm text-neutral-500">Beautiful, print-ready analytics for {monthLabel}.</p>
          <p className="text-[10px] text-neutral-400 mt-1">
            Finance: <span className="font-mono">{BASE}/api/finance/summary</span> · Users: <span className="font-mono">{BASE}/api/user</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2">
            <Calendar className="h-4 w-4 text-[#9733EE]" />
            <select
              className="outline-none text-sm"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i} value={i}>{format(new Date(2024, i, 1), "MMMM")}</option>
              ))}
            </select>
            <select
              className="outline-none text-sm"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {Array.from({ length: 6 }).map((_, idx) => {
                const y = new Date().getFullYear() - (5 - idx);
                return <option key={y} value={y}>{y}</option>;
              })}
            </select>
          </div>

          <button
            onClick={exportPDF}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white ${GRAD_BG} hover:opacity-95 active:opacity-90`}
          >
            <Download className="h-4 w-4" />
            Download PDF
          </button>
        </div>
      </div>

      {/* Report Content */}
      <div ref={pdfRef} className="space-y-6">
        {/* Hero strip */}
        <div className={`rounded-2xl p-[1px] ${GRAD_BG}`}>
          <div className="rounded-2xl bg-white">
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-[#9733EE]" />
                <div>
                  <div className="text-sm text-neutral-500">Report Period</div>
                  <div className="text-lg font-semibold">{monthLabel}</div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <MiniStat icon={<Coins className="h-4 w-4" />} label="Revenue" value={formatCurrency(summary.revenue)} />
                <MiniStat icon={<Receipt className="h-4 w-4" />} label="Invoices" value={summary.invoices} />
                <MiniStat icon={<TrendingUp className="h-4 w-4" />} label="Payments" value={summary.payments} />
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={<Coins className="h-5 w-5 text-[#9733EE]" />} label="Total Revenue" value={formatCurrency(summary.revenue)} />
          <KpiCard icon={<Receipt className="h-5 w-5 text-[#9733EE]" />} label="Invoices" value={summary.invoices} />
          <KpiCard icon={<TrendingUp className="h-5 w-5 text-[#9733EE]" />} label="Payments" value={summary.payments} />
          <KpiCard icon={<Users className="h-5 w-5 text-[#9733EE]" />} label="New Users" value={highlights.newUsers} />
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-3 gap-4">
          <div className={`${CARD} lg:col-span-2`}>
            <div className="p-4 border-b">
              <div className="font-medium">Revenue by Day</div>
              <p className="text-xs text-neutral-500">Daily paid revenue in {monthLabel}</p>
            </div>
            <div className="h-64 px-4 py-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueDaily}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <RTooltip formatter={(v) => formatCurrency(v)} />
                  <Bar dataKey="amount" fill="#9733EE" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={CARD}>
            <div className="p-4 border-b">
              <div className="font-medium">Users by Role</div>
              <p className="text-xs text-neutral-500">Current distribution</p>
            </div>
            <div className="h-64 px-2 py-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={usersByRole}
                    dataKey="count"
                    nameKey="role"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {usersByRole.map((_, i) => (
                      <Cell key={i} fill={ROLE_COLORS[i % ROLE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <RTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Highlights */}
        <div className={CARD}>
          <div className="p-4 border-b">
            <div className="font-medium">Highlights</div>
            <p className="text-xs text-neutral-500">Key stats that matter</p>
          </div>
          <div className="p-4 grid sm:grid-cols-3 gap-4">
            <Highlight label="Active Users" value={highlights.activeUsers} />
            <Highlight label="New Users This Month" value={highlights.newUsers} />
            <Highlight label="Bookings This Month" value={highlights.bookings} />
          </div>
        </div>
      </div>

      {/* Footer spacing for on-screen */}
      <div className="h-6" />
    </div>
  );
}

/* ---------- UI bits ---------- */
function KpiCard({ icon, label, value }) {
  return (
    <div className={`${CARD} p-4`}>
      <div className="flex items-center gap-3">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100">
          {icon}
        </div>
        <div>
          <div className="text-xs text-neutral-500">{label}</div>
          <div className="text-lg font-semibold">{value}</div>
        </div>
      </div>
    </div>
  );
}
function MiniStat({ icon, label, value }) {
  return (
    <div className="text-right">
      <div className="text-xs text-neutral-500 flex items-center gap-1 justify-end">
        {icon}
        {label}
      </div>
      <div className="text-base font-semibold">{value}</div>
    </div>
  );
}
function Highlight({ label, value }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

/* ---------- utils ---------- */
function formatCurrency(n) {
  const v = Number(n || 0);
  return v.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
