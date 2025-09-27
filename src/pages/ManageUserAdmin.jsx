// src/pages/ManageUserAdmin.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import {
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  ShieldCheck,
  UserCog,
  UserSquare2,
  X,
  Building2,
  BookMarked,
  BadgeDollarSign,
  Boxes,
  ChefHat,
  Plane,
  Car,
  Settings,
  ListOrdered,
  Filter,
  Download,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

/* ---------- Theme ---------- */
const GRAD_FROM = "from-[#DA22FF]";
const GRAD_TO = "to-[#9733EE]";
const GRAD_BG = `bg-gradient-to-r ${GRAD_FROM} ${GRAD_TO}`;
const ICON_COLOR = "text-[#9733EE]";
const CARD = "rounded-xl border border-neutral-200 bg-white shadow-sm";

/* ---------- Roles (model enum) ---------- */
const ROLES = [
  "Customer",
  "Admin",
  "AC-Manager",
  "Author",
  "CF-Manager",
  "IN-Manager",
  "Chef",
  "TP-Manager",
  "VC-Manager",
];

const ROLES2 = [
  "Admin",
  "AC-Manager",
  "Author",
  "CF-Manager",
  "IN-Manager",
  "Chef",
  "TP-Manager",
  "VC-Manager",
];
const MANAGEMENT_ROLES = ["Admin", "AC-Manager", "CF-Manager", "IN-Manager", "TP-Manager", "VC-Manager"];
const SERVICE_ROLES = ["Author", "Chef"];
const NON_CUSTOMER_ROLES = ROLES.filter((r) => r !== "Customer");
const GENDERS = ["Male", "Female", "Other"];
const STATUSES = ["active", "disabled", "pending"]; // optional model field

const ROLE_META = {
  Customer: { label: "Customer", icon: <UserSquare2 className={`h-4 w-4 ${ICON_COLOR}`} /> },
  Admin: { label: "Admin", icon: <ShieldCheck className={`h-4 w-4 ${ICON_COLOR}`} /> },
  "AC-Manager": { label: "AC Manager", icon: <Building2 className={`h-4 w-4 ${ICON_COLOR}`} /> },
  Author: { label: "Author", icon: <BookMarked className={`h-4 w-4 ${ICON_COLOR}`} /> },
  "CF-Manager": { label: "CF Manager", icon: <BadgeDollarSign className={`h-4 w-4 ${ICON_COLOR}`} /> },
  "IN-Manager": { label: "IN Manager", icon: <Boxes className={`h-4 w-4 ${ICON_COLOR}`} /> },
  Chef: { label: "Chef", icon: <ChefHat className={`h-4 w-4 ${ICON_COLOR}`} /> },
  "TP-Manager": { label: "TP Manager", icon: <Plane className={`h-4 w-4 ${ICON_COLOR}`} /> },
  "VC-Manager": { label: "VC Manager", icon: <Car className={`h-4 w-4 ${ICON_COLOR}`} /> },
};

/* ---------- API base ---------- */
const RAW_BASE =
  (import.meta.env?.VITE_BACKEND_URL || "").toString() ||
  (import.meta.env?.VITE_API_URL || "").toString() ||
  "http://localhost:5000";
const BASE = RAW_BASE.replace(/\/+$/, "");
const api = axios.create({ baseURL: BASE });

api.interceptors.request.use((config) => {
  const t = localStorage.getItem("token");
  if (t) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});
api.interceptors.response.use(
  (r) => r,
  (err) => {
    const s = err?.response?.status;
    if (s === 401 || s === 403) toast.error(err?.response?.data?.message || "Unauthorized.");
    return Promise.reject(err);
  }
);

const UsersAPI = {
  list: () => api.get("/api/user"),
  create: (payload) => api.post("/api/user", payload),
  updateRole: (id, role) => api.put(`/api/user/${id}/role`, { role }),
  remove: (id) => api.delete(`/api/user/${id}`),
};

