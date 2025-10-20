// src/pages/LoginPage.jsx
import { useCallback, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { LogIn, ShieldCheck, Sparkles, Eye, EyeOff, Lock, Mail } from "lucide-react";

const PRIMARY_GREEN = "#10b981";
const DARK_GREEN = "#059669";
const LIGHT_GREEN = "#34d399";

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
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          
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
                  Manage Your
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-600">
                    Journeys with Ease
                  </span>
                </h1>
                <p className="text-lg text-gray-600 leading-relaxed max-w-md">
                  One powerful dashboard for tours, vehicles, accommodations, bookings, and more — designed for efficiency and simplicity.
                </p>
              </div>

              {/* Features */}
              <div className="space-y-3 pt-2">
                <FeatureItem icon={ShieldCheck} text="Enterprise-grade security" />
                <FeatureItem icon={Sparkles} text="Intuitive user experience" />
                <FeatureItem icon={LogIn} text="Quick & secure authentication" />
              </div>
            </div>
          </div>

          {/* Right panel — login card */}
          <div className="w-full">
            <div className="mx-auto max-w-md">
              {/* Mobile logo */}
              <div className="lg:hidden flex justify-center mb-8">
                <div className="inline-flex items-center gap-3 px-4 py-3 rounded-2xl bg-white shadow-lg border border-emerald-100">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 grid place-items-center">
                    <Sparkles className="h-5 w-5 text-white" strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="text-xl font-bold text-gray-900">GoTour</div>
                    <div className="text-[10px] font-medium text-emerald-600 tracking-wide">TMS</div>
                  </div>
                </div>
              </div>

              {/* Login card */}
              <div className="rounded-3xl bg-white shadow-2xl border border-gray-100 overflow-hidden">
                {/* Card header */}
                <div className="px-8 pt-8 pb-6 bg-gradient-to-br from-emerald-50 to-green-50 border-b border-gray-100">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-gray-900">
                      Welcome Back
                    </h2>
                    <p className="text-sm text-gray-600">
                      Sign in to access your dashboard
                    </p>
                  </div>
                </div>

                {/* Card body */}
                <div className="px-8 py-8 space-y-5" onKeyDown={onKeyDown}>
                  {/* Email field */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        autoComplete="username"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                  </div>

                  {/* Password field */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type={showPw ? "text" : "password"}
                        autoComplete="current-password"
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-12 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((s) => !s)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPw ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    <div className="flex justify-end">
                      <Link
                        to="/forgot-password"
                        className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                      >
                        Forgot password?
                      </Link>
                    </div>
                  </div>

                  {/* Sign in button */}
                  <button
                    onClick={handleLogin}
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:from-emerald-600 hover:to-green-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogIn className="h-5 w-5" />
                    {loading ? "Signing in..." : "Sign In"}
                  </button>

                  {/* Divider */}
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-gray-500 font-medium">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  {/* Google sign in */}
                  {GOOGLE_ENABLED ? (
                    <button
                      type="button"
                      onClick={() => doGoogleLogin && doGoogleLogin()}
                      disabled={gLoading}
                      className="w-full py-3.5 rounded-xl border-2 border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all inline-flex items-center justify-center gap-3 font-medium text-gray-700 cursor-pointer"
                    >
                      <GoogleIcon />
                      {gLoading ? "Connecting..." : "Sign in with Google"}
                    </button>
                  ) : (
                    <div className="text-sm text-gray-500 text-center py-2">
                      Google login not configured
                    </div>
                  )}
                </div>

                {/* Card footer */}
                <div className="px-8 py-6 bg-gray-50 border-t border-gray-100">
                  <p className="text-xs text-gray-500 text-center leading-relaxed">
                    By continuing, you agree to our{" "}
                    <Link to="/legal/terms" className="text-emerald-600 hover:text-emerald-700 font-medium underline">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link to="/legal/privacy" className="text-emerald-600 hover:text-emerald-700 font-medium underline">
                      Privacy Policy
                    </Link>
                  </p>
                </div>
              </div>

              {/* Register link */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  New to GoTour?{" "}
                  <Link
                    to="/register"
                    className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    Create an account
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

/* Feature item component */
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

/* Google icon component */
function GoogleIcon() {
  return (
    <svg
      viewBox="0 0 533.5 544.3"
      className="h-5 w-5"
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