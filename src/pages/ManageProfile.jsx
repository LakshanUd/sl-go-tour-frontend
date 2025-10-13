// src/pages/ManageProfile.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import {
  LayoutDashboard,
  Package,
  FileText,
  BarChart3,
  Bell,
  Settings,
  Users,
  Wallet,
  CalendarDays,
  ChevronRight,
  ChevronUp,
  RefreshCcw,
  User as UserIcon,
  Shield,
  Mail,
  Phone,
  Globe2,
  Lock,
  Eye,
  EyeOff,
  Pencil,
  X,
  Check,
  Venus,
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
import { NavLink } from "react-router-dom";

/* ===== Theme (green, matches Vehicle/Accommodation pages) ===== */
const GRAD_FROM = "from-[#09E65A]";
const GRAD_TO = "to-[#16A34A]";
const GRAD_BG = `bg-gradient-to-r ${GRAD_FROM} ${GRAD_TO}`;
const ICON_COLOR = "text-[#16A34A]";
const gradText = `text-transparent bg-clip-text ${GRAD_BG}`;

/* ===== Persisted sidebar state key ===== */
const LS_KEY = "adminSidebarOpen";

/* ---------- Backend base ---------- */
const RAW_BASE =
  (import.meta.env?.VITE_BACKEND_URL || "").toString() ||
  (import.meta.env?.VITE_API_URL || "").toString() ||
  "http://localhost:5000";
const BASE = RAW_BASE.replace(/\/+$/, "");

/* ---------- API client with token ---------- */
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
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      "Request failed";
    toast.error(msg);
    return Promise.reject(err);
  }
);

/* ---------- Helpers ---------- */
const GENDERS = ["Male", "Female", "Other"];
function decodeJWT(token) {
  try {
    const [, payload] = token.split(".");
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const pad = "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(b64 + pad));
  } catch {
    return null;
  }
}

