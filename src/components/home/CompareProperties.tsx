import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, MapPin, Building2, Minus, Plus, Bath, Bed, Trash2, X } from 'lucide-react';
import { Property } from '../../types';
import { mockProperties } from '../../data/mock';
import { formatCurrency } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Link } from 'react-router-dom';

export function CompareProperties() {
  // Default with two properties for demo purposes
  const [selectedProperties, setSelectedProperties] = useState<Property[]>([mockProperties[0], mockProperties[1]]);

  const removeProperty = (id: string) => {
    setSelectedProperties(prev => prev.filter(p => p.id !== id));
  };

  const addProperty = (property: Property) => {
    if (selectedProperties.length < 3 && !selectedProperties.find(p => p.id === property.id)) {
      setSelectedProperties(prev => [...prev, property]);
    }
  };

  const allAmenities = Array.from(new Set(selectedProperties.flatMap(p => p.amenities)));

  return (
    <section className="py-24 bg-white border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Compare Properties</h2>
          <p className="text-gray-600">Select up to three properties to compare their features side-by-side.</p>
        </div>

        <div className="overflow-x-auto pb-8">
          <div className="min-w-[800px]">
            {/* Header Row */}
            <div className="flex gap-4 mb-8">
              <div className="w-48 shrink-0 flex items-center">
                <h3 className="font-semibold text-gray-900">Property Details</h3>
              </div>
              
              {selectedProperties.map(property => (
                <div key={property.id} className="flex-1 relative architectural-border bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <button 
                    onClick={() => removeProperty(property.id)}
                    className="absolute -top-3 -right-3 w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-red-500 hover:border-red-200 shadow-sm transition-colors z-10"
                  >
                    <X size={16} />
                  </button>
                  <img src={property.images[0]} alt={property.title} className="w-full h-32 object-cover rounded-xl mb-4" />
                  <div className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded inline-block mb-2">
                    {property.type}
                  </div>
                  <h4 className="font-semibold text-gray-900 line-clamp-2 leading-tight mb-2 h-10">{property.title}</h4>
                  <div className="text-lg font-bold text-gray-900 mb-2">{formatCurrency(property.price)}<span className="text-xs text-gray-500 font-normal">/yr</span></div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <MapPin size={14} className="text-primary" />
                    <span className="truncate">{property.location}</span>
                  </div>
                </div>
              ))}

              {selectedProperties.length < 3 && (
                <div className="flex-1 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center p-6 text-gray-400 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition-colors cursor-pointer min-h-[250px]">
                  <Plus size={32} className="mb-2" />
                  <span className="text-sm font-medium text-gray-600">Add Property</span>
                </div>
              )}
            </div>

            {/* Comparison Rows */}
            <div className="space-y-4">
              {/* Distance */}
              <div className="flex gap-4 items-center py-4 border-b border-gray-100">
                <div className="w-48 shrink-0 text-sm font-medium text-gray-700">Distance to Campus</div>
                {selectedProperties.map(property => (
                  <div key={property.id} className="flex-1 text-sm text-gray-600 font-medium">
                    {property.distanceToUniversity}
                  </div>
                ))}
                {selectedProperties.length < 3 && <div className="flex-1"></div>}
              </div>

              {/* Rooms */}
              <div className="flex gap-4 items-center py-4 border-b border-gray-100">
                <div className="w-48 shrink-0 text-sm font-medium text-gray-700">Rooms</div>
                {selectedProperties.map(property => (
                  <div key={property.id} className="flex-1 flex gap-4">
                    <div className="flex items-center gap-1 text-sm text-gray-600"><Bed size={16}/> {property.bedrooms}</div>
                    <div className="flex items-center gap-1 text-sm text-gray-600"><Bath size={16}/> {property.bathrooms}</div>
                  </div>
                ))}
                {selectedProperties.length < 3 && <div className="flex-1"></div>}
              </div>

              {/* Amenities */}
              <div className="py-4">
                <div className="text-sm font-medium text-gray-700 mb-4">Amenities</div>
                <div className="space-y-3">
                  {allAmenities.map(amenity => (
                    <div key={amenity} className="flex gap-4 items-center p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="w-48 shrink-0 text-sm text-gray-600">{amenity}</div>
                      {selectedProperties.map(property => (
                        <div key={property.id} className="flex-1 flex items-center">
                          {property.amenities.includes(amenity) ? (
                            <Check size={18} className="text-primary" />
                          ) : (
                            <Minus size={18} className="text-gray-300" />
                          )}
                        </div>
                      ))}
                      {selectedProperties.length < 3 && <div className="flex-1"></div>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4 items-center pt-8">
                <div className="w-48 shrink-0"></div>
                {selectedProperties.map(property => (
                  <div key={property.id} className="flex-1">
                    <Link to={`/properties/${property.id}`}>
                      <Button fullWidth variant="outline">View Details</Button>
                    </Link>
                  </div>
                ))}
                {selectedProperties.length < 3 && <div className="flex-1"></div>}
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
