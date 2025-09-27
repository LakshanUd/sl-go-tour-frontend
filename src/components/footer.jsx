// src/components/Footer.jsx
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-neutral-950 text-neutral-300">
      <div className="w-full max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand Info */}
        <div>
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#09E65A] to-[#16A34A]">
            GoTour
          </h2>
          <p className="mt-3 text-sm text-neutral-400">
            Explore the world with our travel packages, vehicle rentals, and
            accommodation services. Your adventure starts here.
          </p>
        </div>

        {/* Navigation */}
        <div>
          <h3 className="text-lg font-semibold text-white">Quick Links</h3>
          <ul className="mt-3 space-y-2">
            <li>
              <a
                href="/"
                className="transition-colors hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-[#09E65A] hover:to-[#16A34A]"
              >
                Home
              </a>
            </li>
            <li>
              <a
                href="/tours"
                className="transition-colors hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-[#09E65A] hover:to-[#16A34A]"
              >
                Tours
              </a>
            </li>
            <li>
              <a
                href="/vehicles"
                className="transition-colors hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-[#09E65A] hover:to-[#16A34A]"
              >
                Vehicles
              </a>
            </li>
            <li>
              <a
                href="/accommodation"
                className="transition-colors hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-[#09E65A] hover:to-[#16A34A]"
              >
                Accommodation
              </a>
            </li>
            <li>
              <a
                href="/blog"
                className="transition-colors hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-[#09E65A] hover:to-[#16A34A]"
              >
                Blog
              </a>
            </li>
          </ul>
        </div>

        {/* Support */}
        <div>
          <h3 className="text-lg font-semibold text-white">Support</h3>
          <ul className="mt-3 space-y-2">
            <li>
              <a
                href="/faq"
                className="transition-colors hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-[#09E65A] hover:to-[#16A34A]"
              >
                FAQ
              </a>
            </li>
            <li>
              <a
                href="/contact"
                className="transition-colors hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-[#09E65A] hover:to-[#16A34A]"
              >
                Contact Us
              </a>
            </li>
            <li>
              <a
                href="/terms"
                className="transition-colors hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-[#09E65A] hover:to-[#16A34A]"
              >
                Terms &amp; Conditions
              </a>
            </li>
            <li>
              <a
                href="/privacy"
                className="transition-colors hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-[#09E65A] hover:to-[#16A34A]"
              >
                Privacy Policy
              </a>
            </li>
          </ul>
        </div>

        {/* Social Media */}
        <div>
          <h3 className="text-lg font-semibold text-white">Follow Us</h3>
          <div className="mt-3 flex space-x-4">
            {[
              { icon: <Facebook size={18} />, href: "#" },
              { icon: <Twitter size={18} />, href: "#" },
              { icon: <Instagram size={18} />, href: "#" },
              { icon: <Linkedin size={18} />, href: "#" },
            ].map((s, i) => (
              <a
                key={i}
                href={s.href}
                className="rounded-full p-[1px] bg-gradient-to-r from-[#09E65A] to-[#16A34A]"
              >
                <span className="block p-2 rounded-full bg-neutral-800 text-neutral-300 transition-colors hover:bg-gradient-to-r hover:from-[#09E65A] hover:to-[#16A34A] hover:text-white">
                  {s.icon}
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="px-6">
        <div className="h-px w-full bg-gradient-to-r from-[#09E65A] to-[#16A34A] opacity-70" />
        <div className="text-center py-4 text-sm text-neutral-400">
          © {new Date().getFullYear()}{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#09E65A] to-[#16A34A]">
            GoTour
          </span>
          . All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
