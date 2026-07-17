import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Bed, Bath, ShieldCheck, Heart } from 'lucide-react';
import { Property } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { motion } from 'motion/react';

interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({ property }: PropertyCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className="group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all architectural-border"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        <img 
          src={property.images[0]} 
          alt={property.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <div className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-900 shadow-sm">
            {property.type}
          </div>
          {property.verified && (
            <div className="px-3 py-1 bg-primary/90 backdrop-blur-sm rounded-full text-xs font-medium text-white shadow-sm flex items-center gap-1">
              <ShieldCheck size={14} />
              Verified
            </div>
          )}
        </div>
        <button className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-sm rounded-full text-gray-600 hover:text-red-500 hover:bg-white transition-colors shadow-sm z-10">
          <Heart size={18} />
        </button>
      </div>

      <div className="p-5">
        <div className="mb-4">
          <h3 className="font-semibold text-lg text-gray-900 line-clamp-1 mb-1 group-hover:text-primary transition-colors">
            {property.title}
          </h3>
          <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-2">
            <MapPin size={16} className="text-primary/70" />
            <span className="truncate">{property.location}</span>
          </div>
          <div className="text-xs text-gray-400">
            {property.distanceToUniversity} to {property.universityNearby}
          </div>
        </div>

        <div className="flex items-center gap-4 py-4 border-y border-gray-100 mb-4">
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <Bed size={18} className="text-gray-400" />
            <span>{property.bedrooms} Bed</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <Bath size={18} className="text-gray-400" />
            <span>{property.bathrooms} Bath</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500 mb-0.5">Per annum</div>
            <div className="font-bold text-lg text-gray-900">
              {formatCurrency(property.price)}
            </div>
          </div>
          <Link 
            to={`/properties/${property.id}`}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-primary transition-colors"
          >
            View Details
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
