import React from 'react';
import { Home, Calendar, Trophy, User, LogOut, GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar = ({ activeTab, setActiveTab }) => {
  const { user, logout, darkMode } = useAuth();

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  return (
    <>
      {/* Mobile fixed bottom navigation bar */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 border-t border-white/10 z-50 h-20 px-4 backdrop-blur-md transition-colors duration-300 ${
        darkMode ? 'bg-black/95' : 'bg-[#0d4840]/95'
      }`}>
        <div className="flex justify-around items-center h-full max-w-lg mx-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="flex flex-col items-center justify-center w-16 h-full relative"
              >
                <Icon className={`w-6 h-6 transition-colors duration-200 ${isActive ? 'text-brand-emerald' : 'text-white/60'}`} />
                <span className={`text-[10px] font-semibold mt-1 transition-colors duration-200 ${isActive ? 'text-white' : 'text-white/40'}`}>
                  {item.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-1.5 w-1.5 h-1.5 bg-brand-emerald rounded-full active-dot" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Desktop sidebar navigation */}
      <aside className={`hidden md:flex flex-col fixed top-0 left-0 bottom-0 w-64 border-r border-white/10 p-6 z-40 transition-colors duration-300 ${
        darkMode ? 'bg-[#090909]' : 'bg-[#0d4840]/60'
      }`}>
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 bg-brand-glass rounded-xl border border-white/10 text-brand-emerald">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white leading-none tracking-tight">Mark_V1</h1>
            <span className="text-[10px] text-brand-emerald font-semibold uppercase tracking-wider">Attendance Platform</span>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 space-y-1.5">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 ${
                  isActive 
                    ? 'bg-brand-emerald text-white shadow-lg shadow-brand-emerald/20' 
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* User Quick Info & Logout */}
        <div className="border-t border-white/10 pt-6 mt-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-brand-emerald text-white flex items-center justify-center font-bold text-base shadow-inner">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">{user?.name}</div>
              <div className="text-xs text-white/50 truncate uppercase font-semibold">{user?.role}</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};

export default Navbar;
