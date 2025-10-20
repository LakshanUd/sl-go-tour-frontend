// src/pages/RegisterPage.jsx
import { useState, useCallback, useMemo } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate, Link } from "react-router-dom";
import {
  UserPlus,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  User,
  Mail,
  Phone,
  Lock,
  Globe,
  Users,
} from "lucide-react";

/* ---------- Countries (ISO common names) ---------- */
const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria","Azerbaijan",
  "Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi",
  "Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo","Costa Rica","Cote d'Ivoire","Croatia","Cuba","Cyprus","Czechia",
  "Democratic Republic of the Congo","Denmark","Djibouti","Dominica","Dominican Republic",
  "Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia",
  "Fiji","Finland","France",
  "Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana",
  "Haiti","Honduras","Hungary",
  "Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy",
  "Jamaica","Japan","Jordan",
  "Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan",
  "Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg",
  "Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar",
  "Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway",
  "Oman",
  "Pakistan","Palau","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal",
  "Qatar",
  "Romania","Russia","Rwanda",
  "Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria",
  "Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu",
  "Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan",
  "Vanuatu","Vatican City","Venezuela","Vietnam",
  "Yemen",
  "Zambia","Zimbabwe"
];

/* ---------- API base ---------- */
const RAW_BASE =
  (import.meta.env?.VITE_BACKEND_URL || "").toString() ||
  (import.meta.env?.VITE_API_URL || "").toString() ||
  "http://localhost:5000";
const BASE = RAW_BASE.replace(/\/+$/, "");
const api = axios.create({ baseURL: BASE });

