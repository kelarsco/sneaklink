import { Link } from "react-router-dom";

const Footer = () => {
  const links = {
    Product: ["Features", "Pricing", "API", "Changelog"],
    Resources: ["Documentation", "Blog", "Tutorials", "Case Studies"],
    Legal: [
      { name: "Privacy Policy", path: "/privacy-policy" },
      { name: "Terms of Service", path: "/terms-of-service" },
      { name: "Refund Policy", path: "/refund-policy" },
    ],
  };

  return (
    <footer className="py-16 border-t border-border">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <a href="#" className="flex items-center gap-2 mb-4" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-normal text-sm">SL</span>
              </div>
              <span className="text-xl font-normal text-foreground">SneakLink</span>
            </a>
            <p className="text-sm text-muted-foreground">
              The ultimate Shopify store discovery tool for researchers and analysts.
            </p>
          </div>

          {/* Links */}
          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h4 className="font-normal text-foreground mb-4">{category}</h4>
              <ul className="space-y-3">
                {items.map((item) => {
                  const itemName = typeof item === 'string' ? item : item.name;
                  const itemPath = typeof item === 'object' ? item.path : '#';
                  
                  if (category === 'Legal' && typeof item === 'object') {
                    return (
                      <li key={itemName}>
                        <Link to={itemPath} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                          {itemName}
                        </Link>
                      </li>
                    );
                  }
                  
                  return (
                    <li key={itemName}>
                      <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {itemName}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2025 SneakLink. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

