import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Calendar, Star } from "lucide-react";
import heroImage from "@/assets/hero-barber.jpg";
import { useSalonSettings } from "@/hooks/useSalonSettings";
import { useLanguage } from "@/hooks/useLanguage";

export function HeroSection() {
  const navigate = useNavigate();
  const { data: settings } = useSalonSettings();
  const { t } = useLanguage();

  return (
    <section className="relative h-[calc(100vh-64px)] min-h-[600px] flex items-center justify-center overflow-hidden bg-navy">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={settings?.hero_image_url || heroImage}
          alt="Professional barber shop interior"
          className="w-full h-full object-cover"
        />
        {/* Gradientul care păstrează imaginea vie în centru */}
        <div className="absolute inset-0 bg-gradient-to-b from-navy/60 via-transparent to-navy" />
        <div className="absolute inset-0 bg-navy/20" /> 
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge - Afișat doar dacă există text în DB */}
          {settings?.hero_badge_text && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-navy/40 backdrop-blur-md border border-white/10 mb-8 animate-fade-in shadow-2xl">
              <Star className="h-4 w-4 text-purple-light fill-purple-light" />
              <span className="text-sm font-semibold text-white tracking-wide uppercase">
                {settings.hero_badge_text}
              </span>
            </div>
          )}

          {/* Headline - Fără cuvinte hardcodate (Perfected a fost eliminat) */}
          {settings?.hero_title && (
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-6 leading-[1.1] animate-slide-up tracking-tight">
              {settings.hero_title}
            </h1>
          )}

          {/* Subheadline - Afișat doar dacă este configurat */}
          {settings?.hero_subtitle && (
            <p className="text-lg md:text-2xl text-white/90 mb-10 max-w-2xl mx-auto animate-slide-up font-medium" style={{ animationDelay: "0.1s" }}>
              {settings.hero_subtitle}
            </p>
          )}

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <Button 
              variant="hero" 
              size="xl" 
              onClick={() => navigate("/auth?mode=signup")} 
              className="w-full sm:w-auto text-lg h-14 px-8 shadow-xl shadow-purple/20 hover:scale-105 transition-transform"
            >
              <Calendar className="h-5 w-5 mr-2" />
              {t("hero.bookAppointment")}
            </Button>
            <Button 
              variant="hero-outline" 
              size="xl" 
              onClick={() => {
                const el = document.getElementById('services');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }} 
              className="w-full sm:w-auto text-lg h-14 px-8 backdrop-blur-md border-white/20 hover:bg-white/5"
            >
              {t("hero.viewServices")}
            </Button>
          </div>

          {/* Stats - Păstrate doar dacă sunt în DB, altfel ascunse */}
          {settings?.hero_stats && (
            <div className="flex flex-wrap items-center justify-center gap-12 mt-20 animate-fade-in" style={{ animationDelay: "0.4s" }}>
              {settings.hero_stats.map((stat: any, i: number) => (
                <div key={i} className="flex flex-col items-center">
                  <p className="text-4xl md:text-5xl font-black text-white">{stat.value}</p>
                  <p className="text-xs uppercase tracking-widest text-white/50 font-bold mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 hidden md:block">
        <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-1.5">
          <div className="w-1 h-2 bg-purple-light rounded-full animate-bounce" />
        </div>
      </div>
    </section>
  );
}