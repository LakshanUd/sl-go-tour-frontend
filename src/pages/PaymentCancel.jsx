// src/pages/PaymentCancel.jsx
import { Link } from "react-router-dom";

/* gradient theme (rose for cancel) */
const gradFrom = "from-[#f43f5e]";
const gradTo = "to-[#fb7185]";
const gradBG = `bg-gradient-to-r ${gradFrom} ${gradTo}`;

export default function PaymentCancel() {
  return (
    <div className="min-h-[60vh] pt-35 pb-35 flex flex-col items-center justify-center px-4">
      {/* Big, centered cancel icon */}
      <div className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full ${gradBG} text-white shadow-lg`}>
        <svg viewBox="0 0 24 24" className="h-14 w-14" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </div>

      <h1 className="mt-6 text-3xl font-bold text-center">Payment cancelled</h1>
      <p className="mt-2 text-neutral-600 text-center max-w-xl">
        Your payment was cancelled before completion. Your cart items are still saved—review them or try again anytime.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link className="px-4 py-2 rounded-xl border bg-white hover:bg-neutral-50 transition" to="/cart">
          Return to Cart
        </Link>
        <Link
          className={`px-4 py-2 rounded-xl text-white ${gradBG} hover:opacity-95 active:opacity-90 transition`}
          to="/tours"
        >
          Continue Browsing
        </Link>
      </div>
    </div>
  );
}
