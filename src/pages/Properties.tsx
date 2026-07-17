import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Search } from 'lucide-react';
import { PropertyCard } from '../components/ui/PropertyCard';
import { Button } from '../components/ui/Button';
import { mockProperties } from '../data/mock';

export function PropertiesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredProperties = useMemo(() => {
    return mockProperties.filter(p => {
      const term = searchTerm.toLowerCase();
      if (!term) return true;
      
      // Check location, title, type, university
      if (p.location.toLowerCase().includes(term)) return true;
      if (p.title.toLowerCase().includes(term)) return true;
      if (p.type.toLowerCase().includes(term)) return true;
      if (p.universityNearby.toLowerCase().includes(term)) return true;
      
      // Naive budget check (e.g., if user types "500000" or "500k")
      const priceStr = p.price.toString();
      if (priceStr.includes(term)) return true;
      if (term.includes('k') && priceStr.startsWith(term.replace('k', '000'))) return true;

      return false;
    });
  }, [searchTerm]);

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse Properties</h1>
          <p className="text-gray-600">Find your ideal home from our verified listings across Kwara State.</p>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8 architectural-border">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-grow relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by university, area, apartment type, or budget (e.g. 'UNILORIN', 'Tanke', 'Self Contain')"
                className="block w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button>Search</Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProperties.length > 0 ? (
            filteredProperties.map((property, index) => (
              <motion.div
                key={property.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
              >
                <PropertyCard property={property} />
              </motion.div>
            ))
          ) : (
            <div className="col-span-full text-center py-20">
              <h3 className="text-xl font-medium text-gray-900 mb-2">No properties found</h3>
              <p className="text-gray-500">Try adjusting your search criteria or explore other areas in Kwara State.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
