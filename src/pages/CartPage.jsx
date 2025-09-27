// src/pages/CartPage.jsx
import { useEffect, useMemo, useState } from "react";
import { CartAPI } from "../api/cart";
import { toast } from "react-hot-toast";
import { confirmToast } from "../components/ConfirmToast";
import { Trash2, ShoppingBag } from "lucide-react";

const gradFrom = "from-[#DA22FF]";
const gradTo = "to-[#9733EE]";
const gradBG = `bg-gradient-to-r ${gradFrom} ${gradTo}`;

/* ---- helpers ---- */
function itemKey(it) {
  return it._id || it.itemId || it.id;
}

function computeTotals(items) {
  const subtotal = items.reduce(
    (s, it) => s + Number(it.unitPrice || 0) * Number(it.qty || 1),
    0
  );
  const discount = 0;
  const tax = 0;
  const fees = 0;
  const total = Math.max(0, subtotal - discount + tax + fees);
  return { subtotal, discount, tax, fees, total, currency: "LKR" };
}

export default function CartPage() {
  const [cart, setCart] = useState({ items: [], currency: "LKR" });
  const [loading, setLoading] = useState(true);

  async function load(silent = false) {
    try {
      if (!silent) setLoading(true);
      const res = await CartAPI.get();
      setCart(res.data || { items: [], currency: "LKR" });
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load cart");
    } finally {
      if (!silent) setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  // Remove item (still allowed)
  async function remove(it) {
    const id = itemKey(it);
    const ok = await confirmToast({
      title: "Remove item",
      message: `Remove "${it.name}" from your cart?`,
      confirmText: "Remove",
      cancelText: "Cancel",
    });
    if (!ok) return;

    const prev = cart.items;
    setCart((c) => ({ ...c, items: c.items.filter((x) => itemKey(x) !== id) }));

    try {
      await CartAPI.removeItem(id);
      window.dispatchEvent(new CustomEvent("cart:changed"));
      toast.success("Removed");
      load(true);
    } catch (e) {
      setCart((c) => ({ ...c, items: prev })); // rollback
      toast.error(e?.response?.data?.message || "Failed to remove item");
    }
  }

  // Clear all (optional, still allowed)
  async function clear() {
    const ok = await confirmToast({
      title: "Clear cart",
      message: "Are you sure you want to remove all items?",
      confirmText: "Clear",
      cancelText: "Cancel",
    });
    if (!ok) return;

    const prev = cart.items;
    setCart((c) => ({ ...c, items: [] }));

    try {
      await CartAPI.clear();
      toast.success("Cart cleared");
      load(true);
    } catch (e) {
      setCart((c) => ({ ...c, items: prev }));
      toast.error(e?.response?.data?.message || "Failed to clear cart");
    }
  }

  async function checkout() {
    const ok = await confirmToast({
      title: "Checkout",
      message: "Proceed to secure payment?",
      confirmText: "Continue",
      cancelText: "Cancel",
    });
    if (!ok) return;

    try {
      const RAW =
        (import.meta.env?.VITE_BACKEND_URL || "").toString() ||
        (import.meta.env?.VITE_API_URL || "").toString() ||
        "http://localhost:5000";
      const BASE = RAW.replace(/\/+$/, "");
      const token = localStorage.getItem("token");

      const res = await fetch(`${BASE}/api/pay/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Failed to start payment");
      }
      window.location.href = data.url;
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Checkout failed");
    }
  }

  const totals = useMemo(() => computeTotals(cart.items || []), [cart.items]);
  const hasItems = (cart?.items?.length || 0) > 0;

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-6 py-6">
      <h1 className="text-2xl font-bold mb-4">Your Cart</h1>

      {loading && <div className="text-neutral-500 py-10">Loading…</div>}

      {!loading && !hasItems && (
        <div className="text-neutral-500 py-10">Your cart is empty.</div>
      )}

      {!loading && hasItems && (
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          {/* Items */}
          <div className="rounded-2xl border border-neutral-200 bg-white">
            <ul className="divide-y">
              {cart.items.map((it) => {
                const id = itemKey(it);
                return (
                  <li key={id} className="p-4 flex gap-4">
                    <div className="h-20 w-28 bg-neutral-100 rounded-lg overflow-hidden">
                      {it.image ? (
                        <img
                          src={it.image}
                          alt={it.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src =
                              "https://placehold.co/160x120?text=No+Image";
                          }}
                        />
                      ) : (
                        <div className="h-full w-full grid place-items-center text-neutral-400 text-xs">
                          No image
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-medium text-neutral-900">
                            {it.name}
                          </div>
                          <div className="text-xs text-neutral-500">
                            {it.serviceType}
                          </div>
                        </div>
                        <div className="font-semibold">
                          LKR{" "}
                          {(
                            Number(it.unitPrice || 0) * Number(it.qty || 1)
                          ).toFixed(2)}
                        </div>
                      </div>

                      {/* Read-only quantity (no +/- controls) */}
                      <div className="mt-2 flex items-center gap-3">
                        <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-sm text-neutral-700">
                          Qty:
                          <span className="font-medium">{it.qty}</span>
                        </span>

                        <span className="text-xs text-neutral-500">
                          Quantity is set during booking.
                        </span>

                        <button
                          className="ml-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                          onClick={() => remove(it)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="p-4 border-t flex justify-between">
              <button
                className="text-sm text-neutral-600 hover:text-neutral-900"
                onClick={clear}
              >
                Clear cart
              </button>
              <div className="text-sm text-neutral-600">
                Items: {cart.items.length}
              </div>
            </div>
          </div>

          {/* Summary */}
          <aside className="rounded-2xl border border-neutral-200 bg-white p-4 h-fit">
            <h2 className="text-sm font-semibold mb-3">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <Row k="Subtotal" v={`LKR ${totals.subtotal.toFixed(2)}`} />
              <Row k="Discount" v={`LKR ${totals.discount.toFixed(2)}`} />
              <Row k="Tax" v={`LKR ${totals.tax.toFixed(2)}`} />
              <Row k="Fees" v={`LKR ${totals.fees.toFixed(2)}`} />
              <div className="h-px bg-neutral-200 my-2" />
              <Row
                k={<span className="font-semibold">Total</span>}
                v={<span className="font-semibold">LKR {totals.total.toFixed(2)}</span>}
              />
            </div>

            <button
              className={`mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-white ${gradBG} hover:opacity-95 active:opacity-90`}
              onClick={checkout}
            >
              <ShoppingBag className="h-4 w-4" />
              Checkout
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-neutral-600">{k}</span>
      <span className="text-neutral-900">{v}</span>
    </div>
  );
}
