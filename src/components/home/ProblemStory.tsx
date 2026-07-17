import React from 'react';
import { motion } from 'motion/react';
import { Search, ShieldCheck, Home, CalendarCheck, MessageSquare } from 'lucide-react';

export function ProblemStory() {
  return (
    <section className="py-24 bg-gray-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* WALE Way */}
        <div className="relative">
          <div className="absolute inset-0 bg-primary/5 rounded-3xl -mx-4 sm:mx-0"></div>
          <div className="relative px-4 py-16 sm:px-12 rounded-3xl architectural-border">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">The WALE Experience</h2>
              <p className="text-gray-600">A seamless, transparent journey designed to connect you directly with your next home.</p>
            </div>

            <div className="flex flex-col md:flex-row justify-center items-center gap-4 md:gap-8">
              {[
                { icon: Search, label: 'Search WALE' },
                { icon: ShieldCheck, label: 'Verified Listings' },
                { icon: CalendarCheck, label: 'Book Inspection' },
                { icon: MessageSquare, label: 'Chat Landlord' },
                { icon: Home, label: 'Move Into New Home' }
              ].map((step, i) => (
                <React.Fragment key={i}>
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex flex-col items-center text-center w-32"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-white border-2 border-primary text-primary flex items-center justify-center mb-3 shadow-md relative group">
                      <div className="absolute inset-0 bg-primary/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <step.icon size={24} />
                    </div>
                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">{step.label}</span>
                  </motion.div>
                  {i < 4 && (
                    <div className="hidden md:block w-8 h-0.5 bg-primary/30"></div>
                  )}
                  {i < 4 && (
                    <div className="md:hidden h-8 w-0.5 bg-primary/30 my-2"></div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
