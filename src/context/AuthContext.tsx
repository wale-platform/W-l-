import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string, role: 'tenant' | 'landlord' | 'lawyer') => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = (email: string, role: 'tenant' | 'landlord' | 'lawyer') => {
    // Mock login logic
    const mockUser: User = {
      id: role === 'tenant' ? 't1' : role === 'landlord' ? 'l1' : 'law1',
      name: role === 'tenant' ? 'Ibn Marzuk' : role === 'landlord' ? 'Wale Landlord' : 'Barr. Tunde Williams',
      email,
      role,
      avatar: role === 'tenant' 
        ? 'https://i.pravatar.cc/150?img=12' 
        : role === 'landlord' 
          ? 'https://i.pravatar.cc/150?img=11' 
          : 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=150',
    };
    setUser(mockUser);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
