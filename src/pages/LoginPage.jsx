// src/pages/LoginPage.jsx
import { useCallback, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { LogIn, ShieldCheck, Sparkles, Eye, EyeOff } from "lucide-react";

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

/* ---------- Google ---------- */
const GOOGLE_CLIENT_ID = "327500077174-p5n3ue3885f2l5dcdd0tl39v8u2u4eoq.apps.googleusercontent.com";
const GOOGLE_ENABLED = !!GOOGLE_CLIENT_ID;

/* ---------- Role-based landing pages ---------- */
const ROLE_HOME = {
  Admin: "/admin",
  "AC-Manager": "/dash/ac",
  Author: "/dash/author",
  "CF-Manager": "/dash/cf",
  "IN-Manager": "/dash/inventory",
  Chef: "/dash/chef",
  "TP-Manager": "/dash/tours",
  "VC-Manager": "/dash/vehicles",
  Customer: "/",
};

export default function LoginPage() {
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);

  const handleLogin = useCallback(async () => {
    if (loading) return;
    try {
      if (!email.trim() || !password.trim()) {
        toast.error("Email and password are required.");
        return;
      }
      setLoading(true);

      const res = await api.post("/api/user/login", {
        email: email.trim(),
        password: password.trim(),
      });

      const { token, user } = res?.data || {};
      if (!token || !user) throw new Error("Invalid login response.");

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      window.dispatchEvent(new CustomEvent("userLogin", { detail: user }));

      toast.success("Welcome back!");
      const target = ROLE_HOME[user.role] || "/";
      nav(target, { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Login failed. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [email, password, loading, nav]);

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleLogin();
    }
  };

  const doGoogleLogin = GOOGLE_ENABLED
    ? useGoogleLogin({
        onSuccess: async (googleRes) => {
          try {
            setGLoading(true);
            const res = await api.post("/api/user/google-login", {
              access_token: googleRes?.access_token,
            });
            const { token, user } = res?.data || {};
            if (!token || !user) throw new Error("Invalid Google login response.");

            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(user));
            window.dispatchEvent(new CustomEvent("userLogin", { detail: user }));
            toast.success("Logged in with Google!");
            const target = ROLE_HOME[user.role] || "/";
            nav(target, { replace: true });
          } catch (err) {
            const msg =
              err?.response?.data?.message ||
              err?.message ||
              "Google login failed.";
            toast.error(msg);
          } finally {
            setGLoading(false);
          }
        },
        onError: (err) => {
          console.error("[GoogleLogin] onError:", err);
          toast.error("Google login cancelled or failed.");
        },
        scope: "openid email profile",
      })
    : null;

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
              Sign in to manage your{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
                journeys
              </span>
              .
            </h1>
            <p className="mt-3 text-white/85">
              One dashboard for tours, vehicles, stays, bookings & more — built
              for speed, security, and simplicity.
            </p>

            <div className="mt-6 inline-flex items-center gap-2 text-white/90 text-sm">
              <ShieldCheck className="h-4 w-4" />
              Enterprise-grade security & privacy-first design.
            </div>
          </div>

          {/* Right panel — login card */}
          <div className="w-full">
            <div className="rounded-2xl p-[1px] bg-white/20">
              <div className={`rounded-2xl ${GLASS}`}>
                {/* Card header */}
                <div className="px-6 pt-6 pb-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-neutral-900">
                      Welcome back
                    </h2>
                    <div className={`h-1.5 w-16 rounded-full ${GRAD_BG}`} />
                  </div>
          </div>

                {/* Card body */}
                <div className="px-6 pb-6 space-y-4" onKeyDown={onKeyDown}>
            <div>
                    <label className="block text-sm font-medium mb-1.5 text-neutral-800">
                      Email
                    </label>
              <input
                type="email"
                      autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-neutral-300/70 bg-white/80 px-3 py-2 placeholder:text-neutral-400 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#09E65A]/40"
                placeholder="you@example.com"
                      required
              />
            </div>

            <div>
                    <label className="block text-sm font-medium mb-1.5 text-neutral-800">
                      Password
                    </label>
                    <div className="relative">
              <input
                        type={showPw ? "text" : "password"}
                        autoComplete="current-password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-xl border border-neutral-300/70 bg-white/80 px-3 py-2 pr-10 placeholder:text-neutral-400 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#09E65A]/40"
                placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((s) => !s)}
                        className="absolute inset-y-0 right-2 my-auto text-xs px-2 py-1 rounded-md text-neutral-600 hover:bg-neutral-100 cursor-pointer"
                      >
                        {showPw ? <EyeOff className="h-4 w-4 text-neutral-600" />
                         : <Eye className="h-4 w-4 text-neutral-600" />}
                      </button>
                    </div>
                    <div className="mt-1 text-right">
                      <Link
                        to="/forgot-password"
                        className="text-xs text-[#6b21a8] hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </Link>
                    </div>
            </div>

            <button
                    onClick={handleLogin}
                    disabled={loading}
                    className={`w-full rounded-xl py-2.5 text-white ${GRAD_BG} hover:opacity-95 active:opacity-90 disabled:opacity-60 inline-flex items-center justify-center gap-2 cursor-pointer`}
                  >
                    <LogIn className="h-4 w-4" />
              {loading ? "Signing in…" : "Sign in"}
            </button>

                  <div className="flex items-center gap-3">
                    <div className="h-px bg-neutral-200 flex-1" />
                    <span className="text-xs text-neutral-500">or</span>
                    <div className="h-px bg-neutral-200 flex-1" />
                  </div>

                  {GOOGLE_ENABLED ? (
                    <button
                      type="button"
                      onClick={() => doGoogleLogin && doGoogleLogin()}
                      disabled={gLoading}
                      className="w-full rounded-xl py-2.5 border border-neutral-300/70 bg-white/85 hover:bg-white text-neutral-800 disabled:opacity-60 inline-flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <GoogleIcon />
                      {gLoading ? "Connecting to Google…" : "Continue with Google"}
                    </button>
                  ) : (
                    <div className="text-xs text-neutral-500 text-center">
                      Google login not configured.
                    </div>
                  )}

                  <p className="text-xs text-neutral-500 text-center">
                    By continuing you agree to our{" "}
                    <Link to="/legal/terms" className="underline cursor-pointer">
                      Terms
                    </Link>{" "}
                    &{" "}
                    <Link to="/legal/privacy" className="underline cursor-pointer">
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom links */}
            <div className="mt-4 text-center text-sm text-white/90">
              New here?{" "}
              <Link
                to="/register"
                className="underline decoration-white/70 hover:decoration-white cursor-pointer"
              >
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ====== Tiny blob component (animated gradient circle) ====== */
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

/* Inline Google 'G' icon (no extra deps) */
function GoogleIcon() {
  return (
    <svg
      viewBox="0 0 533.5 544.3"
      className="h-4 w-4"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M533.5 278.4c0-18.6-1.5-37-4.7-54.8H272.1v103.8h146.9c-6.3 34.1-25.1 63-53.6 82.2v68h86.6c50.8-46.8 81.5-115.8 81.5-199.2z"
        fill="#4285F4"
      />
      <path
        d="M272.1 544.3c73.7 0 135.6-24.4 180.8-66.7l-86.6-68c-24 16.2-54.6 25.8-94.1 25.8-72.3 0-133.7-48.7-155.7-114.2H27.6v71.7c45.2 89.6 138.3 151.4 244.5 151.4z"
        fill="#34A853"
      />
      <path
        d="M116.4 321.2c-10.2-30.5-10.2-63.5 0-94v-71.7H27.6c-41.3 82-41.3 155.3 0 237.4l88.8-71.7z"
        fill="#FBBC05"
      />
      <path
        d="M272.1 106.1c39.9-.6 78.4 14 107.5 41.2l80.1-80.1C408.1 18.1 343.6-2.1 272.1 0 165.8 0 72.8 61.8 27.6 151.4l88.8 71.7c22-65.5 83.4-117 155.7-117z"
        fill="#EA4335"
      />
    </svg>
  );
}

/* Add this in your global CSS (or Tailwind layer)
@keyframes float {
  0%, 100% { transform: translateY(0px) translateX(0px) }
  50% { transform: translateY(-16px) translateX(6px) }
}
*/
