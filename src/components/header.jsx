// src/components/Header.jsx
import { useEffect, useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { Menu, X, Search } from "lucide-react";

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const nav = [
    { name: "Home", to: "/" },
    { name: "Tours", to: "/tours" },
    { name: "Vehicles", to: "/vehicles" },
    { name: "Accommodation", to: "/accommodation" },
    { name: "Blog", to: "/blog" },
  ];

  const linkClass = ({ isActive }) =>
    [
      "relative font-medium transition-colors",
      isActive
        ? "text-neutral-900 after:w-full"
        : "text-neutral-600 hover:text-neutral-900",
      // underline indicator
      "after:absolute after:-bottom-2 after:left-0 after:h-0.5 after:w-0 after:bg-neutral-900 after:transition-all",
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
        <div className="h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/logo.jpg"
              alt="GoTour"
              className="h-8 w-8 rounded-full object-cover"
            />
            <span className="text-xl font-semibold tracking-tight text-neutral-900">
              GoTour
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {nav.map((item) => (
              <NavLink key={item.name} to={item.to} className={linkClass}>
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Search (desktop) */}
            <div className="hidden md:flex items-center gap-2 rounded-full border border-neutral-200 px-3 py-1.5">
              <Search className="h-4 w-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search"
                className="w-40 bg-transparent text-sm outline-none placeholder:text-neutral-400"
                aria-label="Search"
              />
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded hover:bg-neutral-100 text-neutral-700"
              aria-label="Toggle menu"
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile sheet */}
      {mobileOpen && (
        <div className="md:hidden border-t border-neutral-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            {/* Search (mobile) */}
            <div className="flex items-center gap-2 rounded-full border border-neutral-200 px-3 py-2 mb-3">
              <Search className="h-4 w-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400"
                aria-label="Search"
              />
            </div>

            <nav className="flex flex-col">
              {nav.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    [
                      "px-2 py-2.5 rounded-md",
                      isActive
                        ? "text-neutral-900 bg-neutral-100"
                        : "text-neutral-700 hover:bg-neutral-50",
                    ].join(" ")
                  }
                >
                  {item.name}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
