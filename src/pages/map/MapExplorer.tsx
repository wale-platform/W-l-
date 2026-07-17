import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Search, Filter, X, ChevronRight, Home, Building2, ShieldCheck, Map as MapIcon, Compass } from 'lucide-react';
import { mockProperties } from '../../data/mock';
import { PropertyCard } from '../../components/ui/PropertyCard';
import { Button } from '../../components/ui/Button';

// Utility to generate deterministic random based on string
const hashString = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
};

// Base coordinates for regions in Kwara (0-100 percentage)
const REGION_COORDS: Record<string, { x: number; y: number }> = {
  'Tanke': { x: 52.5, y: 55 },
  'University Road': { x: 53.5, y: 54 },
  'Fate': { x: 51, y: 49 },
  'GRA': { x: 49, y: 49 },
  'Malete': { x: 35, y: 25 },
  'Offa': { x: 65, y: 85 },
  'Omu-Aran': { x: 75, y: 75 },
  'Gaa Akanbi': { x: 52.5, y: 58 },
  'Adewole': { x: 45, y: 47.5 },
  'Ganmo': { x: 55, y: 62 },
};

const CAMPUSES = [
  { id: 'c1', name: 'University of Ilorin', short: 'UNILORIN', x: 54, y: 57 },
  { id: 'c2', name: 'Kwara State University', short: 'KWASU', x: 34, y: 24 },
  { id: 'c3', name: 'Al-Hikmah University', short: 'Al-Hikmah', x: 44, y: 47 },
  { id: 'c4', name: 'Landmark University', short: 'Landmark', x: 76, y: 74 },
  { id: 'c5', name: 'Federal Poly Offa', short: 'Offa Poly', x: 64, y: 86 }
];

