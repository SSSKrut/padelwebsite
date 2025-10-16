import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import siteData from "../../data/site.json";
import logo from "@/assets/SunSetLogo.svg";

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const links = [
    { label: "About", href: "/" },
    { label: "Events", href: "/events" },
    { label: "Corporate", href: "/corporate" },
    { label: "Memberships", href: "/memberships" },
    { label: "Merch", href: "/merch" },
    { label: "Gallery", href: "/gallery" },
    { label: "Contacts", href: "/contacts" },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt={siteData.brand} className="h-10 w-auto" />
            <span className="text-xl font-bold text-primary">{siteData.brand}</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {links.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive(link.href) ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Button asChild>
              <Link to={siteData.ctaPrimaryHref}>{siteData.ctaPrimaryLabel}</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 space-y-2">
            {links.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setIsOpen(false)}
                className={`block py-2 text-sm font-medium transition-colors hover:text-primary ${
                  isActive(link.href) ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Button asChild className="w-full">
              <Link to={siteData.ctaPrimaryHref} onClick={() => setIsOpen(false)}>
                {siteData.ctaPrimaryLabel}
              </Link>
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
};
