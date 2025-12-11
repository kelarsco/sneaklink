import { useState, useRef, useEffect } from "react";
import { ChevronDown, Crown, Grid3X3, LogOut, User, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";

interface HeaderProps {
  userName?: string;
  currentPlan?: string;
}

export const Header = ({ userName = "John Doe", currentPlan = "Pro Plan" }: HeaderProps) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    console.log("Logout clicked");
    setIsDropdownOpen(false);
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 glass-panel z-50 border-b border-border/50">
      <div className="h-full w-full px-6 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3 cursor-pointer group">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center glow-effect">
            <span className="text-primary font-bold text-xl">SL</span>
          </div>
          <span className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
            SneakLink
          </span>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-secondary/50 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* User Profile */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 glass-button group"
            >
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground max-w-[120px] truncate hidden sm:block">
                {userName}
              </span>
              <ChevronDown 
                className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-60 glass-card animate-slide-down z-50">
                <div className="p-4 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{userName}</p>
                      <p className="text-xs text-muted-foreground">john@example.com</p>
                    </div>
                  </div>
                </div>

                <div className="p-2">
                  {/* Current Plan */}
                  <div className="px-3 py-2.5 rounded-lg bg-secondary/50 mb-2">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Current Plan</p>
                        <p className="text-sm font-medium text-foreground">{currentPlan}</p>
                      </div>
                    </div>
                  </div>

                  {/* Manage Plans */}
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-secondary/50 transition-colors">
                    <Grid3X3 className="w-4 h-4 text-muted-foreground" />
                    <span>Manage Plans</span>
                  </button>

                  <div className="my-2 border-t border-border/50" />

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
