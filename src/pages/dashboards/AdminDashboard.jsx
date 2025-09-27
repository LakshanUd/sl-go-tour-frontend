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
  ShieldCheck,
  Bell,
  ArrowRight,
  ChevronRight,
  Settings,
  RefreshCcw,
} from "lucide-react";

const GRAD_FROM = "from-[#DA22FF]";
theGrad:; // silence some linters that complain about template-only vars
const GRAD_TO = "to-[#9733EE]";
const GRAD_BG = `bg-gradient-to-r ${GRAD_FROM} ${GRAD_TO}`;
const ICON_COLOR = "text-[#9733EE]";

export default function AdminDashboard() {
  // demo data — replace with real API calls if you like
  const [loading, setLoading] = useState(true);
  const [recent, setRecent] = useState([]);

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>

        {/* Settings button — gradient border, white interior */}
        <div className={`rounded-md p-[1px] ${GRAD_BG}`}>
          <Link
            to="/profile/settings"
            className="inline-flex items-center gap-2 rounded-[6px] bg-white px-3 py-1.5 text-sm text-neutral-800 hover:bg-neutral-50"
          >
            <Settings className={`h-4 w-4 ${ICON_COLOR}`} />
            Settings
          </Link>
        </div>
      </div>

      {/* Layout: left rail + right content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: rail */}
        <aside className="lg:col-span-1 space-y-4">
          {/* Profile / role card with gradient border */}
          <div className={`rounded-xl p-[1px] ${GRAD_BG}`}>
            <section className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`h-12 w-12 rounded-xl grid place-items-center text-white ${GRAD_BG}`}>
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-sm text-neutral-500">Signed in as</div>
                  <div className="font-semibold text-neutral-900">Admin</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <MiniStat k="Users" v="1,248" />
                <MiniStat k="Bookings" v="312" />
                <MiniStat k="MTD Rev." v="LKR 5.8M" />
              </div>

              <div className="mt-4">
                <Link
                  to="/profile/settings"
                  className={`w-full inline-flex items-center justify-center gap-2 rounded-lg py-2 text-sm text-white ${GRAD_BG} hover:opacity-95 active:opacity-90`}
                >
                  <Settings size={16} />
                  Open Settings
                </Link>
              </div>
            </section>
          </div>

          {/* Nav groups */}
          <NavGroup title="Manage">
            <RailLink to="/admin/manage-users" icon={<Users className={`h-4 w-4 ${ICON_COLOR}`} />}>
              Users
            </RailLink>
            <RailLink to="/admin/tour-packages" icon={<Wallet className={`h-4 w-4 ${ICON_COLOR}`} />}>
              Manage Tours
            </RailLink>
            <RailLink to="/admin/manage-bookings" icon={<CalendarDays className={`h-4 w-4 ${ICON_COLOR}`} />}>
              Bookings
            </RailLink>
            <RailLink to="/admin/manage-vehicles" icon={<BarChart3 className={`h-4 w-4 ${ICON_COLOR}`} />}>
              Vehicles
            </RailLink>
            <RailLink to="/admin/manage-accommodations" icon={<FileText className={`h-4 w-4 ${ICON_COLOR}`} />}>
              Accommodations
            </RailLink>
            <RailLink to="/admin/manage-meals" icon={<FileText className={`h-4 w-4 ${ICON_COLOR}`} />}>
              Meals
            </RailLink>
            <RailLink to="/admin/manage-blogs" icon={<FileText className={`h-4 w-4 ${ICON_COLOR}`} />}>
              Blogs
            </RailLink>
          </NavGroup>

          <NavGroup title="Reports & Alerts">
            <RailLink to="/admin/reports/monthly" icon={<FileText className={`h-4 w-4 ${ICON_COLOR}`} />}>
              Monthly Report
            </RailLink>
            <RailLink to="/admin/reports/finance-transactions" icon={<Wallet className={`h-4 w-4 ${ICON_COLOR}`} />}>
              Finance Transactions
            </RailLink>
            <RailLink to="/admin/manage-feedbacks" icon={<Bell className={`h-4 w-4 ${ICON_COLOR}`} />}>
              Feedback & Alerts
            </RailLink>
          </NavGroup>
        </aside>

        {/* RIGHT: content */}
        <main className="lg:col-span-2 space-y-6">
          {/* Quick stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              title="System status"
              value="All systems normal"
              icon={<LayoutDashboard className={`h-5 w-5 ${ICON_COLOR}`} />}
            />
            <StatCard
              title="Pending approvals"
              value="3 items"
              icon={<ShieldCheck className={`h-5 w-5 ${ICON_COLOR}`} />}
            />
            <StatCard
              title="Support tickets"
              value="7 open"
              icon={<Bell className={`h-5 w-5 ${ICON_COLOR}`} />}
            />
          </div>

          {/* Action shortcuts */}
          <div className={`rounded-xl p-[1px] ${GRAD_BG}`}>
            <section className="rounded-xl bg-white">
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
                <h3 className="text-sm font-medium text-neutral-700">Quick actions</h3>
                <button
                  className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm hover:bg-neutral-50"
                  onClick={() => window.location.reload()}
                  title="Refresh"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Refresh
                </button>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                <DashLink to="/admin/manage-users" icon={<Users className={`h-5 w-5 ${ICON_COLOR}`} />} label="Manage Users" />
                <DashLink to="/admin/financial-overview" icon={<Wallet className={`h-5 w-5 ${ICON_COLOR}`} />} label="Financial Overview" />
                <DashLink to="/admin/manage-bookings" icon={<CalendarDays className={`h-5 w-5 ${ICON_COLOR}`} />} label="Manage Bookings" />
              </div>
            </section>
          </div>

          {/* Recent activity */}
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

