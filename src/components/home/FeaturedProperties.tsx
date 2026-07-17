import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { PropertyCard } from '../ui/PropertyCard';
import { mockProperties } from '../../data/mock';

export function FeaturedProperties() {
  const featuredProperties = mockProperties.filter(p => p.featured).slice(0, 3);

  return (
    <section className="py-24 bg-gray-50 relative">
      <div className="absolute inset-0 bg-blueprint opacity-20 pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured Properties</h2>
            <p className="text-gray-600 text-lg">Handpicked premium student housing available for immediate inspection.</p>
          </div>
          <Link to="/properties">
            <Button variant="outline" className="flex items-center gap-2 bg-white">
              View All <ArrowRight size={18} />
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredProperties.map(property => (
            <div key={property.id}>
              <PropertyCard property={property} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
