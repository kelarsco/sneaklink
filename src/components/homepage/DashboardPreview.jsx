import { Filter, Download, Globe } from "lucide-react";
import dashboardPreview from "@/assets/dashboard-preview.png";

const features = [
  { icon: Filter, label: "Advanced Filters", description: "Filter by country, theme, date, and tags" },
  { icon: Globe, label: "Global Coverage", description: "Access stores from 190+ countries" },
  { icon: Download, label: "Export Data", description: "Export to CSV for further analysis" },
];

const DashboardPreview = () => {
  return (
    <section id="dashboard" className="py-24 relative">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-primary text-sm font-normal uppercase tracking-wider">Dashboard</span>
          <h2 className="text-3xl md:text-5xl font-normal mt-4 mb-6 text-foreground">
            Everything You Need in <span className="gradient-text">One Place</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            A powerful, intuitive dashboard designed for efficient store discovery and data export.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          {/* Features List */}
          <div className="space-y-6 order-2 lg:order-1">
            {features.map((feature) => {
              const IconComponent = feature.icon;
              return (
                <div key={feature.label} className="flex items-start gap-4 glass-panel p-5 hover:border-primary/30 transition-colors">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <IconComponent className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-normal text-foreground mb-1">{feature.label}</h4>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dashboard Image */}
          <div className="order-1 lg:order-2">
            <div className="glass-panel p-3 glow-effect">
              <img
                src={dashboardPreview}
                alt="SneakLink Dashboard Interface"
                className="w-full rounded-xl"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DashboardPreview;

