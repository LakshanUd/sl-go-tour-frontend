// src/pages/RegisterPage.jsx
import { useState, useCallback, useMemo } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate, Link } from "react-router-dom";
import { UserPlus, ShieldCheck, Sparkles, CheckCircle2, XCircle } from "lucide-react";

const GRAD_FROM = "from-[#09E65A]";
const GRAD_TO = "to-[#16A34A]";
const GRAD_BG = `bg-gradient-to-r ${GRAD_FROM} ${GRAD_TO}`;
const GLASS =
  "backdrop-blur-xl bg-white/70 supports-[backdrop-filter]:bg-white/60 border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.08)]";

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
    pwChecks.score <= 2 ? "bg-rose-500" : pwChecks.score === 3 ? "bg-amber-500" : "bg-emerald-500";

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
    if (!form.gender) errs.push("Please select a gender.");

    // Enforce ALL password rules
    if (!pwChecks.checks.length) errs.push("Password must be at least 8 characters.");
    if (!pwChecks.checks.upper) errs.push("Password must include an uppercase letter.");
    if (!pwChecks.checks.lower) errs.push("Password must include a lowercase letter.");
    if (!pwChecks.checks.number) errs.push("Password must include a number.");
    if (!pwChecks.checks.special) errs.push("Password must include a special character.");

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
    <div className="relative min-h-screen overflow-hidden pt-24">
      <Toaster position="top-right" />

      {/* Vivid gradient backdrop */}
      <div className={`absolute inset-0 ${GRAD_BG} opacity-90`} />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.15] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, #fff 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      {/* Animated blobs */}
      <Blob className="left-[-6rem] top-[-6rem]" size={420} delay={0} />
      <Blob className="right-[-8rem] bottom-[-8rem]" size={520} delay={4} />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left panel — brand / copy */}
          <div className="hidden lg:flex flex-col justify-center text-white/95">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-white/10 border border-white/20 grid place-items-center">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="text-2xl font-semibold tracking-tight">
                GoTour <span className="opacity-80">TMS</span>
              </div>
            </div>

            <h1 className="mt-6 text-4xl font-semibold leading-tight">
              Create your{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
                traveler account
              </span>
              .
            </h1>
            <p className="mt-3 text-white/85">
              Book tours, vehicles, and stays with a seamless experience. Your
              privacy and security come first.
            </p>

            <div className="mt-6 inline-flex items-center gap-2 text-white/90 text-sm">
              <ShieldCheck className="h-4 w-4" />
              Enterprise-grade security & privacy-first design.
            </div>
          </div>

          {/* Right panel — register card */}
          <div className="w-full">
            <div className="rounded-2xl p-[1px] bg-white/20">
              <div className={`rounded-2xl ${GLASS}`}>
                {/* Card header */}
                <div className="px-6 pt-6 pb-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-neutral-900">
                      Create account
                    </h2>
                    <div className={`h-1.5 w-16 rounded-full ${GRAD_BG}`} />
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={onSubmit} className="px-6 pb-6 space-y-4">
                  {/* Name */}
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="First Name">
                      <input
                        type="text"
                        name="firstName"
                        value={form.firstName}
                        onChange={onChange}
                        required
                        placeholder="John"
                        className="w-full rounded-xl border border-neutral-300/70 bg-white/80 px-3 py-2 placeholder:text-neutral-400 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#09E65A]/40"
                      />
                    </Field>
                    <Field label="Last Name">
                      <input
                        type="text"
                        name="lastName"
                        value={form.lastName}
                        onChange={onChange}
                        required
                        placeholder="Doe"
                        className="w-full rounded-xl border border-neutral-300/70 bg-white/80 px-3 py-2 placeholder:text-neutral-400 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#09E65A]/40"
                      />
                    </Field>
                  </div>

                  {/* Email */}
                  <Field label="Email">
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={onChange}
                      required
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-neutral-300/70 bg-white/80 px-3 py-2 placeholder:text-neutral-400 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#09E65A]/40"
                    />
                  </Field>

                  {/* Mobile */}
                  <Field label="Mobile">
                    <input
                      type="tel"
                      name="mobile"
                      value={form.mobile}
                      onChange={(e) => {
                      let v = e.target.value;
                      v = v.replace(/[^\d+]/g, "");      // allow only digits and '+'
                      v = v.replace(/(?!^)\+/g, "");     // keep '+' only if it's the first char
                      setForm({ ...form, mobile: v });
                    }}
                      required
                      placeholder="+94 77 123 4567"
                      className="w-full rounded-xl border border-neutral-300/70 bg-white/80 px-3 py-2 placeholder:text-neutral-400 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#09E65A]/40"
                    />
                  </Field>

                  {/* Passwords */}
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Password">
                      <div className="relative">
                        <input
                          type={showPw ? "text" : "password"}
                          name="password"
                          value={form.password}
                          onChange={onChange}
                          minLength={8}
                          required
                          placeholder="••••••••"
                          className="w-full rounded-xl border border-neutral-300/70 bg-white/80 px-3 py-2 pr-10 placeholder:text-neutral-400 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#09E65A]/40"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw((s) => !s)}
                          className="absolute inset-y-0 right-2 my-auto text-xs px-2 py-1 rounded-md text-neutral-600 hover:bg-neutral-100 cursor-pointer"
                        >
                          {showPw ? "Hide" : "Show"}
                        </button>
                      </div>
                      {/* Strength Bar */}
                      <div className="mt-2">
                        <div className="h-2 w-full bg-neutral-200/80 rounded overflow-hidden">
                          <div
                            className={`h-2 ${barColor} transition-all`}
                            style={{ width: `${(pwChecks.score / 5) * 100}%` }}
                          />
                        </div>
                        <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                          <Req ok={pwChecks.checks.length} label="Min 8 chars" />
                          <Req ok={pwChecks.checks.upper} label="Uppercase" />
                          <Req ok={pwChecks.checks.lower} label="Lowercase" />
                          <Req ok={pwChecks.checks.number} label="Number" />
                          <Req ok={pwChecks.checks.special} label="Special char" />
                        </ul>
                      </div>
                    </Field>

                    <Field label="Confirm Password">
                      <div className="relative">
                        <input
                          type={showPw2 ? "text" : "password"}
                          name="confirmPassword"
                          value={form.confirmPassword}
                          onChange={onChange}
                          minLength={8}
                          required
                          placeholder="••••••••"
                          className="w-full rounded-xl border border-neutral-300/70 bg-white/80 px-3 py-2 pr-10 placeholder:text-neutral-400 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#09E65A]/40"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw2((s) => !s)}
                          className="absolute inset-y-0 right-2 my-auto text-xs px-2 py-1 rounded-md text-neutral-600 hover:bg-neutral-100 cursor-pointer"
                        >
                          {showPw2 ? "Hide" : "Show"}
                        </button>
                      </div>
                    </Field>
                  </div>

                  {/* Nationality & Gender */}
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Nationality">
                      <input
                        type="text"
                        name="nationality"
                        value={form.nationality}
                        onChange={onChange}
                        required
                        placeholder="Sri Lankan"
                        className="w-full rounded-xl border border-neutral-300/70 bg-white/80 px-3 py-2 placeholder:text-neutral-400 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#09E65A]/40"
                      />
                    </Field>
                    <Field label="Gender">
                      <select
                        name="gender"
                        value={form.gender}
                        onChange={onChange}
                        required
                        className="w-full rounded-xl border border-neutral-300/70 bg-white/80 px-3 py-2 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#09E65A]/40"
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

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full rounded-xl py-2.5 text-white ${GRAD_BG} hover:opacity-95 active:opacity-90 disabled:opacity-60 inline-flex items-center justify-center gap-2 cursor-pointer`}
                  >
                    <UserPlus className="h-4 w-4" />
                    {loading ? "Creating Account…" : "Create Account"}
                  </button>

                  <p className="text-xs text-neutral-500 text-center">
                    By creating an account you agree to our{" "}
                    <Link to="/legal/terms" className="underline cursor-pointer">
                      Terms
                    </Link>{" "}
                    &{" "}
                    <Link
                      to="/legal/privacy"
                      className="underline cursor-pointer"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </form>
              </div>
            </div>

            {/* Bottom links */}
            <div className="mt-4 text-center text-sm text-white/90">
              Already have an account?{" "}
              <Link
                to="/login"
                className="underline decoration-white/70 hover:decoration-white cursor-pointer"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------- Small UI helpers ------- */
function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-sm font-medium mb-1.5 text-neutral-800">{label}</div>
      {children}
    </label>
  );
}

function Req({ ok, label }) {
  return (
    <li className={`inline-flex items-center gap-1 ${ok ? "text-emerald-600" : "text-neutral-600"}`}>
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5 text-neutral-400" />}
      <span>{label}</span>
    </li>
  );
}

function Blob({ className = "", size = 420, delay = 0 }) {
  return (
    <div
      className={[
        "absolute rounded-full blur-3xl opacity-40",
        "animate-[float_12s_ease-in-out_infinite]",
        className,
      ].join(" ")}
      style={{
        width: size,
        height: size,
        background:
          "radial-gradient(circle at 30% 30%, #ffffff, rgba(255,255,255,0.25) 40%, rgba(255,255,255,0) 60%)",
        animationDelay: `${delay}s`,
      }}
    />
  );
}

/* Add this in your global CSS (or Tailwind layer)
@keyframes float {
  0%, 100% { transform: translateY(0px) translateX(0px) }
  50% { transform: translateY(-16px) translateX(6px) }
}
*/
