import React from 'react';
import { motion } from 'motion/react';
import { MapPin, Building2 } from 'lucide-react';

export function FeaturedNeighborhoods() {
  const neighborhoods = [
    { name: 'Tanke', avgRent: '₦200k - ₦500k', distance: '5 mins to UNILORIN', count: 45 },
    { name: 'Malete', avgRent: '₦150k - ₦350k', distance: '10 mins to KWASU', count: 32 },
    { name: 'Fate', avgRent: '₦250k - ₦600k', distance: 'Central Area', count: 28 },
    { name: 'GRA', avgRent: '₦400k - ₦900k', distance: 'Premium Area', count: 18 },
    { name: 'Pipeline', avgRent: '₦250k - ₦550k', distance: 'Near UNILORIN', count: 42 },
    { name: 'Omu-Aran', avgRent: '₦150k - ₦300k', distance: 'Near Landmark', count: 24 }
  ];

  return (
    <section className="py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Popular Neighborhoods</h2>
            <p className="text-gray-600 text-lg">Discover the most sought-after student communities in Kwara State.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {neighborhoods.map((hood, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group border border-gray-200 rounded-3xl p-6 hover:shadow-lg transition-all hover:border-primary/50 relative overflow-hidden bg-white architectural-border"
            >
              {/* Subtle architectural background */}
              <div className="absolute inset-0 bg-blueprint opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none"></div>
              
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{hood.name}</h3>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <MapPin size={14} className="text-primary" />
                    <span>{hood.distance}</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <Building2 size={20} />
                </div>
              </div>

              <div className="flex items-end justify-between relative z-10 pt-4 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Average Rent</p>
                  <p className="font-semibold text-gray-900">{hood.avgRent}</p>
                </div>
                <div className="text-sm font-medium text-primary bg-primary/5 px-3 py-1 rounded-full">
                  {hood.count} Homes
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
