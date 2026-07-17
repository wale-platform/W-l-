import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GraduationCap, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';

export function CampusFinder() {
  const [activeCampus, setActiveCampus] = useState('UNILORIN');

  const campuses = [
    { id: 'UNILORIN', name: 'University of Ilorin', count: 124 },
    { id: 'KWASU', name: 'Kwara State University', count: 86 },
    { id: 'AL_HIKMAH', name: 'Al-Hikmah University', count: 42 },
    { id: 'LANDMARK', name: 'Landmark University', count: 35 },
    { id: 'SUMMIT', name: 'Summit University', count: 18 },
    { id: 'TAU', name: 'Thomas Adewumi Uni', count: 28 },
    { id: 'OFFA', name: 'Federal Poly Offa', count: 65 },
    { id: 'OJAJA', name: 'Ojaja University', count: 12 },
    { id: 'AHMAN', name: 'Ahman Pategi Uni', count: 15 }
  ];

  return (
    <section className="py-24 bg-gray-50 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Find Housing Near Your Campus</h2>
          <p className="text-gray-600">Select your institution to instantly discover verified properties within walking distance or a short drive.</p>
        </div>

        <div className="bg-white rounded-3xl p-2 shadow-sm border border-gray-100 mb-12 flex flex-wrap justify-center gap-2 max-w-4xl mx-auto">
          {campuses.map((campus) => (
            <button
              key={campus.id}
              onClick={() => setActiveCampus(campus.id)}
              className={`px-6 py-3 rounded-2xl text-sm font-medium transition-all ${
                activeCampus === campus.id 
                  ? 'bg-gray-900 text-white shadow-md' 
                  : 'bg-transparent text-gray-600 hover:bg-gray-50'
              }`}
            >
              {campus.name}
            </button>
          ))}
        </div>

        {/* Mock UI to show properties exist for the campus */}
        <motion.div 
          key={activeCampus}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-100 rounded-3xl p-8 max-w-3xl mx-auto architectural-border text-center"
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6">
            <GraduationCap size={32} />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {campuses.find(c => c.id === activeCampus)?.count} Verified Properties Available
          </h3>
          <p className="text-gray-600 mb-8">
            Explore premium student accommodation around {campuses.find(c => c.id === activeCampus)?.name}.
          </p>
          <Button size="lg" className="flex items-center gap-2 mx-auto">
            View Properties <ArrowRight size={18} />
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
