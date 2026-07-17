import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Search, Star, MessageSquare, Calendar, Award, MapPin, Clock, Languages, CheckCircle2, ChevronRight, CreditCard, Landmark, Wallet, Check, Download, FileText, ArrowRight, X, Phone } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { mockLawyers, mockLegalServices } from '../data/legalMock';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export function LawyersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [selectedLawyer, setSelectedLawyer] = useState<any | null>(null);
  
  // Booking Workflow State
  const [bookingLawyer, setBookingLawyer] = useState<any | null>(null);
  const [bookingStep, setBookingStep] = useState(1); // 1: Service, 2: Date & Time, 3: Payment, 4: Success
  const [selectedService, setSelectedService] = useState<any>(mockLegalServices[0]);
  const [bookingDate, setBookingDate] = useState('2026-07-20');
  const [bookingTime, setBookingTime] = useState('10:00 AM');
  const [paymentMethod, setPaymentMethod] = useState<'Card' | 'Bank Transfer' | 'Wallet'>('Card');
  const [isPaying, setIsPaying] = useState(false);
  const [receiptCode, setReceiptCode] = useState('');

  // Filter specialty options
  const specialties = ['All', 'Property & Tenancy Law', 'Real Estate Transaction Advisory', 'Civil Litigation & Land Law'];

  const filteredLawyers = mockLawyers.filter(lawyer => {
    const matchesSearch = lawyer.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          lawyer.firm.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          lawyer.bio.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpecialty = selectedSpecialty === 'All' || lawyer.specialization === selectedSpecialty;
    return matchesSearch && matchesSpecialty;
  });

  const handleStartBooking = (lawyer: any) => {
    if (!user) {
      // Prompt login or just log in as tenant demo for fast flow
      alert('Logging in as demo tenant for seamless booking prototype experience.');
      loginAsDemoTenant();
      return;
    }
    setBookingLawyer(lawyer);
    setBookingStep(1);
  };

  const loginAsDemoTenant = () => {
    // Navigate to login or just auto login to prevent breaking iframe flow
    navigate('/login');
  };

  const handlePayment = () => {
    setIsPaying(true);
    setTimeout(() => {
      setIsPaying(false);
      setReceiptCode('WALE-REC-' + Math.floor(100000 + Math.random() * 900000));
      setBookingStep(4);
    }, 1500);
  };

  return (
    <div className="bg-[#071426] text-white min-h-screen pt-28 pb-16 relative overflow-hidden font-sans">
      {/* Background architectural details */}
      <div className="absolute inset-0 bg-blueprint opacity-10 pointer-events-none z-0"></div>
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-teal/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-coral/10 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal/10 border border-teal/20 text-teal mb-4 text-xs font-bold tracking-wider uppercase"
          >
            <ShieldCheck size={14} /> WALE Legal Ecosystem
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight"
          >
            Hire a <span className="text-coral">Verified Lawyer</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-300 text-lg leading-relaxed"
          >
            Avoid scams, fake agents, and rent-traps. Hire NBA-certified property lawyers to draft, review, and digitally sign student tenancy agreements in Kwara State.
          </motion.p>
        </div>

        {/* Filters & Search */}
        <div className="bg-white/5 border border-white/10 p-4 rounded-3xl backdrop-blur-md mb-12 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by lawyer name, firm, or specialty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent transition-all"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
            {specialties.map((spec) => (
              <button
                key={spec}
                onClick={() => setSelectedSpecialty(spec)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedSpecialty === spec 
                    ? 'bg-coral text-white' 
                    : 'bg-white/5 hover:bg-white/10 text-slate-300'
                }`}
              >
                {spec === 'All' ? 'All Specialties' : spec}
              </button>
            ))}
          </div>
        </div>

        {/* Lawyer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {filteredLawyers.map((lawyer) => (
            <motion.div
              key={lawyer.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -4 }}
              className="bg-[#0b1e36] rounded-3xl border border-white/5 overflow-hidden flex flex-col relative"
            >
              <div className="p-6 flex-grow flex flex-col">
                <div className="flex items-start gap-4 mb-5">
                  <div className="relative">
                    <img src={lawyer.avatar} alt={lawyer.name} className="w-16 h-16 rounded-2xl object-cover border border-white/10" />
                    {lawyer.verified && (
                      <div className="absolute -bottom-1 -right-1 bg-teal text-white p-1 rounded-lg border border-[#0b1e36]">
                        <ShieldCheck size={12} />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs font-semibold text-teal uppercase tracking-wider">NBA Verified</span>
                      <Award size={12} className="text-teal" />
                    </div>
                    <h3 className="font-bold text-lg text-white leading-tight">{lawyer.name}</h3>
                    <p className="text-slate-400 text-xs mt-0.5">{lawyer.firm}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 py-3 border-y border-white/5 mb-4 text-center">
                  <div>
                    <p className="text-slate-400 text-[10px] uppercase font-bold">Experience</p>
                    <p className="text-white font-bold text-sm mt-0.5">{lawyer.experience} Yrs</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[10px] uppercase font-bold">Reviews</p>
                    <p className="text-white font-bold text-sm mt-0.5 flex items-center justify-center gap-0.5">
                      <Star size={12} fill="currentColor" className="text-amber-400" />
                      {lawyer.rating} ({lawyer.reviews})
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[10px] uppercase font-bold">Agreements</p>
                    <p className="text-white font-bold text-sm mt-0.5">{lawyer.completedAgreements}+</p>
                  </div>
                </div>

                <div className="space-y-2 mb-6 flex-grow">
                  <p className="text-slate-300 text-xs leading-relaxed line-clamp-3">
                    {lawyer.bio}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-3">
                    <MapPin size={12} className="text-coral" />
                    <span className="truncate">{lawyer.location}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
                  <div>
                    <p className="text-slate-400 text-[10px]">Drafting base fee</p>
                    <p className="text-white font-extrabold text-base">₦{lawyer.baseFee.toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedLawyer(lawyer)} className="text-xs border-white/10 text-white hover:bg-white/5">
                      View Profile
                    </Button>
                    <Button size="sm" onClick={() => handleStartBooking(lawyer)} className="text-xs bg-coral hover:bg-coral/95 text-white">
                      Book Service
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Lawyer Profile Detail Modal */}
        <AnimatePresence>
          {selectedLawyer && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-navy/80 backdrop-blur-md"
                onClick={() => setSelectedLawyer(null)}
              />
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-[#0b1e36] border border-white/10 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden relative z-10 max-h-[90vh] flex flex-col"
              >
                <button onClick={() => setSelectedLawyer(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-white/5 p-2 rounded-full transition-colors">
                  <X size={18} />
                </button>

                <div className="p-6 md:p-8 overflow-y-auto">
                  <div className="flex flex-col md:flex-row gap-6 mb-6 pb-6 border-b border-white/10">
                    <img src={selectedLawyer.avatar} alt={selectedLawyer.name} className="w-24 h-24 rounded-2xl object-cover border-2 border-teal/40" />
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="bg-teal/10 border border-teal/20 text-teal text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Verified Legal Partner</span>
                        <ShieldCheck size={14} className="text-teal" />
                      </div>
                      <h2 className="text-2xl font-bold text-white">{selectedLawyer.name}</h2>
                      <p className="text-slate-300 text-sm">{selectedLawyer.firm}</p>
                      <p className="text-slate-400 text-xs mt-1 flex items-center gap-1">
                        <MapPin size={12} className="text-coral" /> {selectedLawyer.location}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h3 className="font-bold text-sm uppercase text-teal tracking-wider mb-2">About Lawyer</h3>
                      <p className="text-slate-300 text-sm leading-relaxed">{selectedLawyer.bio}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5">
                        <span className="text-slate-400 text-xs flex items-center gap-1.5 mb-1">
                          <Languages size={14} className="text-coral" /> Languages
                        </span>
                        <p className="text-white font-bold text-sm">{selectedLawyer.languages.join(', ')}</p>
                      </div>
                      <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5">
                        <span className="text-slate-400 text-xs flex items-center gap-1.5 mb-1">
                          <Clock size={14} className="text-coral" /> Hours
                        </span>
                        <p className="text-white font-bold text-sm text-ellipsis overflow-hidden whitespace-nowrap">{selectedLawyer.workingHours}</p>
                      </div>
                      <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5">
                        <span className="text-slate-400 text-xs flex items-center gap-1.5 mb-1">
                          <Phone size={14} className="text-coral" /> Phone Contact
                        </span>
                        {selectedLawyer.phone ? (
                          <a 
                            href={`tel:${selectedLawyer.phone}`} 
                            className="text-white font-bold text-sm hover:underline hover:text-teal block"
                          >
                            {selectedLawyer.phone}
                          </a>
                        ) : (
                          <p className="text-slate-500 font-bold text-sm">Not Provided</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm uppercase text-teal tracking-wider mb-2">NBA Certifications & Badges</h3>
                      <div className="flex flex-col gap-2">
                        {selectedLawyer.certifications.map((cert: string, index: number) => (
                          <div key={index} className="flex items-center gap-2.5 text-xs text-slate-300 bg-white/5 py-2 px-3 rounded-lg">
                            <CheckCircle2 size={14} className="text-teal shrink-0" />
                            <span>{cert}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 md:p-6 bg-navy/50 border-t border-white/10 flex gap-4">
                  <Button variant="outline" className="flex-1 text-white border-white/10 hover:bg-white/5" onClick={() => setSelectedLawyer(null)}>
                    Close
                  </Button>
                  <Button className="flex-1 bg-coral hover:bg-coral/95 text-white" onClick={() => { setSelectedLawyer(null); handleStartBooking(selectedLawyer); }}>
                    Book Services Now
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Lawyer Booking Step-by-Step Flow Modal */}
        <AnimatePresence>
          {bookingLawyer && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-navy/80 backdrop-blur-md"
                onClick={() => setBookingLawyer(null)}
              />
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-[#0b1e36] border border-white/10 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10 flex flex-col"
              >
                <div className="bg-gradient-to-r from-coral/10 to-teal/10 p-5 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={bookingLawyer.avatar} alt="" className="w-10 h-10 rounded-xl object-cover border border-white/20" />
                    <div>
                      <h3 className="font-bold text-white text-sm">Book: {bookingLawyer.name}</h3>
                      <p className="text-[10px] text-slate-400">NBA Registration Certified</p>
                    </div>
                  </div>
                  <button onClick={() => setBookingLawyer(null)} className="text-slate-400 hover:text-white bg-white/5 p-1.5 rounded-full transition-colors">
                    <X size={16} />
                  </button>
                </div>

                {/* Steps indicator bar */}
                <div className="bg-navy px-5 py-3 flex justify-between border-b border-white/5 text-[10px] font-bold text-slate-500 uppercase">
                  <span className={bookingStep >= 1 ? 'text-coral font-extrabold' : ''}>1. Service</span>
                  <span className={bookingStep >= 2 ? 'text-coral font-extrabold' : ''}>2. Schedule</span>
                  <span className={bookingStep >= 3 ? 'text-coral font-extrabold' : ''}>3. Payment</span>
                  <span className={bookingStep >= 4 ? 'text-teal font-extrabold' : ''}>4. Complete</span>
                </div>

                <div className="p-6 max-h-[60vh] overflow-y-auto text-left">
                  {/* STEP 1: SELECT LEGAL SERVICE */}
                  {bookingStep === 1 && (
                    <div className="space-y-4">
                      <h4 className="font-bold text-white text-sm mb-3 uppercase tracking-wider">Choose Legal Service</h4>
                      {mockLegalServices.map((service) => (
                        <div 
                          key={service.id}
                          onClick={() => setSelectedService(service)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                            selectedService.id === service.id 
                              ? 'bg-coral/5 border-coral shadow-lg' 
                              : 'bg-white/5 border-white/5 hover:border-white/10'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <h5 className="font-bold text-white text-sm">{service.title}</h5>
                            <span className="text-coral font-extrabold text-sm">₦{service.fee.toLocaleString()}</span>
                          </div>
                          <p className="text-slate-400 text-xs mb-3">{service.description}</p>
                          <div className="flex justify-between text-[10px] text-slate-500">
                            <span>Delivery Time: <strong>{service.duration}</strong></span>
                            {selectedService.id === service.id && (
                              <span className="text-coral font-bold flex items-center gap-0.5">
                                <Check size={12} /> Selected
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* STEP 2: SELECT DATE AND TIME */}
                  {bookingStep === 2 && (
                    <div className="space-y-4">
                      <h4 className="font-bold text-white text-sm mb-3 uppercase tracking-wider">Choose Consultation Schedule</h4>
                      
                      <div className="space-y-3">
                        <label className="block text-xs font-semibold text-slate-400">Preferred Date</label>
                        <input 
                          type="date" 
                          value={bookingDate}
                          onChange={(e) => setBookingDate(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
                        />
                      </div>

                      <div className="space-y-3 mt-4">
                        <label className="block text-xs font-semibold text-slate-400">Preferred Consultation Time Slot</label>
                        <div className="grid grid-cols-3 gap-2">
                          {['09:00 AM', '10:30 AM', '11:00 AM', '01:00 PM', '02:30 PM', '04:00 PM'].map((time) => (
                            <button
                              key={time}
                              onClick={() => setBookingTime(time)}
                              className={`py-2 px-1 text-xs rounded-xl border text-center transition-all ${
                                bookingTime === time 
                                  ? 'bg-coral/10 border-coral text-coral font-bold' 
                                  : 'bg-white/5 border-white/5 text-slate-300 hover:border-white/10'
                              }`}
                            >
                              {time}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="bg-teal/5 border border-teal/10 rounded-2xl p-4 mt-6">
                        <div className="flex gap-2.5">
                          <CheckCircle2 size={16} className="text-teal shrink-0 mt-0.5" />
                          <p className="text-xs text-teal-300">
                            Lawyer will meet you online/offline at this time to finalize paperwork and verify land titles with the state government registry.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: PAYMENT WORKFLOW */}
                  {bookingStep === 3 && (
                    <div className="space-y-5">
                      <h4 className="font-bold text-white text-sm mb-3 uppercase tracking-wider">Secure Legal Retainer Payment</h4>
                      
                      {/* Price breakdown */}
                      <div className="bg-navy p-4 rounded-2xl border border-white/5 space-y-3">
                        <div className="flex justify-between text-xs text-slate-300">
                          <span>{selectedService.title}</span>
                          <span>₦{selectedService.fee.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-300">
                          <span>Verified Lawyer Platform Fee</span>
                          <span>₦1,500</span>
                        </div>
                        <div className="h-px bg-white/10"></div>
                        <div className="flex justify-between text-sm font-extrabold text-white">
                          <span>Total Retainer Fee</span>
                          <span className="text-teal">₦{(selectedService.fee + 1500).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-400">Payment Method</label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => setPaymentMethod('Card')}
                            className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                              paymentMethod === 'Card' 
                                ? 'bg-coral/10 border-coral text-coral' 
                                : 'bg-white/5 border-white/5 text-slate-300'
                            }`}
                          >
                            <CreditCard size={18} />
                            <span className="text-[10px] font-bold">ATM Card</span>
                          </button>
                          
                          <button
                            onClick={() => setPaymentMethod('Bank Transfer')}
                            className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                              paymentMethod === 'Bank Transfer' 
                                ? 'bg-coral/10 border-coral text-coral' 
                                : 'bg-white/5 border-white/5 text-slate-300'
                            }`}
                          >
                            <Landmark size={18} />
                            <span className="text-[10px] font-bold">Transfer</span>
                          </button>

                          <button
                            onClick={() => setPaymentMethod('Wallet')}
                            className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                              paymentMethod === 'Wallet' 
                                ? 'bg-coral/10 border-coral text-coral' 
                                : 'bg-white/5 border-white/5 text-slate-300'
                            }`}
                          >
                            <Wallet size={18} />
                            <span className="text-[10px] font-bold">WALE Wallet</span>
                          </button>
                        </div>
                      </div>

                      {paymentMethod === 'Bank Transfer' && (
                        <div className="bg-[#071426] p-4 rounded-xl border border-white/5 text-xs text-slate-300 space-y-1.5">
                          <p className="font-bold text-white text-xs">WALE Escrow Account Details:</p>
                          <p>Bank: <strong>Sterling Bank Nigeria</strong></p>
                          <p>Account Number: <strong>0089283748</strong></p>
                          <p>Account Name: <strong>WALE PropTech Escrow LTD</strong></p>
                        </div>
                      )}

                      {paymentMethod === 'Card' && (
                        <div className="space-y-3 bg-[#071426] p-4 rounded-xl border border-white/5">
                          <input 
                            type="text" 
                            placeholder="Card Number (XXXX XXXX XXXX XXXX)" 
                            defaultValue="4123 4567 8901 2345" 
                            disabled
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input type="text" placeholder="MM/YY" defaultValue="12/28" disabled className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white" />
                            <input type="password" placeholder="CVV" defaultValue="•••" disabled className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* STEP 4: SUCCESS RECEIPT */}
                  {bookingStep === 4 && (
                    <div className="text-center py-6 space-y-4">
                      <div className="w-16 h-16 rounded-full bg-teal/20 text-teal flex items-center justify-center mx-auto shadow-lg shadow-teal/10">
                        <Check size={32} strokeWidth={3} />
                      </div>
                      
                      <div>
                        <h4 className="text-xl font-bold text-white">Payment Completed Successfully!</h4>
                        <p className="text-xs text-teal-300 mt-1">Legally Protected Retainer Transaction</p>
                      </div>

                      <div className="bg-navy p-5 rounded-3xl border border-white/5 space-y-3.5 max-w-sm mx-auto text-left text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Receipt Code:</span>
                          <span className="font-bold text-white font-mono">{receiptCode}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Attorney:</span>
                          <span className="font-bold text-white">{bookingLawyer.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Service booked:</span>
                          <span className="font-bold text-white truncate max-w-[180px]">{selectedService.title}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Time scheduled:</span>
                          <span className="font-bold text-white">{bookingDate} @ {bookingTime}</span>
                        </div>
                        <div className="flex justify-between border-t border-white/5 pt-2 font-bold">
                          <span className="text-slate-400">Escrow Paid:</span>
                          <span className="text-teal font-extrabold">₦{(selectedService.fee + 1500).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="pt-4 flex flex-col gap-2">
                        <Button 
                          className="bg-teal hover:bg-teal/95 text-white w-full" 
                          onClick={() => {
                            setBookingLawyer(null);
                            setBookingStep(1);
                            navigate('/dashboard/tenant');
                          }}
                        >
                          Go to Dashboard to track progress
                        </Button>
                        <button className="text-xs text-slate-400 hover:text-white underline py-1 flex items-center justify-center gap-1.5">
                          <Download size={14} /> Download PDF Receipt
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal footer navigation buttons */}
                {bookingStep < 4 && (
                  <div className="p-4 bg-navy/50 border-t border-white/10 flex justify-between gap-4">
                    {bookingStep > 1 ? (
                      <Button variant="outline" className="text-white border-white/10 hover:bg-white/5 flex-1" onClick={() => setBookingStep(bookingStep - 1)}>
                        Back
                      </Button>
                    ) : (
                      <Button variant="outline" className="text-white border-white/10 hover:bg-white/5 flex-1" onClick={() => setBookingLawyer(null)}>
                        Cancel
                      </Button>
                    )}

                    {bookingStep < 3 ? (
                      <Button className="bg-coral hover:bg-coral/95 text-white flex-1 flex items-center justify-center gap-1" onClick={() => setBookingStep(bookingStep + 1)}>
                        Continue <ArrowRight size={14} />
                      </Button>
                    ) : (
                      <Button className="bg-teal hover:bg-teal/95 text-white flex-1" isLoading={isPaying} onClick={handlePayment}>
                        Pay ₦{(selectedService.fee + 1500).toLocaleString()}
                      </Button>
                    )}
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
