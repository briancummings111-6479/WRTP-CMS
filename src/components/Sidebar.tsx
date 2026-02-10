import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Users, BarChart2, Download, ClipboardList, Upload, FileBarChart, Building2, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavItemProps {
  to?: string;
  text: string;
  icon: React.ElementType;
  children?: { to: string; text: string; icon?: React.ElementType }[];
}

const NavItem: React.FC<NavItemProps> = ({ to, text, icon: Icon, children }) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = children && children.length > 0;

  // Check if any child is active to keep menu open or interact with parent
  const isChildActive = children?.some(child => location.pathname === child.to);
  const isActive = to ? location.pathname === to : false;


  // Removed stray braces

  // Auto-open if child is active - User requested hover-only behavior mostly, 
  // but usually active menus stay open. 
  // If user wants "only when moused over", maybe they mean literally only on hover?
  // Let's assume active state keeps it open, but hover triggers it too.
  // actually, if they interact with it, it needs to stay open.

  // New logic: 
  // Container handles Enter/Leave. 

  React.useEffect(() => {
    if (isChildActive) setIsOpen(true);
  }, [isChildActive]);

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {to && !hasChildren ? (
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
      ) : (
        <div
          className={`flex items-center justify-between px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 cursor-pointer ${isOpen || isActive || isChildActive ? 'bg-[#829b96]/50 text-white' : 'text-slate-300 hover:bg-[#829b96] hover:text-white'}`}
        // onClick removed to rely on hover, or strictly for mobile compatibility we might need it.
        >
          <div className="flex items-center">
            <Icon className="w-5 h-5 mr-3" />
            {to ? <NavLink to={to} className="hover:underline">{text}</NavLink> : <span>{text}</span>}
          </div>
          {hasChildren && (
            isOpen ? <ChevronDown className="w-4 h-4 ml-2" /> : <ChevronRight className="w-4 h-4 ml-2" />
          )}
        </div>
      )}

      {/* Dropdown / Nested Menu */}
      {hasChildren && isOpen && (
        <div
          className="ml-8 mt-1 space-y-1"
        >
          {children.map(child => (
            <NavLink
              key={child.to}
              to={child.to}
              className={({ isActive }) =>
                `flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${isActive
                  ? 'bg-[#829b96] text-white'
                  : 'text-slate-400 hover:bg-[#829b96] hover:text-white'
                }`
              }
            >
              {child.text}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
};

const commonNavItems: NavItemProps[] = [
  { to: '/', text: 'Dashboard', icon: Home },
  { to: '/jobs', text: 'Jobs Dashboard', icon: FileBarChart },
  { to: '/todo', text: 'Task Management', icon: ClipboardList },
  {
    text: 'Partners & Engagement',
    icon: Building2,
    children: [
      { to: '/partners', text: 'Partner Directory' },
      { to: '/engagements', text: 'Engagement History' }
    ]
  },
  { to: '/reports', text: 'Reports', icon: BarChart2 },
];

const adminNavItems: NavItemProps[] = [
  { to: '/users', text: 'Users', icon: Users },
  { to: '/export', text: 'Data Export', icon: Download },
  { to: '/import', text: 'Data Import', icon: Upload },
];

const Sidebar = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="w-64 bg-[#6C8480] border-r border-[#5a6e69] flex flex-col no-print h-full font-sans">
      <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
        {commonNavItems.map((item, idx) => <NavItem key={idx} {...item} />)}
        {isAdmin && <div className="border-t border-[#829b96] my-2 pt-2"></div>}
        {isAdmin && adminNavItems.map((item, idx) => <NavItem key={`admin-${idx}`} {...item} />)}
      </nav>
    </div>
  );
};

export default Sidebar;