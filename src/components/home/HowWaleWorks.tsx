import React from 'react';
import { motion } from 'motion/react';

export function HowWaleWorks() {
  const steps = [
    { number: '01', title: 'Search', desc: 'Browse verified listings near your specific campus in Kwara State.' },
    { number: '02', title: 'Compare', desc: 'Review amenities, real photos, and transparent pricing.' },
    { number: '03', title: 'Verify', desc: 'Check landlord ratings and trust badges before proceeding.' },
    { number: '04', title: 'Inspect', desc: 'Book a physical inspection directly through the platform.' },
    { number: '05', title: 'Move In', desc: 'Sign agreements and move into your new home with confidence.' }
  ];

  return (
    <section className="py-24 bg-gray-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-blueprint-dark opacity-10 pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <h2 className="text-3xl font-bold text-white mb-4">How WALE Works</h2>
          <p className="text-gray-400">A structured, engineered process to eliminate risk and ensure you find the perfect student home.</p>
        </div>

        <div className="relative">
          {/* Connector Line (Desktop) */}
          <div className="hidden lg:block absolute top-1/2 left-0 w-full h-px bg-gray-800 -translate-y-1/2"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
            {steps.map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative bg-gray-900 z-10 p-6 rounded-3xl border border-gray-800 hover:border-primary/50 transition-colors"
              >
                <div className="text-4xl font-bold text-gray-800 mb-6 font-mono">{step.number}</div>
                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{step.desc}</p>
                
                {/* Architectural Node */}
                <div className="hidden lg:block absolute top-1/2 -right-4 w-2 h-2 bg-primary rounded-full transform -translate-y-1/2 shadow-[0_0_10px_rgba(15,118,110,0.8)]"></div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
