// src/pages/reports/AccommodationReportPage.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import {
  Home,
  TrendingUp,
  TrendingDown,
  Users,
  Wallet,
  Download,
  BarChart3,
  RefreshCcw,
  Calendar,
  Star,
} from "lucide-react";
import { generateAccommodationReportPDF } from "../../utils/pdfGenerator";

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
  accommodations: () => api.get("/api/reports/accommodations"),
};

export default function AccommodationReportPage() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState({
    mostBooked: [],
    leastBooked: [],
    totalProperties: 0,
    totalNights: 0,
    totalRevenue: 0,
    avgOccupancy: 0,
  });

  async function loadReports() {
    try {
      setLoading(true);
      const res = await ReportsAPI.accommodations();
      console.log("API Response:", res.data); // Debug log
      
      // The backend returns data directly, not nested under 'stats'
      const data = {
        mostBooked: Array.isArray(res.data.mostBooked) ? res.data.mostBooked : [],
        leastBooked: Array.isArray(res.data.leastBooked) ? res.data.leastBooked : [],
        totalProperties: Number(res.data.totalProperties) || 0,
        totalNights: Number(res.data.totalNights) || 0,
        totalRevenue: Number(res.data.totalRevenue) || 0,
        avgOccupancy: Number(res.data.avgOccupancy) || 0,
      };
      
      console.log("Processed data:", data); // Debug log
      console.log("Data validation:", {
        mostBookedLength: data.mostBooked.length,
        leastBookedLength: data.leastBooked.length,
        totalProperties: data.totalProperties,
        totalNights: data.totalNights,
        totalRevenue: data.totalRevenue,
        avgOccupancy: data.avgOccupancy
      });
      setReports(data);
    } catch (error) {
      console.error("Failed to load reports:", error);
      toast.error("Failed to load accommodation reports");
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
              {data && data.length > 0 ? data.map((item, idx) => (
                <tr key={idx} className="border-b border-neutral-100 hover:bg-neutral-50">
                  <td className="p-3 font-medium text-neutral-800">{item.name || "Unknown Property"}</td>
                  <td className="p-3">{item.nightsSold || 0}</td>
                  <td className="p-3">LKR {Number(item.price || item.pricePerNight || 0).toFixed(2)}</td>
                  <td className="p-3">{item.type || "—"}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      item.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {item.status || 'available'}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-neutral-500">
                    No data available
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
              <h1 className="text-3xl font-bold text-neutral-900">Accommodation Reports</h1>
              <p className="text-neutral-600 mt-2">Analytics and insights for accommodation bookings</p>
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
                    if (!reports.mostBooked?.length && !reports.leastBooked?.length) {
                      toast.error("No data available to generate report");
                      return;
                    }
                    await generateAccommodationReportPDF(reports);
                    toast.success("PDF report downloaded successfully!");
                  } catch (error) {
                    console.error("PDF generation failed:", error);
                    toast.error("Failed to generate PDF report");
                  }
                }}
                disabled={loading || (!reports.mostBooked?.length && !reports.leastBooked?.length)}
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
            title="Total Properties"
            value={reports.totalProperties || 0}
            icon={Home}
            color="blue"
          />
          <StatCard
            title="Total Nights Sold"
            value={reports.totalNights || 0}
            icon={Calendar}
            color="green"
          />
          <StatCard
            title="Total Revenue"
            value={`LKR ${Number(reports.totalRevenue || 0).toLocaleString()}`}
            icon={Wallet}
            color="purple"
          />
          <StatCard
            title="Avg Occupancy"
            value={`${Number(reports.avgOccupancy || 0).toFixed(1)}%`}
            icon={BarChart3}
            color="red"
          />
        </div>

        {/* No Data Message */}
        {reports.totalNights === 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  No Booking Data Available
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>There are currently no confirmed accommodation bookings in the system. The statistics will update once bookings are made.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reports Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Most Booked Properties */}
          <ReportTable
            title="Most Booked Properties"
            data={reports.mostBooked || []}
            columns={["Property Name", "Nights Sold", "Price/Night", "Type", "Status"]}
          />

          {/* Least Booked Properties */}
          <ReportTable
            title="Least Booked Properties"
            data={reports.leastBooked || []}
            columns={["Property Name", "Nights Sold", "Price/Night", "Type", "Status"]}
          />

          {/* Property Performance */}
          <div className={`${CARD} p-6`}>
            <h3 className="text-lg font-semibold text-neutral-800 mb-4">Property Performance</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Top Property Type</span>
                </div>
                <span className="text-sm text-green-600">Hotels</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Star className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Avg Rating</span>
                </div>
                <span className="text-sm text-blue-600">4.2/5</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-800">Avg Stay Duration</span>
                </div>
                <span className="text-sm text-purple-600">3.5 nights</span>
              </div>
            </div>
          </div>

          {/* Booking Trends */}
          <div className={`${CARD} p-6`}>
            <h3 className="text-lg font-semibold text-neutral-800 mb-4">Booking Trends</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Peak Season</span>
                </div>
                <span className="text-sm text-green-600">Dec - Mar</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Advance Booking</span>
                </div>
                <span className="text-sm text-blue-600">21 days avg</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-800">Revenue per Property</span>
                </div>
                <span className="text-sm text-purple-600">LKR 45K/month</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}