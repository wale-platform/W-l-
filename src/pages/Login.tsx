import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Building2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'tenant' | 'landlord'>('tenant');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleDemoLogin = (demoRole: 'tenant' | 'landlord') => {
    setRole(demoRole);
    setEmail(demoRole === 'tenant' ? 'ibnmarzuk207@gmail.com' : 'landlord@wale.app');
    setPassword('1234');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate network delay
    setTimeout(() => {
      login(email, role);
      setIsLoading(false);
      navigate(role === 'tenant' ? '/dashboard/tenant' : '/dashboard/landlord');
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-blueprint opacity-20 pointer-events-none"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-gray-100 relative z-10"
      >
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white mb-6">
            <Building2 size={28} strokeWidth={1.5} />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Welcome to WALE</h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to continue your housing journey.
          </p>
        </div>

        <div className="flex p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setRole('tenant')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${role === 'tenant' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Tenant
          </button>
          <button
            onClick={() => setRole('landlord')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${role === 'landlord' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Landlord
          </button>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all sm:text-sm"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all sm:text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <Button type="submit" fullWidth size="lg" isLoading={isLoading}>
            Sign In
          </Button>
        </form>

        <div className="mt-6 border-t border-gray-100 pt-6">
          <p className="text-sm text-gray-500 mb-4 text-center">Demo Credentials</p>
          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" size="sm" onClick={() => handleDemoLogin('tenant')}>
              Demo Tenant
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleDemoLogin('landlord')}>
              Demo Landlord
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
