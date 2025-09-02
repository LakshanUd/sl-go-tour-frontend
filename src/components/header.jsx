// src/components/Header.jsx
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink, Link } from "react-router-dom";
import { Menu, X, Search, User } from "lucide-react";

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Lock body scroll when menu open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = mobileOpen ? "hidden" : prev || "";
    return () => (document.body.style.overflow = prev || "");
  }, [mobileOpen]);

  // Close on ESC
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Sticky shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const nav = [
    { name: "Home", to: "/" },
    { name: "Tours", to: "/tours" },
    { name: "Vehicles", to: "vehicles" }, // keep your relative route
    { name: "Accommodation", to: "/accommodation" },
    { name: "Blog", to: "/blog" },
  ];

  // gradient tokens
  const gradFrom = "from-[#DA22FF]";
  const gradTo = "to-[#9733EE]";
  const gradBG = `bg-gradient-to-r ${gradFrom} ${gradTo}`;
  const gradText = `text-transparent bg-clip-text bg-gradient-to-r ${gradFrom} ${gradTo}`;

  const linkClass = ({ isActive }) =>
    [
      "relative font-medium transition-colors",
      "after:content-[''] after:absolute after:-bottom-2 after:left-0 after:h-0.5 after:rounded-full after:bg-gradient-to-r after:from-[#DA22FF] after:to-[#9733EE] after:transition-all",
      isActive
        ? [gradText, "after:w-full"].join(" ")
        : [
            "text-neutral-600 hover:text-transparent",
            "hover:bg-clip-text hover:bg-gradient-to-r hover:from-[#DA22FF] hover:to-[#9733EE]",
            "after:w-0 hover:after:w-full",
          ].join(" "),
    ].join(" ");

  return (
    <header
      className={[
        "sticky top-0 z-50 border-b",
        "bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60",
        scrolled ? "shadow-sm border-neutral-200" : "border-transparent",
      ].join(" ")}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-22 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img src="/mainlogo.svg" alt="GoTour" className="h-14 w-auto" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {nav.map((item) => (
              <NavLink key={item.name} to={item.to} className={linkClass}>
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-3">
            {/* Search (gradient border on focus; icon single-color) */}
            <div className="flex items-center rounded-full p-[1px] group bg-transparent transition-colors group-focus-within:bg-gradient-to-r group-focus-within:from-[#DA22FF] group-focus-within:to-[#9733EE]">
              <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 w-44 border border-neutral-200 transition-colors group-focus-within:border-transparent">
                <Search className="h-4 w-4 text-neutral-500 transition-colors group-focus-within:text-[#9733EE]" />
                <input
                  type="text"
                  placeholder="Search"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-700"
                  aria-label="Search"
                />
              </div>
            </div>

            {/* Profile → Admin (gradient ring; active = gradient fill) */}
            <NavLink
              to="/admin"
              aria-label="Admin"
              title="Admin"
              className={`rounded-full p-[1px] ${gradBG} focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DA22FF]/60 focus-visible:ring-offset-2`}
            >
              {({ isActive }) => (
                <span
                  className={[
                    "h-9 w-9 inline-flex items-center justify-center rounded-full",
                    isActive ? `${gradBG} text-white` : "bg-white text-neutral-700 hover:bg-neutral-50",
                  ].join(" ")}
                >
                  <User className="h-5 w-5" />
                </span>
              )}
            </NavLink>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden p-2 rounded hover:bg-neutral-100 text-neutral-700"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu rendered via PORTAL */}
      <MobileMenuPortal
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        nav={nav}
        gradBG={gradBG}
      />
    </header>
  );
}

/* ================= Portal Mobile Menu ================= */

function MobileMenuPortal({ open, onClose, nav, gradBG }) {
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

      {/* Sheet (top) */}
      <div
        role="dialog"
        aria-modal="true"
        className="fixed top-0 left-0 right-0 z-[1000] origin-top animate-in fade-in duration-200"
        onClick={(e) => e.stopPropagation()} // keep clicks inside from closing
      >
        <div className={`mx-2 mt-2 rounded-2xl p-[1px] ${gradBG} shadow-xl`}>
          <div className="rounded-2xl bg-white">
            {/* Header row */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
              <span className="text-sm font-medium">Menu</span>
              <button
                type="button"
                className="p-2 rounded-md hover:bg-neutral-100"
                aria-label="Close menu"
                onClick={onClose}
              >
                <X className="h-5 w-5 text-neutral-700" />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 pt-3">
              <div className="flex items-center rounded-full p-[1px] group bg-transparent transition-colors group-focus-within:bg-gradient-to-r group-focus-within:from-[#DA22FF] group-focus-within:to-[#9733EE]">
                <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 w-full border border-neutral-200 transition-colors group-focus-within:border-transparent">
                  <Search className="h-4 w-4 text-[#9733EE]" />
                  <input
                    type="text"
                    placeholder="Search"
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400 text-neutral-700"
                    aria-label="Search"
                  />
                </div>
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
                        ? `${gradBG}`
                        : "bg-gradient-to-r from-transparent to-transparent hover:from-[#DA22FF1A] hover:to-[#9733EE1A]",
                    ].join(" ")
                  }
                >
                  <span className="flex items-center justify-between rounded-[12px] bg-white px-3 py-2 text-sm text-neutral-700">
                    <span className="truncate">{item.name}</span>
                    <span className="ml-3 h-1.5 w-6 rounded-full bg-gradient-to-r from-[#DA22FF] to-[#9733EE]" />
                  </span>
                </NavLink>
              ))}

              {/* Admin link */}
              <NavLink
                to="/admin"
                onClick={onClose}
                className={({ isActive }) =>
                  [
                    "block rounded-xl p-[1px]",
                    isActive
                      ? `${gradBG}`
                      : "bg-gradient-to-r from-transparent to-transparent hover:from-[#DA22FF1A] hover:to-[#9733EE1A]",
                  ].join(" ")
                }
              >
                <span className="flex items-center gap-2 rounded-[12px] bg-white px-3 py-2 text-sm text-neutral-700">
                  <User className="h-4 w-4 text-[#9733EE]" />
                  Admin
                </span>
              </NavLink>
            </nav>

            {/* Footer actions */}
            <div className="px-4 pb-4">
              <button
                type="button"
                onClick={onClose}
                className={`w-full rounded-xl py-2 text-white ${gradBG} active:opacity-90`}
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
