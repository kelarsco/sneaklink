import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import dashboardPreview from "@/assets/images/dashboard-preview.png";
import dashboardPreviewt from "@/assets/images/dashboard-preview-wt.png";
import { useNavigate } from "react-router-dom";

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-visible" style={{ paddingTop: '15vh', paddingBottom: '2rem' }}>
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center mb-12">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel mb-8 opacity-0 animate-fade-up">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Discover 3M+ Shopify Stores</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-normal mb-6 opacity-0 animate-fade-up animation-delay-200">
            <span className="text-foreground">Unlock Hidden </span>
            <span className="gradient-text">Shopify Stores</span>
            <span className="text-foreground"> Instantly</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 opacity-0 animate-fade-up animation-delay-400">
            Generate direct links to any Shopify store. Perfect for market research, 
            competitor analysis, and discovering new eCommerce opportunities.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 opacity-0 animate-fade-up animation-delay-600">
            <Button 
              size="lg" 
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-normal px-8 py-6 text-lg"
              onClick={() => navigate("/dashboard")}
            >
              Start Free Trial
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-border hover:bg-secondary hover:text-white font-normal px-8 py-6 text-lg"
              onClick={() => {
                const dashboardSection = document.getElementById('dashboard');
                if (dashboardSection) {
                  dashboardSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              View Demo
            </Button>
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className="relative max-w-6xl mx-auto opacity-0 animate-fade-up animation-delay-600 mb-20">
          <div className="glass-panel p-2 md:p-4 glow-effect animate-glow-pulse">
        
             <img 
       src={dashboardPreview}
        alt="SneakLink Logo" 
                className="w-full rounded-xl shadow-2xl hidden dark:block"

      />
      <img 
        src={dashboardPreviewt}
        alt="SneakLink Logo" className="w-full rounded-xl dark:hidden"

      />
          </div>
        </div>
        
        {/* Floating Stats - Moved outside to ensure visibility */}
        <div className="relative -mt-16 mb-8 flex justify-center gap-4 md:gap-8 z-50">
          <div className="glass-panel-strong px-6 py-3 text-center shadow-lg">
            <div className="text-2xl font-normal text-primary">5,000+</div>
            <div className="text-xs text-muted-foreground">Daily Updates</div>
          </div>
          <div className="glass-panel-strong px-6 py-3 text-center shadow-lg">
            <div className="text-2xl font-normal text-primary">3M+</div>
            <div className="text-xs text-muted-foreground">Active Stores</div>
          </div>
          <div className="glass-panel-strong px-6 py-3 text-center hidden sm:block shadow-lg">
            <div className="text-2xl font-normal text-primary">20+</div>
            <div className="text-xs text-muted-foreground">Data Points</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

