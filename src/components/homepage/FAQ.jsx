import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      question: "How many new stores are added to database daily?",
      answer: "On average, we add approximately 5,000 new stores to our database each day, ensuring a constantly expanding and updated collection of potential leads."
    },
    {
      question: "What is the Frequency of Data Updates?",
      answer: "Our database receives updates frequently to ensure accuracy and relevancy. Popular store data is refreshed daily, while our entire database undergoes a comprehensive update every week."
    },
    {
      question: "Where do you obtain your data?",
      answer: "We gather data from the internet using methods similar to those of Google, but with a focus on analyzing data from ecommerce platforms. We do not obtain data from any third-party sources."
    },
    {
      question: "How do I unsubscribe?",
      answer: "Please go to the account page and click on the 'Cancel' button."
    },
    {
      question: "How do I contact support?",
      answer: "Please contact us via email at help@sneaklink.app. We typically respond within 48 hours."
    }
  ];

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-24 relative">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <span className="text-primary text-sm font-normal uppercase tracking-wider">FAQ</span>
            <h2 className="text-3xl md:text-4xl font-normal mt-4 mb-6 text-foreground">
              Frequently Asked <span className="gradient-text">Questions</span>
            </h2>
            <p className="text-muted-foreground">
              Find answers to common questions about SneakLink
            </p>
          </div>

          {/* FAQ Items */}
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="glass-panel rounded-xl border border-border/50 overflow-hidden transition-all hover:border-primary/30"
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left group"
                >
                  <h3 className="text-lg font-normal text-foreground pr-4 group-hover:text-primary transition-colors">
                    {faq.question}
                  </h3>
                  {openIndex === index ? (
                    <ChevronUp className="w-5 h-5 text-primary flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0 group-hover:text-primary transition-colors" />
                  )}
                </button>
                {openIndex === index && (
                  <div className="px-6 pb-5">
                    <p className="text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
