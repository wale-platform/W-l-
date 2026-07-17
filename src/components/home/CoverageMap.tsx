import React from 'react';
import { motion } from 'motion/react';
import { MapPin, Map as MapIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';

export function CoverageMap() {
  const areas = [
    { name: 'Tanke', top: '40%', left: '45%', delay: 0.1 },
    { name: 'Malete', top: '25%', left: '30%', delay: 0.2 },
    { name: 'Fate', top: '45%', left: '55%', delay: 0.3 },
    { name: 'Offa', top: '70%', left: '60%', delay: 0.4 },
    { name: 'Omu-Aran', top: '65%', left: '75%', delay: 0.5 },
  ];

  return (
    <section className="py-24 bg-gray-50 border-t border-gray-100 overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16 relative z-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Coverage Map</h2>
          <p className="text-gray-600 mb-6">Explore verified student housing clusters across Kwara State's major tertiary institution areas.</p>
          <Link to="/map">
            <Button size="lg" className="shadow-lg hover:scale-105 transition-transform">
              <MapIcon size={20} className="mr-2" />
              Open Interactive Map
            </Button>
          </Link>
        </div>
        <Link to="/map" className="block relative max-w-4xl mx-auto h-[500px] bg-white rounded-3xl border border-gray-200 shadow-sm p-4 architectural-border group cursor-pointer overflow-hidden hover:shadow-xl transition-shadow">
          {/* Subtle Map Background Pattern */}
          <div className="absolute inset-4 rounded-2xl bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=1200')] opacity-5 bg-cover bg-center mix-blend-luminosity"></div>
          
          <div className="absolute inset-4 rounded-2xl bg-blueprint opacity-40"></div>
          
          {/* Connecting Lines (Decorative) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" xmlns="http://www.w3.org/2000/svg">
            <path d="M 45% 40% L 30% 25%" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="text-primary" />
            <path d="M 45% 40% L 55% 45%" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="text-primary" />
            <path d="M 55% 45% L 60% 70%" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="text-primary" />
            <path d="M 60% 70% L 75% 65%" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="text-primary" />
          </svg>

          {areas.map((area, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: area.delay, type: 'spring', stiffness: 200, damping: 20 }}
              className="absolute"
              style={{ top: area.top, left: area.left }}
            >
              <div className="relative group cursor-pointer">
                {/* Pulse ring */}
                <div className="absolute inset-0 bg-primary/30 rounded-full animate-ping scale-[2]"></div>
                
                {/* Pin */}
                <div className="relative w-8 h-8 bg-white border-2 border-primary rounded-full flex items-center justify-center text-primary shadow-lg z-10 group-hover:scale-110 transition-transform">
                  <MapPin size={16} />
                </div>
                
                {/* Label */}
                <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-20 pointer-events-none">
                  {area.name}
                </div>
              </div>
            </motion.div>
          ))}
          
          <div className="absolute bottom-8 right-8 bg-white/90 backdrop-blur-sm border border-gray-100 p-4 rounded-xl shadow-sm">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Kwara State MVP</h4>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <span className="w-2 h-2 rounded-full bg-primary inline-block"></span> Active Hubs
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="w-2 h-2 rounded-full border border-gray-400 border-dashed inline-block"></span> Upcoming Areas
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
