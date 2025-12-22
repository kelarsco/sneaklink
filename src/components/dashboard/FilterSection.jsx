import { useState, useRef, useEffect } from "react";
import { ChevronDown, X, CalendarDays, MapPin, Palette, Filter, RotateCcw } from "lucide-react";
import { europeanCountries, americanCountries, freeThemes, paidThemes } from "@/data/mockData";

export const FilterSection = ({ onFiltersChange }) => {
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [selectedThemes, setSelectedThemes] = useState([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [countrySearch, setCountrySearch] = useState("");
  const [themeSearch, setThemeSearch] = useState("");
  
  const countryDropdownRef = useRef(null);
  const dateDropdownRef = useRef(null);
  const themeDropdownRef = useRef(null);

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

  const filteredFreeThemes = freeThemes.filter(t => 
    t.toLowerCase().includes(themeSearch.toLowerCase())
  );
  const filteredPaidThemes = paidThemes.filter(t => 
    t.toLowerCase().includes(themeSearch.toLowerCase())
  );

  const toggleCountry = (country) => {
    setSelectedCountries(prev => 
      prev.includes(country) ? prev.filter(c => c !== country) : [...prev, country]
    );
  };

  const toggleTheme = (theme) => {
    setSelectedThemes(prev => 
      prev.includes(theme) ? prev.filter(t => t !== theme) : [...prev, theme]
    );
  };

  const applyFilters = () => {
    onFiltersChange({
      countries: selectedCountries,
      themes: selectedThemes,
      dateRange: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : null
    });
    setActiveDropdown(null);
  };

  const clearAllFilters = () => {
    setSelectedCountries([]);
    setSelectedThemes([]);
    setDateFrom("");
    setDateTo("");
    onFiltersChange({ countries: [], themes: [], dateRange: null });
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
    <div className="bg-card border border-border/80 rounded-xl p-6 mb-6 overflow-visible shadow-md transition-all">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5" style={{ color: 'hsl(187 100% 50%)' }} />
        <h2 className="text-lg font-semibold text-foreground">Filters</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Country Filter */}
        <div className="relative" ref={countryDropdownRef}>
          <button
            onClick={() => setActiveDropdown(activeDropdown === "country" ? null : "country")}
            className={`w-full glass-button flex items-center justify-between transition-all filter-button-country ${activeDropdown === "country" ? "active" : ""}`}
          >
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" style={{ color: 'hsl(187 100% 50%)' }} />
              <span className="text-sm text-foreground">
                {selectedCountries.length > 0 
                  ? `${selectedCountries.length} selected` 
                  : "Select Countries"}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-foreground transition-transform ${activeDropdown === "country" ? "rotate-180" : ""}`} />
          </button>

          {activeDropdown === "country" && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border/80 rounded-xl max-h-80 overflow-hidden z-[100] animate-slide-down shadow-lg backdrop-blur-xl">
              <div className="p-3 border-b border-border/50">
                <input
                  type="text"
                  placeholder="Search countries..."
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  className="w-full bg-secondary/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="max-h-52 overflow-y-auto p-3 space-y-3">
                {filteredEuropeanCountries.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase">Europe</span>
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
                      <span className="text-xs font-semibold text-muted-foreground uppercase">Americas</span>
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
              </div>
            </div>
          )}
        </div>

        {/* Date Filter */}
        <div className="relative" ref={dateDropdownRef}>
          <button
            onClick={() => setActiveDropdown(activeDropdown === "date" ? null : "date")}
            className={`w-full glass-button flex items-center justify-between transition-all filter-button-date ${activeDropdown === "date" ? "active" : ""}`}
          >
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4" style={{ color: 'hsl(187 100% 50%)' }} />
              <span className="text-sm text-foreground">
                {dateFrom && dateTo ? `${dateFrom} - ${dateTo}` : "Select Date Range"}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-foreground transition-transform ${activeDropdown === "date" ? "rotate-180" : ""}`} />
          </button>

          {activeDropdown === "date" && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border/80 rounded-xl p-4 z-[100] animate-slide-down shadow-lg backdrop-blur-xl">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full bg-secondary/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full bg-secondary/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <button
                onClick={() => { setDateFrom(""); setDateTo(""); }}
                className="w-full mt-3 px-3 py-1.5 rounded-lg text-xs bg-secondary/50 text-foreground hover:bg-secondary border border-border/50 hover:border-primary/50 hover:shadow-md transition-all"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Theme Filter */}
        <div className="relative" ref={themeDropdownRef}>
          <button
            onClick={() => setActiveDropdown(activeDropdown === "theme" ? null : "theme")}
            className={`w-full glass-button flex items-center justify-between transition-all filter-button-theme ${activeDropdown === "theme" ? "active" : ""}`}
          >
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4" style={{ color: 'hsl(187 100% 50%)' }} />
              <span className="text-sm text-foreground">
                {selectedThemes.length > 0 
                  ? `${selectedThemes.length} themes` 
                  : "Select Themes"}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-foreground transition-transform ${activeDropdown === "theme" ? "rotate-180" : ""}`} />
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
                    <span className="text-xs font-semibold text-muted-foreground uppercase block mb-2">Free Themes</span>
                    <div className="flex flex-wrap gap-1.5">
                      {filteredFreeThemes.map(theme => (
                        <button
                          key={theme}
                          onClick={() => toggleTheme(theme)}
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
                    <span className="text-xs font-semibold text-muted-foreground uppercase block mb-2">Premium Themes</span>
                    <div className="flex flex-wrap gap-1.5">
                      {filteredPaidThemes.map(theme => (
                        <button
                          key={theme}
                          onClick={() => toggleTheme(theme)}
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
      </div>

      {/* Selected Tags */}
      {(selectedCountries.length > 0 || selectedThemes.length > 0) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedCountries.map(country => (
            <span key={country} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/20 text-primary text-xs border border-primary/30 hover:border-primary/50 transition-all">
              {country}
              <X className="w-3 h-3 cursor-pointer hover:text-foreground hover:scale-110 transition-transform" onClick={() => toggleCountry(country)} />
            </span>
          ))}
          {selectedThemes.map(theme => (
            <span key={theme} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-accent/20 text-accent text-xs border border-accent/30 hover:border-accent/50 transition-all">
              {theme}
              <X className="w-3 h-3 cursor-pointer hover:text-foreground hover:scale-110 transition-transform" onClick={() => toggleTheme(theme)} />
            </span>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={applyFilters}
          className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-all"
        >
          Apply Filters
        </button>
        <button
          onClick={clearAllFilters}
          className="px-4 py-2.5 rounded-lg bg-transparent text-foreground font-medium text-sm hover:bg-transparent border border-border/50 hover:border-border/70 transition-all flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" style={{ color: 'hsl(187 100% 50%)' }} />
          Clear All
        </button>
      </div>
    </div>
  );
};

