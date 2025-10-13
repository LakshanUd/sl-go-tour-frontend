// src/pages/Admin/ManageUserAdmin.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import {
  Users,
  Plus,
  Search,
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
  Filter,
  Download,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  LayoutDashboard,
  FileText,
  BarChart3,
  CalendarDays,
  Wallet,
  MapPin,
  UtensilsCrossed,
  Hotel,
  Truck,
  MessageSquare,
  AlertCircle,
  Bot,
} from "lucide-react";
import { NavLink, Link } from "react-router-dom";
import { confirmToast } from "../../components/ConfirmToast";

/* ---------- Theme (GREEN like VehiclePage) ---------- */
const GRAD_FROM = "from-[#09E65A]";
const GRAD_TO = "to-[#16A34A]";
const GRAD_BG = `bg-gradient-to-r ${GRAD_FROM} ${GRAD_TO}`;
const ICON_COLOR = "text-[#16A34A]";
const CARD = "rounded-xl border border-neutral-200 bg-white shadow-sm";
const gradText = `text-transparent bg-clip-text ${GRAD_BG}`;

/* ---------- Persisted sidebar accordion ---------- */
const LS_KEY = "adminSidebarOpen";

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
  "None",
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
  role: "",
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

  /* NEW: Vehicle-style left sidebar accordion (persisted) */
  const [open, setOpen] = useState({
    overview: true,
    content: true,
    ops: true,
    reports: true,
    account: true,
  });
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
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(open));
    } catch {}
  }, [open]);

  /* main page state (kept) */
  const [tab, setTab] = useState("Overview"); // Overview | Activity | Settings | <role>

  const [grpMgmtOpen, setGrpMgmtOpen] = useState(true);
  const [grpServOpen, setGrpServOpen] = useState(true);
  const [grpCustOpen, setGrpCustOpen] = useState(true);

  const [q, setQ] = useState(localStorage.getItem("useradmin_q") || "");
  const [filterRole, setFilterRole] = useState(localStorage.getItem("useradmin_role") || "All");
  const [filterNationality, setFilterNationality] = useState(localStorage.getItem("useradmin_nat") || "All");
  const [filterGender, setFilterGender] = useState(localStorage.getItem("useradmin_gen") || "All");
  const [filterStatus, setFilterStatus] = useState(localStorage.getItem("useradmin_status") || "All");

  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [showPw, setShowPw] = useState(false);

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

  const counts = useMemo(() => {
    const c = Object.fromEntries(ROLES.map((r) => [r, 0]));
    rows.forEach((u) => { const r = u.role || "Customer"; if (c[r] !== undefined) c[r] += 1; });
    return c;
  }, [rows]);

  const nationalities = useMemo(() => {
    const set = new Set(); rows.forEach((u) => u.nationality && set.add(u.nationality));
    return ["All", ...Array.from(set).sort()];
  }, [rows]);

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((u) => (u.status || "active") === "active").length;
    const disabled = rows.filter((u) => u.status === "disabled").length;
    const createdToday = rows.filter((u) => u.createdAt && new Date(u.createdAt) >= todayISO()).length;
    const createdThisWeek = rows.filter((u) => u.createdAt && new Date(u.createdAt) >= daysAgo(7)).length;
    return { total, active, disabled, createdToday, createdThisWeek };
  }, [rows]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    let list = rows;

    if (ROLES.includes(tab)) list = list.filter((u) => (u.role || "Customer") === tab);

    if (filterRole !== "All") list = list.filter((u) => (u.role || "Customer") === filterRole);
    if (filterNationality !== "All") list = list.filter((u) => (u.nationality || "") === filterNationality);
    if (filterGender !== "All") list = list.filter((u) => (u.gender || "") === filterGender);
    if (filterStatus !== "All") list = list.filter((u) => (u.status || "active") === filterStatus);

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
      const payload = {
        firstName: f.firstName.trim(),
        lastName: f.lastName.trim(),
        nationality: f.nationality.trim(),
        email: f.email.trim().toLowerCase(),
        mobile: f.mobile.trim(),
        gender: f.gender,
        password: f.password,
        role: f.role, // send it anyway (backend might ignore)
      };

      const res = await UsersAPI.create(payload);
      const created = res?.data?.user || res?.data || null;

      // If backend ignored role, fix it using the dedicated endpoint
      if (created?._id && created.role !== f.role) {
        try {
          const ok = await confirmToast({
            title: "Set role after creation?",
            message: `The API might ignore "role" on create.\nApply role: ${f.role} to ${created.email}?`,
            confirmText: "Apply Role",
            cancelText: "Skip",
          });
          if (ok) {
            await UsersAPI.updateRole(created._id, f.role);
          }
        } catch (e) {
          toast.error("Created user but failed to set role. Check permissions.");
        }
      }

      toast.success("User created");
      setOpenCreate(false);
      setTab(f.role);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.response?.data?.error || e?.message || "Create user failed");
    } finally { setCreating(false); }
  }

  // ====== UPDATED: use ConfirmToast for role change ======
  async function changeRoleInline(user, role) {
    if (user.email === myEmail) return toast.error("You cannot change your own role");
    if (role === "Customer") return toast.error("Cannot set role to Customer (customers are read-only)");
    const labelOld = ROLE_META[user.role]?.label || user.role;
    const labelNew = ROLE_META[role]?.label || role;

    const ok = await confirmToast({
      title: "Change Role",
      message: `Change role for ${user.email}\n\n${labelOld} → ${labelNew}\n\nProceed?`,
      confirmText: "Change",
      cancelText: "Cancel",
    });
    if (!ok) return;

    try {
      await UsersAPI.updateRole(user._id, role);
      toast.success("Role updated");
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Update role failed");
    }
  }

  // ====== UPDATED: use ConfirmToast for delete ======
  async function onDelete(user) {
    if (user.email === myEmail) return toast.error("You cannot delete your own account");

    const name = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;
    const ok = await confirmToast({
      title: "Delete User",
      message: `Are you sure you want to delete ${name} (${user.email})?\nThis cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
    });
    if (!ok) return;

    try {
      await UsersAPI.remove(user._id);
      toast.success("User deleted");
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Delete failed");
    }
  }

  function openProfile(u) { setProfile(u); }
  function closeProfile() { setProfile(null); }

  function exportCSV() {
    if (!filtered.length) return toast.error("Nothing to export");
    const csv = toCSV(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `users_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  /* ------------ Render (with Vehicle-style sidebar) ------------ */
  return (
    <div className="min-h-screen bg-neutral-50 pt-24">
      <Toaster position="top-right" />

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ===== Sidebar (VehiclePage-style) ===== */}
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

        {/* ===== Main content (kept, now in right column) ===== */}
        <main className="lg:col-span-8 xl:col-span-9 space-y-6">
          {/* Header / Title row (moved here) */}
          <div className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold leading-tight">
                <span className={gradText}>Admin</span> · Users
              </h2>
              <p className="text-sm text-neutral-500">Manage users by role, export, and view activity.</p>
            </div>

            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="flex items-center rounded-full p-[1px] group bg-transparent transition-colors group-focus-within:bg-gradient-to-r group-focus-within:from-[#09E65A] group-focus-within:to-[#16A34A]">
                <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-72 border border-neutral-200 transition-colors group-focus-within:border-transparent">
                  <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#16A34A]" />
                  <input
                    className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-700"
                    placeholder="Search name / email / mobile…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>
              </div>

              {/* New user */}
              <button
                type="button"
                onClick={openCreateModal}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white ${GRAD_BG} hover:opacity-95 active:opacity-90`}
              >
                <Plus size={16} />
                New
              </button>

              <button onClick={exportCSV} className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50">
                <Download className="h-4 w-4" /> Export CSV
              </button>

              {/* Report */}
              <Link
                to="/reports/users"
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
                title="View user reports"
              >
                <BarChart3 className="h-4 w-4" />
                Report
              </Link>
            </div>
          </div>

          {/* Top tabs */}
          <div className={`${CARD} p-3`}>
            <div className="flex flex-wrap gap-2">
              {/* Role quick tabs — row 1 */}
              <div className="w-full flex flex-wrap gap-2 mt-2">
                <TopTab active={tab === "Overview"} onClick={() => setTab("Overview")}>Overview</TopTab>
                <TopTab active={tab === "Activity"} onClick={() => setTab("Activity")}>Activity Logs</TopTab>
                <TopTab active={tab === "Settings"} onClick={() => setTab("Settings")}>Settings</TopTab>
              </div>

              {/* Role quick tabs — row 2 */}
              <div className="w-full flex flex-wrap gap-2 mt-2">
                {["Admin", "Author", "Chef", "Customer"].map((r) => (
                  <TopTab key={r} active={tab === r} onClick={() => setTab(r)}>
                    {(ROLE_META[r]?.label || r)} ({counts[r] ?? 0})
                  </TopTab>
                ))}
              </div>

              {/* Role quick tabs — row 3 (Managers) */}
              <div className="w-full flex flex-wrap gap-2 mt-2">
                {["AC-Manager", "CF-Manager", "IN-Manager", "TP-Manager", "VC-Manager"].map((r) => (
                  <TopTab key={r} active={tab === r} onClick={() => setTab(r)}>
                    {(ROLE_META[r]?.label || r)} ({counts[r] ?? 0})
                  </TopTab>
                ))}
              </div>
            </div>
          </div>

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
              {/* Filters */}
              <div className={`${CARD} p-3`}>
                <div className="flex flex-wrap gap-2 items-center">
                  <FilterChip label="Role" value={filterRole} onChange={setFilterRole} options={["All", ...ROLES]} />
                  <FilterChip label="Nationality" value={filterNationality} onChange={setFilterNationality} options={nationalities} />
                  <FilterChip label="Gender" value={filterGender} onChange={setFilterGender} options={["All", ...GENDERS]} />
                  <FilterChip label="Status" value={filterStatus} onChange={setFilterStatus} options={["All", ...STATUSES]} />
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
                                    className="rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30"
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
                  <Input
                    inputMode="tel"
                    pattern="^\+?\d+$"
                    title='Use only numbers, optionally starting with "+"'
                    value={form.mobile}
                    onChange={(e) => {
                      let v = e.target.value;
                      v = v.replace(/[^\d+]/g, "");      // allow only digits and '+'
                      v = v.replace(/(?!^)\+/g, "");     // keep '+' only if it's the first char
                      setForm({ ...form, mobile: v });
                    }}
                    required
                  />
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

/* ---------- Vehicle-style sidebar bits ---------- */
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

/* ---------- small UI bits (green focus) ---------- */
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
      <select
        className="rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
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
        "focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30",
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
        "focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30",
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
    <div className="fixed inset-0 z-[1000] flex items-start justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Frame */}
      <div
        className={`relative z-[1001] w-full max-w-3xl rounded-2xl p-[1px] ${GRAD_BG} shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Card (scroll container) */}
        <div className="rounded-2xl bg-white max-h-[85vh] flex flex-col">
          {/* Sticky header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 sticky top-0 bg-white z-10">
            <div className="font-semibold">{title}</div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-md hover:bg-neutral-100"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-neutral-700" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="p-5 overflow-y-auto overscroll-contain">
            {children}
          </div>
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
            <div className="h-3 rounded" style={{ width: `${(d.value / max) * 100}%`, background: "linear-gradient(90deg,#09E65A,#16A34A)" }} />
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
  const arr = Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const max = Math.max(1, ...arr.map(([, v]) => v));

  return (
    <div className="space-y-2">
      {arr.map(([n, v]) => (
        <div key={n} className="flex items-center gap-2">
          <div className="w-28 text-xs text-neutral-600 truncate" title={n}>
            {n}
          </div>
          <div className="flex-1 h-3 bg-neutral-100 rounded">
            <div
              className="h-3 rounded"
              style={{
                width: `${(v / max) * 100}%`,
                background: "linear-gradient(90deg,#09E65A,#16A34A)"
              }}
            />
          </div>
          <div className="w-8 text-right text-xs text-neutral-700">{v}</div>
        </div>
      ))}
    </div>
  );
}
