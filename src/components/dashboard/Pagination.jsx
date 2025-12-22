import { ChevronLeft, ChevronRight } from "lucide-react";

export const Pagination = ({ currentPage, totalPages, onPageChange, isFreeUser = false, onUpgradeClick }) => {
  const getPageNumbers = () => {
    const pages = [];
    
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push("...");
      }
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push("...");
      }
      
      pages.push(totalPages);
    }
    
    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-secondary/50 text-foreground hover:bg-secondary"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Previous</span>
      </button>

      <div className="flex items-center gap-1">
        {getPageNumbers().map((page, index) => 
          typeof page === "number" ? (
            <button
              key={index}
              onClick={() => {
                // Free users can only access page 1
                if (isFreeUser && page > 1) {
                  if (onUpgradeClick) {
                    onUpgradeClick();
                  }
                  return;
                }
                onPageChange(page);
              }}
              className={`w-10 h-10 rounded-lg text-sm font-light transition-colors ${
                currentPage === page
                  ? "bg-primary text-primary-foreground glow-effect"
                  : "bg-secondary/50 text-foreground hover:bg-secondary"
              } ${isFreeUser && page > 1 ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {page}
            </button>
          ) : (
            <span key={index} className="px-2 text-muted-foreground">
              {page}
            </span>
          )
        )}
      </div>

      <button
        onClick={() => {
          // Free users can't go to next page
          if (isFreeUser && currentPage < totalPages) {
            if (onUpgradeClick) {
              onUpgradeClick();
            }
            return;
          }
          onPageChange(currentPage + 1);
        }}
        disabled={currentPage === totalPages}
        className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-secondary/50 text-foreground hover:bg-secondary"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