export default function ManageProfile() {
  /* ===== Sidebar accordions (persisted) ===== */
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

  /* ===== Profile state ===== */
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [readOnly, setReadOnly] = useState(false); // when /me endpoints are missing

  // inline editing state
  const [editingField, setEditingField] = useState(null); // 'fullName' | 'mobile' | 'nationality' | 'gender'
  const [draftValue, setDraftValue] = useState(""); // for single-field edits
  const [draftFirst, setDraftFirst] = useState(""); // for full name
  const [draftLast, setDraftLast] = useState(""); // for full name

  // change-password modal
  const [pwOpen, setPwOpen] = useState(false);
  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const token = localStorage.getItem("token");
  const tokenUser = useMemo(() => (token ? decodeJWT(token) : null), [token]);

  function hydrate(u, roFlag) {
    setProfile(u);
    setReadOnly(!!roFlag);
    setEditingField(null);
    setDraftValue("");
    setDraftFirst("");
    setDraftLast("");
  }

  async function load() {
    try {
      setLoading(true);

      // Preferred: /api/user/me
      try {
        const res = await api.get("/api/user/me");
        const u = res?.data;
        if (u && typeof u === "object") {
          hydrate(u, false);
          return;
        }
      } catch (e) {
        const status = e?.response?.status;
        if (status !== 404 && status !== 501) throw e;
      }

      // Fallback: GET all, filter by token email
      if (!tokenUser?.email) throw new Error("No user email in token. Please re-login.");
      const res2 = await api.get("/api/user");
      const list = Array.isArray(res2?.data) ? res2.data : [];
      const me = list.find((x) => (x.email || "").toLowerCase() === tokenUser.email.toLowerCase());
      if (!me) {
        toast.error("Current user not found. Contact support.");
        setProfile(null);
        return;
      }
      hydrate(me, true);
      toast("Using fallback: /api/user/me not found. Profile editing limited.", { icon: "ℹ️" });
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  /* ===== Inline edit handlers ===== */
  function startEdit(field) {
    if (readOnly) {
      toast("Editing disabled because /api/user/me is not implemented.", { icon: "🔒" });
      return;
    }
    setEditingField(field);
    if (!profile) return;
    if (field === "fullName") {
      setDraftFirst(profile.firstName || "");
      setDraftLast(profile.lastName || "");
    } else {
      setDraftValue(profile[field] || "");
    }
  }
  function cancelEdit() {
    setEditingField(null);
    setDraftValue("");
    setDraftFirst("");
    setDraftLast("");
  }
  async function saveEdit() {
    if (!profile || !editingField) return;
    try {
      setSaving(true);
      let payload = {};
      if (editingField === "fullName") {
        if (!draftFirst.trim()) return toast.error("First name is required");
        payload = { firstName: draftFirst.trim(), lastName: (draftLast || "").trim() };
      } else if (editingField === "gender") {
        if (!GENDERS.includes(draftValue)) return toast.error("Select a valid gender");
        payload = { gender: draftValue };
      } else if (editingField === "mobile") {
        if (!String(draftValue).trim()) return toast.error("Mobile is required");
        payload = { mobile: String(draftValue).trim() };
      } else if (editingField === "nationality") {
        if (!String(draftValue).trim()) return toast.error("Nationality is required");
        payload = { nationality: String(draftValue).trim() };
      }

      const res = await api.put("/api/user/me", payload);
      const updated = res?.data?.user || res?.data || payload;
      setProfile((p) => ({ ...(p || {}), ...updated }));
      toast.success("Profile updated");
      cancelEdit();
    } finally {
      setSaving(false);
    }
  }

  /* ===== Password modal handlers ===== */
  const onPw = (k) => (e) => setPwForm((f) => ({ ...f, [k]: e.target.value }));
  async function onChangePassword(e) {
    e.preventDefault();
    if (readOnly) {
      toast("Password change is disabled because /api/user/me is not implemented.", { icon: "🔒" });
      return;
    }
    const { currentPassword, newPassword, confirmNewPassword } = pwForm;
    if (!currentPassword || !newPassword) return toast.error("Current & new password are required");
    if (newPassword.length < 6) return toast.error("New password must be at least 6 characters");
    if (newPassword !== confirmNewPassword) return toast.error("New passwords do not match");

    try {
      setSavingPw(true);
      await api.put("/api/user/me", { currentPassword, password: newPassword });
      toast.success("Password updated");
      setPwForm({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
      setPwOpen(false);
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 pt-24">
      <Toaster position="top-right" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ===== Sidebar ===== */}
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

            {/* 04. Account Settings */}
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

        {/* ===== Main content ===== */}
        <main className="lg:col-span-8 xl:col-span-9 space-y-6">
          {/* Header row */}
          <div className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold leading-tight">
                <span className={gradText}>Account</span> · Profile
              </h2>
              <p className="text-sm text-neutral-500">View and update your personal details.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={load}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-60"
                title="Refresh"
              >
                <RefreshCcw className={["h-4 w-4", loading ? "animate-spin" : ""].join(" ")} />
                {loading ? "Refreshing…" : "Refresh"}
              </button>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="rounded-2xl border bg-white p-6 text-neutral-600">Loading…</div>
          ) : !profile ? (
            <div className="rounded-2xl border bg-white p-6 text-neutral-600">Unable to load your profile.</div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-5">
              {/* Left — overview */}
              <aside className="lg:col-span-1">
                <div className="rounded-2xl border bg-white p-5">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100">
                    <UserIcon className={`h-6 w-6 ${ICON_COLOR}`} />
                  </div>
                  <div className="mt-3">
                    <div className="text-lg font-semibold">
                      {[profile.firstName, profile.lastName].filter(Boolean).join(" ") || "—"}
                    </div>
                    <div className="text-sm text-neutral-500 capitalize">{profile.role || "Customer"}</div>
                  </div>

                  <div className="mt-5 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-neutral-700">
                      <Mail className="h-4 w-4" />
                      <span>{profile.email || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-700">
                      <Phone className="h-4 w-4" />
                      <span>{profile.mobile || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-700">
                      <Globe2 className="h-4 w-4" />
                      <span>{profile.nationality || "—"}</span>
                    </div>
                  </div>

                  {readOnly && (
                    <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                      <Shield className="h-3.5 w-3.5 inline mr-1" />
                      Editing is limited because <code>/api/user/me</code> is not implemented on the backend.
                    </div>
                  )}
                </div>
              </aside>

              {/* Right — rows formatted exactly as requested */}
              <section className="lg:col-span-2 space-y-5">
                <div className="rounded-2xl border bg-white">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
                    <div className="font-semibold">Personal details</div>
                    <button
                      onClick={() => setPwOpen(true)}
                      className={`px-3 py-2 rounded-xl text-sm text-white ${GRAD_BG} hover:opacity-95 active:opacity-90`}
                    >
                      Change password
                    </button>
                  </div>

                  <div className="p-5 space-y-3">
                    {/* Full name row */}
                    <RowShell
                      icon={<UserIcon className={`h-4 w-4 ${ICON_COLOR}`} />}
                      label="Full name"
                      value={[profile.firstName, profile.lastName].filter(Boolean).join(" ") || "—"}
                      isEditing={editingField === "fullName"}
                      onEdit={() => startEdit("fullName")}
                      onCancel={cancelEdit}
                      onSave={saveEdit}
                    >
                      {/* Inline editor: split first / last */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                        <div>
                          <SmallLabel>First name</SmallLabel>
                          <Input value={draftFirst} onChange={(e) => setDraftFirst(e.target.value)} placeholder="First name" />
                        </div>
                        <div>
                          <SmallLabel>Last name</SmallLabel>
                          <Input value={draftLast} onChange={(e) => setDraftLast(e.target.value)} placeholder="Last name" />
                        </div>
                      </div>
                    </RowShell>

                    {/* Mobile */}
                    <RowShell
                      icon={<Phone className={`h-4 w-4 ${ICON_COLOR}`} />}
                      label="Mobile"
                      value={profile.mobile || "—"}
                      isEditing={editingField === "mobile"}
                      onEdit={() => startEdit("mobile")}
                      onCancel={cancelEdit}
                      onSave={saveEdit}
                    >
                      <Input
                        type="tel"
                        value={draftValue}
                        onChange={(e) => setDraftValue(e.target.value)}
                        placeholder="+94 71 123 4567"
                      />
                    </RowShell>

                    {/* Nationality */}
                    <RowShell
                      icon={<Globe2 className={`h-4 w-4 ${ICON_COLOR}`} />}
                      label="Nationality"
                      value={profile.nationality || "—"}
                      isEditing={editingField === "nationality"}
                      onEdit={() => startEdit("nationality")}
                      onCancel={cancelEdit}
                      onSave={saveEdit}
                    >
                      <Input
                        value={draftValue}
                        onChange={(e) => setDraftValue(e.target.value)}
                        placeholder="Sri Lankan"
                      />
                    </RowShell>

                    {/* Gender */}
                    <RowShell
                      icon={<Venus className={`h-4 w-4 ${ICON_COLOR}`} />}
                      label="Gender"
                      value={profile.gender || "Other"}
                      isEditing={editingField === "gender"}
                      onEdit={() => startEdit("gender")}
                      onCancel={cancelEdit}
                      onSave={saveEdit}
                    >
                      <Select value={draftValue} onChange={(e) => setDraftValue(e.target.value)} options={GENDERS} />
                    </RowShell>
                  </div>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>

      {/* ===== Change Password Modal ===== */}
      {pwOpen && (
        <Modal onClose={() => setPwOpen(false)}>
          <div className={`w-full max-w-xl rounded-2xl p-[1px] ${GRAD_BG} shadow-2xl`}>
            <div className="rounded-2xl bg-white">
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
                <div className="font-semibold inline-flex items-center gap-2">
                  <Lock className={`h-4 w-4 ${ICON_COLOR}`} />
                  Change password
                </div>
                <button className="p-2 rounded-md hover:bg-neutral-100" onClick={() => setPwOpen(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={onChangePassword} className="p-5 grid grid-cols-1 gap-4">
                <div>
                  <Label>Current password</Label>
                  <PasswordInput
                    value={pwForm.currentPassword}
                    onChange={onPw("currentPassword")}
                    show={showPw}
                    setShow={setShowPw}
                    placeholder="Current password"
                    disabled={readOnly}
                  />
                </div>
                <div>
                  <Label>New password</Label>
                  <PasswordInput
                    value={pwForm.newPassword}
                    onChange={onPw("newPassword")}
                    show={showPw}
                    setShow={setShowPw}
                    placeholder="New password (min 6 chars)"
                    disabled={readOnly}
                  />
                </div>
                <div>
                  <Label>Confirm new password</Label>
                  <PasswordInput
                    value={pwForm.confirmNewPassword}
                    onChange={onPw("confirmNewPassword")}
                    show={showPw}
                    setShow={setShowPw}
                    placeholder="Confirm new password"
                    disabled={readOnly}
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50"
                    onClick={() => setPwOpen(false)}
                    disabled={savingPw}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 rounded-xl text-white ${GRAD_BG} disabled:opacity-60`}
                    disabled={savingPw || readOnly}
                  >
                    {savingPw ? "Updating…" : "Update password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ===== Row Shell — “[icon] Label: Value … [edit icon]” with inline editor ===== */
function RowShell({ icon, label, value, isEditing, onEdit, onCancel, onSave, children }) {
  return (
    <div className="rounded-xl border border-neutral-200 px-3 py-2">
      {/* Display row */}
      {!isEditing && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-neutral-50 border border-neutral-200">
              {icon}
            </span>
            <span className="text-neutral-600">{label}:</span>
            <span className="text-neutral-900">{value}</span>
          </div>
          <button
            onClick={onEdit}
            type="button"
            className="p-2 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Edit row */}
      {isEditing && (
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-neutral-50 border border-neutral-200 shrink-0">
              {icon}
            </span>
            <div className="flex-1">{children}</div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onSave}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl"
              title="Save"
            >
              <Check className="h-4 w-4" /> Save
            </button>
            <button
              onClick={onCancel}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-neutral-200 bg-white hover:bg-neutral-50 rounded-xl"
              title="Cancel"
            >
              <X className="h-4 w-4" /> Cancel
            </button>
          </div>
    </div>
      )}
    </div>
  );
}

/* ===== Modal ===== */
function Modal({ onClose, children }) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative z-[1001] w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

/* ===== Sidebar bits (shared) ===== */
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

/* ===== Small UI atoms ===== */
function Label({ children }) {
  return <label className="block text-sm font-medium mb-1.5">{children}</label>;
}
function SmallLabel({ children }) {
  return <label className="block text-xs text-neutral-600 mb-1">{children}</label>;
}
function Input(props) {
  return (
    <input
      {...props}
      className={[
        "w-full rounded-xl border border-neutral-200 px-3 py-2",
        "placeholder:text-neutral-400 text-neutral-800",
        "focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30 disabled:bg-neutral-50",
      ].join(" ")}
    />
  );
}
function Select({ value, onChange, options = [], disabled }) {
  return (
    <select
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={[
        "w-full rounded-xl border border-neutral-200 px-3 py-2",
        "text-neutral-800 bg-white",
        "focus:outline-none focus:ring-2 focus:ring-[#09E65A]/30 disabled:bg-neutral-50",
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
function PasswordInput({ value, onChange, show, setShow, disabled, placeholder }) {
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
      />
      <button
        type="button"
        aria-label="Toggle password visibility"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-neutral-100"
        disabled={disabled}
      >
        {show ? <EyeOff className="h-4 w-4 text-neutral-600" /> : <Eye className="h-4 w-4 text-neutral-600" />}
      </button>
    </div>
  );
}
