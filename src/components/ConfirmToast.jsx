// src/components/ConfirmToast.jsx
import toast from "react-hot-toast";
import { useEffect, useRef } from "react";

/** Visual component used inside toast.custom */
export function ConfirmToastView({
  title = "Are you sure?",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}) {
  const cardRef = useRef(null);

  // Close on outside click + ESC
  useEffect(() => {
    const onDown = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target)) {
        onCancel?.();
      }
    };
    const onEsc = (e) => {
      if (e.key === "Escape") onCancel?.();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [onCancel]);

  return (
    <div
      ref={cardRef}
      className="pointer-events-auto select-none w-96 max-w-[92vw] rounded-lg border border-neutral-200 bg-white p-4 shadow-lg
                 dark:border-neutral-700 dark:bg-neutral-900"
    >
      <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</p>
      {message && (
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{message}</p>
      )}

      <div className="mt-3 flex justify-end gap-2">
        {/* Use pointer events for snappier feel */}
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            onCancel?.();
          }}
          className="px-3 py-1 rounded border border-neutral-300 text-neutral-700 hover:bg-neutral-50
                     dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800 cursor-pointer"
        >
          {cancelText}
        </button>
        <button
          type="button"
          autoFocus
          onPointerDown={(e) => {
            e.stopPropagation();
            onConfirm?.();
          }}
          className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 cursor-pointer"
        >
          {confirmText}
        </button>
      </div>
    </div>
  );
}

/**
 * Promise-based API you can reuse anywhere.
 * - Uses `toast.remove` (instant) instead of `toast.dismiss` (animated),
 *   so the UI responds immediately.
 */
export function confirmToast({
  title = "Are you sure?",
  message = "",
  confirmText = "Confirm",
  cancelText = "Cancel",
  position = "top-right",
} = {}) {
  return new Promise((resolve) => {
    const id = toast.custom(
      (t) => (
        <ConfirmToastView
          title={title}
          message={message}
          confirmText={confirmText}
          cancelText={cancelText}
          onConfirm={() => {
            toast.remove(t.id);   // instant, no exit animation
            resolve(true);
          }}
          onCancel={() => {
            toast.remove(t.id);   // instant, no exit animation
            resolve(false);
          }}
        />
      ),
      { duration: Infinity, position }
    );

    // If you ever need, you can programmatically close instantly:
    // toast.remove(id)
  });
}
