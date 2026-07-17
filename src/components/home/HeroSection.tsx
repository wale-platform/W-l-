import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ShieldCheck, MapPin, Search } from 'lucide-react';
import { Button } from '../ui/Button';

export function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-white">
      {/* Architectural Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-blueprint opacity-40"></div>
        <div className="absolute top-0 right-0 w-3/4 h-full bg-gradient-to-l from-gray-50/80 to-transparent"></div>
        {/* Decorative Grid Lines */}
        <div className="absolute top-0 right-10 w-px h-full bg-primary/10"></div>
        <div className="absolute top-0 right-40 w-px h-full bg-primary/10"></div>
        <div className="absolute top-1/4 left-0 w-full h-px bg-primary/10"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Messaging Side */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-xl"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <ShieldCheck size={16} />
              Trusted Student Housing Ecosystem
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900 mb-6 leading-[1.1]">
              Find Verified Student Housing <br />
              <span className="text-primary relative inline-block">
                in Kwara State
                <svg className="absolute w-full h-3 -bottom-1 left-0 text-accent/30" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="4" fill="transparent" />
                </svg>
              </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-10 leading-relaxed">
              Discover trusted rental properties around Kwara's major universities, connect directly with verified landlords, and avoid unnecessary agent fees and housing scams.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-12">
              <Link to="/properties" className="w-full sm:w-auto">
                <Button size="lg" className="w-full px-8">
                  Browse Properties
                </Button>
              </Link>
              <Link to="/ai-match" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full px-8 flex gap-2">
                  <MapPin size={20} />
                  Find Near My Campus
                </Button>
              </Link>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-gray-100">
              {[
                { value: '500+', label: 'Verified Properties' },
                { value: '150+', label: 'Trusted Landlords' },
                { value: '4', label: 'Major Campuses' },
                { value: '98%', label: 'Verified Listings' },
              ].map((stat, i) => (
                <div key={i}>
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-xs text-gray-500 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Visual Side */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative hidden lg:block h-[600px]"
          >
            <div className="absolute inset-0 architectural-border bg-gray-50/50 rounded-3xl overflow-hidden border border-gray-100">
              <img 
                src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=1200" 
                alt="Modern Architecture" 
                className="w-full h-full object-cover opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-transparent"></div>
              <div className="absolute inset-0 bg-blueprint-dark opacity-20 mix-blend-overlay"></div>
            </div>

            {/* Floating Property Card */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
              className="absolute -left-12 top-20 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/50 w-72"
            >
              <div className="flex gap-4">
                <img src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=200" alt="Studio" className="w-16 h-16 rounded-xl object-cover" />
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Studio</span>
                    <ShieldCheck size={12} className="text-primary" />
                  </div>
                  <h4 className="font-semibold text-gray-900 text-sm leading-tight">Premium Studio Tanke</h4>
                  <p className="text-xs text-gray-500 mt-1">₦250,000/yr</p>
                </div>
              </div>
            </motion.div>

            {/* Floating Info Card */}
            <motion.div 
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 6, ease: "easeInOut", delay: 1 }}
              className="absolute -right-8 bottom-32 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/50 w-64"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                  <MapPin size={16} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Distance to UNILORIN</p>
                  <p className="text-sm font-bold text-gray-900">10 mins drive</p>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                <div className="bg-accent h-1.5 rounded-full w-3/4"></div>
              </div>
            </motion.div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
