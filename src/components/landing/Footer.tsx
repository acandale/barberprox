import { Link } from "react-router-dom";
import { Scissors, MapPin, Phone, Mail, Clock } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-navy text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-purple">
                <Scissors className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-xl">BarberPro</span>
            </Link>
            <p className="text-white/60 text-sm leading-relaxed">
              Premium grooming services for the modern gentleman. Book your appointment today.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/#services" className="text-white/60 hover:text-white text-sm transition-colors">
                  Services
                </Link>
              </li>
              <li>
                <Link to="/#about" className="text-white/60 hover:text-white text-sm transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/auth" className="text-white/60 hover:text-white text-sm transition-colors">
                  Book Now
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-white/60 text-sm">
                <MapPin className="h-4 w-4 text-purple" />
                <span>123 Style Street, City</span>
              </li>
              <li className="flex items-center gap-3 text-white/60 text-sm">
                <Phone className="h-4 w-4 text-purple" />
                <span>(555) 123-4567</span>
              </li>
              <li className="flex items-center gap-3 text-white/60 text-sm">
                <Mail className="h-4 w-4 text-purple" />
                <span>hello@barberpro.com</span>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h4 className="font-semibold mb-4">Working Hours</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-white/60 text-sm">
                <Clock className="h-4 w-4 text-purple" />
                <span>Mon - Fri: 9AM - 6PM</span>
              </li>
              <li className="flex items-center gap-3 text-white/60 text-sm">
                <Clock className="h-4 w-4 text-purple" />
                <span>Saturday: 9AM - 5PM</span>
              </li>
              <li className="flex items-center gap-3 text-white/60 text-sm">
                <Clock className="h-4 w-4 text-purple" />
                <span>Sunday: Closed</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-12 pt-8 text-center">
          <p className="text-white/40 text-sm">
            © {new Date().getFullYear()} BarberPro. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
