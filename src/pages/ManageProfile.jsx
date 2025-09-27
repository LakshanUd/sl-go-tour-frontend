// src/pages/ManageProfile.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { User, Shield, Mail, Phone, Globe2, Save, RefreshCcw, Lock, Eye, EyeOff } from "lucide-react";

/* ---------- Theme tokens (match the rest of your app) ---------- */
const gradFrom = "from-[#DA22FF]";
const gradTo = "to-[#9733EE]";
const GRAD_BG = `bg-gradient-to-r ${gradFrom} ${gradTo}`;
const GRAD_TEXT = `text-transparent bg-clip-text bg-gradient-to-r ${gradFrom} ${gradTo}`;

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
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export default function ManageProfile() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    nationality: "",
    mobile: "",
    gender: "Other",
  });
  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [readOnly, setReadOnly] = useState(false); // when /me endpoints are missing

  const token = localStorage.getItem("token");
  const tokenUser = useMemo(() => (token ? decodeJWT(token) : null), [token]);

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
        // If 404 or not implemented, fall through to fallback
      }

      // Fallback: GET all, filter by token email
      if (!tokenUser?.email) throw new Error("No user email in token. Please re-login.");
      const res2 = await api.get("/api/user");
      const list = Array.isArray(res2?.data) ? res2.data : [];
      const me = list.find((x) => (x.email || "").toLowerCase() === tokenUser.email.toLowerCase());
      if (!me) throw new Error("Current user not found. Contact support.");

      hydrate(me, true); // read-only if we don't have /me routes
      toast(
        "Using fallback: /api/user/me not found. Profile editing limited.",
        { icon: "ℹ️" }
      );
    } finally {
      setLoading(false);
    }
  }

  function hydrate(u, roFlag) {
    setProfile(u);
    setForm({
      firstName: u.firstName || "",
      lastName: u.lastName || "",
      nationality: u.nationality || "",
      mobile: u.mobile || "",
      gender: GENDERS.includes(u.gender) ? u.gender : "Other",
    });
    setReadOnly(!!roFlag);
  }

  useEffect(() => {
    load();
  }, []);

  const onChange = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const onPw = (k) => (e) => setPwForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSaveProfile(e) {
    e.preventDefault();
    if (readOnly) {
      toast("Profile editing is disabled because /api/user/me is not implemented.", { icon: "🔒" });
      return;
    }

    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error("First & last name are required");
      return;
    }
    if (!form.nationality.trim()) {
      toast.error("Nationality is required");
      return;
    }
    if (!form.mobile.trim()) {
      toast.error("Mobile is required");
      return;
    }
    if (!GENDERS.includes(form.gender)) {
      toast.error("Select a valid gender");
      return;
    }

    try {
      setSaving(true);
      // PUT /api/user/me should accept patch fields (excluding email/role)
      const res = await api.put("/api/user/me", {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        nationality: form.nationality.trim(),
        mobile: form.mobile.trim(),
        gender: form.gender,
      });
      const updated = res?.data?.user || res?.data || form;
      setProfile((p) => ({ ...(p || {}), ...updated }));
      toast.success("Profile updated");
    } finally {
      setSaving(false);
    }
  }

  async function onChangePassword(e) {
    e.preventDefault();
    if (readOnly) {
      toast("Password change is disabled because /api/user/me is not implemented.", { icon: "🔒" });
      return;
    }

    const { currentPassword, newPassword, confirmNewPassword } = pwForm;
    if (!currentPassword || !newPassword) {
      toast.error("Current & new password are required");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error("New passwords do not match");
      return;
    }

    try {
      setSavingPw(true);
      // Option A: dedicated endpoint (recommended)
      // await api.post("/api/user/change-password", { currentPassword, newPassword });

      // Option B: PUT /api/user/me with password fields (if you implement it this way)
      await api.put("/api/user/me", { currentPassword, password: newPassword });

      toast.success("Password updated");
      setPwForm({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Toaster position="top-right" />

      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Manage <span className={GRAD_TEXT}>Profile</span>
          </h1>
          <p className="text-sm text-neutral-500">
            View and update your personal details.
          </p>
          <p className="text-[10px] text-neutral-400 mt-1">
            Preferred endpoints: <code>/api/user/me (GET, PUT)</code>
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50"
          title="Refresh"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border bg-white p-6 text-neutral-600">Loading…</div>
      ) : !profile ? (
        <div className="rounded-2xl border bg-white p-6 text-neutral-600">
          Unable to load your profile. Try logging in again.
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Left — overview card */}
          <aside className="lg:col-span-1">
            <div className="rounded-2xl border bg-white p-5">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100">
                <User className="h-6 w-6 text-[#9733EE]" />
              </div>
              <div className="mt-3">
                <div className="text-lg font-semibold">
                  {[profile.firstName, profile.lastName].filter(Boolean).join(" ") || "—"}
                </div>
                <div className="text-sm text-neutral-500 capitalize">
                  {profile.role || "Customer"}
                </div>
              </div>

              <div className="mt-5 space-y-2 text-sm">
                <div className="inline-flex items-center gap-2 text-neutral-700">
                  <Mail className="h-4 w-4" />
                  <span>{profile.email || "—"}</span>
                </div>
                <div className="inline-flex items-center gap-2 text-neutral-700">
                  <Phone className="h-4 w-4" />
                  <span>{profile.mobile || "—"}</span>
                </div>
                <div className="inline-flex items-center gap-2 text-neutral-700">
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

          {/* Right — forms */}
          <section className="lg:col-span-2 space-y-5">
            {/* Profile form */}
            <div className={`rounded-2xl p-[1px] ${GRAD_BG}`}>
              <div className="rounded-[14px] bg-white">
                <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
                  <div className="font-semibold">Profile details</div>
                  <div className="text-xs text-neutral-500">Email & role cannot be changed</div>
                </div>

                <form onSubmit={onSaveProfile} className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>First name</Label>
                    <Input
                      value={form.firstName}
                      onChange={onChange("firstName")}
                      placeholder="John"
                      disabled={readOnly}
                    />
                  </div>
                  <div>
                    <Label>Last name</Label>
                    <Input
                      value={form.lastName}
                      onChange={onChange("lastName")}
                      placeholder="Doe"
                      disabled={readOnly}
                    />
                  </div>
                  <div>
                    <Label>Nationality</Label>
                    <Input
                      value={form.nationality}
                      onChange={onChange("nationality")}
                      placeholder="Sri Lankan"
                      disabled={readOnly}
                    />
                  </div>
                  <div>
                    <Label>Mobile</Label>
                    <Input
                      value={form.mobile}
                      onChange={onChange("mobile")}
                      placeholder="+94 71 123 4567"
                      disabled={readOnly}
                    />
                  </div>
                  <div>
                    <Label>Gender</Label>
                    <Select
                      value={form.gender}
                      onChange={onChange("gender")}
                      options={GENDERS}
                      disabled={readOnly}
                    />
                  </div>

                  <div className="md:col-span-2 flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      className="px-4 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50"
                      onClick={() => hydrate(profile, readOnly)}
                      disabled={saving}
                    >
                      Reset
                    </button>
                    <button
                      type="submit"
                      className={`px-4 py-2 rounded-xl text-white ${GRAD_BG} disabled:opacity-60`}
                      disabled={saving || readOnly}
                    >
                      <Save className="h-4 w-4 inline mr-1" />
                      {saving ? "Saving…" : "Save changes"}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Password form */}
            <div className="rounded-2xl border bg-white">
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
                <div className="font-semibold inline-flex items-center gap-2">
                  <Lock className="h-4 w-4 text-[#9733EE]" />
                  Change password
                </div>
                <div className="text-xs text-neutral-500">Min 6 characters</div>
              </div>

              <form onSubmit={onChangePassword} className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Current password</Label>
                  <PasswordInput
                    value={pwForm.currentPassword}
                    onChange={onPw("currentPassword")}
                    show={showPw}
                    setShow={setShowPw}
                    disabled={readOnly}
                    placeholder="Current password"
                  />
                </div>
                <div>
                  <Label>New password</Label>
                  <PasswordInput
                    value={pwForm.newPassword}
                    onChange={onPw("newPassword")}
                    show={showPw}
                    setShow={setShowPw}
                    disabled={readOnly}
                    placeholder="New password"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Confirm new password</Label>
                  <PasswordInput
                    value={pwForm.confirmNewPassword}
                    onChange={onPw("confirmNewPassword")}
                    show={showPw}
                    setShow={setShowPw}
                    disabled={readOnly}
                    placeholder="Confirm new password"
                  />
                </div>

                <div className="md:col-span-2 flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50"
                    onClick={() => setPwForm({ currentPassword: "", newPassword: "", confirmNewPassword: "" })}
                    disabled={savingPw}
                  >
                    Clear
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
          </section>
        </div>
      )}
    </div>
  );
}

/* --------------- Small UI atoms --------------- */
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
        "focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30 disabled:bg-neutral-50",
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
        "focus:outline-none focus:ring-2 focus:ring-[#DA22FF]/30 disabled:bg-neutral-50",
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
