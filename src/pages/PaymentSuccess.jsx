// src/pages/PaymentSuccess.jsx
import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

export default function PaymentSuccess() {
  const [search] = useSearchParams();
  const sessionId = search.get("session_id");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function finalize() {
      try {
        const RAW =
          (import.meta.env?.VITE_BACKEND_URL || "").toString() ||
          (import.meta.env?.VITE_API_URL || "").toString() ||
          "http://localhost:5000";
        const BASE = RAW.replace(/\/+$/, "");
        const token = localStorage.getItem("token");

        const res = await fetch(`${BASE}/api/pay/finalize?session_id=${encodeURIComponent(sessionId)}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Finalize failed");

        toast.success("Payment complete! Booking created.");
        // Clear cart badge, if you want to reflect immediately
        window.dispatchEvent(new CustomEvent("cart:changed"));
      } catch (e) {
        toast.error(e.message || "Could not finalize payment");
      } finally {
        setLoading(false);
      }
    }
    if (sessionId) finalize();
  }, [sessionId]);

  if (loading) {
    return <div className="max-w-3xl mx-auto px-4 py-10 text-neutral-600">Finalizing your booking…</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold">Thank you!</h1>
      <p className="mt-2 text-neutral-600">Your payment was successful and your booking has been created.</p>
      <div className="mt-6 flex items-center gap-3">
        <Link className="px-4 py-2 rounded-xl border" to="/tours">Continue browsing</Link>
        <button className="px-4 py-2 rounded-xl text-white bg-emerald-600" onClick={() => navigate("/customer")}>
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
