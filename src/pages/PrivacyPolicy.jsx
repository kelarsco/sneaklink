import { useEffect } from "react";
import Header from "@/components/homepage/Header";
import Footer from "@/components/homepage/Footer";

const PrivacyPolicy = () => {
  // Always scroll to top when Privacy Policy page loads
  useEffect(() => {
    // Immediately scroll to top
    window.scrollTo(0, 0);
    // Also use requestAnimationFrame to ensure it happens after React Router's scroll restoration
    const scrollToTop = () => {
      window.scrollTo(0, 0);
    };
    requestAnimationFrame(scrollToTop);
    // Small delay to override any scroll restoration
    const timeoutId = setTimeout(() => {
      window.scrollTo(0, 0);
    }, 100);
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-12 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-light text-foreground mb-2">SneakLink Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: December 19, 2025</p>

          <div className="prose prose-invert max-w-none space-y-6 text-foreground">
            <p>
              SneakLink ("we", "our", "us") operates a comprehensive Shopify store research and discovery platform that helps users discover, analyze, and research Shopify stores. This Privacy Policy explains how we collect, use, disclose, and safeguard information when you use our website and services.
            </p>

            <section>
              <h2 className="text-2xl font-light text-foreground mt-8 mb-4">1. Summary (Quick Overview)</h2>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>We do not sell personal data and never help third parties advertise directly to you.</li>
                <li>SneakLink exists to help users research and discover Shopify stores for business intelligence and market analysis.</li>
                <li>We generate revenue through subscription plans (Free, Pro, Enterprise), not through data sales.</li>
                <li>We collect minimal personal information, primarily your email address and name for account management.</li>
                <li>We use trusted third-party service providers (Paystack for payments, email services) only for essential operations.</li>
                <li>We use cookies for functionality, security, and analytics to improve your experience.</li>
                <li>You can contact us at any time regarding privacy concerns or data requests.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mt-8 mb-4">2. Information We Collect (Data Controller)</h2>
              <h3 className="text-xl font-light text-foreground mt-6 mb-3">Personal Information You Provide</h3>
              <p className="text-muted-foreground">
                We collect only the following personal information:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Email address (required for account creation)</li>
                <li>Name (required for account creation)</li>
                <li>Subscription plan information (Free, Pro, or Enterprise)</li>
                <li>Payment information (processed securely through Paystack, not stored by us)</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                This information is used strictly for:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Account identification and login</li>
                <li>Transactional emails (account confirmation, receipts, service notices)</li>
                <li>Optional product updates or service-related communications (opt-in where required)</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                All processing is performed via automated electronic systems only.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mt-8 mb-4">3. Consent & Account Access</h2>
              <p className="text-muted-foreground">
                Providing your email address is optional; however:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Without it, you will not be able to create or access an account</li>
                <li>Sneaklink requires an email address to operate the service securely</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mt-8 mb-4">4. Third-Party Service Providers</h2>
              <p className="text-muted-foreground">
                We only share data when necessary to operate the platform:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li><strong>Email Delivery:</strong> Amazon Simple Email Service (SES)</li>
                <li><strong>Payments:</strong> Stripe and/or PayPal (Personal data is processed according to their privacy policies)</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                We may also disclose information if required to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Comply with legal obligations</li>
                <li>Enforce our Terms of Service</li>
                <li>Protect Sneaklink's legal rights</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                👉 We never share personal data for purposes outside those listed above.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mt-8 mb-4">5. Automatically Collected Information</h2>
              <h3 className="text-xl font-light text-foreground mt-6 mb-3">Indirect Data Collection</h3>
              <p className="text-muted-foreground">
                We may automatically collect:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>IP address</li>
                <li>Browser and device information</li>
                <li>Usage and interaction data</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                This data is used only for:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Security and fraud prevention</li>
                <li>Performance monitoring</li>
                <li>Improving user experience</li>
              </ul>
              <h3 className="text-xl font-light text-foreground mt-6 mb-3">Cookies & Tracking Technologies</h3>
              <p className="text-muted-foreground">
                Sneaklink uses cookies and similar technologies to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Enable core functionality</li>
                <li>Understand usage patterns</li>
                <li>Improve platform performance</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                You can manage cookies through your browser settings.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mt-8 mb-4">6. Data Security & Infrastructure</h2>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Our servers are located in the United States</li>
                <li>All servers handling personal data are HSTS-enabled</li>
                <li>Data is encrypted in transit using industry-standard security protocols</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mt-8 mb-4">7. Your Rights (GDPR & International Users)</h2>
              <p className="text-muted-foreground">
                If you are located in the EU or EEA, you have the right to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Access your personal data</li>
                <li>Request correction or deletion</li>
                <li>Restrict or object to processing</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                To exercise your rights, contact us using the details below.
              </p>
              <p className="text-muted-foreground mt-4">
                Please note: Your data may be transferred outside the EU, including to the United States, for processing and storage.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mt-8 mb-4">8. Data Retention</h2>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Account information is retained while your account is active</li>
                <li>You may request deletion at any time</li>
                <li>Certain records may be retained temporarily for legal or operational reasons</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mt-8 mb-4">9. Privacy Policy for Data Provided by Sneaklink (Third-Party Data Provider)</h2>
              <p className="text-muted-foreground">
                Sneaklink provides research data strictly related to Shopify stores.
              </p>
              <h3 className="text-xl font-light text-foreground mt-6 mb-3">What Data We Collect</h3>
              <p className="text-muted-foreground">
                We collect publicly available, non-sensitive data, including:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Shopify store URLs</li>
                <li>Themes and apps used</li>
                <li>Public business contact details (emails, social links, phone numbers)</li>
                <li>General company metadata</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                We do not provide private, gated, or non-public personal data.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mt-8 mb-4">10. How We Collect Store Data</h2>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>We scan public webpages only</li>
                <li>Our systems respect robots.txt rules</li>
                <li>We do not bypass access restrictions</li>
                <li>Data indexed is already discoverable by search engines</li>
                <li>We are not responsible for the privacy practices of third-party websites.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mt-8 mb-4">11. Data Retention (Store Data)</h2>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Public store data may be refreshed periodically</li>
                <li>Outdated data may be retained for up to 6 weeks before being removed</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mt-8 mb-4">12. Data Removal Requests</h2>
              <p className="text-muted-foreground">
                If you want your store's public data removed from Sneaklink:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Contact us via email</li>
                <li>We will review and process legitimate removal requests promptly</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mt-8 mb-4">13. Changes to This Policy</h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy to reflect:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Platform changes</li>
                <li>Legal or regulatory requirements</li>
                <li>Operational improvements</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                Updates will be posted on this page.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mt-8 mb-4">14. Contact Information</h2>
              <p className="text-muted-foreground">
                For privacy-related questions, concerns, or requests:
              </p>
              <ul className="list-none space-y-2 text-muted-foreground mt-4">
                <li>📧 Email: <a href="mailto:privacy@sneaklink.app" className="text-primary hover:underline">privacy@sneaklink.app</a></li>
                <li>📧 Support: <a href="mailto:help@sneaklink.app" className="text-primary hover:underline">help@sneaklink.app</a></li>
                <li>🌐 Website: <a href="https://sneaklink.app" className="text-primary hover:underline">sneaklink.app</a></li>
              </ul>
              <p className="text-muted-foreground mt-6">
                © 2025 SneakLink. All rights reserved.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
