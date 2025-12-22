import { useState } from "react";
import { Copy, ExternalLink, MapPin, Palette, Calendar, Globe } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

// Country name to ISO 3166-1 alpha-2 code mapping
const getCountryCode = (countryName) => {
  const countryMap = {
    "United States": "US",
    "United Kingdom": "GB",
    "Germany": "DE",
    "Canada": "CA",
    "France": "FR",
    "Spain": "ES",
    "Netherlands": "NL",
    "Australia": "AU",
    "Switzerland": "CH",
    "Norway": "NO",
    "Italy": "IT",
    "Brazil": "BR",
    "Sweden": "SE",
    "Japan": "JP",
    "Ireland": "IE",
    "Belgium": "BE",
    "Poland": "PL",
    "Albania": "AL",
    "Andorra": "AD",
    "Austria": "AT",
    "Belarus": "BY",
    "Bosnia and Herzegovina": "BA",
    "Bulgaria": "BG",
    "Croatia": "HR",
    "Cyprus": "CY",
    "Czech Republic": "CZ",
    "Denmark": "DK",
    "Estonia": "EE",
    "Finland": "FI",
    "Greece": "GR",
    "Hungary": "HU",
    "Iceland": "IS",
    "Kosovo": "XK",
    "Latvia": "LV",
    "Liechtenstein": "LI",
    "Lithuania": "LT",
    "Luxembourg": "LU",
    "Malta": "MT",
    "Moldova": "MD",
    "Monaco": "MC",
    "Montenegro": "ME",
    "North Macedonia": "MK",
    "Portugal": "PT",
    "Romania": "RO",
    "Russia": "RU",
    "San Marino": "SM",
    "Serbia": "RS",
    "Slovakia": "SK",
    "Slovenia": "SI",
    "Ukraine": "UA",
    "Vatican City": "VA",
    "Mexico": "MX",
    "Argentina": "AR",
    "Chile": "CL",
    "Colombia": "CO",
    "Peru": "PE",
    "Venezuela": "VE",
    "Ecuador": "EC",
    "Bolivia": "BO",
    "Paraguay": "PY",
    "Uruguay": "UY",
    "Guyana": "GY",
    "Suriname": "SR",
    "Costa Rica": "CR",
    "Panama": "PA",
    "Cuba": "CU",
    "Dominican Republic": "DO",
    "Puerto Rico": "PR",
    "Jamaica": "JM",
    "Trinidad and Tobago": "TT",
    "Bahamas": "BS",
    "Barbados": "BB",
    "Belize": "BZ",
    "El Salvador": "SV",
    "Guatemala": "GT",
    "Haiti": "HT",
    "Honduras": "HN",
    "Nicaragua": "NI",
    "India": "IN",
  };
  return countryMap[countryName] || "XX";
};

export const StoreCard = ({ store, viewMode, onUpgradeClick }) => {
  const [logoError, setLogoError] = useState(false);
  const { user } = useAuth();
  const userPlan = user?.subscription?.plan || 'free';
  
  const copyLink = () => {
    // Free users cannot copy links
    if (userPlan === 'free') {
      onUpgradeClick?.();
      return;
    }
    
    navigator.clipboard.writeText(store.url);
    toast({
      title: "Link copied!",
      description: `${store.name} URL copied to clipboard`,
    });
  };

  const visitStore = (e) => {
    // Free users cannot open links
    if (userPlan === 'free') {
      e?.preventDefault();
      onUpgradeClick?.();
      return;
    }
    
    window.open(store.url, "_blank");
  };

  const handleLinkClick = (e) => {
    // Free users cannot open links
    if (userPlan === 'free') {
      e.preventDefault();
      onUpgradeClick?.();
      return false;
    }
    return true;
  };

  const countryCode = getCountryCode(store.country);
  const productCount = store.productCount || 0;

  // Format date to mm-dd-yy format
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = String(date.getFullYear()).slice(-2);
      return `${month}-${day}-${year}`;
    } catch (error) {
      return dateString;
    }
  };

  if (viewMode === "list") {

    return (
      <div className="glass-panel rounded-lg p-3 flex items-center gap-3 hover:border-primary/50 hover:shadow-lg transition-all group border border-border/50">
        {/* Logo on the left */}
        <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-secondary/50 flex items-center justify-center relative">
          {store.logo && !logoError ? (
            <img 
              src={store.logo} 
              alt={store.name}
              className="w-full h-full object-cover"
              onError={() => setLogoError(true)}
            />
          ) : (
            <Globe className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        
        {/* Store URL in the middle */}
        <a 
          href={userPlan === 'free' ? '#' : store.url} 
          target={userPlan === 'free' ? undefined : "_blank"}
          rel={userPlan === 'free' ? undefined : "noopener noreferrer"}
          onClick={handleLinkClick}
          className={`text-sm truncate flex-1 ${
            userPlan === 'free' 
              ? 'text-muted-foreground cursor-not-allowed' 
              : 'text-primary hover:underline cursor-pointer'
          }`}
        >
          {store.url}
        </a>
        
        {/* Country code and product count on the right */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
          <span>{countryCode}</span>
          <span>{productCount}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 transition-all group border border-border/50">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <span className="text-primary font-semibold text-lg">{store.name.charAt(0)}</span>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={copyLink}
            className="p-2 rounded-lg bg-secondary/50 text-muted-foreground hover:text-primary hover:bg-primary/10 border border-border/50 hover:border-primary/30 transition-all"
            title="Copy link"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={visitStore}
            className="p-2 rounded-lg bg-secondary/50 text-muted-foreground hover:text-primary hover:bg-primary/10 border border-border/50 hover:border-primary/30 transition-all"
            title="Visit store"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      <h3 className="font-medium text-foreground mb-1 group-hover:text-primary transition-colors truncate">
        {store.name}
      </h3>
      <p className="text-xs text-muted-foreground mb-4 truncate">{store.url}</p>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 text-primary/70" />
          <span>{store.country}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Palette className="w-3.5 h-3.5 text-primary/70" />
          <span>{store.theme || 'Dawn'}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5 text-primary/70" />
          <span>{formatDate(store.dateAdded)}</span>
        </div>
      </div>
    </div>
  );
};

