import { useState } from "react";
import { Copy, Download, Grid3X3, List } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { exportStoresToCSV, copyStoreLinks } from "@/services/api";

const PAGE_SIZE_OPTIONS = [50, 100, 200, 500];

export const BulkActions = ({ 
  stores, 
  totalCount, 
  viewMode, 
  onViewModeChange,
  itemsPerPage,
  onItemsPerPageChange,
  onRefresh,
  isFreeUser = false,
  onUpgradeClick
}) => {
  const [copying, setCopying] = useState(false);
  const [exporting, setExporting] = useState(false);

  const copyAllLinks = async () => {
    if (copying) return;
    
    try {
      setCopying(true);
      const storeIds = stores.map(s => s.id || s._id).filter(Boolean);
      
      if (storeIds.length === 0) {
        toast({
          title: "No stores to copy",
          description: "Please select stores to copy",
          variant: "destructive",
        });
        return;
      }

      const result = await copyStoreLinks(storeIds);
      
      toast({
        title: "Links copied!",
        description: `${result.count} store URLs copied to clipboard`,
      });
    } catch (error) {
      console.error('Error copying links:', error);
      
      // Don't show red error card for free user restrictions
      // Just show a simple info message instead (no variant="destructive")
      if (error.isUpgradeRequired || error.message?.includes('Free plan') || error.message?.includes('not available') || error.message?.includes('upgrade') || error.message?.includes('Upgrade required')) {
        toast({
          title: "Upgrade required",
          description: "This feature requires a paid plan. Please upgrade to copy links.",
          // No variant="destructive" - shows as info, not error
        });
      } else {
        toast({
          title: "Failed to copy links",
          description: error.message || "Please check your plan limits or try again",
          variant: "destructive",
        });
      }
    } finally {
      setCopying(false);
    }
  };

  const exportToCSV = async () => {
    if (exporting) return;
    
    try {
      setExporting(true);
      const storeIds = stores.map(s => s.id || s._id).filter(Boolean);
      
      if (storeIds.length === 0) {
        toast({
          title: "No stores to export",
          description: "Please select stores to export",
          variant: "destructive",
        });
        return;
      }

      await exportStoresToCSV(storeIds);
    
    toast({
      title: "Export complete!",
        description: `${storeIds.length} stores exported to CSV`,
    });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      
      // Handle limit reached (subscribed user who hit their limit)
      if (error.isLimitReached) {
        toast({
          title: "Upgrade required",
          description: "Subscribe to advanced package to export more CSV. Export limit refreshes every 24 hours.",
        });
      }
      // Handle free user restriction
      else if (error.isUpgradeRequired || error.message?.includes('Free plan') || error.message?.includes('not available') || error.message?.includes('upgrade') || error.message?.includes('Upgrade required')) {
        toast({
          title: "Upgrade required",
          description: "This feature requires a paid plan. Please upgrade to export CSV. Export limits refresh every 24 hours.",
        });
      } else {
        toast({
          title: "Failed to export CSV",
          description: error.message || "Please check your plan limits or try again",
          variant: "destructive",
        });
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
      <div className="flex items-center gap-4">
        <div className="text-sm text-muted-foreground">
          Showing <span className="text-foreground font-normal">{stores.length}</span> of{" "}
          <span className="text-foreground font-normal">{totalCount}</span> stores
        </div>
        
        {/* Items Per Page Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              const newValue = Number(e.target.value);
              // Free users can only select 50
              if (isFreeUser && newValue > 50) {
                if (onUpgradeClick) {
                  onUpgradeClick();
                }
                return;
              }
              onItemsPerPageChange(newValue);
            }}
            className="bg-secondary/50 border border-border/50 rounded-lg py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            style={{ paddingLeft: '11px', paddingRight: '11px' }}
          >
            {(isFreeUser ? PAGE_SIZE_OPTIONS.filter(size => size <= 50) : PAGE_SIZE_OPTIONS).map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* View Mode Toggle */}
        <div className="flex items-center glass-panel rounded-lg p-1">
          <button
            onClick={() => onViewModeChange("grid")}
            className={`p-2 rounded-md transition-colors ${
              viewMode === "grid" 
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Grid view"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange("list")}
            className={`p-2 rounded-md transition-colors ${
              viewMode === "list" 
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="List view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        {/* Bulk Action Buttons */}
        <button
          onClick={copyAllLinks}
          disabled={copying || stores.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 text-foreground text-sm font-light hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Copy className="w-4 h-4" />
          <span className="hidden sm:inline">{copying ? 'Copying...' : 'Copy All Links'}</span>
        </button>
        <button
          onClick={exportToCSV}
          disabled={exporting || stores.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-light hover:bg-primary/90 transition-colors glow-effect disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">{exporting ? 'Exporting...' : 'Export CSV'}</span>
        </button>
      </div>
    </div>
  );
};

