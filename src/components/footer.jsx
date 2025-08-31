// src/components/Footer.jsx
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="w-full max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand Info */}
        <div>
          <h2 className="text-2xl font-bold text-white">GoTour</h2>
          <p className="mt-3 text-sm">
            Explore the world with our travel packages, vehicle rentals, and
            accommodation services. Your adventure starts here.
          </p>
        </div>

        {/* Navigation */}
        <div>
          <h3 className="text-lg font-semibold text-white">Quick Links</h3>
          <ul className="mt-3 space-y-2">
            <li>
              <a href="/" className="hover:text-white transition-colors">
                Home
              </a>
            </li>
            <li>
              <a href="/tours" className="hover:text-white transition-colors">
                Tours
              </a>
            </li>
            <li>
              <a
                href="/vehicles"
                className="hover:text-white transition-colors"
              >
                Vehicles
              </a>
            </li>
            <li>
              <a
                href="/accommodation"
                className="hover:text-white transition-colors"
              >
                Accommodation
              </a>
            </li>
            <li>
              <a href="/blog" className="hover:text-white transition-colors">
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
              <a href="/faq" className="hover:text-white transition-colors">
                FAQ
              </a>
            </li>
            <li>
              <a
                href="/contact"
                className="hover:text-white transition-colors"
              >
                Contact Us
              </a>
            </li>
            <li>
              <a
                href="/terms"
                className="hover:text-white transition-colors"
              >
                Terms & Conditions
              </a>
            </li>
            <li>
              <a
                href="/privacy"
                className="hover:text-white transition-colors"
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
            <a
              href="#"
              className="p-2 rounded-full bg-gray-700 hover:bg-blue-600 transition-colors"
            >
              <Facebook size={18} />
            </a>
            <a
              href="#"
              className="p-2 rounded-full bg-gray-700 hover:bg-sky-500 transition-colors"
            >
              <Twitter size={18} />
            </a>
            <a
              href="#"
              className="p-2 rounded-full bg-gray-700 hover:bg-pink-500 transition-colors"
            >
              <Instagram size={18} />
            </a>
            <a
              href="#"
              className="p-2 rounded-full bg-gray-700 hover:bg-blue-500 transition-colors"
            >
              <Linkedin size={18} />
            </a>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-700 text-center py-4 text-sm text-gray-400">
        © {new Date().getFullYear()} GoTour. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
