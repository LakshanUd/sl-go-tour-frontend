// src/pages/CustomerPage.jsx
import { useEffect, useMemo, useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarCheck2,
  Settings,
  ChevronRight,
  ArrowRight,
  MessageSquareText,
  AlertCircle,
  MessagesSquare,
  PhoneCall,
  RefreshCcw,
  TrendingUp,
  ChevronUp,
  MapPin,
  UtensilsCrossed,
  Hotel,
  Truck,
  MessageSquare,
  Boxes,
  UserCog,
  Bot,
  Eye,
  Activity,
  Clock,
  Users,
  Wallet,
  CalendarDays,
  FileText,
  BarChart3,
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
import axios from "axios";
import toast from "react-hot-toast";

/* ---- Theme tokens: match Admin (GREEN) ---- */
const GRAD_FROM = "from-[#09E65A]";
const GRAD_TO = "to-[#16A34A]";
const GRAD_BG = `bg-gradient-to-r ${GRAD_FROM} ${GRAD_TO}`;
const ICON_COLOR = "text-[#16A34A]";
const CARD = "rounded-xl border border-neutral-200 bg-white shadow-sm";

/* ---- Persist sidebar accordion state ---- */
const LS_KEY = "customerSidebarOpen";

/* ---- API Setup ---- */
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

const CustomerAPI = {
  bookings: () => api.get("/api/bookings"),
  feedbacks: () => api.get("/api/feedbacks"),
  complaints: () => api.get("/api/complaints"),
  // Generate mock data for charts and analytics
  generateMockData: () => {
    const today = new Date();
    const spendingHistory = [];
    const favoriteDestinations = [
      { destination: "Kandy", visits: 3, percentage: 35 },
      { destination: "Sigiriya", visits: 2, percentage: 25 },
      { destination: "Galle", visits: 2, percentage: 25 },
      { destination: "Ella", visits: 1, percentage: 15 }
    ];

    // Generate spending history for last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today);
      date.setMonth(date.getMonth() - i);
      spendingHistory.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        amount: Math.floor(Math.random() * 50000) + 10000,
        bookings: Math.floor(Math.random() * 5) + 1
      });
    }

    return {
      spendingHistory,
      favoriteDestinations
    };
  }
};

