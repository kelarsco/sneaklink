import { Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const plans = [
  {
    name: "Starter",
    price: "$49",
    period: "monthly",
    description: "Perfect for individual researchers",
    features: [
      "1,000 filter queries monthly",
      "2 CSV exports daily",
      "2 copy operations daily",
      "1 device",
      "200 links per CSV",
      "Access to all filters",
    ],
    popular: false,
    currentPlan: false, // Set to true if this is the user's current plan
  },
  {
    name: "Pro",
    price: "$79",
    period: "monthly",
    description: "Best for growing teams",
    features: [
      "10,000 filter queries monthly",
      "10 CSV exports daily",
      "5 copy operations daily",
      "Up to 3 devices",
      "500 links per CSV",
      "Priority support",
    ],
    popular: true,
    buttonText: "Subscribe Now",
  },
  {
    name: "Enterprise",
    price: "$199",
    period: "monthly",
    description: "For large organizations",
    features: [
      "Unlimited filter queries",
      "Unlimited CSV exports",
      "Unlimited copy operations",
      "Up to 10 devices",
      "Unlimited links per CSV",
      "Dedicated support",
    ],
    popular: false,
  },
];

const Pricing = () => {
  const navigate = useNavigate();

  return (
    <section id="pricing" className="py-24 relative">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px]" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-primary text-sm font-normal uppercase tracking-wider">Pricing</span>
          <h2 className="text-3xl md:text-5xl font-normal mt-4 mb-6 text-foreground">
            Simple, <span className="gradient-text">Transparent</span> Pricing
          </h2>
          <p className="text-muted-foreground text-lg">
            Choose the plan that fits your research needs.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`glass-panel p-8 relative flex flex-col h-full ${
                plan.popular ? "border-primary glow-effect" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-xs font-normal px-3 py-1 rounded-full">
                    <Zap className="w-3 h-3" />
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-normal text-foreground mb-2">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-normal text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </div>

              {plan.currentPlan && (
                <div className="mb-6">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-normal bg-primary/10 text-primary border border-primary/20">
                    Current Plan
                  </span>
                </div>
              )}

              <ul className="space-y-3 mb-6 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-primary shrink-0" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-4">
                <Button
                  className={`w-full font-normal ${
                    plan.popular
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                  onClick={() => navigate("/dashboard")}
                >
                  {plan.buttonText || "Get Started"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;

