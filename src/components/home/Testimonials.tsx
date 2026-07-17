import React from 'react';
import { motion } from 'motion/react';
import { Star } from 'lucide-react';

export function Testimonials() {
  const testimonials = [
    {
      name: "Aisha M.",
      school: "University of Ilorin",
      location: "Tanke, Ilorin",
      text: "I spent weeks looking for a place in Tanke and dealing with agents asking for ridiculous fees. Found a verified mini-flat on WALE and moved in within 3 days. Game changer.",
      image: "https://i.pravatar.cc/150?img=5"
    },
    {
      name: "Tobi K.",
      school: "Kwara State University",
      location: "Malete",
      text: "The distance from campus was always my concern. WALE showed me exactly how far the house was from KWASU gate. The direct chat with the landlord was so smooth.",
      image: "https://i.pravatar.cc/150?img=11"
    },
    {
      name: "Grace O.",
      school: "Al-Hikmah University",
      location: "Adewole Estate",
      text: "I felt safe knowing the properties were actually verified. The transparent pricing meant I knew exactly what I was paying before even booking the inspection.",
      image: "https://i.pravatar.cc/150?img=9"
    }
  ];

  return (
    <section className="py-24 bg-white relative">
      <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Trusted by Kwara Students</h2>
          <p className="text-gray-600">Hear from students who have already found their perfect homes using WALE.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm architectural-border"
            >
              <div className="flex gap-1 mb-6 text-accent">
                {[1, 2, 3, 4, 5].map(star => <Star key={star} size={16} fill="currentColor" />)}
              </div>
              <p className="text-gray-700 italic mb-8 leading-relaxed">"{t.text}"</p>
              
              <div className="flex items-center gap-4 pt-6 border-t border-gray-50">
                <img src={t.image} alt={t.name} className="w-12 h-12 rounded-full object-cover" />
                <div>
                  <h4 className="font-bold text-gray-900">{t.name}</h4>
                  <p className="text-xs text-gray-500">{t.school} • Rented in {t.location}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
