import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, Twitter, Instagram, Linkedin, Mail, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';

export function Footer() {
  return (
    <footer className="bg-gray-950 text-gray-400 pt-20 pb-8 border-t border-gray-900 relative overflow-hidden">
      {/* Subtle blueprint overlay */}
      <div className="absolute inset-0 bg-blueprint-dark opacity-5 pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 mb-16">
          
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white">
                <Building2 size={24} strokeWidth={1.5} />
              </div>
              <span className="text-2xl font-bold tracking-tight text-white">WALE</span>
            </Link>
            <p className="text-sm text-gray-400 mb-8 max-w-xs leading-relaxed">
              Find trusted homes. Connect directly with landlords. Rent with confidence. Starting with Kwara State.
            </p>
            
            {/* Newsletter */}
            <div className="mb-8">
              <h5 className="text-sm font-semibold text-white mb-3">Subscribe to Newsletter</h5>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-primary w-full"
                />
                <Button size="sm" className="px-4">
                  <ArrowRight size={16} />
                </Button>
              </div>
            </div>

            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-gray-400 hover:bg-primary hover:text-white transition-all"><Twitter size={18} /></a>
              <a href="#" className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-gray-400 hover:bg-primary hover:text-white transition-all"><Instagram size={18} /></a>
              <a href="#" className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-gray-400 hover:bg-primary hover:text-white transition-all"><Linkedin size={18} /></a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-6">Company</h4>
            <ul className="space-y-4 text-sm">
              <li><Link to="#" className="hover:text-primary transition-colors">About WALE</Link></li>
              <li><Link to="#" className="hover:text-primary transition-colors">Mission</Link></li>
              <li><Link to="#" className="hover:text-primary transition-colors">Roadmap</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-6">Product</h4>
            <ul className="space-y-4 text-sm">
              <li><Link to="/properties" className="hover:text-primary transition-colors">Browse Properties</Link></li>
              <li><Link to="#" className="hover:text-primary transition-colors">Book Inspection</Link></li>
              <li><Link to="#" className="hover:text-primary transition-colors">Saved Homes</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-6">Resources</h4>
            <ul className="space-y-4 text-sm">
              <li><Link to="#" className="hover:text-primary transition-colors">Housing Guide</Link></li>
              <li><Link to="#" className="hover:text-primary transition-colors">Safety Tips</Link></li>
              <li><Link to="#" className="hover:text-primary transition-colors">Rental Checklist</Link></li>
              <li><Link to="#" className="hover:text-primary transition-colors">Campus Areas</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-6">Contact & Legal</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-center gap-2">
                <Mail size={16} className="text-gray-500" />
                <a href="mailto:hello@wale.app" className="hover:text-primary transition-colors">hello@wale.app</a>
              </li>
              <li><Link to="#" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="#" className="hover:text-primary transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-900 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-600">
          <p>© {new Date().getFullYear()} WALE Housing Ecosystem. All rights reserved.</p>
          <div className="flex gap-6">
            <span>Built for Nigerian Students</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
