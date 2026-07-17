import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Search, MessageSquare, Calendar, Compass, Star, MapPin, Heart } from 'lucide-react';
import { Button } from '../ui/Button';
import { Logo } from '../ui/Logo';

export function HeroSection() {
  const features = [
    {
      id: 'verified',
      icon: ShieldCheck,
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      label: 'Verified Listings',
      desc: '100% scam-free homes'
    },
    {
      id: 'search',
      icon: Search,
      color: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
      label: 'Smart Search',
      desc: 'Find by school & budget'
    },
    {
      id: 'landlord',
      icon: MessageSquare,
      color: 'bg-coral/10 text-coral border-coral/20',
      label: 'Direct Connection',
      desc: 'Zero agent commissions'
    },
    {
      id: 'inspection',
      icon: Calendar,
      color: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
      label: 'Book Inspection',
      desc: 'Instant physical tours'
    },
  ];

  return (
    <section className="relative pt-32 pb-24 lg:pt-40 lg:pb-36 overflow-hidden bg-navy text-white min-h-screen flex items-center">
      {/* Blueprint Grid and Geometric Overlays */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-blueprint opacity-20"></div>
        {/* Soft Background Radial Glows */}
        <div className="absolute -top-48 -left-48 w-96 h-96 bg-coral/10 rounded-full blur-[120px]"></div>
        <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-teal/10 rounded-full blur-[150px]"></div>
        
        {/* Technical Architectural Drawing Guides */}
        <div className="absolute left-10 top-0 bottom-0 w-px bg-white/5 hidden md:block"></div>
        <div className="absolute right-10 top-0 bottom-0 w-px bg-white/5 hidden md:block"></div>
        <div className="absolute top-1/4 left-0 right-0 h-px bg-white/5"></div>
        <div className="absolute top-2/3 left-0 right-0 h-px bg-white/5"></div>
        
        {/* CAD Crosshairs and coordinate system labels */}
        <div className="absolute left-12 top-24 text-[10px] font-mono text-white/20 tracking-wider hidden md:block">
          SYS.LOC // KWARA.NIG [8.4799° N, 4.5418° E]
        </div>
        <div className="absolute right-12 top-24 text-[10px] font-mono text-white/20 tracking-wider hidden md:block">
          SCALE: 1:150 // VERIFIED
        </div>
        <div className="absolute left-12 bottom-12 text-[10px] font-mono text-white/20 tracking-wider hidden md:block">
          MODULAR_GRID_WALE_2026
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-8 items-center">
          
          {/* LEFT SIDE: Messaging & CTA */}
          <div className="max-w-2xl lg:pr-4">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-6"
            >
              <div className="w-5 h-5 rounded-full bg-coral flex items-center justify-center text-white">
                <Logo size={12} />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-teal">
                Trusted Student Housing Ecosystem
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6 leading-[1.1]"
            >
              Find Your Home <br />
              <span className="text-coral relative inline-block mt-1">
                Without the Hassle.
                <svg className="absolute w-full h-3 -bottom-2 left-0 text-teal/40" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="4" fill="transparent" />
                </svg>
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg text-slate-300 mb-10 leading-relaxed max-w-xl"
            >
              Help students across Kwara State discover verified homes, connect directly with trusted landlords, and move into their next home with confidence.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 mb-12"
            >
              <Link to="/properties" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto px-8 bg-coral hover:bg-coral/90 text-white border-none shadow-xl shadow-coral/20 h-14 rounded-xl text-base font-bold">
                  Browse Properties
                </Button>
              </Link>
              <Link to="/ai-match" className="w-full sm:w-auto">
                <Button variant="glass" size="lg" className="w-full sm:w-auto px-8 border border-white/10 text-white h-14 rounded-xl text-base font-medium hover:bg-white/10 flex items-center justify-center gap-2">
                  <Compass size={20} className="text-teal" />
                  AI Home Match
                </Button>
              </Link>
            </motion.div>

            {/* Premium feature icons with round container & soft hover */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="grid grid-cols-2 gap-4 max-w-md"
            >
              {features.map((feat) => {
                const IconComponent = feat.icon;
                return (
                  <motion.div
                    key={feat.id}
                    whileHover={{ scale: 1.03, translateY: -2 }}
                    className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all cursor-pointer group"
                  >
                    <div className={`p-2.5 rounded-xl border ${feat.color} shrink-0 transition-transform group-hover:scale-110`}>
                      <IconComponent size={18} strokeWidth={2} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white leading-tight">{feat.label}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">{feat.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>

          {/* RIGHT SIDE: Immersive smartphone mockup with architectural building backdrop */}
          <div className="relative lg:h-[650px] flex items-center justify-center z-10">
            {/* Architectural backdrop building graphic (Unsplash modern high-end minimalist luxury condo) */}
            <div className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden pointer-events-none opacity-40">
              <img 
                src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1200" 
                alt="Luxury PropTech Property" 
                className="w-full h-full object-cover rounded-2xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/80 to-navy/30"></div>
              {/* Overlaid Blueprint blueprint construction guides */}
              <div className="absolute inset-0 bg-blueprint opacity-40 mix-blend-color-dodge"></div>
            </div>

            {/* Animated Rotating Geometric CAD Circle */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
              className="absolute w-[440px] h-[440px] rounded-full border border-dashed border-white/5 flex items-center justify-center pointer-events-none"
            >
              <div className="w-[360px] h-[360px] rounded-full border border-teal/10 flex items-center justify-center">
                <div className="w-[280px] h-[280px] rounded-full border border-dashed border-coral/5"></div>
              </div>
            </motion.div>

            {/* Smartphone Mockup */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative w-[310px] h-[610px] rounded-[42px] border-[10px] border-slate-800 bg-[#071426] shadow-2xl shadow-black/80 overflow-hidden shrink-0 z-20 group"
            >
              {/* Speaker / Camera Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-32 bg-slate-800 rounded-b-2xl z-40 flex items-center justify-center">
                <div className="w-12 h-1 bg-slate-900 rounded-full mb-1"></div>
              </div>

              {/* In-app Screen Content */}
              <div className="h-full flex flex-col pt-8 pb-4 px-4 overflow-y-auto no-scrollbar text-left text-xs bg-navy">
                {/* App Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1.5">
                    <Logo size={16} className="text-coral" />
                    <span className="font-bold text-white text-sm tracking-tight">WALE Mobile</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-medium">
                    <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></span>
                    Live
                  </div>
                </div>

                {/* Simulated App Search */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center gap-2 mb-4 text-slate-400">
                  <Search size={14} className="text-teal" />
                  <span>Search near KWASU, UNILORIN...</span>
                </div>

                {/* Mobile App Category Selector */}
                <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar shrink-0">
                  <span className="bg-coral text-white px-3 py-1 rounded-full font-medium text-[10px]">All Homes</span>
                  <span className="bg-white/5 text-slate-300 px-3 py-1 rounded-full text-[10px]">Near UNILORIN</span>
                  <span className="bg-white/5 text-slate-300 px-3 py-1 rounded-full text-[10px]">Near KWASU</span>
                </div>

                {/* Mobile Featured Property Listing Cards */}
                <div className="space-y-3.5 flex-1">
                  {/* Property Card 1 */}
                  <div className="bg-[#0b1e36] border border-white/5 rounded-2xl overflow-hidden shadow-md">
                    <div className="relative h-28 bg-slate-800">
                      <img 
                        src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=400" 
                        alt="Kwara Student Studio" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 bg-teal text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <ShieldCheck size={10} /> Verified
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black/70 text-coral text-[9px] font-bold px-2 py-0.5 rounded-full">
                        ₦280,000/yr
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Self-Contain</span>
                        <div className="flex items-center gap-0.5 text-amber-400 text-[10px]">
                          <Star size={10} fill="currentColor" />
                          <span>4.9</span>
                        </div>
                      </div>
                      <h4 className="font-semibold text-white truncate text-sm">Royal Luxury Villa</h4>
                      <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                        <MapPin size={10} className="text-coral" /> Tanke, UNILORIN Campus Area
                      </p>
                    </div>
                  </div>

                  {/* Property Card 2 */}
                  <div className="bg-[#0b1e36] border border-white/5 rounded-2xl overflow-hidden shadow-md">
                    <div className="relative h-28 bg-slate-800">
                      <img 
                        src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=400" 
                        alt="KWASU Hostels" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 bg-teal text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <ShieldCheck size={10} /> Verified
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black/70 text-coral text-[9px] font-bold px-2 py-0.5 rounded-full">
                        ₦180,000/yr
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Shared Apartment</span>
                        <div className="flex items-center gap-0.5 text-amber-400 text-[10px]">
                          <Star size={10} fill="currentColor" />
                          <span>4.7</span>
                        </div>
                      </div>
                      <h4 className="font-semibold text-white truncate text-sm">Grace Executive Hostel</h4>
                      <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                        <MapPin size={10} className="text-coral" /> Malete, KWASU Area
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Navigation Mockup inside App */}
                <div className="border-t border-white/10 pt-2.5 mt-4 flex justify-around text-slate-400 shrink-0">
                  <div className="flex flex-col items-center gap-0.5 text-coral">
                    <Compass size={14} />
                    <span className="text-[9px]">Explore</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <Heart size={14} />
                    <span className="text-[9px]">Saved</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <MessageSquare size={14} />
                    <span className="text-[9px]">Inbox</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <Calendar size={14} />
                    <span className="text-[9px]">Tours</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Floating Card 1: Live Status indicator */}
            <motion.div 
              animate={{ y: [0, -12, 0], x: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
              className="absolute -left-12 top-24 bg-[#071426]/90 backdrop-blur-md p-3.5 rounded-2xl shadow-2xl border border-white/10 w-64 z-30 hidden sm:block"
            >
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal/20 text-teal flex items-center justify-center shrink-0">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm leading-tight">Landlord Identity Verified</h4>
                  <p className="text-xs text-slate-400 mt-0.5">CAC Checked & NIMC Registered</p>
                </div>
              </div>
            </motion.div>

            {/* Floating Card 2: Interactive Trust Score */}
            <motion.div 
              animate={{ y: [0, 12, 0], x: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 7, ease: "easeInOut", delay: 1 }}
              className="absolute -right-8 bottom-24 bg-[#071426]/90 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-white/10 w-56 z-30 hidden sm:block"
            >
              <p className="text-xs text-slate-400 font-medium">Platform Trust Rating</p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-extrabold text-white">99.8%</span>
                <span className="text-[10px] text-teal font-bold uppercase tracking-wider">Extremely High</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5 mt-3">
                <div className="bg-teal h-1.5 rounded-full w-[99.8%]"></div>
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}
