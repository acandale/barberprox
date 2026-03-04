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
    // Am schimbat 'fixed' cu 'sticky' și am adăugat fundal solid bg-navy
    <nav className="sticky top-0 left-0 right-0 z-50 bg-navy border-b border-white/10 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="p-2 rounded-lg bg-white/10 group-hover:bg-purple transition-colors duration-300">
              <Scissors className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl text-white">
              BarberPro
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("services");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                else navigate("/#services");
              }}
              className="text-sm font-medium text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              {t("nav.services")}
            </button>
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("about");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                else navigate("/#about");
              }}
              className="text-sm font-medium text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              {t("nav.about")}
            </button>
            <Link
              to="/install"
              className="text-sm font-medium text-white/80 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Download className="h-4 w-4" />
              {t("nav.install")}
            </Link>
            
            {isAdmin && (
              <Link
                to="/admin"
                className="text-sm font-medium text-purple-light hover:text-white transition-colors flex items-center gap-1.5"
              >
                <Settings className="h-4 w-4" />
                {t("nav.admin")}
              </Link>
            )}

            {/* Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 px-2 py-1 rounded-md transition-colors">
                  <Globe className="h-4 w-4" />
                  {language === "ro" ? "RO" : "EN"}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32 bg-navy border-white/10 text-white">
                <DropdownMenuItem onClick={() => setLanguage("ro")} className={`hover:bg-white/10 cursor-pointer ${language === "ro" ? "font-bold text-purple" : ""}`}>
                  🇷🇴 Română
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage("en")} className={`hover:bg-white/10 cursor-pointer ${language === "en" ? "font-bold text-purple" : ""}`}>
                  🇬🇧 English
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="hero-outline" size="sm" className="gap-2 border-white/20 text-white hover:bg-white/10">
                    <User className="h-4 w-4" />
                    {profile?.full_name || t("nav.account")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-navy border-white/10 text-white">
                  <DropdownMenuItem onClick={() => navigate("/dashboard")} className="hover:bg-white/10 cursor-pointer">
                    <Calendar className="h-4 w-4 mr-2" />
                    {t("nav.dashboard")}
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate("/admin")} className="hover:bg-white/10 cursor-pointer text-purple-light">
                      <Settings className="h-4 w-4 mr-2" />
                      {t("nav.adminPanel")}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem onClick={handleSignOut} className="hover:bg-red-500/20 text-red-400 cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2" />
                    {t("nav.signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={() => navigate("/auth")}>
                  {t("nav.signIn")}
                </Button>
                <Button variant="hero" size="sm" onClick={() => navigate("/auth?mode=signup")}>
                  {t("nav.getStarted")}
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md text-white/80 hover:bg-white/10"
              onClick={() => setLanguage(language === "ro" ? "en" : "ro")}
            >
              <Globe className="h-4 w-4" />
              {language === "ro" ? "RO" : "EN"}
            </button>
            <button className="p-2 text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/10 bg-navy animate-in slide-in-from-top duration-300">
            <div className="flex flex-col gap-4">
              <button
                type="button"
                className="text-sm font-medium text-white/80 text-left"
                onClick={() => {
                  setMobileMenuOpen(false);
                  const el = document.getElementById("services");
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                  else navigate("/#services");
                }}
              >
                {t("nav.services")}
              </button>
              {/* ... restul link-urilor mobile cu text-white/80 ... */}
              {!user && (
                <div className="flex flex-col gap-2 pt-2">
                  <Button variant="hero-outline" onClick={() => navigate("/auth")}>{t("nav.signIn")}</Button>
                  <Button variant="hero" onClick={() => navigate("/auth?mode=signup")}>{t("nav.getStarted")}</Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}