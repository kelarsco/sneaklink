import { useState, useEffect } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { UserPlus, Shield, ShieldAlert, Headphones, Eye, Loader2, Trash2, Lock, Plus, Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { addStaff, getStaffMembers, deleteStaff, updateStaffPermissions } from "@/services/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { hasPermission } from "@/lib/permissions";
import { useToast } from "@/hooks/use-toast";

const permissionOptions = [
  { id: "all", label: "Full Access (All Permissions)" },
  { id: "dashboard.view", label: "View Dashboard & Analytics" },
  { id: "users.view", label: "View Users" },
  { id: "users.create", label: "Create Users" },
  { id: "users.edit", label: "Edit Users (Name, Email, Plan)" },
  { id: "users.suspend", label: "Suspend Users" },
  { id: "users.deactivate", label: "Deactivate Users" },
  { id: "users.restore", label: "Restore Suspended/Deactivated Users" },
  { id: "tickets.view", label: "View Support Tickets" },
  { id: "tickets.reply", label: "Reply to Support Tickets" },
  { id: "tickets.delete", label: "Delete Support Tickets" },
  { id: "tickets.update", label: "Update Ticket Status" },
  { id: "subscriptions.view", label: "View Subscriptions & Disputes" },
  { id: "subscriptions.manage", label: "Manage Subscriptions" },
  { id: "staff.view", label: "View Staff Members" },
  { id: "staff.manage", label: "Manage Staff (Add/Delete)" },
];

export default function AdminStaff() {
  const { toast: toastNotification } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [staffMembers, setStaffMembers] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState(null);
  const [newStaff, setNewStaff] = useState({
    name: "",
    email: "",
    role: "support",
    permissions: [],
  });
  const [selectedStaffPermissions, setSelectedStaffPermissions] = useState(null);
  const [isAddPermissionOpen, setIsAddPermissionOpen] = useState(false);
  const [selectedPermissionsToAdd, setSelectedPermissionsToAdd] = useState([]);
  const [addingPermissions, setAddingPermissions] = useState(false);

  // Show toast notification if staff member doesn't have access
  useEffect(() => {
    if (!hasPermission('staff.view')) {
      toastNotification({
        title: "Limited Access",
        description: "You don't have permission to view staff members. Please contact an administrator for access.",
        variant: "default",
      });
    }
  }, [toastNotification]);

  // Fetch staff members on mount
  useEffect(() => {
    fetchStaffMembers();
  }, []);

  const fetchStaffMembers = async () => {
    try {
      setLoading(true);
      const response = await getStaffMembers();
      if (response.success && response.staff) {
        setStaffMembers(response.staff);
      }
    } catch (error) {
      console.error('Error fetching staff members:', error);
      toast.error(error.message || 'Failed to fetch staff members');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async () => {
    if (!newStaff.name || !newStaff.email) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      const response = await addStaff(newStaff);
      if (response.success) {
        toast.success(`Staff member ${newStaff.name} added successfully. Invitation email sent!`);
    setIsAddOpen(false);
    setNewStaff({ name: "", email: "", role: "support", permissions: [] });
        fetchStaffMembers(); // Refresh the list
      }
    } catch (error) {
      console.error('Error adding staff member:', error);
      toast.error(error.message || 'Failed to add staff member');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStaff = async () => {
    if (!staffToDelete) return;

    try {
      setLoading(true);
      await deleteStaff(staffToDelete.id);
      toast.success('Staff member removed successfully');
      setDeleteDialogOpen(false);
      setStaffToDelete(null);
      fetchStaffMembers(); // Refresh the list
    } catch (error) {
      console.error('Error deleting staff member:', error);
      toast.error(error.message || 'Failed to delete staff member');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPermissions = async () => {
    if (!selectedStaffPermissions || selectedPermissionsToAdd.length === 0) return;

    try {
      setAddingPermissions(true);
      
      // Combine existing permissions with new ones (avoid duplicates)
      const existingPermissions = selectedStaffPermissions.permissions || [];
      const newPermissions = [...new Set([...existingPermissions, ...selectedPermissionsToAdd])];
      
      await updateStaffPermissions(selectedStaffPermissions.id, newPermissions);
      toast.success('Permissions added successfully');
      setIsAddPermissionOpen(false);
      setSelectedPermissionsToAdd([]);
      fetchStaffMembers(); // Refresh the list
    } catch (error) {
      console.error('Error adding permissions:', error);
      toast.error(error.message || 'Failed to add permissions');
    } finally {
      setAddingPermissions(false);
    }
  };

  const handleRemovePermission = async (permissionId) => {
    if (!selectedStaffPermissions) return;

    try {
      setAddingPermissions(true);
      
      // Remove the specific permission
      const existingPermissions = selectedStaffPermissions.permissions || [];
      const newPermissions = existingPermissions.filter(p => p !== permissionId);
      
      await updateStaffPermissions(selectedStaffPermissions.id, newPermissions);
      toast.success('Permission removed successfully');
      fetchStaffMembers(); // Refresh the list
    } catch (error) {
      console.error('Error removing permission:', error);
      toast.error(error.message || 'Failed to remove permission');
    } finally {
      setAddingPermissions(false);
    }
  };

  const togglePermission = (permId) => {
    setNewStaff((prev) => {
      if (permId === "all") {
        // If "all" is selected, clear all other permissions
        // If "all" is already selected, clear it
        return {
      ...prev,
          permissions: prev.permissions.includes("all") ? [] : ["all"],
        };
      } else {
        // If selecting a specific permission, remove "all" if present
        const newPermissions = prev.permissions.includes(permId)
        ? prev.permissions.filter((p) => p !== permId)
          : [...prev.permissions.filter((p) => p !== "all"), permId];
        return {
          ...prev,
          permissions: newPermissions,
        };
      }
    });
  };

  const roleConfig = {
    admin: { color: "bg-red-50 text-red-700 border border-red-200", icon: ShieldAlert },
    moderator: { color: "bg-orange-50 text-orange-700 border border-orange-200", icon: Shield },
    support: { color: "bg-blue-50 text-blue-700 border border-blue-200", icon: Headphones },
  };

  const columns = [
    {
      header: "Staff Member",
      accessor: (staff) => {
        const RoleIcon = roleConfig[staff.role].icon;
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200">
              <RoleIcon className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="font-light text-gray-900 dark:text-white">{staff.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{staff.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      header: "Role",
      accessor: (staff) => (
        <Badge className={roleConfig[staff.role].color}>
          {staff.role.charAt(0).toUpperCase() + staff.role.slice(1)}
        </Badge>
      ),
    },
    {
      header: "Permissions",
      accessor: (staff) => (
        <Popover>
          <PopoverTrigger asChild>
            <button
              onClick={() => setSelectedStaffPermissions(staff)}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-md text-sm font-light transition-all",
                "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white",
                "hover:bg-gray-100 dark:hover:bg-gray-800/50"
              )}
            >
              <Eye className="w-4 h-4" />
              <span>View</span>
            </button>
          </PopoverTrigger>
          <PopoverContent 
            align="start"
            className={cn(
              "w-64 backdrop-blur-xl",
              "bg-white/95 dark:bg-gray-900/95",
              "border-gray-200 dark:border-gray-700/50"
            )}
          >
            <div className="space-y-2">
              <h4 className="font-light text-sm text-gray-900 dark:text-white mb-3">
                Permissions
              </h4>
              {selectedStaffPermissions && selectedStaffPermissions.permissions.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {selectedStaffPermissions.permissions.map((perm) => {
                    const permOption = permissionOptions.find(p => p.id === perm);
                    return (
                      <div
                        key={perm}
                        className={cn(
                          "group relative px-3 py-2 rounded-md text-sm",
                          "bg-gray-50 dark:bg-gray-800/50",
                          "text-gray-700 dark:text-gray-300",
                          "border border-gray-200 dark:border-gray-700/50",
                          "hover:border-red-300 dark:hover:border-red-700/50",
                          "transition-colors"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex-1">{permOption ? permOption.label : perm}</span>
                          {hasPermission('staff.manage') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemovePermission(perm);
                              }}
                              className={cn(
                                "opacity-0 group-hover:opacity-100 transition-opacity",
                                "p-1 rounded-full",
                                "hover:bg-red-100 dark:hover:bg-red-900/30",
                                "text-red-600 dark:text-red-400",
                                "flex-shrink-0"
                              )}
                              disabled={addingPermissions}
                              title="Remove permission"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No permissions assigned
                </p>
              )}
              {hasPermission('staff.manage') && (
                <button
                  onClick={() => {
                    setSelectedPermissionsToAdd([]);
                    setIsAddPermissionOpen(true);
                  }}
                  className={cn(
                    "mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-light transition-all",
                    "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
                    "hover:bg-blue-100 dark:hover:bg-blue-900/50",
                    "border border-blue-200 dark:border-blue-700/50"
                  )}
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      ),
    },
    {
      header: "Added",
      accessor: (staff) => {
        if (!staff.addedAt) return "N/A";
        const date = new Date(staff.addedAt);
        const year = date.getFullYear();
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${year}-${day}-${month}`;
      },
    },
    {
      header: "Status",
      accessor: (staff) => (
        <Badge className={staff.status === "active" ? "bg-green-50 text-green-700 border border-green-200" : staff.status === "pending" ? "bg-yellow-50 text-yellow-700 border border-yellow-200" : "bg-gray-100 text-gray-600 border border-gray-200"}>
          {staff.status.charAt(0).toUpperCase() + staff.status.slice(1)}
        </Badge>
      ),
    },
    {
      header: "Actions",
      accessor: (staff) => (
        hasPermission('staff.manage') ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStaffToDelete(staff);
              setDeleteDialogOpen(true);
            }}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        ) : (
          <span className="text-xs text-gray-400 dark:text-gray-500">No access</span>
        )
      ),
    },
  ];

  // Check if user has permission to view staff
  if (!hasPermission('staff.view')) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Staff Management" />
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
              You don't have permission to view staff members. Please contact an administrator for access.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Staff Management"
        actions={
          hasPermission('staff.manage') ? (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-gray-900 text-white hover:bg-gray-800 border-gray-900">
                <UserPlus className="w-4 h-4" />
                Add Staff
              </Button>
            </DialogTrigger>
              <DialogContent className="bg-white/95 dark:bg-gray-900/95 border-gray-200 dark:border-gray-700/50 sm:max-w-md backdrop-blur-xl">
              <DialogHeader>
                  <DialogTitle className="text-gray-900 dark:text-white">Add Staff Member</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label className="text-gray-700 dark:text-gray-300">Name</Label>
                  <Input
                    placeholder="Full name"
                    value={newStaff.name}
                    onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                      className={cn(
                        "backdrop-blur-xl",
                        "bg-white/80 dark:bg-gray-800/50",
                        "border-gray-200 dark:border-gray-700/50",
                        "focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500"
                      )}
                  />
                </div>

                <div className="space-y-2">
                    <Label className="text-gray-700 dark:text-gray-300">Email</Label>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                      className={cn(
                        "backdrop-blur-xl",
                        "bg-white/80 dark:bg-gray-800/50",
                        "border-gray-200 dark:border-gray-700/50",
                        "focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500"
                      )}
                  />
                </div>

                <div className="space-y-2">
                    <Label className="text-gray-700 dark:text-gray-300">Role</Label>
                  <Select value={newStaff.role} onValueChange={(v) => setNewStaff({ ...newStaff, role: v })}>
                      <SelectTrigger className={cn(
                        "backdrop-blur-xl",
                        "bg-white/80 dark:bg-gray-800/50",
                        "border-gray-200 dark:border-gray-700/50",
                        "focus:border-blue-500 dark:focus:border-blue-400"
                      )}>
                      <SelectValue />
                    </SelectTrigger>
                      <SelectContent className="bg-white/95 dark:bg-gray-900/95 border-gray-200 dark:border-gray-700/50 backdrop-blur-xl">
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="moderator">Moderator</SelectItem>
                      <SelectItem value="support">Support</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                    <Label className="text-gray-700 dark:text-gray-300">Permissions</Label>
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                      {/* Full Access */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 p-2 rounded-md bg-gray-50 dark:bg-gray-800/50">
                          <Checkbox
                            id="all"
                            checked={newStaff.permissions.includes("all")}
                            onCheckedChange={() => {
                              if (newStaff.permissions.includes("all")) {
                                setNewStaff({ ...newStaff, permissions: [] });
                              } else {
                                setNewStaff({ ...newStaff, permissions: ["all"] });
                              }
                            }}
                          />
                          <label htmlFor="all" className="text-sm font-light text-gray-900 dark:text-white cursor-pointer">
                            Full Access (All Permissions)
                          </label>
                        </div>
                      </div>

                      {/* Dashboard */}
                      <div className="space-y-2">
                        <p className="text-xs font-light text-gray-600 dark:text-gray-400 uppercase tracking-wide">Dashboard</p>
                        {permissionOptions.filter(p => p.id.startsWith("dashboard.")).map((perm) => (
                          <div key={perm.id} className="flex items-center space-x-2 pl-4">
                            <Checkbox
                              id={perm.id}
                              checked={newStaff.permissions.includes(perm.id) || newStaff.permissions.includes("all")}
                              disabled={newStaff.permissions.includes("all")}
                              onCheckedChange={() => togglePermission(perm.id)}
                            />
                            <label htmlFor={perm.id} className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                              {perm.label.replace("Dashboard & ", "")}
                            </label>
                          </div>
                        ))}
                      </div>

                      {/* Users */}
                      <div className="space-y-2">
                        <p className="text-xs font-light text-gray-600 dark:text-gray-400 uppercase tracking-wide">Users Management</p>
                        {permissionOptions.filter(p => p.id.startsWith("users.")).map((perm) => (
                          <div key={perm.id} className="flex items-center space-x-2 pl-4">
                            <Checkbox
                              id={perm.id}
                              checked={newStaff.permissions.includes(perm.id) || newStaff.permissions.includes("all")}
                              disabled={newStaff.permissions.includes("all")}
                              onCheckedChange={() => togglePermission(perm.id)}
                            />
                            <label htmlFor={perm.id} className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                              {perm.label.replace("Users ", "")}
                            </label>
                          </div>
                        ))}
                      </div>

                      {/* Support Tickets */}
                      <div className="space-y-2">
                        <p className="text-xs font-light text-gray-600 dark:text-gray-400 uppercase tracking-wide">Support Tickets</p>
                        {permissionOptions.filter(p => p.id.startsWith("tickets.")).map((perm) => (
                          <div key={perm.id} className="flex items-center space-x-2 pl-4">
                            <Checkbox
                              id={perm.id}
                              checked={newStaff.permissions.includes(perm.id) || newStaff.permissions.includes("all")}
                              disabled={newStaff.permissions.includes("all")}
                              onCheckedChange={() => togglePermission(perm.id)}
                            />
                            <label htmlFor={perm.id} className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                              {perm.label.replace("Support Tickets ", "")}
                            </label>
                          </div>
                        ))}
                      </div>

                      {/* Subscriptions */}
                      <div className="space-y-2">
                        <p className="text-xs font-light text-gray-600 dark:text-gray-400 uppercase tracking-wide">Subscriptions</p>
                        {permissionOptions.filter(p => p.id.startsWith("subscriptions.")).map((perm) => (
                          <div key={perm.id} className="flex items-center space-x-2 pl-4">
                            <Checkbox
                              id={perm.id}
                              checked={newStaff.permissions.includes(perm.id) || newStaff.permissions.includes("all")}
                              disabled={newStaff.permissions.includes("all")}
                              onCheckedChange={() => togglePermission(perm.id)}
                            />
                            <label htmlFor={perm.id} className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                              {perm.label.replace("Subscriptions ", "")}
                            </label>
                          </div>
                        ))}
                      </div>

                      {/* Staff */}
                      <div className="space-y-2">
                        <p className="text-xs font-light text-gray-600 dark:text-gray-400 uppercase tracking-wide">Staff Management</p>
                        {permissionOptions.filter(p => p.id.startsWith("staff.")).map((perm) => (
                          <div key={perm.id} className="flex items-center space-x-2 pl-4">
                        <Checkbox
                          id={perm.id}
                              checked={newStaff.permissions.includes(perm.id) || newStaff.permissions.includes("all")}
                              disabled={newStaff.permissions.includes("all")}
                          onCheckedChange={() => togglePermission(perm.id)}
                        />
                            <label htmlFor={perm.id} className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                              {perm.label.replace("Staff ", "")}
                        </label>
                      </div>
                    ))}
                      </div>
                  </div>
                </div>

                <Button
                  onClick={handleAddStaff}
                    disabled={loading}
                  className="w-full bg-gray-900 text-white hover:bg-gray-800"
                >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add Staff Member'
                    )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          ) : null
        }
      />

      {loading && staffMembers.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
      <DataTable columns={columns} data={staffMembers} />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white/95 dark:bg-gray-900/95 border-gray-200 dark:border-gray-700/50 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-white">Delete Staff Member</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              Are you sure you want to remove {staffToDelete?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStaff}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Permissions Dialog */}
      <Dialog open={isAddPermissionOpen} onOpenChange={setIsAddPermissionOpen}>
        <DialogContent className={cn(
          "bg-white/95 dark:bg-gray-900/95 border-gray-200 dark:border-gray-700/50 sm:max-w-md backdrop-blur-xl"
        )}>
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              Add Permissions
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Select additional permissions to grant to {selectedStaffPermissions?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="max-h-64 overflow-y-auto space-y-2">
              {permissionOptions
                .filter(perm => {
                  // Filter out "all" permission and already assigned permissions
                  if (perm.id === "all") return false;
                  return !selectedStaffPermissions?.permissions?.includes(perm.id);
                })
                .map((perm) => {
                  const isSelected = selectedPermissionsToAdd.includes(perm.id);
                  return (
                    <button
                      key={perm.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedPermissionsToAdd(selectedPermissionsToAdd.filter(p => p !== perm.id));
                        } else {
                          setSelectedPermissionsToAdd([...selectedPermissionsToAdd, perm.id]);
                        }
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-left transition-all",
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700/50"
                          : "bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 border border-gray-200 dark:border-gray-700/50"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
                        isSelected
                          ? "bg-blue-600 border-blue-600 dark:bg-blue-500 dark:border-blue-500"
                          : "border-gray-300 dark:border-gray-600"
                      )}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span>{perm.label}</span>
                    </button>
                  );
                })}
              {permissionOptions.filter(perm => 
                perm.id !== "all" && !selectedStaffPermissions?.permissions?.includes(perm.id)
              ).length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  All available permissions have been assigned
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700/50">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddPermissionOpen(false);
                setSelectedPermissionsToAdd([]);
              }}
              disabled={addingPermissions}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddPermissions}
              disabled={selectedPermissionsToAdd.length === 0 || addingPermissions}
              className="gap-2"
            >
              {addingPermissions && <Loader2 className="w-4 h-4 animate-spin" />}
              Add {selectedPermissionsToAdd.length > 0 && `(${selectedPermissionsToAdd.length})`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


