import React, { useState, useEffect } from 'react';
import { ShieldCheck, Flame, Plus, Minus, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const BunkPredictor = ({ initialAttended = 0, initialConducted = 0 }) => {
  const [attended, setAttended] = useState(initialAttended);
  const [conducted, setConducted] = useState(initialConducted);
  const [target, setTarget] = useState(75);
  const [bunkInfo, setBunkInfo] = useState({ type: 'safe', value: 0, text: '' });
  const { darkMode } = useAuth();

  // Sync with props when dashboard fetches data
  useEffect(() => {
    setAttended(initialAttended);
    setConducted(initialConducted);
  }, [initialAttended, initialConducted]);

  useEffect(() => {
    calculateBunk();
  }, [attended, conducted, target]);

  const calculateBunk = () => {
    if (conducted === 0) {
      setBunkInfo({
        type: 'safe',
        value: 0,
        text: 'Attend your first lecture to start predicting!'
      });
      return;
    }

    const currentPct = (attended / conducted) * 100;

    if (currentPct >= target) {
      // Safe to bunk: max n >= 0 such that (attended / (conducted + n)) * 100 >= target
      // n <= (attended * 100 / target) - conducted
      const maxBunk = Math.floor((attended * 100) / target - conducted);
      const safeBunkCount = Math.max(0, maxBunk);

      setBunkInfo({
        type: 'safe',
        value: safeBunkCount,
        text: safeBunkCount > 0 
          ? `You can safely skip the next ${safeBunkCount} lecture${safeBunkCount === 1 ? '' : 's'}.`
          : `You cannot bunk any lectures. Skip one, and you will fall below ${target}%.`
      });
    } else {
      // Recovery mode: min n such that ((attended + n) / (conducted + n)) * 100 >= target
      // n >= (target * conducted - 100 * attended) / (100 - target)
      if (target >= 100) {
        setBunkInfo({
          type: 'recovery',
          value: -1,
          text: 'It is mathematically impossible to reach 100% attendance if you have missed a lecture.'
        });
        return;
      }

      const minRecover = Math.ceil((target * conducted - 100 * attended) / (100 - target));
      const recoveryCount = Math.max(0, minRecover);

      setBunkInfo({
        type: 'recovery',
        value: recoveryCount,
        text: `You must attend the next ${recoveryCount} lecture${recoveryCount === 1 ? '' : 's'} consecutively to reach ${target}%.`
      });
    }
  };

  return (
    <div className={`rounded-card p-6 transition-all duration-300 ${
      darkMode ? 'bg-[#121212] border border-brand-emerald/20 text-white' : 'bg-white text-zinc-800 shadow-card'
    }`}>
      <div className={`flex items-center justify-between mb-5 border-b pb-3 ${
        darkMode ? 'border-zinc-800' : 'border-zinc-100'
      }`}>
        <h3 className={`text-lg font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-zinc-950'}`}>
          <ShieldCheck className="w-5 h-5 text-brand-emerald" />
          Bunk Predictor
        </h3>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
          darkMode ? 'bg-zinc-900 text-zinc-400' : 'bg-zinc-100 text-zinc-600'
        }`}>
          Math Driven
        </span>
      </div>

      <div className="space-y-4">
        {/* Input: Attended */}
        <div className="flex items-center justify-between">
          <span className={`text-sm font-medium ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>Attended Lectures</span>
          <div className={`flex items-center border rounded-xl overflow-hidden ${
            darkMode ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-zinc-50'
          }`}>
            <button 
              onClick={() => setAttended(prev => Math.max(0, prev - 1))}
              className={`p-2 transition-colors ${
                darkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
              }`}
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className={`w-12 text-center font-bold ${darkMode ? 'text-white' : 'text-zinc-800'}`}>{attended}</span>
            <button 
              onClick={() => {
                setAttended(prev => prev + 1);
                // Also auto-increment conducted if attended exceeds conducted
                if (attended >= conducted) setConducted(prev => prev + 1);
              }}
              className={`p-2 transition-colors ${
                darkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
              }`}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Input: Conducted */}
        <div className="flex items-center justify-between">
          <span className={`text-sm font-medium ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>Total Conducted</span>
          <div className={`flex items-center border rounded-xl overflow-hidden ${
            darkMode ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-zinc-50'
          }`}>
            <button 
              onClick={() => setConducted(prev => Math.max(attended, prev - 1))}
              className={`p-2 transition-colors ${
                darkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
              }`}
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className={`w-12 text-center font-bold ${darkMode ? 'text-white' : 'text-zinc-800'}`}>{conducted}</span>
            <button 
              onClick={() => setConducted(prev => prev + 1)}
              className={`p-2 transition-colors ${
                darkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
              }`}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Input: Target Attendance */}
        <div className="flex items-center justify-between">
          <span className={`text-sm font-medium ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>Target Attendance (%)</span>
          <div className={`flex items-center border rounded-xl overflow-hidden ${
            darkMode ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-zinc-50'
          }`}>
            <button 
              onClick={() => setTarget(prev => Math.max(50, prev - 5))}
              className={`p-2 transition-colors ${
                darkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
              }`}
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className={`w-12 text-center font-bold ${darkMode ? 'text-white' : 'text-zinc-800'}`}>{target}%</span>
            <button 
              onClick={() => setTarget(prev => Math.min(100, prev + 5))}
              className={`p-2 transition-colors ${
                darkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
              }`}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Output Area */}
        <div className={`mt-5 p-4 rounded-2xl border transition-all duration-300 ${
          bunkInfo.type === 'safe' 
            ? darkMode 
              ? 'bg-brand-emerald/10 border-brand-emerald/20 text-brand-emerald' 
              : 'bg-emerald-50/50 border-emerald-100 text-brand-emerald'
            : darkMode
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
              : 'bg-amber-50/50 border-amber-100 text-amber-700'
        }`}>
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {bunkInfo.type === 'safe' ? (
                <ShieldCheck className="w-5 h-5 flex-shrink-0" />
              ) : (
                <Flame className="w-5 h-5 flex-shrink-0" />
              )}
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider opacity-75">
                {bunkInfo.type === 'safe' ? 'Safe to Bunk' : 'Recovery Required'}
              </div>
              <div className="text-sm font-bold mt-1 leading-relaxed">
                {bunkInfo.text}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BunkPredictor;
