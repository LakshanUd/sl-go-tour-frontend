import { useEffect, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import {
  BarChart3,
  RefreshCcw,
  TrendingUp,
  TrendingDown,
  Car,
  Users,
  DollarSign,
  Clock,
  Download,
} from "lucide-react";
import { generateVehicleReportPDF } from "../../utils/pdfGenerator";

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
  vehicles: () => api.get("/api/reports/vehicles"),
};

function deduplicateVehicles(arr1 = [], arr2 = []) {
  const all = [...arr1, ...arr2];
  return all.filter((veh, idx, arr) =>
    idx === arr.findIndex(v =>
      veh._id ? v._id === veh._id : v.name === veh.name
    )
  );
}

function VehicleTable({ data }) {
  return (
    <div className={`${CARD} p-6 mb-8`}>
      <h3 className="text-lg font-semibold text-neutral-900 mb-4">All Vehicles (Most & Least Rented)</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="text-left p-3 font-medium">Vehicle Name</th>
              <th className="text-left p-3 font-medium">Type</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Rentals</th>
              <th className="text-left p-3 font-medium">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {data.map((vehicle, idx) => (
              <tr key={vehicle._id || idx} className="border-b border-neutral-100 hover:bg-neutral-50">
                <td className="p-3 font-medium text-neutral-800">{vehicle.name}</td>
                <td className="p-3">{vehicle.type || "-"}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    vehicle.status === 'Available' ? 'bg-green-100 text-green-700' :
                    vehicle.status === 'Unavailable' ? 'bg-red-100 text-red-700' :
                    vehicle.status === 'under_maintenance' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {vehicle.status || "-"}
                  </span>
                </td>
                <td className="p-3">{vehicle.rentals || 0}</td>
                <td className="p-3">LKR {Number(vehicle.revenue || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color = "blue" }) {
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
    </div>
  );
}

export default function VehicleReportPage() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState({
    mostRented: [],
    leastRented: [],
    totalVehicles: 0,
    totalRentals: 0,
    totalRevenue: 0,
    avgRentalValue: 0,
  });

  async function loadReports() {
    try {
      setLoading(true);
      const res = await ReportsAPI.vehicles();
      setReports(res.data);
    } catch (error) {
      console.error("Failed to load reports:", error);
      toast.error("Failed to load vehicle reports");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  // Deduplicate vehicles for the table
  const allVehicles = deduplicateVehicles(reports.mostRented, reports.leastRented);

  return (
    <div className="min-h-screen bg-neutral-50 pt-24">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Vehicle Reports</h1>
            <p className="text-neutral-600">Rental analytics, most/least rented vehicles, and maintenance load</p>
          </div>
          <div className="ml-auto flex gap-2">
            <button
              onClick={loadReports}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
            >
              <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={async () => {
                try {
                  await generateVehicleReportPDF(reports);
                  toast.success("PDF report downloaded successfully!");
                } catch (error) {
                  console.error("PDF generation failed:", error);
                  toast.error("Failed to generate PDF report");
                }
              }}
              disabled={loading || !reports.mostRented?.length}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white ${GRAD_BG} hover:opacity-90 disabled:opacity-50`}
            >
              <Download className="h-4 w-4" />
              Export PDF
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Vehicles"
            value={reports.totalVehicles || 0}
            icon={Car}
            color="blue"
          />
          <StatCard
            title="Total Rentals"
            value={reports.totalRentals || 0}
            icon={Users}
            color="green"
          />
          <StatCard
            title="Total Revenue"
            value={`LKR ${Number(reports.totalRevenue || 0).toFixed(2)}`}
            icon={DollarSign}
            color="purple"
          />
          <StatCard
            title="Maintenance Load"
            value={
              Array.isArray(reports.mostRented)
                ? reports.mostRented.filter(v => v.status === 'under_maintenance').length
                : 0
            }
            icon={Clock}
            color="red"
          />
        </div>

        {/* All Vehicles Table */}
        <VehicleTable data={allVehicles} />

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Vehicle Status Distribution */}
          <div className={`${CARD} p-6`}>
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Vehicle Status Overview</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Available</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-neutral-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '70%' }}></div>
                  </div>
                  <span className="text-sm font-medium">70%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Unavailable</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-neutral-200 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: '20%' }}></div>
                  </div>
                  <span className="text-sm font-medium">20%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Under Maintenance</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-neutral-200 rounded-full h-2">
                    <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '10%' }}></div>
                  </div>
                  <span className="text-sm font-medium">10%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Rental Performance */}
          <div className={`${CARD} p-6`}>
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Rental Performance</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Peak Rental Period</span>
                </div>
                <span className="text-sm text-green-600">Weekends</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Avg Rental Duration</span>
                </div>
                <span className="text-sm text-blue-600">3.2 days</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-800">Revenue per Vehicle</span>
                </div>
                <span className="text-sm text-purple-600">LKR 45,000</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}