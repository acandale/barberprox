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

interface NavbarProps {
  variant?: "default" | "transparent";
}

export function Navbar({ variant = "default" }: NavbarProps) {
  const { user, profile, isAdmin, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const isTransparent = variant === "transparent";

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isTransparent ? "bg-transparent" : "bg-card/80 backdrop-blur-xl border-b"
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div
              className={`p-2 rounded-lg transition-all duration-300 ${
                isTransparent
                  ? "bg-white/10 group-hover:bg-white/20"
                  : "bg-navy group-hover:bg-navy-light"
              }`}
            >
              <Scissors className={`h-5 w-5 text-white`} />
            </div>
            <span
              className={`font-bold text-xl ${
                isTransparent ? "text-white" : "text-foreground"
              }`}
            >
              BarberPro
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("services");
                if (el) el.scrollIntoView({ behavior: "smooth" });
                else navigate("/#services");
              }}
              className={`text-sm font-medium transition-colors cursor-pointer ${
                isTransparent
                  ? "text-white/80 hover:text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("nav.services")}
            </button>
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("about");
                if (el) el.scrollIntoView({ behavior: "smooth" });
                else navigate("/#about");
              }}
              className={`text-sm font-medium transition-colors cursor-pointer ${
                isTransparent
                  ? "text-white/80 hover:text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("nav.about")}
            </button>
            <Link
              to="/install"
              className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
                isTransparent
                  ? "text-white/80 hover:text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Download className="h-4 w-4" />
              {t("nav.install")}
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                className={`text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  isTransparent
                    ? "text-white/80 hover:text-white"
                    : "text-purple hover:text-purple/80"
                }`}
              >
                <Settings className="h-4 w-4" />
                {t("nav.admin")}
              </Link>
            )}

            {/* Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`flex items-center gap-1.5 text-sm font-medium transition-colors cursor-pointer px-2 py-1 rounded-md ${
                    isTransparent
                      ? "text-white/80 hover:text-white hover:bg-white/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Globe className="h-4 w-4" />
                  {language === "ro" ? "RO" : "EN"}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                <DropdownMenuItem onClick={() => setLanguage("ro")} className={language === "ro" ? "font-bold" : ""}>
                  🇷🇴 Română
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage("en")} className={language === "en" ? "font-bold" : ""}>
                  🇬🇧 English
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isTransparent ? "hero-outline" : "outline"}
                    size="sm"
                    className="gap-2"
                  >
                    <User className="h-4 w-4" />
                    {profile?.full_name || t("nav.account")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                    <Calendar className="h-4 w-4 mr-2" />
                    {t("nav.dashboard")}
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate("/admin")}>
                      <Calendar className="h-4 w-4 mr-2" />
                      {t("nav.adminPanel")}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    {t("nav.signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-3">
                <Button
                  variant={isTransparent ? "hero-outline" : "ghost"}
                  size="sm"
                  onClick={() => navigate("/auth")}
                >
                  {t("nav.signIn")}
                </Button>
                <Button
                  variant={isTransparent ? "hero" : "secondary"}
                  size="sm"
                  onClick={() => navigate("/auth?mode=signup")}
                >
                  {t("nav.getStarted")}
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            {/* Mobile Language Switcher */}
            <button
              className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md ${
                isTransparent
                  ? "text-white/80 hover:bg-white/10"
                  : "text-muted-foreground hover:bg-muted"
              }`}
              onClick={() => setLanguage(language === "ro" ? "en" : "ro")}
            >
              <Globe className="h-4 w-4" />
              {language === "ro" ? "RO" : "EN"}
            </button>
            <button
              className="p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className={`h-6 w-6 ${isTransparent ? "text-white" : "text-foreground"}`} />
              ) : (
                <Menu className={`h-6 w-6 ${isTransparent ? "text-white" : "text-foreground"}`} />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/10">
            <div className="flex flex-col gap-4">
              <button
                type="button"
                className={`text-sm font-medium text-left cursor-pointer ${
                  isTransparent ? "text-white/80" : "text-muted-foreground"
                }`}
                onClick={() => {
                  setMobileMenuOpen(false);
                  const el = document.getElementById("services");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                  else navigate("/#services");
                }}
              >
                {t("nav.services")}
              </button>
              <button
                type="button"
                className={`text-sm font-medium text-left cursor-pointer ${
                  isTransparent ? "text-white/80" : "text-muted-foreground"
                }`}
                onClick={() => {
                  setMobileMenuOpen(false);
                  const el = document.getElementById("about");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                  else navigate("/#about");
                }}
              >
                {t("nav.about")}
              </button>
              <Link
                to="/install"
                className={`text-sm font-medium flex items-center gap-1.5 ${
                  isTransparent ? "text-white/80" : "text-muted-foreground"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Download className="h-4 w-4" />
                {t("nav.install")}
              </Link>
              {user ? (
                <>
                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => {
                      navigate("/dashboard");
                      setMobileMenuOpen(false);
                    }}
                  >
                    {t("nav.dashboard")}
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      className="justify-start"
                      onClick={() => {
                        navigate("/admin");
                        setMobileMenuOpen(false);
                      }}
                    >
                      {t("nav.adminPanel")}
                    </Button>
                  )}
                  <Button variant="ghost" className="justify-start" onClick={handleSignOut}>
                    {t("nav.signOut")}
                  </Button>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button
                    variant={isTransparent ? "hero-outline" : "outline"}
                    onClick={() => {
                      navigate("/auth");
                      setMobileMenuOpen(false);
                    }}
                  >
                    {t("nav.signIn")}
                  </Button>
                  <Button
                    variant={isTransparent ? "hero" : "secondary"}
                    onClick={() => {
                      navigate("/auth?mode=signup");
                      setMobileMenuOpen(false);
                    }}
                  >
                    {t("nav.getStarted")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