/* ---------- small bits ---------- */

function NavGroup({ title, children }) {
  return (
    <div className={`rounded-xl p-[1px] ${GRAD_BG}`}>
      <section className="rounded-xl bg-white p-3 shadow-sm">
        <div className="px-1 pb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">{title}</div>
        <div className="space-y-2">{children}</div>
      </section>
    </div>
  );
}

function RailLink({ to, icon, children }) {
  return (
    <NavLink to={to} className="block group">
      {({ isActive }) => (
        <div className={`rounded-lg p-[1px] ${isActive ? GRAD_BG : "bg-gradient-to-r from-transparent to-transparent group-hover:from-[#DA22FF1A] group-hover:to-[#9733EE1A]"}`}>
          <span
            className={[
              "flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm transition",
              isActive ? "shadow-sm" : "hover:bg-neutral-50",
            ].join(" ")}
          >
            <span className="inline-flex items-center gap-2 text-neutral-800">
              {icon}
              {children}
            </span>
            <ChevronRight className={`h-4 w-4 ${ICON_COLOR}`} />
          </span>
        </div>
      )}
    </NavLink>
  );
}

function MiniStat({ k, v }) {
  return (
    <div className="rounded-lg border bg-white p-2">
      <div className="text-[11px] text-neutral-500">{k}</div>
      <div className="text-sm font-semibold text-neutral-900">{v}</div>
    </div>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <div className={`rounded-xl p-[1px] ${GRAD_BG}`}>
      <div className="rounded-xl bg-white p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-neutral-50 border border-neutral-200 grid place-items-center">
          {icon}
        </div>
        <div>
          <div className="text-xs text-neutral-500">{title}</div>
          <div className="text-sm font-medium text-neutral-800">{value}</div>
        </div>
      </div>
    </div>
  );
}

function DashLink({ to, icon, label }) {
  return (
    <Link to={to} className={`rounded-lg p-[1px] ${GRAD_BG}`}>
      <div className="rounded-lg bg-white px-4 py-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-2">
          {icon}
          <span>{label}</span>
        </span>
        <ArrowRight className={`h-4 w-4 ${ICON_COLOR}`} />
      </div>
    </Link>
  );
}

function ActivitySkeleton({ rows = 4 }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 rounded bg-neutral-100" />
      ))}
    </div>
  );
}
