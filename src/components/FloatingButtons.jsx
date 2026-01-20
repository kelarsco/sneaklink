import { useState, useEffect } from "react";
import { MessageCircle, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { ContactSupportModal } from "@/components/homepage/ContactSupportModal";
import { cn } from "@/lib/utils";

export const FloatingButtons = () => {
  const [showSupportModal, setShowSupportModal] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Handle theme mounting to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const isDark = theme === "dark";

  return (
    <>
      {/* Floating Buttons Container */}
      <div className="fixed bottom-[46px] right-4 md:bottom-[54px] md:right-6 z-50 flex flex-col gap-3">
        {/* Theme Toggle Button */}
        <Button
          onClick={toggleTheme}
          size="icon"
          className={cn(
            "h-12 w-12 md:h-14 md:w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300",
            "bg-card border border-border/50 backdrop-blur-sm",
            "hover:scale-110 active:scale-95",
            "flex items-center justify-center"
          )}
          aria-label="Toggle theme"
        >
          {mounted && isDark ? (
            <Sun className="h-5 w-5 text-foreground" />
          ) : (
            <Moon className="h-5 w-5 text-foreground" />
          )}
        </Button>

        {/* Customer Support Button */}
        <Button
          onClick={() => setShowSupportModal(true)}
          size="icon"
          className={cn(
            "h-12 w-12 md:h-14 md:w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300",
            "bg-primary text-primary-foreground",
            "hover:scale-110 active:scale-95",
            "flex items-center justify-center",
            "relative"
          )}
          aria-label="Contact support"
        >
          <MessageCircle className="h-5 w-5" />
          {/* Pulse animation for attention */}
          <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20" />
        </Button>
      </div>

      {/* Support Modal */}
      <ContactSupportModal
        open={showSupportModal}
        onOpenChange={setShowSupportModal}
        accountStatus={null}
      />
    </>
  );
};

