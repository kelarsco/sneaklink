import { Copy, ExternalLink, MapPin, Palette, Calendar } from "lucide-react";
import { Store } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";

interface StoreCardProps {
  store: Store;
  viewMode: "grid" | "list";
}

export const StoreCard = ({ store, viewMode }: StoreCardProps) => {
  const copyLink = () => {
    navigator.clipboard.writeText(store.url);
    toast({
      title: "Link copied!",
      description: `${store.name} URL copied to clipboard`,
    });
  };

  const visitStore = () => {
    window.open(store.url, "_blank");
  };

  if (viewMode === "list") {
    return (
      <div className="glass-panel rounded-lg p-3 flex items-center hover:border-primary/30 transition-all group">
        <a 
          href={store.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline truncate flex-1"
        >
          {store.url}
        </a>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 hover:border-primary/30 transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <span className="text-primary font-bold text-lg">{store.name.charAt(0)}</span>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={copyLink}
            className="p-2 rounded-lg bg-secondary/50 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            title="Copy link"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={visitStore}
            className="p-2 rounded-lg bg-secondary/50 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            title="Visit store"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors truncate">
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
          <span>{store.theme}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5 text-primary/70" />
          <span>{store.dateAdded}</span>
        </div>
      </div>
    </div>
  );
};
