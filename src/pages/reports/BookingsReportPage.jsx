// src/pages/reports/BookingsReportPage.jsx
import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import {
  Calendar,
  TrendingUp,
  Users,
  DollarSign,
  Download,
  BarChart3,
  RefreshCcw,
  Clock,
} from "lucide-react";
import { generateBookingReportPDF } from "../../utils/pdfGenerator";

/* ---------- Theme ---------- */
const GRAD_FROM = "from-[#09E65A]";
const GRAD_TO = "to-[#16A34A]";
const GRAD_BG = `bg-gradient-to-r ${GRAD_FROM} ${GRAD_TO}`;
const CARD = "rounded-xl border border-neutral-200 bg-white shadow-sm";

/* ---------- API Setup ---------- */
const RAW_BASE =
  (import.meta.env?.VITE_BACKEND_URL || "").toString() ||
  (import.meta.env?.VITE_API_URL || "").toString() ||
  "http://localhost:5000";
const BASE = RAW_BASE.replace(/\/+$/, "");
const api = axios.create({ baseURL: BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      "Request failed";
    toast.error(msg);
    return Promise.reject(err);
  }
);

const ReportsAPI = {
  bookings: () => api.get("/api/reports/bookings"),
};

const BookingAPI = {
  list: () => api.get("/api/bookings"),
};

/* ---------- helpers (mirror Admin page behavior) ---------- */
function totalAmount(b) {
  return (
    b?.grandTotal ??
    b?.totals?.grandTotal ??
    b?.total ??
    b?.amount ??
    (Array.isArray(b?.items)
      ? b.items.reduce(
          (s, it) => s + Number(it.lineTotal || it.total || it.price || 0),
          0
        )
      : 0)
  );
}

function displayCustomer(cust, custNameFallback) {
  if (!cust && !custNameFallback) return "–";
  if (cust?.firstName && cust?.lastName) {
    return `${cust.firstName} ${cust.lastName}`;
  }
  return cust?.name || custNameFallback || "–";
}

function displayDate(b) {
  const d = b?.createdAt || b?.date;
  return d ? new Date(d).toLocaleString() : "-";
}

function statusPillCls(s) {
  return [
    "px-2 py-1 rounded-full text-xs",
    s === "confirmed"
      ? "bg-green-100 text-green-700"
      : s === "pending"
      ? "bg-yellow-100 text-yellow-700"
      : s === "cancelled"
      ? "bg-rose-100 text-rose-700"
      : "bg-gray-100 text-gray-700",
  ].join(" ");
}

