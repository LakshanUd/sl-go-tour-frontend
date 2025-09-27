//src/components/BackToTop.jsx
import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react"; // or your own icon

export default function BackToTop({
  showAt = 320, // px scrolled before showing
  className = "",
  offset = { bottom: 24, right: 24 }, // position offsets
}) {
  const [visible, setVisible] = useState(false);

  // Show/hide button on scroll
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > showAt);
    onScroll(); // run once on mount
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [showAt]);

  // Scroll smoothly to top
  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={handleClick}
      style={{ bottom: offset.bottom, right: offset.right }}
      className={[
        "fixed z-[9999] rounded-full shadow-lg transition-all duration-300",
        "bg-neutral-900 text-white hover:bg-neutral-800",
        "h-10 w-10 grid place-items-center cursor-pointer",
        visible
          ? "opacity-100 pointer-events-auto translate-y-0"
          : "opacity-0 pointer-events-none translate-y-3",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
