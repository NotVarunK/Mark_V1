import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { ProgressRing } from '../components/ProgressRing';
import { BunkPredictor } from '../components/BunkPredictor';
import { ClassInsights } from '../components/ClassInsights';
import { Toast } from '../components/Toast';
import { Profile } from './Profile';
import { 
  GraduationCap, MapPin, Calendar, Trophy, User, 
  ChevronRight, ChevronLeft, Award, AlertCircle, CheckCircle, 
  MapPinOff, Clock, LayoutGrid, ClipboardList, Check, Sun, Moon 
} from 'lucide-react';

export const Dashboard = () => {
  const { user, joinClass, refreshUser, darkMode, toggleDarkMode } = useAuth();
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'schedule', 'leaderboard', 'profile'
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [checkinLoading, setCheckinLoading] = useState(null); // stores slotId of currently checking in slot
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [scheduleSubTab, setScheduleSubTab] = useState('calendar'); // 'calendar' | 'timetable'

  const isSameDay = (d1, d2) => {
    if (!d1 || !d2) return false;
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const isPastDay = (d) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(d);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  const isToday = (d) => {
    return isSameDay(d, new Date());
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    if (user && user.class_id) {
      fetchDashboard();
    }
  }, [user]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/attendance/dashboard`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      } else {
        showToast('Failed to load attendance dashboard.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error loading dashboard.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClass = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      showToast('Please enter a class code.', 'warning');
      return;
    }

    setJoinLoading(true);
    try {
      await joinClass(joinCode.trim());
      showToast('Successfully enrolled in class!', 'success');
      refreshUser(); // Updates user state which triggers fetchDashboard
    } catch (err) {
      showToast(err.message || 'Invalid class code.', 'error');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleCheckin = async (slotId) => {
    setCheckinLoading(slotId);
    showToast('Obtaining location coordinates...', 'info');

    // Get browser coordinates
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.', 'error');
      setCheckinLoading(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`${API_BASE}/attendance/checkin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              slotId,
              lat: latitude,
              lng: longitude
            }),
            credentials: 'include'
          });

          const data = await res.json();
          if (res.ok) {
            showToast('Check-in marked successfully!', 'success');
            fetchDashboard(); // Refresh stats
          } else {
            // Check for specific error status codes
            if (res.status === 403) {
              showToast(data.error || 'Check-in failed: Out of campus range.', 'error');
            } else if (res.status === 409) {
              showToast(data.error || 'Already checked in for this slot.', 'warning');
            } else {
              showToast(data.error || 'Check-in failed.', 'error');
            }
          }
        } catch (err) {
          showToast('Server connection failed.', 'error');
        } finally {
          setCheckinLoading(null);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        showToast('Failed to retrieve location. Please enable location services.', 'error');
        setCheckinLoading(null);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const getDays = () => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const getCurrentDayName = () => getDays()[new Date().getDay()];

  const isSlotForStudentBatch = (subjectName, studentBatch) => {
    if (!studentBatch) return true;
    const subjectLower = subjectName.toLowerCase();
    const batchLower = studentBatch.toLowerCase();
    
    const allBatches = ["b1", "b2", "b3", "a1", "a2", "ai", "c1", "c2"];
    const mentionedBatches = allBatches.filter(b => subjectLower.includes(b));
    
    if (mentionedBatches.length === 0) return true;
    return mentionedBatches.includes(batchLower);
  };

  // Helper: check if student has checked into a slot today
  const hasCheckedInToday = (slotId) => {
    if (!dashboardData || !dashboardData.subjects) return false;
    // We can infer check-ins from overall dashboard list logs if saved
    // Let's rely on backend check-in error mapping, or simulate locally.
    // For local visual feedback, we can verify slot state
    return false; // Dynamic state fallback
  };

  const getSlotStatus = (slot) => {
    const todayName = getCurrentDayName();
    if (slot.day_of_week !== todayName) {
      return { label: 'PENDING', class: 'bg-amber-100 text-amber-800 border-amber-200' };
    }

    // Check time bounds
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = slot.start_time.split(':').map(Number);
    const [endH, endM] = slot.end_time.split(':').map(Number);
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;

    if (currentMins >= startMins && currentMins <= endMins) {
      return { label: 'IN PROGRESS', class: 'bg-blue-100 text-blue-800 border-blue-200' };
    } else if (currentMins > endMins) {
      return { label: 'COMPLETED', class: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    } else {
      return { label: 'PENDING', class: 'bg-amber-100 text-amber-800 border-amber-200' };
    }
  };

  // 1. RENDER: Enforce join class if not enrolled
  if (user && !user.class_id) {
    return (
      <div className={`min-h-screen flex flex-col justify-center items-center p-4 text-white relative transition-colors duration-300 ${
        darkMode ? 'bg-black' : 'bg-brand-teal'
      }`}>
        {/* Theme Toggle Button */}
        <button
          onClick={toggleDarkMode}
          className="absolute top-6 right-6 p-3 bg-brand-glass rounded-xl border border-white/10 hover:bg-white/10 transition-colors text-white"
          title="Toggle Theme"
        >
          {darkMode ? <Sun className="w-5 h-5 text-brand-emerald" /> : <Moon className="w-5 h-5" />}
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-brand-glass rounded-2xl border border-white/10 text-brand-emerald">
            <GraduationCap className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold leading-none tracking-tight">Mark_V1</h1>
            <span className="text-xs text-brand-emerald font-semibold uppercase tracking-wider">Attendance System</span>
          </div>
        </div>

        <div className={`w-full max-w-md rounded-card p-8 shadow-card transition-all duration-300 ${
          darkMode ? 'bg-[#121212] border border-brand-emerald/20 text-white' : 'bg-white text-zinc-800'
        }`}>
          <h2 className={`text-2xl font-bold text-center mb-1 ${darkMode ? 'text-white' : 'text-zinc-950'}`}>Enrolment Code</h2>
          <p className={`text-sm text-center mb-6 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Enter the 6-character code shared by your admin</p>

          <form onSubmit={handleJoinClass} className="space-y-5">
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Class Code</label>
              <input
                type="text"
                placeholder="e.g. AB12CD"
                maxLength={6}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className={`w-full px-4 py-3.5 rounded-2xl text-center text-xl font-black tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald transition-all ${
                  darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                }`}
                required
              />
            </div>

            <button
              type="submit"
              disabled={joinLoading}
              className="w-full bg-brand-emerald hover:bg-brand-secondary text-white py-3.5 rounded-2xl font-bold text-sm shadow-md shadow-brand-emerald/15 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {joinLoading ? 'Joining...' : 'Join Class'}
            </button>
          </form>
        </div>
        <Toast {...toast} onClose={() => setToast({ message: '', type: 'info' })} />
      </div>
    );
  }

  // Calculate quick stats counters
  const totalAttended = dashboardData?.overall?.attended || 0;
  const totalConducted = dashboardData?.overall?.conducted || 0;
  const overallPct = dashboardData?.overall?.pct || 0.0;

  const TERM_START_DATE = new Date('2026-03-01');

  const countDaysBetween = (startDate, endDate, targetDayName) => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDay = dayNames.indexOf(targetDayName);
    if (targetDay === -1) return 0;

    let count = 0;
    let current = new Date(startDate);
    current.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    while (current <= end) {
      if (current.getDay() === targetDay) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    return count;
  };

  const isLabSubject = (subjectName) => {
    const name = subjectName.toLowerCase();
    return name.includes('lab') || 
           name.includes('practical') || 
           name.includes('b1') || 
           name.includes('b2') || 
           name.includes('osl') || 
           name.includes('esl') || 
           name.includes('ssl') || 
           name.includes('spl') || 
           name.includes('rl') ||
           name.includes('/'); // covers parallel slots separator
  };

  // Calculate Labs vs Theory counters
  let theoryConducted = 0;
  let theoryAttended = 0;
  let labConducted = 0;
  let labAttended = 0;

  if (dashboardData && user?.class?.timetable) {
    const today = new Date();
    const studentSlots = user.class.timetable.filter(slot => 
      isSlotForStudentBatch(slot.subject_name, user.batch)
    );
    studentSlots.forEach(slot => {
      const conducted = countDaysBetween(TERM_START_DATE, today, slot.day_of_week);
      const attended = dashboardData.logs?.filter(log => log.slot_id === slot.id).length || 0;

      if (isLabSubject(slot.subject_name)) {
        labConducted += conducted;
        labAttended += attended;
      } else {
        theoryConducted += conducted;
        theoryAttended += attended;
      }
    });
  }

  if (labConducted < labAttended) labConducted = labAttended;
  if (theoryConducted < theoryAttended) theoryConducted = theoryAttended;

  const theoryPct = theoryConducted > 0 ? parseFloat(((theoryAttended / theoryConducted) * 100).toFixed(1)) : 0.0;
  const labPct = labConducted > 0 ? parseFloat(((labAttended / labConducted) * 100).toFixed(1)) : 0.0;

  // Filter today's timetable slots
  const todayName = getCurrentDayName();
  const todaySlots = user?.class?.timetable?.filter(slot => 
    slot.day_of_week === todayName && isSlotForStudentBatch(slot.subject_name, user.batch)
  ) || [];

  return (
    <div className={`min-h-screen text-white flex flex-col md:flex-row transition-colors duration-300 ${
      darkMode ? 'bg-black' : 'bg-brand-teal'
    }`}>
      {/* Navigation Layout */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Page Area */}
      <main className="flex-1 p-6 md:pl-72 pb-24 md:pb-6 max-w-7xl mx-auto w-full transition-all">
        
        {/* Top Greeting Bar */}
        <header className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Hello, {user?.name?.split(' ')[0]}</h1>
            <p className="text-xs text-brand-emerald font-bold mt-0.5 tracking-wider uppercase">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleDarkMode}
              className="p-2.5 bg-brand-glass rounded-xl border border-white/10 hover:bg-white/10 transition-colors text-white"
              title="Toggle Theme"
            >
              {darkMode ? <Sun className="w-5 h-5 text-brand-emerald" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="p-2.5 bg-brand-glass rounded-xl border border-white/10 text-brand-emerald md:hidden">
              <GraduationCap className="w-6 h-6" />
            </div>
          </div>
        </header>

        {/* Tab 1: HOME PANEL */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            {/* At-a-glance Counters (Large bold numbers matching visual design system) */}
            <section className="grid grid-cols-3 gap-3">
              <div className={`rounded-card p-4 text-center transition-all duration-300 ${
                darkMode ? 'bg-[#121212] border border-brand-emerald/20 text-white' : 'bg-white text-zinc-800 shadow-card border border-zinc-100'
              }`}>
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Pending</div>
                <div className="text-2xl md:text-3xl font-black text-brand-emerald mt-1">
                  {todaySlots.filter(s => getSlotStatus(s).label === 'PENDING').length}
                </div>
              </div>
              <div className={`rounded-card p-4 text-center transition-all duration-300 ${
                darkMode ? 'bg-[#121212] border border-brand-emerald/20 text-white' : 'bg-white text-zinc-800 shadow-card border border-zinc-100'
              }`}>
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Today</div>
                <div className="text-2xl md:text-3xl font-black text-brand-emerald mt-1">
                  {todaySlots.length}
                </div>
              </div>
              <div className={`rounded-card p-4 text-center transition-all duration-300 ${
                darkMode ? 'bg-[#121212] border border-brand-emerald/20 text-white' : 'bg-white text-zinc-800 shadow-card border border-zinc-100'
              }`}>
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Attended</div>
                <div className="text-2xl md:text-3xl font-black text-brand-emerald mt-1">
                  {totalAttended}
                </div>
              </div>
            </section>

            {/* Desktop-only: Subject Progress Rings Row */}
            {dashboardData?.subjects && dashboardData.subjects.length > 0 && (
              <section className="bg-brand-glass border border-white/5 p-5 rounded-card">
                <h3 className="text-xs font-bold uppercase tracking-widest text-brand-emerald mb-4">Subject Attendance Rings</h3>
                <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10">
                  {dashboardData.subjects.map((subj, i) => (
                    <ProgressRing key={i} percentage={subj.pct} subjectName={subj.name} />
                  ))}
                </div>
              </section>
            )}

            {/* Today's Schedule Slot Card List */}
            <section className="space-y-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-white/80">Today's Lectures</h3>
              {todaySlots.length === 0 ? (
                <div className="bg-brand-glass border border-white/5 p-8 rounded-card text-center text-white/50">
                  <Clock className="w-10 h-10 mx-auto opacity-40 mb-3" />
                  <p className="text-sm font-medium">No lectures scheduled for today!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {todaySlots.map((slot) => {
                    const status = getSlotStatus(slot);
                    return (
                      <div key={slot.id} className={`rounded-card p-5 flex flex-col justify-between transition-all duration-300 ${
                        darkMode ? 'bg-[#121212] border border-brand-emerald/20 text-white' : 'bg-white text-zinc-800 shadow-card border border-zinc-100'
                      }`}>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className={`text-lg font-black tracking-tight ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{slot.subject_name}</h4>
                            <div className={`text-xs font-semibold mt-1 flex items-center gap-1.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                              <Clock className={`w-3.5 h-3.5 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`} />
                              {slot.start_time} - {slot.end_time}
                            </div>
                          </div>
                          <span className={`text-[10px] font-extrabold border px-2.5 py-1 rounded-full ${status.class}`}>
                            {status.label}
                          </span>
                        </div>

                        <button
                          onClick={() => handleCheckin(slot.id)}
                          disabled={checkinLoading !== null || status.label === 'COMPLETED'}
                          className={`w-full py-3 rounded-2xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 ${
                            status.label === 'COMPLETED'
                              ? darkMode ? 'bg-zinc-900 text-zinc-600 border border-zinc-800/40 cursor-not-allowed shadow-none' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed shadow-none'
                              : 'bg-brand-emerald hover:bg-brand-secondary text-white hover:shadow-lg'
                          }`}
                        >
                          <MapPin className="w-4 h-4" />
                          {checkinLoading === slot.id ? 'Checking Coordinates...' : status.label === 'COMPLETED' ? 'Checked In' : 'Check In'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Quick Access Dashboard Grid (2x2 Cards for Mobile dashboard) */}
            <section className="md:hidden grid grid-cols-2 gap-4">
              <button 
                onClick={() => setActiveTab('schedule')}
                className={`rounded-card p-5 text-left flex flex-col justify-between h-32 transition-all duration-300 ${
                  darkMode ? 'bg-[#121212] border border-brand-emerald/20 text-white hover:bg-zinc-900' : 'bg-white text-zinc-800 shadow-card hover:bg-zinc-50 border border-zinc-100'
                }`}
              >
                <div className={`p-2.5 rounded-xl w-fit ${darkMode ? 'bg-brand-emerald/10 text-brand-emerald' : 'bg-emerald-50 text-brand-emerald'}`}>
                  <Calendar className="w-5 h-5" />
                </div>
                <span className={`font-bold text-sm leading-tight ${darkMode ? 'text-white' : 'text-zinc-900'}`}>Today's Schedule</span>
              </button>

              <button 
                onClick={() => setActiveTab('leaderboard')}
                className={`rounded-card p-5 text-left flex flex-col justify-between h-32 transition-all duration-300 ${
                  darkMode ? 'bg-[#121212] border border-brand-emerald/20 text-white hover:bg-zinc-900' : 'bg-white text-zinc-800 shadow-card hover:bg-zinc-50 border border-zinc-100'
                }`}
              >
                <div className={`p-2.5 rounded-xl w-fit ${darkMode ? 'bg-brand-emerald/10 text-brand-emerald' : 'bg-emerald-50 text-brand-emerald'}`}>
                  <Trophy className="w-5 h-5" />
                </div>
                <span className={`font-bold text-sm leading-tight ${darkMode ? 'text-white' : 'text-zinc-900'}`}>Class Leaderboard</span>
              </button>

              <button 
                onClick={() => setActiveTab('bunk')}
                className={`rounded-card p-5 text-left flex flex-col justify-between h-32 transition-all duration-300 ${
                  darkMode ? 'bg-[#121212] border border-brand-emerald/20 text-white hover:bg-zinc-900' : 'bg-white text-zinc-800 shadow-card hover:bg-zinc-50 border border-zinc-100'
                }`}
              >
                <div className={`p-2.5 rounded-xl w-fit ${darkMode ? 'bg-brand-emerald/10 text-brand-emerald' : 'bg-emerald-50 text-brand-emerald'}`}>
                  <LayoutGrid className="w-5 h-5" />
                </div>
                <span className={`font-bold text-sm leading-tight ${darkMode ? 'text-white' : 'text-zinc-900'}`}>Bunk Predictor</span>
              </button>

              <button 
                onClick={() => setActiveTab('profile')}
                className={`rounded-card p-5 text-left flex flex-col justify-between h-32 transition-all duration-300 ${
                  darkMode ? 'bg-[#121212] border border-brand-emerald/20 text-white hover:bg-zinc-900' : 'bg-white text-zinc-800 shadow-card hover:bg-zinc-50 border border-zinc-100'
                }`}
              >
                <div className={`p-2.5 rounded-xl w-fit ${darkMode ? 'bg-brand-emerald/10 text-brand-emerald' : 'bg-emerald-50 text-brand-emerald'}`}>
                  <User className="w-5 h-5" />
                </div>
                <span className={`font-bold text-sm leading-tight ${darkMode ? 'text-white' : 'text-zinc-900'}`}>My Profile</span>
              </button>
            </section>
          </div>
        )}

        {/* Tab 2: SCHEDULE VIEW (Calendar & Timetable Tab with Lab/Theory Counters) */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            
            {/* Labs vs Theory counters */}
            {dashboardData && (
              <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Theory counter */}
                <div className={`rounded-card p-5 border transition-all duration-300 flex items-center justify-between ${
                  darkMode ? 'bg-[#121212] border-brand-emerald/20 text-white' : 'bg-white text-zinc-800 shadow-card border-zinc-100'
                }`}>
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Theory Lessons</div>
                    <div className="text-2xl font-black text-brand-emerald mt-1.5">{theoryAttended} / {theoryConducted}</div>
                    <div className="text-[10px] font-bold text-zinc-400 mt-1">Scheduled lectures attended</div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-extrabold text-brand-emerald">{theoryPct}%</div>
                    <span className={`inline-block text-[8px] font-extrabold px-2 py-0.5 rounded-full border mt-1 ${
                      darkMode ? 'bg-brand-emerald/10 text-brand-emerald border-brand-emerald/20' : 'bg-emerald-50 text-brand-emerald border-brand-emerald/10'
                    }`}>
                      Lectures
                    </span>
                  </div>
                </div>

                {/* Labs counter */}
                <div className={`rounded-card p-5 border transition-all duration-300 flex items-center justify-between ${
                  darkMode ? 'bg-[#121212] border-brand-emerald/20 text-white' : 'bg-white text-zinc-800 shadow-card border-zinc-100'
                }`}>
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Practical Labs</div>
                    <div className="text-2xl font-black text-blue-600 mt-1.5">{labAttended} / {labConducted}</div>
                    <div className="text-[10px] font-bold text-zinc-400 mt-1">Hands-on practicals attended</div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-extrabold text-blue-600">{labPct}%</div>
                    <span className={`inline-block text-[8px] font-extrabold px-2 py-0.5 rounded-full border mt-1 ${
                      darkMode ? 'bg-blue-950/40 text-blue-400 border-blue-800/40' : 'bg-blue-50 text-blue-600 border-blue-200'
                    }`}>
                      Practicals
                    </span>
                  </div>
                </div>
              </section>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-2 gap-3">
              <h2 className="text-xl font-bold">Class Schedule</h2>
              <div className="flex bg-brand-glass p-1 rounded-xl border border-white/10 text-xs w-fit">
                <button
                  onClick={() => setScheduleSubTab('calendar')}
                  className={`px-4 py-2 rounded-lg font-bold transition-all ${
                    scheduleSubTab === 'calendar'
                      ? 'bg-brand-emerald text-white shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Attendance Calendar
                </button>
                <button
                  onClick={() => setScheduleSubTab('timetable')}
                  className={`px-4 py-2 rounded-lg font-bold transition-all ${
                    scheduleSubTab === 'timetable'
                      ? 'bg-brand-emerald text-white shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Weekly Timetable
                </button>
              </div>
            </div>

            {scheduleSubTab === 'timetable' ? (
              <div className={`rounded-card overflow-hidden transition-all duration-300 p-6 ${
                darkMode ? 'bg-[#121212] border border-brand-emerald/20 text-white' : 'bg-white text-zinc-800 border border-zinc-100 shadow-card'
              }`}>
                {user?.class?.timetable && user.class.timetable.length > 0 ? (
                  <div className="overflow-x-auto no-scrollbar">
                    <table className={`w-full border-collapse border ${darkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
                      <thead>
                        <tr className={`text-[9px] font-black uppercase tracking-wider text-center border ${
                          darkMode ? 'bg-zinc-950 text-zinc-400 border-zinc-800' : 'bg-zinc-50 text-zinc-500 border-zinc-200'
                        }`}>
                          <th className={`px-4 py-3.5 border text-left min-w-[90px] ${darkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>Time / Day</th>
                          <th className={`px-2 py-3.5 border ${darkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>8:00 - 9:00</th>
                          <th className={`px-2 py-3.5 border ${darkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>9:00 - 10:00</th>
                          <th className={`px-2 py-3.5 border ${darkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>10:30 - 11:30</th>
                          <th className={`px-2 py-3.5 border ${darkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>11:30 - 12:30</th>
                          <th className={`px-2 py-3.5 border ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100/40 border-zinc-200'}`}>12:30 - 1:30</th>
                          <th className={`px-2 py-3.5 border ${darkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>1:30 - 2:30</th>
                          <th className={`px-2 py-3.5 border ${darkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>2:30 - 3:30</th>
                          <th className={`px-2 py-3.5 border ${darkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>3:30 - 4:30</th>
                          <th className={`px-2 py-3.5 border ${darkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>4:30 - 5:30</th>
                        </tr>
                      </thead>
                      <tbody>
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => {
                          const shortDay = day.substring(0, 3).toUpperCase();
                          return (
                            <tr key={day} className={`text-center border ${
                              darkMode ? 'hover:bg-zinc-900/30 border-zinc-800' : 'hover:bg-zinc-50/20 border-zinc-200'
                            }`}>
                              {/* Day Row Header */}
                              <td className={`px-4 py-4 border font-black text-xs text-left ${
                                darkMode ? 'bg-zinc-950 text-zinc-200 border-zinc-800' : 'bg-zinc-50 text-zinc-800 border-zinc-200'
                              }`}>
                                {shortDay}
                              </td>

                              {/* Columns for time slots */}
                              {[
                                { start: '08:00', end: '09:00' },
                                { start: '09:00', end: '10:00' },
                                { start: '10:30', end: '11:30' },
                                { start: '11:30', end: '12:30' },
                                { start: '12:30', end: '13:30', isLunch: true },
                                { start: '13:30', end: '14:30' },
                                { start: '14:30', end: '15:30' },
                                { start: '15:30', end: '16:30' },
                                { start: '16:30', end: '17:30' }
                              ].map(timeSlot => {
                                if (timeSlot.isLunch) {
                                  return (
                                    <td 
                                      key="lunch" 
                                      className={`border font-bold text-[9px] uppercase tracking-widest px-2 py-4 ${
                                        darkMode ? 'border-zinc-800 bg-zinc-900 text-zinc-500' : 'border-zinc-200 bg-zinc-100/60 text-zinc-400'
                                      }`}
                                    >
                                      Lunch
                                    </td>
                                  );
                                }

                                const matchedSlots = user.class.timetable.filter(
                                  s => s.day_of_week === day && s.start_time === timeSlot.start
                                );

                                if (matchedSlots.length > 0) {
                                  return (
                                    <td key={timeSlot.start} className={`p-1.5 border min-w-[120px] max-w-[160px] ${
                                      darkMode ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-white'
                                    }`}>
                                      <div className="flex flex-col gap-1.5">
                                        {matchedSlots.map(slot => {
                                          const isLab = isLabSubject(slot.subject_name);
                                          return (
                                            <div 
                                              key={slot.id} 
                                              className={`p-2 rounded-xl text-[9px] font-black leading-tight border transition-all text-left ${
                                                isLab
                                                  ? darkMode
                                                    ? 'bg-blue-950/40 border-blue-800/40 text-blue-400 shadow-sm'
                                                    : 'bg-blue-50/80 border-blue-200 text-blue-800 shadow-sm'
                                                  : darkMode
                                                    ? 'bg-brand-emerald/10 border-brand-emerald/20 text-brand-emerald shadow-sm'
                                                    : 'bg-emerald-50/80 border-emerald-200 text-brand-emerald shadow-sm'
                                              }`}
                                            >
                                              <div className="font-extrabold truncate" title={slot.subject_name}>
                                                {slot.subject_name}
                                              </div>
                                              <div className="text-[7.5px] opacity-75 mt-0.5 font-bold">
                                                {slot.start_time} - {slot.end_time}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </td>
                                  );
                                }

                                return <td key={timeSlot.start} className={`border ${darkMode ? 'border-zinc-800 bg-zinc-950/20' : 'border-zinc-200 bg-zinc-50/50'}`}></td>;
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-12 text-center text-zinc-400">
                    <Calendar className="w-12 h-12 mx-auto text-zinc-300 mb-4" />
                    <p className="text-sm font-semibold">No timetable slots configured.</p>
                  </div>
                )}
              </div>
            ) : (
              /* Attendance Calendar View */
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Monthly Calendar Selector */}
                <div className={`md:col-span-7 rounded-card p-6 transition-all duration-300 ${
                  darkMode ? 'bg-[#121212] border border-brand-emerald/20 text-white' : 'bg-white text-zinc-800 shadow-card border border-zinc-100'
                }`}>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className={`text-base font-black ${darkMode ? 'text-white' : 'text-zinc-950'}`}>
                      {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                        className={`p-2 rounded-xl transition-colors ${
                          darkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
                        }`}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setCurrentMonth(new Date())}
                        className={`text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors ${
                          darkMode ? 'text-brand-emerald hover:bg-brand-emerald/10' : 'text-brand-emerald hover:bg-emerald-50'
                        }`}
                      >
                        Current
                      </button>
                      <button
                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                        className={`p-2 rounded-xl transition-colors ${
                          darkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'
                        }`}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Weekday Titles */}
                  <div className={`grid grid-cols-7 gap-1 text-center text-[10px] font-extrabold uppercase tracking-wider mb-3 ${
                    darkMode ? 'text-zinc-500' : 'text-zinc-400'
                  }`}>
                    <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
                  </div>

                  {/* Days grid */}
                  <div className="grid grid-cols-7 gap-1.5">
                    {getDaysInMonth(currentMonth).map((day, idx) => {
                      if (!day) return <div key={`empty-${idx}`} className="aspect-square" />;

                      const isSelected = isSameDay(day, selectedDate);
                      const isTodayDay = isToday(day);
                      const dayOfWeekName = getDays()[day.getDay()];
                      const hasScheduledLectures = user?.class?.timetable?.some(s => s.day_of_week === dayOfWeekName);

                      // Check logs on this date
                      const dayLogs = dashboardData?.logs?.filter(log => isSameDay(new Date(log.date), day)) || [];
                      const attendedCount = dayLogs.length;

                      // Check missed status (past date with schedule but zero attendance logs)
                      const isMissed = isPastDay(day) && hasScheduledLectures && attendedCount === 0;

                      return (
                        <button
                          key={day.toISOString()}
                          onClick={() => setSelectedDate(day)}
                          className={`aspect-square flex flex-col items-center justify-between p-1.5 rounded-2xl border transition-all relative ${
                            isSelected
                              ? 'bg-brand-emerald border-transparent text-white font-extrabold shadow-md shadow-brand-emerald/25 scale-105 z-10'
                              : isTodayDay
                              ? darkMode
                                ? 'bg-brand-emerald/10 border-brand-emerald text-brand-emerald font-extrabold'
                                : 'bg-emerald-50 border-brand-emerald text-brand-emerald font-extrabold'
                              : darkMode
                              ? 'bg-zinc-900 border-transparent hover:bg-zinc-800 text-zinc-300'
                              : 'bg-zinc-50 border-transparent hover:bg-zinc-100 text-zinc-800'
                          }`}
                        >
                          <span className="text-xs">{day.getDate()}</span>

                          {/* Dots */}
                          {hasScheduledLectures && (
                            <span className="flex gap-0.5 justify-center mb-0.5">
                              {attendedCount > 0 && (
                                <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-brand-emerald'}`} />
                              )}
                              {isMissed && (
                                <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-red-500'}`} />
                              )}
                              {!isPastDay(day) && !isTodayDay && (
                                <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-zinc-300'}`} />
                              )}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Day Details panel */}
                <div className={`md:col-span-5 rounded-card p-6 transition-all duration-300 flex flex-col justify-between h-fit ${
                  darkMode ? 'bg-[#121212] border border-brand-emerald/20 text-white' : 'bg-white text-zinc-800 border border-zinc-100 shadow-card'
                }`}>
                  <div>
                    <h3 className={`text-base font-black border-b pb-3 mb-4 flex items-center justify-between ${
                      darkMode ? 'text-white border-zinc-800' : 'text-zinc-950 border-zinc-100'
                    }`}>
                      <span>{selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      <span className="text-xs text-zinc-400 font-semibold">{selectedDate.getFullYear()}</span>
                    </h3>

                    {(() => {
                      const selectedDayName = getDays()[selectedDate.getDay()];
                      const daySlots = user?.class?.timetable?.filter(s => 
                        s.day_of_week === selectedDayName && isSlotForStudentBatch(s.subject_name, user.batch)
                      ) || [];

                      if (daySlots.length === 0) {
                        return (
                          <div className="py-12 text-center text-zinc-400">
                            <Clock className="w-8 h-8 mx-auto opacity-30 mb-2" />
                            <p className="text-xs font-semibold">No lectures scheduled.</p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
                          {daySlots.map(slot => {
                            const log = dashboardData?.logs?.find(
                              l => l.slot_id === slot.id && isSameDay(new Date(l.date), selectedDate)
                            );

                            let badgeClass = darkMode ? 'bg-zinc-900 text-zinc-400 border-zinc-800' : 'bg-zinc-100 text-zinc-500 border-zinc-200';
                            let badgeLabel = 'Scheduled';

                            if (log && log.status === 'PRESENT') {
                              badgeClass = darkMode ? 'bg-brand-emerald/10 text-brand-emerald border-brand-emerald/20' : 'bg-emerald-100 text-emerald-800 border-emerald-200';
                              badgeLabel = 'Attended';
                            } else if (isPastDay(selectedDate)) {
                              badgeClass = darkMode ? 'bg-red-950/40 text-red-400 border-red-800/40' : 'bg-red-100 text-red-800 border-red-200';
                              badgeLabel = 'Missed';
                            } else if (isToday(selectedDate)) {
                              const now = new Date();
                              const currentMins = now.getHours() * 60 + now.getMinutes();
                              const [endH, endM] = slot.end_time.split(':').map(Number);
                              const endMins = endH * 60 + endM;

                              if (currentMins > endMins) {
                                badgeClass = darkMode ? 'bg-red-950/40 text-red-400 border-red-800/40' : 'bg-red-100 text-red-800 border-red-200';
                                badgeLabel = 'Missed';
                              } else {
                                const [startH, startM] = slot.start_time.split(':').map(Number);
                                const startMins = startH * 60 + startM;
                                if (currentMins >= startMins) {
                                  badgeClass = darkMode ? 'bg-blue-950/40 text-blue-400 border-blue-800/40' : 'bg-blue-100 text-blue-800 border-blue-200';
                                  badgeLabel = 'In Progress';
                                } else {
                                  badgeClass = darkMode ? 'bg-amber-950/40 text-amber-400 border-amber-800/40' : 'bg-amber-100 text-amber-800 border-amber-200';
                                  badgeLabel = 'Pending';
                                }
                              }
                            }

                            return (
                              <div key={slot.id} className={`p-3 border rounded-xl flex items-center justify-between ${
                                darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-900'
                              }`}>
                                <div>
                                  <div className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{slot.subject_name}</div>
                                  <div className="text-xs text-zinc-400 font-semibold mt-0.5 flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 text-zinc-300" />
                                    {slot.start_time} - {slot.end_time}
                                  </div>
                                </div>
                                <span className={`text-[9px] font-extrabold border px-2 py-0.5 rounded-full ${badgeClass}`}>
                                  {badgeLabel}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: LEADERBOARD & HEALTH INSIGHTS */}
        {activeTab === 'leaderboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Leaderboard list */}
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-xl font-bold border-b border-white/5 pb-2">Class Leaderboard</h2>
              <div className={`rounded-card p-6 transition-all duration-300 ${
                darkMode ? 'bg-[#121212] border border-brand-emerald/20 text-white' : 'bg-white text-zinc-800 shadow-card border border-zinc-100'
              }`}>
                <div className="space-y-4">
                  {dashboardData?.leaderboard && dashboardData.leaderboard.length > 0 ? (
                    dashboardData.leaderboard.map((item, idx) => (
                      <div key={item.studentId} className={`flex items-center gap-4 p-3 border rounded-2xl transition-all ${
                        darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-100 text-zinc-800'
                      }`}>
                        {/* Rank Badge */}
                        <div className={`w-8 h-8 rounded-xl font-extrabold flex items-center justify-center text-sm ${
                          idx === 0 ? 'bg-amber-100 text-amber-700' :
                          idx === 1 ? 'bg-zinc-200 text-zinc-700' :
                          idx === 2 ? 'bg-amber-50 text-amber-900' :
                          darkMode ? 'bg-zinc-850 text-zinc-400' : 'bg-zinc-100 text-zinc-500'
                        }`}>
                          {idx + 1}
                        </div>
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-brand-emerald text-white flex items-center justify-center font-bold text-sm">
                          {item.name.charAt(0).toUpperCase()}
                        </div>
                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{item.name}</div>
                          <div className="text-xs text-zinc-400 mt-0.5 font-semibold">Student</div>
                        </div>
                        {/* Pct */}
                        <div className="text-right">
                          <div className={`text-base font-extrabold ${darkMode ? 'text-white' : 'text-zinc-950'}`}>{item.pct}%</div>
                          <div className="text-[10px] text-zinc-400 uppercase font-semibold">Attendance</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className={`text-sm text-center py-6 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>No class details available.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Health insights card */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold border-b border-white/5 pb-2">Class Standing</h2>
              <ClassInsights {...dashboardData?.classInsights} avgClassPct={dashboardData?.classInsights?.avgClassPct || 0.0} />
            </div>
          </div>
        )}

        {/* Tab 4: BUNK PREDICTOR (Desktop separate tab / Mobile card tab link) */}
        {activeTab === 'bunk' && (
          <div className="max-w-md mx-auto space-y-6">
            <h2 className="text-xl font-bold border-b border-white/5 pb-2 text-center">Bunk Predictor Panel</h2>
            <BunkPredictor initialAttended={totalAttended} initialConducted={totalConducted} />
          </div>
        )}

        {/* Tab 5: PROFILE VIEW */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold border-b border-white/5 pb-2 text-center">My Account</h2>
            <Profile />
          </div>
        )}
      </main>

      {/* Toast notifications */}
      <Toast {...toast} onClose={() => setToast({ message: '', type: 'info' })} />
    </div>
  );
};

export default Dashboard;
