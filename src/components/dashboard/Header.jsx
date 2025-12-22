import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Crown, Grid3X3, LogOut, User, Sparkles, Zap, Rocket } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export const Header = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const userName = user?.name || "User";
  const userEmail = user?.email || "";
  
  // Get user's plan from user object (defaults to 'free')
  const userPlan = user?.subscription?.plan || 'free';
  
  // Map plan names with proper capitalization
  const getPlanName = (plan) => {
    const planMap = {
      'free': 'Free Plan',
      'starter': 'Starter Plan',
      'pro': 'Pro Plan',
      'enterprise': 'Enterprise Plan'
    };
    return planMap[plan] || plan.charAt(0).toUpperCase() + plan.slice(1) + ' Plan';
  };
  
  // Get appropriate icon for each plan type
  const getPlanIcon = (plan) => {
    const iconMap = {
      'free': Sparkles,
      'starter': Zap,
      'pro': Rocket,
      'enterprise': Crown
    };
    return iconMap[plan] || Crown;
  };
  
  const planName = getPlanName(userPlan);
  const PlanIcon = getPlanIcon(userPlan);
  
  // Get icon color based on plan
  const getPlanIconColor = (plan) => {
    if (plan === 'free') return 'text-muted-foreground';
    if (plan === 'starter') return 'text-blue-500';
    if (plan === 'pro') return 'text-purple-500';
    if (plan === 'enterprise') return 'text-primary';
    return 'text-primary';
  };

  // Calculate remaining filter queries (SLF - Search Left)
  const getRemainingFilterQueries = () => {
    // Plan limits from planRestrictions
    const planLimits = {
      'free': 0,
      'starter': 1000,
      'pro': 10000,
      'enterprise': -1 // Unlimited
    };
    
    const maxQueries = planLimits[userPlan] || 0;
    
    // Enterprise plan is unlimited
    if (maxQueries === -1) {
      return 'Unlimited';
    }
    
    // Get current usage from user object
    const usedQueries = user?.usage?.filterQueriesThisMonth || 0;
    const remaining = Math.max(0, maxQueries - usedQueries);
    
    return remaining;
  };
  
  const remainingQueries = getRemainingFilterQueries();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    await logout();
    // Navigate after logout
    window.location.href = '/login';
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 glass-panel z-[1000] border-b border-border/50">
      <div className="h-full w-full px-6 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3 cursor-pointer group">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center glow-effect">
            <span className="text-primary font-light text-xl">SL</span>
          </div>
          <span className="text-xl font-light text-foreground group-hover:text-primary transition-colors">
            SneakLink
          </span>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-4">
          {/* User Profile */}
          <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 glass-button group hover:border-primary/50 transition-all"
          >
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-light text-foreground max-w-[120px] truncate hidden sm:block">
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
              <div className="absolute right-0 top-full mt-2 w-60 bg-card border border-border/80 rounded-xl shadow-lg animate-slide-down z-[10000] backdrop-blur-xl">
                <div className="p-4 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    {user?.picture ? (
                      <img 
                        src={user.picture} 
                        alt={userName}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-light text-foreground">{userName}</p>
                      <p className="text-xs text-muted-foreground">{userEmail || "No email"}</p>
                    </div>
                  </div>
                </div>

                <div className="p-2">
                  {/* Current Plan */}
                  <div className="px-3 py-2.5 rounded-lg bg-secondary/50 mb-2">
                    <div className="flex items-center gap-2">
                      <PlanIcon className={`w-4 h-4 ${getPlanIconColor(userPlan)}`} />
                      <div>
                        <p className="text-xs text-muted-foreground">Current Plan</p>
                        <p className="text-sm font-light text-foreground">{planName}</p>
                      </div>
                    </div>
                  </div>

                  {/* SLF - Search Left */}
                  <div className="px-3 py-2.5 rounded-lg mb-2">
                    <div className="flex items-center gap-2">
                      <Grid3X3 className={`w-4 h-4 ${getPlanIconColor(userPlan)}`} />
                      <div>
                        <p className="text-xs text-muted-foreground">SLF</p>
                        <p className="text-sm font-light text-foreground">
                          {remainingQueries === 'Unlimited' ? 'Unlimited' : remainingQueries}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Account */}
                  <button 
                    onClick={() => {
                      setIsDropdownOpen(false);
                      navigate('/account');
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-secondary/50 hover:border hover:border-border/50 transition-all"
                  >
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>Account</span>
                  </button>

                  <div className="my-2 border-t border-border/50" />

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 hover:border hover:border-destructive/20 transition-all"
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

