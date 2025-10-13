// src/pages/dashboards/AdminDashboard.jsx
import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
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
} from "lucide-react";

/* Gradient tokens */
const GRAD_FROM = "from-[#09E65A]";
const GRAD_TO = "to-[#16A34A]";
const GRAD_BG = `bg-gradient-to-r ${GRAD_FROM} ${GRAD_TO}`;
const ICON_COLOR = "text-[#16A34A]";

/* LocalStorage key for persisting accordion state */
const LS_KEY = "adminSidebarOpen";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [recent, setRecent] = useState([]);

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
        // Only apply known keys to avoid future mismatches
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

  useEffect(() => {
    const t = setTimeout(() => {
      setRecent([
        { id: "BK-214", title: "Booking confirmed", when: "2h ago" },
        { id: "TX-551", title: "Payout processed", when: "5h ago" },
        { id: "US-121", title: "User role updated", when: "Yesterday" },
        { id: "RV-009", title: "Refund issued", when: "2 days ago" },
      ]);
      setLoading(false);
    }, 500);
    return () => clearTimeout(t);
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
              title="Reports"
              isOpen={open.reports}
              onToggle={() => setOpen((s) => ({ ...s, reports: !s.reports }))}
            />
            {open.reports && (
              <div className="px-3 pb-2">
                <RailLink
                  to="/admin/reports"
                  icon={<BarChart3 className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  <span className="whitespace-nowrap">All Reports</span>
                </RailLink>
              </div>
            )}

            {/* 05. Account Settings */}
            <AccordionHeader
              title="Account Settings"
              isOpen={open.account}
              onToggle={() => setOpen((s) => ({ ...s, account: !s.account }))}
              last
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

        {/* Main content (demo cards kept) */}
        <main className="lg:col-span-8 xl:col-span-9 space-y-6">
          {/* Top row: green analytics + KPI cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Website Analytics */}
            <section className="lg:col-span-2 bg-white rounded-xl border border-neutral-200 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-400 to-emerald-500 px-5 pt-5 pb-6 text-white relative">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Website Analytics</h3>
                    <p className="text-sm text-emerald-50/90">Total 28.5% Conversion Rate</p>
                  </div>
                  <div className="h-20 w-20 rounded-full bg-white/20 backdrop-blur-md" />
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-[12px]">
                  <Pill>268 Direct</Pill>
                  <Pill>890 Organic</Pill>
                  <Pill>62 Referral</Pill>
                  <Pill>1.2k Campaign</Pill>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 divide-x">
                <Metric k="Sessions" v="12,849" />
                <Metric k="Page Views" v="48,210" />
                <Metric k="Avg. Time" v="3m 12s" />
                <Metric k="Bounce" v="32.1%" />
              </div>
            </section>

            <KpiCard title="Average Daily Sales" value="$28,450" sub="Total Sales This Month" trend="+18.2%" />

            {/* Sales Overview */}
            <section className="bg-white rounded-xl border border-neutral-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-neutral-500">Sales Overview</div>
                  <div className="text-xl font-semibold text-neutral-900">$42.5k</div>
                </div>
                <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">+18.2%</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-neutral-200 p-3">
                  <div className="text-neutral-500 mb-1">Order</div>
                  <div className="font-semibold">62.2%</div>
                  <div className="text-[11px] text-neutral-500">6,440</div>
                </div>
                <div className="rounded-lg border border-neutral-200 p-3">
                  <div className="text-neutral-500 mb-1">Visits</div>
                  <div className="font-semibold">25.5%</div>
                  <div className="text-[11px] text-neutral-500">12,749</div>
                </div>
              </div>
              <div className="mt-4 h-2 rounded-full bg-neutral-100 overflow-hidden">
                <div className="h-full w-2/3 bg-emerald-500" />
              </div>
            </section>
          </div>

          {/* Second row: Earning Reports + Support Tracker */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className="lg:col-span-2 bg-white rounded-xl border border-neutral-200">
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 rounded-t-xl">
                <h3 className="text-sm font-medium text-neutral-700">Earning Reports</h3>
                <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">+4.2%</span>
              </div>
              <div className="p-4">
                <div className="text-3xl font-semibold">$468</div>
                <p className="text-sm text-neutral-500">
                  Weekly Earnings Overview — informed of this week compared to last week
                </p>
                <div className="mt-5 grid grid-cols-12 gap-1 h-32 items-end">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="bg-emerald-500/80 rounded" style={{ height: `${30 + (i % 6) * 10}px` }} />
                  ))}
                </div>
              </div>
            </section>

            <section className="bg-white rounded-xl border border-neutral-200">
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 rounded-t-xl">
                <h3 className="text-sm font-medium text-neutral-700">Support Tracker</h3>
                <button
                  className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm hover:bg-neutral-50"
                  onClick={() => window.location.reload()}
                  title="Refresh"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Refresh
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div className="text-3xl font-semibold">164</div>
                <div className="text-sm text-neutral-500">Total Tickets (Last 7 days)</div>
                <div className="relative mx-auto w-40 h-40">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <circle cx="50" cy="50" r="42" className="stroke-neutral-200 fill-none" strokeWidth="10" />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      className="stroke-emerald-500 fill-none"
                      strokeWidth="10"
                      strokeDasharray="264"
                      strokeDashoffset="70"
                      strokeLinecap="round"
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="text-center">
                      <div className="text-xl font-semibold">78%</div>
                      <div className="text-xs text-neutral-500">Resolved</div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <Badge k="New" v="24" />
                  <Badge k="Open" v="36" />
                  <Badge k="Closed" v="104" />
                </div>
              </div>
            </section>
          </div>

          {/* Recent activity list */}
          <div className={`rounded-xl p-[1px] ${GRAD_BG}`}>
            <section className="rounded-xl bg-white shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 rounded-t-xl">
                <h3 className="text-sm font-medium text-neutral-700">Recent activity</h3>
                <Link to="/activity" className="text-sm text-neutral-700 inline-flex items-center gap-1 hover:opacity-90">
                  View all <ArrowRight className={`h-4 w-4 ${ICON_COLOR}`} />
                </Link>
              </div>
              <div className="px-4 py-3">
                {loading ? (
                  <ActivitySkeleton rows={4} />
                ) : recent.length === 0 ? (
                  <p className="text-sm text-neutral-500">No recent activity.</p>
                ) : (
                  <ul className="divide-y">
                    {recent.map((r) => (
                      <li key={r.id} className="flex items-center justify-between py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-800 truncate">{r.title}</p>
                          <p className="text-xs text-neutral-500">{r.id}</p>
                        </div>
                        <span className="text-xs text-neutral-500">{r.when}</span>
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

function Metric({ k, v }) {
  return (
    <div className="p-4 text-center">
      <div className="text-xs text-neutral-600">{k}</div>
      <div className="text-sm font-semibold text-neutral-900 mt-0.5">{v}</div>
    </div>
  );
}

function Pill({ children }) {
  return <span className="px-2 py-1 rounded-full bg-white/20 text-white text-[11px]">{children}</span>;
}

function KpiCard({ title, value, sub, trend }) {
  return (
    <section className="bg-white rounded-xl border border-neutral-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-neutral-500">{title}</div>
          <div className="text-xl font-semibold text-neutral-900">{value}</div>
        </div>
        <div className="h-10 w-10 rounded-lg bg-neutral-50 border border-neutral-200 grid place-items-center">
          <TrendingUp className={`h-5 w-5 ${ICON_COLOR}`} />
        </div>
      </div>
      <div className="text-xs text-neutral-500 mt-1">{sub}</div>
      <div className="mt-4 h-24 rounded-lg bg-neutral-100 overflow-hidden relative">
        <div className="absolute inset-0 flex items-end gap-1 px-2">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="w-1 bg-neutral-300" style={{ height: `${20 + (i % 7) * 3}px` }} />
          ))}
        </div>
      </div>
      <div className="mt-2 text-xs text-emerald-600">{trend}</div>
    </section>
  );
}

function Badge({ k, v }) {
  return (
    <div className="rounded-lg border border-neutral-200 px-3 py-2 bg-white">
      <div className="text-[11px] text-neutral-500">{k}</div>
      <div className="text-sm font-semibold text-neutral-900">{v}</div>
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
