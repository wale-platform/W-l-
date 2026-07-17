import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Logo } from '../ui/Logo';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Map', path: '/map' },
    { name: 'Browse Properties', path: '/properties' },
    { name: 'AI Match', path: '/ai-match' },
  ];

  const isHome = location.pathname === '/';

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b',
        isScrolled
          ? 'bg-[#071426]/90 backdrop-blur-lg border-white/10 shadow-lg py-3'
          : isHome
            ? 'bg-transparent border-transparent py-5'
            : 'bg-[#071426]/80 backdrop-blur-md border-white/10 py-5'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white transform transition-transform group-hover:scale-105 shadow-md shadow-primary/20">
              <Logo size={28} />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">WALE</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={cn(
                  'text-sm font-medium transition-colors hover:text-primary',
                  location.pathname === link.path ? 'text-primary' : 'text-gray-300 hover:text-white'
                )}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <Link to={user.role === 'tenant' ? '/dashboard/tenant' : '/dashboard/landlord'}>
                  <Button variant="glass" size="sm">Dashboard</Button>
                </Link>
                <Button variant="outline" size="sm" onClick={logout} className="text-white border-white/20 hover:bg-white/10">Logout</Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/5 hover:text-white">Login</Button>
                </Link>
                <Link to="/properties">
                  <Button size="sm" className="shadow-lg shadow-primary/25">Find a Home</Button>
                </Link>
              </>
            )}
          </div>

          <button
            className="md:hidden p-2 text-gray-300 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#071426] border-t border-white/10 overflow-hidden"
          >
            <div className="px-4 py-6 flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className={cn(
                    'text-lg font-medium transition-colors',
                    location.pathname === link.path ? 'text-primary' : 'text-gray-300 hover:text-white'
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <div className="h-px bg-white/10 my-2" />
              {user ? (
                <>
                  <Link to={user.role === 'tenant' ? '/dashboard/tenant' : '/dashboard/landlord'} onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="glass" fullWidth className="justify-start">Dashboard</Button>
                  </Link>
                  <Button variant="outline" fullWidth className="justify-start text-white border-white/20 hover:bg-white/10" onClick={() => { logout(); setMobileMenuOpen(false); }}>Logout</Button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" fullWidth className="justify-start text-white hover:bg-white/5">Login</Button>
                  </Link>
                  <Link to="/properties" onClick={() => setMobileMenuOpen(false)}>
                    <Button fullWidth className="justify-start shadow-lg shadow-primary/25">Find a Home</Button>
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
