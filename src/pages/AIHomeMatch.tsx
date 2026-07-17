import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Building2, Wallet, MapPin, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { PropertyCard } from '../components/ui/PropertyCard';
import { mockProperties } from '../data/mock';

export function AIHomeMatchPage() {
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setResults(mockProperties.slice(0, 2));
    }, 2500);
  };

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gray-50 relative overflow-hidden">
      <div className="absolute inset-0 bg-blueprint opacity-20 pointer-events-none"></div>
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="text-center mb-12">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6">
            <Sparkles size={32} />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">AI Home Match</h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Tell our AI what you're looking for, and we'll find the perfect properties that match your lifestyle and budget.
          </p>
        </div>

        {!results && !isGenerating && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-gray-100 architectural-border"
          >
            <div className="space-y-8">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Building2 size={18} className="text-primary" />
                  Which university are you attending?
                </label>
                <select className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none">
                  <option>University of Ilorin (UNILORIN)</option>
                  <option>Kwara State University (KWASU)</option>
                  <option>Al-Hikmah University</option>
                  <option>Landmark University</option>
                  <option>Summit University</option>
                  <option>Thomas Adewumi University</option>
                  <option>Federal Polytechnic Offa</option>
                  <option>Crown Hill University</option>
                  <option>Ojaja University</option>
                  <option>University of Offa</option>
                  <option>Lens University</option>
                  <option>Ahman Pategi University</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Wallet size={18} className="text-primary" />
                  What is your maximum annual budget?
                </label>
                <input 
                  type="range" 
                  min="100000" 
                  max="1000000" 
                  step="50000" 
                  className="w-full accent-primary" 
                />
                <div className="flex justify-between text-sm text-gray-500 mt-2">
                  <span>₦100k</span>
                  <span className="font-medium text-gray-900">₦500k</span>
                  <span>₦1M+</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <MapPin size={18} className="text-primary" />
                  Preferred distance to campus?
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['Walking', '5 mins drive', '15 mins drive', 'Any'].map((opt, i) => (
                    <div key={i} className={`px-4 py-3 border rounded-xl text-center text-sm font-medium cursor-pointer transition-colors ${i === 0 ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      {opt}
                    </div>
                  ))}
                </div>
              </div>

              <Button size="lg" fullWidth onClick={handleGenerate} className="mt-8 text-lg">
                <Sparkles size={20} className="mr-2" />
                Generate Matches
              </Button>
            </div>
          </motion.div>
        )}

        {isGenerating && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={48} className="text-primary animate-spin mb-6" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">Analyzing preferences...</h3>
            <p className="text-gray-500">Scanning thousands of verified properties.</p>
          </div>
        )}

        {results && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            <div className="bg-primary/10 border border-primary/20 p-6 rounded-2xl flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Analysis Complete</h3>
                <p className="text-sm text-gray-600 mt-1">Recommended for a University of Ilorin student based on your criteria.</p>
              </div>
              <div className="w-16 h-16 rounded-full bg-white border-4 border-primary flex items-center justify-center">
                <span className="text-xl font-bold text-primary">98%</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {results.map((property: any) => (
                <div key={property.id}>
                  <PropertyCard property={property} />
                </div>
              ))}
            </div>

            <div className="text-center pt-8">
              <Button variant="outline" onClick={() => setResults(null)}>
                Start Over
              </Button>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
