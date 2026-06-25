import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Globe, Shield, Lock, FileText, ChevronRight, X } from 'lucide-react';

export const Profile = () => {
  const { user, logout, darkMode, refreshUser } = useAuth();
  const [updatingBatch, setUpdatingBatch] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const handleBatchChange = async (e) => {
    const selectedBatch = e.target.value || null;
    setUpdatingBatch(true);
    try {
      const response = await fetch(`${API_BASE}/student/batch`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch: selectedBatch }),
        credentials: 'include'
      });
      if (response.ok) {
        await refreshUser();
      } else {
        alert("Failed to update batch.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error.");
    } finally {
      setUpdatingBatch(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (newPassword.trim().length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }
    setPasswordLoading(true);
    setPasswordError('');
    setPasswordMessage('');
    try {
      const response = await fetch(`${API_BASE}/auth/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
        credentials: 'include'
      });
      const data = await response.json();
      if (response.ok) {
        setPasswordMessage(data.message || 'Password updated successfully!');
        setNewPassword('');
        setTimeout(() => {
          setShowPasswordModal(false);
          setPasswordMessage('');
        }, 1500);
      } else {
        setPasswordError(data.detail || data.error || 'Failed to update password.');
      }
    } catch (err) {
      console.error(err);
      setPasswordError('Network error updating password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const settingsRows = [
    { label: 'Language', icon: Globe, value: 'English (US)' },
    { label: 'Change Password', icon: Lock },
    { label: 'Privacy Policy', icon: Shield },
    { label: 'Terms & Conditions', icon: FileText }
  ];

  return (
    <div className="max-w-md mx-auto w-full flex flex-col items-center">
      {/* Profile Header Card */}
      <div className={`rounded-card w-full p-6 flex flex-col items-center mb-6 transition-all duration-300 ${darkMode ? 'bg-[#121212] border border-brand-emerald/20 text-white' : 'bg-white text-zinc-800 shadow-card'
        }`}>
        <div className={`w-24 h-24 rounded-full bg-brand-emerald text-white flex items-center justify-center font-bold text-4xl shadow-md border-4 mb-4 animate-pulse-slow ${darkMode ? 'border-zinc-800' : 'border-emerald-50'
          }`}>
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <h2 className={`text-2xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-zinc-950'}`}>{user?.name}</h2>
        <p className={`text-sm font-bold uppercase tracking-wider px-3 py-1 rounded-full mt-1 ${darkMode ? 'bg-zinc-900 text-zinc-300' : 'bg-zinc-100 text-zinc-500'
          }`}>
          {user?.role === 'ADMIN' ? 'Administrator' : `Student`}
        </p>

        {user?.class && (
          <p className={`text-xs font-semibold mt-2.5 px-2.5 py-1 rounded-lg border ${darkMode ? 'bg-brand-emerald/10 border-brand-emerald/20 text-brand-emerald' : 'bg-emerald-50 border-emerald-100 text-brand-emerald'
            }`}>
            {user.class.stream} • Year {user.class.academic_year} • Div {user.class.division}
          </p>
        )}

        <p className={`text-xs mt-2 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{user?.email}</p>

        {user?.role === 'STUDENT' && (
          <div className="mt-4 w-full max-w-xs flex flex-col items-center">
            <label className={`text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Select Lab Batch
            </label>
            <select
              value={user.batch || ''}
              onChange={handleBatchChange}
              disabled={updatingBatch}
              className={`w-full py-2.5 px-4 rounded-xl border text-sm font-bold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-emerald ${darkMode
                  ? 'bg-zinc-900 border-zinc-800 text-white focus:border-brand-emerald'
                  : 'bg-white border-zinc-200 text-zinc-800 focus:border-brand-emerald'
                }`}
            >
              <option value="">No Batch / Whole Class</option>
              <option value="B1">Batch B1</option>
              <option value="B2">Batch B2</option>
              <option value="A1">Batch A1</option>
              <option value="A2">Batch A2</option>
              <option value="C1">Batch C1</option>
              <option value="C2">Batch C2</option>
            </select>
          </div>
        )}
      </div>

      {/* Settings Options Card */}
      <div className={`rounded-card w-full overflow-hidden mb-6 transition-all duration-300 ${darkMode ? 'bg-[#121212] border border-brand-emerald/20 text-white' : 'bg-white text-zinc-800 shadow-card'
        }`}>
        <div className={`divide-y ${darkMode ? 'divide-zinc-800/60' : 'divide-zinc-100'}`}>
          {settingsRows.map((row, index) => {
            const Icon = row.icon;
            return (
              <div
                key={index}
                onClick={() => {
                  if (row.label === 'Change Password') {
                    setShowPasswordModal(true);
                  }
                }}
                className={`flex items-center justify-between px-6 py-4.5 transition-colors cursor-pointer ${darkMode ? 'hover:bg-zinc-900/40' : 'hover:bg-zinc-50'
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

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-card border p-6 transition-all duration-300 ${
            darkMode ? 'bg-[#121212] border-brand-emerald/20 text-white' : 'bg-white border-zinc-200 text-zinc-800 shadow-xl'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 mb-4 border-white/10">
              <h3 className={`text-base font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-zinc-950'}`}>
                <Lock className="w-5 h-5 text-brand-emerald" />
                Change Password
              </h3>
              <button 
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordError('');
                  setPasswordMessage('');
                  setNewPassword('');
                }}
                className={`p-1 rounded-lg transition-colors ${darkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              {passwordError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs font-semibold">
                  {passwordError}
                </div>
              )}
              {passwordMessage && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-brand-emerald rounded-xl text-xs font-semibold">
                  {passwordMessage}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1.5">New Password</label>
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-emerald/10 focus:border-brand-emerald transition-all ${
                    darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                  }`}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full bg-brand-emerald hover:bg-brand-secondary text-white py-3 rounded-xl font-bold text-sm shadow-md transition-all disabled:opacity-50"
              >
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
