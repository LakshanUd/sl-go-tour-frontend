// src/pages/CustomerPage.jsx
import { useEffect, useMemo, useState } from "react";
import { NavLink, Link } from "react-router-dom";
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
  History,
} from "lucide-react";

/* ---- Theme tokens: match Admin (GREEN) ---- */
const GRAD_FROM = "from-[#09E65A]";
const GRAD_TO = "to-[#16A34A]";
const GRAD_BG = `bg-gradient-to-r ${GRAD_FROM} ${GRAD_TO}`;
const ICON_COLOR = "text-[#16A34A]";
const CARD = "rounded-xl border border-neutral-200 bg-white shadow-sm";

/* ---- Persist sidebar accordion state ---- */
const LS_KEY = "customerSidebarOpen";

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

  // Recent activity (mock/demo)
  const [loading, setLoading] = useState(true);
  const [recent, setRecent] = useState([]);
  useEffect(() => {
    const t = setTimeout(() => {
      setRecent([
        { id: "BK-512", title: "Booking confirmed", when: "1h ago" },
        { id: "PM-884", title: "Payment received (Invoice #INV-2025-014)", when: "Yesterday" },
        { id: "NT-245", title: "New message from support", when: "2 days ago" },
      ]);
      setLoading(false);
    }, 500);
    return () => clearTimeout(t);
  }, []);

  // Optional: user name from localStorage
  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 pt-24">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ===== Sidebar (vehicle-style like Admin) ===== */}
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

        {/* ===== Main content (right) ===== */}
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
          </div>

          {/* Top tabs (same pattern as Admin pages) */}
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
              {/* Stats row (like Admin) */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCardBig label="Upcoming bookings" value="2" />
                <StatCardBig label="Unread notifications" value="4" />
                <StatCardBig label="Outstanding balance" value="LKR 0.00" />
              </div>

              {/* Recent Activity list */}
              <div className={`${CARD}`}>
                <div className="px-4 py-3 border-b flex items-center justify-between">
                  <div className="font-medium">Recent activity</div>
                  <Link to="/activity" className="text-sm text-neutral-700 inline-flex items-center gap-1 hover:opacity-90">
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
                {recent.map((r) => (
                  <li key={r.id} className="p-4 text-sm">
                    <span className="font-medium">{r.title}</span>
                    <span className="text-neutral-500"> — {r.id} · {r.when}</span>
                  </li>
                ))}
                {recent.length === 0 && (
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
function StatCardBig({ label, value }) {
  return (
    <div className={`rounded-xl p-[1px] ${GRAD_BG}`}>
      <div className="rounded-xl bg-white p-4 text-center">
        <div className="text-2xl font-semibold">{value}</div>
        <div className="text-xs text-neutral-500 mt-1">{label}</div>
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
