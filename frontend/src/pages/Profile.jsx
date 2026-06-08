import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Globe, Shield, Lock, FileText, ChevronRight } from 'lucide-react';

export const Profile = () => {
  const { user, logout, darkMode } = useAuth();

  const settingsRows = [
    { label: 'Language', icon: Globe, value: 'English (US)' },
    { label: 'Change Password', icon: Lock },
    { label: 'Privacy Policy', icon: Shield },
    { label: 'Terms & Conditions', icon: FileText }
  ];

  return (
    <div className="max-w-md mx-auto w-full flex flex-col items-center">
      {/* Profile Header Card */}
      <div className={`rounded-card w-full p-6 flex flex-col items-center mb-6 transition-all duration-300 ${
        darkMode ? 'bg-[#121212] border border-brand-emerald/20 text-white' : 'bg-white text-zinc-800 shadow-card'
      }`}>
        <div className={`w-24 h-24 rounded-full bg-brand-emerald text-white flex items-center justify-center font-bold text-4xl shadow-md border-4 mb-4 animate-pulse-slow ${
          darkMode ? 'border-zinc-800' : 'border-emerald-50'
        }`}>
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <h2 className={`text-2xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-zinc-950'}`}>{user?.name}</h2>
        <p className={`text-sm font-bold uppercase tracking-wider px-3 py-1 rounded-full mt-1 ${
          darkMode ? 'bg-zinc-900 text-zinc-300' : 'bg-zinc-100 text-zinc-500'
        }`}>
          {user?.role === 'ADMIN' ? 'Administrator' : `Student`}
        </p>
        
        {user?.class && (
          <p className={`text-xs font-semibold mt-2.5 px-2.5 py-1 rounded-lg border ${
            darkMode ? 'bg-brand-emerald/10 border-brand-emerald/20 text-brand-emerald' : 'bg-emerald-50 border-emerald-100 text-brand-emerald'
          }`}>
            {user.class.stream} • Year {user.class.academic_year} • Div {user.class.division}
          </p>
        )}

        <p className={`text-xs mt-2 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{user?.email}</p>
      </div>

      {/* Settings Options Card */}
      <div className={`rounded-card w-full overflow-hidden mb-6 transition-all duration-300 ${
        darkMode ? 'bg-[#121212] border border-brand-emerald/20 text-white' : 'bg-white text-zinc-800 shadow-card'
      }`}>
        <div className={`divide-y ${darkMode ? 'divide-zinc-800/60' : 'divide-zinc-100'}`}>
          {settingsRows.map((row, index) => {
            const Icon = row.icon;
            return (
              <div
                key={index}
                className={`flex items-center justify-between px-6 py-4.5 transition-colors cursor-pointer ${
                  darkMode ? 'hover:bg-zinc-900/40' : 'hover:bg-zinc-50'
                }`}
              >
                <div className={`flex items-center gap-4 ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  <div className={`p-2 rounded-xl ${darkMode ? 'bg-zinc-900 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`font-bold text-sm ${darkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>{row.label}</span>
                </div>
                <div className={`flex items-center gap-2 text-sm font-semibold ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {row.value && <span className={`text-xs font-semibold mr-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>{row.value}</span>}
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full-width Log Out Button */}
      <button
        onClick={logout}
        className="w-full bg-brand-emerald hover:bg-brand-secondary text-white py-4 rounded-2xl font-bold text-sm shadow-md shadow-brand-emerald/15 hover:shadow-lg transition-all flex items-center justify-center gap-2 mb-24 md:mb-6"
      >
        <LogOut className="w-5 h-5" />
        LOG OUT
      </button>
    </div>
  );
};

export default Profile;
