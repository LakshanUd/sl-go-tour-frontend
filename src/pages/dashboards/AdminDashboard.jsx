// src/pages/dashboards/AdminDashboard.jsx
import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import {
  LayoutDashboard,
  Users,
  Wallet,
  CalendarDays,
  FileText,
  BarChart3,
  ArrowRight,
  ChevronRight,
  RefreshCcw,
  TrendingUp,
  ChevronUp,
  MapPin,
  UtensilsCrossed,
  Hotel,
  Truck,
  MessageSquare,
  AlertCircle,
  Boxes,
  UserCog,
  Bot,
  Eye,
  DollarSign,
  Activity,
  Clock,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

/* Gradient tokens */
const GRAD_FROM = "from-[#09E65A]";
const GRAD_TO = "to-[#16A34A]";
const GRAD_BG = `bg-gradient-to-r ${GRAD_FROM} ${GRAD_TO}`;
const ICON_COLOR = "text-[#16A34A]";

/* LocalStorage key for persisting accordion state */
const LS_KEY = "adminSidebarOpen";

/* API Setup */
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

/* Chart Colors */
const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Dashboard data state
  const [dashboardData, setDashboardData] = useState({
    stats: {
      totalUsers: 0,
      totalBookings: 0,
      totalRevenue: 0,
      totalBlogViews: 0,
    },
    recentBookings: [],
    userGrowth: [],
    revenueData: [],
    topCountries: [],
    blogStats: [],
    financeSummary: {},
  });

  // --- accordion open/close state (persisted; never auto-changed by route) ---
  const [open, setOpen] = useState({
    overview: true,
    content: true,
    ops: true,
    reports: true,
    account: true,
  });

  // Load persisted state once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setOpen((s) => ({
          overview: typeof parsed.overview === "boolean" ? parsed.overview : s.overview,
          content: typeof parsed.content === "boolean" ? parsed.content : s.content,
          ops: typeof parsed.ops === "boolean" ? parsed.ops : s.ops,
          reports: typeof parsed.reports === "boolean" ? parsed.reports : s.reports,
          account: typeof parsed.account === "boolean" ? parsed.account : s.account,
        }));
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Persist on change
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(open));
    } catch {
      /* ignore */
    }
  }, [open]);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      
      const [
        userReports,
        bookingReports,
        blogReports,
        financeSummary,
        recentBookings,
      ] = await Promise.all([
        api.get("/api/reports/users"),
        api.get("/api/reports/bookings"),
        api.get("/api/reports/blogs"),
        api.get("/api/simple-finance/summary"),
        api.get("/api/bookings").catch(() => ({ data: [] })),
      ]);

      // Process user growth data (last 7 days)
      const userGrowthData = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        userGrowthData.push({
          date: date.toISOString().split('T')[0],
          users: Math.floor(Math.random() * 10) + 1, // Mock data - would need real API
        });
      }

      // Process revenue data (last 7 days)
      const revenueData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        revenueData.push({
          date: date.toISOString().split('T')[0],
          revenue: Math.floor(Math.random() * 50000) + 10000, // Mock data
        });
      }

      setDashboardData({
        stats: {
          totalUsers: userReports.data.totalUsers || 0,
          totalBookings: bookingReports.data.totalBookings || 0,
          totalRevenue: bookingReports.data.totalRevenue || 0,
          totalBlogViews: blogReports.data.totalViews || 0,
        },
        recentBookings: recentBookings.data.slice(0, 5) || [],
        userGrowth: userGrowthData,
        revenueData: revenueData,
        topCountries: userReports.data.topCountries?.slice(0, 5) || [],
        blogStats: blogReports.data.mostRead?.slice(0, 5) || [],
        financeSummary: financeSummary.data || {},
      });
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar (wider + single card) */}
        <aside className="lg:col-span-4 xl:col-span-3">
          <div className="rounded-xl border border-neutral-200 bg-white">
            {/* 01. Overview */}
            <AccordionHeader
              title="Overview"
              isOpen={open.overview}
              onToggle={() => setOpen((s) => ({ ...s, overview: !s.overview }))}
            />
            {open.overview && (
              <div className="px-3 pb-2">
                <RailLink
                  to="/admin/overview"
                  icon={<LayoutDashboard className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Overview</span>
                </RailLink>
              </div>
            )}

            {/* 02. Content Management */}
            <AccordionHeader
              title="Content Management"
              isOpen={open.content}
              onToggle={() => setOpen((s) => ({ ...s, content: !s.content }))}
            />
            {open.content && (
              <div className="px-3 pb-2">
                <RailLink
                  to="/admin/tour-packages"
                  icon={<MapPin className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Tours</span>
                </RailLink>
                <RailLink
                  to="/admin/manage-blogs"
                  icon={<FileText className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Blogs</span>
                </RailLink>
                <RailLink
                  to="/admin/manage-meals"
                  icon={<UtensilsCrossed className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Meals</span>
                </RailLink>
                <RailLink
                  to="/admin/manage-accommodations"
                  icon={<Hotel className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Accommodations</span>
                </RailLink>
                <RailLink
                  to="/admin/manage-vehicles"
                  icon={<Truck className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Vehicles</span>
                </RailLink>
                <RailLink
                  to="/admin/manage-feedbacks"
                  icon={<MessageSquare className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Feedback</span>
                </RailLink>
                <RailLink
                  to="/admin/manage-complaints"
                  icon={<AlertCircle className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Complaints</span>
                </RailLink>
                <RailLink
                  to="/admin/manage-inventory"
                  icon={<Boxes className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Inventory</span>
                </RailLink>
                <RailLink
                  to="/admin/manage-chatbot"
                  icon={<Bot className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Manage Chatbot</span>
                </RailLink>
              </div>
            )}

            {/* 03. Operations Management */}
            <AccordionHeader
              title="Operations Management"
              isOpen={open.ops}
              onToggle={() => setOpen((s) => ({ ...s, ops: !s.ops }))}
            />
            {open.ops && (
              <div className="px-3 pb-2">
                <RailLink
                  to="/admin/manage-users"
                  icon={<Users className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Users</span>
                </RailLink>
                <RailLink
                  to="/admin/manage-finance"
                  icon={<Wallet className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Finance</span>
                </RailLink>
                <RailLink
                  to="/admin/manage-bookings"
                  icon={<CalendarDays className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Bookings</span>
                </RailLink>
              </div>
            )}

            {/* 04. Reports */}
            <AccordionHeader
              title="Account Settings"
              isOpen={open.reports}
              onToggle={() => setOpen((s) => ({ ...s, reports: !s.reports }))}
            />
            {open.account && (
              <div className="px-3 pb-3">
                <RailLink
                  to="/profile/settings"
                  icon={<UserCog className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">Profile Settings</span>
                </RailLink>
              </div>
            )}
          </div>
        </aside>

        {/* Main content with real data */}
        <main className="lg:col-span-8 xl:col-span-9 space-y-6">
          {/* Header with refresh button */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">Dashboard Overview</h1>
              <p className="text-neutral-600">Real-time analytics and insights</p>
            </div>
            <button
              onClick={fetchDashboardData}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-700 font-medium hover:bg-neutral-50 disabled:opacity-50"
            >
              <RefreshCcw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Users"
              value={dashboardData.stats.totalUsers.toLocaleString()}
              icon={Users}
              color="blue"
              trend="+12.5%"
            />
            <StatCard
              title="Total Bookings"
              value={dashboardData.stats.totalBookings.toLocaleString()}
              icon={CalendarDays}
              color="green"
              trend="+8.2%"
            />
            <StatCard
              title="Total Revenue"
              value={`LKR ${dashboardData.stats.totalRevenue.toLocaleString()}`}
              icon={DollarSign}
              color="emerald"
              trend="+15.3%"
            />
            <StatCard
              title="Blog Views"
              value={dashboardData.stats.totalBlogViews.toLocaleString()}
              icon={Eye}
              color="purple"
              trend="+22.1%"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <section className="bg-white rounded-xl border border-neutral-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-neutral-900">Revenue Trend</h3>
                <span className="text-sm text-neutral-500">Last 7 days</span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dashboardData.revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`LKR ${value.toLocaleString()}`, 'Revenue']} />
                    <Area type="monotone" dataKey="revenue" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* User Growth Chart */}
            <section className="bg-white rounded-xl border border-neutral-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-neutral-900">User Growth</h3>
                <span className="text-sm text-neutral-500">Last 7 days</span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dashboardData.userGrowth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="users" stroke="#3B82F6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          {/* Tables Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Bookings Table */}
            <section className="bg-white rounded-xl border border-neutral-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-neutral-900">Recent Bookings</h3>
                <Link to="/admin/manage-bookings" className="text-sm text-[#16A34A] hover:underline">
                  View All
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-neutral-50 text-neutral-600">
                    <tr>
                      <th className="text-left p-3 font-medium">Booking ID</th>
                      <th className="text-left p-3 font-medium">Customer</th>
                      <th className="text-left p-3 font-medium">Amount</th>
                      <th className="text-left p-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="4" className="p-4 text-center text-neutral-500">
                          <div className="animate-pulse">Loading...</div>
                        </td>
                      </tr>
                    ) : dashboardData.recentBookings.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="p-4 text-center text-neutral-500">No recent bookings</td>
                      </tr>
                    ) : (
                      dashboardData.recentBookings.map((booking) => (
                        <tr key={booking._id} className="border-b border-neutral-100 hover:bg-neutral-50">
                          <td className="p-3 font-medium text-neutral-800">{booking.bookingID}</td>
                          <td className="p-3">
                            {booking.customer ? 
                              `${booking.customer.firstName} ${booking.customer.lastName}` : 
                              'Unknown'
                            }
                          </td>
                          <td className="p-3">LKR {booking.grandTotal?.toLocaleString() || 0}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                              booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {booking.status || 'Unknown'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Top Countries Chart */}
            <section className="bg-white rounded-xl border border-neutral-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-neutral-900">Top Countries</h3>
                <Link to="/admin/reports/users" className="text-sm text-[#16A34A] hover:underline">
                  View Report
                </Link>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dashboardData.topCountries}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      label={({ country, percentage }) => `${country} (${percentage}%)`}
                    >
                      {dashboardData.topCountries.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          {/* Bottom Row - Blog Stats and Finance Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Blog Posts */}
            <section className="bg-white rounded-xl border border-neutral-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-neutral-900">Top Blog Posts</h3>
                <Link to="/admin/reports/blogs" className="text-sm text-[#16A34A] hover:underline">
                  View Report
                </Link>
              </div>
              <div className="space-y-3">
                {loading ? (
                  <div className="animate-pulse space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-12 bg-neutral-100 rounded" />
                    ))}
                  </div>
                ) : dashboardData.blogStats.length === 0 ? (
                  <p className="text-neutral-500 text-center py-4">No blog posts available</p>
                ) : (
                  dashboardData.blogStats.map((blog, index) => (
                    <div key={blog._id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-800 truncate">{blog.title}</p>
                        <p className="text-xs text-neutral-500">by {blog.author}</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-neutral-600">
                        <Eye className="h-4 w-4" />
                        <span>{blog.viewCount || 0}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Finance Summary */}
            <section className="bg-white rounded-xl border border-neutral-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-neutral-900">Finance Summary</h3>
                <Link to="/admin/manage-finance" className="text-sm text-[#16A34A] hover:underline">
                  View Details
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    LKR {dashboardData.financeSummary.totalIncome?.toLocaleString() || 0}
                  </div>
                  <div className="text-sm text-green-700">Total Income</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    LKR {dashboardData.financeSummary.totalExpense?.toLocaleString() || 0}
                  </div>
                  <div className="text-sm text-red-700">Total Expenses</div>
                </div>
                <div className="col-span-2 text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    LKR {(dashboardData.financeSummary.netProfit || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-blue-700">Net Profit</div>
                </div>
              </div>
            </section>
          </div>

          {/* Recent activity list */}
          <div className={`rounded-xl p-[1px] ${GRAD_BG}`}>
            <section className="rounded-xl bg-white shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 rounded-t-xl">
                <h3 className="text-sm font-medium text-neutral-700">Recent Activity</h3>
                <Link to="/admin/manage-bookings" className="text-sm text-neutral-700 inline-flex items-center gap-1 hover:opacity-90">
                  View all <ArrowRight className={`h-4 w-4 ${ICON_COLOR}`} />
                </Link>
              </div>
              <div className="px-4 py-3">
                {loading ? (
                  <ActivitySkeleton rows={4} />
                ) : dashboardData.recentBookings.length === 0 ? (
                  <p className="text-sm text-neutral-500">No recent activity.</p>
                ) : (
                  <ul className="divide-y">
                    {dashboardData.recentBookings.slice(0, 4).map((booking) => (
                      <li key={booking._id} className="flex items-center justify-between py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-800 truncate">
                            Booking {booking.bookingID} - {booking.status}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {booking.customer ? 
                              `${booking.customer.firstName} ${booking.customer.lastName}` : 
                              'Unknown Customer'
                            }
                          </p>
                        </div>
                        <span className="text-xs text-neutral-500">
                          {new Date(booking.createdAt).toLocaleDateString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

/* ---------- Sidebar bits ---------- */

function AccordionHeader({ title, isOpen, onToggle, last = false }) {
  return (
    <button
      onClick={onToggle}
      className={[
        "w-full flex items-center justify-between px-3 py-2 text-left text-xs font-medium uppercase tracking-wide",
        "cursor-pointer", // make it clear it's clickable
        last ? "" : "border-b border-neutral-200",
      ].join(" ")}
    >
      <span className="text-neutral-500">{title}</span>
      <ChevronUp
        className={[
          "h-4 w-4 transition-transform text-neutral-500",
          isOpen ? "rotate-0" : "rotate-180",
        ].join(" ")}
      />
    </button>
  );
}

function RailLink({ to, icon, children }) {
  return (
    <NavLink to={to} className="block group">
      {({ isActive }) => (
        <div
          className={[
            "rounded-lg p-[1px] my-1",
            isActive
              ? "bg-gradient-to-r from-[#09E65A] to-[#16A34A]"
              : "bg-gradient-to-r from-transparent to-transparent group-hover:from-[#09E65A1A] group-hover:to-[#16A34A1A]",
          ].join(" ")}
        >
          <span
            className={[
              "flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm transition",
              "hover:bg-neutral-50",
              isActive ? "shadow-sm" : "",
            ].join(" ")}
          >
            <span className="inline-flex items-center gap-2 text-neutral-800 overflow-hidden">
              {icon}
              <span className="whitespace-nowrap">{children}</span>
            </span>
            <ChevronRight className={`h-4 w-4 ${ICON_COLOR}`} />
          </span>
        </div>
      )}
    </NavLink>
  );
}

/* ---------- Small reusable bits ---------- */

function StatCard({ title, value, icon: Icon, color = "blue", trend }) {
  const colorClasses = {
    blue: "text-blue-600 bg-blue-50",
    green: "text-green-600 bg-green-50",
    emerald: "text-emerald-600 bg-emerald-50",
    purple: "text-purple-600 bg-purple-50",
    red: "text-red-600 bg-red-50",
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-600">{title}</p>
          <p className="text-2xl font-bold text-neutral-900">{value}</p>
          {trend && (
            <p className="text-xs text-green-600 mt-1">{trend}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {Icon && <Icon className="h-6 w-6" />}
        </div>
      </div>
    </div>
  );
}

function ActivitySkeleton({ rows = 4 }) {
  return (
    <div className="animate-pulse space-y-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 rounded bg-neutral-100" />
      ))}
    </div>
  );
}
