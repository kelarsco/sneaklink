import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Users,
  Menu,
  CreditCard,
  MessageSquare,
  UserCog,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { getNewTicketsCount, getNewSubscribersCount } from "@/services/api";

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [newTicketsCount, setNewTicketsCount] = useState(0);
  const [newSubscribersCount, setNewSubscribersCount] = useState(0);

  const isDark = theme === "dark";

  // Fetch new tickets count
  const fetchNewTicketsCount = async () => {
    try {
      const response = await getNewTicketsCount();
      setNewTicketsCount(response.count || 0);
    } catch (error) {
      // Fail silently
    }
  };

  // Fetch new subscribers count
  const fetchNewSubscribersCount = async () => {
    try {
      const response = await getNewSubscribersCount();
      setNewSubscribersCount(response.count || 0);
    } catch (error) {
      // Fail silently
    }
  };

  // Fetch counts on mount and when navigating
  useEffect(() => {
    fetchNewTicketsCount();
    fetchNewSubscribersCount();
    
    // Poll for updates every 5 minutes
    const interval = setInterval(() => {
      fetchNewTicketsCount();
      fetchNewSubscribersCount();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [location.pathname]);

  // Clear subscribers count when navigating to subscriptions page
  useEffect(() => {
    if (location.pathname === '/manager/subscriptions') {
      // Mark subscriptions as viewed
      localStorage.setItem('subscriptionsLastViewed', new Date().toISOString());
      // Clear the count immediately
      setNewSubscribersCount(0);
      // Refetch to get accurate count (should be 0 after marking as viewed)
      fetchNewSubscribersCount();
    }
  }, [location.pathname]);

  // Listen for custom events to refresh count (from AdminSupport page)
  useEffect(() => {
    const handleTicketUpdate = () => {
      fetchNewTicketsCount();
    };

    const handleTicketDeleted = () => {
      fetchNewTicketsCount();
    };

    const handleTicketReplied = () => {
      // Optimistically decrement counter when a reply is sent
      setNewTicketsCount(prev => Math.max(0, prev - 1));
      // Then refetch to get accurate count
      fetchNewTicketsCount();
    };

    window.addEventListener('ticketUpdated', handleTicketUpdate);
    window.addEventListener('ticketDeleted', handleTicketDeleted);
    window.addEventListener('ticketReplied', handleTicketReplied);

    return () => {
      window.removeEventListener('ticketUpdated', handleTicketUpdate);
      window.removeEventListener('ticketDeleted', handleTicketDeleted);
      window.removeEventListener('ticketReplied', handleTicketReplied);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show on scroll up, hide on scroll down
      if (currentScrollY < lastScrollY) {
        // Scrolling up
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down and past 100px
        setIsVisible(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const menuItems = [
    { icon: CreditCard, label: "Subscriptions", path: "/manager/subscriptions" },
    { icon: MessageSquare, label: "Support", path: "/manager/support" },
    { icon: UserCog, label: "Staff", path: "/manager/staff" },
  ];

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleNavClick = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

  return (
    <div 
      className={cn(
        "md:hidden fixed bottom-[10px] z-50 left-1/2 -translate-x-1/2",
        "transition-all duration-500 ease-in-out",
        isVisible 
          ? "translate-y-0 opacity-100 scale-100" 
          : "translate-y-[150px] opacity-0 scale-95"
      )}
    >
      <div className={cn(
        "relative flex items-center justify-center gap-3 px-[25px] py-3 rounded-3xl",
        "backdrop-blur-xl shadow-2xl",
        "bg-white/80 dark:bg-gray-900/80",
        "border border-white/30 dark:border-gray-700/40",
        "before:absolute before:inset-0 before:rounded-3xl before:pointer-events-none",
        "before:bg-gradient-to-b before:from-white/20 before:via-white/5 before:to-transparent",
        "before:dark:from-white/10 before:dark:via-white/5",
        "w-auto min-w-fit"
      )}>
        {/* Home Icon */}
        <button
          onClick={() => navigate("/manager")}
          className={cn(
            "p-2.5 rounded-full transition-all",
            location.pathname === "/manager"
              ? isDark
                ? "bg-gray-700 text-white"
                : "bg-gray-900 text-white"
              : isDark
                ? "text-gray-400 hover:text-white hover:bg-gray-700/50"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50"
          )}
        >
          <Home className="w-5 h-5" />
        </button>

        {/* Users Icon */}
        <button
          onClick={() => navigate("/manager/users")}
          className={cn(
            "p-2.5 rounded-full transition-all",
            location.pathname === "/manager/users"
              ? isDark
                ? "bg-gray-700 text-white"
                : "bg-gray-900 text-white"
              : isDark
                ? "text-gray-400 hover:text-white hover:bg-gray-700/50"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50"
          )}
        >
          <Users className="w-5 h-5" />
        </button>

        {/* Support Icon */}
        <button
          onClick={() => navigate("/manager/support")}
          className={cn(
            "relative p-2.5 rounded-full transition-all",
            location.pathname === "/manager/support"
              ? isDark
                ? "bg-gray-700 text-white"
                : "bg-gray-900 text-white"
              : isDark
                ? "text-gray-400 hover:text-white hover:bg-gray-700/50"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50"
          )}
        >
          <MessageSquare className="w-5 h-5" />
          {newTicketsCount > 0 && (
            <span className={cn(
              "absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-light",
              "bg-yellow-400 text-gray-900 border-2",
              isDark ? "border-gray-900" : "border-white"
            )}>
              {newTicketsCount > 99 ? '99+' : newTicketsCount}
            </span>
          )}
        </button>

        {/* Hamburger Menu */}
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "p-2.5 rounded-full transition-all",
                menuOpen
                  ? isDark
                    ? "bg-gray-700 text-white"
                    : "bg-gray-900 text-white"
                  : isDark
                    ? "text-gray-400 hover:text-white hover:bg-gray-700/50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50"
              )}
            >
              <Menu className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="top"
            className={cn(
              "mb-2 w-56 backdrop-blur-xl",
              "bg-white/95 dark:bg-gray-900/95",
              "border-gray-200 dark:border-gray-700/50"
            )}
          >
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              const isSubscriptions = item.path === '/manager/subscriptions';
              const showBadge = isSubscriptions && newSubscribersCount > 0;
              return (
                <DropdownMenuItem
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={cn(
                    "cursor-pointer relative",
                    isActive
                      ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                      : "text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800/50"
                  )}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                  {showBadge && (
                    <span className={cn(
                      "absolute right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-light",
                      "bg-yellow-400 text-gray-900 border-2",
                      isDark ? "border-gray-900" : "border-white"
                    )}>
                      {newSubscribersCount > 99 ? '99+' : newSubscribersCount}
                    </span>
                  )}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700/50" />
            {/* Theme Switcher */}
            <div className="px-2 py-3">
              <div className={cn(
                "flex items-center justify-between gap-3",
                "text-gray-900 dark:text-white"
              )}>
                <div className="flex items-center gap-2">
                  <Sun className={cn("w-4 h-4", !isDark ? "text-yellow-500" : "text-gray-400")} />
                  <span className="text-sm font-light">Theme</span>
                  <Moon className={cn("w-4 h-4", isDark ? "text-blue-400" : "text-gray-400")} />
                </div>
                <Switch
                  checked={isDark}
                  onCheckedChange={toggleTheme}
                  className="data-[state=checked]:bg-gray-700"
                />
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
