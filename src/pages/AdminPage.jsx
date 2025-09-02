// src/pages/AdminPage.jsx
import { useEffect, useState } from "react";
import { NavLink, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Car,
  BedDouble,
  Users,
  Settings,
  ArrowRight,
  Boxes, // inventory icon
} from "lucide-react";

/* ---- Theme tokens ---- */
const GRAD_FROM = "from-[#DA22FF]";
const GRAD_TO = "to-[#9733EE]";
const GRAD_BG = `bg-gradient-to-r ${GRAD_FROM} ${GRAD_TO}`;
const ICON_COLOR = "text-[#9733EE]";

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    const t = setTimeout(() => {
      setRecent([
        { id: "V-001", title: "Vehicle created", when: "2h ago" },
        { id: "BK-214", title: "Booking confirmed", when: "5h ago" },
        { id: "AC-009", title: "New room added", when: "Yesterday" },
        { id: "US-121", title: "User role updated", when: "2 days ago" },
      ]);
      setLoading(false);
    }, 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Admin Panel</h1>

        {/* Settings button — gradient BORDER, white inside */}
        <div className={`rounded-md p-[1px] ${GRAD_BG}`}>
          <Link
            to="/settings"
            className="inline-flex items-center gap-2 rounded-[6px] bg-white px-3 py-1.5 text-sm text-neutral-800 hover:bg-neutral-50"
          >
            <Settings className={`h-4 w-4 ${ICON_COLOR}`} />
            Settings
          </Link>
        </div>
      </div>

      {/* Layout: left dashboard (aside) + right content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Dashboard */}
        <aside className="lg:col-span-1">
          {/* Gradient BORDER card */}
          <div className={`rounded-xl p-[1px] ${GRAD_BG}`}>
            <section className="rounded-xl bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LayoutDashboard className={`h-5 w-5 ${ICON_COLOR}`} />
                  <h2 className="text-sm font-medium text-neutral-700">
                    Dashboard
                  </h2>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <StatCard label="Total Vehicles" value="128" />
                <StatCard label="Active Bookings" value="42" />
                <StatCard label="Revenue (MTD)" value="$18.4k" />
                <StatCard label="New Users" value="23" />
              </div>

              {/* Quick links */}
              <div className="mt-4 space-y-2">
                <QuickLink
                  to="/admin/manage-vehicles"
                  icon={<Car className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  Manage Vehicles
                </QuickLink>

                {/* Manage Inventory */}
                <QuickLink
                  to="/admin/manage-inventory"
                  icon={<Boxes className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  Manage Inventory
                </QuickLink>

                <QuickLink
                  to="/accommodation"
                  icon={<BedDouble className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  Manage Accommodation
                </QuickLink>
                <QuickLink
                  to="/users"
                  icon={<Users className={`h-4 w-4 ${ICON_COLOR}`} />}
                >
                  Manage Users
                </QuickLink>
              </div>
            </section>
          </div>
        </aside>

        {/* RIGHT: Content */}
        <main className="lg:col-span-2 space-y-6">
          {/* Overview cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MiniCard title="System status" value="All systems normal" />
            <MiniCard title="Pending approvals" value="3 items" />
            <MiniCard title="Support tickets" value="7 open" />
          </div>

          {/* Recent activity — gradient BORDER */}
          <div className={`rounded-xl p-[1px] ${GRAD_BG}`}>
            <section className="rounded-xl bg-white shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 rounded-t-xl">
                <h3 className="text-sm font-medium text-neutral-700">
                  Recent activity
                </h3>
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
                      <li
                        key={r.id}
                        className="flex items-center justify-between py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-800 truncate">
                            {r.title}
                          </p>
                          <p className="text-xs text-neutral-500">{r.id}</p>
                        </div>
                        <span className="text-xs text-neutral-500">
                          {r.when}
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

/* --- tiny inline pieces --- */

function StatCard({ label, value }) {
  return (
    <div className={`rounded-lg p-[1px] ${GRAD_BG}`}>
      <div className="rounded-lg bg-white p-3">
        <p className="text-xs text-neutral-500">{label}</p>
        <p className="mt-1 text-lg font-semibold text-neutral-900">{value}</p>
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

function MiniCard({ title, value }) {
  return (
    <div className={`rounded-lg p-[1px] ${GRAD_BG}`}>
      <div className="rounded-lg bg-white p-3">
        <p className="text-xs text-neutral-500">{title}</p>
        <p className="mt-1 text-sm font-medium text-neutral-800">{value}</p>
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
//second






















// // src/pages/AdminPage.jsx
// import { useEffect, useState } from "react";
// import { NavLink, Link } from "react-router-dom";
// import {
//   LayoutDashboard,
//   Car,
//   BedDouble,
//   Users,
//   Settings,
//   ArrowRight,
// } from "lucide-react";

// /* ---- Theme tokens ---- */
// const GRAD_FROM = "from-[#DA22FF]";
// const GRAD_TO = "to-[#9733EE]";
// const GRAD_BG = `bg-gradient-to-r ${GRAD_FROM} ${GRAD_TO}`;
// const ICON_COLOR = "text-[#9733EE]";

// export default function AdminPage() {
//   const [loading, setLoading] = useState(true);
//   const [recent, setRecent] = useState([]);

//   useEffect(() => {
//     const t = setTimeout(() => {
//       setRecent([
//         { id: "V-001", title: "Vehicle created", when: "2h ago" },
//         { id: "BK-214", title: "Booking confirmed", when: "5h ago" },
//         { id: "AC-009", title: "New room added", when: "Yesterday" },
//         { id: "US-121", title: "User role updated", when: "2 days ago" },
//       ]);
//       setLoading(false);
//     }, 500);
//     return () => clearTimeout(t);
//   }, []);

//   return (
//     <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
//       {/* Top bar */}
//       <div className="mb-6 flex items-center justify-between">
//         <h1 className="text-2xl font-semibold tracking-tight">Admin Panel</h1>

//         {/* Settings button — gradient BORDER, white inside */}
//         <div className={`rounded-md p-[1px] ${GRAD_BG}`}>
//           <Link
//             to="/settings"
//             className="inline-flex items-center gap-2 rounded-[6px] bg-white px-3 py-1.5 text-sm text-neutral-800 hover:bg-neutral-50"
//           >
//             <Settings className={`h-4 w-4 ${ICON_COLOR}`} />
//             Settings
//           </Link>
//         </div>
//       </div>

//       {/* Layout: left dashboard (aside) + right content */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//         {/* LEFT: Dashboard */}
//         <aside className="lg:col-span-1">
//           {/* Gradient BORDER card */}
//           <div className={`rounded-xl p-[1px] ${GRAD_BG}`}>
//             <section className="rounded-xl bg-white p-4 shadow-sm">
//               <div className="mb-4 flex items-center justify-between">
//                 <div className="flex items-center gap-2">
//                   <LayoutDashboard className={`h-5 w-5 ${ICON_COLOR}`} />
//                   <h2 className="text-sm font-medium text-neutral-700">Dashboard</h2>
//                 </div>
//               </div>

//               {/* Stats */}
//               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//                 <StatCard label="Total Vehicles" value="128" />
//                 <StatCard label="Active Bookings" value="42" />
//                 <StatCard label="Revenue (MTD)" value="$18.4k" />
//                 <StatCard label="New Users" value="23" />
//               </div>

//               {/* Quick links */}
//               <div className="mt-4 space-y-2">
//                 <QuickLink to="/admin/manage-vehicles" icon={<Car className={`h-4 w-4 ${ICON_COLOR}`} />}>
//                   Manage Vehicles
//                 </QuickLink>
//                 <QuickLink to="/accommodation" icon={<BedDouble className={`h-4 w-4 ${ICON_COLOR}`} />}>
//                   Manage Accommodation
//                 </QuickLink>
//                 <QuickLink to="/users" icon={<Users className={`h-4 w-4 ${ICON_COLOR}`} />}>
//                   Manage Users
//                 </QuickLink>
//               </div>
//             </section>
//           </div>
//         </aside>

//         {/* RIGHT: Content */}
//         <main className="lg:col-span-2 space-y-6">
//           {/* Overview cards */}
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//             <MiniCard title="System status" value="All systems normal" />
//             <MiniCard title="Pending approvals" value="3 items" />
//             <MiniCard title="Support tickets" value="7 open" />
//           </div>

//           {/* Recent activity — gradient BORDER */}
//           <div className={`rounded-xl p-[1px] ${GRAD_BG}`}>
//             <section className="rounded-xl bg-white shadow-sm">
//               <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 rounded-t-xl">
//                 <h3 className="text-sm font-medium text-neutral-700">Recent activity</h3>
//                 <Link
//                   to="/activity"
//                   className="text-sm text-neutral-700 inline-flex items-center gap-1 hover:opacity-90"
//                 >
//                   View all <ArrowRight className={`h-4 w-4 ${ICON_COLOR}`} />
//                 </Link>
//               </div>

//               <div className="px-4 py-3">
//                 {loading ? (
//                   <TableSkeleton rows={4} />
//                 ) : recent.length === 0 ? (
//                   <p className="text-sm text-neutral-500">No recent activity.</p>
//                 ) : (
//                   <ul className="divide-y">
//                     {recent.map((r) => (
//                       <li key={r.id} className="flex items-center justify-between py-3">
//                         <div className="min-w-0">
//                           <p className="text-sm font-medium text-neutral-800 truncate">
//                             {r.title}
//                           </p>
//                           <p className="text-xs text-neutral-500">{r.id}</p>
//                         </div>
//                         <span className="text-xs text-neutral-500">{r.when}</span>
//                       </li>
//                     ))}
//                   </ul>
//                 )}
//               </div>
//             </section>
//           </div>
//         </main>
//       </div>
//     </div>
//   );
// }

// /* --- tiny inline pieces --- */

// function StatCard({ label, value }) {
//   return (
//     <div className={`rounded-lg p-[1px] ${GRAD_BG}`}>
//       <div className="rounded-lg bg-white p-3">
//         <p className="text-xs text-neutral-500">{label}</p>
//         <p className="mt-1 text-lg font-semibold text-neutral-900">{value}</p>
//       </div>
//     </div>
//   );
// }

// function QuickLink({ to, icon, children }) {
//   return (
//     <NavLink to={to} className="block">
//       {({ isActive }) => (
//         <div className={`rounded-lg p-[1px] ${GRAD_BG}`}>
//           <span
//             className={[
//               "flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm transition",
//               isActive ? "shadow-sm" : "hover:bg-neutral-50",
//             ].join(" ")}
//           >
//             <span className="inline-flex items-center gap-2 text-neutral-800">
//               <span>{icon}</span>
//               {children}
//             </span>
//             <ArrowRight className={`h-4 w-4 ${ICON_COLOR}`} />
//           </span>
//         </div>
//       )}
//     </NavLink>
//   );
// }

// function MiniCard({ title, value }) {
//   return (
//     <div className={`rounded-lg p-[1px] ${GRAD_BG}`}>
//       <div className="rounded-lg bg-white p-3">
//         <p className="text-xs text-neutral-500">{title}</p>
//         <p className="mt-1 text-sm font-medium text-neutral-800">{value}</p>
//       </div>
//     </div>
//   );
// }

// function TableSkeleton({ rows = 4 }) {
//   return (
//     <div className="animate-pulse space-y-3">
//       {Array.from({ length: rows }).map((_, i) => (
//         <div key={i} className="h-10 rounded bg-neutral-100" />
//       ))}
//     </div>
//   );
// }
