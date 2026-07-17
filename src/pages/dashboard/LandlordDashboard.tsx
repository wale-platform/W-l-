import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Building2, Eye, Calendar, MessageSquare, ShieldCheck, Scale, Award, FileText, ArrowRight, UserCheck, Plus, Check, Send, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { mockProperties } from '../../data/mock';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router-dom';

export function LandlordDashboard() {
  const { user } = useAuth();
  const [properties, setProperties] = useState(mockProperties.slice(0, 3));
  const [legalInvites, setLegalInvites] = useState([
    { id: 'inv1', tenantName: 'Ibn Marzuk', propertyName: 'Premium Studio Apartment at Tanke', lawyerName: 'Barr. Tunde Williams', status: 'Draft Prepared' },
    { id: 'inv2', tenantName: 'Aisha Bello', propertyName: 'Modern 1-Bedroom Flat near KWASU', lawyerName: 'Barr. Elizabeth Adebayo', status: 'Pending Review' }
  ]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  // State for inviting lawyer
  const [selectedTenant, setSelectedTenant] = useState('Ibn Marzuk');
  const [selectedProperty, setSelectedProperty] = useState('Premium Studio Apartment at Tanke');
  const [selectedLawyer, setSelectedLawyer] = useState('Barr. Tunde Williams');
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const handleInviteLawyerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteSuccess(true);
    setTimeout(() => {
      setLegalInvites(prev => [
        ...prev,
        {
          id: 'inv' + (prev.length + 1),
          tenantName: selectedTenant,
          propertyName: selectedProperty,
          lawyerName: selectedLawyer,
          status: 'Request Dispatched'
        }
      ]);
      setInviteSuccess(false);
      setShowInviteModal(false);
      alert('Invitation dispatched to legal partner. They will contact you shortly to execute the draft.');
    }, 1500);
  };

  return (
    <div className="min-h-screen pt-24 pb-16 bg-[#071426] text-white relative">
      <div className="absolute inset-0 bg-blueprint opacity-10 pointer-events-none z-0"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header Section */}
        <div className="mb-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-teal/10 text-teal text-xs font-bold px-2.5 py-1 rounded-full border border-teal/20 flex items-center gap-1">
                <ShieldCheck size={12} /> NIMC Verified Landlord
              </span>
              <span className="bg-coral/10 text-coral text-xs font-bold px-2.5 py-1 rounded-full border border-coral/20">
                Premium Account
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Landlord Panel: {user?.name}</h1>
            <p className="text-slate-300">Manage your rental properties, verify legal deeds, and authorize tenancy agreements with verified lawyers.</p>
          </div>

          <div className="flex gap-3">
            <Button onClick={() => setShowInviteModal(true)} variant="outline" className="text-teal border-teal/20 hover:bg-teal/5 flex items-center gap-1.5 font-bold">
              <Scale size={16} /> Invite WALE Lawyer
            </Button>
            <Button className="bg-coral hover:bg-coral/95 text-white flex items-center gap-1.5 font-bold shadow-lg shadow-coral/25">
              <Plus size={16} /> Add Property Listing
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Active Listings', value: properties.length.toString(), icon: Building2, color: 'text-coral', bg: 'bg-coral/10 border-coral/20' },
            { label: 'Total Tenant Views', value: '1.4k', icon: Eye, color: 'text-teal', bg: 'bg-teal/10 border-teal/20' },
            { label: 'Inspections Booked', value: '4', icon: Calendar, color: 'text-sky-400', bg: 'bg-sky-400/10 border-sky-400/20' },
            { label: 'Legal Disputes Solved', value: '0', icon: Scale, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#0b1e36] p-6 rounded-2xl border border-white/5 shadow-md"
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
          
          {/* LEFT COLUMN: Property Listings with legal status */}
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-[#0b1e36] p-6 rounded-3xl border border-white/5 shadow-md">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                <h2 className="text-xl font-bold text-white">My Managed Properties</h2>
                <span className="text-xs text-slate-400">Total Valuation: ₦1,030,000 / yr</span>
              </div>
              <div className="space-y-4">
                {properties.map(property => (
                  <div key={property.id} className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                    <img src={property.images[0]} alt={property.title} className="w-24 h-24 rounded-xl object-cover shrink-0" />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-white text-base line-clamp-1">{property.title}</h4>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          property.availability === 'Available' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {property.availability}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{property.location}</p>
                      
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5 text-xs text-slate-300">
                        <div className="flex gap-4">
                          <span className="font-extrabold text-coral">₦{property.price.toLocaleString()}/yr</span>
                          <span className="text-slate-500">|</span>
                          <span className="flex items-center gap-1"><Eye size={12} /> 245 views</span>
                        </div>

                        {/* Property Legal Verification Status */}
                        <div className="flex items-center gap-1 bg-teal/10 text-teal px-2 py-0.5 rounded-full border border-teal/20 text-[9px] font-bold uppercase tracking-wider">
                          <Award size={10} /> Legally Verified Deed
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: Recent Legal Invites & Appointments */}
          <div className="space-y-8">
            <section className="bg-[#0b1e36] p-6 rounded-3xl border border-white/5 shadow-md">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                <h2 className="text-lg font-bold text-white">Legal Action Tracker</h2>
                <Scale size={18} className="text-coral" />
              </div>
              <div className="space-y-4">
                {legalInvites.map((invite) => (
                  <div key={invite.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 text-xs">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-white">Tenant: {invite.tenantName}</span>
                      <span className="bg-coral/10 text-coral border border-coral/20 px-2 py-0.5 rounded-full text-[9px] font-bold">
                        {invite.status}
                      </span>
                    </div>
                    <p className="text-slate-400 mt-1">Property: <strong className="text-slate-300">{invite.propertyName}</strong></p>
                    <p className="text-slate-400">Assigned Attorney: <strong className="text-slate-300">{invite.lawyerName}</strong></p>
                    
                    <div className="mt-3.5 pt-3.5 border-t border-white/5 flex gap-2">
                      <button className="flex-grow py-1.5 bg-teal text-white font-bold text-[10px] rounded-lg transition-colors hover:bg-teal/95 flex items-center justify-center gap-1">
                        <Check size={12} /> Review Draft Contract
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-[#0b1e36] p-6 rounded-3xl border border-white/5 shadow-md">
              <h2 className="text-lg font-bold text-white mb-6">Recent Inspection Queries</h2>
              <div className="space-y-4">
                {[
                  { name: 'Ibn Marzuk', desc: 'Requested physical tour for Studio Apartment' },
                  { name: 'Korede Alao', desc: 'Inquired about water supply reliability' }
                ].map((item, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 text-xs">
                    <div className="flex items-center gap-3 mb-3">
                      <img src={`https://i.pravatar.cc/150?img=${i + 20}`} alt="" className="w-8 h-8 rounded-full border border-white/10" />
                      <div>
                        <h4 className="font-bold text-white">{item.name}</h4>
                        <p className="text-slate-400 text-[11px]">{item.desc}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="flex-1 py-1.5 bg-coral text-white text-[10px] font-bold rounded-lg hover:bg-coral/95 transition-all">Approve</button>
                      <button className="flex-1 py-1.5 border border-white/10 text-slate-300 text-[10px] font-bold rounded-lg bg-navy/50 hover:bg-navy transition-all">Decline</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Invite Lawyer Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-navy/80 backdrop-blur-md" onClick={() => setShowInviteModal(false)}></div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0b1e36] border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-md relative z-10 text-left"
            >
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <Scale className="text-coral" /> Invite Legal Partner
              </h3>
              <p className="text-slate-300 text-xs mb-6">Authorize a vetted NBA attorney to construct a tenancy agreement based on verified Kwara real-estate laws.</p>
              
              <form onSubmit={handleInviteLawyerSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Select Tenant</label>
                  <select 
                    value={selectedTenant}
                    onChange={(e) => setSelectedTenant(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-coral"
                  >
                    <option value="Ibn Marzuk" className="bg-[#0b1e36] text-white">Ibn Marzuk (Vetted Student)</option>
                    <option value="Korede Alao" className="bg-[#0b1e36] text-white">Korede Alao</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Select Property</label>
                  <select 
                    value={selectedProperty}
                    onChange={(e) => setSelectedProperty(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-coral"
                  >
                    {properties.map(p => (
                      <option key={p.id} value={p.title} className="bg-[#0b1e36] text-white">{p.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Select Vetted Attorney</label>
                  <select 
                    value={selectedLawyer}
                    onChange={(e) => setSelectedLawyer(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-coral"
                  >
                    <option value="Barr. Tunde Williams" className="bg-[#0b1e36] text-white">Barr. Tunde Williams (Williams & Associate Chambers)</option>
                    <option value="Barr. Elizabeth Adebayo" className="bg-[#0b1e36] text-white">Barr. Elizabeth Adebayo (Adebayo & Partners)</option>
                  </select>
                </div>

                <div className="bg-teal/10 border border-teal/20 p-3.5 rounded-xl text-teal text-[11px] leading-relaxed flex gap-2">
                  <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                  <span>The chosen lawyer will review your property deed certificates automatically before drafting the tenancy contract.</span>
                </div>

                <div className="pt-4 flex gap-3">
                  <Button type="button" variant="outline" className="flex-1 text-white border-white/10" onClick={() => setShowInviteModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 bg-coral hover:bg-coral/95 text-white flex items-center justify-center gap-1 font-bold">
                    <Send size={14} /> Send Invitation
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
