// src/pages/HomePage.jsx
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Calendar,
  Users,
  Map,
  ShieldCheck,
  Headphones,
  ListChecks,
  Star,
  ArrowRight,
  Plane,
  Car,
  BedDouble,
  MapPin,
  DollarSign,
} from "lucide-react";
import { useEffect, useState } from "react";

/* ---------- Theme tokens ---------- */
const GRAD_FROM = "from-[#DA22FF]";
const GRAD_TO = "to-[#9733EE]";
const GRAD_BG = `bg-gradient-to-r ${GRAD_FROM} ${GRAD_TO}`;
const GRAD_TEXT = `text-transparent bg-clip-text bg-gradient-to-r ${GRAD_FROM} ${GRAD_TO}`;
const LINK_TEXT_HOVER =
  "hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-[#DA22FF] hover:to-[#9733EE]";

export default function HomePage() {
  const nav = useNavigate();

  /* Background slideshow (6s, slow zoom on active) */
  const HERO_IMAGES = ["/hero-1.jpg", "/hero-2.jpg", "/hero-3.jpg"];
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % HERO_IMAGES.length), 6000);
    return () => clearInterval(t);
  }, []);

  /* Search form */
  const [form, setForm] = useState({
    q: "",
    fromLocation: "",
    from: "",
    to: "",
    guests: 2,
    budget: "",
  });
  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: name === "guests" ? Number(value) || 1 : value }));
  };
  const onSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams({
      q: form.q || "",
      fromLocation: form.fromLocation || "",
      from: form.from || "",
      to: form.to || "",
      guests: String(form.guests || 1),
      budget: form.budget || "",
    }).toString();
    nav(`/tours?${params}`);
  };

  return (
    <div className="min-h-screen">
      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden min-h-[70vh] sm:min-h-[80vh]">
        {/* Background crossfade + slow zoom */}
        <div className="absolute inset-0 -z-10">
          {HERO_IMAGES.map((src, i) => (
            <img
              key={src}
              src={src}
              alt=""
              aria-hidden="true"
              className={[
                "absolute inset-0 h-full w-full object-cover",
                "transition-opacity duration-700",
                "transition-transform duration-[6000ms] ease-out",
                i === slide ? "opacity-100 scale-110" : "opacity-0 scale-100",
              ].join(" ")}
              loading="eager"
            />
          ))}
          {/* Black overlay for contrast */}
          <div className="absolute inset-0 bg-black/65" />
        </div>

        {/* Hero copy */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="max-w-3xl text-white">
            <p className="text-xs tracking-widest uppercase text-white/70">GoTour TMS</p>
            <h1 className="mt-2 text-3xl sm:text-5xl font-semibold tracking-tight">
              <span className={GRAD_TEXT}>Plan, book & manage</span> your journeys — all in one place.
            </h1>
            <p className="mt-4 text-white/85">
              A minimal, modern Tourism Management System for tours, vehicles, stays, and bookings —
              built for speed and simplicity.
            </p>

            {/* Quick CTAs — icons color only on hover */}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/tours"
                className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/20 bg-white/0 text-white hover:bg-white/10 cursor-pointer"
              >
                <Plane className="h-4 w-4 text-white/70 transition-colors group-hover:text-[#9733EE]" />
                <span className={LINK_TEXT_HOVER}>Browse Tours</span>
              </Link>
              <Link
                to="/admin/vehicle"
                className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/20 bg-white/0 text-white hover:bg-white/10 cursor-pointer"
              >
                <Car className="h-4 w-4 text-white/70 transition-colors group-hover:text-[#9733EE]" />
                <span className={LINK_TEXT_HOVER}>Manage Vehicles</span>
              </Link>
              <Link
                to="/accommodation"
                className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/20 bg-white/0 text-white hover:bg-white/10 cursor-pointer"
              >
                <BedDouble className="h-4 w-4 text-white/70 transition-colors group-hover:text-[#9733EE]" />
                <span className={LINK_TEXT_HOVER}>Stay Options</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SEARCH FORM (below hero, top half overlaps into hero) ================= */}
      <section className="relative z-20 -mt-8 sm:-mt-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <form
            onSubmit={onSearch}
            className="mx-auto bg-white/95 backdrop-blur rounded-2xl border border-white/40 p-3
                       flex flex-wrap items-center justify-center gap-3 shadow-lg"
          >
            {/* Destination */}
            <div className="group rounded-xl p-[1px] w-full sm:w-[240px] focus-within:bg-gradient-to-r focus-within:from-[#DA22FF] focus-within:to-[#9733EE]">
              <div className="flex items-center gap-2 rounded-[12px] bg-white px-3 py-2 border border-neutral-400 transition-colors group-focus-within:border-transparent">
                <Search className="h-4 w-4 text-[#9733EE]" />
                <input
                  name="q"
                  value={form.q}
                  onChange={onChange}
                  placeholder="Where to?"
                  className="w-full bg-transparent outline-none text-sm text-neutral-700 placeholder:text-neutral-500"
                />
              </div>
            </div>

            {/* From location */}
            <div className="group rounded-xl p-[1px] w-full sm:w-[200px] focus-within:bg-gradient-to-r focus-within:from-[#DA22FF] focus-within:to-[#9733EE]">
              <div className="flex items-center gap-2 rounded-[12px] bg-white px-3 py-2 border border-neutral-400 transition-colors group-focus-within:border-transparent">
                <MapPin className="h-4 w-4 text-[#9733EE]" />
                <input
                  name="fromLocation"
                  value={form.fromLocation}
                  onChange={onChange}
                  placeholder="From (city)"
                  className="w-full bg-transparent outline-none text-sm text-neutral-700 placeholder:text-neutral-500"
                />
              </div>
            </div>

            {/* From date */}
            <div className="group rounded-xl p-[1px] w-full sm:w-[180px] focus-within:bg-gradient-to-r focus-within:from-[#DA22FF] focus-within:to-[#9733EE]">
              <div className="flex items-center gap-2 rounded-[12px] bg-white px-3 py-2 border border-neutral-400 transition-colors group-focus-within:border-transparent">
                <Calendar className="h-4 w-4 text-[#9733EE]" />
                <input
                  type="date"
                  name="from"
                  value={form.from}
                  onChange={onChange}
                  className="bg-transparent outline-none text-sm w-full text-neutral-700 placeholder:text-neutral-500"
                />
              </div>
            </div>

            {/* To date */}
            <div className="group rounded-xl p-[1px] w-full sm:w-[180px] focus-within:bg-gradient-to-r focus-within:from-[#DA22FF] focus-within:to-[#9733EE]">
              <div className="flex items-center gap-2 rounded-[12px] bg-white px-3 py-2 border border-neutral-400 transition-colors group-focus-within:border-transparent">
                <Calendar className="h-4 w-4 text-[#9733EE]" />
                <input
                  type="date"
                  name="to"
                  value={form.to}
                  onChange={onChange}
                  className="bg-transparent outline-none text-sm w-full text-neutral-700 placeholder:text-neutral-500"
                />
              </div>
            </div>

            {/* Guests */}
            <div className="group rounded-xl p-[1px] w-full sm:w-[140px] focus-within:bg-gradient-to-r focus-within:from-[#DA22FF] focus-within:to-[#9733EE]">
              <div className="flex items-center gap-2 rounded-[12px] bg-white px-3 py-2 border border-neutral-400 transition-colors group-focus-within:border-transparent">
                <Users className="h-4 w-4 text-[#9733EE]" />
                <input
                  type="number"
                  min={1}
                  name="guests"
                  value={form.guests}
                  onChange={onChange}
                  placeholder="Guests"
                  className="bg-transparent outline-none text-sm w-full text-neutral-700 placeholder:text-neutral-500"
                />
              </div>
            </div>

            {/* Budget */}
            <div className="group rounded-xl p-[1px] w-full sm:w-[160px] focus-within:bg-gradient-to-r focus-within:from-[#DA22FF] focus-within:to-[#9733EE]">
              <div className="flex items-center gap-2 rounded-[12px] bg-white px-3 py-2 border border-neutral-400 transition-colors group-focus-within:border-transparent">
                <DollarSign className="h-4 w-4 text-[#9733EE]" />
                <input
                  type="number"
                  min={0}
                  name="budget"
                  value={form.budget}
                  onChange={onChange}
                  placeholder="Budget"
                  className="bg-transparent outline-none text-sm w-full text-neutral-700 placeholder:text-neutral-500"
                />
              </div>
            </div>

            {/* Small button */}
            <button
              type="submit"
              className={`cursor-pointer rounded-xl px-4 py-2 text-sm text-white hover:opacity-95 active:opacity-90 ${GRAD_BG}`}
            >
              Search
            </button>
          </form>
        </div>
      </section>

      {/* ================= VALUE PROPS ================= */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <HeaderRow title="Why choose GoTour" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Value icon={<ShieldCheck className="h-5 w-5 text-[#9733EE]" />} title="Trusted & secure" text="Secure payments, verified partners, privacy-first." />
            <Value icon={<Headphones className="h-5 w-5 text-[#9733EE]" />} title="24/7 support" text="Help whenever you need it." />
            <Value icon={<ListChecks className="h-5 w-5 text-[#9733EE]" />} title="End-to-end TMS" text="Tours, vehicles, stays, bookings." />
            <Value icon={<Map className="h-5 w-5 text-[#9733EE]" />} title="Smart planning" text="Optimize routes and itineraries." />
          </div>
        </div>
      </section>

      {/* ================= FEATURED ================= */}
      <Section title="Featured tours" action={{ to: "/tours", label: "View all" }}>
        <CardGrid
          items={[
            { title: "Cultural Triangle", subtitle: "5 days · Sri Lanka", img: "https://placehold.co/600x380/png", rating: 4.8 },
            { title: "Hill Country Escape", subtitle: "3 days · Nuwara Eliya", img: "https://placehold.co/600x380/png", rating: 4.7 },
            { title: "Southern Beaches", subtitle: "4 days · Galle", img: "https://placehold.co/600x380/png", rating: 4.9 },
          ]}
        />
      </Section>

      <Section title="Fleet highlights" action={{ to: "/admin/vehicle", label: "Manage fleet" }}>
        <CardGrid
          items={[
            { title: "Toyota Prius", subtitle: "Hybrid · 4 seats", img: "https://placehold.co/600x380/png", rating: 4.6 },
            { title: "Nissan Caravan", subtitle: "Van · 10 seats", img: "https://placehold.co/600x380/png", rating: 4.5 },
            { title: "SUV – 4x4", subtitle: "SUV · 5 seats", img: "https://placehold.co/600x380/png", rating: 4.7 },
          ]}
        />
      </Section>

      <Section title="Popular stays" action={{ to: "/accommodation", label: "Browse stays" }}>
        <CardGrid
          items={[
            { title: "Seaside Villa", subtitle: "Galle · Beachfront", img: "https://placehold.co/600x380/png", rating: 4.8 },
            { title: "Tea Bungalow", subtitle: "Ella · Mountain view", img: "https://placehold.co/600x380/png", rating: 4.7 },
            { title: "City Business Hotel", subtitle: "Colombo · Central", img: "https://placehold.co/600x380/png", rating: 4.6 },
          ]}
        />
      </Section>

      {/* ================= METRICS ================= */}
      <section className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-2xl border p-6 bg-white">
            <Metric k="1.2k+" v="Happy travelers" />
            <Metric k="350+" v="Verified partners" />
            <Metric k="98%" v="Satisfaction" />
            <Metric k="24/7" v="Support" />
          </div>
        </div>
      </section>

      {/* ================= TESTIMONIALS ================= */}
      <section className="py-10 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <HeaderRow title="What travelers say" />
          <div className="grid md:grid-cols-3 gap-4">
            {["Perfect planning!", "Great vehicles & guides", "Smooth bookings"].map((t, i) => (
              <blockquote key={i} className="rounded-xl border bg-white p-4">
                <div className="flex items-center gap-1 text-amber-500 mb-1">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-sm text-neutral-700">{t}</p>
                <p className="mt-2 text-xs text-neutral-500">— Verified traveler</p>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section className="py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <HeaderRow title="Frequently asked questions" />
          <div className="mt-4 divide-y rounded-xl border bg-white">
            {FAQS.map((f) => (
              <details key={f.q} className="group p-4">
                <summary className="cursor-pointer list-none flex items-center justify-between">
                  <span className={`text-sm font-medium ${LINK_TEXT_HOVER}`}>{f.q}</span>
                  <ArrowRight className="h-4 w-4 text-neutral-500" />
                </summary>
                <p className="mt-2 text-sm text-neutral-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ================= NEWSLETTER ================= */}
      <section className="py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-2xl font-semibold">Get deals & travel tips</h3>
          <p className="mt-2 text-neutral-600">Subscribe—no spam, just the good stuff.</p>
          <form onSubmit={(e) => e.preventDefault()} className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
            <input
              type="email"
              required
              placeholder="you@example.com"
              className="w-full sm:w-80 border rounded-lg px-3 py-2 outline-none"
            />
            <button className={`cursor-pointer px-4 py-2 rounded-lg text-white hover:opacity-95 active:opacity-90 ${GRAD_BG}`}>
              Subscribe
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

/* ---------- tiny atoms ---------- */

function HeaderRow({ title }) {
  const GRAD_BG = `bg-gradient-to-r from-[#DA22FF] to-[#9733EE]`;
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-lg font-semibold">{title}</h3>
      <span className={`ml-4 h-0.5 w-24 shrink-0 rounded-full ${GRAD_BG}`} />
    </div>
  );
}

function Value({ icon, title, text }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100">
        {icon}
      </div>
      <p className={`mt-3 text-sm font-medium ${LINK_TEXT_HOVER}`}>{title}</p>
      <p className="mt-1 text-sm text-neutral-600">{text}</p>
    </div>
  );
}

function Section({ title, action, children }) {
  return (
    <section className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          {action && (
            <Link
              to={action.to}
              className="group text-sm text-neutral-700 inline-flex items-center gap-1 hover:opacity-90 cursor-pointer"
            >
              <span className={LINK_TEXT_HOVER}>{action.label}</span>
              <ArrowRight className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-[#9733EE]" />
            </Link>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}

function CardGrid({ items = [] }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((it, i) => (
        <article key={i} className="rounded-xl border bg-white overflow-hidden hover:shadow-sm transition">
          <img src={it.img} alt={it.title} className="h-40 w-full object-cover" loading="lazy" />
          <div className="p-4">
            <p className={`text-sm font-medium ${LINK_TEXT_HOVER}`}>{it.title}</p>
            <p className="text-xs text-neutral-500">{it.subtitle}</p>
            <div className="mt-2 inline-flex items-center gap-1 text-amber-500">
              <Star className="h-4 w-4 fill-current" />
              <span className="text-xs text-neutral-700">{it.rating}</span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function Metric({ k, v }) {
  return (
    <div className="rounded-2xl border p-4 text-center">
      <div className={`text-2xl font-semibold ${LINK_TEXT_HOVER}`}>{k}</div>
      <div className="text-xs text-neutral-500 mt-1">{v}</div>
    </div>
  );
}

function HeroStat({ label, value }) {
  const GRAD_BG = `bg-gradient-to-r from-[#DA22FF] to-[#9733EE]`;
  return (
    <div className={`rounded-xl p-[1px] ${GRAD_BG}`}>
      <div className="rounded-xl bg-white/90 backdrop-blur p-4 text-center">
        <div className="text-xl font-semibold text-neutral-900">{value}</div>
        <div className="mt-1 text-xs text-neutral-600">{label}</div>
      </div>
    </div>
  );
}

const FAQS = [
  { q: "Can I manage vehicles and tours from one place?", a: "Yes—GoTour TMS centralizes fleet, tours, stays, and bookings with unified admin tools." },
  { q: "Do you support refunds or rescheduling?", a: "You can request changes from your booking details page; policies depend on the partner." },
  { q: "Is payment secure?", a: "We use industry-standard encryption and trusted payment gateways to protect your data." },
];
