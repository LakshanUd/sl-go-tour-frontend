// src/components/Header.jsx
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  User,
  LogIn,
  LogOut,
  ShoppingCart,
  LayoutDashboard,
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { confirmToast } from "./ConfirmToast.jsx";

/* ===== Env base for API ===== */
const RAW =
  (import.meta.env?.VITE_BACKEND_URL || "").toString() ||
  (import.meta.env?.VITE_API_URL || "").toString() ||
  "http://localhost:5000";
const BASE = RAW.replace(/\/+$/, "");

/* Tiny axios with token */
const api = axios.create({ baseURL: BASE });
api.interceptors.request.use((config) => {
  const t = localStorage.getItem("token");
  if (t) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

/* Role → dashboard path mapper */
function getDashboardPath(role) {
  switch (role) {
    case "Admin":
      return "/admin/overview";
    case "VC-Manager":
      return "/vehicles";
    case "AC-Manager":
      return "/accommodations";
    case "Author":
      return "/author";
    case "CF-Manager":
      return "/complaints-feedback";
    case "IN-Manager":
      return "/inventory";
    case "Chef":
      return "/chef";
    case "TP-Manager":
      return "/tours";
    case "Customer":
    default:
      return "/customer";
  }
}

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  const navigate = useNavigate();
  const { pathname } = useLocation();

  // route-aware flags
  const isHome = pathname === "/";
  const isInDashboard = ["/admin", "/customer"].some((p) =>
    pathname.startsWith(p)
  );

  /* Lock body scroll for sheet */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = mobileOpen ? "hidden" : prev || "";
    return () => (document.body.style.overflow = prev || "");
  }, [mobileOpen]);

  /* Close on ESC */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        setShowUserMenu(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* Transparent → glass on scroll */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Use "light" only when on Home AND not scrolled.
  const light = isHome && !scrolled;

  /* Auth from JWT (client-side decode) */
  useEffect(() => {
    const syncAuthFromToken = () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setUser(null);
        return;
      }
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUser({
          email: payload.email,
          firstName: payload.firstName,
          lastName: payload.lastName,
          role: payload.role,
          mobile: payload.mobile,
        });
      } catch (err) {
        console.error("Error decoding token:", err);
        localStorage.removeItem("token");
        setUser(null);
      }
    };

    syncAuthFromToken();
    const onUserLogin = (e) => setUser(e.detail);
    window.addEventListener("userLogin", onUserLogin);
    return () => window.removeEventListener("userLogin", onUserLogin);
  }, []);

  /* Cart count sync */
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setCartCount(0);
          return;
        }
        const r = await api.get("/api/cart");
        const count = Array.isArray(r?.data?.items) ? r.data.items.length : 0;
        setCartCount(count);
      } catch {
        /* silent */
      }
    };
    fetchCount();
    const onFocus = () => fetchCount();
    const onCartChanged = () => fetchCount();
    window.addEventListener("focus", onFocus);
    window.addEventListener("cart:changed", onCartChanged);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("cart:changed", onCartChanged);
    };
  }, []);

  /* Outside click to close user menu */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showUserMenu && !e.target.closest(".user-menu-container")) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("pointerdown", handleClickOutside);
    return () =>
      document.removeEventListener("pointerdown", handleClickOutside);
  }, [showUserMenu]);

  /* Actions */
  const handleLogout = async () => {
    const confirmed = await confirmToast({
      title: "Logout Confirmation",
      message: "Are you sure you want to logout?",
      confirmText: "Logout",
      cancelText: "Cancel",
    });
    if (!confirmed) return;
    localStorage.removeItem("token");
    setUser(null);
    setShowUserMenu(false);
    toast.success("Logged out successfully!");
    navigate("/");
    setCartCount(0);
  };

  const handleLoginClick = () => navigate("/login");
  const handleGoDashboard = () => {
    if (!user) return;
    navigate(getDashboardPath(user.role));
    setShowUserMenu(false);
    setMobileOpen(false);
  };

  const nav = [
    { name: "Home", to: "/" },
    { name: "Tours", to: "/tours" },
    { name: "Vehicles", to: "/vehicles" },
    { name: "Accommodations", to: "/accommodations" },
    { name: "Meals", to: "/meals" },
    { name: "Blogs", to: "/blogs" },
  ];

  const linkClass = ({ isActive }) =>
    [
      "relative font-medium transition-colors px-2 py-1 rounded-lg",
      light
        ? isActive
          ? "text-white after:content-[''] after:absolute after:left-2 after:right-2 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-white"
          : "text-white/90 hover:text-white"
        : isActive
        ? "relative text-neutral-900 after:content-[''] after:absolute after:left-2 after:right-2 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-neutral-900"
        : "text-neutral-700 hover:text-neutral-900",
    ].join(" ");

  return (
    <header
      className={[
        "fixed top-0 left-0 right-0 z-50 transition-colors pt-[20px] pb-[10px]",
        light
          ? "bg-transparent"
          : "bg-white/70 backdrop-blur-md supports-[backdrop-filter]:bg-white/55 border-b border-white/20 shadow-sm",
      ].join(" ")}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center">
          {/* Left: Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img
              src={light ? "/mainlogo2.svg" : "/mainlogo.svg"}
              alt="GoTour"
              className="h-15 w-auto transition-opacity duration-200"
              style={
                light ? { filter: "drop-shadow(0 0 2px rgba(0,0,0,0.6))" } : undefined
              }
            />
          </Link>

          {/* Right: nav + actions */}
          <div className="ml-auto flex items-center gap-4">
            {/* Desktop nav (right sided) */}
            <nav className="hidden md:flex items-center gap-2">
            {nav.map((item) => (
              <NavLink key={item.name} to={item.to} className={linkClass}>
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* Desktop actions */}
            <div className="hidden md:flex items-center gap-2">
              {/* Cart with badge (only if user is logged in) */}
              {user && (
                <Link
                  to="/cart"
                  className={[
                    "relative inline-flex items-center justify-center h-9 w-9 rounded-full border",
                    light
                      ? "border-white/50 bg-white/10 hover:bg-white/15 backdrop-blur-md"
                      : "border-neutral-200 bg-white hover:bg-neutral-50",
                  ].join(" ")}
                  aria-label="Open cart"
                  title="Cart"
                >
                  <ShoppingCart
                    className={light ? "h-4 w-4 text-white" : "h-4 w-4 text-neutral-700"}
                  />
                  {cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-semibold text-white grid place-items-center bg-green-600">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Login button when not logged in */}
              {!user && (
                <button
                  onClick={handleLoginClick}
                  className={[
                    "inline-flex items-center gap-2 px-4 h-9 rounded-full font-medium text-sm transition border cursor-pointer",
                    light
                      ? "border-white/50 bg-white/10 hover:bg-white/15 backdrop-blur-md text-white"
                      : "border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700",
                  ].join(" ")}
                  aria-label="Sign in"
                >
                  <LogIn className="h-4 w-4" />
                  Login
                </button>
              )}

              {/* User pill (only when logged in) */}
              {user && (
                <div className="relative user-menu-container">
                  <button
                    onClick={() => setShowUserMenu((v) => !v)}
                    className={[
                      "rounded-full p-[2px] cursor-pointer focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2",
                      light ? "" : "focus-visible:ring-neutral-300 focus-visible:ring-offset-white",
                    ].join(" ")}
                    aria-label="User menu"
                    aria-expanded={showUserMenu}
                  >
                  <span
                    className={[
                        "h-9 w-9 inline-flex items-center justify-center rounded-full transition border",
                        light
                          ? "bg-white/10 text-white hover:bg-white/15 border-white/40 backdrop-blur-md"
                          : "bg-white text-neutral-700 hover:bg-neutral-50 border-neutral-200",
                        isInDashboard
                          ? "bg-gradient-to-r from-[#09E65A] to-[#16A34A] text-white border-transparent"
                          : "",
                    ].join(" ")}
                  >
                      <span className="text-l font-medium">
                        {user.firstName?.charAt(0)?.toUpperCase() ||
                          user.email?.charAt(0)?.toUpperCase()}
                      </span>
                  </span>
                  </button>

                  {/* Dropdown */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-neutral-200 py-2 z-50">
                      <div className="px-3 py-2 border-b border-neutral-100">
                        <p className="text-sm font-semibold text-neutral-900">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-neutral-500">{user.email}</p>
                        <p className="text-[11px] text-[#16A34A] font-medium">
                          {user.role}
                        </p>
                      </div>

                      <button
                        onClick={handleGoDashboard}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                        title="Go to dashboard"
                      >
                        <LayoutDashboard className="h-4 w-4 text-[#16A34A]" />
                        Go to Dashboard
                      </button>

                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              )}
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
              className={[
                "md:hidden p-2 rounded-lg transition",
                light ? "hover:bg-white/10 text-white backdrop-blur-md" : "hover:bg-neutral-100 text-neutral-700",
              ].join(" ")}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu via Portal */}
      <MobileMenuPortal
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        nav={nav}
        user={user}
        handleLoginClick={handleLoginClick}
        handleLogout={handleLogout}
        cartCount={cartCount}
        handleGoDashboard={handleGoDashboard}
        scrolled={scrolled}
      />
    </header>
  );
}

/* ================= Mobile Menu Portal ================= */

function MobileMenuPortal({
  open,
  onClose,
  nav,
  user,
  handleLoginClick,
  handleLogout,
  cartCount,
  handleGoDashboard,
}) {
  // Create (or reuse) a container under <body>
  const portalTarget = useMemo(() => {
    let el = document.getElementById("mobile-menu-root");
    if (!el) {
      el = document.createElement("div");
      el.id = "mobile-menu-root";
      document.body.appendChild(el);
    }
    return el;
  }, []);

  if (!open) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        className="fixed top-0 left-0 right-0 z-[1000] origin-top animate-in fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="mx-2 mt-2 rounded-2xl p-[1px] shadow-xl"
          style={{ background: "linear-gradient(90deg,#09E65A,#16A34A)" }}
        >
          <div className="rounded-2xl bg-white">
            {/* Header row */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
              <span className="text-sm font-medium">Menu</span>
              <div className="flex items-center gap-2">
                <Link
                  to="/cart"
                  onClick={onClose}
                  className="relative inline-flex items-center justify-center h-9 w-9 rounded-full border border-neutral-200 bg-white hover:bg-neutral-50"
                  aria-label="Open cart"
                >
                  <ShoppingCart className="h-5 w-5 text-neutral-700" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-semibold text-white grid place-items-center bg-rose-600">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </Link>
              <button
                type="button"
                className="p-2 rounded-md hover:bg-neutral-100"
                aria-label="Close menu"
                onClick={onClose}
              >
                <X className="h-5 w-5 text-neutral-700" />
              </button>
              </div>
            </div>

            {/* Nav list */}
            <nav className="px-3 py-3 space-y-2">
              {nav.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    [
                      "block rounded-xl p-[1px]",
                      isActive
                        ? "bg-gradient-to-r from-[#09E65A] to-[#16A34A]"
                        : "bg-gradient-to-r from-transparent to-transparent hover:from-[#09E65A1A] hover:to-[#16A34A1A]",
                    ].join(" ")
                  }
                >
                  <span className="flex items-center justify-between rounded-[12px] bg-white px-3 py-2 text-sm text-neutral-700">
                    <span className="truncate">{item.name}</span>
                    <span className="ml-3 h-1.5 w-6 rounded-full bg-gradient-to-r from-[#09E65A] to-[#16A34A]" />
                  </span>
                </NavLink>
              ))}

              {/* Auth section */}
              {user ? (
                <>
                  <div className="px-3 py-2 bg-neutral-50 rounded-xl mx-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-r from-[#09E65A] to-[#16A34A] flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {user.firstName?.charAt(0)?.toUpperCase() ||
                            user.email?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-900">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-neutral-500">{user.email}</p>
                        <p className="text-xs text-[#16A34A] font-medium">
                          {user.role}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Unified "Go to Dashboard" for any role */}
                  <button
                    onClick={handleGoDashboard}
                    className="block rounded-xl p-[1px] mx-3 bg-gradient-to-r from-[#09E65A22] to-[#16A34A22] hover:from-[#09E65A33] hover:to-[#16A34A33]"
                    title="Go to dashboard"
              >
                <span className="flex items-center gap-2 rounded-[12px] bg-white px-3 py-2 text-sm text-neutral-700">
                      <LayoutDashboard className="h-4 w-4 text-[#16A34A]" />
                      Go to Dashboard
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      handleLogout();
                      onClose();
                    }}
                    className="block rounded-xl p-[1px] bg-gradient-to-r from-red-500 to-red-600 mx-3 mt-2"
                  >
                    <span className="flex items-center gap-2 rounded-[12px] bg-white px-3 py-2 text-sm text-red-600">
                      <LogOut className="h-4 w-4" />
                      Logout
                    </span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      handleLoginClick();
                      onClose();
                    }}
                    className="block rounded-xl p-[1px] bg-gradient-to-r from-[#09E65A] to-[#16A34A] mx-3 mb-2"
                  >
                    <span className="flex items-center gap-2 rounded-[12px] bg-white px-3 py-2 text-sm text-[#16A34A]">
                      <LogIn className="h-4 w-4" />
                      Sign In
                    </span>
                  </button>

                  <Link
                    to="/register"
                    onClick={onClose}
                    className="block rounded-xl p-[1px] bg-gradient-to-r from-neutral-500 to-neutral-600 mx-3"
                  >
                    <span className="flex items-center gap-2 rounded-[12px] bg-white px-3 py-2 text-sm text-neutral-600">
                      <User className="h-4 w-4" />
                      Sign Up
                </span>
                  </Link>
                </>
              )}
            </nav>

            {/* Footer actions */}
            <div className="px-4 pb-4">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl py-2 text-white bg-neutral-900/90 active:opacity-90"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    portalTarget
  );
}