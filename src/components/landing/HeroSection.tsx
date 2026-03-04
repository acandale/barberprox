import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Calendar, Star, Clock, Loader2 } from "lucide-react";
import heroImage from "@/assets/hero-barber.jpg";
import { useSalonSettings } from "@/hooks/useSalonSettings";

export function HeroSection() {
  const navigate = useNavigate();
  const { data: settings, isLoading } = useSalonSettings();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img
          src={settings?.hero_image_url || heroImage}
          alt="Professional barber shop interior"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 gradient-hero opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy/50 to-transparent" />
      </div>

      {/* Floating Elements */}
      <div className="absolute top-1/4 left-10 w-20 h-20 bg-purple/20 rounded-full blur-xl animate-float" />
      <div className="absolute bottom-1/4 right-10 w-32 h-32 bg-purple-light/20 rounded-full blur-xl animate-float" style={{ animationDelay: "2s" }} />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-32">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8 animate-fade-in">
            <Star className="h-4 w-4 text-purple-light fill-purple-light" />
            <span className="text-sm font-medium text-white/90">
              {settings?.hero_badge_text || "Premium Grooming Experience"}
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight animate-slide-up">
            {settings?.hero_title || "Stilul tău, la superlativ"}{" "}
            <span className="text-gradient">Perfected</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-white/80 mb-10 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: "0.1s" }}>
            {settings?.hero_subtitle || "Book your appointment in seconds."}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <Button variant="hero" size="xl" onClick={() => navigate("/auth?mode=signup")} className="w-full sm:w-auto">
              <Calendar className="h-5 w-5" />
              Book Appointment
            </Button>
            <Button variant="hero-outline" size="xl" onClick={() => navigate("/#services")} className="w-full sm:w-auto">
              View Services
            </Button>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center justify-center gap-8 mt-16 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            {(settings?.hero_stats || [{ value: "500+", label: "Happy Clients" }, { value: "4.9", label: "Star Rating" }]).map((stat, i) => (
              <div key={i} className="flex items-center gap-4">
                {i > 0 && <div className="w-px h-12 bg-white/20 hidden sm:block" />}
                <div className="text-center">
                  <p className="text-3xl md:text-4xl font-bold text-purple-light">{stat.value}</p>
                  <p className="text-sm text-white/60">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-2">
          <div className="w-1.5 h-3 bg-white/50 rounded-full animate-pulse-soft" />
        </div>
      </div>
    </section>
  );
}
