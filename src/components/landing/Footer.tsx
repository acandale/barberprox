import { Link } from "react-router-dom";
import { Scissors, MapPin, Phone, Mail, Clock } from "lucide-react";
import { useSalonSettings } from "@/hooks/useSalonSettings";
import { useWorkHours } from "@/hooks/useWorkHours";
import { useLanguage } from "@/hooks/useLanguage";

export function Footer() {
  const { data: settings } = useSalonSettings();
  const { t } = useLanguage();

  const salonName = settings?.salon_name || "BarberPro";
  const quickLinks = settings?.quick_links || [
    { label: "Services", href: "/#services" },
    { label: "About Us", href: "/#about" },
    { label: "Book Now", href: "/auth" },
  ];
  const address = settings?.footer_address || "123 Style Street, City";
  const phone = settings?.footer_phone || "(555) 123-4567";
  const email = settings?.footer_email || "hello@barberpro.com";
  const { data: workHours = [] } = useWorkHours();

  // Helper: Map day_of_week to Romanian day names
  const days = [
    "Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă", "Duminică"
  ];

  // Helper: Format time (HH:mm)
  function formatTime(t: string) {
    return t?.slice(0, 5) || "";
  }

  // Helper: Get live open/closed status
  function getLiveStatus() {
    const now = new Date();
    const dayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1; // JS: 0=Sun, 6=Sat
    const wh = workHours[dayIdx];
    if (!wh || !wh.is_open) return "Închis";
    const [h, m] = wh.start_time.split(":").map(Number);
    const [eh, em] = wh.end_time.split(":").map(Number);
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), eh, em);
    return now >= start && now <= end ? "Deschis" : "Închis";
  }

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
              <span className="font-bold text-xl">{salonName}</span>
            </Link>
            <p className="text-white/60 text-sm leading-relaxed">
              Premium grooming services for the modern gentleman. Book your appointment today.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">{t("footer.quickLinks")}</h4>
            <ul className="space-y-3">
              {quickLinks.map((link, i) => (
                <li key={i}>
                  <Link to={link.href} className="text-white/60 hover:text-white text-sm transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">{t("footer.contact")}</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-white/60 text-sm">
                <MapPin className="h-4 w-4 text-purple" />
                <span>{address}</span>
              </li>
              <li className="flex items-center gap-3 text-white/60 text-sm">
                <Phone className="h-4 w-4 text-purple" />
                <span>{phone}</span>
              </li>
              <li className="flex items-center gap-3 text-white/60 text-sm">
                <Mail className="h-4 w-4 text-purple" />
                <span>{email}</span>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h4 className="font-semibold mb-4">{t("footer.workingHours")}</h4>
            <div className="mb-2 font-bold text-green-400">
              {getLiveStatus()}
            </div>
            <ul className="space-y-3">
              {workHours.map((wh, i) => (
                <li key={wh.id} className="flex items-center gap-3 text-white/60 text-sm">
                  <Clock className="h-4 w-4 text-purple" />
                  <span>
                    {days[wh.day_of_week]}: {wh.is_open ? `${formatTime(wh.start_time)} - ${formatTime(wh.end_time)}` : "Închis"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-12 pt-8 text-center">
          <p className="text-white/40 text-sm">
            © {new Date().getFullYear()} {salonName}. {t("footer.rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
