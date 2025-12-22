import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  MessageSquare, 
  CheckCircle, 
  Clock, 
  Send, 
  Loader2, 
  MoreVertical, 
  Trash2,
  CheckSquare,
  Square,
  Lock
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getAdminTickets, adminReplyToTicket, updateTicketStatus, deleteTicket, deleteTickets } from "@/services/api";
import { hasPermission } from "@/lib/permissions";
import { useToast } from "@/hooks/use-toast";

export default function AdminSupport() {
  const { toast: toastNotification } = useToast();
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [reply, setReply] = useState("");
  const [filter, setFilter] = useState("all");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTickets, setSelectedTickets] = useState(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewedTickets, setViewedTickets] = useState(() => {
    // Load viewed tickets from localStorage
    const stored = localStorage.getItem('adminViewedTickets');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  
  // Delete confirmation dialogs state
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    type: null, // 'single', 'all', 'selected'
    ticketId: null,
    ticketIdDisplay: null,
  });

  useEffect(() => {
    loadTickets();
  }, [filter]);

  // Show toast notification if staff member doesn't have access
  useEffect(() => {
    if (!hasPermission('tickets.view')) {
      toastNotification({
        title: "Limited Access",
        description: "You don't have permission to view support tickets. Please contact an administrator for access.",
        variant: "default",
      });
    }
  }, [toastNotification]);

  // Check for ticket ID in URL params and open it
  useEffect(() => {
    const ticketId = searchParams.get('ticket');
    if (ticketId && tickets.length > 0) {
      // Find ticket by ticketId (not MongoDB _id)
      const ticket = tickets.find(t => t.ticketId === ticketId);
      if (ticket) {
        setSelectedTicket(ticket);
        // Remove ticket param from URL after opening
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('ticket');
        setSearchParams(newSearchParams, { replace: true });
      }
    }
  }, [tickets, searchParams, setSearchParams]);

  // Refresh tickets every 24 hours to catch new tickets
  useEffect(() => {
    const interval = setInterval(() => {
      loadTickets();
    }, 24 * 60 * 60 * 1000); // 24 hours

    return () => clearInterval(interval);
  }, [filter]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const response = await getAdminTickets({ status: filter === 'all' ? undefined : filter });
      setTickets(response.tickets || []);
      
      // Clean up viewed tickets that no longer exist
      const ticketIds = new Set((response.tickets || []).map(t => t.id));
      const cleanedViewed = new Set(Array.from(viewedTickets).filter(id => ticketIds.has(id)));
      if (cleanedViewed.size !== viewedTickets.size) {
        setViewedTickets(cleanedViewed);
        localStorage.setItem('adminViewedTickets', JSON.stringify(Array.from(cleanedViewed)));
      }
      
      // Notify sidebar to update count
      window.dispatchEvent(new CustomEvent('ticketUpdated'));
    } catch (error) {
      console.error('❌ Error loading tickets:', error);
      // Only show error toast if it's not a connection error (server might be temporarily down)
      if (!error.message?.includes('Failed to fetch') && !error.message?.includes('ERR_CONNECTION_REFUSED')) {
        toast.error(error.message || 'Failed to load tickets');
      } else {
        console.warn('Server connection error - tickets may not be up to date');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!reply.trim() || !selectedTicket) return;
    
    try {
      setLoading(true);
      await adminReplyToTicket(selectedTicket.id, reply);
      toast.success("Reply sent successfully. User will be notified via email.");
      setReply("");
      
      // Mark ticket as viewed when admin replies
      const newViewed = new Set(viewedTickets);
      newViewed.add(selectedTicket.id);
      setViewedTickets(newViewed);
      localStorage.setItem('adminViewedTickets', JSON.stringify(Array.from(newViewed)));
      
      setSelectedTicket(null);
      await loadTickets();
      
      // Notify sidebar to update count
      window.dispatchEvent(new CustomEvent('ticketReplied'));
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error(error.message || 'Failed to send reply');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (ticket) => {
    try {
      setLoading(true);
      await updateTicketStatus(ticket.id, 'resolved');
      toast.success(`Ticket ${ticket.ticketId} marked as resolved`);
      
      // Update selected ticket optimistically if it's the one being resolved
      if (selectedTicket && selectedTicket.id === ticket.id) {
        setSelectedTicket({ ...selectedTicket, status: 'resolved' });
      }
      
      // Close dialog
      setSelectedTicket(null);
      
      // Wait a bit before reloading to ensure server has processed the update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Reload tickets, but don't fail if it errors (server might be temporarily unavailable)
      try {
        await loadTickets();
      } catch (reloadError) {
        console.warn('Failed to reload tickets after resolve, but update was successful:', reloadError);
        // Update local state optimistically
        setTickets(prevTickets => 
          prevTickets.map(t => t.id === ticket.id ? { ...t, status: 'resolved' } : t)
        );
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
      toast.error(error.message || 'Failed to update ticket status');
    } finally {
      setLoading(false);
    }
  };

  const openDeleteDialog = (type, ticketId = null, ticketIdDisplay = null) => {
    setDeleteDialog({
      open: true,
      type,
      ticketId,
      ticketIdDisplay,
    });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({
      open: false,
      type: null,
      ticketId: null,
      ticketIdDisplay: null,
    });
  };

  const confirmDelete = async () => {
    try {
      setLoading(true);
      closeDeleteDialog();

      if (deleteDialog.type === 'single') {
        await deleteTicket(deleteDialog.ticketId);
        toast.success(`Ticket ${deleteDialog.ticketIdDisplay} deleted successfully`);
        setSelectedTicket(null);
      } else if (deleteDialog.type === 'all') {
        const result = await deleteTickets(null, true);
        toast.success(`All ${result.deletedCount} tickets deleted successfully`);
        setSelectedTicket(null);
        setSelectedTickets(new Set());
        setSelectionMode(false);
      } else if (deleteDialog.type === 'selected') {
        if (selectedTickets.size === 0) {
          toast.error('No tickets selected');
          return;
        }
        const ticketIds = Array.from(selectedTickets);
        const result = await deleteTickets(ticketIds, false);
        toast.success(`${result.deletedCount} ticket(s) deleted successfully`);
        setSelectedTicket(null);
        setSelectedTickets(new Set());
        setSelectionMode(false);
      }

      await loadTickets();
      
      // Notify sidebar to update count
      window.dispatchEvent(new CustomEvent('ticketDeleted'));
    } catch (error) {
      console.error('Error deleting ticket(s):', error);
      toast.error(error.message || 'Failed to delete ticket(s)');
    } finally {
      setLoading(false);
    }
  };

  const toggleTicketSelection = (ticketId) => {
    const newSelected = new Set(selectedTickets);
    if (newSelected.has(ticketId)) {
      newSelected.delete(ticketId);
    } else {
      newSelected.add(ticketId);
    }
    setSelectedTickets(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedTickets.size === tickets.length) {
      setSelectedTickets(new Set());
    } else {
      setSelectedTickets(new Set(tickets.map(t => t.id)));
    }
  };

  const statusConfig = {
    open: { color: "bg-blue-50 text-blue-700 border border-blue-200", icon: MessageSquare },
    "in-progress": { color: "bg-orange-50 text-orange-700 border border-orange-200", icon: Clock },
    resolved: { color: "bg-green-50 text-green-700 border border-green-200", icon: CheckCircle },
  };

  const planConfig = {
    free: { color: "bg-gray-100 text-gray-700 border border-gray-300", label: "Free" },
    starter: { color: "bg-blue-100 text-blue-700 border border-blue-300", label: "Starter" },
    pro: { color: "bg-purple-100 text-purple-700 border border-purple-300", label: "Pro" },
    enterprise: { color: "bg-amber-100 text-amber-700 border border-amber-300", label: "Enterprise" },
  };

  // Check if user has permission to view tickets
  if (!hasPermission('tickets.view')) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Customer Support" />
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
              You don't have permission to view support tickets. Please contact an administrator for access.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Customer Support"
      />

      {/* Filters and Actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          {(["all", "open", "in-progress", "resolved"]).map((status) => (
            <Button
              key={status}
              variant={filter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(status)}
              className={cn(
                filter === status 
                  ? "bg-gray-900 text-white hover:bg-gray-800 border-gray-900 dark:bg-gray-800 dark:border-gray-700" 
                  : "bg-white/80 dark:bg-gray-900/60 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-gray-200 dark:border-gray-700/50 backdrop-blur-xl"
              )}
            >
              {status === "all" ? "All" : status.replace("-", " ").replace(/^\w/, (c) => c.toUpperCase())}
            </Button>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
          {selectionMode ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
                className="bg-white/80 dark:bg-gray-900/60 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-gray-200 dark:border-gray-700/50 backdrop-blur-xl"
              >
                {selectedTickets.size === tickets.length ? (
                  <>
                    <Square className="w-4 h-4 mr-2" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-4 h-4 mr-2" />
                    Select All
                  </>
                )}
              </Button>
              {selectedTickets.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openDeleteDialog('selected')}
                  className="bg-red-50 text-red-700 hover:bg-red-100 border-red-200"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected ({selectedTickets.size})
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectionMode(false);
                  setSelectedTickets(new Set());
                }}
                className="bg-white/80 dark:bg-gray-900/60 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-gray-200 dark:border-gray-700/50 backdrop-blur-xl"
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              {hasPermission('tickets.delete') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectionMode(true)}
                  className="bg-white/80 dark:bg-gray-900/60 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-gray-200 dark:border-gray-700/50 backdrop-blur-xl"
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                Select Multiple
              </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tickets Grid */}
      {loading ? (
        <div className={cn(
          "rounded-xl p-12 border shadow-sm flex items-center justify-center backdrop-blur-xl transition-all",
          "bg-white/80 dark:bg-gray-900/60 border-gray-200 dark:border-gray-700/50"
        )}>
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
        </div>
      ) : tickets.length === 0 ? (
        <div className={cn(
          "rounded-xl p-12 border shadow-sm text-center backdrop-blur-xl transition-all",
          "bg-white/80 dark:bg-gray-900/60 border-gray-200 dark:border-gray-700/50"
        )}>
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-light text-gray-900 dark:text-white mb-2">No tickets found</h3>
          <p className="text-gray-500 dark:text-gray-400">
            {filter === 'all' 
              ? "No support tickets have been created yet." 
              : `No tickets with status "${filter}" found.`}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {tickets.map((ticket) => {
            const StatusIcon = statusConfig[ticket.status]?.icon || MessageSquare;
            const formatDate = (dateString) => {
              if (!dateString) return 'N/A';
              const date = new Date(dateString);
              return date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
            };
            const isSelected = selectedTickets.has(ticket.id);
            
            return (
              <div
                key={ticket.id}
                className={cn(
                  "rounded-xl p-4 border shadow-sm transition-all relative group backdrop-blur-xl",
                  "bg-white/80 dark:bg-gray-900/60",
                  isSelected 
                    ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30" 
                    : "border-gray-200 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:shadow-md",
                  selectionMode ? "cursor-default" : "cursor-pointer"
                )}
                onClick={() => {
                  if (selectionMode) {
                    toggleTicketSelection(ticket.id);
                  } else {
                    setSelectedTicket(ticket);
                  }
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  {selectionMode && (
                    <div className="flex items-center pt-1" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleTicketSelection(ticket.id)}
                        className="border-gray-300"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <Badge variant="outline" className="font-mono text-xs bg-gray-50 text-gray-700 border-gray-200">
                        {ticket.ticketId}
                      </Badge>
                      <Badge className={statusConfig[ticket.status]?.color || statusConfig.open.color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {ticket.status.replace("-", " ")}
                      </Badge>
                      <Badge className={planConfig[ticket.userPlan || 'free']?.color || planConfig.free.color}>
                        {planConfig[ticket.userPlan || 'free']?.label || 'Free'}
                      </Badge>
                      {ticket.replies && ticket.replies.length > 0 && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          {ticket.replies.length} {ticket.replies.length === 1 ? 'reply' : 'replies'}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-light text-gray-900 dark:text-white truncate">{ticket.subject}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{ticket.message}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                      <span>{ticket.userName}</span>
                      <span>•</span>
                      <span>{formatDate(ticket.createdAt)}</span>
                    </div>
                  </div>
                  
                  {/* Flashy dot indicator for new/unread messages */}
                  {(() => {
                    // Show dot if:
                    // 1. Ticket is new (no replies) OR
                    // 2. Last reply was from user (customer sent a reply) AND ticket hasn't been viewed
                    const isNewTicket = !ticket.replies || ticket.replies.length === 0;
                    const hasUserReply = ticket.lastRepliedBy === 'user';
                    const isUnread = !viewedTickets.has(ticket.id);
                    const shouldShowDot = (isNewTicket || hasUserReply) && isUnread;
                    
                    if (!shouldShowDot) return null;
                    
                    return (
                      <div className="flex-shrink-0 flex items-center justify-center pr-2">
                        <div className="relative">
                          {/* Outer pulsing ring */}
                          <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75"></div>
                          {/* Inner solid dot */}
                          <div className="relative w-3 h-3 rounded-full bg-red-500 shadow-lg"></div>
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* 3-dot menu - appears on hover */}
                  <div 
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-gray-100"
                        >
                          <MoreVertical className="h-4 w-4 text-gray-500" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-white/80 dark:bg-gray-900/60 border-gray-200 dark:border-gray-700/50 backdrop-blur-xl">
                        <DropdownMenuItem
                          onClick={() => setSelectedTicket(ticket)}
                          className="cursor-pointer"
                        >
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {hasPermission('tickets.delete') && (
                          <>
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog('single', ticket.id, ticket.ticketId)}
                          className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete This Ticket
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog('all')}
                          className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete All Tickets
                        </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectionMode(true);
                            toggleTicketSelection(ticket.id);
                          }}
                          className="cursor-pointer"
                        >
                          <CheckSquare className="w-4 h-4 mr-2" />
                          Select Multiple
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ticket Detail Modal */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="bg-white/95 dark:bg-gray-900/95 border-gray-200 dark:border-gray-700/50 sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 backdrop-blur-xl">
          {selectedTicket && (
            <>
              {/* Header Section */}
              <DialogHeader className={cn(
                "px-6 pt-6 pb-4 border-b",
                "border-gray-200 dark:border-gray-700/50",
                "bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50"
              )}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className={cn(
                        "font-mono text-xs font-light px-2 py-1 rounded",
                        "text-gray-500 dark:text-gray-400",
                        "bg-gray-100 dark:bg-gray-800/50"
                      )}>
                        {selectedTicket.ticketId}
                      </span>
                      {(() => {
                        const StatusIconComponent = statusConfig[selectedTicket.status]?.icon || MessageSquare;
                        return (
                          <Badge className={statusConfig[selectedTicket.status]?.color || statusConfig.open.color}>
                            <StatusIconComponent className="w-3 h-3 mr-1" />
                            {selectedTicket.status.replace("-", " ")}
                          </Badge>
                        );
                      })()}
                      {selectedTicket.userPlan && (
                <Badge className={planConfig[selectedTicket.userPlan]?.color || planConfig.free.color}>
                  {planConfig[selectedTicket.userPlan]?.label || 'Free'}
                </Badge>
              )}
                    </div>
                    <DialogTitle className="text-xl font-light text-gray-900 dark:text-white mt-2 pr-8">
                      {selectedTicket.subject}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                      Ticket details for {selectedTicket.ticketId}
                    </DialogDescription>
                  </div>
                </div>

              {/* User Info */}
                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/50">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 flex items-center justify-center text-white font-light text-sm">
                    {selectedTicket.userName?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-light text-gray-900 dark:text-white truncate">{selectedTicket.userName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{selectedTicket.userEmail}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-light text-gray-500 dark:text-gray-400">Created</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {new Date(selectedTicket.createdAt).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
              </div>
              </DialogHeader>

              {/* Content Section - Scrollable */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Original Message */}
                <div className={cn(
                  "p-5 rounded-xl border-2 shadow-sm backdrop-blur-xl",
                  "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30",
                  "border-blue-100 dark:border-blue-800/50"
                )}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-500 dark:bg-blue-600 flex items-center justify-center text-white text-xs font-light">
                        {selectedTicket.userName?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-light text-gray-900 dark:text-white">{selectedTicket.userName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(selectedTicket.createdAt).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                        </p>
                      </div>
                    </div>
                </div>
                  <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">{selectedTicket.message}</p>
              </div>

              {/* Replies */}
              {selectedTicket.replies && selectedTicket.replies.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-px flex-1 bg-gray-200"></div>
                      <h4 className="text-sm font-light text-gray-600 px-3">Conversation History</h4>
                      <div className="h-px flex-1 bg-gray-200"></div>
                    </div>
                  {selectedTicket.replies.map((reply, index) => (
                    <div
                      key={index}
                        className={cn(
                          "p-5 rounded-xl border-2 shadow-sm backdrop-blur-xl",
                        reply.from === 'admin'
                            ? 'bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 border-gray-200 dark:border-gray-700/50 ml-8'
                            : 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-blue-100 dark:border-blue-800/50'
                        )}
                    >
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-light ${
                            reply.from === 'admin'
                              ? 'bg-gradient-to-br from-gray-600 to-gray-700'
                              : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                          }`}>
                            {reply.from === 'admin' 
                              ? (reply.adminName || 'Admin')?.charAt(0)?.toUpperCase() || 'A'
                              : selectedTicket.userName?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-light text-gray-900 dark:text-white">
                          {reply.from === 'admin' ? (reply.adminName || 'Admin') : selectedTicket.userName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(reply.createdAt).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                            </p>
                          </div>
                      </div>
                        <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">{reply.message}</p>
                    </div>
                  ))}
                </div>
              )}
              </div>

              {/* Footer Section - Reply Form */}
              {hasPermission('tickets.reply') ? (
                <>
                  <div className={cn(
                    "px-6 py-4 border-t space-y-3 backdrop-blur-xl transition-all",
                    "border-gray-200 dark:border-gray-700/50",
                    "bg-gray-50/80 dark:bg-gray-800/50"
                  )}>
                    <div className="space-y-2">
                      <label className="text-sm font-light text-gray-900 dark:text-white">Write a Reply</label>
                <Textarea
                        placeholder="Type your response to the customer..."
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                        className={cn(
                          "border-gray-300 dark:border-gray-600 resize-none focus:border-blue-500 dark:focus:border-blue-400",
                          "focus:ring-2 focus:ring-blue-500/20 transition-all min-h-[100px]",
                          "bg-white/80 dark:bg-gray-800/50 text-gray-900 dark:text-white",
                          "placeholder:text-gray-400 dark:placeholder:text-gray-500 backdrop-blur-xl"
                        )}
                  rows={4}
                  disabled={loading}
                />
                    </div>
              </div>

                  <div className="flex gap-3 px-6 pb-4">
                <Button
                  onClick={handleReply}
                  disabled={loading || !reply.trim()}
                      className="flex-1 gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all"
                      size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Reply
                    </>
                  )}
                </Button>
                    {hasPermission('tickets.update') && selectedTicket.status !== "resolved" && selectedTicket.status !== "closed" && (
                  <Button
                    variant="outline"
                    onClick={() => handleResolve(selectedTicket)}
                    disabled={loading}
                        className="gap-2 border-gray-300 hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-all"
                        size="lg"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Mark Resolved
                  </Button>
                )}
              </div>
                </>
              ) : (
                <div className={cn(
                  "px-6 py-4 border-t backdrop-blur-xl transition-all",
                  "border-gray-200 dark:border-gray-700/50",
                  "bg-gray-50/80 dark:bg-gray-800/50"
                )}>
                  <div className="flex items-center justify-center p-4 rounded-lg bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50">
                    <Lock className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-2" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">You don't have permission to reply to tickets</span>
                  </div>
            </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && closeDeleteDialog()}>
        <AlertDialogContent className="bg-white/95 dark:bg-gray-900/95 border-gray-200 dark:border-gray-700/50 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              {deleteDialog.type === 'single' && `Delete Ticket ${deleteDialog.ticketIdDisplay}?`}
              {deleteDialog.type === 'all' && 'Delete All Tickets?'}
              {deleteDialog.type === 'selected' && `Delete ${selectedTickets.size} Selected Ticket(s)?`}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              {deleteDialog.type === 'single' && (
                <>Are you sure you want to delete ticket <strong>{deleteDialog.ticketIdDisplay}</strong>? This action cannot be undone.</>
              )}
              {deleteDialog.type === 'all' && (
                <>Are you sure you want to delete <strong>ALL tickets</strong>? This action cannot be undone and will permanently remove all support tickets from the database.</>
              )}
              {deleteDialog.type === 'selected' && (
                <>Are you sure you want to delete <strong>{selectedTickets.size} selected ticket(s)</strong>? This action cannot be undone.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={closeDeleteDialog}
              className="bg-white/80 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-gray-200 dark:border-gray-700/50 backdrop-blur-xl"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={loading}
              className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-600"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
