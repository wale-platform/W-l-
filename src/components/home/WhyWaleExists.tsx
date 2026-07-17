import React from 'react';
import { motion } from 'motion/react';

export function WhyWaleExists() {
  return (
    <section className="py-24 bg-white relative overflow-hidden">
      {/* Blueprint background for editorial feel */}
      <div className="absolute inset-0 bg-blueprint opacity-30 pointer-events-none"></div>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <span className="text-sm font-bold tracking-widest uppercase text-primary mb-6 block">Our Mission</span>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-10">
            WALE exists because students deserve a transparent housing experience.
          </h2>
          <div className="w-16 h-1 bg-accent mx-auto mb-10"></div>
          
          <div className="text-lg md:text-xl text-gray-600 leading-relaxed space-y-6">
            <p>
              The current system wastes time, money, and trust. Finding a home has become a frustrating process filled with hidden charges and unreliable agents.
            </p>
            <p>
              Rather than trying to solve housing across Nigeria from day one, we are focusing on solving one community's problem exceptionally well. Starting with Kwara State, we are building a foundation of trust.
            </p>
            <p className="font-medium text-gray-900">
              Our goal is to make finding accommodation as simple as booking a ride or ordering food.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
