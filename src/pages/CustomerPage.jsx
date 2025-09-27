// src/pages/CustomerPage.jsx
import { useEffect, useState } from "react";
import { NavLink, Link } from "react-router-dom";
import {
  User,
  CreditCard,
  CalendarCheck2,
  Receipt,
  LifeBuoy,
  Bell,
  Settings,
  ArrowRight,
} from "lucide-react";

/* ---- Theme tokens (match AdminPage) ---- */
const GRAD_FROM = "from-[#DA22FF]";
const GRAD_TO = "to-[#9733EE]";
const GRAD_BG = `bg-gradient-to-r ${GRAD_FROM} ${GRAD_TO}`;
const ICON_COLOR = "text-[#9733EE]";

export default function CustomerPage() {
  const [loading, setLoading] = useState(true);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    // Mock recent activity
    const t = setTimeout(() => {
      setRecent([
        { id: "BK-512", title: "Booking confirmed", when: "1h ago" },
        { id: "PM-884", title: "Payment received (Invoice #INV-2025-014)", when: "Yesterday" },
        { id: "AL-092", title: "New tour updates available", when: "2 days ago" },
      ]);
      setLoading(false);
    }, 500);
    return () => clearTimeout(t);
  }, []);

  // Optional: derive user details from localStorage if available
  const user = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  })();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome{user?.firstName ? `, ${user.firstName}` : ""} 👋
          </h1>
          <p className="text-sm text-neutral-500">Manage your account, bookings, and payments.</p>
        </div>

        {/* Account Settings */}
        <div className={`rounded-md p-[1px] ${GRAD_BG}`}>
          <Link
            to="/profile/settings"
            className="inline-flex items-center gap-2 rounded-[6px] bg-white px-3 py-1.5 text-sm text-neutral-800 hover:bg-neutral-50"
          >
            <Settings className={`h-4 w-4 ${ICON_COLOR}`} />
            Account Settings
          </Link>
        </div>
      </div>

      {/* Layout: left menu + right content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Navigation / sections */}
        <aside className="lg:col-span-1">
          <div className={`rounded-xl p-[1px] ${GRAD_BG}`}>
            <section className="rounded-xl bg-white p-4 shadow-sm">
              {/* Profile & Account */}
              <SectionTitle icon={<User className={`h-5 w-5 ${ICON_COLOR}`} />} title="Profile & Account" />
              <div className="space-y-2">
                <QuickLink to="/account/profile" icon={<User className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  View / Edit Personal Details
                </QuickLink>
                <QuickLink to="/account/feedbacks" icon={<Settings className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  Manage Feedbacks
                </QuickLink>
                <QuickLink to="/account/payments" icon={<CreditCard className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  Payment Methods
                </QuickLink>
              </div>

              {/* Bookings */}
              <SectionTitle
                className="mt-6"
                icon={<CalendarCheck2 className={`h-5 w-5 ${ICON_COLOR}`} />}
                title="Bookings"
              />
              <div className="space-y-2">
                <QuickLink to="/bookings" icon={<CalendarCheck2 className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  My Bookings (upcoming, ongoing, completed)
                </QuickLink>
                <QuickLink to="/bookings/history" icon={<CalendarCheck2 className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  Booking Status & History
                </QuickLink>
                <QuickLink to="/bookings/manage" icon={<Settings className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  Cancel / Modify Booking
                </QuickLink>
              </div>

              {/* Payments & Invoices */}
              <SectionTitle className="mt-6" icon={<Receipt className={`h-5 w-5 ${ICON_COLOR}`} />} title="Payments & Invoices" />
              <div className="space-y-2">
                <QuickLink to="/payments/history" icon={<CreditCard className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  Payment History
                </QuickLink>
                <QuickLink to="/payments/invoices" icon={<Receipt className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  Download Invoices / Receipts
                </QuickLink>
              </div>

              {/* Support & Assistance */}
              <SectionTitle className="mt-6" icon={<LifeBuoy className={`h-5 w-5 ${ICON_COLOR}`} />} title="Support & Assistance" />
              <div className="space-y-2">
                <QuickLink to="/support/chat" icon={<LifeBuoy className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  Chat with Support / Tour Guide
                </QuickLink>
                <QuickLink to="/support/emergency" icon={<LifeBuoy className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  Emergency Contact Numbers
                </QuickLink>
              </div>

              {/* Notifications */}
              <SectionTitle className="mt-6" icon={<Bell className={`h-5 w-5 ${ICON_COLOR}`} />} title="Notifications" />
              <div className="space-y-2">
                <QuickLink to="/notifications" icon={<Bell className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  View Notifications
                </QuickLink>
                <QuickLink to="/notifications/preferences" icon={<Settings className={`h-4 w-4 ${ICON_COLOR}`} />}>
                  Notification Preferences
                </QuickLink>
              </div>
            </section>
          </div>
        </aside>

        {/* RIGHT: Dashboard content */}
        <main className="lg:col-span-2 space-y-6">
          {/* Overview stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MiniStat label="Upcoming bookings" value="2" />
            <MiniStat label="Unread notifications" value="4" />
            <MiniStat label="Outstanding balance" value="LKR 0.00" />
          </div>

          {/* Recent Activity */}
          <div className={`rounded-xl p-[1px] ${GRAD_BG}`}>
            <section className="rounded-xl bg-white shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 rounded-t-xl">
                <h3 className="text-sm font-medium text-neutral-700">Recent activity</h3>
                <Link
                  to="/activity"
                  className="text-sm text-neutral-700 inline-flex items-center gap-1 hover:opacity-90"
                >
                  View all <ArrowRight className={`h-4 w-4 ${ICON_COLOR}`} />
                </Link>
              </div>

              <div className="px-4 py-3">
                {loading ? (
                  <TableSkeleton rows={4} />
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

/* ---------- small building blocks ---------- */
function SectionTitle({ icon, title, className = "" }) {
  return (
    <div className={`mb-3 mt-2 flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-medium text-neutral-700">{title}</h2>
      </div>
    </div>
  );
}

function QuickLink({ to, icon, children }) {
  return (
    <NavLink to={to} className="block">
      {({ isActive }) => (
        <div className={`rounded-lg p-[1px] ${GRAD_BG}`}>
          <span
            className={[
              "flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm transition",
              isActive ? "shadow-sm" : "hover:bg-neutral-50",
            ].join(" ")}
          >
            <span className="inline-flex items-center gap-2 text-neutral-800">
              <span>{icon}</span>
              {children}
            </span>
            <ArrowRight className={`h-4 w-4 ${ICON_COLOR}`} />
          </span>
        </div>
      )}
    </NavLink>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className={`rounded-lg p-[1px] ${GRAD_BG}`}>
      <div className="rounded-lg bg-white p-3">
        <p className="text-xs text-neutral-500">{label}</p>
        <p className="mt-1 text-lg font-semibold text-neutral-900">{value}</p>
      </div>
    </div>
  );
}

function TableSkeleton({ rows = 4 }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 rounded bg-neutral-100" />
      ))}
    </div>
  );
}
