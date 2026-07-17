import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { ArrowRight, MapPin } from 'lucide-react';

export function FinalCTA() {
  return (
    <section className="relative py-24 lg:py-32 bg-gray-900 overflow-hidden">
      {/* Architectural Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-blueprint-dark opacity-20 mix-blend-overlay"></div>
        <img 
          src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1600" 
          alt="Building" 
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent"></div>
        
        {/* Technical guides */}
        <div className="absolute top-1/2 left-10 w-24 h-px bg-primary/40"></div>
        <div className="absolute top-1/2 right-10 w-24 h-px bg-primary/40"></div>
        <div className="absolute top-10 left-1/2 w-px h-24 bg-primary/40"></div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
          Ready to Find Your Next Home?
        </h2>
        <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
          Start your housing journey with trusted listings designed specifically for students in Kwara State.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/properties" className="w-full sm:w-auto">
            <Button size="lg" className="w-full px-8 flex items-center gap-2">
              Browse Properties <ArrowRight size={18} />
            </Button>
          </Link>
          <Link to="/ai-match" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full px-8 flex items-center gap-2 border-gray-700 text-gray-200 hover:bg-gray-800 hover:text-white">
              <MapPin size={18} />
              Explore Near My Campus
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
