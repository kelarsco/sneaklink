import { X, Crown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";

export const UpgradePopup = ({ isOpen, onClose, feature = "this feature", customMessage = null }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleUpgrade = () => {
    onClose();
    navigate("/account?tab=plans");
  };

  // Safety check for document.body in SSR environments
  if (typeof document === 'undefined' || !document.body) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[10003] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border/80 rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-slide-up backdrop-blur-xl relative z-[10004]">
        {/* Header */}
        <div className="relative p-6 border-b border-border/50">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-secondary transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Crown className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Upgrade to Premium</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Unlock all features
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-foreground mb-6">
            {customMessage || (
              feature === "this feature" 
                ? "This feature is only available for premium users. Upgrade your plan to access filtering, exports, and more."
                : `${feature} is only available for premium users. Upgrade your plan to unlock this feature.`
            )}
          </p>

          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Crown className="w-3 h-3 text-primary" />
              </div>
              <span className="text-foreground">Unlimited filter queries</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Crown className="w-3 h-3 text-primary" />
              </div>
              <span className="text-foreground">CSV exports</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Crown className="w-3 h-3 text-primary" />
              </div>
              <span className="text-foreground">Bulk copy links</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Crown className="w-3 h-3 text-primary" />
              </div>
              <span className="text-foreground">Advanced filtering options</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Maybe Later
            </Button>
            <Button
              onClick={handleUpgrade}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              Upgrade Now
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
