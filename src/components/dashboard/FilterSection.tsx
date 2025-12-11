import { useState } from "react";
import { ChevronDown, X, Calendar, MapPin, Palette, Filter, RotateCcw } from "lucide-react";
import { europeanCountries, americanCountries, freeThemes, paidThemes } from "@/data/mockData";

interface FilterSectionProps {
  onFiltersChange: (filters: FilterState) => void;
}

export interface FilterState {
  countries: string[];
  themes: string[];
  dateRange: { from: string; to: string } | null;
}

export const FilterSection = ({ onFiltersChange }: FilterSectionProps) => {
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [countrySearch, setCountrySearch] = useState("");
  const [themeSearch, setThemeSearch] = useState("");

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

  const toggleCountry = (country: string) => {
    setSelectedCountries(prev => 
      prev.includes(country) ? prev.filter(c => c !== country) : [...prev, country]
    );
  };

  const toggleTheme = (theme: string) => {
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

  const selectAllCountries = (countries: string[]) => {
    setSelectedCountries(prev => {
      const newSelection = [...prev];
      countries.forEach(c => {
        if (!newSelection.includes(c)) newSelection.push(c);
      });
      return newSelection;
    });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 mb-6 overflow-visible shadow-md">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Filters</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Country Filter */}
        <div className="relative">
          <button
            onClick={() => setActiveDropdown(activeDropdown === "country" ? null : "country")}
            className="w-full glass-button flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-sm">
                {selectedCountries.length > 0 
                  ? `${selectedCountries.length} selected` 
                  : "Select Countries"}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${activeDropdown === "country" ? "rotate-180" : ""}`} />
          </button>

          {activeDropdown === "country" && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl max-h-80 overflow-hidden z-50 animate-slide-down shadow-lg">
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
                        className="text-xs text-primary hover:underline"
                      >
                        Select All
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {filteredEuropeanCountries.map(country => (
                        <button
                          key={country}
                          onClick={() => toggleCountry(country)}
                          className={`px-2 py-1 rounded text-xs transition-colors ${
                            selectedCountries.includes(country)
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary/50 text-foreground hover:bg-secondary"
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
                        className="text-xs text-primary hover:underline"
                      >
                        Select All
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {filteredAmericanCountries.map(country => (
                        <button
                          key={country}
                          onClick={() => toggleCountry(country)}
                          className={`px-2 py-1 rounded text-xs transition-colors ${
                            selectedCountries.includes(country)
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary/50 text-foreground hover:bg-secondary"
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
        <div className="relative">
          <button
            onClick={() => setActiveDropdown(activeDropdown === "date" ? null : "date")}
            className="w-full glass-button flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-sm">
                {dateFrom && dateTo ? `${dateFrom} - ${dateTo}` : "Select Date Range"}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${activeDropdown === "date" ? "rotate-180" : ""}`} />
          </button>

          {activeDropdown === "date" && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl p-4 z-50 animate-slide-down shadow-lg">
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
                className="w-full mt-3 px-3 py-1.5 rounded-lg text-xs bg-secondary/50 text-foreground hover:bg-secondary transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Theme Filter */}
        <div className="relative">
          <button
            onClick={() => setActiveDropdown(activeDropdown === "theme" ? null : "theme")}
            className="w-full glass-button flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" />
              <span className="text-sm">
                {selectedThemes.length > 0 
                  ? `${selectedThemes.length} themes` 
                  : "Select Themes"}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${activeDropdown === "theme" ? "rotate-180" : ""}`} />
          </button>

          {activeDropdown === "theme" && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl max-h-80 overflow-hidden z-50 animate-slide-down shadow-lg">
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
                          className={`px-2 py-1 rounded text-xs transition-colors ${
                            selectedThemes.includes(theme)
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary/50 text-foreground hover:bg-secondary"
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
                          className={`px-2 py-1 rounded text-xs transition-colors ${
                            selectedThemes.includes(theme)
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary/50 text-foreground hover:bg-secondary"
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
            <span key={country} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/20 text-primary text-xs">
              {country}
              <X className="w-3 h-3 cursor-pointer hover:text-foreground" onClick={() => toggleCountry(country)} />
            </span>
          ))}
          {selectedThemes.map(theme => (
            <span key={theme} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-accent/20 text-accent text-xs">
              {theme}
              <X className="w-3 h-3 cursor-pointer hover:text-foreground" onClick={() => toggleTheme(theme)} />
            </span>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={applyFilters}
          className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors glow-effect"
        >
          Apply Filters
        </button>
        <button
          onClick={clearAllFilters}
          className="px-4 py-2.5 rounded-lg bg-secondary/50 text-foreground font-medium text-sm hover:bg-secondary transition-colors flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Clear All
        </button>
      </div>
    </div>
  );
};
