import React from 'react';
import { motion } from 'motion/react';
import { Heart, Calendar, MessageCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { mockProperties } from '../../data/mock';
import { PropertyCard } from '../../components/ui/PropertyCard';
import { Link } from 'react-router-dom';

export function TenantDashboard() {
  const { user } = useAuth();
  
  // Mock data for dashboard
  const savedProperties = mockProperties.slice(0, 2);

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back, {user?.name}</h1>
          <p className="text-gray-600">Here's an overview of your housing journey.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Saved Homes', value: '5', icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50' },
            { label: 'Inspections', value: '2', icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-50' },
            { label: 'Messages', value: '3', icon: MessageCircle, color: 'text-amber-500', bg: 'bg-amber-50' },
            { label: 'AI Matches', value: '8', icon: Sparkles, color: 'text-primary', bg: 'bg-primary/10' },
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
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Saved Properties</h2>
                <Link to="/properties" className="text-sm font-medium text-primary hover:underline">View all</Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {savedProperties.map(property => (
                  <div key={property.id}>
                    <PropertyCard property={property} />
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-6">Upcoming Inspections</h2>
              <div className="space-y-4">
                <div className="flex gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50">
                  <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-gray-500 uppercase">Oct</span>
                    <span className="text-lg font-bold text-gray-900 leading-none">24</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1 line-clamp-1">Premium Studio Apartment</h4>
                    <p className="text-sm text-gray-500">10:00 AM • Tanke, Ilorin</p>
                  </div>
                </div>
              </div>
            </section>
            
            <section className="bg-gradient-to-br from-primary to-primary-dark p-6 rounded-2xl text-white shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
              <Sparkles className="text-accent mb-4" size={28} />
              <h2 className="text-xl font-bold mb-2">Try AI Home Match</h2>
              <p className="text-primary-100 text-sm mb-6">Let our AI find the perfect apartment based on your school, budget, and preferences.</p>
              <Link to="/ai-match">
                <button className="w-full py-2.5 bg-white text-primary font-medium rounded-lg hover:bg-gray-50 transition-colors">
                  Start Matching
                </button>
              </Link>
            </section>
          </div>
        </div>

      </div>
    </div>
  );
}
