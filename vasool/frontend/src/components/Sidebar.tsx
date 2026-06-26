import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  FileText, 
  BellRing, 
  Settings as SettingsIcon, 
  ShieldAlert,
  LogOut,
  Wallet
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Ledger', path: '/ledger', icon: BookOpen },
    { name: 'Reports', path: '/reports', icon: FileText },
    { name: 'Reminders', path: '/reminders', icon: BellRing },
    { name: 'Settings', path: '/settings', icon: SettingsIcon },
    { name: 'Data Management', path: '/data-management', icon: ShieldAlert },
  ];

  return (
    <div className="w-64 bg-slate-950 text-slate-100 flex flex-col h-screen fixed left-0 top-0 border-r border-slate-800 z-10">
      {/* Brand Header */}
      <div className="p-6 flex items-center space-x-3 border-b border-slate-900">
        <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-500/30">
          <Wallet size={24} />
        </div>
        <div>
          <h1 className="font-display font-extrabold text-xl tracking-wide bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            VASOOL
          </h1>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
            Due & Reminder System
          </p>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) => `
              flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300
              ${isActive 
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/20 scale-[1.02]' 
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'}
            `}
          >
            <item.icon size={20} />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer / User Profile */}
      <div className="p-4 border-t border-slate-900 bg-slate-950/50">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/50 border border-slate-900">
          <div className="overflow-hidden">
            <p className="text-xs text-slate-400">Welcome,</p>
            <p className="text-sm font-semibold truncate text-slate-200" title={user?.owner_name}>
              {user?.owner_name || 'Shop Owner'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors duration-200"
            title="Log Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
