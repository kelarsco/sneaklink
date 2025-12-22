import { Search, BarChart3, Users, TrendingUp } from "lucide-react";

const useCases = [
  {
    icon: Search,
    title: "Market Research",
    description: "Discover emerging trends and analyze market dynamics by exploring thousands of Shopify stores across different niches.",
  },
  {
    icon: BarChart3,
    title: "Competitor Analysis",
    description: "Stay ahead of competition by tracking competitor stores, their products, pricing strategies, and marketing approaches.",
  },
  {
    icon: Users,
    title: "Lead Generation",
    description: "Build targeted outreach lists by filtering stores by location, theme, product category, and more.",
  },
  {
    icon: TrendingUp,
    title: "Investment Research",
    description: "Identify high-potential eCommerce businesses for investment opportunities with detailed store analytics.",
  },
];

const UseCases = () => {
  return (
    <section id="use-cases" className="py-24 relative">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-0 w-72 h-72 bg-primary/10 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-primary text-sm font-normal uppercase tracking-wider">Use Cases</span>
          <h2 className="text-3xl md:text-5xl font-normal mt-4 mb-6 text-foreground">
            Powerful Research <span className="gradient-text">Made Simple</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Whether you're an entrepreneur, marketer, or analyst, SneakLink provides the insights you need.
          </p>
        </div>

        {/* Use Case Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {useCases.map((useCase, index) => {
            const IconComponent = useCase.icon;
            return (
              <div
                key={useCase.title}
                className="glass-panel p-8 hover:border-primary/50 transition-all duration-300 group"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <IconComponent className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-normal mb-3 text-foreground">{useCase.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{useCase.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default UseCases;

