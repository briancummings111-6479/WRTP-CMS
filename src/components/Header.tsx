import React from 'react';
import { useAuth } from '../context/AuthContext';
import { User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  return (
    <header className="flex justify-between items-center p-4 bg-[#6C8480] border-b border-[#5a6e69] no-print">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <img src={logo} alt="CHYBA Logo" className="h-12 w-auto" />
          <span className="text-xl font-bold text-white tracking-wider">CHYBA-WRTP</span>
        </div>
        <div className="h-8 w-px bg-[#829b96] mx-4 hidden md:block"></div>
        <h1 className="text-lg font-semibold text-white hidden md:block">Client Management System (CMS)</h1>
      </div>
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-[#829b96] rounded-full">
            <User className="h-5 w-5 text-[#E6E6E6]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{user?.name}</p>
            <p className="text-xs text-slate-400 capitalize">{user?.title || (user?.role === 'viewer' ? 'Staff' : user?.role)}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-[#5a6e69] hover:bg-[#4b5c58] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5a6e69]"
          title="Log Out"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Log Out
        </button>
      </div>
    </header>
  );
};

export default Header;