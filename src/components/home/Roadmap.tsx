import React from 'react';
import { motion } from 'motion/react';
import { Map, Zap, Globe, Rocket } from 'lucide-react';

export function Roadmap() {
  const phases = [
    { 
      title: 'Phase 1', 
      subtitle: 'Launch in Kwara State', 
      desc: 'Validating the model with a hyper-local focus on student housing around major institutions like UNILORIN and KWASU.', 
      icon: Map,
      status: 'active' 
    },
    { 
      title: 'Phase 2', 
      subtitle: 'Regional Expansion', 
      desc: 'Expanding to neighboring student communities across Southwest and North Central Nigeria.', 
      icon: Zap,
      status: 'upcoming' 
    },
    { 
      title: 'Phase 3', 
      subtitle: 'National Scale', 
      desc: 'Launching across major university cities nationwide, establishing WALE as the standard for student housing.', 
      icon: Globe,
      status: 'upcoming' 
    },
    { 
      title: 'Phase 4', 
      subtitle: 'African Leader', 
      desc: 'Becoming the most trusted digital housing ecosystem across the continent.', 
      icon: Rocket,
      status: 'upcoming' 
    }
  ];

  return (
    <section className="py-24 bg-white relative overflow-hidden">
      <div className="absolute inset-0 bg-blueprint opacity-10 pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-sm font-bold tracking-widest uppercase text-primary mb-4 block">The Vision</span>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Starting locally. Scaling nationally.</h2>
          <p className="text-gray-600">Our roadmap to building the future of trusted student housing.</p>
        </div>

        <div className="relative">
          {/* Connector Line (Desktop) */}
          <div className="hidden lg:block absolute top-1/2 left-10 right-10 h-0.5 bg-gray-100 -translate-y-1/2"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
            {phases.map((phase, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 shadow-sm border ${
                  phase.status === 'active' 
                    ? 'bg-primary text-white border-primary-dark' 
                    : 'bg-gray-50 text-gray-400 border-gray-200'
                }`}>
                  <phase.icon size={24} />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-1">{phase.title}</h3>
                <h4 className="text-xl font-bold text-gray-900 mb-3">{phase.subtitle}</h4>
                <p className="text-sm text-gray-600 leading-relaxed">{phase.desc}</p>
                
                {phase.status === 'active' && (
                  <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                    Current Phase
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
