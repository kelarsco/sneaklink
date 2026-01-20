import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/dashboard/Header";
import { FilterSection } from "@/components/dashboard/FilterSection";
import { StoreCard } from "@/components/dashboard/StoreCard";
import { Pagination } from "@/components/dashboard/Pagination";
import { BulkActions } from "@/components/dashboard/BulkActions";
import { fetchStores, checkHealth } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { UpgradePopup } from "@/components/UpgradePopup";



const Index = () => {
  const { user, isAuthenticated } = useAuth();
  const userPlan = user?.subscription?.plan || 'free';
  const isFreeUser = userPlan === 'free';
  
  const [filters, setFilters] = useState({
    countries: [],
    themes: [],
    tags: [],
    dateRange: null,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState("grid");
  // Free users are limited to 50 items per page
  const [itemsPerPage, setItemsPerPage] = useState(50);
  
  // Enforce free user limits: max 50 items per page, page 1 only
  useEffect(() => {
    if (isFreeUser) {
      if (itemsPerPage > 50) {
        setItemsPerPage(50);
      }
      if (currentPage > 1) {
        setCurrentPage(1);
      }
    }
  }, [isFreeUser, itemsPerPage, currentPage]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [apiConnected, setApiConnected] = useState(false);
  const [showUpgradePopup, setShowUpgradePopup] = useState(false);
  const [upgradePopupMessage, setUpgradePopupMessage] = useState(null);
  const loadingRef = useRef(false); // Prevent duplicate API calls
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false); // Track if we've completed at least one fetch

  // Check API health on mount (with retry logic)
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 5;
    const retryDelay = 2000; // 2 seconds

    const checkAPI = async () => {
      try {
      const isHealthy = await checkHealth();
      setApiConnected(isHealthy);
        if (isHealthy) {
          retryCount = 0; // Reset on success
        } else if (retryCount < maxRetries) {
          retryCount++;
          // Retry after delay
          setTimeout(checkAPI, retryDelay);
        } else {
          // After max retries, don't show error - just keep trying silently
          setLoading(false);
        }
      } catch (error) {
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(checkAPI, retryDelay);
        } else {
        setLoading(false);
        }
      }
    };
    
    checkAPI();
    
    // Also set up periodic health checks (less frequent to reduce console spam)
    const healthCheckInterval = setInterval(() => {
      checkHealth().then(isHealthy => {
        if (isHealthy && !apiConnected) {
          setApiConnected(true);
          setError(null);
        }
      }).catch(() => {
        // Silently fail - don't show errors or spam console
      });
    }, 10000); // Check every 10 seconds (reduced frequency)

    return () => clearInterval(healthCheckInterval);
  }, []);

  // Hard cap the preloader to a maximum of 30 seconds (only if actually loading and haven't fetched yet)
  // This gives more time for the initial fetch to complete
  useEffect(() => {
    if (!loading || hasFetchedOnce) return;

    const timeoutId = setTimeout(() => {
      // Only timeout if we haven't fetched yet - if we've fetched, let the normal loading state handle it
      if (!hasFetchedOnce) {
        setLoading(false);
        // If we still don't know API status, show a gentle message instead of an infinite spinner
        if (!apiConnected && !error) {
          setError("Taking longer than expected to connect to the backend. You can still explore the UI while the server starts.");
        }
      }
    }, 30000); // Increased to 30 seconds for initial load

    return () => clearTimeout(timeoutId);
  }, [loading, apiConnected, error, hasFetchedOnce]);

  // Fetch stores when filters or page changes
  useEffect(() => {
    // Check if user has a token (even if user data isn't loaded yet)
    const token = localStorage.getItem('authToken');
    
    // Don't load stores if no token exists
    if (!token) {
      setLoading(false);
      return;
    }
    
    // Allow loading stores even if user data isn't loaded yet
    // The token exists, so user is authenticated
    // User data will load in the background via AuthContext
    
    // If API is not connected yet, still try to load stores
    // The API might be running but health check hasn't completed
    // This prevents users from seeing empty dashboard when backend is actually working

    // Add a small delay to ensure redirect completes before loading stores
    const loadStores = async () => {
      // Small delay to let redirect complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setLoading(true);
      setError(null);
      try {
        const response = await fetchStores(filters, currentPage, itemsPerPage);
        
        // Always set stores, even if empty array
        if (response && response.stores) {
          setStores(response.stores);
          setTotalPages(response.pagination?.totalPages || 1);
          setTotalCount(response.pagination?.total || 0);
        } else {
          // If response is malformed, set empty arrays
          setStores([]);
          setTotalPages(1);
          setTotalCount(0);
        }
        
        // If filters were restricted but stores were returned, show upgrade message
        if (response?.filterRestricted) {
          // Show stores but indicate filters are restricted
          // The FilterSection component should handle showing upgrade prompts
        }
      } catch (err) {
        // Handle monthly limit errors with upgrade popup
        if (err.message && (
          err.message.includes('monthly limit') ||
          err.message.includes('Monthly limit reached') ||
          (err.message.includes('filter queries') && err.message.includes('upgrade'))
        )) {
          // Show upgrade popup with custom message for monthly limit
          setUpgradePopupMessage("You've reached your monthly search limit. Please upgrade your plan to continue using filters, or wait until next month for your limit to reset.");
          setShowUpgradePopup(true);
          setLoading(false);
          return;
        }
        
        // Handle rate limit errors gracefully - just skip this refresh
        if (err.message && (
          err.message.includes('Too many requests') ||
          err.message.includes('rate limit') ||
          err.message.includes('try again later')
        )) {
          // Silently skip - don't show error for rate limits during auto-refresh
          setLoading(false);
          return;
        }
        
        // Handle filter restriction errors - retry without filters
        if (err.message && (
          err.message.includes('Upgrade required') ||
          err.message.includes('Filtering is not available') ||
          err.message.includes('requiresUpgrade')
        )) {
          // If filters were used, try without filters
          const hasFilters = filters.countries?.length > 0 || 
                           filters.themes?.length > 0 || 
                           filters.tags?.length > 0 || 
                           filters.dateRange;
          
          if (hasFilters) {
            // Retry without filters
            try {
              const response = await fetchStores({}, currentPage, itemsPerPage);
              setStores(response.stores || []);
              setTotalPages(response.pagination?.totalPages || 1);
              setTotalCount(response.pagination?.total || 0);
              // Clear filters to show stores
              setFilters({ countries: [], themes: [], tags: [], dateRange: null });
              setError("Filters are not available on your plan. Showing all stores.");
            } catch (retryErr) {
              setError("Failed to load stores. Please try again.");
              setStores([]);
            }
          } else {
            setError("Failed to load stores. Please try again.");
            setStores([]);
          }
        } else if (err.message && (
          err.message.includes('Database not connected') ||
          err.message.includes('MongoDB') ||
          err.message.includes('database') ||
          err.message.includes('Failed to fetch')
        )) {
          // Silently handle - just show empty state
          setStores([]);
          setError(null); // Don't show error
        } else {
          setError("Failed to load stores. Please try again.");
          setStores([]);
        }
      } finally {
        setLoading(false);
        if (loadingRef) {
          loadingRef.current = false; // Reset loading flag
        }
      }
    };

    // Small delay to batch rapid changes
    const timeoutId = setTimeout(() => {
      loadStores();
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (loadingRef) {
        loadingRef.current = false; // Reset on cleanup
      }
    };
  }, [filters, currentPage, itemsPerPage]); // Removed isAuthenticated and user dependencies - load stores if token exists

  // Auto-refresh stores periodically to show newly generated stores
  useEffect(() => {
    // Don't require apiConnected - just check authentication
    if (!isAuthenticated || !user) {
      return;
    }

    // Refresh stores every 30 seconds to show newly generated stores
    const refreshInterval = setInterval(() => {
      // Only refresh if:
      // 1. Not currently loading
      // 2. On first page (to avoid disrupting pagination)
      // 3. No filters are applied (to avoid disrupting user's filtered view)
      const hasFilters = filters.countries?.length > 0 || 
                       filters.themes?.length > 0 || 
                       filters.tags?.length > 0 || 
                       filters.dateRange;
      
      if (loadingRef && !loadingRef.current && currentPage === 1 && !hasFilters) {
        // Silently refresh stores in the background
        fetchStores(filters, currentPage, itemsPerPage)
          .then(response => {
            // Only update if we got new data (total count might have increased)
            if (response.pagination?.total !== totalCount) {
              setStores(response.stores || []);
              setTotalPages(response.pagination?.totalPages || 1);
              setTotalCount(response.pagination?.total || 0);
            } else {
              // Even if count is same, refresh to get latest stores (newest first)
              setStores(response.stores || []);
            }
          })
          .catch(err => {
            // Silently fail - don't show errors for background refresh
            console.debug('Background refresh failed:', err.message);
          });
      }
    }, 30000); // 30 seconds

    return () => clearInterval(refreshInterval);
  }, [filters, currentPage, itemsPerPage, totalCount]); // Removed isAuthenticated and user dependencies

  // Manual refresh function
  const handleRefresh = async () => {
    if (loadingRef.current) return;
    
    loadingRef.current = true;
    setLoading(true);
    try {
      const response = await fetchStores(filters, currentPage, itemsPerPage);
      setStores(response.stores || []);
      setTotalPages(response.pagination?.totalPages || 1);
      setTotalCount(response.pagination?.total || 0);
      setError(null);
    } catch (err) {
      console.error("Error refreshing stores:", err);
      setError("Failed to refresh stores. Please try again.");
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const handleFiltersChange = (newFilters) => {
    console.log('📥 Filters changed in Index:', newFilters);
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    // Free users can only view page 1
    if (isFreeUser && page > 1) {
      setShowUpgradePopup(true);
      setUpgradePopupMessage("Pagination beyond the first page requires a paid plan. Upgrade to access more stores.");
      return;
    }
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleItemsPerPageChange = (count) => {
    // Free users are limited to 50 items per page
    if (isFreeUser && count > 50) {
      setShowUpgradePopup(true);
      setUpgradePopupMessage("Displaying more than 50 stores per page requires a paid plan. Upgrade to access higher limits.");
      return;
    }
    setItemsPerPage(count);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="pt-24 pb-12 px-[10px] md:px-10 w-full">
        {/* Filters */}
        <div className="relative z-[999]">
          <FilterSection onFiltersChange={handleFiltersChange} />
        </div>

        {/* Results Section */}
        <div className="glass-card px-[10px] md:px-10 py-6 relative z-0">
          <BulkActions
            stores={stores}
            totalCount={totalCount}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={handleItemsPerPageChange}
            isFreeUser={isFreeUser}
            onUpgradeClick={() => {
              setShowUpgradePopup(true);
              setUpgradePopupMessage("Higher pagination limits require a paid plan. Upgrade to access more stores per page.");
            }}
          />

          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <h3 className="text-lg font-light text-foreground mb-2">Loading stores...</h3>
              <p className="text-muted-foreground">
                Please wait while we fetch the latest stores
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">⚠️</span>
              </div>
              <h3 className="text-lg font-light text-foreground mb-2">Error loading stores</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              {!apiConnected && (
                <p className="text-sm text-muted-foreground">
                  Make sure the backend server is running on port 3000
                </p>
              )}
            </div>
          ) : hasFetchedOnce && stores.length === 0 ? (
            // Only show "No stores found" if we've completed at least one fetch
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🔍</span>
              </div>
              <h3 className="text-lg font-light text-foreground mb-2">
                {(() => {
                  // Check if any filters are active
                  const hasActiveFilters = 
                    (filters.countries && filters.countries.length > 0) ||
                    (filters.themes && filters.themes.length > 0) ||
                    (filters.tags && filters.tags.length > 0) ||
                    (filters.dateRange && (filters.dateRange.from || filters.dateRange.to));
                  
                  return hasActiveFilters 
                    ? "No stores found matching your filters"
                    : "No stores found";
                })()}
              </h3>
              <p className="text-muted-foreground mb-4">
                {(() => {
                  // Check if any filters are active
                  const hasActiveFilters = 
                    (filters.countries && filters.countries.length > 0) ||
                    (filters.themes && filters.themes.length > 0) ||
                    (filters.tags && filters.tags.length > 0) ||
                    (filters.dateRange && (filters.dateRange.from || filters.dateRange.to));
                  
                  if (hasActiveFilters) {
                    return "Try adjusting your filters or clearing them to see all available stores";
                  }
                  
                  return apiConnected 
                    ? "Try adjusting your filters to find more results or start a scraping job"
                    : "Please start the backend server and run a scraping job to discover stores";
                })()}
              </p>
              {(() => {
                // Check if any filters are active
                const hasActiveFilters = 
                  (filters.countries && filters.countries.length > 0) ||
                  (filters.themes && filters.themes.length > 0) ||
                  (filters.tags && filters.tags.length > 0) ||
                  (filters.dateRange && (filters.dateRange.from || filters.dateRange.to));
                
                if (hasActiveFilters) {
                  return (
                    <button
                      onClick={() => {
                        setFilters({
                          countries: [],
                          themes: [],
                          tags: [],
                          dateRange: null,
                        });
                        setCurrentPage(1);
                      }}
                      className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Clear All Filters
                    </button>
                  );
                }
                return null;
              })()}
            </div>
          ) : stores.length > 0 ? (
            <>
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                    : "space-y-3"
                }
              >
                {stores.map((store) => {
                  // Normalize store object to ensure id is available
                  const normalizedStore = {
                    ...store,
                    id: store._id || store.id,
                    dateAdded: store.dateAdded || store.createdAt,
                  };
                  return (
                    <StoreCard 
                      key={normalizedStore.id} 
                      store={normalizedStore} 
                      viewMode={viewMode}
                      onUpgradeClick={() => setShowUpgradePopup(true)}
                    />
                  );
                })}
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                isFreeUser={isFreeUser}
                onUpgradeClick={() => {
                  setShowUpgradePopup(true);
                  setUpgradePopupMessage("Accessing additional pages requires a paid plan. Upgrade to browse more stores.");
                }}
              />
            </>
          ) : null}
        </div>
      </main>

      {/* Upgrade Popup - Rendered at top level to appear above all content */}
      <UpgradePopup
        isOpen={showUpgradePopup}
        onClose={() => {
          setShowUpgradePopup(false);
          setUpgradePopupMessage(null); // Reset message when closing
        }}
        feature="Premium features"
        customMessage={upgradePopupMessage}
      />
    </div>
  );
};

export default Index;

