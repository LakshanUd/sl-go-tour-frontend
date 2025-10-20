// src/pages/reports/TourPackageReportPage.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import {
  BarChart3,
  RefreshCcw,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  Wallet,
  Package,
  Download,
} from "lucide-react";
import { generateTourPackageReportPDF } from "../../utils/pdfGenerator";

/* ---------- Theme ---------- */
const GRAD_FROM = "from-[#09E65A]";
const GRAD_TO = "to-[#16A34A]";
const GRAD_BG = `bg-gradient-to-r ${GRAD_FROM} ${GRAD_TO}`;
const ICON_COLOR = "text-[#16A34A]";
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
  tourPackages: () => api.get("/api/reports/tour-packages"),
  bookings: () => api.get("/api/reports/bookings"),
};

export default function TourPackageReportPage() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState({
    mostBooked: [],
    leastBooked: [],
    topRevenue: [],
  });

  async function loadReports() {
    try {
      setLoading(true);
      const res = await ReportsAPI.tourPackages();
      setReports(res.data);
    } catch (error) {
      console.error("Failed to load reports:", error);
      toast.error("Failed to load tour package reports");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

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
        {trend && (
          <div className="mt-4 flex items-center">
            <span className={`text-sm ${trend > 0 ? "text-green-600" : "text-red-600"}`}>
              {trend > 0 ? "+" : ""}{trend}%
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
                  <td className="p-3 font-medium text-neutral-800">{item.name}</td>
                  <td className="p-3">{item.bookings || item.count || 0}</td>
                  <td className="p-3">LKR {Number(item.revenue || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="p-3">{item.duration || "—"}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      item.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {item.status || 'active'}
                    </span>
                  </td>
                </tr>
              ))}
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
              <h1 className="text-3xl font-bold text-neutral-900">Tour Package Reports</h1>
              <p className="text-neutral-600 mt-2">Analytics and insights for tour packages</p>
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
                    await generateTourPackageReportPDF(reports);
                    toast.success("PDF report downloaded successfully!");
                  } catch (error) {
                    console.error("PDF generation failed:", error);
                    toast.error("Failed to generate PDF report");
                  }
                }}
                disabled={loading || !reports.mostBooked?.length}
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
            title="Total Packages"
            value={reports.totalPackages || 0}
            icon={Package}
            color="blue"
          />
          <StatCard
            title="Total Bookings"
            value={reports.totalBookings || 0}
            icon={Users}
            color="green"
          />
          <StatCard
            title="Total Revenue"
            value={`LKR ${Number(reports.totalRevenue || 0).toLocaleString()}`}
            icon={Wallet}
            color="purple"
          />
          <StatCard
            title="Avg Booking Rate"
            value={`${Number(reports.avgBookingRate || 0).toFixed(1)}%`}
            icon={BarChart3}
            color="red"
          />
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Most Booked Packages */}
          <ReportTable
            title="Most Booked Packages"
            data={reports.mostBooked || []}
            columns={["Package Name", "Bookings", "Revenue", "Duration", "Status"]}
          />

          {/* Least Booked Packages */}
          <ReportTable
            title="Least Booked Packages"
            data={reports.leastBooked || []}
            columns={["Package Name", "Bookings", "Revenue", "Duration", "Status"]}
          />

          {/* Top Revenue Packages */}
          <ReportTable
            title="Top Revenue Packages"
            data={reports.topRevenue || []}
            columns={["Package Name", "Bookings", "Revenue", "Duration", "Status"]}
          />

          {/* Booking Trends */}
          <div className={`${CARD} p-6`}>
            <h3 className="text-lg font-semibold text-neutral-800 mb-4">Booking Trends</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Peak Season</span>
                </div>
                <span className="text-sm text-green-600">Dec - Mar</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Average Booking</span>
                </div>
                <span className="text-sm text-blue-600">15 days advance</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-800">Group Size</span>
                </div>
                <span className="text-sm text-purple-600">4.2 people avg</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}