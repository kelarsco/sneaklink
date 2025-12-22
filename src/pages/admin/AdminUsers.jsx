import { useState, useEffect } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, UserPlus, Loader2, Edit, Ban, XCircle, MoreVertical, RotateCcw, CheckSquare, Lock } from "lucide-react";
import { toast } from "sonner";
import { getAdminUsers, createUser, updateUser, suspendUser, deactivateUser, getWarnedUsers, restoreUser, deleteUser } from "@/services/api";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";
import { useToast } from "@/hooks/use-toast";

export default function AdminUsers() {
  const { toast: toastNotification } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  // Dialog states
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Selection state for suspended/deactivated users
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());
  const [isRestoring, setIsRestoring] = useState(false);
  const [isMultiselectMode, setIsMultiselectMode] = useState(false);

  // Form states
  const [newUser, setNewUser] = useState({ name: "", email: "", plan: "free" });
  const [editUserData, setEditUserData] = useState({ name: "", email: "", plan: "free" });

  // Get counts for tabs
  const [tabCounts, setTabCounts] = useState({
    all: 0,
    starter: 0,
    pro: 0,
    enterprise: 0,
    suspended: 0,
    deactivated: 0,
  });

  const fetchUsers = async (retryCount = 0, tabToFetch = null) => {
      try {
        setLoading(true);
      
      // Use provided tab or fall back to activeTab
      const currentTab = tabToFetch !== null ? tabToFetch : activeTab;
      
      // Handle suspended and deactivated tabs differently
      if (currentTab === "suspended" || currentTab === "deactivated") {
        const type = currentTab === "suspended" ? "suspended" : "deactivated";
        const response = await getWarnedUsers(type);
        const usersList = response.users || [];
        setUsers(usersList);
        setPagination({
          page: 1,
          limit: 50,
          total: response.total || usersList.length,
          totalPages: Math.ceil((response.total || usersList.length) / 50),
        });
      } else {
        // Regular active users fetch
        // Map tab DIRECTLY to plan parameter - EXACT match
        let planParam = "all";
        if (currentTab === "starter") {
          planParam = "starter";
        } else if (currentTab === "pro") {
          planParam = "pro";
        } else if (currentTab === "enterprise") {
          planParam = "enterprise";
        } else if (currentTab === "all") {
          planParam = "all";
        }
        
        const response = await getAdminUsers({
          page: pagination.page,
          limit: pagination.limit,
          search: searchQuery,
          plan: planParam,
          status: "active", // Only show active users
        });
        
        const receivedUsers = response.users || [];
        
        // VALIDATION: Filter out any users that don't match the requested plan
        // This ensures only users with the correct plan are displayed
        let filteredUsers = receivedUsers;
        if (planParam !== "all") {
          filteredUsers = receivedUsers.filter(u => {
            const userPlan = u.plan || 'free';
            return userPlan === planParam;
          });
          
          // Log if backend returned wrong data (for debugging)
          const mismatched = receivedUsers.filter(u => {
            const userPlan = u.plan || 'free';
            return userPlan !== planParam;
          });
          if (mismatched.length > 0) {
            console.warn(`[AdminUsers] Backend returned ${mismatched.length} users with wrong plan. Filtered out.`, 
              mismatched.map(u => ({ name: u.name, expected: planParam, actual: u.plan || 'free' })));
          }
        }
        
        setUsers(filteredUsers);
        setPagination(response.pagination || pagination);
      }
      } catch (error) {
      // If rate limited and we haven't retried too many times, retry after delay
      if (error.message?.includes('Too many requests') && retryCount < 2) {
        const delay = (retryCount + 1) * 1000; // 1s, 2s delays
        setTimeout(() => {
          fetchUsers(retryCount + 1);
        }, delay);
        return;
      }
      
        console.error('Error fetching users:', error);
      // Don't show error toast for rate limits - it's handled gracefully
      if (!error.message?.includes('Too many requests')) {
        toast.error('Failed to load users');
      }
      // Set empty state on error
      setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    const fetchCounts = async () => {
      try {
      // Make calls sequentially with delays to avoid rate limiting
      // Add small delay between calls to prevent hitting rate limits
      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      
      // Fetch counts for each plan explicitly
      const allRes = await getAdminUsers({ page: 1, limit: 1, plan: "all", status: "active" }).catch(() => ({ pagination: { total: 0 } }));
      await delay(200); // 200ms delay between calls
      
      const starterRes = await getAdminUsers({ page: 1, limit: 1, plan: "starter", status: "active" }).catch(() => ({ pagination: { total: 0 } }));
      await delay(200);
      
      const proRes = await getAdminUsers({ page: 1, limit: 1, plan: "pro", status: "active" }).catch(() => ({ pagination: { total: 0 } }));
      await delay(200);
      
      const enterpriseRes = await getAdminUsers({ page: 1, limit: 1, plan: "enterprise", status: "active" }).catch(() => ({ pagination: { total: 0 } }));
      await delay(200);
      
      const suspendedRes = await getWarnedUsers("suspended").catch(() => ({ total: 0 }));
      await delay(200);
      
      const deactivatedRes = await getWarnedUsers("deactivated").catch(() => ({ total: 0 }));
        
        setTabCounts({
          all: allRes.pagination?.total || 0,
          starter: starterRes.pagination?.total || 0,
          pro: proRes.pagination?.total || 0,
          enterprise: enterpriseRes.pagination?.total || 0,
        suspended: suspendedRes.total || 0,
        deactivated: deactivatedRes.total || 0,
        });
      } catch (error) {
      // Silently fail - don't show errors for count fetching
      // This prevents interrupting the UI if rate limited
      console.warn('Error fetching tab counts (non-critical):', error.message);
      }
    };

  useEffect(() => {
    // Debounce search for regular tabs
    if (activeTab !== "suspended" && activeTab !== "deactivated") {
      const timeoutId = setTimeout(() => {
        fetchUsers(0, activeTab); // Pass activeTab to ensure correct tab is used
      }, searchQuery ? 500 : 0);
      return () => clearTimeout(timeoutId);
    } else {
      // For suspended/deactivated tabs, add small delay to avoid rate limiting
      const timeoutId = setTimeout(() => {
        fetchUsers(0, activeTab); // Pass activeTab to ensure correct tab is used
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [activeTab, searchQuery, pagination.page]);

  useEffect(() => {
    // Fetch counts on mount, but with a small delay to avoid rate limiting
    // Also only fetch if not already fetched recently
    const timeoutId = setTimeout(() => {
    fetchCounts();
    }, 500); // Small delay to avoid immediate rate limiting
    
    return () => clearTimeout(timeoutId);
  }, []);

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setActionLoading(true);
      await createUser(newUser);
      toast.success("User created successfully");
      setIsAddUserOpen(false);
      setNewUser({ name: "", email: "", plan: "free" });
      fetchUsers();
      // Refresh counts with delay to avoid rate limiting
      setTimeout(() => {
        fetchCounts();
      }, 300);
    } catch (error) {
      toast.error(error.message || "Failed to create user");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditUser = async () => {
    if (!editUserData.name || !editUserData.email) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setActionLoading(true);
      const oldPlan = selectedUser?.plan;
      await updateUser(selectedUser.id, editUserData);
      toast.success("User updated successfully");
      setIsEditUserOpen(false);
      setSelectedUser(null);
      
      // Small delay to ensure backend has processed the update
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // If plan changed and we're viewing the old plan's tab, switch to the new plan's tab
      if (oldPlan !== editUserData.plan) {
        if (activeTab === oldPlan) {
          // We're viewing the old plan tab, switch to the new plan tab
          // The useEffect watching activeTab will automatically fetch users for the new tab
          setActiveTab(editUserData.plan);
        } else {
          // We're on "all" tab or a different plan tab, refresh the current view
          // This will remove the user from the old plan tab if we're viewing it
          await fetchUsers();
        }
      } else {
        // Plan didn't change, just refresh
        await fetchUsers();
      }
      
      // Refresh counts with delay to avoid rate limiting
      setTimeout(() => {
        fetchCounts();
      }, 300);
    } catch (error) {
      toast.error(error.message || "Failed to update user");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async () => {
    try {
      setActionLoading(true);
      const result = await suspendUser(selectedUser.id);
      toast.success(`User suspended successfully. ${result.sessionsTerminated || 0} session(s) terminated.`);
      setIsSuspendDialogOpen(false);
      setSelectedUser(null);
      // Refresh users list - suspended user will no longer appear in active users
      await fetchUsers();
      // Refresh counts with delay to avoid rate limiting
      setTimeout(() => {
        fetchCounts();
      }, 300);
    } catch (error) {
      toast.error(error.message || "Failed to suspend user");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivate = async () => {
    try {
      setActionLoading(true);
      const result = await deactivateUser(selectedUser.id);
      toast.success(`User deactivated successfully. ${result.sessionsTerminated || 0} session(s) terminated.`);
      setIsDeactivateDialogOpen(false);
      setSelectedUser(null);
      // Refresh users list - deactivated user will no longer appear in active users
      await fetchUsers();
      // Refresh counts with delay to avoid rate limiting
      setTimeout(() => {
        fetchCounts();
      }, 300);
      // If we're on the deactivated tab, refresh to show the newly deactivated user
      if (activeTab === "deactivated") {
        await fetchUsers();
      }
    } catch (error) {
      toast.error(error.message || "Failed to deactivate user");
    } finally {
      setActionLoading(false);
    }
  };

  const openEditDialog = (user, e) => {
    e.stopPropagation();
    setSelectedUser(user);
    setEditUserData({
      name: user.name,
      email: user.email,
      plan: user.plan,
    });
    setIsEditUserOpen(true);
  };

  const openSuspendDialog = (user, e) => {
    e.stopPropagation();
    setSelectedUser(user);
    setIsSuspendDialogOpen(true);
  };

  const openDeactivateDialog = (user, e) => {
    e.stopPropagation();
    setSelectedUser(user);
    setIsDeactivateDialogOpen(true);
  };

  const handleSelectUser = (userId, checked) => {
    setSelectedUserIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(userId);
      } else {
        newSet.delete(userId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedUserIds(new Set(users.map(u => u.id)));
    } else {
      setSelectedUserIds(new Set());
    }
  };

  const handleRestoreUser = async (userId) => {
    try {
      setActionLoading(true);
      await restoreUser(userId);
      toast.success("User restored successfully");
      // Refresh users list
      await fetchUsers();
      // Refresh counts with delay to avoid rate limiting
      setTimeout(() => {
        fetchCounts();
      }, 300);
      // If we're on the suspended/deactivated tab, refresh to show updated list
      if (activeTab === "suspended" || activeTab === "deactivated") {
        await fetchUsers();
      }
    } catch (error) {
      toast.error(error.message || "Failed to restore user");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedUserIds.size === 0) {
      toast.error("Please select at least one user to delete");
      return;
    }

    try {
      setActionLoading(true);
      const userIds = Array.from(selectedUserIds);
      
      // Delete users one by one
      const results = await Promise.allSettled(
        userIds.map(userId => deleteUser(userId))
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (successful > 0) {
        toast.success(`Successfully deleted ${successful} user(s)`);
      }
      if (failed > 0) {
        toast.error(`Failed to delete ${failed} user(s)`);
      }

      // Clear selection
      setSelectedUserIds(new Set());
      
      // Refresh users list
      await fetchUsers();
      // Refresh counts with delay to avoid rate limiting
      setTimeout(() => {
        fetchCounts();
      }, 300);
    } catch (error) {
      toast.error(error.message || "Failed to delete users");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestoreSelected = async () => {
    if (selectedUserIds.size === 0) {
      toast.error("Please select at least one user to restore");
      return;
    }

    try {
      setIsRestoring(true);
      const userIds = Array.from(selectedUserIds);
      
      // Restore users one by one
      const results = await Promise.allSettled(
        userIds.map(userId => restoreUser(userId))
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (successful > 0) {
        toast.success(`Successfully restored ${successful} user(s)`);
      }
      if (failed > 0) {
        toast.error(`Failed to restore ${failed} user(s)`);
      }

      // Clear selection
      setSelectedUserIds(new Set());
      
      // Refresh users list
      await fetchUsers();
      // Refresh counts with delay to avoid rate limiting
      setTimeout(() => {
        fetchCounts();
      }, 300);
    } catch (error) {
      toast.error(error.message || "Failed to restore users");
    } finally {
      setIsRestoring(false);
    }
  };

  const statusColors = {
    active: "bg-green-100 text-green-700 border border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700/50",
    suspended: "bg-yellow-100 text-yellow-700 border border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700/50",
    deactivated: "bg-red-100 text-red-700 border border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/50",
  };

  const planColors = {
    free: "bg-gray-100 text-gray-700 border border-gray-300 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-700/50",
    starter: "bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/50",
    pro: "bg-purple-100 text-purple-700 border border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700/50",
    enterprise: "bg-green-100 text-green-700 border border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700/50",
  };

  // Define columns with access to activeTab
  const isInSuspendedOrDeactivatedTab = activeTab === "suspended" || activeTab === "deactivated";

  const columns = [
    // Add checkbox column for suspended/deactivated tabs only when multiselect mode is enabled
    ...(isInSuspendedOrDeactivatedTab && isMultiselectMode ? [{
      header: (
        <Checkbox
          checked={users.length > 0 && selectedUserIds.size === users.length}
          onCheckedChange={handleSelectAll}
          className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
        />
      ),
      accessor: (user) => (
        <Checkbox
          checked={selectedUserIds.has(user.id)}
          onCheckedChange={(checked) => handleSelectUser(user.id, checked)}
          onClick={(e) => e.stopPropagation()}
          className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
        />
      ),
    }] : []),
    {
      header: "User",
      accessor: (user) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0">
            <span className="text-sm font-light text-white">
              {user.name.split(" ").map((n) => n[0]).join("")}
            </span>
          </div>
          <div>
            <p className="font-light text-gray-900 dark:text-white">{user.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Plan",
      accessor: (user) => (
        <Badge className={planColors[user.plan] || planColors.free}>
          {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}
        </Badge>
      ),
    },
    {
      header: "Status",
      accessor: (user) => {
        // Use accountStatus if available, otherwise fall back to status
        // For suspended/deactivated tabs, use accountStatus from the user object
        const userStatus = user.accountStatus || user.status || (activeTab === "suspended" ? "suspended" : activeTab === "deactivated" ? "deactivated" : "active");
        return (
          <Badge className={statusColors[userStatus] || statusColors.active}>
            {userStatus.charAt(0).toUpperCase() + userStatus.slice(1)}
        </Badge>
        );
      },
    },
    {
      header: "Joined",
      accessor: "signupDate",
    },
    {
      header: "Actions",
      accessor: (user) => {
        // Show restore button for suspended/deactivated users
        if (isInSuspendedOrDeactivatedTab) {
          if (!hasPermission('users.restore')) {
            return (
              <span className="text-xs text-gray-400 dark:text-gray-500">No access</span>
            );
          }
          return (
            <button
              className="px-3 py-1.5 text-xs font-light rounded-lg bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700/50 dark:hover:bg-green-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={(e) => {
                e.stopPropagation();
                handleRestoreUser(user.id);
              }}
              disabled={actionLoading}
            >
              <RotateCcw className="w-3 h-3 inline mr-1" />
              Restore
            </button>
          );
        }
        
        // Show regular actions for active users (only if user has permissions)
        const actions = [];
        
        if (hasPermission('users.edit')) {
          actions.push(
          <button 
              key="edit"
              className="px-3 py-1.5 text-xs font-light rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/50 dark:hover:bg-blue-900/50 transition-colors" 
              onClick={(e) => openEditDialog(user, e)}
          >
              <Edit className="w-3 h-3 inline mr-1" />
            Edit
          </button>
          );
        }
        
        if (hasPermission('users.suspend')) {
          actions.push(
          <button 
              key="suspend"
              className="px-3 py-1.5 text-xs font-light rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700/50 dark:hover:bg-orange-900/50 transition-colors" 
              onClick={(e) => openSuspendDialog(user, e)}
          >
              <Ban className="w-3 h-3 inline mr-1" />
            Suspend
          </button>
          );
        }
        
        if (hasPermission('users.deactivate')) {
          actions.push(
          <button 
              key="deactivate"
              className="px-3 py-1.5 text-xs font-light rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/50 dark:hover:bg-red-900/50 transition-colors" 
              onClick={(e) => openDeactivateDialog(user, e)}
          >
              <XCircle className="w-3 h-3 inline mr-1" />
            Deactivate
          </button>
          );
        }
        
        if (actions.length === 0) {
          return (
            <span className="text-xs text-gray-400 dark:text-gray-500">No access</span>
          );
        }
        
        return <div className="flex gap-2">{actions}</div>;
      },
    },
  ];

  const tabItems = [
    { value: "all", label: "All Users", count: tabCounts.all },
    { value: "starter", label: "Starter", count: tabCounts.starter },
    { value: "pro", label: "Pro", count: tabCounts.pro },
    { value: "enterprise", label: "Enterprise", count: tabCounts.enterprise },
  ];

  const handleTabSwitch = async (tabValue) => {
    // Clear users immediately to prevent showing wrong data
    setUsers([]);
    setLoading(true);
    
    // Update state
    setActiveTab(tabValue);
    setPagination({ ...pagination, page: 1 }); // Reset to first page when switching tabs
    // Clear selection and exit multiselect mode when switching tabs
    setSelectedUserIds(new Set());
    setIsMultiselectMode(false);
    
    // Fetch users for the new tab - PASS tabValue DIRECTLY to avoid state timing issues
    // Add a small delay to avoid immediate rate limiting
    setTimeout(() => {
      fetchUsers(0, tabValue); // Pass tabValue directly
    }, 200);
  };

  // Check if user has permission to view users
  if (!hasPermission('users.view')) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="User Management" />
        <div className={cn(
          "rounded-xl border shadow-sm overflow-hidden backdrop-blur-xl transition-all",
          "bg-white/80 dark:bg-gray-900/60 border-gray-200 dark:border-gray-700/50",
          "p-12 flex items-center justify-center"
        )}>
          <div className="text-center">
            <Lock className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-light text-gray-900 dark:text-white mb-2">
              Access Restricted
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              You don't have permission to view user data. Please contact an administrator for access.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="User Management"
        actions={
          hasPermission('users.create') ? (
            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-gray-900 text-white hover:bg-gray-800 border-gray-900 dark:bg-gray-800 dark:hover:bg-gray-700">
            <UserPlus className="w-4 h-4" />
            Add User
          </Button>
              </DialogTrigger>
              <DialogContent className={cn(
                "bg-white/95 dark:bg-gray-900/95 border-gray-200 dark:border-gray-700/50 sm:max-w-md backdrop-blur-xl"
              )}>
                <DialogHeader>
                  <DialogTitle className="text-gray-900 dark:text-white">Add New User</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700 dark:text-gray-300">Name</Label>
                    <Input
                      placeholder="Full name"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      className={cn(
                        "backdrop-blur-xl",
                        "bg-white/80 dark:bg-gray-800/50",
                        "border-gray-200 dark:border-gray-700/50",
                        "focus:border-blue-500 dark:focus:border-blue-400"
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 dark:text-gray-300">Email</Label>
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      className={cn(
                        "backdrop-blur-xl",
                        "bg-white/80 dark:bg-gray-800/50",
                        "border-gray-200 dark:border-gray-700/50",
                        "focus:border-blue-500 dark:focus:border-blue-400"
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 dark:text-gray-300">Plan</Label>
                    <Select value={newUser.plan} onValueChange={(v) => setNewUser({ ...newUser, plan: v })}>
                      <SelectTrigger className={cn(
                        "backdrop-blur-xl",
                        "bg-white/80 dark:bg-gray-800/50",
                        "border-gray-200 dark:border-gray-700/50"
                      )}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white/95 dark:bg-gray-900/95 border-gray-200 dark:border-gray-700/50 backdrop-blur-xl">
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="starter">Starter</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleAddUser}
                    disabled={actionLoading}
                    className="w-full bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Add User
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : null
        }
      />

      {/* Search */}
      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={cn(
            "pl-10 backdrop-blur-xl transition-all",
            "bg-white/80 dark:bg-gray-900/60",
            "border-gray-200 dark:border-gray-700/50",
            "focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500"
          )}
        />
      </div>

      <Tabs value={activeTab} onValueChange={handleTabSwitch} className="w-full">
        <div className="flex items-center gap-2 mb-6">
          <TabsList className={cn(
            "h-auto p-1 flex-wrap rounded-lg backdrop-blur-xl transition-all flex-1",
            "bg-white/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/50"
          )}>
          {tabItems.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
                className={cn(
                  "px-4 py-2 rounded-md transition-all",
                  "data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600",
                  "dark:data-[state=active]:bg-blue-900/50 dark:data-[state=active]:text-blue-300"
                )}
            >
              {tab.label}
                <span className={cn(
                  "ml-2 text-xs px-2 py-0.5 rounded-full",
                  "bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400"
                )}>
                {tab.count}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

          {/* 3-dot menu for suspended/deactivated */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  "h-auto px-3 py-2 rounded-lg backdrop-blur-xl transition-all",
                  "bg-white/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/50",
                  "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                )}
              >
                <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className={cn(
                "w-48 backdrop-blur-xl",
                "bg-white/95 dark:bg-gray-900/95",
                "border-gray-200 dark:border-gray-700/50"
              )}
            >
              <DropdownMenuItem
                onClick={() => handleTabSwitch("suspended")}
                className={cn(
                  "cursor-pointer",
                  "text-gray-900 dark:text-white",
                  "focus:bg-gray-100 dark:focus:bg-gray-800/50"
                )}
              >
                <Ban className="w-4 h-4 mr-2 text-orange-600 dark:text-orange-400" />
                Suspended
                <span className={cn(
                  "ml-auto text-xs px-2 py-0.5 rounded-full",
                  "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                )}>
                  {tabCounts.suspended}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleTabSwitch("deactivated")}
                className={cn(
                  "cursor-pointer",
                  "text-gray-900 dark:text-white",
                  "focus:bg-gray-100 dark:focus:bg-gray-800/50"
                )}
              >
                <XCircle className="w-4 h-4 mr-2 text-red-600 dark:text-red-400" />
                Deactivated
                <span className={cn(
                  "ml-auto text-xs px-2 py-0.5 rounded-full",
                  "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                )}>
                  {tabCounts.deactivated}
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Regular tabs content */}
        {tabItems.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-0">
          {loading ? (
              <div className={cn(
                "rounded-xl p-12 border shadow-sm flex items-center justify-center backdrop-blur-xl transition-all",
                "bg-white/80 dark:bg-gray-900/60 border-gray-200 dark:border-gray-700/50"
              )}>
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
            </div>
          ) : (
            <>
              <DataTable
                columns={columns}
                data={users}
                  onRowClick={() => {}}
              />
              {pagination.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                      disabled={pagination.page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                      disabled={pagination.page >= pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
            )}
          </TabsContent>
        ))}

        {/* Suspended tab content */}
        <TabsContent value="suspended" className="mt-0">
          {loading ? (
            <div className={cn(
              "rounded-xl p-12 border shadow-sm flex items-center justify-center backdrop-blur-xl transition-all",
              "bg-white/80 dark:bg-gray-900/60 border-gray-200 dark:border-gray-700/50"
            )}>
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
            </div>
          ) : users.length > 0 ? (
            <>
              <div className={cn(
                "mb-4 flex items-center justify-between gap-4"
              )}>
                {!isMultiselectMode ? (
                  <Button
                    onClick={() => setIsMultiselectMode(true)}
                    variant="outline"
                    className={cn(
                      "backdrop-blur-xl",
                      "bg-white/80 dark:bg-gray-900/60",
                      "border-gray-200 dark:border-gray-700/50"
                    )}
                  >
                    <CheckSquare className="w-4 h-4 mr-2" />
                    Multiselect
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => {
                        setIsMultiselectMode(false);
                        setSelectedUserIds(new Set());
                      }}
                      variant="outline"
                      className={cn(
                        "backdrop-blur-xl",
                        "bg-white/80 dark:bg-gray-900/60",
                        "border-gray-200 dark:border-gray-700/50"
                      )}
                    >
                      Cancel
                    </Button>
                    {selectedUserIds.size > 0 && (
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedUserIds.size} selected
                      </span>
                    )}
                  </div>
                )}
                {isMultiselectMode && selectedUserIds.size > 0 && (
                  <>
                    <Button
                      onClick={handleRestoreSelected}
                      disabled={isRestoring || selectedUserIds.size === 0 || actionLoading}
                      className={cn(
                        "bg-green-600 text-white hover:bg-green-700",
                        "dark:bg-green-700 dark:hover:bg-green-800"
                      )}
                    >
                      {isRestoring ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Restoring...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Restore Selected ({selectedUserIds.size})
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleDeleteSelected}
                      disabled={actionLoading || selectedUserIds.size === 0 || isRestoring}
                      className={cn(
                        "bg-red-600 text-white hover:bg-red-700",
                        "dark:bg-red-700 dark:hover:bg-red-800"
                      )}
                    >
                      {actionLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 mr-2" />
                          Delete Selected ({selectedUserIds.size})
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
              <DataTable
                columns={columns}
                data={users}
                onRowClick={() => {}}
              />
              <div className="mt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {users.length} suspended {users.length === 1 ? 'user' : 'users'}
                </p>
              </div>
            </>
          ) : (
            <div className={cn(
              "rounded-xl p-12 border shadow-sm flex flex-col items-center justify-center backdrop-blur-xl transition-all",
              "bg-white/80 dark:bg-gray-900/60 border-gray-200 dark:border-gray-700/50"
            )}>
              <Ban className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-lg font-light">No suspended users found</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">Suspended users will appear here</p>
            </div>
          )}
        </TabsContent>

        {/* Deactivated tab content */}
        <TabsContent value="deactivated" className="mt-0">
          {loading ? (
            <div className={cn(
              "rounded-xl p-12 border shadow-sm flex items-center justify-center backdrop-blur-xl transition-all",
              "bg-white/80 dark:bg-gray-900/60 border-gray-200 dark:border-gray-700/50"
            )}>
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
            </div>
          ) : users.length > 0 ? (
            <>
              <div className={cn(
                "mb-4 flex items-center justify-between gap-4"
              )}>
                {!isMultiselectMode ? (
                  <Button
                    onClick={() => setIsMultiselectMode(true)}
                    variant="outline"
                    className={cn(
                      "backdrop-blur-xl",
                      "bg-white/80 dark:bg-gray-900/60",
                      "border-gray-200 dark:border-gray-700/50"
                    )}
                  >
                    <CheckSquare className="w-4 h-4 mr-2" />
                    Multiselect
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => {
                        setIsMultiselectMode(false);
                        setSelectedUserIds(new Set());
                      }}
                      variant="outline"
                      className={cn(
                        "backdrop-blur-xl",
                        "bg-white/80 dark:bg-gray-900/60",
                        "border-gray-200 dark:border-gray-700/50"
                      )}
                    >
                      Cancel
                    </Button>
                    {selectedUserIds.size > 0 && (
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedUserIds.size} selected
                      </span>
                    )}
                  </div>
                )}
                {isMultiselectMode && selectedUserIds.size > 0 && (
                  <>
                    <Button
                      onClick={handleRestoreSelected}
                      disabled={isRestoring || selectedUserIds.size === 0 || actionLoading}
                      className={cn(
                        "bg-green-600 text-white hover:bg-green-700",
                        "dark:bg-green-700 dark:hover:bg-green-800"
                      )}
                    >
                      {isRestoring ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Restoring...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Restore Selected ({selectedUserIds.size})
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleDeleteSelected}
                      disabled={actionLoading || selectedUserIds.size === 0 || isRestoring}
                      className={cn(
                        "bg-red-600 text-white hover:bg-red-700",
                        "dark:bg-red-700 dark:hover:bg-red-800"
                      )}
                    >
                      {actionLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 mr-2" />
                          Delete Selected ({selectedUserIds.size})
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
              <DataTable
                columns={columns}
                data={users}
                onRowClick={() => {}}
              />
              <div className="mt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {users.length} deactivated {users.length === 1 ? 'user' : 'users'}
                </p>
              </div>
            </>
          ) : (
            <div className={cn(
              "rounded-xl p-12 border shadow-sm flex flex-col items-center justify-center backdrop-blur-xl transition-all",
              "bg-white/80 dark:bg-gray-900/60 border-gray-200 dark:border-gray-700/50"
            )}>
              <XCircle className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-lg font-light">No deactivated users found</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">Deactivated users will appear here</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className={cn(
          "bg-white/95 dark:bg-gray-900/95 border-gray-200 dark:border-gray-700/50 sm:max-w-md backdrop-blur-xl"
        )}>
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">Name</Label>
              <Input
                placeholder="Full name"
                value={editUserData.name}
                onChange={(e) => setEditUserData({ ...editUserData, name: e.target.value })}
                className={cn(
                  "backdrop-blur-xl",
                  "bg-white/80 dark:bg-gray-800/50",
                  "border-gray-200 dark:border-gray-700/50",
                  "focus:border-blue-500 dark:focus:border-blue-400"
                )}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">Email</Label>
              <Input
                type="email"
                placeholder="email@example.com"
                value={editUserData.email}
                onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
                className={cn(
                  "backdrop-blur-xl",
                  "bg-white/80 dark:bg-gray-800/50",
                  "border-gray-200 dark:border-gray-700/50",
                  "focus:border-blue-500 dark:focus:border-blue-400"
                )}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">Plan</Label>
              <Select value={editUserData.plan} onValueChange={(v) => setEditUserData({ ...editUserData, plan: v })}>
                <SelectTrigger className={cn(
                  "backdrop-blur-xl",
                  "bg-white/80 dark:bg-gray-800/50",
                  "border-gray-200 dark:border-gray-700/50"
                )}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white/95 dark:bg-gray-900/95 border-gray-200 dark:border-gray-700/50 backdrop-blur-xl">
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleEditUser}
              disabled={actionLoading}
              className="w-full bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Update User
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Suspend Confirmation Dialog */}
      <AlertDialog open={isSuspendDialogOpen} onOpenChange={setIsSuspendDialogOpen}>
        <AlertDialogContent className="bg-white/95 dark:bg-gray-900/95 border-gray-200 dark:border-gray-700/50 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-white flex items-center gap-2">
              <Ban className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              Suspend User?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              Are you sure you want to suspend <strong>{selectedUser?.name}</strong>? 
              This will log them out immediately and prevent them from signing in. 
              They will see an error message telling them to contact support. 
              The user will be moved to the Warned Users page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setIsSuspendDialogOpen(false)}
              className="bg-white/80 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-gray-200 dark:border-gray-700/50 backdrop-blur-xl"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSuspend}
              disabled={actionLoading}
              className="bg-orange-600 text-white hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Suspend User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={isDeactivateDialogOpen} onOpenChange={setIsDeactivateDialogOpen}>
        <AlertDialogContent className="bg-white/95 dark:bg-gray-900/95 border-gray-200 dark:border-gray-700/50 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-white flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              Deactivate User?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              Are you sure you want to deactivate <strong>{selectedUser?.name}</strong>? 
              This action cannot be easily undone. The user will be logged out and moved to the Warned Users page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setIsDeactivateDialogOpen(false)}
              className="bg-white/80 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-gray-200 dark:border-gray-700/50 backdrop-blur-xl"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              disabled={actionLoading}
              className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Deactivate User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
