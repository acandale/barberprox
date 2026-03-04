import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Scissors, Menu, X, User, Calendar, LogOut, Settings, Download, Globe } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="sticky top-0 left-0 right-0 z-50 bg-navy border-b border-white/10 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo - Păstrat simplu și clar */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="p-2 rounded-lg bg-white/10 group-hover:bg-purple transition-colors duration-300">
              <Scissors className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl text-white tracking-tight">
              BarberPro
            </span>
          </Link>

          {/* Desktop Navigation - Neschimbat pentru că avem spațiu */}
          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => {
              const el = document.getElementById("services");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
            }} className="text-sm font-medium text-white/70 hover:text-white transition-colors cursor-pointer">
              {t("nav.services")}
            </button>
            
            <Link to="/install" className="text-sm font-medium text-white/70 hover:text-white transition-colors flex items-center gap-1.5">
              <Download className="h-4 w-4" />
              {t("nav.install")}
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 text-sm font-medium text-white/70 hover:text-white transition-colors uppercase">
                  <Globe className="h-4 w-4" />
                  {language}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-navy border-white/10 text-white">
                <DropdownMenuItem onClick={() => setLanguage("ro")} className="cursor-pointer hover:bg-white/10">RO Română</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage("en")} className="cursor-pointer hover:bg-white/10">EN English</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {!user ? (
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={() => navigate("/auth")}>
                  {t("nav.signIn")}
                </Button>
                <Button variant="hero" size="sm" onClick={() => navigate("/auth?mode=signup")}>
                  {t("nav.getStarted")}
                </Button>
              </div>
            ) : (
              /* Meniu profil existent */
              <Button variant="hero-outline" size="sm" onClick={() => navigate("/dashboard")} className="gap-2 border-white/20 text-white">
                <User className="h-4 w-4" />
                {profile?.full_name || t("nav.account")}
              </Button>
            )}
          </div>

          {/* Mobile Navigation - AICI ESTE RESTRUCTURAREA PREMIUM */}
          <div className="flex items-center gap-3 md:hidden">
            {/* Butonul de Acțiune Principală (Singurul care rămâne pe mobil) */}
            {!user && (
              <Button 
                variant="hero" 
                size="sm" 
                className="h-9 px-4 text-xs font-bold shadow-lg shadow-purple/20"
                onClick={() => navigate("/auth?mode=signup")}
              >
                {t("nav.getStarted")}
              </Button>
            )}

            {/* Selector Limbă Minimalist pe mobil */}
            <button
              className="p-2 text-white/70 flex items-center gap-1 text-xs font-bold uppercase"
              onClick={() => setLanguage(language === "ro" ? "en" : "ro")}
            >
              <Globe className="h-4 w-4" />
              {language}
            </button>

            {/* Butonul Hamburger - Poziționat la final */}
            <button 
              className="p-2 text-white bg-white/5 rounded-lg active:scale-95 transition-transform" 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay - Curat și organizat */}
        {mobileMenuOpen && (
          <div className="md:hidden py-6 border-t border-white/10 bg-navy/95 backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex flex-col gap-5 px-2">
              <button
                className="text-lg font-semibold text-white/90 text-left flex items-center justify-between"
                onClick={() => {
                  setMobileMenuOpen(false);
                  document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                {t("nav.services")}
              </button>
              
              <Link to="/install" className="text-lg font-semibold text-white/90 flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                <Download className="h-5 w-5" /> {t("nav.install")}
              </Link>

              <DropdownMenuSeparator className="bg-white/10 my-2" />

              {!user ? (
                <button
                  className="text-lg font-semibold text-purple-light text-left flex items-center gap-2"
                  onClick={() => { navigate("/auth"); setMobileMenuOpen(false); }}
                >
                  <User className="h-5 w-5" /> {t("nav.signIn")}
                </button>
              ) : (
                <>
                  <Link to="/dashboard" className="text-lg font-semibold text-white/90" onClick={() => setMobileMenuOpen(false)}>
                    {t("nav.dashboard")}
                  </Link>
                  <button onClick={handleSignOut} className="text-lg font-semibold text-red-400 text-left flex items-center gap-2">
                    <LogOut className="h-5 w-5" /> {t("nav.signOut")}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}