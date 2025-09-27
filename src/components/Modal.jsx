// src/components/Modal.jsx
import { useEffect } from "react";
import { X } from "lucide-react";

export default function Modal({ open, title, onClose, children }) {
  useEffect(() => {
    // lock page scroll when modal is open
    document.body.style.overflow = open ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [open]);

  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && onClose?.();
    if (open) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* dialog */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-[92vw] max-w-2xl rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            className="p-2 rounded hover:bg-gray-100"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