export default function BookingsReportPage() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState({
    busiestDates: [],
    quietestDates: [],
    totalBookings: 0,
    totalRevenue: 0,
    avgBookingValue: 0,
    conversionRate: 0,
  });
  const [bookingList, setBookingList] = useState([]);

  async function loadReports() {
    try {
      setLoading(true);
      const res = await ReportsAPI.bookings();
      setReports(res.data);
    } catch (error) {
      console.error("Failed to load reports:", error);
      toast.error("Failed to load booking reports");
    } finally {
      setLoading(false);
    }
  }

  async function loadBookingList() {
    try {
      const res = await BookingAPI.list();
      setBookingList(Array.isArray(res.data) ? res.data : res.data.bookings || []);
    } catch (error) {
      console.error("Failed to load booking list:", error);
      toast.error("Failed to load booking list");
    }
  }

  useEffect(() => {
    loadReports();
    loadBookingList();
  }, []);

  const totalRevenueFromList = useMemo(
    () => bookingList.reduce((s, b) => s + Number(totalAmount(b) || 0), 0),
    [bookingList]
  );

  function StatCard({ title, value, icon: Icon, trend, color = "blue" }) {
    const colorClasses = {
      blue: "text-blue-600 bg-blue-50",
      green: "text-green-600 bg-green-50",
      red: "text-red-600 bg-red-50",
      purple: "text-purple-600 bg-purple-50",
    };

    return (
      <div className={`${CARD} p-6`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-600">{title}</p>
            <p className="text-2xl font-bold text-neutral-900">{value}</p>
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
        {typeof trend === "number" && (
          <div className="mt-4 flex items-center">
            <span className={`text-sm ${trend > 0 ? "text-green-600" : "text-red-600"}`}>
              {trend > 0 ? "+" : ""}
              {trend}%
            </span>
            <span className="text-sm text-neutral-500 ml-2">vs last month</span>
          </div>
        )}
      </div>
    );
  }

  function ReportTable({ title, data, columns }) {
    return (
      <div className={`${CARD} p-6`}>
        <h3 className="text-lg font-semibold text-neutral-800 mb-4">{title}</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                {columns.map((col, idx) => (
                  <th key={idx} className="text-left p-3 font-medium">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((item, idx) => (
                <tr key={idx} className="border-b border-neutral-100 hover:bg-neutral-50">
                  <td className="p-3 font-medium text-neutral-800">
                    {item.date || item.period}
                  </td>
                  <td className="p-3">{item.bookings || item.count || 0}</td>
                  <td className="p-3">LKR {Number(item.revenue || 0).toFixed(2)}</td>
                  <td className="p-3">{item.passengers || item.customers || 0}</td>
                  <td className="p-3">
                    <span className={statusPillCls(item.status || "confirmed")}>
                      {item.status || "confirmed"}
                    </span>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td className="p-4 text-neutral-500" colSpan={columns.length}>
                    No data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function BookingListTable({ data }) {
    return (
      <div className={`${CARD} p-6 mb-6`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-neutral-800">All Bookings</h3>
          <div className="rounded-full border px-3 py-1.5 text-xs bg-neutral-50">
            Gross:{" "}
            <span className="font-semibold">
              LKR {totalRevenueFromList.toFixed(2)}
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="text-left p-3 font-medium">Booking ID</th>
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Customer</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.map((b, idx) => {
                const id = b._id || b.bookingID || b.bookingId || idx;
                const name = displayCustomer(b.customer, b.customerName);
                const amt = Number(totalAmount(b) || 0);
                const dateStr = displayDate(b);
                const st = String(b.status || "confirmed").toLowerCase();

                return (
                  <tr key={id} className="border-b border-neutral-100 hover:bg-neutral-50">
                    <td className="p-3 font-medium text-neutral-800">
                      {b.bookingID || b.bookingId || b._id}
                    </td>
                    <td className="p-3">{dateStr}</td>
                    <td className="p-3">{name}</td>
                    <td className="p-3">
                      <span className={statusPillCls(st)}>{st}</span>
                    </td>
                    <td className="p-3">LKR {amt.toFixed(2)}</td>
                  </tr>
                );
              })}
              {data.length === 0 && (
                <tr>
                  <td className="p-4 text-neutral-500" colSpan={5}>
                    No bookings.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 pt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#16A34A] mx-auto"></div>
              <p className="mt-4 text-neutral-600">Loading reports...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 pt-24">
      <Toaster position="top-right" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">Booking Reports</h1>
              <p className="text-neutral-600 mt-2">
                Analytics and insights for booking patterns
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadReports}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-700 font-medium hover:bg-neutral-50"
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh Reports
              </button>
              <button
                onClick={async () => {
                  try {
                    // IMPORTANT: include a unique _id OR a 'date' field to avoid dedupe collapsing to one row
                    const normalized = bookingList.map((b, idx) => ({
                      _id: b._id || b.bookingID || b.bookingId || String(idx), // ensures uniqueness for dedupe
                      bookingId: b.bookingID || b.bookingId || b._id,
                      name: displayCustomer(b.customer, b.customerName),
                      status: String(b.status || "confirmed"),
                      amount: Number(totalAmount(b) || 0),
                      createdAt: b.createdAt || b.date || null,
                      date: b.createdAt || b.date || null, // provide 'date' too (generator dedupes by _id OR date)
                    }));

                    await generateBookingReportPDF({
                      totalBookings: bookingList.length,
                      totalRevenue: totalRevenueFromList,
                      allBookings: normalized, // send ALL normalized bookings
                      // keep other fields empty to avoid accidental dedupe noise
                      busiestDates: [],
                      quietestDates: [],
                    });

                    toast.success("PDF report downloaded successfully!");
                  } catch (error) {
                    console.error("PDF generation failed:", error);
                    toast.error("Failed to generate PDF report");
                  }
                }}
                disabled={loading || bookingList.length === 0}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium ${GRAD_BG} hover:opacity-90 disabled:opacity-50`}
              >
                <Download className="h-4 w-4" />
                Export PDF
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Bookings"
            value={reports.totalBookings || 0}
            icon={Calendar}
            color="blue"
          />
          <StatCard
            title="Total Revenue"
            value={`LKR ${Number(
              reports.totalRevenue || totalRevenueFromList || 0
            ).toLocaleString()}`}
            icon={DollarSign}
            color="green"
          />
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* All Bookings Table (from /api/bookings) */}
          <div className="col-span-2">
            <BookingListTable data={bookingList} />
          </div>

          {/* Busiest Travel Dates */}
          <ReportTable
            title="Busiest Travel Dates"
            data={reports.busiestDates || []}
            columns={["Date", "Bookings", "Revenue", "Passengers", "Status"]}
          />

          {/* Quietest Dates */}
          <ReportTable
            title="Quietest Dates"
            data={reports.quietestDates || []}
            columns={["Date", "Bookings", "Revenue", "Passengers", "Status"]}
          />

          {/* Booking Patterns */}
          <div className={`${CARD} p-6`}>
            <h3 className="text-lg font-semibold text-neutral-800 mb-4">
              Booking Patterns
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    Peak Season
                  </span>
                </div>
                <span className="text-sm text-green-600">Dec - Mar</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    Advance Booking
                  </span>
                </div>
                <span className="text-sm text-blue-600">21 days avg</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-800">
                    Group Size
                  </span>
                </div>
                <span className="text-sm text-purple-600">4.2 people</span>
              </div>
            </div>
          </div>

          {/* Revenue Insights */}
          <div className={`${CARD} p-6`}>
            <h3 className="text-lg font-semibold text-neutral-800 mb-4">
              Revenue Insights
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    Revenue Growth
                  </span>
                </div>
                <span className="text-sm text-green-600">+15.2%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    Top Package
                  </span>
                </div>
                <span className="text-sm text-blue-600">Cultural Tour</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-800">
                    Avg Revenue/Day
                  </span>
                </div>
                <span className="text-sm text-purple-600">LKR 25K</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