export function MapExplorer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedProperty, setSelectedProperty] = useState<any | null>(null);
  const [activeCampus, setActiveCampus] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [filterType, setFilterType] = useState('All');
  const [showLegend, setShowLegend] = useState(true);
  
  // Assign coordinates with jitter
  const propertiesWithCoords = useMemo(() => {
    return mockProperties.map((p) => {
      const region = Object.keys(REGION_COORDS).find(k => p.location.includes(k)) || 'Tanke';
      const base = REGION_COORDS[region];
      const h = hashString(p.id);
      const jitterX = ((h % 100) / 100 - 0.5) * 3; // +/- 1.5%
      const jitterY = (((h >> 8) % 100) / 100 - 0.5) * 3;
      
      let statusColor = 'bg-green-500'; // Available
      if ((p.availability as string) === 'Coming Soon' || (p.availability as string) === 'Coming Soon') statusColor = 'bg-yellow-500';
      if (p.availability === 'Unavailable') statusColor = 'bg-red-500';
      if (p.featured) statusColor = 'bg-purple-500'; // Featured takes precedence
      
      return {
        ...p,
        mapX: base.x + jitterX,
        mapY: base.y + jitterY,
        statusColor
      };
    });
  }, []);
  
  const filteredProperties = propertiesWithCoords.filter(p => {
    if (filterType !== 'All' && p.type !== filterType) return false;
    // We could add more filters here
    return true;
  });

  const handleZoom = (direction: 1 | -1) => {
    setZoom(z => Math.max(0.5, Math.min(z + direction * 0.25, 3)));
  };

  return (
    <div className="relative w-full h-[calc(100vh-80px)] mt-20 bg-gray-100 overflow-hidden font-sans flex">
      {/* Sidebar / Filters (Optional desktop) */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 p-2 flex gap-2">
          <Button variant={filterType === 'All' ? 'primary' : 'ghost'} size="sm" onClick={() => setFilterType('All')}>All</Button>
          <Button variant={filterType === 'Apartment' ? 'primary' : 'ghost'} size="sm" onClick={() => setFilterType('Apartment')}>Apartments</Button>
          <Button variant={filterType === 'Studio' ? 'primary' : 'ghost'} size="sm" onClick={() => setFilterType('Studio')}>Studios</Button>
          <Button variant={filterType === 'Shared' ? 'primary' : 'ghost'} size="sm" onClick={() => setFilterType('Shared')}>Shared</Button>
        </div>
      </div>

      {/* Map Area */}
      <div 
        ref={containerRef}
        className="relative w-full h-full cursor-grab active:cursor-grabbing overflow-hidden"
      >
        <motion.div 
          className="absolute inset-0 origin-center"
          drag
          dragConstraints={containerRef}
          dragElastic={0.1}
          style={{ scale: zoom }}
          initial={{ x: 0, y: 0 }}
        >
          {/* Base Grid / Blueprint Layer */}
          <div className="absolute w-[2000px] h-[2000px] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-50 border border-gray-200 rounded-3xl overflow-hidden architectural-border">
            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]"></div>
            
            {/* Map Roads / Context (Abstract lines) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" xmlns="http://www.w3.org/2000/svg">
              <path d="M 1000 1100 Q 950 800 700 500" stroke="#0F766E" strokeWidth="4" fill="none" strokeDasharray="10 10"/>
              <path d="M 1000 1100 Q 1100 1400 1300 1700" stroke="#0F766E" strokeWidth="4" fill="none" strokeDasharray="10 10"/>
            </svg>

            {/* Campuses Layer */}
            {CAMPUSES.map(campus => (
              <div 
                key={campus.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10"
                style={{ left: `${campus.x}%`, top: `${campus.y}%` }}
              >
                <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent shadow-sm">
                    <GraduationCap size={16} />
                  </div>
                </div>
                <span className="text-xs font-bold text-gray-700 mt-1 bg-white/80 px-2 py-0.5 rounded shadow-sm backdrop-blur-sm whitespace-nowrap border border-gray-100">{campus.short}</span>
              </div>
            ))}

            {/* Property Markers */}
            {filteredProperties.map(property => (
              <motion.div
                key={property.id}
                className="absolute z-20 group"
                style={{ left: `${property.mapX}%`, top: `${property.mapY}%` }}
                whileHover={{ scale: 1.2, zIndex: 30 }}
                onClick={() => setSelectedProperty(property)}
              >
                {/* 3D Architectural Marker */}
                <div className="relative cursor-pointer">
                  {/* Base shadow */}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-black/20 rounded-full blur-[2px]"></div>
                  
                  {/* Building Block */}
                  <div className="relative w-6 h-8 bg-white border border-gray-300 rounded-sm shadow-md flex items-end overflow-hidden transform-gpu group-hover:-translate-y-2 transition-transform duration-300">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gray-100 border-b border-gray-200"></div>
                    <div className="w-full flex justify-between px-1 mb-1">
                      <div className="w-1 h-3 bg-gray-100 rounded-sm"></div>
                      <div className="w-1 h-3 bg-gray-100 rounded-sm"></div>
                    </div>
                    {/* Status indicator dot */}
                    <div className={`absolute top-1.5 right-1 w-1.5 h-1.5 rounded-full ${property.statusColor}`}></div>
                  </div>
                  
                  {/* Price Tag (Hover) */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-gray-900 text-white text-[10px] font-medium px-2 py-1 rounded shadow-xl whitespace-nowrap flex items-center gap-1">
                      ₦{(property.price / 1000).toFixed(0)}k
                      {property.verified && <ShieldCheck size={10} className="text-primary" />}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Map Controls */}
      <div className="absolute bottom-8 right-8 z-20 flex flex-col gap-2">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 p-1 flex flex-col gap-1">
          <button onClick={() => handleZoom(1)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-gray-700 font-medium text-xl">+</button>
          <div className="w-8 h-px bg-gray-200 mx-auto"></div>
          <button onClick={() => handleZoom(-1)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-gray-700 font-medium text-xl">-</button>
        </div>
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 p-1">
          <button className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-gray-700">
            <Compass size={20} />
          </button>
        </div>
      </div>

      {/* Legend */}
      <AnimatePresence>
        {showLegend && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute bottom-8 left-8 z-20 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-gray-200 w-48"
          >
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Map Legend</h4>
              <button onClick={() => setShowLegend(false)} className="text-gray-400 hover:text-gray-900"><X size={14}/></button>
            </div>
            <div className="flex flex-col gap-2 text-xs text-gray-600">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> Available</div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-500"></div> Limited / Soon</div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div> Occupied</div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-500"></div> Featured</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {!showLegend && (
        <button 
          onClick={() => setShowLegend(true)}
          className="absolute bottom-8 left-8 z-20 bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <MapIcon size={20} />
        </button>
      )}

      {/* Search This Area Button (Mocked appearance) */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20">
        <Button variant="glass" size="sm" className="shadow-lg border-gray-200 bg-white/90 text-gray-900 hover:bg-white px-6 rounded-full font-medium text-sm">
          Search This Area
        </Button>
      </div>

      {/* Property Details Drawer */}
      <AnimatePresence>
        {selectedProperty && (
          <>
            {/* Backdrop for mobile */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-900/20 z-30 md:hidden"
              onClick={() => setSelectedProperty(null)}
            />
            
            {/* Drawer */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-full md:w-[400px] bg-white shadow-2xl z-40 flex flex-col border-l border-gray-100"
            >
              <div className="relative h-64 shrink-0">
                <img src={selectedProperty.images[0]} alt={selectedProperty.title} className="w-full h-full object-cover" />
                <button 
                  onClick={() => setSelectedProperty(null)}
                  className="absolute top-4 left-4 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-colors"
                >
                  <X size={18} />
                </button>
                <div className="absolute bottom-4 left-4 flex gap-2">
                  <span className="bg-white/90 backdrop-blur-md px-2 py-1 rounded text-xs font-bold text-gray-900">{selectedProperty.type}</span>
                  {selectedProperty.verified && (
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                      <ShieldCheck size={12} /> Verified
                    </span>
                  )}
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto flex-grow flex flex-col gap-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">{selectedProperty.title}</h2>
                  <div className="flex items-center justify-between">
                    <p className="text-primary font-bold text-xl">₦{(selectedProperty.price).toLocaleString()}<span className="text-sm text-gray-500 font-normal">/yr</span></p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-start gap-3">
                    <MapPin size={18} className="text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{selectedProperty.location}</p>
                      <p className="text-xs text-gray-500 mt-1">{selectedProperty.distanceToUniversity} to {selectedProperty.universityNearby}</p>
                    </div>
                  </div>
                  <div className="h-px bg-gray-200 w-full"></div>
                  <div className="flex items-center gap-3">
                    <Home size={18} className="text-gray-400 shrink-0" />
                    <p className="text-sm text-gray-700">{selectedProperty.bedrooms} Bed • {selectedProperty.bathrooms} Bath • {selectedProperty.availability}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">Description</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{selectedProperty.description}</p>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedProperty.amenities.map((amenity: string, i: number) => (
                      <span key={i} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-xs font-medium">
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-gray-100 bg-white shrink-0 flex gap-3">
                <Button variant="outline" className="flex-1">Chat</Button>
                <Button className="flex-[2]">Book Inspection</Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// GraduationCap icon (needs to be imported from lucide-react above)
function GraduationCap(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21.42 10.922a2 2 0 0 0-.019-3.838L12.83 4.3a2 2 0 0 0-1.66 0L2.6 7.08a2 2 0 0 0 0 3.832l8.57 3.698a2 2 0 0 0 1.66 0z" />
      <path d="M22 10v6" />
      <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
    </svg>
  );
}
