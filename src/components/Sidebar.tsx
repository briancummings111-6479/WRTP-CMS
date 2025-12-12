import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, BarChart2, Download, ClipboardList, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const commonNavItems: { to: string; text: string; icon: React.ElementType }[] = [
  { to: '/', text: 'Dashboard', icon: Home },
  { to: '/todo', text: 'Task Management', icon: ClipboardList },
  { to: '/reports', text: 'Reports', icon: BarChart2 },
];

const adminNavItems: { to: string; text: string; icon: React.ElementType }[] = [
  { to: '/users', text: 'Users', icon: Users },
  { to: '/export', text: 'Data Export', icon: Download },
  { to: '/import', text: 'Data Import', icon: Upload },
];

// FIX: Use React.FC to correctly type the component, which allows React's special 'key' prop to be used without TypeScript errors.
const NavItem: React.FC<{ to: string, text: string, icon: React.ElementType }> = ({ to, text, icon: Icon }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${isActive
        ? 'bg-[#829b96] text-white'
        : 'text-slate-300 hover:bg-[#829b96] hover:text-white'
      }`
    }
  >
    <Icon className="w-5 h-5 mr-3" />
    {text}
  </NavLink>
);

const Sidebar = () => {
  const { user } = useAuth();
  const isAdmin = user?.title === 'Administrator';

  return (
    <div className="w-64 bg-[#6C8480] border-r border-[#5a6e69] flex flex-col no-print">
      <nav className="flex-1 px-4 py-4 space-y-2">
        {commonNavItems.map(({ to, text, icon }) => <NavItem key={to} to={to} text={text} icon={icon} />)}
        {isAdmin && adminNavItems.map(({ to, text, icon }) => <NavItem key={to} to={to} text={text} icon={icon} />)}
      </nav>
    </div>
  );
};

export default Sidebar;