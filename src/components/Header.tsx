import React from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Users } from 'lucide-react';
import { UserRole } from '../types';

const Header = () => {
  const { user, loginAs } = useAuth();

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    loginAs(e.target.value as UserRole);
  };

  return (
    <header className="flex justify-between items-center p-4 bg-[#6C8480] border-b border-[#5a6e69] no-print">
      <div>
        <h1 className="text-xl font-semibold text-white">WRTP CMS</h1>
      </div>
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-slate-300">Switch Role (Demo):</span>
            <select
              value={user?.role}
              onChange={handleRoleChange}
              className="p-1 border border-[#829b96] rounded-md text-sm bg-[#829b96] text-white focus:ring-[#829b96] focus:border-[#829b96]"
            >
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
        </div>
        <div className="flex items-center space-x-2">
            <div className="p-2 bg-[#829b96] rounded-full">
                <User className="h-5 w-5 text-[#E6E6E6]" />
            </div>
            <div>
                <p className="text-sm font-semibold text-white">{user?.name}</p>
                <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
            </div>
        </div>
      </div>
    </header>
  );
};

export default Header;