export default function RegisterPage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    mobile: "",
    nationality: "",
    gender: "",
    role: "Customer",
  });
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  /* ----- Password strength + checks ----- */
  const pw = form.password || "";
  const pwChecks = useMemo(() => {
    const checks = {
      length: pw.length >= 8,
      upper: /[A-Z]/.test(pw),
      lower: /[a-z]/.test(pw),
      number: /\d/.test(pw),
      special: /[^A-Za-z0-9]/.test(pw),
    };
    const score = Object.values(checks).filter(Boolean).length; // 0..5
    return { checks, score };
  }, [pw]);

  const barColor =
    pwChecks.score <= 2
      ? "bg-rose-500"
      : pwChecks.score === 3
      ? "bg-amber-500"
      : "bg-emerald-500";

  const validate = () => {
    const errs = [];
    if (!form.firstName.trim()) errs.push("First name is required.");
    if (!form.lastName.trim()) errs.push("Last name is required.");
    if (!form.email.trim()) errs.push("Email is required.");
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.push("Enter a valid email.");
    if (!form.mobile.trim()) errs.push("Mobile is required.");
    if (!/^\+?[0-9]{7,}$/.test(form.mobile))
      errs.push("Invalid mobile number");
    if (!form.nationality.trim()) errs.push("Nationality is required.");
    if (form.nationality && !COUNTRIES.includes(form.nationality)) {
      errs.push("Please select a nationality from the list.");
    }
    if (!form.gender) errs.push("Please select a gender.");

    // Enforce ALL password rules
    if (!pwChecks.checks.length)
      errs.push("Password must be at least 8 characters.");
    if (!pwChecks.checks.upper)
      errs.push("Password must include an uppercase letter.");
    if (!pwChecks.checks.lower)
      errs.push("Password must include a lowercase letter.");
    if (!pwChecks.checks.number) errs.push("Password must include a number.");
    if (!pwChecks.checks.special)
      errs.push("Password must include a special character.");

    if (form.password !== form.confirmPassword)
      errs.push("Passwords do not match.");

    if (errs.length) {
      errs.forEach((m) => toast.error(m));
      return false;
    }
    return true;
  };

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (loading) return;
      if (!validate()) return;

      try {
        setLoading(true);
        const { confirmPassword, role, ...payload } = form;
        const res = await api.post("/api/user/register", {
          ...payload,
          role: "Customer",
        });
        if (res?.status >= 200 && res?.status < 300) {
          toast.success("Registration successful! Please sign in.");
          nav("/login", { replace: true });
        } else {
          throw new Error("Unexpected response.");
        }
      } catch (err) {
        const data = err?.response?.data;
        const msg =
          data?.message ||
          data?.error ||
          err?.message ||
          "Registration failed. Please try again.";
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [form, loading, nav]
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-green-50 pt-24">
      <Toaster position="top-right" />

      {/* Animated gradient orbs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-green-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
      <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000" />

      {/* Subtle pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2310b981' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left panel — brand showcase */}
          <div className="hidden lg:flex flex-col justify-center space-y-8">
            {/* Logo & Brand */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/80 backdrop-blur-sm shadow-lg border border-emerald-100">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 grid place-items-center shadow-lg">
                  <Sparkles className="h-6 w-6 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 tracking-tight">
                    GoTour
                  </div>
                  <div className="text-xs font-medium text-emerald-600 tracking-wide">
                    TOUR MANAGEMENT SYSTEM
                  </div>
                </div>
              </div>

              {/* Headline */}
              <div className="space-y-4">
                <h1 className="text-5xl font-bold text-gray-900 leading-tight">
                  Start Your
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-600">
                    Adventure Today
                  </span>
                </h1>
                <p className="text-lg text-gray-600 leading-relaxed max-w-md">
                  Create your account to book tours, vehicles, and accommodations with ease. Join thousands of travelers worldwide.
                </p>
              </div>

              {/* Features */}
              <div className="space-y-3 pt-2">
                <FeatureItem icon={ShieldCheck} text="Secure & encrypted data" />
                <FeatureItem icon={Sparkles} text="Seamless booking experience" />
                <FeatureItem icon={UserPlus} text="Quick account setup" />
              </div>
            </div>
          </div>

          {/* Right panel — register card */}
          <div className="w-full">
            <div className="mx-auto max-w-2xl">
              {/* Mobile logo */}
              <div className="lg:hidden flex justify-center mb-8">
                <div className="inline-flex items-center gap-3 px-4 py-3 rounded-2xl bg-white shadow-lg border border-emerald-100">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 grid place-items-center">
                    <Sparkles className="h-5 w-5 text-white" strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="text-xl font-bold text-gray-900">GoTour</div>
                    <div className="text-[10px] font-medium text-emerald-600 tracking-wide">
                      TMS
                    </div>
                  </div>
                </div>
              </div>

              {/* Register card */}
              <div className="rounded-3xl bg-white shadow-2xl border border-gray-100 overflow-hidden">
                {/* Card header */}
                <div className="px-8 pt-8 pb-6 bg-gradient-to-br from-emerald-50 to-green-50 border-b border-gray-100">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-gray-900">
                      Create Your Account
                    </h2>
                    <p className="text-sm text-gray-600">
                      Fill in your details to get started
                    </p>
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={onSubmit} className="px-8 py-8 space-y-5">
                  {/* Name fields */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="First Name" icon={User}>
                      <input
                        type="text"
                        name="firstName"
                        value={form.firstName}
                        onChange={onChange}
                        required
                        placeholder="John"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                      />
                    </Field>
                    <Field label="Last Name" icon={User}>
                      <input
                        type="text"
                        name="lastName"
                        value={form.lastName}
                        onChange={onChange}
                        required
                        placeholder="Doe"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                      />
                    </Field>
                  </div>

                  {/* Email */}
                  <Field label="Email Address" icon={Mail}>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={onChange}
                      required
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                    />
                  </Field>

                  {/* Mobile */}
                  <Field label="Mobile Number" icon={Phone}>
                    <input
                      type="tel"
                      name="mobile"
                      value={form.mobile}
                      onChange={(e) => {
                        let v = e.target.value;
                        v = v.replace(/[^\d+]/g, ""); // allow only digits and '+'
                        v = v.replace(/(?!^)\+/g, ""); // keep '+' only if it's the first char
                        setForm({ ...form, mobile: v });
                      }}
                      required
                      placeholder="+94 77 123 4567"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                    />
                  </Field>

                  {/* Password fields */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Field label="Password" icon={Lock}>
                        <div className="relative">
                          <input
                            type={showPw ? "text" : "password"}
                            name="password"
                            value={form.password}
                            onChange={onChange}
                            minLength={8}
                            required
                            placeholder="••••••••"
                            className="w-full pl-10 pr-12 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPw((s) => !s)}
                            aria-label={showPw ? "Hide password" : "Show password"}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {showPw ? (
                              <EyeOff className="h-5 w-5" />
                            ) : (
                              <Eye className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </Field>
                    </div>

                    <Field label="Confirm Password" icon={Lock}>
                      <div className="relative">
                        <input
                          type={showPw2 ? "text" : "password"}
                          name="confirmPassword"
                          value={form.confirmPassword}
                          onChange={onChange}
                          minLength={8}
                          required
                          placeholder="••••••••"
                          className="w-full pl-10 pr-12 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw2((s) => !s)}
                          aria-label={showPw2 ? "Hide password" : "Show password"}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showPw2 ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </Field>
                  </div>

                  {/* Password strength indicator */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs font-medium text-gray-700">
                      <span>Password Strength</span>
                      <span className="text-gray-500">
                        {pwChecks.score === 0
                          ? "Very Weak"
                          : pwChecks.score <= 2
                          ? "Weak"
                          : pwChecks.score === 3
                          ? "Fair"
                          : pwChecks.score === 4
                          ? "Good"
                          : "Strong"}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-2 ${barColor} transition-all duration-300`}
                        style={{ width: `${(pwChecks.score / 5) * 100}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <Req ok={pwChecks.checks.length} label="8+ characters" />
                      <Req ok={pwChecks.checks.upper} label="Uppercase" />
                      <Req ok={pwChecks.checks.lower} label="Lowercase" />
                      <Req ok={pwChecks.checks.number} label="Number" />
                      <Req ok={pwChecks.checks.special} label="Special char" />
                    </div>
                  </div>

                  {/* Nationality & Gender */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Nationality" icon={Globe}>
                      <CountrySelect
                        value={form.nationality}
                        onChange={(val) => setForm((f) => ({ ...f, nationality: val }))}
                        required
                      />
                    </Field>
                    <Field label="Gender" icon={Users}>
                      <select
                        name="gender"
                        value={form.gender}
                        onChange={onChange}
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all appearance-none cursor-pointer"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                          backgroundPosition: "right 0.75rem center",
                          backgroundRepeat: "no-repeat",
                          backgroundSize: "1.5em 1.5em",
                        }}
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </Field>
                  </div>

                  {/* Hidden role */}
                  <input type="hidden" name="role" value="Customer" />

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:from-emerald-600 hover:to-green-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all inline-flex items-center justify-center gap-2"
                  >
                    <UserPlus className="h-5 w-5" />
                    {loading ? "Creating Account..." : "Create Account"}
                  </button>
                </form>

                {/* Card footer */}
                <div className="px-8 py-6 bg-gray-50 border-t border-gray-100">
                  <p className="text-xs text-gray-500 text-center leading-relaxed">
                    By creating an account, you agree to our{" "}
                    <Link
                      to="/legal/terms"
                      className="text-emerald-600 hover:text-emerald-700 font-medium underline"
                    >
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                      to="/legal/privacy"
                      className="text-emerald-600 hover:text-emerald-700 font-medium underline"
                    >
                      Privacy Policy
                    </Link>
                  </p>
                </div>
              </div>

              {/* Login link */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Searchable Country dropdown restricted to predefined list */
function CountrySelect({ value, onChange, required }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const t = query.trim().toLowerCase();
    if (!t) return COUNTRIES;
    return COUNTRIES.filter((c) => c.toLowerCase().includes(t));
  }, [query]);

  const handleSelect = (val) => {
    onChange(val);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="relative">
      {/* Hidden native select for form constraint/required semantics */}
      <select
        tabIndex={-1}
        aria-hidden="true"
        required={required}
        value={COUNTRIES.includes(value) ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        className="hidden"
      >
        <option value="" />
        {COUNTRIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="w-full pl-10 pr-10 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 text-left focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
      >
        {value || "Select a country"}
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          ▼
        </span>
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-full rounded-xl border-2 border-gray-200 bg-white shadow-lg">
          <div className="p-2 border-b">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country…"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <ul className="max-h-56 overflow-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-500">No matches</li>
            )}
            {filtered.map((c) => (
              <li key={c}>
                <button
                  type="button"
                  onClick={() => handleSelect(c)}
                  className={`w-full text-left px-3 py-2 hover:bg-emerald-50 ${c === value ? "bg-emerald-50" : ""}`}
                >
                  {c}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ------- UI Components ------- */
function Field({ label, icon: Icon, children }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-gray-400" />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

function Req({ ok, label }) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${
        ok ? "text-emerald-600" : "text-gray-400"
      }`}
    >
      {ok ? (
        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 flex-shrink-0" />
      )}
      <span>{label}</span>
    </div>
  );
}

function FeatureItem({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-3 text-gray-700">
      <div className="h-8 w-8 rounded-lg bg-emerald-100 grid place-items-center flex-shrink-0">
        <Icon className="h-4 w-4 text-emerald-600" strokeWidth={2.5} />
      </div>
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}

/* Add these animations to your global CSS or Tailwind config:

@keyframes blob {
  0%, 100% { 
    transform: translate(0, 0) scale(1);
  }
  25% {
    transform: translate(20px, -50px) scale(1.1);
  }
  50% {
    transform: translate(-20px, 20px) scale(0.9);
  }
  75% {
    transform: translate(50px, 50px) scale(1.05);
  }
}

.animate-blob {
  animation: blob 7s infinite;
}

.animation-delay-2000 {
  animation-delay: 2s;
}

.animation-delay-4000 {
  animation-delay: 4s;
}
*/