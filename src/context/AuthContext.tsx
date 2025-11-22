
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  loginAs: (role: UserRole) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mockAdmin: User = {
  uid: 'admin001',
  name: 'Casey Manager',
  email: 'casey.manager@chwrtp.org',
  role: 'admin',
};

const mockViewer: User = {
  uid: 'viewer001',
  name: 'Pat Observer',
  email: 'pat.observer@chwrtp.org',
  role: 'viewer',
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(mockAdmin); // Default to admin for demo

  const loginAs = (role: UserRole) => {
    if (role === 'admin') {
      setUser(mockAdmin);
    } else {
      setUser(mockViewer);
    }
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loginAs, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
