import { useState, useMemo } from "react";
import { Header } from "@/components/dashboard/Header";
import { FilterSection, FilterState } from "@/components/dashboard/FilterSection";
import { StoreCard } from "@/components/dashboard/StoreCard";
import { Pagination } from "@/components/dashboard/Pagination";
import { BulkActions } from "@/components/dashboard/BulkActions";
import { generateMoreStores, Store } from "@/data/mockData";

const ITEMS_PER_PAGE = 12;

const Index = () => {
  const [filters, setFilters] = useState<FilterState>({
    countries: [],
    themes: [],
    dateRange: null,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Generate mock data
  const allStores = useMemo(() => generateMoreStores(150), []);

  // Filter stores
  const filteredStores = useMemo(() => {
    return allStores.filter((store) => {
      if (filters.countries.length > 0 && !filters.countries.includes(store.country)) {
        return false;
      }
      if (filters.themes.length > 0 && !filters.themes.includes(store.theme)) {
        return false;
      }
      if (filters.dateRange) {
        const storeDate = new Date(store.dateAdded);
        const fromDate = new Date(filters.dateRange.from);
        const toDate = new Date(filters.dateRange.to);
        if (storeDate < fromDate || storeDate > toDate) {
          return false;
        }
      }
      return true;
    });
  }, [allStores, filters]);

  // Paginate
  const totalPages = Math.ceil(filteredStores.length / ITEMS_PER_PAGE);
  const paginatedStores = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredStores.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredStores, currentPage]);

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen">
      <Header userName="John Doe" currentPlan="Pro Plan" />
      
      <main className="pt-24 pb-12 px-4 sm:px-6 max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
            Discover <span className="gradient-text">E-Commerce Stores</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Find and analyze online stores by location, theme, and more. Export data for your research.
          </p>
        </div>

        {/* Filters */}
        <FilterSection onFiltersChange={handleFiltersChange} />

        {/* Results Section */}
        <div className="glass-card p-6">
          <BulkActions
            stores={paginatedStores}
            totalCount={filteredStores.length}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          {paginatedStores.length > 0 ? (
            <>
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                    : "space-y-3"
                }
              >
                {paginatedStores.map((store) => (
                  <StoreCard key={store.id} store={store} viewMode={viewMode} />
                ))}
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🔍</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No stores found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your filters to find more results
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
