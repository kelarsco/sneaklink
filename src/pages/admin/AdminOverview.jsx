import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Eye, Crown, Link as LinkIcon, TrendingUp, ArrowUpRight, UserPlus, ExternalLink, Briefcase, Lock, Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAdminAnalytics, getRecentUsers } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";

export default function AdminOverview() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState({
    totalVisitors: 0,
    totalSessions: 0,
    activeUsers: 0,
    premiumUsers: 0,
    linksGenerated: 0,
  });
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const dateRangeRef = useRef(null);
  
  // Date range state - default to last 30 days
  const [dateRange, setDateRange] = useState(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    return {
      from: startDate.toISOString().split('T')[0],
      to: endDate.toISOString().split('T')[0],
    };
  });
  const [selectedQuickRange, setSelectedQuickRange] = useState("30 days");

  // Get admin user from localStorage
  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
  const adminName = adminUser.name || 'Admin';

  // Handle click outside date range dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dateRangeRef.current && !dateRangeRef.current.contains(event.target)) {
        setDateRangeOpen(false);
      }
    };
    if (dateRangeOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [dateRangeOpen]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Only fetch data if user has permission
        const canViewDashboard = hasPermission('dashboard.view');
        const canViewUsers = hasPermission('users.view');
        
        if (canViewDashboard) {
          const analyticsData = await getAdminAnalytics(dateRange.from, dateRange.to);
          setAnalytics(analyticsData);
          
          // If permission error, show friendly message
          if (analyticsData.permissionError) {
            toast({
              title: "Limited Access",
              description: "You don't have permission to view dashboard analytics. Some features may be limited.",
              variant: "default", // Normal toast, not destructive
            });
          }
        }
        
        if (canViewUsers) {
          const recentUsersData = await getRecentUsers(5, dateRange.from, dateRange.to);
          setRecentUsers(recentUsersData.users || []);
          
          // If permission error, show friendly message
          if (recentUsersData.permissionError) {
            toast({
              title: "Limited Access",
              description: "You don't have permission to view user data. Some features may be limited.",
              variant: "default", // Normal toast, not destructive
            });
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        
        // Check if it's a network/server error
        const isNetworkError = error.message?.includes('Failed to fetch') || 
                              error.message?.includes('NetworkError') ||
                              error.message?.includes('ERR_CONNECTION_REFUSED') ||
                              error.message?.includes('Network request failed');
        
        // Check if it's a permission error
        const isPermissionError = error.message?.includes('Permission required') || 
                                  error.message?.includes('permission') ||
                                  error.message?.includes('access denied');
        
        if (isNetworkError) {
          // Server might not be running
          toast({
            title: "Connection Error",
            description: "Cannot connect to the server. Please make sure the backend server is running on port 3000.",
            variant: "destructive",
          });
          // Set default empty data so page still renders
          setAnalytics({
            totalUsers: 0,
            activeUsers: 0,
            premiumUsers: 0,
            totalVisitors: 0,
            linksGenerated: 0,
            recentSignups: 0,
          });
          setRecentUsers([]);
        } else if (isPermissionError) {
          // Show permission error in normal modal (not destructive)
          toast({
            title: "Limited Access",
            description: "You don't have permission to view this data. Please contact an administrator if you need access.",
            variant: "default", // Normal toast, not destructive
          });
          // Set default empty data so page still renders
          setAnalytics({
            totalUsers: 0,
            activeUsers: 0,
            premiumUsers: 0,
            totalVisitors: 0,
            linksGenerated: 0,
            recentSignups: 0,
          });
          setRecentUsers([]);
        } else {
          // Only show actual errors if user has permission (otherwise it's expected)
          if (hasPermission('dashboard.view') || hasPermission('users.view')) {
            toast({
              title: "Error",
              description: error.message || "Failed to load dashboard data. Please check the console for details.",
              variant: "destructive",
            });
          }
          // Set default empty data so page still renders
          setAnalytics({
            totalUsers: 0,
            activeUsers: 0,
            premiumUsers: 0,
            totalVisitors: 0,
            linksGenerated: 0,
            recentSignups: 0,
          });
          setRecentUsers([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast, dateRange]);

  // Calculate percentages for progress bars
  const totalUsers = analytics.totalUsers || 1;
  const activePercentage = Math.round((analytics.activeUsers / totalUsers) * 100);
  const premiumPercentage = Math.round((analytics.premiumUsers / totalUsers) * 100);
  const warnedPercentage = Math.round(((analytics.warnedUsers || 0) / totalUsers) * 100);
  const signupsPercentage = Math.round(((analytics.recentSignups || 0) / Math.max(totalUsers, 100)) * 100);

  // Format date range for display
  const formatDateRangeDisplay = () => {
    if (!dateRange.from || !dateRange.to) return "Last 30 days";
    
    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);
    
    const formatDate = (date) => {
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const day = date.getDate();
      const year = date.getFullYear();
      return `${month} ${day}, ${year}`;
    };
    
    return `${formatDate(fromDate)} - ${formatDate(toDate)}`;
  };

  // Handle quick range selection
  const handleQuickRangeSelect = (range) => {
    setSelectedQuickRange(range);
    const endDate = new Date();
    const startDate = new Date();
    
    switch (range) {
      case "7 days":
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "14 days":
        startDate.setDate(endDate.getDate() - 14);
        break;
      case "30 days":
        startDate.setDate(endDate.getDate() - 30);
        break;
      case "3 months":
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case "6 months":
        startDate.setMonth(endDate.getMonth() - 6);
        break;
      case "1 year":
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }
    
    setDateRange({
      from: startDate.toISOString().split('T')[0],
      to: endDate.toISOString().split('T')[0],
    });
    setDateRangeOpen(false);
  };

  // Handle custom date range change (auto-applies when both dates are selected)
  const handleCustomDateChange = (from, to) => {
    if (from && to) {
      setSelectedQuickRange("custom");
      setDateRange({ from, to });
      // Auto-close dropdown when both dates are selected (auto-apply behavior)
      setDateRangeOpen(false);
    }
  };

  return (
    <div className="animate-fade-in min-h-screen bg-gradient-to-br from-[#fafafa] via-[#f5f5f5] to-[#fef9e7] dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="px-[12px] py-6 max-w-7xl mx-auto">
        {/* Welcome Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-light text-gray-900 dark:text-white mb-2">Welcome in, {adminName.split(' ')[0]}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          
          {/* Date Range Filter Button */}
          <div className="relative" ref={dateRangeRef}>
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={() => setDateRangeOpen(!dateRangeOpen)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg border transition-all",
                  "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
                  "hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
                  "text-sm font-light text-gray-700 dark:text-gray-300"
                )}
              >
                <Calendar className="w-4 h-4" />
                <span>Date Range</span>
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform",
                  dateRangeOpen && "transform rotate-180"
                )} />
              </button>
              
              {/* Selected Range Display - Show below button */}
              {dateRange.from && dateRange.to && (
                <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {formatDateRangeDisplay()}
                </div>
              )}
            </div>

            {/* Dropdown Panel */}
            {dateRangeOpen && (
              <div className={cn(
                "absolute top-full right-0 mt-10 w-96 rounded-lg border shadow-lg z-50",
                "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
                "p-4 space-y-4"
              )}>
                {/* Quick Select Options */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Quick Select</p>
                  <div className="grid grid-cols-2 gap-2">
                    {["7 days", "14 days", "30 days", "3 months", "6 months", "1 year"].map((range) => (
                      <button
                        key={range}
                        onClick={() => handleQuickRangeSelect(range)}
                        className={cn(
                          "px-3 py-2 text-sm rounded-md transition-colors text-left",
                          selectedQuickRange === range
                            ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium"
                            : "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                        )}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Date Picker */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">Custom Range</p>
                  <DateRangePicker
                    dateFrom={dateRange.from}
                    dateTo={dateRange.to}
                    onDateChange={handleCustomDateChange}
                    onCancel={() => setDateRangeOpen(false)}
                    onApply={null}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Progress Overview Bar */}
        <div className={cn(
          "rounded-2xl p-6 shadow-sm border mb-6 backdrop-blur-xl transition-all",
          "bg-white/80 dark:bg-gray-900/60 border-gray-100 dark:border-gray-700/50"
        )}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-light text-gray-600 dark:text-gray-400">Active Users</span>
                <span className="text-sm font-light text-gray-900 dark:text-white">{activePercentage}%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-gray-900 dark:bg-gray-300 rounded-full" style={{ width: `${activePercentage}%` }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-light text-gray-600 dark:text-gray-400">Premium</span>
                <span className="text-sm font-light text-gray-900 dark:text-white">{premiumPercentage}%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-400 dark:bg-yellow-500 rounded-full" style={{ width: `${premiumPercentage}%` }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-light text-gray-600 dark:text-gray-400">Warned</span>
                <span className="text-sm font-light text-gray-900 dark:text-white">{warnedPercentage}%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
                <div className="h-full bg-gray-300 dark:bg-gray-600 rounded-full" style={{ width: `${warnedPercentage}%` }} />
                <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(0,0,0,0.1)_4px,rgba(0,0,0,0.1)_8px)] dark:bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(255,255,255,0.1)_4px,rgba(255,255,255,0.1)_8px)]" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-light text-gray-600 dark:text-gray-400">New Signups</span>
                <span className="text-sm font-light text-gray-900 dark:text-white">{signupsPercentage}%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-gray-300 dark:bg-gray-600 rounded-full" style={{ width: `${signupsPercentage}%` }} />
              </div>
            </div>
        </div>
        </div>

      {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Middle Column - Main Content */}
          <div className="lg:col-span-8 space-y-6">
          {/* Recent Users Card */}
            <div className={cn(
              "rounded-2xl p-6 shadow-sm border backdrop-blur-xl transition-all",
              "bg-white/80 dark:bg-gray-900/60 border-gray-100 dark:border-gray-700/50"
            )}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-light text-gray-900 dark:text-white">Recent Users</h3>
                <ExternalLink className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              </div>
            {!hasPermission('users.view') ? (
              <div className="space-y-3 opacity-50">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 py-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 py-3 animate-pulse">
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                    <div className="flex-1">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentUsers.length > 0 ? (
              <div className="space-y-3">
                {recentUsers.map((user) => (
                    <div key={user.id} className={cn(
                      "flex items-center justify-between py-3 border-b last:border-0 rounded-lg px-2 -mx-2 transition-colors",
                      "border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    )}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <span className="text-sm font-light text-white">
                        {user.name.split(" ").map(n => n[0]).join("")}
                      </span>
                    </div>
                    <div>
                          <p className="text-sm font-light text-gray-900 dark:text-white">{user.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{user.signupDate}</span>
                        <ArrowUpRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  </div>
                </div>
                ))}
              </div>
            ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm py-4">No recent users</p>
            )}
              <button 
                onClick={() => navigate("/manager/users")}
                className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-light"
              >
              View all →
            </button>
          </div>

            {/* Activity Progress Card */}
            <div className={cn(
              "rounded-2xl p-6 shadow-sm border backdrop-blur-xl transition-all relative",
              hasPermission('dashboard.view')
                ? "bg-gradient-to-br from-[#fef9e7] to-white dark:from-gray-900/60 dark:to-gray-800/60 border-gray-100 dark:border-gray-700/50"
                : "bg-gray-100/50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-800/50 opacity-60"
            )}>
              {!hasPermission('dashboard.view') && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/80 dark:bg-gray-900/80 rounded-2xl backdrop-blur-sm">
                  <div className="text-center p-4">
                    <Lock className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">You don't have access to this data</p>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between mb-4">
              <div>
                  <h3 className="text-lg font-light text-gray-900 dark:text-white">Activity</h3>
                  <p className="text-2xl font-light text-gray-900 dark:text-white mt-1">{hasPermission('dashboard.view') ? analytics.linksGenerated.toLocaleString() : '—'}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Links Generated</p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              </div>
              {/* Bar Chart */}
              <div className="flex items-end justify-between gap-2 h-32 mt-6">
                {hasPermission('dashboard.view') ? (() => {
                  // Get last 7 days (including today)
                  const today = new Date();
                  const days = [];
                  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
                  
                  for (let i = 6; i >= 0; i--) {
                    const date = new Date(today);
                    date.setDate(today.getDate() - i);
                    days.push({
                      day: date.getDate(),
                      dayLabel: dayLabels[date.getDay()],
                      dayIndex: date.getDay()
                    });
                  }
                  
                  // Distribute linksGenerated across 7 days with realistic distribution
                  // Peak day gets more, others get distributed
                  const totalLinks = analytics.linksGenerated || 0;
                  const peakDayIndex = 4; // Wednesday (middle of week)
                  const peakPercentage = 0.25; // 25% on peak day
                  const peakValue = Math.floor(totalLinks * peakPercentage);
                  const remainingValue = totalLinks - peakValue;
                  const baseValue = Math.floor(remainingValue / 6);
                  const remainder = remainingValue % 6;
                  
                  return days.map((dayData, index) => {
                    let dayValue;
                    if (index === peakDayIndex) {
                      dayValue = peakValue;
                    } else {
                      // Distribute remaining value, with remainder going to last days
                      dayValue = baseValue + (index > peakDayIndex && index >= 7 - remainder ? 1 : 0);
                    }
                    
                    // Calculate height percentage (max 100%)
                    const maxValue = Math.max(totalLinks, 1); // Prevent division by zero
                    const height = Math.min((dayValue / maxValue) * 100, 100);
                    const isPeak = index === peakDayIndex && dayValue > 0;
                    
                  return (
                      <div key={`${dayData.day}-${index}`} className="flex-1 flex flex-col items-center gap-2">
                        <div className="relative w-full flex items-end justify-center h-full">
                        <div 
                            className={cn(
                              "w-full rounded-t transition-all",
                              isPeak ? 'bg-yellow-400 dark:bg-yellow-500' : 'bg-gray-300 dark:bg-gray-600'
                            )}
                            style={{ height: `${Math.max(height, 5)}%` }} // Min 5% for visibility
                        >
                            {isPeak && dayValue > 0 && (
                              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-light text-gray-900 dark:text-white whitespace-nowrap">
                                {dayValue.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400 font-light">{dayData.dayLabel}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-500 opacity-70">{dayData.day}</span>
                    </div>
                  );
                  });
                })() : (
                  // Show placeholder bars when no permission
                  Array.from({ length: 7 }).map((_, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2 opacity-30">
                      <div className="w-full h-8 bg-gray-300 dark:bg-gray-600 rounded-t"></div>
                      <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
              </div>
                  ))
                )}
            </div>
          </div>
        </div>

          {/* Right Column - KPIs & Stats */}
          <div className="lg:col-span-4 space-y-6">
            {/* KPI Cards - Vertical Stack */}
            <div className={cn(
              "space-y-4 rounded-2xl p-6 backdrop-blur-xl transition-all relative",
              hasPermission('dashboard.view')
                ? "bg-gradient-to-br from-[#fef9e7] to-transparent dark:from-gray-900/60 dark:to-transparent"
                : "bg-gray-100/50 dark:bg-gray-800/30 opacity-60"
            )}>
              {!hasPermission('dashboard.view') && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/80 dark:bg-gray-900/80 rounded-2xl backdrop-blur-sm">
                  <div className="text-center p-4">
                    <Lock className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">You don't have access to this data</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-xl shadow-sm flex items-center justify-center backdrop-blur-xl",
                  "bg-white/80 dark:bg-gray-800/60"
                )}>
                  <Eye className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                </div>
                <div>
                  <p className="text-3xl font-light text-gray-900 dark:text-white">{hasPermission('dashboard.view') ? (analytics.totalSessions || analytics.totalVisitors || 0).toLocaleString() : '—'}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Sessions</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-xl shadow-sm flex items-center justify-center backdrop-blur-xl",
                  "bg-white/80 dark:bg-gray-800/60"
                )}>
                  <Users className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                </div>
                <div>
                  <p className="text-3xl font-light text-gray-900 dark:text-white">{hasPermission('dashboard.view') ? analytics.activeUsers.toLocaleString() : '—'}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active Users</p>
              </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-xl shadow-sm flex items-center justify-center backdrop-blur-xl",
                  "bg-white/80 dark:bg-gray-800/60"
                )}>
                  <Briefcase className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              </div>
                <div>
                  <p className="text-3xl font-light text-gray-900 dark:text-white">{hasPermission('dashboard.view') ? analytics.linksGenerated.toLocaleString() : '—'}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active Links</p>
              </div>
            </div>
          </div>

          {/* Quick Stats Card */}
            <div className={cn(
              "rounded-2xl p-6 shadow-sm border backdrop-blur-xl transition-all",
              "bg-white/80 dark:bg-gray-900/60 border-gray-100 dark:border-gray-700/50"
            )}>
              <h3 className="text-lg font-light text-gray-900 dark:text-white mb-4">Quick Stats</h3>
            <div className="space-y-3">
                <button
                  onClick={() => navigate("/manager/users")}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl transition-colors cursor-pointer",
                    "bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                  )}
                >
                  <span className="text-sm text-gray-600 dark:text-gray-400">Warned Users</span>
                  <span className="text-lg font-light text-orange-600 dark:text-orange-400">{analytics.warnedUsers || 0}</span>
                </button>
                <button
                  onClick={() => navigate("/manager/users")}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl transition-colors cursor-pointer",
                    "bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                  )}
                >
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Users</span>
                  <span className="text-lg font-light text-gray-900 dark:text-white">{analytics.totalUsers || 0}</span>
                </button>
                <div className={cn(
                  "flex items-center justify-between p-3 rounded-xl",
                  "bg-gray-50 dark:bg-gray-800/50"
                )}>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Recent Signups</span>
                  <span className="text-lg font-light text-green-600 dark:text-green-400">{analytics.recentSignups || 0}</span>
              </div>
                <button
                  onClick={() => navigate("/manager/subscriptions")}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl transition-colors cursor-pointer",
                    "bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                  )}
                >
                  <span className="text-sm text-gray-600 dark:text-gray-400">Premium Users</span>
                  <span className="text-lg font-light text-gray-900 dark:text-white">{analytics.premiumUsers || 0}</span>
                </button>
            </div>
          </div>

            {/* Premium Users Card */}
            <div className={cn(
              "rounded-2xl p-6 shadow-sm text-white backdrop-blur-xl transition-all relative",
              hasPermission('subscriptions.view')
                ? "bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700"
                : "bg-gray-400/50 dark:bg-gray-700/50 opacity-60"
            )}>
              {!hasPermission('subscriptions.view') && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/80 dark:bg-gray-900/80 rounded-2xl backdrop-blur-sm">
                  <div className="text-center p-4">
                    <Lock className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">You don't have access to this data</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 mb-4">
                <Crown className="w-5 h-5" />
                <h3 className="text-lg font-light">Premium Users</h3>
              </div>
            <div className="space-y-4">
                <p className="text-3xl font-light">{hasPermission('subscriptions.view') ? analytics.premiumUsers.toLocaleString() : '—'}</p>
              <div className="flex items-end justify-between gap-1 h-20 mt-4">
                {(() => {
                  // Get last 7 days of current month
                  const today = new Date();
                  const currentDay = today.getDate();
                  const days = [];
                  for (let i = 6; i >= 0; i--) {
                    const date = new Date(today);
                    date.setDate(currentDay - i);
                    days.push(date.getDate());
                  }
                  
                  // Calculate dots based on premium user count (distribute across 7 days)
                  const totalDots = Math.min(analytics.premiumUsers || 0, 28); // Max 4 dots per day
                  const dotsPerDay = Math.floor(totalDots / 7);
                  const remainder = totalDots % 7;
                  
                  return days.map((day, index) => {
                    // Distribute dots, with remainder going to last days
                    const dots = dotsPerDay + (index >= 7 - remainder ? 1 : 0);
                  return (
                      <div key={`${day}-${index}`} className="flex-1 flex flex-col items-center gap-1">
                      <div className="flex flex-col-reverse gap-0.5">
                          {Array.from({ length: Math.min(dots, 4) }).map((_, i) => (
                          <div key={i} className="w-2 h-2 rounded-full bg-white/80" />
                        ))}
                      </div>
                      <span className="text-xs opacity-80">{day}</span>
                    </div>
                  );
                  });
                })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
