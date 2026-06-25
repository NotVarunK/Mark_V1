import React from 'react';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, CheckCircle, ShieldAlert, Compass } from 'lucide-react';

export const SubjectInsights = ({ subjects = [] }) => {
  const { darkMode } = useAuth();

  const calculateBuffer = (attended, conducted) => {
    if (conducted === 0) return { status: 'neutral', value: 0, text: 'No lectures conducted yet.' };
    const target = 75;
    const currentPct = (attended / conducted) * 100;

    if (currentPct >= target) {
      // Safe to bunk: max n such that (attended / (conducted + n)) * 100 >= 75
      // n <= (attended * 100 / 75) - conducted = (4 * attended / 3) - conducted
      const maxBunks = Math.floor((attended * 4) / 3 - conducted);
      const safeBunks = Math.max(0, maxBunks);

      if (safeBunks > 0) {
        return {
          status: 'safe',
          value: safeBunks,
          text: `You can skip the next ${safeBunks} lecture${safeBunks === 1 ? '' : 's'} safely.`
        };
      } else {
        return {
          status: 'warning',
          value: 0,
          text: `Cannot miss any lectures. Bunking 1 will drop you below 75%.`
        };
      }
    } else {
      // Recovery required: min n such that ((attended + n)/(conducted + n)) * 100 >= 75
      // 4*(attended + n) >= 3*(conducted + n) => 4A + 4N >= 3C + 3N => N >= 3C - 4A
      const needed = Math.max(0, 3 * conducted - 4 * attended);
      return {
        status: 'danger',
        value: needed,
        text: `You must attend the next ${needed} lecture${needed === 1 ? '' : 's'} consecutively to reach 75%.`
      };
    }
  };

  return (
    <div className="space-y-6">
      <div className={`p-6 rounded-card border transition-all duration-300 ${
        darkMode ? 'bg-[#121212] border-brand-emerald/20 text-white' : 'bg-white text-zinc-800 shadow-card border-zinc-100'
      }`}>
        <div className="flex items-center justify-between mb-4 border-b pb-3 border-white/5">
          <h3 className="text-base font-extrabold uppercase tracking-wider text-brand-emerald flex items-center gap-2">
            <Compass className="w-5 h-5" />
            Performance Insights
          </h3>
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">75% Attendance Guide</span>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          These visual insights compute your exact standing per subject relative to the university's 75% attendance threshold. The dashed lines indicate the 75% target.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {subjects.length === 0 ? (
          <div className={`p-8 rounded-card border text-center transition-all duration-300 ${
            darkMode ? 'bg-[#121212] border-brand-emerald/20 text-zinc-500' : 'bg-white text-zinc-400 shadow-card border-zinc-100'
          }`}>
            No subjects found. Once you are enrolled in a class division and lectures are conducted, stats will appear here.
          </div>
        ) : (
          subjects.map((subj, idx) => {
            const buffer = calculateBuffer(subj.attended, subj.conducted);
            return (
              <div key={idx} className={`p-6 rounded-card border transition-all duration-300 hover:border-brand-emerald/40 ${
                darkMode ? 'bg-[#121212] border-brand-emerald/10 text-white' : 'bg-white text-zinc-800 shadow-card border-zinc-100'
              }`}>
                {/* Subject Header */}
                <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
                  <div>
                    <h4 className="text-base font-bold tracking-tight">{subj.name}</h4>
                    <span className="text-xs text-zinc-400 mt-1 block">
                      Conducted: {subj.conducted} | Attended: {subj.attended}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${
                      buffer.status === 'safe'
                        ? 'bg-emerald-500/10 text-brand-emerald border-brand-emerald/20'
                        : buffer.status === 'warning'
                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        : 'bg-red-500/10 text-red-500 border-red-500/20'
                    }`}>
                      {buffer.status === 'safe' ? 'Safe' : buffer.status === 'warning' ? 'Warning' : 'Critical'}
                    </span>
                    <span className="text-lg font-black text-brand-emerald">{subj.pct}%</span>
                  </div>
                </div>

                {/* Visual Progress Bar comparing with 75% target */}
                <div className="relative w-full h-8 bg-zinc-900/60 rounded-xl overflow-hidden border border-white/5 mb-4">
                  {/* Progress fill */}
                  <div 
                    className={`h-full rounded-r-lg transition-all duration-500 ${
                      subj.pct >= 75 ? 'bg-gradient-to-r from-brand-emerald/80 to-brand-emerald' : 'bg-gradient-to-r from-amber-500/80 to-red-500/80'
                    }`}
                    style={{ width: `${Math.min(100, subj.pct)}%` }}
                  />
                  {/* 75% threshold marker */}
                  <div className="absolute top-0 bottom-0 left-[75%] border-l-2 border-dashed border-white/40 flex items-center justify-center">
                    <span className="absolute -top-1 transform -translate-x-1/2 text-[8px] font-bold text-white/50 bg-zinc-950 px-1 rounded border border-white/15">75%</span>
                  </div>
                </div>

                {/* Descriptive Bunk Math Recommendation Banner */}
                <div className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${
                  buffer.status === 'safe'
                    ? darkMode ? 'bg-brand-emerald/10 border-brand-emerald/20 text-brand-emerald' : 'bg-emerald-50/50 border-emerald-100 text-brand-emerald'
                    : buffer.status === 'warning'
                    ? darkMode ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-amber-50/50 border-amber-100 text-amber-700'
                    : darkMode ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-red-50/50 border-red-100 text-red-700'
                }`}>
                  <div className="mt-0.5">
                    {buffer.status === 'safe' ? (
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    ) : buffer.status === 'warning' ? (
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider opacity-75">Recommendation</div>
                    <div className="text-xs font-semibold mt-0.5 leading-relaxed">{buffer.text}</div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SubjectInsights;
