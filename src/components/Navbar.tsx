import { Link, useLocation } from "react-router-dom";
import { Menu, X, User, LogOut } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import siteData from "../../data/site.json";
import logo from "@/assets/SunSetLogoWhite.png";

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  const links = [
    { label: "About", href: "/" },
    { label: "Events", href: "/events" },
    { label: "Corporate", href: "/corporate" },
    { label: "Memberships", href: "/memberships" },
    { label: "Merch", href: "/merch" },
    { label: "Gallery", href: "/gallery" },
    { label: "Players", href: "/players" },
    { label: "Contacts", href: "/contacts" },
  ];

  const isActive = (href: string) => location.pathname === href;

  const AuthButton = () => {
    if (user) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <User size={16} />
              {user.firstName}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user.firstName} {user.lastName}</DropdownMenuLabel>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground -mt-2">
              {user.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link to="/profile">My Profile</Link>
            </DropdownMenuItem>
            {(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link to="/admin">Admin Dashboard</Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="text-red-600 cursor-pointer"
              onClick={() => logout()}
            >
              <LogOut size={14} className="mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }
    return (
      <Button variant="outline" size="sm" asChild>
        <Link to="/login">Log in</Link>
      </Button>
    );
  };

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
            <AuthButton />
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
            {user ? (
              <div className="space-y-2 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-primary">
                    {user.firstName} {user.lastName}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 gap-1"
                    onClick={() => {
                      logout();
                      setIsOpen(false);
                    }}
                  >
                    <LogOut size={14} />
                    Log out
                  </Button>
                </div>
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/profile" onClick={() => setIsOpen(false)}>
                    My Profile
                  </Link>
                </Button>
                {(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/admin" onClick={() => setIsOpen(false)}>
                      Admin Dashboard
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <Button variant="outline" className="w-full" asChild>
                <Link to="/login" onClick={() => setIsOpen(false)}>Log in</Link>
              </Button>
            )}
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
