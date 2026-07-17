import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { MapPin, Bed, Bath, ShieldCheck, Check, Calendar, MessageCircle, Heart, Share, Building2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { mockProperties } from '../data/mock';
import { formatCurrency } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export function PropertyDetailsPage() {
  const { id } = useParams();
  const property = mockProperties.find(p => p.id === id) || mockProperties[0];
  const { user } = useAuth();
  
  const [activeImage, setActiveImage] = useState(0);

  return (
    <div className="min-h-screen pt-24 pb-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700">
                {property.type}
              </span>
              {property.verified && (
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium flex items-center gap-1">
                  <ShieldCheck size={14} />
                  Verified
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{property.title}</h1>
            <div className="flex items-center gap-1.5 text-gray-500">
              <MapPin size={18} className="text-primary" />
              <span>{property.location}</span>
              <span className="mx-2 text-gray-300">•</span>
              <span>{property.distanceToUniversity} to {property.universityNearby}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" className="w-10 h-10 p-0 rounded-full"><Share size={18} /></Button>
            <Button variant="outline" size="sm" className="w-10 h-10 p-0 rounded-full"><Heart size={18} /></Button>
          </div>
        </div>

        {/* Gallery */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className="md:col-span-2 aspect-video md:aspect-auto md:h-[500px] rounded-2xl overflow-hidden relative group cursor-pointer architectural-border">
            <img 
              src={property.images[activeImage]} 
              alt="Property main" 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
          <div className="flex flex-row md:flex-col gap-4 overflow-x-auto md:overflow-visible h-32 md:h-[500px]">
            {property.images.map((img, i) => (
              <div 
                key={i} 
                onClick={() => setActiveImage(i)}
                className={`flex-shrink-0 w-40 md:w-full h-full md:h-0 md:flex-1 rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${activeImage === i ? 'border-primary' : 'border-transparent hover:border-gray-300'}`}
              >
                <img src={img} alt={`Thumbnail ${i}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          <div className="lg:col-span-2 space-y-12">
            {/* Quick Info */}
            <div className="flex items-center gap-8 py-6 border-y border-gray-100">
              <div className="flex items-center gap-3 text-gray-700">
                <Bed size={24} className="text-gray-400" />
                <span className="font-medium">{property.bedrooms} Bedrooms</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <Bath size={24} className="text-gray-400" />
                <span className="font-medium">{property.bathrooms} Bathrooms</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <Building2 size={24} className="text-gray-400" />
                <span className="font-medium">{property.type}</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">About this property</h3>
              <p className="text-gray-600 leading-relaxed">
                {property.description}
              </p>
            </div>

            {/* Amenities */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Amenities</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-8">
                {property.amenities.map((amenity, i) => (
                  <div key={i} className="flex items-center gap-2 text-gray-600">
                    <Check size={18} className="text-primary" />
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Location & Map */}
            <div className="pt-8 border-t border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Location & Neighborhood</h3>
              <p className="text-gray-600 mb-6">
                Located in {property.location}, offering quick access to {property.universityNearby} and local amenities.
              </p>
              
              <div className="relative rounded-2xl overflow-hidden border border-gray-200 architectural-border group">
                <div className="absolute inset-0 bg-grid-pattern opacity-30"></div>
                <img 
                  src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=1200" 
                  alt="Static Map Placeholder" 
                  className="w-full h-72 object-cover opacity-80"
                />
                
                {/* Pin marker */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping scale-150"></div>
                    <div className="bg-white rounded-full p-2 shadow-lg relative z-10">
                      <MapPin size={28} className="text-primary" />
                    </div>
                  </div>
                </div>
                
                {/* Landmarks Info */}
                <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md rounded-xl p-4 shadow-sm border border-white/50">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 border-b border-gray-100 pb-2">Proximity Guide</h4>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0"></div>
                      <span className="text-sm text-gray-700 truncate">{property.distanceToUniversity} to Campus</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0"></div>
                      <span className="text-sm text-gray-700 truncate">10 mins to Transport Hub</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                      <span className="text-sm text-gray-700 truncate">5 mins to Local Market</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0"></div>
                      <span className="text-sm text-gray-700 truncate">Near Post Office Area</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div>
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm sticky top-24">
              <div className="mb-6">
                <span className="text-sm text-gray-500 font-medium uppercase tracking-wider">Per annum</span>
                <div className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(property.price)}</div>
              </div>
              
              <div className="space-y-3 mb-8">
                <Link to={user ? "/booking" : "/login"}>
                  <Button fullWidth size="lg" className="flex gap-2">
                    <Calendar size={20} />
                    Book Inspection
                  </Button>
                </Link>
                <Link to={user ? "/chat" : "/login"}>
                  <Button variant="outline" fullWidth size="lg" className="flex gap-2">
                    <MessageCircle size={20} />
                    Chat Landlord
                  </Button>
                </Link>
              </div>

              {/* Landlord Profile */}
              <div className="pt-6 border-t border-gray-100">
                <div className="flex items-center gap-4">
                  <img 
                    src={property.landlord.avatar} 
                    alt={property.landlord.name} 
                    className="w-14 h-14 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="font-semibold text-gray-900">{property.landlord.name}</h4>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <ShieldCheck size={14} className="text-primary" />
                      <span>Verified Landlord</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
