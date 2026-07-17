import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Scale, Award, FileText, Check, Landmark, DollarSign, Calendar, Clock, UserCheck, CheckCircle2, ChevronRight, PenTool, Power, Ban } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { mockLegalRequests, mockDigitalAgreements } from '../../data/legalMock';
import { Button } from '../../components/ui/Button';

export function LawyerDashboard() {
  const { user } = userAuthHook();
  const [legalRequests, setLegalRequests] = useState(mockLegalRequests);
  const [agreements, setAgreements] = useState(mockDigitalAgreements);
  const [isAvailable, setIsAvailable] = useState(true);
  
  // Interactive drafting and endorsement center
  const [editingAgreement, setEditingAgreement] = useState<any | null>(null);
  const [lawyerSig, setLawyerSig] = useState('');
  const [draftingClause, setDraftingClause] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Custom helper for useAuth
  function userAuthHook() {
    return useAuth();
  }

  const handleEndorseAgreement = (agrId: string) => {
    if (!lawyerSig) {
      alert('Please input your name as legal authorization signature');
      return;
    }
    setIsUpdating(true);
    setTimeout(() => {
      setAgreements(prev => 
        prev.map(a => a.id === agrId ? {
          ...a,
          lawyerSignature: `${lawyerSig}, Esq. (Authorized)`,
          signedAt: new Date().toISOString().split('T')[0]
        } : a)
      );
      setEditingAgreement((prev: any) => ({
        ...prev,
        lawyerSignature: `${lawyerSig}, Esq. (Authorized)`,
        signedAt: new Date().toISOString().split('T')[0]
      }));
      setIsUpdating(false);
      setLawyerSig('');
      alert('Agreement successfully authorized and published to WALE ledger!');
    }, 1200);
  };

  const handleAddClause = (agrId: string) => {
    if (!draftingClause) return;
    setAgreements(prev => 
      prev.map(a => a.id === agrId ? {
        ...a,
        clauses: [...a.clauses, draftingClause]
      } : a)
    );
    setEditingAgreement((prev: any) => ({
      ...prev,
      clauses: [...prev.clauses, draftingClause]
    }));
    setDraftingClause('');
  };

  return (
    <div className="min-h-screen pt-24 pb-16 bg-[#071426] text-white relative">
      <div className="absolute inset-0 bg-blueprint opacity-10 pointer-events-none z-0"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header section with toggle-able status */}
        <div className="mb-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-teal/10 text-teal text-xs font-bold px-2.5 py-1 rounded-full border border-teal/20 flex items-center gap-1">
                <ShieldCheck size={12} /> NBA Registered Roll No: S09124
              </span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 transition-all ${
                isAvailable 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
                {isAvailable ? 'Receiving Client Queries' : 'Busy Status'}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">{user?.name || 'Barr. Tunde Williams, Esq.'}</h1>
            <p className="text-slate-300">WALE Supreme Legal Partner Panel. Secure escrow disbursements, drafting authorizations, and property verification.</p>
          </div>

          <button 
            onClick={() => setIsAvailable(!isAvailable)}
            className={`px-4 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-all ${
              isAvailable 
                ? 'bg-[#0b1e36] text-slate-300 border-white/10 hover:bg-white/5' 
                : 'bg-emerald-500 text-white border-none'
            }`}
          >
            <Power size={14} />
            {isAvailable ? 'Go Offline' : 'Go Online'}
          </button>
        </div>

        {/* Lawyer Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Assigned Clients', value: '4', icon: UserCheck, color: 'text-coral', bg: 'bg-coral/10 border-coral/20' },
            { label: 'Pending Agreements', value: agreements.length.toString(), icon: FileText, color: 'text-teal', bg: 'bg-teal/10 border-teal/20' },
            { label: 'Escrow Earnings', value: '₦65,000', icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
            { label: 'NBA Verification Rating', value: '100%', icon: Award, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          ].map((stat, i) => (
            <div 
              key={i}
              className="bg-[#0b1e36] p-6 rounded-2xl border border-white/5 shadow-md flex items-center gap-4"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-white/5 ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Legal Workspace columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Active Legal Cases (5 columns) */}
          <div className="lg:col-span-5 space-y-6">
            <h3 className="text-lg font-bold text-white">Active Case Assignments</h3>
            <div className="space-y-4">
              {legalRequests.map((req) => (
                <div 
                  key={req.id}
                  onClick={() => {
                    if (req.agreementId) {
                      const agr = agreements.find(a => a.id === req.agreementId);
                      if (agr) setEditingAgreement(agr);
                    } else {
                      alert('This case requires direct scheduling on ' + req.date + ' at ' + req.time);
                    }
                  }}
                  className={`p-5 rounded-3xl border transition-all cursor-pointer text-left ${
                    editingAgreement?.requestId === req.id 
                      ? 'bg-coral/5 border-coral shadow-lg' 
                      : 'bg-[#0b1e36] border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="bg-teal/10 border border-teal/20 text-teal text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Escrow Disbursed</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      req.status === 'Completed' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-coral/10 text-coral border border-coral/20'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-white text-base mt-2">{req.serviceType}</h4>
                  <p className="text-xs text-slate-300 mt-1">Tenant client: <strong>{req.tenantName}</strong></p>
                  <p className="text-xs text-slate-400">Property context: {req.propertyName}</p>
                  
                  <div className="h-px bg-white/5 my-4"></div>

                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Receipt Code: <strong>{req.paymentReceipt}</strong></span>
                    <span className="text-teal font-bold flex items-center gap-0.5">
                      Authorize Draft <ChevronRight size={12} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Agreement Editor & Draft customiser (7 columns) */}
          <div className="lg:col-span-7">
            {editingAgreement ? (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#0b1e36] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl relative"
              >
                <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
                  <PenTool className="text-coral" size={24} />
                  <div>
                    <h3 className="font-extrabold text-white text-lg">Agreement Drafting & Endorsement Center</h3>
                    <p className="text-xs text-slate-400">Editing Lease ID: <span className="font-mono">{editingAgreement.id}</span></p>
                  </div>
                </div>

                {/* Simulated Agreement draft with editable capability */}
                <div className="bg-[#071426] p-6 rounded-2xl border border-white/5 space-y-4 text-xs leading-relaxed text-slate-300 max-h-[350px] overflow-y-auto font-mono mb-6">
                  <p className="text-center font-bold text-sm text-white border-b border-white/10 pb-4 uppercase">
                    OFFICIAL TENANCY LEASE AGREEMENT
                  </p>
                  <p><strong>LEASE TERM:</strong> {editingAgreement.duration}</p>
                  <p><strong>LANDLORD:</strong> {editingAgreement.landlordName}</p>
                  <p><strong>STUDENT TENANT:</strong> {editingAgreement.tenantName}</p>
                  <p><strong>RENT VALUE:</strong> ₦{editingAgreement.rentAmount.toLocaleString()}/yr</p>

                  <p className="border-t border-white/5 pt-3 font-bold text-white uppercase">CUSTOM CLAUSES UNDER REVIEW:</p>
                  <ol className="list-decimal pl-4 space-y-2 text-[11px]">
                    {editingAgreement.clauses.map((clause: string, idx: number) => (
                      <li key={idx} className="relative group">
                        {clause}
                      </li>
                    ))}
                  </ol>

                  <div className="border-t border-white/10 pt-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Landlord Signature Status</p>
                      <p className="font-bold text-teal text-[11px] mt-1.5 italic font-serif">{editingAgreement.landlordSignature}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Student Signature Status</p>
                      <p className="font-bold text-teal text-[11px] mt-1.5 italic font-serif">{editingAgreement.tenantSignature || 'PENDING STUDENT SIGN'}</p>
                    </div>
                  </div>

                  <div className="p-2.5 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Attorney Endorsement Signature</p>
                    <p className="font-bold text-amber-500 text-[11px] mt-1.5 italic font-serif">{editingAgreement.lawyerSignature}</p>
                  </div>
                </div>

                {/* Form to insert custom legal clause */}
                <div className="mb-6 bg-navy/40 p-4 rounded-2xl border border-white/5">
                  <h4 className="font-bold text-white text-xs mb-2">Insert Tenancy Legal Clause</h4>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="e.g. Any party may terminate the lease on 60 days advance notice." 
                      value={draftingClause}
                      onChange={(e) => setDraftingClause(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-coral flex-grow"
                    />
                    <button 
                      onClick={() => handleAddClause(editingAgreement.id)}
                      className="bg-teal hover:bg-teal/95 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
                    >
                      Add Clause
                    </button>
                  </div>
                </div>

                {/* Formal Endorsement box */}
                <div className="bg-navy/50 p-4 rounded-2xl border border-coral/20">
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5 text-coral">
                    <Power size={14} /> Execute Legal Endorsement
                  </h4>
                  <p className="text-[11px] text-slate-400 mb-3">Sign as the assigned attorney to publish the lease draft to the tenant and landlord dashboards instantly.</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input 
                      type="text" 
                      placeholder="Type Full Name (e.g. Barr. Tunde Williams)" 
                      value={lawyerSig}
                      onChange={(e) => setLawyerSig(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-coral flex-grow"
                    />
                    <Button 
                      size="sm" 
                      className="bg-coral hover:bg-coral/95 text-white" 
                      isLoading={isUpdating} 
                      onClick={() => handleEndorseAgreement(editingAgreement.id)}
                    >
                      Sign & Endorse Lease
                    </Button>
                  </div>
                </div>

              </motion.div>
            ) : (
              <div className="bg-[#0b1e36] border border-white/5 rounded-3xl p-12 text-center text-slate-400">
                <FileText size={48} className="mx-auto mb-4 text-slate-500" />
                <p className="font-bold text-white text-base">Select an Active Case Draft</p>
                <p className="text-xs mt-1">Select any case list item on the left to start drafting customized tenancy agreements, adding custom clauses, and electronically authorizing agreements.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
