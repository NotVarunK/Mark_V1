import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Sun, Moon } from 'lucide-react';

export const Signup = () => {
  const { darkMode, toggleDarkMode } = useAuth();


  return (
    <div className={`min-h-screen flex flex-col justify-center items-center p-4 relative transition-colors duration-300 ${
      darkMode ? 'bg-black text-white' : 'bg-brand-teal text-white'
    }`}>
      {/* Theme Toggle Button */}
      <button
        onClick={toggleDarkMode}
        className="absolute top-6 right-6 p-3 bg-brand-glass rounded-xl border border-white/10 hover:bg-white/10 transition-colors text-white"
        title="Toggle Theme"
      >
        {darkMode ? <Sun className="w-5 h-5 text-brand-emerald" /> : <Moon className="w-5 h-5" />}
      </button>

      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-brand-glass rounded-2xl border border-white/10 text-brand-emerald">
          <GraduationCap className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-white leading-none tracking-tight">Mark_V1</h1>
          <span className="text-xs text-brand-emerald font-semibold uppercase tracking-wider">Attendance System</span>
        </div>
      </div>

      {/* Floating Card */}
      <div className={`w-full max-w-md rounded-card p-8 shadow-card transition-all duration-300 ${
        darkMode ? 'bg-[#121212] border border-brand-emerald/20 text-white' : 'bg-white text-zinc-800'
      }`}>
        <h2 className={`text-2xl font-bold text-center mb-1.5 ${darkMode ? 'text-white' : 'text-zinc-950'}`}>Google Sign-In Required</h2>
        <p className={`text-sm text-center mb-6 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Academic Registration Policy</p>

        <div className={`p-5 rounded-2xl border mb-6 flex flex-col items-center text-center gap-4 ${
          darkMode ? 'bg-brand-emerald/5 border-brand-emerald/10' : 'bg-emerald-50/50 border-emerald-100'
        }`}>
          <div className="p-3 bg-brand-emerald/10 rounded-2xl text-brand-emerald">
            <GraduationCap className="w-8 h-8" />
          </div>
          <div>
            <div className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-zinc-900'}`}>Single Sign-On Enabled</div>
            <p className={`text-xs mt-2 leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Mark_V1 registration and login is now managed exclusively through **Google Sign-In**. Please use your official college email ending in <span className="font-extrabold text-brand-emerald">@despu.edu.in</span>.
            </p>
          </div>
        </div>

        <Link
          to="/login"
          className="w-full bg-brand-emerald hover:bg-brand-secondary text-white py-3.5 rounded-2xl font-bold text-sm shadow-md shadow-brand-emerald/15 hover:shadow-lg transition-all flex items-center justify-center gap-2"
        >
          Go to Sign In Page
        </Link>

        <div className={`mt-5 text-center text-sm ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
          Need administrative help? Contact the support team.
        </div>
      </div>
    </div>
  );
};

export default Signup;
