import { Copy, Download, Grid3X3, List } from "lucide-react";
import { Store } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";

interface BulkActionsProps {
  stores: Store[];
  allStores: Store[];
  totalCount: number;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  itemsPerPage: number;
  onItemsPerPageChange: (count: number) => void;
}

const PAGE_SIZE_OPTIONS = [100, 500, 1000];

export const BulkActions = ({ 
  stores, 
  allStores,
  totalCount, 
  viewMode, 
  onViewModeChange,
  itemsPerPage,
  onItemsPerPageChange
}: BulkActionsProps) => {
  const copyAllLinks = () => {
    const links = stores.map(s => s.url).join("\n");
    navigator.clipboard.writeText(links);
    toast({
      title: "Links copied!",
      description: `${stores.length} store URLs copied to clipboard`,
    });
  };

  const exportToCSV = () => {
    const headers = ["Store URL"];
    const rows = allStores.map(s => [s.url]);
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `store_links_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Export complete!",
      description: `${allStores.length} stores exported to CSV`,
    });
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
      <div className="flex items-center gap-4">
        <div className="text-sm text-muted-foreground">
          Showing <span className="text-foreground font-medium">{stores.length}</span> of{" "}
          <span className="text-foreground font-medium">{totalCount}</span> stores
        </div>
        
        {/* Items Per Page Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="bg-secondary/50 border border-border/50 rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
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
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 text-foreground text-sm font-medium hover:bg-secondary transition-colors"
        >
          <Copy className="w-4 h-4" />
          <span className="hidden sm:inline">Copy All Links</span>
        </button>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors glow-effect"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Export CSV</span>
        </button>
      </div>
    </div>
  );
};
