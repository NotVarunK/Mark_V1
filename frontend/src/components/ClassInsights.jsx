import React from 'react';
import { Award, AlertTriangle, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ClassInsights = ({ avgClassPct = 0, bestSubject = 'N/A', worstSubject = 'N/A' }) => {
  const { darkMode } = useAuth();

  return (
    <div className={`rounded-card p-6 transition-all duration-300 ${
      darkMode ? 'bg-[#121212] border border-brand-emerald/20 text-white' : 'bg-white text-zinc-800 shadow-card'
    }`}>
      <div className={`flex items-center justify-between mb-4 border-b pb-3 ${
        darkMode ? 'border-zinc-800' : 'border-zinc-100'
      }`}>
        <h3 className={`text-lg font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-zinc-950'}`}>
          <Activity className="w-5 h-5 text-brand-emerald" />
          Class Insights
        </h3>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
          darkMode ? 'bg-brand-emerald/10 text-brand-emerald border-brand-emerald/20' : 'bg-emerald-50 text-brand-emerald border-brand-emerald/10'
        }`}>
          Health Index
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Class Average */}
        <div className={`flex items-center justify-between p-3.5 rounded-2xl ${
          darkMode ? 'bg-zinc-900' : 'bg-zinc-50'
        }`}>
          <div>
            <div className={`text-sm font-medium ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Class Attendance Avg</div>
            <div className="text-xs text-zinc-500 mt-0.5">Combined class performance</div>
          </div>
          <div className="text-3xl font-extrabold text-brand-emerald">
            {avgClassPct}%
          </div>
        </div>

        {/* Best Performing Subject */}
        <div className={`flex items-center gap-3.5 p-3 rounded-2xl ${
          darkMode ? 'bg-zinc-900' : 'bg-zinc-50'
        }`}>
          <div className={`p-2 rounded-xl ${
            darkMode ? 'bg-brand-emerald/10 text-brand-emerald' : 'bg-emerald-50 text-brand-emerald'
          }`}>
            <Award className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-zinc-500 font-medium">Best Performing Subject</div>
            <div className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{bestSubject}</div>
          </div>
        </div>

        {/* Worst Performing Subject */}
        <div className={`flex items-center gap-3.5 p-3 rounded-2xl ${
          darkMode ? 'bg-zinc-900' : 'bg-zinc-50'
        }`}>
          <div className={`p-2 rounded-xl ${
            darkMode ? 'bg-amber-500/10 text-amber-500' : 'bg-amber-50 text-amber-600'
          }`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-zinc-500 font-medium">Needs Attention</div>
            <div className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{worstSubject}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassInsights;