export default function CustomerPage() {
  // Sidebar accordion state (persisted)
  const [open, setOpen] = useState({
    overview: true,
    bookings: true,
    payments: true,
    support: true,
    notifications: true,
    account: true,
  });
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setOpen((s) => ({
          overview: typeof parsed.overview === "boolean" ? parsed.overview : s.overview,
          bookings: typeof parsed.bookings === "boolean" ? parsed.bookings : s.bookings,
          payments: typeof parsed.payments === "boolean" ? parsed.payments : s.payments,
          support: typeof parsed.support === "boolean" ? parsed.support : s.support,
          notifications: typeof parsed.notifications === "boolean" ? parsed.notifications : s.notifications,
          account: typeof parsed.account === "boolean" ? parsed.account : s.account,
        }));
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(open));
    } catch {}
  }, [open]);

  // Tabs like Admin pages
  const [tab, setTab] = useState("Overview"); // Overview | Activity | Settings

  // Dashboard data state (matching AdminDashboard pattern)
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    stats: {
      totalBookings: 0,
    upcomingBookings: 0,
      totalSpent: 0,
      openComplaints: 0,
    },
    recentBookings: [],
    spendingHistory: [],
    favoriteDestinations: [],
    recentActivity: [],
  });

  const navigate = useNavigate();

  // Optional: user name and role from localStorage
  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  }, []);

  // Redirect Admins to /admin/overview
  useEffect(() => {
    if (user?.role === "Admin") {
      navigate("/admin/overview", { replace: true });
    }
  }, [user, navigate]);

  // Fetch dashboard data (matching AdminDashboard pattern)
  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      
      const [
        bookingsRes,
        complaintsRes,
      ] = await Promise.all([
        CustomerAPI.bookings().catch(() => ({ data: [] })),
        CustomerAPI.complaints().catch(() => ({ data: [] })),
      ]);

      // Process bookings data
      const bookings = Array.isArray(bookingsRes.data) ? bookingsRes.data : [];
      const upcomingBookings = bookings.filter(b => {
        const bookingDate = new Date(b.date || b.startDate || b.createdAt);
        return bookingDate > new Date();
      }).length;
      const totalSpent = bookings.reduce((sum, b) => sum + (b.grandTotal || b.totalAmount || 0), 0);

      // Process complaints to get open complaint count
      const complaintsData = complaintsRes.data?.complaints || [];
      const complaints = Array.isArray(complaintsData) ? complaintsData : [];
      
      // Debug: Log complaint data structure
      console.log('Complaints data:', complaintsRes.data);
      console.log('User email:', user?.email);
      console.log('All complaints:', complaints);
      
      // Filter complaints by current user and open status
      const userEmail = user?.email;
      const userComplaints = userEmail ? complaints.filter(c => c.email === userEmail) : complaints;
      console.log('User complaints:', userComplaints);
      
      const openComplaints = userComplaints.filter(c => 
        c.status === 'Open' || c.status === 'open' || c.status === 'Pending' || c.status === 'pending' || !c.status
      ).length;
      
      console.log('Open complaints count:', openComplaints);

      // Build dynamic Spending History from bookings (last 6 months)
      const months = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now);
        d.setMonth(d.getMonth() - i);
        const key = d.toISOString().slice(0, 7); // YYYY-MM
        months.push({ key, label: d.toLocaleDateString('en-US', { month: 'short' }) });
      }

      const totalAmount = (b) => (
        b?.grandTotal ??
        b?.totals?.grandTotal ??
        b?.total ??
        b?.amount ??
        (Array.isArray(b?.items) ? b.items.reduce((s, it) => s + Number(it.lineTotal || it.total || it.price || 0), 0) : 0)
      );

      // Prefer bookings for current user if user email is available
      const myEmailSafe = (user?.email || '').toLowerCase();
      const myBookings = bookings.filter(b => {
        const email = (b.customer?.email || b.customerEmail || b.userEmail || '').toLowerCase();
        return myEmailSafe ? (email === myEmailSafe) : true;
      });

      const monthToAmount = Object.fromEntries(months.map(m => [m.key, 0]));
      myBookings.forEach((b) => {
        const d = new Date(b.createdAt || b.date || b.updatedAt || Date.now());
        const key = d.toISOString().slice(0, 7);
        if (key in monthToAmount) {
          monthToAmount[key] += Number(totalAmount(b) || 0);
        }
      });

      const spendingHistoryDynamic = months.map(m => ({ month: m.label, amount: Math.max(0, Number(monthToAmount[m.key] || 0)) }));

      setDashboardData({
        stats: {
          totalBookings: bookings.length,
          upcomingBookings,
          totalSpent,
          openComplaints,
        },
        recentBookings: bookings.slice(0, 5),
        spendingHistory: spendingHistoryDynamic,
        favoriteDestinations: CustomerAPI.generateMockData().favoriteDestinations,
        recentActivity: bookings.slice(0, 5), // Use bookings as recent activity
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
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ===== Sidebar ===== */}
        <aside className="lg:col-span-4 xl:col-span-3">
          <div className="rounded-xl border border-neutral-200 bg-white">
            {/* Overview */}
            <AccordionHeader
              title="Overview"
              isOpen={open.overview}
              onToggle={() => setOpen((s) => ({ ...s, overview: !s.overview }))}
            />
            {open.overview && (
              <div className="px-3 pb-2">
                <RailLink to="/customer" icon={<LayoutDashboard className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  <span className="whitespace-nowrap">Dashboard</span>
                </RailLink>
                <RailLink to="/profile/settings-cus" icon={<Settings className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  <span className="whitespace-nowrap">Account Settings</span>
                </RailLink>
              </div>
            )}

            {/* Feedbacks & Complaints */}
            <AccordionHeader
              title="Feedbacks & Complaints"
              isOpen={open.payments}
              onToggle={() => setOpen((s) => ({ ...s, payments: !s.payments }))}
            />
            {open.payments && (
              <div className="px-3 pb-2">
                <RailLink to="/account/feedbacks" icon={<MessageSquareText className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  <span className="whitespace-nowrap">My Feedbacks</span>
                </RailLink>
                <RailLink to="/account/complaints" icon={<AlertCircle className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  <span className="whitespace-nowrap">My Complaints</span>
                </RailLink>
              </div>
            )}

            {/* Bookings */}
            <AccordionHeader
              title="Bookings"
              isOpen={open.bookings}
              onToggle={() => setOpen((s) => ({ ...s, bookings: !s.bookings }))}
            />
            {open.bookings && (
              <div className="px-3 pb-2">
                <RailLink to="/bookings" icon={<CalendarCheck2 className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  <span className="whitespace-nowrap">My Bookings</span>
                </RailLink>
              </div>
            )}

            {/* Support */}
            <AccordionHeader
              title="Support"
              isOpen={open.support}
              onToggle={() => setOpen((s) => ({ ...s, support: !s.support }))}
            />
            {open.support && (
              <div className="px-3 pb-2">
                <RailLink to="/support/chat" icon={<MessagesSquare className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  <span className="whitespace-nowrap">Chat with Support</span>
                </RailLink>
                <RailLink to="/support/emergency" icon={<PhoneCall className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  <span className="whitespace-nowrap">Emergency Contacts</span>
                </RailLink>
              </div>
            )}
          </div>
        </aside>

        {/* ===== Main content ===== */}
        <main className="lg:col-span-8 xl:col-span-9 space-y-6">
          {/* Header / Greeting */}
          <div className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold leading-tight">
                <span className={`text-transparent bg-clip-text ${GRAD_BG}`}>
                  {`Welcome${user?.firstName ? `, ${user.firstName}` : ""}`}
                </span>
                &nbsp;· Customer Dashboard
              </h2>
              <p className="text-sm text-neutral-500">Manage your bookings, payments, and account.</p>
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

          {/* Top tabs */}
          <div className={`${CARD} p-3`}>
            <div className="flex flex-wrap gap-2">
              <TopTab active={tab === "Overview"} onClick={() => setTab("Overview")}>Overview</TopTab>
              <TopTab active={tab === "Activity"} onClick={() => setTab("Activity")}>Activity</TopTab>
              <TopTab active={tab === "Settings"} onClick={() => setTab("Settings")}>Settings</TopTab>
            </div>
          </div>

          {/* ===== Overview ===== */}
          {tab === "Overview" && (
            <>
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  title="Total Bookings"
                  value={dashboardData.stats.totalBookings.toLocaleString()}
                  icon={CalendarDays}
                  color="blue"
                  trend="+5.2%"
                />
                <StatCard
                  title="Upcoming Trips"
                  value={dashboardData.stats.upcomingBookings.toLocaleString()}
                  icon={MapPin}
                  color="green"
                  trend="+2.1%"
                />
                <StatCard
                  title="Total Spent"
                  value={`LKR ${dashboardData.stats.totalSpent.toLocaleString()}`}
                  icon={Wallet}
                  color="emerald"
                  trend="+12.3%"
                />
                <StatCard
                  title="Open Complaints"
                  value={dashboardData.stats.openComplaints.toLocaleString()}
                  icon={AlertCircle}
                  color="red"
                  trend="+1.2%"
                />
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Spending History Chart */}
                <section className="bg-white rounded-xl border border-neutral-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-neutral-900">Spending History</h3>
                    <span className="text-sm text-neutral-500">Last 6 months</span>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dashboardData.spendingHistory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`LKR ${value.toLocaleString()}`, 'Spent']} />
                        <Area type="monotone" dataKey="amount" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                {/* Recent Bookings Table */}
                <section className="bg-white rounded-xl border border-neutral-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-neutral-900">Recent Bookings</h3>
                    <Link to="/bookings" className="text-sm text-[#16A34A] hover:underline">
                      View All
                    </Link>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-neutral-50 text-neutral-600">
                        <tr>
                          <th className="text-left p-3 font-medium">Booking ID</th>
                          <th className="text-left p-3 font-medium">Destination</th>
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
                              <td className="p-3 font-medium text-neutral-800">{booking.bookingID || booking._id}</td>
                              <td className="p-3">
                                {booking.destination || booking.tourName || 'Unknown'}
                              </td>
                              <td className="p-3">LKR {booking.grandTotal?.toLocaleString() || booking.totalAmount?.toLocaleString() || 0}</td>
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
              </div>

              {/* Recent Activity */}
              <div className={`rounded-xl p-[1px] ${GRAD_BG}`}>
                <section className="rounded-xl bg-white shadow-sm">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 rounded-t-xl">
                    <h3 className="text-sm font-medium text-neutral-700">Recent Activity</h3>
                  <Link to="/activity" className="text-sm text-neutral-700 inline-flex items-center gap-1 hover:opacity-90">
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
                                Booking {booking.bookingID || booking._id} - {booking.status}
                              </p>
                              <p className="text-xs text-neutral-500">
                                {booking.destination || booking.tourName || 'Unknown Destination'}
                              </p>
                          </div>
                            <span className="text-xs text-neutral-500">
                              {new Date(booking.createdAt || booking.date).toLocaleDateString()}
                            </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                </section>
              </div>
            </>
          )}

          {/* ===== Activity ===== */}
          {tab === "Activity" && (
            <div className={CARD}>
              <div className="p-4 border-b">
                <div className="font-medium">Timeline</div>
                <p className="text-xs text-neutral-500">Your most recent bookings and payments.</p>
              </div>
              <ul className="divide-y">
                {dashboardData.recentBookings.map((booking) => (
                  <li key={booking._id} className="p-4 text-sm">
                    <span className="font-medium">Booking {booking.bookingID || booking._id}</span>
                    <span className="text-neutral-500"> — {booking.destination || booking.tourName || 'Unknown'} · {new Date(booking.createdAt || booking.date).toLocaleDateString()}</span>
                  </li>
                ))}
                {dashboardData.recentBookings.length === 0 && (
                  <li className="p-4 text-neutral-500 text-sm">No activity yet.</li>
                )}
              </ul>
            </div>
          )}

          {/* ===== Settings ===== */}
          {tab === "Settings" && (
            <div className={CARD}>
              <div className="p-4 border-b">
                <div className="font-medium">Preferences</div>
                <p className="text-xs text-neutral-500">These are client-side display settings.</p>
              </div>
              <div className="p-4 grid sm:grid-cols-2 gap-4">
                <div className="rounded-lg border p-3">
                  <div className="text-sm font-medium">Default currency</div>
                  <p className="mt-2 text-sm text-neutral-600">LKR (default)</p>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-sm font-medium">Notifications</div>
                  <p className="mt-2 text-sm text-neutral-600">
                    Manage in <Link to="/notifications/preferences" className="underline">Notification Preferences</Link>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/* ---------- Sidebar bits (same as Admin style) ---------- */
function AccordionHeader({ title, isOpen, onToggle, last = false }) {
  return (
    <button
      onClick={onToggle}
      className={[
        "w-full flex items-center justify-between px-3 py-2 text-left text-xs font-medium uppercase tracking-wide",
        "cursor-pointer",
        last ? "" : "border-b border-neutral-200",
      ].join(" ")}
    >
      <span className="text-neutral-500">{title}</span>
      <svg
        viewBox="0 0 24 24"
        className={["h-4 w-4 transition-transform text-neutral-500", isOpen ? "rotate-0" : "rotate-180"].join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="m18 15-6-6-6 6" />
      </svg>
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

/* ---------- Small UI bits (green focus) ---------- */
function TopTab({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-lg px-3 py-1.5 text-sm border",
        active ? "bg-white shadow-sm border-transparent" : "bg-white hover:bg-neutral-50 border-neutral-200",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
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
