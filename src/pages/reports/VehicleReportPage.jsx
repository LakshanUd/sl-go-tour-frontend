// src/pages/reports/VehicleReportPage.jsx
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
  vehicles: () => api.get("/api/reports/vehicles"),
};

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
          <div className="mt-2 flex items-center gap-1 text-sm">
            {trend > 0 ? (
              <>
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-green-600">+{trend}%</span>
              </>
            ) : (
              <>
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="text-red-600">{trend}%</span>
              </>
            )}
            <span className="text-neutral-500">vs last month</span>
          </div>
        )}
      </div>
    );
  }

  function VehicleCard({ vehicle, rank, isMost = true }) {
    return (
      <div className={`${CARD} p-4`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-neutral-500">#{rank}</span>
              <h3 className="font-semibold text-neutral-800">{vehicle.name}</h3>
              <span className={`px-2 py-1 rounded-full text-xs ${
                vehicle.status === 'Available' ? 'bg-green-100 text-green-700' :
                vehicle.status === 'Unavailable' ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {vehicle.status}
              </span>
            </div>
            <div className="text-sm text-neutral-600 mb-2">
              {vehicle.type} • {vehicle.category || 'Vehicle'}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3 text-blue-500" />
                <span>{vehicle.rentals} rentals</span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-green-500" />
                <span>LKR {Number(vehicle.revenue || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div className={`p-2 rounded-lg ${isMost ? 'bg-green-50' : 'bg-red-50'}`}>
            {isMost ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-3 rounded-xl ${GRAD_BG}`}>
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Vehicle Reports</h1>
            <p className="text-neutral-600">Most rented vehicles, least rented vehicles, and rental analytics</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
          title="Avg Rental Value"
          value={`LKR ${Number(reports.avgRentalValue || 0).toFixed(2)}`}
          icon={Clock}
          color="red"
        />
      </div>

      {/* Most Rented Vehicles */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className={`h-5 w-5 ${ICON_COLOR}`} />
          <h2 className="text-xl font-semibold text-neutral-900">Most Rented Vehicles</h2>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`${CARD} p-4 animate-pulse`}>
                <div className="h-4 bg-neutral-200 rounded mb-2"></div>
                <div className="h-3 bg-neutral-200 rounded mb-2"></div>
                <div className="h-3 bg-neutral-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : reports.mostRented?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.mostRented.slice(0, 6).map((vehicle, index) => (
              <VehicleCard
                key={vehicle._id || index}
                vehicle={vehicle}
                rank={index + 1}
                isMost={true}
              />
            ))}
          </div>
        ) : (
          <div className={`${CARD} p-8 text-center`}>
            <Car className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
            <p className="text-neutral-500">No rental data available</p>
          </div>
        )}
      </div>

      {/* Least Rented Vehicles */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className={`h-5 w-5 ${ICON_COLOR}`} />
          <h2 className="text-xl font-semibold text-neutral-900">Least Rented Vehicles</h2>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`${CARD} p-4 animate-pulse`}>
                <div className="h-4 bg-neutral-200 rounded mb-2"></div>
                <div className="h-3 bg-neutral-200 rounded mb-2"></div>
                <div className="h-3 bg-neutral-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : reports.leastRented?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.leastRented.slice(0, 6).map((vehicle, index) => (
              <VehicleCard
                key={vehicle._id || index}
                vehicle={vehicle}
                rank={index + 1}
                isMost={false}
              />
            ))}
          </div>
        ) : (
          <div className={`${CARD} p-8 text-center`}>
            <Car className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
            <p className="text-neutral-500">No rental data available</p>
          </div>
        )}
      </div>

      {/* Additional Analytics */}
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
  );
}