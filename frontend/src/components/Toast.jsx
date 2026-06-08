import React, { useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export const Toast = ({ message, type = 'info', onClose, duration = 4000 }) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [message, duration, onClose]);

  if (!message) return null;

  const styleClasses = {
    success: 'bg-emerald-500 border border-emerald-400 text-white',
    error: 'bg-red-500 border border-red-400 text-white',
    warning: 'bg-amber-500 border border-amber-400 text-zinc-900',
    info: 'bg-blue-500 border border-blue-400 text-white'
  };

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 flex-shrink-0" />,
    error: <AlertCircle className="w-5 h-5 flex-shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 flex-shrink-0" />,
    info: <Info className="w-5 h-5 flex-shrink-0" />
  };

  return (
    <div className="fixed bottom-24 right-4 left-4 md:left-auto md:right-6 md:bottom-6 z-[9999] flex items-center justify-between p-4 rounded-2xl shadow-xl transition-all duration-300 transform animate-bounce-short max-w-sm md:w-96 class-toast">
      <div className={`w-full flex items-center gap-3 p-1 rounded-xl ${styleClasses[type]}`}>
        {icons[type]}
        <div className="flex-1 text-sm font-medium pr-2">{message}</div>
        <button onClick={onClose} className="p-1 hover:bg-black/10 rounded-full transition-colors flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
export default Toast;
