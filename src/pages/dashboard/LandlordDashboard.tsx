import React from 'react';
import { motion } from 'motion/react';
import { Building2, Eye, Calendar, MessageSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { mockProperties } from '../../data/mock';

export function LandlordDashboard() {
  const { user } = useAuth();
  
  const myProperties = mockProperties.slice(0, 3);

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Landlord Dashboard</h1>
          <p className="text-gray-600">Manage your properties, tenants, and inspections.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Active Listings', value: '3', icon: Building2, color: 'text-primary', bg: 'bg-primary/10' },
            { label: 'Total Views', value: '1.2k', icon: Eye, color: 'text-blue-500', bg: 'bg-blue-50' },
            { label: 'Inspections', value: '5', icon: Calendar, color: 'text-rose-500', bg: 'bg-rose-50' },
            { label: 'Messages', value: '12', icon: MessageSquare, color: 'text-amber-500', bg: 'bg-amber-50' },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stat.bg} ${stat.color}`}>
                  <stat.icon size={24} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">My Properties</h2>
                <button className="text-sm font-medium text-primary hover:underline">Add New</button>
              </div>
              <div className="space-y-4">
                {myProperties.map(property => (
                  <div key={property.id} className="flex gap-4 p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                    <img src={property.images[0]} alt={property.title} className="w-24 h-24 rounded-lg object-cover" />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className="font-semibold text-gray-900 line-clamp-1">{property.title}</h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${property.availability === 'Available' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {property.availability}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{property.location}</p>
                      <div className="flex items-center gap-4 mt-3 text-sm font-medium text-gray-700">
                        <span>₦{property.price.toLocaleString()}/yr</span>
                        <span className="text-gray-300">•</span>
                        <span className="flex items-center gap-1 text-gray-500"><Eye size={14} /> 245 views</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-8">
            <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-6">Recent Inspection Requests</h2>
              <div className="space-y-4">
                {[1, 2].map((_, i) => (
                  <div key={i} className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Student Applicant {i + 1}</h4>
                        <p className="text-xs text-gray-500">Requested to view Studio Apt</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="flex-1 py-1.5 bg-primary text-white text-xs font-medium rounded-lg">Approve</button>
                      <button className="flex-1 py-1.5 border border-gray-200 text-gray-700 text-xs font-medium rounded-lg bg-white">Decline</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

      </div>
    </div>
  );
}
