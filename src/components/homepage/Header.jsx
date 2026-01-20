import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";

// Logo paths from public directory
const logoWhiteText = "/images/logo-white-text.png";
const logoBlackText = "/images/logo-black-text.png";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const navLinks = [
    { name: "Use Cases", href: "#use-cases" },
    { name: "Dashboard", href: "#dashboard" },
    { name: "Pricing", href: "#pricing" },
    { name: "FAQ", href: "#faq" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-panel-strong border-t-0 rounded-t-none">
      <div className="container mx-auto px-6 py-4">
        <nav className="flex items-center justify-between">
          {/* Logo */}
          <a 
            href="#" 
            className="flex items-center gap-2" 
            onClick={(e) => { 
              e.preventDefault(); 
              window.scrollTo({ top: 0, behavior: 'smooth' }); 
            }}
          >
            <img 
              src={logoBlackText} 
              alt="SneakLink Logo" 
              className="h-10 dark:hidden"
            />
            <img 
              src={logoWhiteText} 
              alt="SneakLink Logo" 
              className="h-10 hidden dark:block"
            />
          </a>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a 
                key={link.name} 
                href={link.href} 
                className="nav-link text-sm font-normal"
                onClick={(e) => {
                  e.preventDefault();
                  if (link.href === "#dashboard") {
                    navigate("/dashboard");
                  } else if (link.href.startsWith("#")) {
                    // If we're on a different page, navigate to homepage first
                    if (location.pathname !== "/") {
                      navigate("/");
                      // Wait for navigation, then scroll to section
                      setTimeout(() => {
                        const element = document.querySelector(link.href);
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth' });
                        }
                      }, 100);
                    } else {
                      // Already on homepage, just scroll
                      const element = document.querySelector(link.href);
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth' });
                      }
                    }
                  }
                }}
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-4">
            <Button 
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-normal px-6"
              onClick={() => navigate("/login")}
            >
              Login
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden text-foreground"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </nav>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-border pt-4">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsMenuOpen(false);
                    if (link.href === "#dashboard") {
                      navigate("/dashboard");
                    } else if (link.href.startsWith("#")) {
                      // If we're on a different page, navigate to homepage first
                      if (location.pathname !== "/") {
                        navigate("/");
                        // Wait for navigation, then scroll to section
                        setTimeout(() => {
                          const element = document.querySelector(link.href);
                          if (element) {
                            element.scrollIntoView({ behavior: 'smooth' });
                          }
                        }, 100);
                      } else {
                        // Already on homepage, just scroll
                        const element = document.querySelector(link.href);
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth' });
                        }
                      }
                    }
                  }}
                >
                  {link.name}
                </a>
              ))}
              <Button 
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-normal w-full"
                onClick={() => { navigate("/login"); setIsMenuOpen(false); }}
              >
                Login
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;

