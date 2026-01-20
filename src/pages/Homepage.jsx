import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "@/components/homepage/Header";
import Hero from "@/components/homepage/Hero";
import UseCases from "@/components/homepage/UseCases";
import DashboardPreview from "@/components/homepage/DashboardPreview";
import Pricing from "@/components/homepage/Pricing";
import FAQ from "@/components/homepage/FAQ";
import Footer from "@/components/homepage/Footer";
import { ContactSupportModal } from "@/components/homepage/ContactSupportModal";
import { FloatingButtons } from "@/components/FloatingButtons";

const Homepage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [accountStatus, setAccountStatus] = useState(null);

  useEffect(() => {
    // Check for support query parameter
    const supportParam = searchParams.get('support');
    if (supportParam === 'suspended' || supportParam === 'deactivated') {
      setAccountStatus(supportParam);
      setShowSupportModal(true);
      // Remove the parameter from URL to clean it up
      searchParams.delete('support');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <UseCases />
        <DashboardPreview />
        <Pricing />
        <FAQ />
      </main>
      <Footer />
      <ContactSupportModal
        open={showSupportModal}
        onOpenChange={setShowSupportModal}
        accountStatus={accountStatus}
      />
      <FloatingButtons />
    </div>
  );
};

export default Homepage;

