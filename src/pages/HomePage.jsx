// src/pages/HomePage.jsx
import { Link, useNavigate } from "react-router-dom";
import {
  Map,
  ShieldCheck,
  Headphones,
  ListChecks,
  Star,
  ArrowRight,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Chatbot from "../components/Chatbot";

/* ---------- Theme tokens ---------- */
const GRAD_FROM = "from-[#09E65A]";
const GRAD_TO = "to-[#16A34A]";
const GRAD_BG = `bg-gradient-to-r ${GRAD_FROM} ${GRAD_TO}`;
const GRAD_TEXT = `text-transparent bg-clip-text bg-gradient-to-r ${GRAD_FROM} ${GRAD_TO}`;
const LINK_TEXT_HOVER =
  "hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-[#09E65A] hover:to-[#16A34A]";

/* ---------- Backend base ---------- */
const RAW_BASE =
  (import.meta.env?.VITE_BACKEND_URL || "").toString() ||
  (import.meta.env?.VITE_API_URL || "").toString() ||
  "http://localhost:5000";
const BASE = RAW_BASE.replace(/\/+$/, "");
const api = axios.create({ baseURL: BASE });

/* ---------- Normalizers ---------- */
const normTour = (t) => ({
  title: t?.name || "Tour package",
  subtitle: [t?.type, t?.duration].filter(Boolean).join(" · ") || "—",
  img:
    (Array.isArray(t?.images) && t.images[0]) ||
    t?.coverImage ||
    "https://placehold.co/800x500/png?text=Tour",
  rating: (4.5 + Math.random() * 0.4).toFixed(1),
});

const normVehicle = (v) => ({
  title: v?.brand || "Vehicle",
  subtitle:
    [v?.type, v?.seatingCapacity ? `${v.seatingCapacity} seats` : ""]
      .filter(Boolean)
      .join(" · ") || "—",
  img:
    (Array.isArray(v?.images) && v.images[0]) ||
    v?.coverImage ||
    "https://placehold.co/800x500/png?text=Vehicle",
  rating: (4.4 + Math.random() * 0.4).toFixed(1),
});

const normStay = (a) => ({
  title: a?.name || "Accommodation",
  subtitle:
    [
      a?.type,
      a?.pricePerNight ? `LKR ${Number(a.pricePerNight).toFixed(2)}/night` : "",
    ]
      .filter(Boolean)
      .join(" · ") || "—",
  img:
    (Array.isArray(a?.images) && a.images[0]) ||
    a?.coverImage ||
    "https://placehold.co/800x500/png?text=Stay",
  rating: (4.6 + Math.random() * 0.3).toFixed(1),
});

function normFeedback(f) {
  const name = f?.name || f?.fullName || f?.userName || "Traveler";
  const comment = f?.comment || f?.message || f?.text || "";
  const ratingNum = Number(f?.rating ?? f?.stars ?? 5) || 5;
  const createdAt = f?.createdAt || f?.publishedAt || f?.date || null;
  return {
    name,
    comment,
    rating: Math.max(1, Math.min(5, ratingNum)),
    createdAt,
  };
}

const normPost = (p) => {
  const title = p?.title || p?.name || p?.heading || "Untitled post";
  const img =
    (Array.isArray(p?.images) && p.images[0]) ||
    p?.coverImage ||
    p?.thumbnail ||
    p?.image ||
    "https://placehold.co/800x600/png?text=Post";
  const slug = p?.slug || p?._id || p?.id || "";
  const author = p?.author?.name || p?.authorName || p?.createdBy?.name || "—";
  const createdAt = p?.publishedAt || p?.createdAt || p?.date || null;
  const rawText = (
    p?.excerpt ||
    p?.summary ||
    p?.description ||
    p?.content ||
    ""
  ).toString();
  const excerpt =
    rawText
      .replace(/<[^>]+>/g, "")
      .slice(0, 90)
      .trim() + (rawText ? "…" : "");
  return { title, img, slug, author, createdAt, excerpt };
};

/* ---------- Colored section wrappers ---------- */
function ColorBlock({ children, className = "" }) {
  return (
    <section className={`relative py-12 ${className}`}>
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#F5E1FF] via-[#E9ECFF] to-[#E3FFF7]" />
      <div
        className="absolute inset-0 -z-10 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(151,51,238,0.25) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}

function WhiteBlock({ children }) {
  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}

/* ===================== PAGE ===================== */
export default function HomePage() {
  const nav = useNavigate();

  // Data buckets
  const [tours, setTours] = useState({ data: [], loading: true });
  const [vehicles, setVehicles] = useState({ data: [], loading: true });
  const [stays, setStays] = useState({ data: [], loading: true });
  const [feedbacks, setFeedbacks] = useState({ data: [], loading: true });
  const [posts, setPosts] = useState({ data: [], loading: true });

  // Reviews carousel
  const [revIdx, setRevIdx] = useState(0);
  const reviews = feedbacks.data || [];

  // Satisfaction (from real feedback)
  const satisfactionPct = useMemo(() => {
    if (!feedbacks?.data?.length) return 0;
    const avg =
      feedbacks.data.reduce((sum, f) => sum + (Number(f.rating) || 0), 0) /
      feedbacks.data.length;
    return Math.round((avg / 5) * 100);
  }, [feedbacks.data]);

  // Rotate reviews every 7s
  useEffect(() => {
    if (reviews.length < 2) return;
    const id = setInterval(
      () => setRevIdx((i) => (i + 1) % reviews.length),
      7000
    );
    return () => clearInterval(id);
  }, [reviews.length]);

  // Fetch data
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const tRes = await api.get("/api/tour-packages");
        const tArr =
          (Array.isArray(tRes?.data) && tRes.data) ||
          tRes?.data?.tourPackages ||
          tRes?.data ||
          [];
        mounted && setTours({ data: tArr.slice(0, 6), loading: false });
      } catch {
        mounted && setTours({ data: [], loading: false });
      }

      try {
        const vRes = await api.get("/api/vehicles");
        const vArr = (Array.isArray(vRes?.data) && vRes.data) || [];
        mounted && setVehicles({ data: vArr.slice(0, 6), loading: false });
      } catch {
        mounted && setVehicles({ data: [], loading: false });
      }

      try {
        const aRes = await api.get("/api/accommodations");
        const aArr = (Array.isArray(aRes?.data) && aRes.data) || [];
        mounted && setStays({ data: aArr.slice(0, 6), loading: false });
      } catch {
        mounted && setStays({ data: [], loading: false });
      }

      try {
        const fRes = await api.get("/api/feedbacks");
        const raw =
          (Array.isArray(fRes?.data) && fRes.data) ||
          fRes?.data?.feedbacks ||
          fRes?.data ||
          [];
        const normed = (Array.isArray(raw) ? raw : [])
          .map(normFeedback)
          .filter((x) => x.comment);
        const sorted = normed.sort(
          (a, b) =>
            (b.createdAt ? +new Date(b.createdAt) : 0) -
            (a.createdAt ? +new Date(a.createdAt) : 0)
        );
        mounted && setFeedbacks({ data: sorted.slice(0, 6), loading: false });
      } catch {
        mounted && setFeedbacks({ data: [], loading: false });
      }

      // Blogs / posts (try a few common endpoints)
      try {
        const endpoints = [
          { url: "/api/blogs", params: { limit: 8, sort: "-publishedAt" } },
          { url: "/api/posts", params: { limit: 8, sort: "-createdAt" } },
          { url: "/api/articles", params: { limit: 8 } },
          { url: "/api/news", params: { limit: 8 } },
        ];
        let got = [];
        for (const ep of endpoints) {
          try {
            const r = await api.get(ep.url, { params: ep.params });
            const arr =
              (Array.isArray(r?.data) && r.data) ||
              r?.data?.items ||
              r?.data?.data ||
              r?.data?.posts ||
              r?.data?.blogs ||
              [];
            if (Array.isArray(arr) && arr.length) {
              got = arr;
              break;
            }
          } catch {
            /* try next endpoint */
          }
        }
        mounted && setPosts({ data: got.slice(0, 8), loading: false });
      } catch {
        mounted && setPosts({ data: [], loading: false });
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Derived cards
  const tourCards = useMemo(
    () => (tours.data.length ? tours.data.map(normTour).slice(0, 4) : []),
    [tours.data]
  );
  const vehicleCards = useMemo(
    () =>
      vehicles.data.length ? vehicles.data.map(normVehicle).slice(0, 3) : [],
    [vehicles.data]
  );
  const stayCards = useMemo(
    () => (stays.data.length ? stays.data.map(normStay).slice(0, 3) : []),
    [stays.data]
  );

  // Fallback card factory
  const FALLBACK = (title, subtitle) => ({
    title,
    subtitle,
    img: "https://placehold.co/800x500/png?text=%E2%80%94",
    rating: "—",
  });

  return (
    <div className="min-h-screen">
      <Chatbot />
      {/* ================= HERO (SINGLE FULL IMAGE, BOTTOM CONTENT) ================= */}
      <section className="relative min-h-[100vh] sm:min-h-[100vh] overflow-hidden">
        {/* Background: hero.webp */}
        <div
          className="absolute w-full h-screen -z-10 bg-cover bg-center animate-[zoom_20s_ease-in-out_infinite]"
          style={{
            backgroundImage: `url('/hero.webp')`,
            animationName: "zoom",
          }}
        />

        <style>
          {`
           @keyframes zoom {
            0% { transform: scale(1); }
            20% { transform: scale(1.1); }   /* zoom in */
            60% { transform: scale(1.1); }   /* pause for ~5s */
            100% { transform: scale(1); }    /* zoom out */
            }
          `}
        </style>

        {/* Overlay + bottom fade for readability */}
        <div className="absolute inset-0 -z-10 bg-black/45" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 -z-10 bg-gradient-to-t from-black/70 to-transparent" />

        {/* Bottom-aligned content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="min-h-[80vh] sm:min-h-[92vh] flex items-end">
            <div className="w-full text-white pb-10 sm:pb-14 lg:pb-20 text-center">
              <p className="text-lg sm:text-2xl">Discover the</p>
              <h1 className="mt-2 text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight">
                Adventure Travel
              </h1>
              <p className="mt-3 text-white/85 text-sm sm:text-base">
                Your best Adventure Deals with nature.
              </p>
              <div className="mt-6">
                <Link
                  to="/tours"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white border border-white/30 hover:bg-white/15"
                >
                  View Adventures
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Second Section (centered) */}
      <section className="relative py-12">
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-center bg-cover opacity-20"
          style={{ backgroundImage: "url('/bg-map.webp')" }}
        />
        {/* center the whole section */}
        <div className="flex justify-center px-4 sm:px-6 lg:px-8 p-15">
          {/* limit width so the block can be centered */}
          <div className="w-full max-w-5xl grid gap-10 items-center justify-items-center lg:grid-cols-2">
            {/* Left: Image card */}
            <div className="w-full max-w-[587px] h-[408px] overflow-hidden border border-neutral-200 shadow-sm">
              <div className="relative">
                <img
                  src="/hero-5.webp"
                  alt="Sri Lanka"
                  className="h-[360px] w-full object-cover sm:h-[420px]"
                />
                <div className="absolute inset-0 bg-black/25" />
                <div className="absolute left-5 bottom-5 right-5 text-white">
                  <h3 className="mt-1 text-2xl font-semibold leading-tight">
                    GoTour SL
                  </h3>
                  <p className="mt-1 text-sm text-white/85">
                    Discover the Heart of Paradise
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Copy + CTA */}
            <div className="w-full max-w-[560px]">
              <h2 className="text-3xl sm:text-4xl font-bold leading-tight text-neutral-900">
                A Simply Perfect Place
                <br /> To Get Lost
              </h2>
              <p className="mt-4 text-neutral-600">
                Treat yourself with a journey to your inner self.
                <br />
                Visit a mystique Tibet and start your spiritual adventure.{" "}
                <br />
                We promise, you’ll enjoy every step you make.
              </p>

              <Link
                to="/tours"
                className="mt-6 inline-block bg-[#36ac31] px-6 py-3 text-sm font-semibold text-neutral-900 hover:brightness-95 active:bg-[#2ac02e] transition"
              >
                SEE MORE
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= VALUE PROPS (MATTE BLACK) ================= */}
      <section className="relative py-16 bg-[#1c1c1c] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl sm:text-4xl md:text-5xl font-bold">
            Why choose GoTour
          </h2>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-6 text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-neutral-800 grid place-items-center">
                <ShieldCheck className="h-10 w-10 text-white" />
              </div>
              <p className="text-lg font-semibold">Trusted &amp; secure</p>
              <p className="mt-1 text-sm">
                Secure payments, verified partners, privacy-first.
              </p>
            </div>

            <div className="p-6 text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-neutral-800 grid place-items-center">
                <Headphones className="h-10 w-10 text-white" />
              </div>
              <p className="text-lg font-semibold">24/7 support</p>
              <p className="mt-1 text-sm">Help whenever you need it.</p>
            </div>

            <div className="p-6 text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-neutral-800 grid place-items-center">
                <ListChecks className="h-10 w-10 text-white" />
              </div>
              <p className="text-lg font-semibold">End-to-end TMS</p>
              <p className="mt-1 text-sm">Tours, vehicles, stays, bookings.</p>
            </div>

            <div className="p-6 text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-neutral-800 grid place-items-center">
                <Map className="h-10 w-10 text-white" />
              </div>
              <p className="text-lg font-semibold">Smart planning</p>
              <p className="mt-1 text-sm">Optimize routes and itineraries.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= EXOTIC PLACES (4-tile collage like sample) ================= */}
      {tourCards.length > 0 &&
        (() => {
          const items = Array.from(
            { length: 4 },
            (_, i) => tourCards[i % tourCards.length]
          );

          const Card = ({ item, className = "", showNew = false, i }) => (
            <article
              key={`${item.title}-${i}`}
              className={`relative overflow-hidden ${className}`}
            >
              <img
                src={item.img}
                alt={item.title}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute left-3 bottom-3">
                <h4 className="text-white text-lg font-semibold drop-shadow">
                  {item.title}
                </h4>
              </div>
            </article>
          );

          return (
            <section className="py-14 bg-white pt-25 pb-25">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center">
                  <h3 className="text-3xl sm:text-4xl font-bold leading-tight text-neutral-900">
                    Go Exotic Places
                  </h3>
                  <p className="mt-4 text-neutral-600">
                    When it comes to exploring exotic places, the choices are
                    numerous. Whether you like peaceful destinations or vibrant
                    landscapes, we have offers for you.
                  </p>
                </div>

                {/* 3 columns on LG; 2 uniform rows. Right tile spans both rows. Tight gaps, no radius. */}
                <div className="mt-8 grid gap-3 lg:grid-cols-3 auto-rows-[210px] sm:auto-rows-[240px] lg:auto-rows-[230px]">
                  {/* Top-left: wide landscape (2 columns, 1 row) */}
                  <Card item={items[0]} i={0} className="lg:col-span-2" />

                  {/* Right: tall portrait spanning both rows */}
                  <Card item={items[1]} i={1} className="lg:row-span-2" />

                  {/* Bottom row: two squares under the wide tile */}
                  <Card item={items[2]} i={2} />
                  <Card item={items[3]} i={3} />
                </div>

                <div className="mt-8 text-center pt-7">
                  <Link
                    to="/tours"
                    className="inline-block bg-[#36ac31] px-6 py-3 text-sm font-semibold text-neutral-900 hover:brightness-95"
                  >
                    EXPLORE
                  </Link>
                </div>
              </div>
            </section>
          );
        })()}

      {/* ================= TOP REVIEWS (image left, dark map right, auto 3s, dots) ================= */}
      {!feedbacks.loading && reviews.length > 0 && (
        <section className="relative">
          <div className="grid lg:grid-cols-2">
            {/* Left: static image */}
            <div
              className="h-[420px] sm:h-[520px] lg:h-[560px] bg-center bg-cover"
              style={{ backgroundImage: "url('/rate.webp')" }}
            />

            {/* Right: dark panel with subtle map bg */}
            <div className="relative flex items-center justify-center px-6 py-10">
              <div className="absolute inset-0 bg-[#1c1c1c]" />
              <div
                className="absolute inset-0 opacity-8"
                style={{
                  backgroundImage: "url('/bg-map2.webp')",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }}
              />

              {/* Content */}
              {(() => {
                const cur = reviews[revIdx] || {};
                const name = cur.name || "Traveler";
                const initials = name
                  .split(" ")
                  .map((s) => s[0])
                  .join("")
                  .slice(0, 5)
                  .toUpperCase();
                const rating = Math.max(
                  1,
                  Math.min(5, Number(cur.rating || 5))
                );

                return (
                  <div className="relative z-10 max-w-2xl text-center text-white">
                    <h3 className="text-3xl sm:text-4xl font-bold leading-tight text-neutral-900 text-white pb-10">
                      Our Top Reviews
                    </h3>
                    <p className="mt-1 text-lg font-semibold opacity-90"></p>

                    {/* Stars */}
                    <div className="mt-3 inline-flex gap-1 text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-5 w-5 ${
                            i < rating ? "fill-current" : ""
                          }`}
                        />
                      ))}
                    </div>

                    {/* Quote */}
                    <p className="mt-5 text-sm sm:text-base text-white/85 leading-relaxed">
                      {cur.comment}
                    </p>

                    {/* Reviewer (name, then avatar UNDER it) */}
                    <div className="mt-6 flex flex-col items-center">
                      <div className="text-sm font-medium">{name}</div>
                      <div className="mt-2 h-12 w-12 rounded-full bg-white/10 grid place-items-center text-sm font-semibold">
                        {initials}
                      </div>
                    </div>

                    {/* Dots (clickable) */}
                    <div className="mt-5 flex items-center justify-center gap-2">
                      {reviews.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setRevIdx(i)}
                          aria-label={`Go to review ${i + 1}`}
                          className={`h-2.5 w-2.5 rounded-full transition ${
                            i === revIdx
                              ? "bg-white cursor-pointer"
                              : "bg-white/40 hover:bg-white/60 cursor-pointer"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </section>
      )}

      {/* Section (centered) */}
      <section className="relative py-12">
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-center bg-cover opacity-20"
          style={{ backgroundImage: "url('/bg-map.webp')" }}
        />
        {/* center the whole section */}
        <div className="flex justify-center px-4 sm:px-6 lg:px-8 p-15">
          {/* limit width so the block can be centered */}
          <div className="w-full max-w-5xl grid gap-10 items-center justify-items-center lg:grid-cols-2">
            {/* Left: Copy + CTA */}
            <div className="w-full max-w-[560px]">
              <h2 className="text-3xl sm:text-4xl font-bold leading-tight text-neutral-900">
                Freedom to Explore
              </h2>
              <p className="mt-4 text-neutral-600">
                Rent a vehicle anytime, with or without tour packages. Travel
                comfortably, explore freely, and enjoy every journey your way
                with our reliable rentals.
              </p>

              <Link
                to="/vehicles"
                className="mt-6 inline-block bg-[#36ac31] px-6 py-3 text-sm font-semibold text-neutral-900 hover:brightness-95 active:bg-[#2ac02e] transition"
              >
                SEE MORE
              </Link>
            </div>

            {/* Right: Image card */}
            <div className="w-full max-w-[587px] h-[408px] overflow-hidden border border-neutral-200 shadow-sm">
              <div className="relative">
                <img
                  src="/hero-6.webp"
                  alt="Sri Lanka"
                  className="h-[360px] w-full object-cover sm:h-[420px]"
                />
                <div className="absolute inset-0 bg-black/25" />
                <div className="absolute left-5 bottom-5 right-5 text-white">
                  <h3 className="mt-1 text-2xl font-semibold leading-tight">
                    GoTour SL
                  </h3>
                  <p className="mt-1 text-sm text-white/85">
                    Your Journey, Your Vehicle, Your Way
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= METRICS (MATTE BLACK, REAL DATA) ================= */}
      <section className="relative py-16 bg-[#1c1c1c] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl sm:text-4xl md:text-5xl font-bold">
            GoTour by the numbers
          </h2>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 text-center">
            <div className="p-6">
              <div className="mx-auto mb-4 h-20 w-20 rounded-2xl bg-neutral-800 grid place-items-center">
                <span className="text-2xl font-extrabold">365</span>
              </div>
              <p className="text-lg font-semibold">Days Available</p>
            </div>

            <div className="p-6">
              <div className="mx-auto mb-4 h-20 w-20 rounded-2xl bg-neutral-800 grid place-items-center">
                <span className="text-2xl font-extrabold">15+</span>
              </div>
              <p className="text-lg font-semibold">Cities Covered</p>
            </div>

            <div className="p-6">
              <div className="mx-auto mb-4 h-20 w-20 rounded-2xl bg-neutral-800 grid place-items-center">
                <span className="text-2xl font-extrabold">
                  {satisfactionPct}%
                </span>
              </div>
              <p className="text-lg font-semibold">Satisfaction</p>
            </div>

            <div className="p-6">
              <div className="mx-auto mb-4 h-20 w-20 rounded-2xl bg-neutral-800 grid place-items-center">
                <span className="text-2xl font-extrabold">24/7</span>
              </div>
              <p className="text-lg font-semibold">Support</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============== LATEST BLOGS (6-image collage, no gaps) ============== */}
      <WhiteBlock>
        <div className="text-center max-w-3xl mx-auto mb-6 pt-15 pb-5">
          <h2 className="text-3xl sm:text-4xl font-bold">Blog Posts</h2>
          <p className="mt-2 text-sm text-neutral-600">
            One inspiring story is worth traveling. Discover tips, local food,
            tradition, and history.
          </p>
        </div>

        {posts.loading && (
          <div className="columns-3" style={{ columnGap: 0 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="break-inside-avoid mb-0">
                <div className="w-full h-[260px] bg-neutral-200 animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {!posts.loading &&
          (() => {
            const raw = Array.isArray(posts.data) ? posts.data.slice(0, 6) : [];
            if (raw.length === 0) {
              return (
                <div className="text-center text-sm text-neutral-600 py-10">
                  No blog posts yet.
                </div>
              );
            }

            // Normalize once
            const asPost = (p) => ({
              title: p?.title || p?.name || "Untitled post",
              img:
                (Array.isArray(p?.images) && p.images[0]) ||
                p?.image ||
                p?.cover ||
                "https://placehold.co/800x600/png?text=Post",
              slug: p?.slug,
              createdAt: p?.createdAt || p?.date || null,
            });
            const items = raw.map(asPost);

            // Arrange for the visual pattern using CSS columns:
            // Column 1: Tall, Normal
            // Column 2: Normal, Tall
            // Column 3: Tall, Normal
            const ordered = [
              { ...items[0], tall: true }, // col1 top
              { ...items[1], tall: false }, // col1 bottom
              { ...items[2], tall: false }, // col2 top
              { ...items[3], tall: true }, // col2 bottom
              { ...items[4], tall: true }, // col3 top
              { ...items[5], tall: false }, // col3 bottom
            ].filter(Boolean); // in case fewer than 6

            return (
              <div
                className="columns-1 sm:columns-2 lg:columns-3"
                style={{ columnGap: 7 }}
              >
                {ordered.map((p, i) => {
                  const href = p.slug ? `/blog/${p.slug}` : "#";
                  const dateStr = p.createdAt
                    ? new Date(p.createdAt).toLocaleDateString()
                    : "";
                  return (
                    <article key={i} className="break-inside-avoid mb-2 group">
                      <Link to={href} className="block">
                        <figure className="relative m-0">
                          <div
                            className={p.tall ? "aspect-[4/5]" : "aspect-[4/3]"}
                          >
                            <img
                              src={p.img}
                              alt={p.title}
                              className="block w-full h-full object-cover transition-transform duration-300"
                              loading="lazy"
                              onError={(e) =>
                                (e.currentTarget.src =
                                  "https://placehold.co/800x600/png?text=Post")
                              }
                            />
                          </div>

                          {/* base gradient for legibility */}
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent z-0" />

                          {/* HOVER OVERLAY: fades in */}
                          <div className="pointer-events-none absolute inset-0 bg-black opacity-0 group-hover:opacity-50 transition-opacity duration-300 z-10" />

                          {/* text sits above overlays */}
                          <figcaption className="absolute inset-x-1 bottom-1 text-white px-1 z-20">
                            <h3 className="text-[12px] font-semibold leading-tight line-clamp-2">
                              {p.title}
                            </h3>
                            <div className="text-[10px] opacity-85">
                              {dateStr}
                            </div>
                          </figcaption>
                        </figure>
                      </Link>
                    </article>
                  );
                })}
              </div>
            );
          })()}
        {/* View all */}
        <div className="text-center mt-6 pb-15">
          <Link
            to="/blogs"
            className="mt-6 inline-block bg-[#36ac31] px-6 py-3 text-sm font-semibold text-neutral-900 hover:brightness-95 active:bg-[#2ac02e] transition"
          >
            View all
          </Link>
        </div>
      </WhiteBlock>
    </div>
  );
}

/* ---------- Atoms ---------- */
function HeaderRow({ title }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-lg font-semibold">{title}</h3>
      <span className={`ml-4 h-0.5 w-24 shrink-0 rounded-full ${GRAD_BG}`} />
    </div>
  );
}
function SectionHeader({ title, action }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-lg font-semibold">{title}</h3>
      {action && (
        <Link
          to={action.to}
          className="group text-sm text-neutral-700 inline-flex items-center gap-1 hover:opacity-90"
        >
          <span className={LINK_TEXT_HOVER}>{action.label}</span>
          <ArrowRight className="h-4 w-4 text-neutral-400 group-hover:text-[#16A34A]" />
        </Link>
      )}
    </div>
  );
}
function CTA({ to, icon, children }) {
  return (
    <Link
      to={to}
      className={`group inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-white ${GRAD_BG} hover:opacity-95 active:opacity-90`}
    >
      <span className="opacity-90 group-hover:opacity-100">{icon}</span>
      {children}
    </Link>
  );
}
function ValueCard({
  icon,
  title,
  text,
  accent = "from-[#09E65A1A] to-[#16A34A1A]",
}) {
  return (
    <div className="relative rounded-2xl border bg-white p-4 overflow-hidden">
      <div
        className={`absolute inset-0 pointer-events-none bg-gradient-to-br ${accent}`}
      />
      <div className="relative">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm border">
          {icon}
        </div>
        <p className={`mt-3 text-sm font-medium ${LINK_TEXT_HOVER}`}>{title}</p>
        <p className="mt-1 text-sm text-neutral-600">{text}</p>
      </div>
    </div>
  );
}
function CardGrid({ items = [], loading = false }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {loading &&
        Array.from({ length: 3 }).map((_, i) => (
          <div
            key={`sk-${i}`}
            className="h-[260px] rounded-2xl border bg-white overflow-hidden"
          >
            <div className="h-40 bg-neutral-100 animate-pulse" />
            <div className="p-4 space-y-3">
              <div className="h-4 w-40 bg-neutral-100 animate-pulse rounded" />
              <div className="h-3 w-3/4 bg-neutral-100 animate-pulse rounded" />
            </div>
          </div>
        ))}
      {!loading &&
        items.map((it, i) => (
          <article
            key={i}
            className={`rounded-2xl p-[1px] ${GRAD_BG} overflow-hidden hover:shadow-lg transition`}
          >
            <div className="rounded-[14px] bg-white overflow-hidden">
              <img
                src={it.img}
                alt={it.title}
                className="h-40 w-full object-cover"
                loading="lazy"
                onError={(e) =>
                  (e.currentTarget.src =
                    "https://via.placeholder.com/800x500?text=%E2%80%94")
                }
              />
              <div className="p-4">
                <p className={`text-sm font-medium ${LINK_TEXT_HOVER}`}>
                  {it.title}
                </p>
                <p className="text-xs text-neutral-500">{it.subtitle}</p>
                <div className="mt-2 inline-flex items-center gap-1 text-amber-500">
                  <Star className="h-4 w-4 fill-current" />
                  <span className="text-xs text-neutral-700">{it.rating}</span>
                </div>
              </div>
            </div>
          </article>
        ))}
    </div>
  );
}
function Metric({ k, v }) {
  return (
    <div className={`rounded-2xl p-[1px] ${GRAD_BG}`}>
      <div className="rounded-2xl bg-white p-4 text-center">
        <div className={`text-2xl font-semibold ${LINK_TEXT_HOVER}`}>{k}</div>
        <div className="text-xs text-neutral-500 mt-1">{v}</div>
      </div>
    </div>
  );
}
function FieldWrap({ children }) {
  return (
    <div className="group rounded-xl p-[1px] w-full sm:w-[200px] focus-within:bg-gradient-to-r focus-within:from-[#09E65A] focus-within:to-[#16A34A]">
      <div className="flex items-center gap-2 rounded-[12px] bg-white px-3 py-2 border border-neutral-300 transition-colors group-focus-within:border-transparent">
        {children}
      </div>
    </div>
  );
}
function Testimonial({ data }) {
  const initials =
    (data.name || "Traveler")
      .split(" ")
      .map((s) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "T";
  return (
    <blockquote className="rounded-2xl p-[1px] bg-gradient-to-br from-[#09E65A33] to-[#16A34A33]">
      <div className="rounded-[14px] bg-white p-4 h-full">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-[#09E65A] to-[#16A34A] text-white grid place-items-center text-sm font-semibold">
            {initials}
          </div>
          <div>
            <div className="text-sm font-medium text-neutral-900">
              {data.name}
            </div>
            <div className="flex items-center gap-1 text-amber-500">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${i < data.rating ? "fill-current" : ""}`}
                />
              ))}
            </div>
          </div>
        </div>
        <p className="text-sm text-neutral-700 line-clamp-4">{data.comment}</p>
        {data.createdAt && (
          <p className="mt-2 text-[11px] text-neutral-500">
            {new Date(data.createdAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </blockquote>
  );
}
const FAQS = [
  {
    q: "Can I manage vehicles and tours from one place?",
    a: "Yes—GoTour TMS centralizes fleet, tours, stays, and bookings with unified admin tools.",
  },
  {
    q: "Do you support refunds or rescheduling?",
    a: "You can request changes from your booking details page; policies depend on the partner.",
  },
  {
    q: "Is payment secure?",
    a: "We use industry-standard encryption and trusted payment gateways to protect your data.",
  },
];
