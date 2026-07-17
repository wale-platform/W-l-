import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, UserX, Wallet, GraduationCap, Calendar, MessageSquare, Lock } from 'lucide-react';

export function TrustFeatures() {
  const features = [
    { icon: ShieldCheck, title: "Verified Properties", desc: "Every property is physically inspected by our Kwara team before listing." },
    { icon: UserX, title: "No Multiple Agents", desc: "Deal directly with verified landlords or the primary property manager." },
    { icon: Wallet, title: "Transparent Pricing", desc: "See exactly what you'll pay. No hidden agency or agreement fees." },
    { icon: GraduationCap, title: "Campus Focused", desc: "Listings specifically curated for UNILORIN, KWASU, and other Kwara institutions." },
    { icon: Calendar, title: "Inspection Booking", desc: "Schedule physical viewings seamlessly through the platform." },
    { icon: MessageSquare, title: "Direct Communication", desc: "Chat securely with landlords to negotiate terms or ask questions." }
  ];

  return (
    <section className="py-24 bg-gray-50 border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-6">
            <Lock size={24} />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Students Trust WALE</h2>
          <p className="text-gray-600">We've engineered a platform that puts your safety and convenience first.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow architectural-border"
            >
              <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-primary mb-6">
                <feature.icon size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
