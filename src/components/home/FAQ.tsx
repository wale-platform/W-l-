import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';

export function FAQ() {
  const faqs = [
    {
      q: "How are properties verified on WALE?",
      a: "Our field team physically visits every property listed on the platform in Kwara State. We verify the condition, amenities, location, and the authenticity of the landlord before the listing goes live."
    },
    {
      q: "Do I pay any fees to WALE to find a house?",
      a: "No. Browsing properties, chatting with landlords, and booking inspections are completely free for students. We don't charge hidden agency fees."
    },
    {
      q: "Can I contact landlords directly?",
      a: "Yes! Once you find a property you like, you can use our secure in-app chat to talk directly with the verified landlord to negotiate terms or ask questions."
    },
    {
      q: "Which schools are currently supported?",
      a: "Our MVP currently focuses on major tertiary institutions in Kwara State, including UNILORIN, KWASU, Al-Hikmah University, and Federal Polytechnic Offa."
    },
    {
      q: "How do I book an inspection?",
      a: "Simply click 'Book Inspection' on any property page, select an available date and time, and the landlord will be notified. You'll receive a confirmation once accepted."
    }
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-24 bg-gray-50 border-y border-gray-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
          <p className="text-gray-600">Everything you need to know about renting with WALE.</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div 
              key={i} 
              className={`bg-white rounded-2xl border transition-colors ${openIndex === i ? 'border-primary shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <button 
                className="w-full px-6 py-5 flex items-center justify-between text-left font-semibold text-gray-900"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                {faq.q}
                <ChevronDown 
                  size={20} 
                  className={`text-gray-400 transition-transform ${openIndex === i ? 'rotate-180 text-primary' : ''}`} 
                />
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-5 text-gray-600 leading-relaxed pt-2 border-t border-gray-50">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
