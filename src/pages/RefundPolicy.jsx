import Header from "@/components/homepage/Header";
import Footer from "@/components/homepage/Footer";

const RefundPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-12 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-light text-foreground mb-2">SneakLink Refund Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: December 19, 2025</p>

          <div className="prose prose-invert max-w-none space-y-6 text-foreground">
            <p className="text-muted-foreground">
              Thank you for choosing SneakLink. We aim to provide a high-quality research and discovery platform for analyzing Shopify stores, identifying business opportunities, and conducting market research. We understand that in certain situations, a refund may be necessary. This Refund Policy explains when and how refunds are handled for our subscription plans (Free, Pro, and Enterprise).
            </p>

            <section>
              <h2 className="text-2xl font-light text-foreground mt-8 mb-4">1. Refund Eligibility</h2>
              <p className="text-muted-foreground">
                Sneaklink offers a 3-day money-back guarantee on the initial purchase of a subscription plan.
              </p>
              <p className="text-muted-foreground mt-4">
                You may request a full refund if:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>The request is made within 3 days of your first subscription purchase</li>
                <li>You have not violated Sneaklink's Terms of Service or related policies</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                Refunds apply only to first-time subscriptions and do not apply to renewals, upgrades, or add-ons.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mt-8 mb-4">2. Refund Request Process</h2>
              <p className="text-muted-foreground">
                To request a refund, please contact our support team and include the following details:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Full name</li>
                <li>Email address associated with your Sneaklink account</li>
                <li>Date of purchase</li>
                <li>Reason for the refund request (optional but helpful)</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                📧 Email: <a href="mailto:help@sneaklink.app" className="text-primary hover:underline">help@sneaklink.app</a>
              </p>
              <p className="text-muted-foreground mt-4">
                All refund requests are reviewed manually.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mt-8 mb-4">3. Refund Processing</h2>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Approved refunds are processed within 3 business days from approval</li>
                <li>Refunds are issued using the original payment method, unless otherwise agreed</li>
                <li>Once processed, funds may take additional time to appear depending on your payment provider</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mt-8 mb-4">4. Subscription-Based Services</h2>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Refunds are provided only within the 3-day refund window</li>
                <li>No partial or prorated refunds are issued beyond this period</li>
                <li>You remain responsible for canceling your subscription if you do not wish to continue using the service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mt-8 mb-4">5. Non-Refundable Situations</h2>
              <p className="text-muted-foreground">
                Refunds will not be issued if:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>The refund request is made after the 3-day period</li>
                <li>The account has violated Sneaklink's Terms of Service</li>
                <li>The service was used for prohibited activities (e.g., spam, abuse, data misuse)</li>
                <li>The request is related to subscription renewals or plan changes</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mt-8 mb-4">6. Service Termination After Refund</h2>
              <p className="text-muted-foreground">
                Once a refund is issued:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Your Sneaklink account will be immediately deactivated</li>
                <li>Access to all features and data will be revoked</li>
                <li>You will no longer be permitted to use the service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mt-8 mb-4">7. Contact Information</h2>
              <p className="text-muted-foreground">
                If you have questions or concerns regarding this Refund Policy, please contact us:
              </p>
              <p className="text-muted-foreground mt-4">
                📧 Email: <a href="mailto:help@sneaklink.app" className="text-primary hover:underline">help@sneaklink.app</a>
              </p>
              <p className="text-muted-foreground mt-2">
                📧 Alternative: <a href="mailto:support@sneaklink.app" className="text-primary hover:underline">support@sneaklink.app</a>
              </p>
              <p className="text-muted-foreground mt-4">
                We aim to respond to all refund requests within 24-48 hours during business days.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-foreground mt-8 mb-4">8. Changes to This Policy</h2>
              <p className="text-muted-foreground">
                SneakLink reserves the right to modify this Refund Policy at any time. Changes will be effective immediately upon posting on this page. Your continued use of the Service after any changes constitutes acceptance of the updated policy.
              </p>
              <p className="text-muted-foreground mt-4">
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

export default RefundPolicy;