/* ---------- helpers ---------- */
const EMPTY = {
  firstName: "",
  lastName: "",
  nationality: "",
  email: "",
  mobile: "",
  gender: "Other",
  password: "",
  role: "Customer",
};
function decodeJwtEmail() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1] || ""));
    return payload?.email || null;
  } catch {
    return null;
  }
}
function avatarColor(seed = "") {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return `hsl(${h} 80% 85%)`;
}
function initials(u) {
  const f = (u?.firstName || "").trim()[0] || "";
  const l = (u?.lastName || "").trim()[0] || "";
  const both = (f + l).toUpperCase();
  return both || (u?.email?.[0] || "U").toUpperCase();
}
function fmtDate(d) {
  try {
    if (!d) return "—";
    return new Date(d).toLocaleString();
  } catch {
    return "—";
  }
}
function todayISO() {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d;
}
function daysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n); d.setHours(0, 0, 0, 0); return d;
}
function strength(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 5);
}
function toCSV(rows) {
  const cols = ["firstName", "lastName", "email", "mobile", "gender", "nationality", "role", "status", "lastLogin", "createdAt"];
  const header = cols.join(",");
  const lines = rows.map((r) =>
    cols.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(",")
  );
  return [header, ...lines].join("\n");
}

/* ---------- component ---------- */
export default function ManageUserAdmin() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  /* left dashboard tabs */
  const [tab, setTab] = useState("Overview"); // Overview | Activity | Settings | <role>

  /* collapsible groups */
  const [grpMgmtOpen, setGrpMgmtOpen] = useState(true);
  const [grpServOpen, setGrpServOpen] = useState(true);
  const [grpCustOpen, setGrpCustOpen] = useState(true);

  /* search + filters */
  const [q, setQ] = useState(localStorage.getItem("useradmin_q") || "");
  const [filterRole, setFilterRole] = useState(localStorage.getItem("useradmin_role") || "All");
  const [filterNationality, setFilterNationality] = useState(localStorage.getItem("useradmin_nat") || "All");
  const [filterGender, setFilterGender] = useState(localStorage.getItem("useradmin_gen") || "All");
  const [filterStatus, setFilterStatus] = useState(localStorage.getItem("useradmin_status") || "All");

  /* create popup modal */
  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [showPw, setShowPw] = useState(false);

  /* profile drawer */
  const [profile, setProfile] = useState(null);

  const myEmail = decodeJwtEmail();

  async function load() {
    try {
      setLoading(true);
      const res = await UsersAPI.list();
      const list = Array.isArray(res?.data) ? res.data : res?.data?.users || [];
      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load users");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    localStorage.setItem("useradmin_q", q);
    localStorage.setItem("useradmin_role", filterRole);
    localStorage.setItem("useradmin_nat", filterNationality);
    localStorage.setItem("useradmin_gen", filterGender);
    localStorage.setItem("useradmin_status", filterStatus);
  }, [q, filterRole, filterNationality, filterGender, filterStatus]);

  /* computed: counts, nationalities, etc. */
  const counts = useMemo(() => {
    const c = Object.fromEntries(ROLES.map((r) => [r, 0]));
    rows.forEach((u) => { const r = u.role || "Customer"; if (c[r] !== undefined) c[r] += 1; });
    return c;
  }, [rows]);

  const nationalities = useMemo(() => {
    const set = new Set(); rows.forEach((u) => u.nationality && set.add(u.nationality));
    return ["All", ...Array.from(set).sort()];
  }, [rows]);

  /* for overview metrics */
  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((u) => (u.status || "active") === "active").length;
    const disabled = rows.filter((u) => u.status === "disabled").length;
    const createdToday = rows.filter((u) => u.createdAt && new Date(u.createdAt) >= todayISO()).length;
    const createdThisWeek = rows.filter((u) => u.createdAt && new Date(u.createdAt) >= daysAgo(7)).length;
    return { total, active, disabled, createdToday, createdThisWeek };
  }, [rows]);

  /* filtering + search for table (applies on role tabs) */
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    let list = rows;

    // left tab role quick filter
    if (ROLES.includes(tab)) list = list.filter((u) => (u.role || "Customer") === tab);

    // top filters
    if (filterRole !== "All") list = list.filter((u) => (u.role || "Customer") === filterRole);
    if (filterNationality !== "All") list = list.filter((u) => (u.nationality || "") === filterNationality);
    if (filterGender !== "All") list = list.filter((u) => (u.gender || "") === filterGender);
    if (filterStatus !== "All") list = list.filter((u) => (u.status || "active") === filterStatus);

    // search
    list = list.filter((u) => {
      if (!t) return true;
      const hay = [u.firstName, u.lastName, u.email, u.mobile, u.nationality, u.gender, u.role, u.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(t);
    });

    return list;
  }, [rows, q, filterRole, filterNationality, filterGender, filterStatus, tab]);

  /* create flow (popup) */
  function openCreateModal() {
    setForm(EMPTY); setShowPw(false); setOpenCreate(true);
  }
  function closeCreateModal() { setOpenCreate(false); }
  async function submitCreate(e) {
    e.preventDefault();
    const f = form;
    if (!f.firstName.trim() || !f.lastName.trim()) return toast.error("First & Last name required");
    if (!f.email.trim()) return toast.error("Email is required");
    if (!f.password.trim()) return toast.error("Password is required");
    if (!f.mobile.trim()) return toast.error("Mobile is required");
    if (!f.nationality.trim()) return toast.error("Nationality is required");
    if (!GENDERS.includes(f.gender)) return toast.error("Invalid gender");
    if (!ROLES.includes(f.role)) return toast.error("Invalid role");
    try {
      setCreating(true);
      await UsersAPI.create({
        firstName: f.firstName.trim(),
        lastName: f.lastName.trim(),
        nationality: f.nationality.trim(),
        email: f.email.trim().toLowerCase(),
        mobile: f.mobile.trim(),
        gender: f.gender,
        password: f.password,
        role: f.role,
      });
      toast.success("User created");
      setOpenCreate(false);
      setTab(f.role);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.response?.data?.error || e?.message || "Create user failed");
    } finally { setCreating(false); }
  }

  /* inline role edit with confirmation */
  async function changeRoleInline(user, role) {
    if (user.email === myEmail) return toast.error("You cannot change your own role");
    if (role === "Customer") return toast.error("Cannot set role to Customer (customers are read-only)");
    const labelOld = ROLE_META[user.role]?.label || user.role;
    const labelNew = ROLE_META[role]?.label || role;
    const ok = confirm(`Change role for ${user.email}\n\n${labelOld} → ${labelNew}\n\nProceed?`);
    if (!ok) return;
    try {
      await UsersAPI.updateRole(user._id, role);
      toast.success("Role updated");
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Update role failed");
    }
  }

  /* delete */
  async function onDelete(user) {
    if (user.email === myEmail) return toast.error("You cannot delete your own account");
    const ok = confirm(`Delete ${user.firstName || ""} ${user.lastName || ""} (${user.email})?`);
    if (!ok) return;
    try {
      await UsersAPI.remove(user._id);
      toast.success("User deleted");
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Delete failed");
    }
  }

  /* profile drawer (read-only quick view) */
  function openProfile(u) { setProfile(u); }
  function closeProfile() { setProfile(null); }

  /* export */
  function exportCSV() {
    if (!filtered.length) return toast.error("Nothing to export");
    const csv = toCSV(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `users_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  /* ------------ Render ------------ */
  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      <Toaster position="top-right" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Mini dashboard */}
        <aside className="lg:col-span-1">
          <div className={`rounded-xl p-[1px] ${GRAD_BG}`}>
            <section className="rounded-xl bg-white p-4 shadow-sm">
              <h2 className="text-sm font-medium text-neutral-700 mb-3 flex items-center gap-2">
                <Users className={`h-5 w-5 ${ICON_COLOR}`} />
                User Dashboard
              </h2>

              {/* Nav */}
              <div className="space-y-2">
                <SideTab active={tab === "Overview"} icon={<Users className={`h-4 w-4 ${ICON_COLOR}`} />} onClick={() => setTab("Overview")}>
                  Overview
                </SideTab>
                <SideTab active={tab === "Activity"} icon={<ListOrdered className={`h-4 w-4 ${ICON_COLOR}`} />} onClick={() => setTab("Activity")}>
                  Activity Logs
                </SideTab>
                <SideTab active={tab === "Settings"} icon={<Settings className={`h-4 w-4 ${ICON_COLOR}`} />} onClick={() => setTab("Settings")}>
                  Settings
                </SideTab>

                {/* Grouped role tabs with collapse */}
                <Group
                  title="Management Roles"
                  open={grpMgmtOpen}
                  onToggle={() => setGrpMgmtOpen((v) => !v)}
                >
                  {MANAGEMENT_ROLES.map((r) => (
                    <SideTab key={r} active={tab === r} icon={ROLE_META[r]?.icon} onClick={() => setTab(r)}>
                      {(ROLE_META[r]?.label || r)} ({counts[r] ?? 0})
                    </SideTab>
                  ))}
                </Group>

                <Group
                  title="Service Roles"
                  open={grpServOpen}
                  onToggle={() => setGrpServOpen((v) => !v)}
                >
                  {SERVICE_ROLES.map((r) => (
                    <SideTab key={r} active={tab === r} icon={ROLE_META[r]?.icon} onClick={() => setTab(r)}>
                      {(ROLE_META[r]?.label || r)} ({counts[r] ?? 0})
                    </SideTab>
                  ))}
                </Group>

                <Group
                  title="Customers"
                  open={grpCustOpen}
                  onToggle={() => setGrpCustOpen((v) => !v)}
                >
                  <SideTab active={tab === "Customer"} icon={ROLE_META["Customer"]?.icon} onClick={() => setTab("Customer")}>
                    Customer ({counts.Customer ?? 0})
                  </SideTab>
                </Group>

                <div className="pt-3">
                  <button
                    type="button" /* ✅ ensure not submitting any form */
                    onClick={openCreateModal}
                    className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-white ${GRAD_BG} hover:opacity-95 active:opacity-90`}
                  >
                    <Plus size={16} />
                    New User
                  </button>
                </div>
              </div>
            </section>
          </div>
        </aside>

        {/* RIGHT: Content */}
        <main className="lg:col-span-2 space-y-6">
          {/* Overview */}
          {tab === "Overview" && (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCardBig label="Total Users" value={stats.total} />
                <StatCardBig label="Active Users" value={stats.active} />
                <StatCardBig label="New Today" value={stats.createdToday} />
                <StatCardBig label="Disabled" value={stats.disabled} />
              </div>

              <div className="grid lg:grid-cols-2 gap-4">
                <div className={CARD}>
                  <div className="p-4 flex items-center justify-between">
                    <div className="font-medium">Users by Role</div>
                  </div>
                  <div className="px-4 pb-4">
                    <RoleBarChart counts={counts} />
                  </div>
                </div>

                <div className={CARD}>
                  <div className="p-4 flex items-center justify-between">
                    <div className="font-medium">Top Nationalities</div>
                  </div>
                  <div className="px-4 pb-4">
                    <NationalityBars rows={rows} />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Activity Logs */}
          {tab === "Activity" && (
            <div className={CARD}>
              <div className="p-4 border-b">
                <div className="font-medium">Recent Activity</div>
                <p className="text-xs text-neutral-500">Shows signup (createdAt) and lastLogin if available.</p>
              </div>
              <ul className="divide-y">
                {rows.slice(0, 25).map((u) => (
                  <li key={u._id || u.email} className="p-4 text-sm">
                    <span className="font-medium">{u.email}</span>
                    <span className="text-neutral-500"> — created </span>
                    <span>{fmtDate(u.createdAt)}</span>
                    <span className="text-neutral-500"> · last login </span>
                    <span>{fmtDate(u.lastLogin)}</span>
                  </li>
                ))}
                {rows.length === 0 && <li className="p-4 text-neutral-500 text-sm">No activity.</li>}
              </ul>
            </div>
          )}

          {/* Settings */}
          {tab === "Settings" && (
            <div className={CARD}>
              <div className="p-4 border-b">
                <div className="font-medium">Admin Settings</div>
                <p className="text-xs text-neutral-500">Display hints—wire to backend if needed.</p>
              </div>
              <div className="p-4 grid sm:grid-cols-2 gap-4">
                <div className="rounded-lg border p-3">
                  <div className="text-sm font-medium">Password Policy</div>
                  <ul className="mt-2 text-sm text-neutral-600 list-disc pl-5 space-y-1">
                    <li>Min length 8 chars</li>
                    <li>Upper/lower/digit/special recommended</li>
                    <li>Rotate every 90 days (optional)</li>
                  </ul>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-sm font-medium">User Limits</div>
                  <p className="mt-2 text-sm text-neutral-600">Set caps on roles/total users from backend if needed.</p>
                </div>
              </div>
            </div>
          )}

          {/* Role lists */}
          {tab !== "Overview" && tab !== "Activity" && tab !== "Settings" && (
            <>
              {/* Controls */}
              <div className={`${CARD} p-3`}>
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="flex items-center rounded-full p-[1px] group bg-transparent transition-colors group-focus-within:bg-gradient-to-r group-focus-within:from-[#DA22FF] group-focus-within:to-[#9733EE]">
                    <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-72 border border-neutral-200 transition-colors group-focus-within:border-transparent">
                      <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#9733EE]" />
                      <input
                        className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-700"
                        placeholder="Search name / email / mobile…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    <FilterChip label="Role" value={filterRole} onChange={setFilterRole} options={["All", ...ROLES]} />
                    <FilterChip label="Nationality" value={filterNationality} onChange={setFilterNationality} options={nationalities} />
                    <FilterChip label="Gender" value={filterGender} onChange={setFilterGender} options={["All", ...GENDERS]} />
                    <FilterChip label="Status" value={filterStatus} onChange={setFilterStatus} options={["All", ...STATUSES]} />
                    <button onClick={exportCSV} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-neutral-50">
                      <Download className="h-4 w-4" /> Export CSV
                    </button>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-neutral-50 text-neutral-600">
                      <tr>
                        <th className="text-left p-3">User</th>
                        <th className="text-left p-3">Email</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-left p-3">Last Login</th>
                        <th className="text-left p-3">Role</th>
                        <th className="text-right p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!loading &&
                        filtered.map((u) => {
                          const isMe = u.email === myEmail;
                          const isCustomer = (u.role || "Customer") === "Customer";
                          const canEditRole = !isCustomer && !isMe;
                          const canDelete = !isMe;
                          const status = u.status || "active";
                          return (
                            <tr key={u._id || u.email} className="border-t hover:bg-neutral-50/60">
                              <td className="p-3">
                                <button className="flex items-center gap-3" onClick={() => openProfile(u)}>
                                  <div
                                    className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold"
                                    style={{ background: avatarColor(u.email || u.firstName || "") }}
                                  >
                                    {initials(u)}
                                  </div>
                                  <div className="text-left">
                                    <div className="font-medium text-neutral-800">
                                      {[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}
                                    </div>
                                    <div className="text-xs text-neutral-500">
                                      {u.nationality || "—"} · {u.gender || "—"}
                                    </div>
                                  </div>
                                </button>
                              </td>
                              <td className="p-3">{u.email || "—"}</td>
                              <td className="p-3"><StatusPill status={status} /></td>
                              <td className="p-3">{fmtDate(u.lastLogin)}</td>
                              <td className="p-3">
                                {canEditRole ? (
                                  <select
                                    className="rounded-lg border px-2 py-1.5 text-sm"
                                    value={u.role}
                                    onChange={(e) => changeRoleInline(u, e.target.value)}
                                  >
                                    {NON_CUSTOMER_ROLES.map((r) => (
                                      <option key={r} value={r}>
                                        {ROLE_META[r]?.label || r}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="text-neutral-700">{ROLE_META[u.role]?.label || u.role || "Customer"}</span>
                                )}
                              </td>
                              <td className="p-3">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    disabled={!canDelete}
                                    onClick={() => onDelete(u)}
                                    className={[
                                      "px-3 py-1.5 rounded-full border",
                                      canDelete
                                        ? "border-rose-200 text-rose-600 bg-white hover:bg-neutral-50"
                                        : "border-neutral-200 bg-neutral-100 text-neutral-400 cursor-not-allowed",
                                    ].join(" ")}
                                    title={isMe ? "You cannot delete your own account" : "Delete user"}
                                  >
                                    <Trash2 className="h-4 w-4 inline-block mr-1" />
                                    Delete
                                  </button>
                                  <button
                                    onClick={() => openProfile(u)}
                                    className="px-2 py-1.5 rounded-full border border-neutral-200 bg-white hover:bg-neutral-50"
                                    title="Open profile"
                                  >
                                    <ChevronRight className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                      {!loading && filtered.length === 0 && (
                        <tr>
                          <td className="p-8 text-center text-neutral-500" colSpan={6}>
                            {rows.length === 0
                              ? "No users loaded. Ensure GET /api/user returns an array."
                              : `No results match your filters.`}
                          </td>
                        </tr>
                      )}

                      {loading && (
                        <tr>
                          <td className="p-8 text-center text-neutral-500" colSpan={6}>
                            Loading users…
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Create User Modal (popup) */}
      {openCreate && (
        <Modal onClose={closeCreateModal} title="Create User">
          <form onSubmit={submitCreate} className="space-y-5">
            <Section title="Basic Info">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="First Name *">
                  <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
                </Field>
                <Field label="Last Name *">
                  <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
                </Field>
                <Field label="Gender *">
                  <Select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} options={GENDERS} />
                </Field>
                <Field label="Nationality *">
                  <Input value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} required />
                </Field>
              </div>
            </Section>

            <Section title="Contact">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Email *">
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </Field>
                <Field label="Mobile *">
                  <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required />
                </Field>
              </div>
            </Section>

            <Section title="Credentials & Role">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Password *">
                  <div className="relative">
                    <Input
                      type={showPw ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-neutral-100 text-xs"
                      onClick={() => setShowPw((s) => !s)}
                    >
                      {showPw ? "Hide" : "Show"}
                    </button>
                  </div>
                  <PasswordStrength value={form.password} />
                </Field>
                <Field label="Role *">
                  <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} options={ROLES2} />
                </Field>
              </div>
            </Section>

            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setForm(EMPTY)} className="px-4 py-2 rounded-xl border border-neutral-200">
                Clear
              </button>
              <button type="submit" disabled={creating} className={`px-4 py-2 rounded-xl text-white ${GRAD_BG} disabled:opacity-60`}>
                {creating ? "Creating…" : "Create"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Profile drawer (read-only) */}
      {profile && (
        <SlideOver onClose={closeProfile} title="User Profile">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="h-12 w-12 rounded-full flex items-center justify-center text-sm font-semibold"
              style={{ background: avatarColor(profile.email || profile.firstName || "") }}
            >
              {initials(profile)}
            </div>
            <div>
              <div className="font-semibold">
                {[profile.firstName, profile.lastName].filter(Boolean).join(" ") || "—"}
              </div>
              <div className="text-sm text-neutral-600">{profile.email}</div>
              <div className="text-xs text-neutral-500">
                {ROLE_META[profile.role]?.label || profile.role || "Customer"} · {profile.nationality || "—"} · {profile.gender || "—"}
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-lg border p-3">
              <div className="text-sm font-medium">Account</div>
              <div className="mt-2 text-sm text-neutral-700">
                <div>Status: <StatusPill status={profile.status || "active"} /></div>
                <div>Last Login: {fmtDate(profile.lastLogin)}</div>
                <div>Created: {fmtDate(profile.createdAt)}</div>
                <div>Mobile: {profile.mobile || "—"}</div>
              </div>
            </div>
          </div>
        </SlideOver>
      )}
    </div>
  );
}

/* ---------- small UI bits ---------- */

function Group({ title, open, onToggle, children }) {
  return (
    <div className="pt-3">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between text-xs uppercase tracking-wide text-neutral-500"
      >
        <span>{title}</span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && <div className="mt-1 space-y-2">{children}</div>}
    </div>
  );
}
function SideTab({ active, icon, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition border",
        active ? "bg-white shadow-sm border-transparent" : "bg-white hover:bg-neutral-50 border-neutral-200",
      ].join(" ")}
    >
      <span className="inline-flex items-center gap-2 text-neutral-800">
        <span>{icon}</span>
        {children}
      </span>
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
function StatusPill({ status }) {
  const s = (status || "active").toLowerCase();
  const cls =
    s === "active"
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
      : s === "disabled"
      ? "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200"
      : "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200";
  const label = s === "active" ? "Active" : s === "disabled" ? "Disabled" : "Pending";
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}
function FilterChip({ label, value, onChange, options }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-neutral-600 inline-flex items-center gap-1"><Filter className="h-4 w-4" /> {label}</span>
      <select className="rounded-lg border px-2 py-1.5 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
function Section({ title, children }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm font-medium mb-2">{title}</div>
      {children}
    </div>
  );
}
function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-sm font-medium mb-1">{label}</div>
      {children}
    </label>
  );
}
function Label({ children }) {
  return <label className="block text-sm font-medium mb-1.5">{children}</label>;
}
function Input(props) {
  return (
    <input
      {...props}
      className={[
        "w-full rounded-xl border border-neutral-200 px-3 py-2",
        "placeholder:text-neutral-400 text-neutral-800",
        "focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/40",
      ].join(" ")}
    />
  );
}
function Select({ value, onChange, options = [] }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className={[
        "w-full rounded-xl border border-neutral-200 px-3 py-2",
        "text-neutral-800 bg-white",
        "focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/40",
      ].join(" ")}
    >
      {options.map((op) => (
        <option key={op} value={op}>
          {op}
        </option>
      ))}
    </select>
  );
}
function PasswordStrength({ value }) {
  const s = strength(value);
  const tips = ["Too short", "Weak", "Okay", "Good", "Strong", "Very strong"];
  return (
    <div className="mt-1">
      <div className="h-1.5 w-full bg-neutral-200 rounded">
        <div
          className={`h-1.5 rounded ${s <= 2 ? "bg-rose-500" : s === 3 ? "bg-amber-500" : "bg-emerald-500"}`}
          style={{ width: `${(s / 5) * 100}%` }}
        />
      </div>
      <div className="text-xs text-neutral-500 mt-1">{tips[s] || tips[0]}</div>
    </div>
  );
}
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {/* Content */}
      <div
        className={`relative z-[1001] w-full max-w-3xl rounded-2xl p-[1px] ${GRAD_BG} shadow-2xl`}
        onClick={(e) => e.stopPropagation()}  /* ✅ don't let clicks bubble to backdrop */
      >
        <div className="rounded-2xl bg-white">
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
            <div className="font-semibold">{title}</div>
            <button
              type="button" /* ✅ no accidental submit */
              onClick={onClose}
              className="p-2 rounded-md hover:bg-neutral-100"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-neutral-700" />
            </button>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
function SlideOver({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[1000]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside
        className="absolute right-0 top-0 h-full w-full sm:w-[480px] bg-white shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-semibold">{title}</div>
          <button type="button" onClick={onClose} className="p-2 rounded hover:bg-neutral-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 overflow-auto">{children}</div>
      </aside>
    </div>
  );
}

/* ---------- tiny charts (no deps) ---------- */
function RoleBarChart({ counts }) {
  const data = ROLES.map((r) => ({ name: ROLE_META[r]?.label || r, value: counts[r] || 0 }));
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.name} className="flex items-center gap-2">
          <div className="w-28 text-xs text-neutral-600">{d.name}</div>
          <div className="flex-1 h-3 bg-neutral-100 rounded">
            <div className="h-3 rounded" style={{ width: `${(d.value / max) * 100}%`, background: "linear-gradient(90deg,#DA22FF,#9733EE)" }} />
          </div>
          <div className="w-8 text-right text-xs text-neutral-700">{d.value}</div>
        </div>
      ))}
    </div>
  );
}
function NationalityBars({ rows }) {
  const map = new Map();
  rows.forEach((u) => {
    const n = u.nationality || "Unknown";
    map.set(n, (map.get(n) || 0) + 1);
  });
  const arr = Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = Math.max(1, ...arr.map(([, v]) => v));
  return (
    <div className="space-y-2">
      {arr.map(([n, v]) => (
        <div key={n} className="flex items-center gap-2">
          <div className="w-28 text-xs text-neutral-600 truncate" title={n}>{n}</div>
          <div className="flex-1 h-3 bg-neutral-100 rounded">
            <div className="h-3 rounded" style={{ width: `${(v / max) * 100}%`, background: "linear-gradient(90deg,#DA22FF,#9733EE)" }} />
          </div>
          <div className="w-8 text-right text-xs text-neutral-700">{v}</div>
        </div>
      ))}
    </div>
  );
}
