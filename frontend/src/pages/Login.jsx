import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, AlertCircle, Key, Mail, Sun, Moon } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle, darkMode, toggleDarkMode } = useAuth();
  const navigate = useNavigate();


  // Academic Email regex validation
  const ACADEMIC_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.edu(\.in)?$/i;
  const isEmailWarning = email.length > 0 && !ACADEMIC_EMAIL_REGEX.test(email);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (!ACADEMIC_EMAIL_REGEX.test(email)) {
      setError('Invalid email domain. You must use an academic email (.edu or .edu.in).');
      return;
    }

    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/student');
      }
    } catch (err) {
      setError(err.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);
    try {
      const user = await loginWithGoogle(credentialResponse.credential);
      if (user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/student');
      }
    } catch (err) {
      setError(err.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Sign in with Google was unsuccessful. Please try again.');
  };

  return (
    <div className={`min-h-screen w-full flex flex-col justify-center items-center p-4 pt-8 pb-8 relative transition-colors duration-300 ${
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
        <h2 className={`text-2xl font-bold text-center mb-1 ${darkMode ? 'text-white' : 'text-zinc-950'}`}>Welcome Back</h2>
        <p className={`text-sm text-center mb-6 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Sign in to your academic account</p>

        {/* Google OAuth Login Button */}
        <div className="flex justify-center mb-5">
          <div className="w-full max-w-[280px] flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              useOneTap
              theme={darkMode ? 'filled_black' : 'outline'}
              shape="pill"
            />
          </div>
        </div>

        {/* Admin Login Separator Divider */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className={`w-full border-t ${darkMode ? 'border-zinc-800' : 'border-zinc-200'}`}></div>
          </div>
          <span className={`relative px-3 text-[10px] font-extrabold uppercase tracking-wider ${darkMode ? 'bg-[#121212] text-zinc-500' : 'bg-white text-zinc-400'}`}>
            Or Sign In as Admin
          </span>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-semibold flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Email Field */}
          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Academic Email</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                placeholder="name@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-emerald/20 transition-all ${
                  darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                } ${
                  isEmailWarning 
                    ? 'border-amber-400 focus:border-amber-400' 
                    : 'focus:border-brand-emerald'
                }`}
                required
              />
            </div>
            {isEmailWarning && (
              <div className="mt-2 text-xs text-amber-600 font-medium flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Must use an academic domain (.edu or .edu.in)</span>
              </div>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400">
                <Key className="w-4 h-4" />
              </span>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald transition-all ${
                  darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                }`}
                required
              />
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-emerald hover:bg-brand-secondary text-white py-3.5 rounded-2xl font-bold text-sm shadow-md shadow-brand-emerald/15 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className={`mt-6 text-center text-sm ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
          Don't have an account?{' '}
          <Link to="/signup" className="text-brand-emerald hover:text-brand-secondary font-bold underline transition-colors">
            Sign up here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
