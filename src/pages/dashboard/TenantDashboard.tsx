import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Calendar, MessageCircle, Sparkles, ShieldCheck, Scale, FileText, Download, Check, PenTool, Award, Clock, ArrowRight, UserCheck, Eye, QrCode, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { mockProperties } from '../../data/mock';
import { PropertyCard } from '../../components/ui/PropertyCard';
import { mockLegalRequests, mockDigitalAgreements, mockLawyers } from '../../data/legalMock';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

export function TenantDashboard() {
  const { user } = useAuth();
  
  // Local state to simulate live interaction (signing contracts, viewing agreements)
  const [activeTab, setActiveTab] = useState<'overview' | 'saved' | 'legal'>('overview');
  const [legalRequests, setLegalRequests] = useState(mockLegalRequests);
  const [agreements, setAgreements] = useState(mockDigitalAgreements);
  const [selectedAgreement, setSelectedAgreement] = useState<any | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [signingName, setSigningName] = useState('');
  
  const savedProperties = mockProperties.slice(0, 2);

  const handleSignAgreement = (agrId: string) => {
    if (!signingName) {
      alert('Please enter your full name as digital signature');
      return;
    }
    setIsSigning(true);
    setTimeout(() => {
      setAgreements(prev => 
        prev.map(agr => agr.id === agrId ? {
          ...agr,
          tenantSignature: `${signingName} (Signed Digitally)`,
          signedAt: new Date().toISOString().split('T')[0]
        } : agr)
      );
      setLegalRequests(prev => 
        prev.map(req => req.agreementId === agrId ? { ...req, status: 'Completed' } : req)
      );
      if (selectedAgreement) {
        setSelectedAgreement((prev: any) => ({
          ...prev,
          tenantSignature: `${signingName} (Signed Digitally)`,
          signedAt: new Date().toISOString().split('T')[0]
        }));
      }
      setIsSigning(false);
      setSigningName('');
      alert('Agreement successfully signed! It is now backed by NBA secure transaction escrow.');
    }, 1500);
  };

  return (
    <div className="min-h-screen pt-24 pb-16 bg-[#071426] text-white">
      {/* Blueprint background lines */}
      <div className="absolute inset-0 bg-blueprint opacity-10 pointer-events-none z-0"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Welcome Section */}
        <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-coral/10 text-coral text-xs font-bold px-2.5 py-1 rounded-full border border-coral/20">WALE Tenant Hub</span>
              <span className="bg-emerald-500/10 text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Active Tenant Account
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Welcome back, {user?.name}</h1>
            <p className="text-slate-300">Here is a secure overview of your rent applications and legal agreements.</p>
          </div>

          <Link to="/lawyers">
            <Button size="sm" className="bg-coral hover:bg-coral/95 text-white flex items-center gap-1.5 shadow-lg shadow-coral/20">
              <Scale size={16} /> Hire a WALE Lawyer
            </Button>
          </Link>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 mb-8 gap-2 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`pb-4 px-4 font-bold text-sm border-b-2 transition-all ${activeTab === 'overview' ? 'border-coral text-coral' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            Dashboard Overview
          </button>
          <button 
            onClick={() => setActiveTab('saved')}
            className={`pb-4 px-4 font-bold text-sm border-b-2 transition-all ${activeTab === 'saved' ? 'border-coral text-coral' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            Saved Homes ({savedProperties.length})
          </button>
          <button 
            onClick={() => setActiveTab('legal')}
            className={`pb-4 px-4 font-bold text-sm border-b-2 transition-all ${activeTab === 'legal' ? 'border-coral text-coral' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            Legal Partner Centre ({legalRequests.length})
          </button>
        </div>

        {activeTab === 'overview' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              {[
                { label: 'Saved Homes', value: savedProperties.length.toString(), icon: Heart, color: 'text-rose-500', bg: 'bg-rose-500/10 border-rose-500/20' },
                { label: 'Inspections Scheduled', value: '2', icon: Calendar, color: 'text-teal', bg: 'bg-teal/10 border-teal/20' },
                { label: 'Inbox Chats', value: '3', icon: MessageCircle, color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' },
                { label: 'Hired Attorneys', value: legalRequests.length.toString(), icon: Scale, color: 'text-coral', bg: 'bg-coral/10 border-coral/20' },
              ].map((stat, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`bg-[#0b1e36] p-6 rounded-2xl border ${stat.bg} shadow-md`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-white/5 ${stat.color}`}>
                      <stat.icon size={24} />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">{stat.value}</div>
                      <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">{stat.label}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-8">
                {/* Active Legal Progress Tracker */}
                <section className="bg-[#0b1e36] border border-white/5 rounded-3xl p-6 shadow-md">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <Scale className="text-coral" size={20} />
                      <h2 className="text-lg font-bold text-white">Active Legal Consultations & Escrows</h2>
                    </div>
                    <button onClick={() => setActiveTab('legal')} className="text-xs text-teal font-bold hover:underline flex items-center gap-0.5">
                      View details <ArrowRight size={12} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {legalRequests.map((req) => (
                      <div key={req.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-bold text-xs text-white">{req.serviceType}</span>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {req.id}</span>
                          </div>
                          <p className="text-xs text-slate-300">
                            Attorney: <strong>{req.lawyerId === 'law1' ? 'Barr. Tunde Williams' : 'Barr. Elizabeth Adebayo'}</strong>
                            {mockLawyers.find(l => l.id === req.lawyerId)?.phone && (
                              <span className="text-[11px] text-teal/80 font-mono ml-2 block sm:inline">
                                📞 {mockLawyers.find(l => l.id === req.lawyerId)?.phone}
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Property: {req.propertyName}</p>
                        </div>
                        <div className="flex flex-col sm:items-end gap-2 shrink-0">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            req.status === 'Completed' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : req.status === 'Agreement Drafted'
                                ? 'bg-coral/10 text-coral border border-coral/20'
                                : 'bg-teal/10 text-teal border border-teal/20'
                          }`}>
                            {req.status}
                          </span>
                          <button 
                            onClick={() => {
                              setActiveTab('legal');
                              if (req.agreementId) {
                                const agr = agreements.find(a => a.id === req.agreementId);
                                if (agr) setSelectedAgreement(agr);
                              }
                            }} 
                            className="text-xs text-teal font-semibold hover:underline flex items-center gap-0.5"
                          >
                            <Eye size={12} /> Legal Workspace
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Saved Properties brief list */}
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Recently Saved Properties</h2>
                    <button onClick={() => setActiveTab('saved')} className="text-sm font-semibold text-teal hover:underline">View all</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {savedProperties.map(property => (
                      <div key={property.id} className="bg-[#0b1e36] rounded-3xl overflow-hidden border border-white/5">
                        <img src={property.images[0]} alt="" className="h-40 w-full object-cover" />
                        <div className="p-4">
                          <h4 className="font-bold text-white truncate text-sm">{property.title}</h4>
                          <p className="text-xs text-slate-400 mt-1">{property.location}</p>
                          <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
                            <span className="text-coral font-bold text-xs">₦{property.price.toLocaleString()}/yr</span>
                            <Link to={`/properties/${property.id}`} className="text-xs text-teal font-bold hover:underline">View details</Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* Sidebar */}
              <div className="space-y-8">
                <section className="bg-[#0b1e36] p-6 rounded-3xl border border-white/5 shadow-md">
                  <h2 className="text-lg font-bold text-white mb-6">Upcoming Inspections</h2>
                  <div className="space-y-4">
                    <div className="flex gap-4 p-4 rounded-xl border border-white/5 bg-white/5">
                      <div className="w-12 h-12 rounded-xl bg-teal/10 border border-teal/20 flex flex-col items-center justify-center flex-shrink-0 text-teal">
                        <span className="text-[10px] font-bold uppercase leading-none">July</span>
                        <span className="text-lg font-extrabold mt-0.5">24</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-white mb-0.5 line-clamp-1 text-sm">Premium Studio Apartment</h4>
                        <p className="text-xs text-slate-400">10:00 AM • Tanke, Ilorin</p>
                      </div>
                    </div>
                  </div>
                </section>
                
                <section className="bg-gradient-to-br from-coral/20 to-teal/20 border border-white/10 p-6 rounded-3xl text-white shadow-md relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
                  <Sparkles className="text-coral mb-4" size={28} />
                  <h2 className="text-xl font-bold mb-2">Try AI Home Match</h2>
                  <p className="text-slate-300 text-sm mb-6">Let our custom algorithm match you with the perfect landlord based on school cluster and budget.</p>
                  <Link to="/ai-match">
                    <Button fullWidth className="bg-coral hover:bg-coral/95 text-white border-none shadow-lg">
                      Start Matching
                    </Button>
                  </Link>
                </section>
              </div>
            </div>
          </>
        )}

        {activeTab === 'saved' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {savedProperties.map(property => (
              <div key={property.id} className="relative">
                <PropertyCard property={property} />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'legal' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Legal requests list */}
            <div className="lg:col-span-5 space-y-6">
              <h3 className="text-lg font-bold text-white mb-2">Hired Attorneys & Agreements</h3>
              {legalRequests.map((req) => (
                <div 
                  key={req.id} 
                  onClick={() => {
                    if (req.agreementId) {
                      const agr = agreements.find(a => a.id === req.agreementId);
                      if (agr) setSelectedAgreement(agr);
                    } else {
                      alert('Agreement is still in drafting phase. Scheduled consultation on ' + req.date + ' at ' + req.time);
                    }
                  }}
                  className={`p-5 rounded-3xl border transition-all cursor-pointer ${
                    selectedAgreement?.requestId === req.id 
                      ? 'bg-coral/5 border-coral shadow-xl' 
                      : 'bg-[#0b1e36] border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-[10px] text-teal font-bold uppercase tracking-wider bg-teal/10 border border-teal/20 px-2 py-0.5 rounded-full">Legally Escrowed</span>
                      <h4 className="font-extrabold text-white text-base mt-2">{req.serviceType}</h4>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      req.status === 'Completed' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : req.status === 'Agreement Drafted'
                          ? 'bg-coral/10 text-coral border border-coral/20'
                          : 'bg-teal/10 text-teal border border-teal/20'
                    }`}>
                      {req.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">
                    Attorney: <strong>{req.lawyerId === 'law1' ? 'Barr. Tunde Williams' : 'Barr. Elizabeth Adebayo'}</strong>
                    {mockLawyers.find(l => l.id === req.lawyerId)?.phone && (
                      <span className="text-[11px] text-teal/80 font-mono ml-2 block sm:inline">
                        📞 {mockLawyers.find(l => l.id === req.lawyerId)?.phone}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Property: {req.propertyName}</p>

                  <div className="h-px bg-white/5 my-4"></div>

                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Paid Escrow Retainer: <strong>₦{req.feePaid.toLocaleString()}</strong></span>
                    <span className="text-teal font-semibold hover:underline flex items-center gap-0.5">
                      {req.agreementId ? 'Manage Agreement' : 'Scheduled Call'} <ChevronRight size={12} />
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Interactive Document signing centre */}
            <div className="lg:col-span-7">
              {selectedAgreement ? (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#0b1e36] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl relative"
                >
                  {/* Decorative stamp/seal */}
                  <div className="absolute top-6 right-6 border-2 border-emerald-500/30 text-emerald-400/50 rounded-full w-24 h-24 flex flex-col items-center justify-center p-1 uppercase font-bold text-[8px] tracking-widest rotate-12 select-none">
                    <ShieldCheck size={20} className="mb-0.5" />
                    <span>WALE Escrow</span>
                    <span>Verified</span>
                  </div>

                  <div className="flex items-center gap-2 mb-6">
                    <Award className="text-coral" size={24} />
                    <div>
                      <h3 className="font-extrabold text-white text-lg">Digital Agreement Centre</h3>
                      <p className="text-xs text-slate-400">Agreement ID: <span className="font-mono">{selectedAgreement.id}</span></p>
                    </div>
                  </div>

                  {/* Standard Agreement body */}
                  <div className="bg-[#071426] p-6 rounded-2xl border border-white/5 space-y-4 text-xs leading-relaxed text-slate-300 max-h-[450px] overflow-y-auto font-mono">
                    <p className="text-center font-bold text-sm text-white border-b border-white/10 pb-4 uppercase">
                      STANDARD TENANCY AGREEMENT
                    </p>
                    
                    <p><strong>DATE:</strong> {selectedAgreement.signedAt || 'PENDING SIGNATURE'}</p>
                    <p><strong>BETWEEN:</strong></p>
                    <p><strong>LANDLORD:</strong> {selectedAgreement.landlordName} (Verified Landlord)</p>
                    <p><strong>TENANT:</strong> {selectedAgreement.tenantName} (Verified Student Tenant)</p>
                    <p><strong>INTERMEDIARY LAWYER:</strong> {selectedAgreement.lawyerName}, Esq. (NBA Registrant)</p>
                    
                    <p className="border-t border-white/5 pt-3"><strong>PROPERTY DETAILS:</strong></p>
                    <p>{selectedAgreement.propertyName} located at {selectedAgreement.propertyLocation}.</p>
                    <p><strong>ANNUAL RENT:</strong> ₦{selectedAgreement.rentAmount.toLocaleString()} / year</p>
                    <p><strong>LEASE TERM:</strong> {selectedAgreement.duration}</p>

                    <p className="border-t border-white/5 pt-3 font-bold text-white uppercase">TERMS AND CONDITIONS (LEGAL CLAUSES):</p>
                    <ol className="list-decimal pl-4 space-y-2 text-[11px]">
                      {selectedAgreement.clauses.map((clause: string, idx: number) => (
                        <li key={idx}>{clause}</li>
                      ))}
                    </ol>

                    <div className="border-t border-white/10 pt-4 grid grid-cols-2 gap-4 mt-8">
                      {/* Landlord signature block */}
                      <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Landlord Signature</p>
                        <p className="font-bold text-white text-[11px] mt-2 italic font-serif text-teal">{selectedAgreement.landlordSignature}</p>
                      </div>

                      {/* Lawyer authorization seal */}
                      <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Lawyer Endorsement</p>
                        <p className="font-bold text-white text-[11px] mt-2 italic font-serif text-amber-500">{selectedAgreement.lawyerSignature}</p>
                      </div>
                    </div>

                    {/* Tenant signature block */}
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5 mt-4">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Tenant Digital Signature</p>
                      {selectedAgreement.tenantSignature ? (
                        <p className="font-bold text-emerald-400 text-[11px] mt-2 italic font-serif">{selectedAgreement.tenantSignature}</p>
                      ) : (
                        <p className="text-slate-500 text-[11px] mt-2 italic">PENDING TENANT SIGNATURE</p>
                      )}
                    </div>
                  </div>

                  {/* Signature Form action */}
                  {!selectedAgreement.tenantSignature ? (
                    <div className="mt-6 bg-navy/50 p-4 rounded-2xl border border-coral/20">
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5 text-coral">
                        <PenTool size={14} /> Digits Signature Pending
                      </h4>
                      <p className="text-[11px] text-slate-400 mb-3">Please type your full name exactly as stated on your legal profile to execute the lease agreement.</p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input 
                          type="text" 
                          placeholder="Type Full Name (e.g. Ibn Marzuk)" 
                          value={signingName}
                          onChange={(e) => setSigningName(e.target.value)}
                          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-coral flex-grow"
                        />
                        <Button 
                          size="sm" 
                          className="bg-coral hover:bg-coral/95 text-white" 
                          isLoading={isSigning} 
                          onClick={() => handleSignAgreement(selectedAgreement.id)}
                        >
                          Execute Agreement
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-2.5">
                        <Check className="text-emerald-400 font-extrabold shrink-0" size={20} />
                        <div>
                          <p className="font-bold text-emerald-300 text-xs">Agreement Fully Executed!</p>
                          <p className="text-[10px] text-slate-400">Secure digital copy stored safely in WALE digital registry.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="bg-white p-1 rounded-md shrink-0">
                          <QrCode size={32} className="text-[#071426]" />
                        </div>
                        <button className="text-xs text-teal font-bold hover:underline flex items-center gap-1">
                          <Download size={14} /> Download PDF
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="bg-[#0b1e36] border border-white/5 rounded-3xl p-12 text-center text-slate-400">
                  <FileText size={48} className="mx-auto mb-4 text-slate-500" />
                  <p className="font-bold text-white text-base">Select an Active Agreement</p>
                  <p className="text-xs mt-1">Select an active agreement from the list on the left to review legal clauses and sign electronically.</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
