import { useState, useRef, useEffect } from "react";
import { ChevronDown, X, CalendarDays, MapPin, Palette, Filter, RotateCcw, Tag } from "lucide-react";
import { europeanCountries, americanCountries, asianCountries, middleEastCountries, africanCountries, oceaniaCountries, freeThemes, paidThemes, availableTags } from "@/data/mockData";
import { DateRangePicker } from "./DateRangePicker";
import { UpgradePopup } from "@/components/UpgradePopup";
import { useAuth } from "@/contexts/AuthContext";

export const FilterSection = ({ onFiltersChange }) => {
  const { user } = useAuth();
  const [showUpgradePopup, setShowUpgradePopup] = useState(false);
  const userPlan = user?.subscription?.plan || 'free';
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [selectedThemes, setSelectedThemes] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [countrySearch, setCountrySearch] = useState("");
  const [themeSearch, setThemeSearch] = useState("");
  
  const countryDropdownRef = useRef(null);
  const dateDropdownRef = useRef(null);
  const themeDropdownRef = useRef(null);
  const tagDropdownRef = useRef(null);

  // Handle click outside for all dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target)) {
        if (activeDropdown === "country") {
          setActiveDropdown(null);
        }
      }
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target)) {
        if (activeDropdown === "date") {
          setActiveDropdown(null);
        }
      }
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target)) {
        if (activeDropdown === "theme") {
          setActiveDropdown(null);
        }
      }
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target)) {
        if (activeDropdown === "tag") {
          setActiveDropdown(null);
        }
      }
    };

    if (activeDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [activeDropdown]);

  const filteredEuropeanCountries = europeanCountries.filter(c => 
    c.toLowerCase().includes(countrySearch.toLowerCase())
  );
  const filteredAmericanCountries = americanCountries.filter(c => 
    c.toLowerCase().includes(countrySearch.toLowerCase())
  );
  const filteredAsianCountries = asianCountries.filter(c => 
    c.toLowerCase().includes(countrySearch.toLowerCase())
  );
  const filteredMiddleEastCountries = middleEastCountries.filter(c => 
    c.toLowerCase().includes(countrySearch.toLowerCase())
  );
  const filteredAfricanCountries = africanCountries.filter(c => 
    c.toLowerCase().includes(countrySearch.toLowerCase())
  );
  const filteredOceaniaCountries = oceaniaCountries.filter(c => 
    c.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const filteredFreeThemes = freeThemes.filter(t => 
    t.toLowerCase().includes(themeSearch.toLowerCase())
  );
  const filteredPaidThemes = paidThemes.filter(t => 
    t.toLowerCase().includes(themeSearch.toLowerCase())
  );

  const handleFilterClick = () => {
    // Free users cannot use any filters
    if (userPlan === 'free') {
      setShowUpgradePopup(true);
      return false;
    }
    return true;
  };

  const toggleCountry = (country) => {
    if (!handleFilterClick()) return;
    setSelectedCountries(prev => 
      prev.includes(country) ? prev.filter(c => c !== country) : [...prev, country]
    );
  };

  const toggleTheme = (theme) => {
    if (!handleFilterClick()) return;
    setSelectedThemes(prev => {
      const newThemes = prev.includes(theme) 
        ? prev.filter(t => t !== theme) 
        : [...prev, theme];
      console.log('🎨 Theme toggled:', theme, 'New themes array:', newThemes);
      return newThemes;
    });
  };

  const prevTagsLengthRef = useRef(selectedTags.length);
  const prevCountriesLengthRef = useRef(selectedCountries.length);
  const prevThemesLengthRef = useRef(selectedThemes.length);
  const prevDateRangeRef = useRef(!!(dateFrom && dateTo));

  const toggleTag = (tag) => {
    if (!handleFilterClick()) return;
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // Auto-reset to default state when all filters are fully deselected
  useEffect(() => {
    // Check if all filters are now empty (no countries, no themes, no tags, no date range)
    const allFiltersEmpty = selectedCountries.length === 0 && 
                            selectedThemes.length === 0 && 
                            selectedTags.length === 0 && 
                            !(dateFrom && dateTo);
    
    // Check if we transitioned from having at least one filter to having no filters
    const hadFiltersBefore = prevCountriesLengthRef.current > 0 || 
                             prevThemesLengthRef.current > 0 || 
                             prevTagsLengthRef.current > 0 || 
                             prevDateRangeRef.current;
    
    // If we had filters before and now all filters are empty, reset to default state
    if (hadFiltersBefore && allFiltersEmpty) {
      // Clear all filters and reset stores list to default state
      clearAllFilters();
    }
    
    // Update refs for next comparison
    prevCountriesLengthRef.current = selectedCountries.length;
    prevThemesLengthRef.current = selectedThemes.length;
    prevTagsLengthRef.current = selectedTags.length;
    prevDateRangeRef.current = !!(dateFrom && dateTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountries.length, selectedThemes.length, selectedTags.length, dateFrom, dateTo]);

  // Calculate total active filters count for display
  const activeFiltersCount = selectedCountries.length + selectedThemes.length + selectedTags.length + (dateFrom && dateTo ? 1 : 0);

  const applyFilters = (overrideDateFrom = null, overrideDateTo = null) => {
    const fromDate = overrideDateFrom !== null ? overrideDateFrom : dateFrom;
    const toDate = overrideDateTo !== null ? overrideDateTo : dateTo;
    
    // Calculate total filter count: each selected item counts as 1 usage event
    // Countries: count each selected country
    // Themes: count each selected theme
    // Tags: count each selected tag
    // Date range: count as 1 if both dates are set
    const filterCount = selectedCountries.length + selectedThemes.length + selectedTags.length + (fromDate && toDate ? 1 : 0);
    
    const filtersToApply = {
      countries: selectedCountries,
      themes: selectedThemes,
      tags: selectedTags,
      dateRange: fromDate && toDate ? { from: fromDate, to: toDate } : null,
      filterCount: filterCount // Pass the total filter count for usage tracking
    };
    
    console.log('🔍 Applying filters:', filtersToApply, `(Total filter count: ${filterCount})`);
    onFiltersChange(filtersToApply);
    setActiveDropdown(null);
  };

  const clearAllFilters = () => {
    setSelectedCountries([]);
    setSelectedThemes([]);
    setSelectedTags([]);
    setDateFrom("");
    setDateTo("");
    onFiltersChange({ countries: [], themes: [], tags: [], dateRange: null });
  };

  const selectAllCountries = (countries) => {
    setSelectedCountries(prev => {
      const newSelection = [...prev];
      countries.forEach(c => {
        if (!newSelection.includes(c)) newSelection.push(c);
      });
      return newSelection;
    });
  };

  return (
    <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6 md:p-8 mb-6 overflow-visible shadow-lg transition-all hover:shadow-xl">
      {/* Header with active filter count */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Filter className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-light text-foreground">Filters</h2>
            {activeFiltersCount > 0 && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {activeFiltersCount} {activeFiltersCount === 1 ? 'filter' : 'filters'} active
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Country Filter */}
        <div className="relative filter-control" ref={countryDropdownRef}>
          <button
            onClick={() => {
              if (userPlan === 'free') {
                setShowUpgradePopup(true);
                return;
              }
              setActiveDropdown(activeDropdown === "country" ? null : "country");
            }}
            className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all ${
              activeDropdown === "country"
                ? "bg-primary/5 border-primary/50 shadow-md"
                : selectedCountries.length > 0
                ? "bg-primary/5 border-primary/30 hover:border-primary/50"
                : "bg-background/50 border-border/50 hover:border-border hover:bg-background"
            }`}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <MapPin className={`w-4 h-4 flex-shrink-0 ${selectedCountries.length > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="flex-1 min-w-0 text-left">
                <div className="text-xs text-muted-foreground font-light mb-0.5">Countries</div>
                <div className="text-sm font-light text-foreground truncate">
                  {selectedCountries.length > 0 
                    ? `${selectedCountries.length} ${selectedCountries.length === 1 ? 'country' : 'countries'}` 
                    : "All countries"}
                </div>
              </div>
            </div>
            {selectedCountries.length > 0 && (
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-light flex items-center justify-center">
                {selectedCountries.length}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 flex-shrink-0 text-muted-foreground transition-transform ${activeDropdown === "country" ? "rotate-180" : ""}`} />
          </button>

          {activeDropdown === "country" && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border/80 rounded-xl max-h-[600px] overflow-hidden z-[100] animate-slide-down shadow-lg backdrop-blur-xl">
              <div className="p-3 border-b border-border/50">
                <input
                  type="text"
                  placeholder="Search countries..."
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  className="w-full bg-secondary/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="max-h-[550px] overflow-y-auto p-3 space-y-3">
                {filteredEuropeanCountries.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-light text-muted-foreground uppercase">Europe</span>
                      <button
                        onClick={() => selectAllCountries(filteredEuropeanCountries)}
                        className="text-xs text-primary hover:underline px-2 py-1 rounded border border-primary/30 hover:border-primary/60 hover:bg-primary/10 transition-all"
                      >
                        Select All
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {filteredEuropeanCountries.map(country => (
                        <button
                          key={country}
                          onClick={() => toggleCountry(country)}
                          className={`px-2 py-1 rounded text-xs transition-all border ${
                            selectedCountries.includes(country)
                              ? "bg-primary text-primary-foreground border-primary/50 hover:border-primary hover:shadow-md"
                              : "bg-secondary/50 text-foreground hover:bg-secondary border-border/50 hover:border-primary/50 hover:shadow-sm"
                          }`}
                        >
                          {country}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {filteredAmericanCountries.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-light text-muted-foreground uppercase">Americas</span>
                      <button
                        onClick={() => selectAllCountries(filteredAmericanCountries)}
                        className="text-xs text-primary hover:underline px-2 py-1 rounded border border-primary/30 hover:border-primary/60 hover:bg-primary/10 transition-all"
                      >
                        Select All
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {filteredAmericanCountries.map(country => (
                        <button
                          key={country}
                          onClick={() => toggleCountry(country)}
                          className={`px-2 py-1 rounded text-xs transition-all border ${
                            selectedCountries.includes(country)
                              ? "bg-primary text-primary-foreground border-primary/50 hover:border-primary hover:shadow-md"
                              : "bg-secondary/50 text-foreground hover:bg-secondary border-border/50 hover:border-primary/50 hover:shadow-sm"
                          }`}
                        >
                          {country}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {filteredAsianCountries.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-light text-muted-foreground uppercase">Asia</span>
                      <button
                        onClick={() => selectAllCountries(filteredAsianCountries)}
                        className="text-xs text-primary hover:underline px-2 py-1 rounded border border-primary/30 hover:border-primary/60 hover:bg-primary/10 transition-all"
                      >
                        Select All
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {filteredAsianCountries.map(country => (
                        <button
                          key={country}
                          onClick={() => toggleCountry(country)}
                          className={`px-2 py-1 rounded text-xs transition-all border ${
                            selectedCountries.includes(country)
                              ? "bg-primary text-primary-foreground border-primary/50 hover:border-primary hover:shadow-md"
                              : "bg-secondary/50 text-foreground hover:bg-secondary border-border/50 hover:border-primary/50 hover:shadow-sm"
                          }`}
                        >
                          {country}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {filteredMiddleEastCountries.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-light text-muted-foreground uppercase">Middle East</span>
                      <button
                        onClick={() => selectAllCountries(filteredMiddleEastCountries)}
                        className="text-xs text-primary hover:underline px-2 py-1 rounded border border-primary/30 hover:border-primary/60 hover:bg-primary/10 transition-all"
                      >
                        Select All
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {filteredMiddleEastCountries.map(country => (
                        <button
                          key={country}
                          onClick={() => toggleCountry(country)}
                          className={`px-2 py-1 rounded text-xs transition-all border ${
                            selectedCountries.includes(country)
                              ? "bg-primary text-primary-foreground border-primary/50 hover:border-primary hover:shadow-md"
                              : "bg-secondary/50 text-foreground hover:bg-secondary border-border/50 hover:border-primary/50 hover:shadow-sm"
                          }`}
                        >
                          {country}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {filteredAfricanCountries.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-light text-muted-foreground uppercase">Africa</span>
                      <button
                        onClick={() => selectAllCountries(filteredAfricanCountries)}
                        className="text-xs text-primary hover:underline px-2 py-1 rounded border border-primary/30 hover:border-primary/60 hover:bg-primary/10 transition-all"
                      >
                        Select All
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {filteredAfricanCountries.map(country => (
                        <button
                          key={country}
                          onClick={() => toggleCountry(country)}
                          className={`px-2 py-1 rounded text-xs transition-all border ${
                            selectedCountries.includes(country)
                              ? "bg-primary text-primary-foreground border-primary/50 hover:border-primary hover:shadow-md"
                              : "bg-secondary/50 text-foreground hover:bg-secondary border-border/50 hover:border-primary/50 hover:shadow-sm"
                          }`}
                        >
                          {country}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {filteredOceaniaCountries.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-light text-muted-foreground uppercase">Oceania</span>
                      <button
                        onClick={() => selectAllCountries(filteredOceaniaCountries)}
                        className="text-xs text-primary hover:underline px-2 py-1 rounded border border-primary/30 hover:border-primary/60 hover:bg-primary/10 transition-all"
                      >
                        Select All
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {filteredOceaniaCountries.map(country => (
                        <button
                          key={country}
                          onClick={() => toggleCountry(country)}
                          className={`px-2 py-1 rounded text-xs transition-all border ${
                            selectedCountries.includes(country)
                              ? "bg-primary text-primary-foreground border-primary/50 hover:border-primary hover:shadow-md"
                              : "bg-secondary/50 text-foreground hover:bg-secondary border-border/50 hover:border-primary/50 hover:shadow-sm"
                          }`}
                        >
                          {country}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Date Filter */}
        <div className="relative filter-control" ref={dateDropdownRef}>
          <button
            onClick={() => {
              if (userPlan === 'free') {
                setShowUpgradePopup(true);
                return;
              }
              setActiveDropdown(activeDropdown === "date" ? null : "date");
            }}
            className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all ${
              activeDropdown === "date"
                ? "bg-primary/5 border-primary/50 shadow-md"
                : dateFrom && dateTo
                ? "bg-primary/5 border-primary/30 hover:border-primary/50"
                : "bg-background/50 border-border/50 hover:border-border hover:bg-background"
            }`}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <CalendarDays className={`w-4 h-4 flex-shrink-0 ${dateFrom && dateTo ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="flex-1 min-w-0 text-left">
                <div className="text-xs text-muted-foreground font-light mb-0.5">Date Range</div>
                <div className="text-sm font-light text-foreground truncate">
                  {dateFrom && dateTo ? `${dateFrom} - ${dateTo}` : "Select dates"}
                </div>
              </div>
            </div>
            {dateFrom && dateTo && (
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-light flex items-center justify-center">
                1
              </span>
            )}
            <ChevronDown className={`w-4 h-4 flex-shrink-0 text-muted-foreground transition-transform ${activeDropdown === "date" ? "rotate-180" : ""}`} />
          </button>

          {activeDropdown === "date" && (
            <div className="absolute top-full left-0 mt-2 z-[100] animate-slide-down" style={{ minWidth: '600px' }}>
              <DateRangePicker
                dateFrom={dateFrom}
                dateTo={dateTo}
                onDateChange={(from, to) => {
                  setDateFrom(from);
                  setDateTo(to);
                  // Auto-close when both dates are selected (don't auto-apply)
                  if (from && to) {
                    setTimeout(() => setActiveDropdown(null), 100);
                  }
                }}
                onCancel={() => setActiveDropdown(null)}
                onApply={null}
              />
            </div>
          )}
        </div>

        {/* Theme Filter */}
        <div className="relative filter-control" ref={themeDropdownRef}>
          <button
            onClick={() => {
              if (userPlan === 'free') {
                setShowUpgradePopup(true);
                return;
              }
              setActiveDropdown(activeDropdown === "theme" ? null : "theme");
            }}
            className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all ${
              activeDropdown === "theme"
                ? "bg-primary/5 border-primary/50 shadow-md"
                : selectedThemes.length > 0
                ? "bg-primary/5 border-primary/30 hover:border-primary/50"
                : "bg-background/50 border-border/50 hover:border-border hover:bg-background"
            }`}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Palette className={`w-4 h-4 flex-shrink-0 ${selectedThemes.length > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="flex-1 min-w-0 text-left">
                <div className="text-xs text-muted-foreground font-light mb-0.5">Themes</div>
                <div className="text-sm font-light text-foreground truncate">
                  {selectedThemes.length > 0 
                    ? `${selectedThemes.length} ${selectedThemes.length === 1 ? 'theme' : 'themes'}` 
                    : "All themes"}
                </div>
              </div>
            </div>
            {selectedThemes.length > 0 && (
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-light flex items-center justify-center">
                {selectedThemes.length}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 flex-shrink-0 text-muted-foreground transition-transform ${activeDropdown === "theme" ? "rotate-180" : ""}`} />
          </button>

          {activeDropdown === "theme" && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border/80 rounded-xl max-h-80 overflow-hidden z-[100] animate-slide-down shadow-lg backdrop-blur-xl">
              <div className="p-3 border-b border-border/50">
                <input
                  type="text"
                  placeholder="Search themes..."
                  value={themeSearch}
                  onChange={(e) => setThemeSearch(e.target.value)}
                  className="w-full bg-secondary/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="max-h-52 overflow-y-auto p-3 space-y-3">
                {filteredFreeThemes.length > 0 && (
                  <div>
                    <span className="text-xs font-light text-muted-foreground uppercase block mb-2">Free Themes</span>
                    <div className="flex flex-wrap gap-1.5">
                      {filteredFreeThemes.map((theme, index) => (
                        <button
                          key={`free-theme-${theme}-${index}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleTheme(theme);
                          }}
                          className={`px-2 py-1 rounded text-xs transition-all border ${
                            selectedThemes.includes(theme)
                              ? "bg-primary text-primary-foreground border-primary/50 hover:border-primary hover:shadow-md"
                              : "bg-secondary/50 text-foreground hover:bg-secondary border-border/50 hover:border-primary/50 hover:shadow-sm"
                          }`}
                        >
                          {theme}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {filteredPaidThemes.length > 0 && (
                  <div>
                    <span className="text-xs font-light text-muted-foreground uppercase block mb-2">Premium Themes</span>
                    <div className="flex flex-wrap gap-1.5">
                      {filteredPaidThemes.map((theme, index) => (
                        <button
                          key={`paid-theme-${theme}-${index}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleTheme(theme);
                          }}
                          className={`px-2 py-1 rounded text-xs transition-all border ${
                            selectedThemes.includes(theme)
                              ? "bg-primary text-primary-foreground border-primary/50 hover:border-primary hover:shadow-md"
                              : "bg-secondary/50 text-foreground hover:bg-secondary border-border/50 hover:border-primary/50 hover:shadow-sm"
                          }`}
                        >
                          {theme}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tag Filter */}
        <div className="relative filter-control" ref={tagDropdownRef}>
          <button
            onClick={() => {
              if (userPlan === 'free') {
                setShowUpgradePopup(true);
                return;
              }
              setActiveDropdown(activeDropdown === "tag" ? null : "tag");
            }}
            className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all ${
              activeDropdown === "tag"
                ? "bg-primary/5 border-primary/50 shadow-md"
                : selectedTags.length > 0
                ? "bg-primary/5 border-primary/30 hover:border-primary/50"
                : "bg-background/50 border-border/50 hover:border-border hover:bg-background"
            }`}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Tag className={`w-4 h-4 flex-shrink-0 ${selectedTags.length > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="flex-1 min-w-0 text-left">
                <div className="text-xs text-muted-foreground font-light mb-0.5">Tags</div>
                <div className="text-sm font-light text-foreground truncate">
                  {selectedTags.length > 0 
                    ? `${selectedTags.length} ${selectedTags.length === 1 ? 'tag' : 'tags'}` 
                    : "All tags"}
                </div>
              </div>
            </div>
            {selectedTags.length > 0 && (
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-light flex items-center justify-center">
                {selectedTags.length}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 flex-shrink-0 text-muted-foreground transition-transform ${activeDropdown === "tag" ? "rotate-180" : ""}`} />
          </button>

          {activeDropdown === "tag" && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border/80 rounded-xl p-3 z-[100] animate-slide-down shadow-lg backdrop-blur-xl">
              <div className="space-y-2">
                {availableTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all border ${
                      selectedTags.includes(tag)
                        ? "bg-primary text-primary-foreground border-primary/50 hover:border-primary hover:shadow-md"
                        : "bg-secondary/50 text-foreground hover:bg-secondary border-border/50 hover:border-primary/50 hover:shadow-sm"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active Filters Display */}
      {(selectedCountries.length > 0 || selectedThemes.length > 0 || selectedTags.length > 0 || (dateFrom && dateTo)) && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-light text-muted-foreground">Active Filters</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedCountries.map(country => (
              <span key={country} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm border border-primary/30 hover:border-primary/50 hover:bg-primary/15 transition-all">
                <MapPin className="w-3.5 h-3.5" />
                {country}
                <button
                  onClick={() => toggleCountry(country)}
                  className="ml-0.5 hover:bg-primary/20 rounded p-0.5 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
            {selectedThemes.map((theme, index) => (
              <span key={`selected-theme-${theme}-${index}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm border border-primary/30 hover:border-primary/50 hover:bg-primary/15 transition-all">
                <Palette className="w-3.5 h-3.5 text-primary" />
                {theme}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleTheme(theme);
                  }}
                  className="ml-0.5 hover:bg-primary/20 rounded p-0.5 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
            {selectedTags.map(tag => (
              <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm border border-primary/30 hover:border-primary/50 hover:bg-primary/15 transition-all">
                <Tag className="w-3.5 h-3.5" />
                {tag}
                <button
                  onClick={() => toggleTag(tag)}
                  className="ml-0.5 hover:bg-primary/20 rounded p-0.5 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
            {dateFrom && dateTo && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm border border-primary/30 hover:border-primary/50 hover:bg-primary/15 transition-all">
                <CalendarDays className="w-3.5 h-3.5" />
                {dateFrom} - {dateTo}
                <button
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                  }}
                  className="ml-0.5 hover:bg-primary/20 rounded p-0.5 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            applyFilters();
          }}
          disabled={activeFiltersCount === 0}
          className={`px-6 py-2.5 rounded-lg font-light text-sm transition-all flex items-center gap-2 ${
            activeFiltersCount === 0
              ? "bg-secondary/50 text-muted-foreground cursor-not-allowed"
              : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg"
          }`}
        >
          <Filter className="w-4 h-4" />
          Apply Filters
          {activeFiltersCount > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-primary-foreground/20 text-primary-foreground text-xs font-light">
              {activeFiltersCount}
            </span>
          )}
        </button>
        {activeFiltersCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="px-4 py-2.5 rounded-lg bg-transparent text-muted-foreground font-light text-sm hover:text-foreground border border-border/50 hover:border-border/70 transition-all flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>

      {/* Upgrade Popup */}
      <UpgradePopup
        isOpen={showUpgradePopup}
        onClose={() => setShowUpgradePopup(false)}
        feature="Filtering"
      />
    </div>
  );
};

