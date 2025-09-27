import { Link } from "react-router-dom";

export default function PaymentCancel() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold">Payment Cancelled</h1>
      <p className="mt-2 text-neutral-600">No worries—your cart is still saved.</p>
      <div className="mt-6">
        <Link className="px-4 py-2 rounded-xl border" to="/cart">Return to Cart</Link>
      </div>
    </div>
  );
}
