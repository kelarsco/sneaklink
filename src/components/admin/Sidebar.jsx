import { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  MessageSquare,
  UserCog,
  CreditCard,
  Link as LinkIcon,
  LogOut,
  Moon,
  Sun,
  User,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getNewTicketsCount, getNewSubscribersCount } from "@/services/api";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { icon: LayoutDashboard, label: "Overview", path: "/manager" },
  { icon: Users, label: "Users", path: "/manager/users" },
  { icon: MessageSquare, label: "Support", path: "/manager/support" },
  { icon: UserCog, label: "Staff", path: "/manager/staff" },
  { icon: CreditCard, label: "Subscriptions", path: "/manager/subscriptions" },
];

export function Sidebar() {
  const [newTicketsCount, setNewTicketsCount] = useState(0);
  const [newSubscribersCount, setNewSubscribersCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Fetch new tickets count
  const fetchNewTicketsCount = async () => {
    try {
      const response = await getNewTicketsCount();
      setNewTicketsCount(response.count || 0);
    } catch (error) {
      console.error('Error fetching new tickets count:', error);
      // Don't show error toast, just fail silently
    }
  };

  // Fetch new subscribers count
  const fetchNewSubscribersCount = async () => {
    try {
      const response = await getNewSubscribersCount();
      setNewSubscribersCount(response.count || 0);
    } catch (error) {
      console.error('Error fetching new subscribers count:', error);
      // Don't show error toast, just fail silently
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

    // Listen for subscription activity events (from AdminSubscriptions page)
    const handleSubscriptionActivity = (event) => {
      // Increment notification counter when subscription activity occurs
      // Only if not on subscriptions page
      if (location.pathname !== '/manager/subscriptions') {
        // Optimistically increment the counter
        setNewSubscribersCount(prev => prev + 1);
        // Then refetch to get accurate count
        fetchNewSubscribersCount();
      }
    };

    window.addEventListener('ticketUpdated', handleTicketUpdate);
    window.addEventListener('ticketDeleted', handleTicketDeleted);
    window.addEventListener('ticketReplied', handleTicketReplied);
    window.addEventListener('subscriptionActivity', handleSubscriptionActivity);

    return () => {
      window.removeEventListener('ticketUpdated', handleTicketUpdate);
      window.removeEventListener('ticketDeleted', handleTicketDeleted);
      window.removeEventListener('ticketReplied', handleTicketReplied);
      window.removeEventListener('subscriptionActivity', handleSubscriptionActivity);
    };
  }, [location.pathname]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminLastLoginTime'); // Clear admin login timestamp
    toast({
      title: "Logged out",
      description: "You have been logged out from admin dashboard",
    });
    navigate('/manager/login');
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
  const isDark = theme === "dark";

  if (!mounted) {
    return null;
  }

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full transition-all duration-300",
      "backdrop-blur-xl border-b",
      isDark 
        ? "bg-gray-900/80 border-gray-700/50 shadow-lg shadow-black/20" 
        : "bg-white/80 border-gray-200/50 shadow-sm"
    )}>
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
       {/* Logo */}
    <a 
      href="/" 
      className="flex items-center gap-3 group"
      onClick={(e) => { 
        e.preventDefault(); 
        navigate('/dashboard'); 
      }}
    >
      <img 
        src="/images/logo-black-text.png" 
        alt="SneakLink Logo" 
        className="h-8 dark:hidden"
      />
      <img 
        src="/images/logo-white-text.png" 
        alt="SneakLink Logo" 
        className="h-8 hidden dark:block"
      />
    </a>

        {/* Navigation - Center (Desktop Only) */}
        <nav className={cn(
          "hidden md:flex items-center gap-1 px-4 py-2 rounded-full border transition-all overflow-x-auto",
          isDark
            ? "bg-gray-800/50 border-gray-700/50 backdrop-blur-xl"
            : "bg-gray-50/80 border-gray-200/50 backdrop-blur-xl"
        )}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
            const isSupport = item.path === '/manager/support';
            const isSubscriptions = item.path === '/manager/subscriptions';
          const showTicketsBadge = isSupport && newTicketsCount > 0;
          const showSubscribersBadge = isSubscriptions && newSubscribersCount > 0;
          const showBadge = showTicketsBadge || showSubscribersBadge;
          const badgeCount = isSupport ? newTicketsCount : newSubscribersCount;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                  "relative px-4 py-2 rounded-full text-sm font-light transition-all duration-200 whitespace-nowrap",
                isActive 
                    ? "bg-gray-900 text-white shadow-md dark:bg-gray-900"
                    : isDark
                      ? "text-gray-300 hover:text-white hover:bg-gray-800/50"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              )}
              >
                {item.label}
                  {showBadge && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-xs font-light text-gray-900 border-2 border-white dark:border-gray-900">
                      {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
              )}
            </NavLink>
          );
        })}
      </nav>

        {/* Utility Icons - Right (Desktop: Theme + User, Mobile: User Only) */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle - Desktop Only */}
          <div className={cn(
            "hidden md:flex items-center gap-2 px-3 py-2 rounded-full border transition-all backdrop-blur-xl",
            isDark
              ? "bg-gray-800/50 border-gray-700/50"
              : "bg-gray-50/80 border-gray-200/50"
          )}>
            <Sun className={cn("w-4 h-4 transition-colors", !isDark ? "text-yellow-500" : "text-gray-400")} />
            <Switch
              checked={isDark}
              onCheckedChange={toggleTheme}
              className="data-[state=checked]:bg-gray-700"
            />
            <Moon className={cn("w-4 h-4 transition-colors", isDark ? "text-blue-400" : "text-gray-400")} />
          </div>

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                "p-2 rounded-full border transition-all hover:scale-105 backdrop-blur-xl",
                isDark
                  ? "bg-gray-800/50 border-gray-700/50 text-gray-300 hover:text-white hover:bg-gray-800"
                  : "bg-gray-50/80 border-gray-200/50 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              )}>
                <User className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className={cn(
                "w-56 backdrop-blur-xl",
                "bg-white/95 dark:bg-gray-900/95",
                "border-gray-200 dark:border-gray-700/50"
              )}
            >
              <DropdownMenuLabel className={cn(
                "font-light",
                "text-gray-900 dark:text-white"
              )}>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-light leading-none">
                    {adminUser.name || 'Admin User'}
                  </p>
                  <p className="text-xs leading-none text-gray-500 dark:text-gray-400">
                    {adminUser.email || 'admin@example.com'}
                  </p>
        </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700/50" />
              <DropdownMenuItem
            onClick={handleLogout}
                className={cn(
                  "cursor-pointer text-red-600 dark:text-red-400",
                  "focus:text-red-600 dark:focus:text-red-400",
                  "focus:bg-red-50 dark:focus:bg-red-900/20"
                )}
          >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
