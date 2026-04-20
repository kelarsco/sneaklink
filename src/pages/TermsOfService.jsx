import { useEffect } from "react";
import Header from "@/components/homepage/Header";
import Footer from "@/components/homepage/Footer";

const TermsOfService = () => {
  // Always scroll to top when Terms of Service page loads
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
          <h1 className="text-4xl font-light text-foreground mb-2">SneakLink – Terms and Conditions of Use</h1>
          <p className="text-muted-foreground mb-8">Last Updated: December 19, 2025</p>

          <div className="prose prose-invert max-w-none space-y-6 text-foreground">
            <p className="text-muted-foreground">
              By accessing or using SneakLink (the "Website", "Service", "we", "us", or "our"), a Shopify store research and discovery platform, you agree to be bound by these Terms and Conditions, all applicable laws, and regulations. If you do not agree to these Terms, you must not access or use the Website.
            </p>
            <p className="text-muted-foreground">
              All materials on this Website are protected by applicable copyright, trademark, and intellectual property laws.
            </p>

            <section>
              <h2 className="text-2xl font-light text-foreground mt-8 mb-4">1. License to Use</h2>
              <p className="text-muted-foreground">
                Permission is granted to access and use SneakLink and its data under a limited, non-exclusive, non-transferable, revocable license. This license is granted solely for lawful research, business intelligence, and analysis of publicly available Shopify stores. The license does not constitute a transfer of ownership, and all rights remain with SneakLink.
              </p>
              <p className="text-muted-foreground mt-4">
                Under this license, you may not:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Modify, copy, or redistribute Sneaklink materials without authorization</li>
                <li>Decompile, reverse engineer, or attempt to extract source code</li>
                <li>Remove copyright or proprietary notices</li>
                <li>Mirror or host Sneaklink data on another server or platform</li>
                <li>Use Sneaklink data for competitive purposes against Sneaklink</li>
                <li>Resell, sublicense, or redistribute data or access without written permission</li>
                <li>Republish data in bulk or in public datasets</li>
                <li>Register duplicate or fake accounts</li>
                <li>Programmatically access undocumented or private APIs</li>
                <li>Circumvent usage limits or security controls</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                All automated or programmatic access must be done through official Sneaklink APIs only, where available.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mt-8 mb-4">2. Account Access & Responsibility</h2>
              <p className="text-muted-foreground">
                Access to certain areas of the Website requires account registration.
              </p>
              <p className="text-muted-foreground mt-4">
                By creating an account, you agree that:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>You are responsible for keeping your credentials confidential</li>
                <li>You are responsible for all activities under your account</li>
                <li>Account sharing is strictly prohibited</li>
                <li>Unauthorized multi-user access may result in immediate suspension or termination without notice</li>
                <li>Enterprise accounts are limited strictly to employees of the subscribing organization.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mt-8 mb-4">3. Paid Services, Billing & Cancellation</h2>
              <p className="text-muted-foreground">
                If you subscribe to a paid plan:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>You may cancel your subscription at any time via your account dashboard</li>
                <li>You are responsible for canceling your plan if you no longer require the Service</li>
                <li>Refunds are not provided for unused time or change of mind</li>
                <li>Your statutory consumer rights remain protected where the Service is faulty or materially different from what was described.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mt-8 mb-4">4. Prohibited Use</h2>
              <p className="text-muted-foreground">
                You must not use Sneaklink or its data in any manner that:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Causes or may cause damage to the Website or its availability</li>
                <li>Is unlawful, illegal, fraudulent, or harmful</li>
                <li>Enables mass mailing, spam, or unsolicited outreach</li>
                <li>Attempts unauthorized access to servers, databases, or infrastructure</li>
                <li>Violates privacy, data protection, or anti-spam laws</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                If you contact or spam websites listed on Sneaklink, you accept full legal responsibility for those actions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mt-8 mb-4">5. Termination</h2>
              <p className="text-muted-foreground">
                This license automatically terminates if you violate any provision of these Terms.
              </p>
              <p className="text-muted-foreground mt-4">
                Sneaklink reserves the right to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Restrict or suspend access to any part of the Website</li>
                <li>Terminate accounts without notice in cases of misuse</li>
                <li>Deny refunds following termination for violations</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                Upon termination, you must destroy any downloaded or stored Sneaklink materials.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mt-8 mb-4">6. Disclaimer</h2>
              <p className="text-muted-foreground">
                Sneaklink and all data are provided "as is" and "as available".
              </p>
              <p className="text-muted-foreground mt-4">
                We make no warranties, express or implied, including but not limited to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Accuracy or completeness of data</li>
                <li>Fitness for a particular purpose</li>
                <li>Non-infringement of third-party rights</li>
                <li>Uninterrupted or error-free operation</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                Use of the Service is at your own risk.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mt-8 mb-4">7. Limitation of Liability</h2>
              <p className="text-muted-foreground">
                In no event shall Sneaklink or its suppliers be liable for any damages, including:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Loss of profits or revenue</li>
                <li>Loss of data</li>
                <li>Business interruption</li>
                <li>Indirect, incidental, or consequential damages</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                Some jurisdictions do not allow certain limitations, so parts of this section may not apply to you.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mt-8 mb-4">8. Accuracy of Materials</h2>
              <p className="text-muted-foreground">
                Content on Sneaklink may contain technical, typographical, or factual errors. We do not guarantee that any materials are accurate, complete, or current and may update content at any time without obligation.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mt-8 mb-4">9. Modifications to Terms</h2>
              <p className="text-muted-foreground">
                Sneaklink may update these Terms at any time without prior notice. Continued use of the Website constitutes acceptance of the updated Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mt-8 mb-4">10. Entire Agreement</h2>
              <p className="text-muted-foreground">
                These Terms, together with the SneakLink Privacy Policy and Refund Policy, constitute the entire agreement between you and SneakLink and supersede all prior agreements relating to your use of the Website.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mt-8 mb-4">12. Contact Information</h2>
              <p className="text-muted-foreground">
                For questions, concerns, or legal notices regarding these Terms:
              </p>
              <ul className="list-none space-y-2 text-muted-foreground mt-4">
                <li>📧 Email: <a href="mailto:legal@sneaklink.app" className="text-primary hover:underline">legal@sneaklink.app</a></li>
                <li>📧 Support: <a href="mailto:help@sneaklink.app" className="text-primary hover:underline">help@sneaklink.app</a></li>
                <li>🌐 Website: <a href="https://sneaklink.app" className="text-primary hover:underline">sneaklink.app</a></li>
              </ul>
              <p className="text-muted-foreground mt-6">
                © 2025 SneakLink. All rights reserved.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mt-8 mb-4">11. Governing Law</h2>
              <p className="text-muted-foreground">
                These Terms shall be governed and interpreted in accordance with applicable laws, without regard to conflict-of-law principles.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TermsOfService;
