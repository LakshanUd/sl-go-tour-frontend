// src/pages/PaymentSuccess.jsx
import { useEffect, useRef, useState, useMemo } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

/* theme */
const gradFrom = "from-[#09E65A]";
const gradTo = "to-[#16A34A]";
const gradBG = `bg-gradient-to-r ${gradFrom} ${gradTo}`;

export default function PaymentSuccess() {
  const [search] = useSearchParams();
  const sessionId = search.get("session_id");
  const [loading, setLoading] = useState(!!sessionId);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const started = useRef(false);

  const BASE = useMemo(() => {
    const RAW =
      (import.meta.env?.VITE_BACKEND_URL || "").toString() ||
      (import.meta.env?.VITE_API_URL || "").toString() ||
      "http://localhost:5000";
    return RAW.replace(/\/+$/, "");
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    if (started.current) return;
    started.current = true;

    const guardKey = `pay:finalized:${sessionId}`;
    if (sessionStorage.getItem(guardKey) === "1") {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");
        const res = await fetch(
          `${BASE}/api/pay/finalize?session_id=${encodeURIComponent(sessionId)}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        );

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || "Finalize failed");

        sessionStorage.setItem(guardKey, "1");
        toast.success("Payment complete! Booking created.");
        window.dispatchEvent(new CustomEvent("cart:changed"));
      } catch (e) {
        setError(e?.message || "Could not finalize payment");
        toast.error(e?.message || "Could not finalize payment");
      } finally {
        setLoading(false);
      }
    })();
  }, [BASE, sessionId]);

  // No session_id in URL
  if (!sessionId) {
    return (
      <div className="min-h-[60vh] pt-28 flex flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-bold">Missing session</h1>
        <p className="mt-2 text-neutral-600 text-center max-w-md">
          We couldn't find a checkout session in the URL. Please return to checkout and try again.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Link className="px-4 py-2 rounded-xl border" to="/cart">Back to cart</Link>
          <Link className={`px-4 py-2 rounded-xl text-white ${gradBG}`} to="/tours">Browse tours</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] pt-28 flex flex-col items-center justify-center px-4">
        <svg className="h-6 w-6 animate-spin text-neutral-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
          <path d="M22 12a10 10 0 0 1-10 10" />
        </svg>
        <p className="mt-3 text-neutral-600">Finalizing your booking…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] pt-28 flex flex-col items-center justify-center px-4">
        <div className="h-20 w-20 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shadow-md">
          <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-rose-600">Payment issue</h1>
        <p className="mt-2 text-neutral-700 text-center max-w-md">{error}</p>
        <div className="mt-6 flex items-center gap-3">
          <Link className="px-4 py-2 rounded-xl border" to="/cart">Back to cart</Link>
          <button className={`px-4 py-2 rounded-xl text-white ${gradBG}`} onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] pt-35 pb-35 flex flex-col items-center justify-center px-4 ">
      {/* Big, centered success icon */}
      <div className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full ${gradBG} text-white shadow-lg`}>
        <svg viewBox="0 0 24 24" className="h-14 w-14" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>

      <h1 className="mt-6 text-3xl font-bold text-center">Payment successful</h1>
      <p className="mt-2 text-neutral-600 text-center max-w-xl">
        Thank you! Your payment was processed, and your booking has been created.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link className="px-4 py-2 rounded-xl border bg-white hover:bg-neutral-50 transition" to="/tours">
          Continue browsing
        </Link>
        <button
          className={`px-4 py-2 rounded-xl text-white ${gradBG} hover:opacity-95 active:opacity-90 transition cursor-pointer`}
          onClick={() => navigate("/customer")}
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
