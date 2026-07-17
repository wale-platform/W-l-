import React from 'react';
import { Shield, Eye, MessageCircle, Wallet, GraduationCap, Clock } from 'lucide-react';

export function TrustBar() {
  const trusts = [
    { icon: Shield, label: 'Verified Listings' },
    { icon: Wallet, label: 'Transparent Pricing' },
    { icon: MessageCircle, label: 'Direct Landlord Contact' },
    { icon: Eye, label: 'No Hidden Fees' },
    { icon: GraduationCap, label: 'Student Focused' },
    { icon: Clock, label: 'Instant Booking' },
  ];

  return (
    <div className="bg-gray-900 py-6 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {trusts.map((item, i) => (
            <div key={i} className="flex items-center gap-3 justify-center lg:justify-start group">
              <item.icon size={18} className="text-gray-400 group-hover:text-primary transition-colors" />
              <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
