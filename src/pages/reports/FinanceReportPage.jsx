// src/pages/reports/FinanceReportPage.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Download,
  PieChart,
  Calendar,
  Target,
} from "lucide-react";
import { generateFinanceReportPDF } from "../../utils/pdfGenerator";

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
  finance: () => api.get("/api/reports/finance"),
};

export default function FinanceReportPage() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState({
    topRevenueProducts: [],
    lowestRevenueProducts: [],
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMargin: 0,
  });

  async function loadReports() {
    try {
      setLoading(true);
      const res = await ReportsAPI.finance();
      setReports(res.data);
    } catch (error) {
      console.error("Failed to load reports:", error);
      toast.error("Failed to load finance reports");
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
                  <td className="p-3 font-medium text-neutral-800">{item.name || item.product}</td>
                  <td className="p-3">LKR {Number(item.revenue || 0).toFixed(2)}</td>
                  <td className="p-3">{item.orders || item.count || 0}</td>
                  <td className="p-3">{item.category || "—"}</td>
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
              <h1 className="text-3xl font-bold text-neutral-900">Finance Reports</h1>
              <p className="text-neutral-600 mt-2">Analytics and insights for financial performance</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadReports}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-700 font-medium hover:bg-neutral-50"
              >
                <BarChart3 className="h-4 w-4" />
                Refresh Reports
              </button>
              <button
                onClick={async () => {
                  try {
                    await generateFinanceReportPDF(reports);
                    toast.success("PDF report downloaded successfully!");
                  } catch (error) {
                    console.error("PDF generation failed:", error);
                    toast.error("Failed to generate PDF report");
                  }
                }}
                disabled={loading || !reports.topRevenueProducts?.length}
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
            title="Total Revenue"
            value={`LKR ${Number(reports.totalRevenue || 0).toLocaleString()}`}
            icon={DollarSign}
            color="green"
          />
          <StatCard
            title="Total Expenses"
            value={`LKR ${Number(reports.totalExpenses || 0).toLocaleString()}`}
            icon={TrendingDown}
            color="red"
          />
          <StatCard
            title="Net Profit"
            value={`LKR ${Number(reports.netProfit || 0).toLocaleString()}`}
            icon={TrendingUp}
            color="blue"
          />
          <StatCard
            title="Profit Margin"
            value={`${Number(reports.profitMargin || 0).toFixed(1)}%`}
            icon={BarChart3}
            color="purple"
          />
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Revenue Products */}
          <ReportTable
            title="Top Revenue Products"
            data={reports.topRevenueProducts || []}
            columns={["Product", "Revenue", "Orders", "Category", "Status"]}
          />

          {/* Lowest Revenue Products */}
          <ReportTable
            title="Lowest Revenue Products"
            data={reports.lowestRevenueProducts || []}
            columns={["Product", "Revenue", "Orders", "Category", "Status"]}
          />

          {/* Financial Performance */}
          <div className={`${CARD} p-6`}>
            <h3 className="text-lg font-semibold text-neutral-800 mb-4">Financial Performance</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Revenue Growth</span>
                </div>
                <span className="text-sm text-green-600">+12.5%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <PieChart className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Top Category</span>
                </div>
                <span className="text-sm text-blue-600">Tour Packages</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-800">ROI</span>
                </div>
                <span className="text-sm text-purple-600">18.2%</span>
              </div>
            </div>
          </div>

          {/* Revenue Trends */}
          <div className={`${CARD} p-6`}>
            <h3 className="text-lg font-semibold text-neutral-800 mb-4">Revenue Trends</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Peak Month</span>
                </div>
                <span className="text-sm text-green-600">December</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Avg Transaction</span>
                </div>
                <span className="text-sm text-blue-600">LKR 15,500</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-800">Monthly Target</span>
                </div>
                <span className="text-sm text-purple-600">LKR 500K</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
