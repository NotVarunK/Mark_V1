import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Copy, Check, Plus, Trash2, Calendar, ClipboardList, Users, LogOut, Sun, Moon, Edit2, X, UserMinus } from 'lucide-react';
import Toast from '../components/Toast';

export const AdminDashboard = () => {
  const { user, logout, darkMode, toggleDarkMode } = useAuth();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'info' });

  // Class Creator Form State
  const [stream, setStream] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [division, setDivision] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [creatorLoading, setCreatorLoading] = useState(false);

  // Class Edit Form State
  const [editingClass, setEditingClass] = useState(null);
  const [editStream, setEditStream] = useState('');
  const [editAcademicYear, setEditAcademicYear] = useState('');
  const [editDivision, setEditDivision] = useState('');

  // Timetable Builder State
  const [slots, setSlots] = useState([]);
  const [timetableLoading, setTimetableLoading] = useState(false);

  const API_BASE = 'http://localhost:5000/api';

  useEffect(() => {
    fetchClasses();
  }, []);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const fetchClasses = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/classes`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setClasses(data);
        if (data.length > 0 && !selectedClass) {
          // Auto-select first class
          setSelectedClass(data[0]);
          setSlots(data[0].timetable || []);
        } else if (selectedClass) {
          // Update selected class with fresh data
          const updated = data.find(c => c.id === selectedClass.id);
          if (updated) {
            setSelectedClass(updated);
            setSlots(updated.timetable || []);
          }
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch classes.', 'error');
    }
  };

  const handleSelectClass = (cls) => {
    setSelectedClass(cls);
    setSlots(cls.timetable || []);
    handleCancelEdit(); // Cancel edit mode when changing selected class
  };

  // Class Edit Handlers
  const handleStartEdit = (cls, e) => {
    e.stopPropagation(); // Avoid selecting the class when clicking the edit button
    setEditingClass(cls);
    setEditStream(cls.stream);
    setEditAcademicYear(cls.academic_year);
    setEditDivision(cls.division);
  };

  const handleCancelEdit = () => {
    setEditingClass(null);
    setEditStream('');
    setEditAcademicYear('');
    setEditDivision('');
  };

  const handleUpdateClass = async (e) => {
    e.preventDefault();
    if (!editStream || !editAcademicYear || !editDivision) {
      showToast('Please fill all class details fields.', 'warning');
      return;
    }

    setCreatorLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/classes/${editingClass.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stream: editStream,
          academic_year: editAcademicYear,
          division: editDivision
        }),
        credentials: 'include'
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Class updated successfully!', 'success');
        setEditingClass(null);
        if (selectedClass?.id === data.id) {
          setSelectedClass(data);
        }
        fetchClasses();
      } else {
        showToast(data.error || 'Failed to update class.', 'error');
      }
    } catch (err) {
      showToast('Server error while updating class.', 'error');
    } finally {
      setCreatorLoading(false);
    }
  };

  // Student Removal Handler
  const handleRemoveStudent = async (studentId, studentName) => {
    const confirmed = window.confirm(`Are you sure you want to remove ${studentName} from this class?`);
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE}/admin/classes/${selectedClass.id}/students/${studentId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Student removed successfully!', 'success');
        fetchClasses(); // Re-fetch all classes, which updates selectedClass roster
      } else {
        showToast(data.error || 'Failed to remove student.', 'error');
      }
    } catch (err) {
      showToast('Server error while removing student.', 'error');
    }
  };


  // Class Creator handler
  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!stream || !academicYear || !division) {
      showToast('Please fill all class creation fields.', 'warning');
      return;
    }

    setCreatorLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/classes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stream,
          academic_year: academicYear,
          division
        }),
        credentials: 'include'
      });

      const data = await res.json();
      if (res.ok) {
        setGeneratedCode(data.class_code);
        showToast('Class created successfully!', 'success');
        setStream('');
        setAcademicYear('');
        setDivision('');
        fetchClasses();
      } else {
        showToast(data.error || 'Failed to create class.', 'error');
      }
    } catch (err) {
      showToast('Server error while creating class.', 'error');
    } finally {
      setCreatorLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      showToast('Class code copied!', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Timetable Builder handlers
  const addSlot = () => {
    setSlots([
      ...slots,
      {
        day_of_week: 'Monday',
        subject_name: '',
        start_time: '09:00',
        end_time: '10:00'
      }
    ]);
  };

  const removeSlot = (index) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const handleSlotChange = (index, field, value) => {
    const updated = [...slots];
    updated[index][field] = value;
    setSlots(updated);
  };

  const handleSaveTimetable = async () => {
    if (!selectedClass) {
      showToast('Select a class to configure first.', 'warning');
      return;
    }

    setTimetableLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/timetable/${selectedClass.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots }),
        credentials: 'include'
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Timetable saved successfully!', 'success');
        fetchClasses(); // Refresh class list
      } else {
        showToast(data.error || 'Failed to save timetable.', 'error');
      }
    } catch (err) {
      showToast('Server error saving timetable.', 'error');
    } finally {
      setTimetableLoading(false);
    }
  };

  const loadSampleTimetable = () => {
    const sampleSlots = [
      // Monday
      { day_of_week: 'Monday', subject_name: 'COA (AJ) 305', start_time: '08:00', end_time: '09:00' },
      { day_of_week: 'Monday', subject_name: 'DM (RS) 305', start_time: '09:00', end_time: '10:00' },
      { day_of_week: 'Monday', subject_name: 'PP B1 (PM) ESL / SE B2 (AI) RL', start_time: '10:30', end_time: '11:30' },
      { day_of_week: 'Monday', subject_name: 'BS (VB) 303', start_time: '13:30', end_time: '14:30' },
      { day_of_week: 'Monday', subject_name: 'COA B2 (AJ) 303', start_time: '14:30', end_time: '15:30' },
      // Tuesday
      { day_of_week: 'Tuesday', subject_name: 'DBMS (SPP) 305', start_time: '08:00', end_time: '09:00' },
      { day_of_week: 'Tuesday', subject_name: 'DS-II (SPK) 305', start_time: '09:00', end_time: '10:00' },
      { day_of_week: 'Tuesday', subject_name: 'DS-II B1 (SPK) OSL / PP B2 (PM) SPL', start_time: '10:30', end_time: '11:30' },
      { day_of_week: 'Tuesday', subject_name: 'SE (AI) 108', start_time: '13:30', end_time: '14:30' },
      { day_of_week: 'Tuesday', subject_name: 'MDM-Public Policy (GJ)', start_time: '14:30', end_time: '15:30' },
      { day_of_week: 'Tuesday', subject_name: 'MDM-Sanskrit (VA)', start_time: '15:30', end_time: '16:30' },
      // Wednesday
      { day_of_week: 'Wednesday', subject_name: 'DBMS B1 (RC) SSL / DS-II B2 (SPK) OSL', start_time: '08:00', end_time: '09:00' },
      { day_of_week: 'Wednesday', subject_name: 'SE (AI) 305', start_time: '10:30', end_time: '11:30' },
      { day_of_week: 'Wednesday', subject_name: 'BS (VB) 305', start_time: '11:30', end_time: '12:30' },
      { day_of_week: 'Wednesday', subject_name: 'COA (AJ) 304', start_time: '13:30', end_time: '14:30' },
      { day_of_week: 'Wednesday', subject_name: 'MDM-German B1 (RK/MK)', start_time: '14:30', end_time: '15:30' },
      // Thursday
      { day_of_week: 'Thursday', subject_name: 'SE B1 (AI) ESL / DBMS B2 (SPP) SPL', start_time: '08:00', end_time: '09:00' },
      { day_of_week: 'Thursday', subject_name: 'Sports', start_time: '10:30', end_time: '11:30' },
      { day_of_week: 'Thursday', subject_name: 'COA B1 (AJ) 303', start_time: '11:30', end_time: '12:30' },
      { day_of_week: 'Thursday', subject_name: 'PP (PM) 107', start_time: '13:30', end_time: '14:30' },
      { day_of_week: 'Thursday', subject_name: 'DS-II B1 (SPK) OSL', start_time: '14:30', end_time: '16:30' },
      // Friday
      { day_of_week: 'Friday', subject_name: 'DM (RS) 305', start_time: '08:00', end_time: '09:00' },
      { day_of_week: 'Friday', subject_name: 'DS-II (SPK) 305', start_time: '09:00', end_time: '10:00' },
      { day_of_week: 'Friday', subject_name: 'PP (PM) 303', start_time: '10:30', end_time: '11:30' },
      { day_of_week: 'Friday', subject_name: 'DBMS (SPP) 303', start_time: '11:30', end_time: '12:30' },
      { day_of_week: 'Friday', subject_name: 'DS-II B2 (SPK) OSL', start_time: '13:30', end_time: '15:30' },
      { day_of_week: 'Friday', subject_name: 'TNP 305', start_time: '15:30', end_time: '16:30' },
      // Saturday
      { day_of_week: 'Saturday', subject_name: 'MDM-German B2 (RK/MK) / MDM-Finance B1 (PS)', start_time: '09:00', end_time: '11:30' },
      { day_of_week: 'Saturday', subject_name: 'MDM-Finance B2 (PS)', start_time: '11:30', end_time: '13:30' },
      { day_of_week: 'Saturday', subject_name: 'MOOC Campus to Corporate', start_time: '14:30', end_time: '17:30' }
    ];
    setSlots(sampleSlots);
    showToast('Loaded sample university timetable!', 'info');
  };

  const hoursList = [
    '08:00', '09:00', '10:00', '10:30', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:30', '17:30', '18:00'
  ];

  const daysList = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className={`min-h-screen p-6 pb-20 transition-colors duration-300 ${
      darkMode ? 'bg-black text-white' : 'bg-brand-teal text-white'
    }`}>
      {/* Top Banner */}
      <header className="max-w-7xl mx-auto flex items-center justify-between border-b border-white/10 pb-5 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-glass rounded-xl text-brand-emerald border border-white/10">
            <GraduationCap className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Admin Control Panel</h1>
            <p className="text-xs text-brand-emerald font-semibold uppercase tracking-wider">Configure Classes & Schedules</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleDarkMode}
            className="p-2.5 bg-brand-glass rounded-xl border border-white/10 hover:bg-white/10 transition-colors text-white"
            title="Toggle Theme"
          >
            {darkMode ? <Sun className="w-5 h-5 text-brand-emerald" /> : <Moon className="w-5 h-5" />}
          </button>
          <div className="hidden sm:block text-right">
            <div className="text-sm font-bold">{user?.name}</div>
            <div className="text-[10px] text-white/50 font-bold uppercase tracking-wider">System Administrator</div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 bg-brand-glass border border-white/10 hover:bg-white/10 text-red-400 font-bold text-xs px-4.5 py-2.5 rounded-xl transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left column: Class Creator and Selector */}
        <div className="lg:col-span-4 space-y-8">
          {/* Class Creator / Editor Card */}
          <div className={`rounded-card p-6 transition-all duration-300 ${
            darkMode ? 'bg-[#121212] border border-brand-emerald/20 text-white' : 'bg-white text-zinc-800 shadow-card border border-zinc-100'
          }`}>
            {editingClass ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-zinc-950'}`}>
                    <ClipboardList className="w-5 h-5 text-brand-emerald" />
                    Edit Class Details
                  </h3>
                  <button 
                    onClick={handleCancelEdit}
                    className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-950'}`}
                    title="Cancel Edit"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <form onSubmit={handleUpdateClass} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1.5">Stream Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Computer Engineering"
                      value={editStream}
                      onChange={(e) => setEditStream(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-emerald/10 focus:border-brand-emerald transition-all ${
                        darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                      }`}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1.5">Academic Year</label>
                      <input
                        type="text"
                        placeholder="e.g. 2026"
                        value={editAcademicYear}
                        onChange={(e) => setEditAcademicYear(e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-emerald/10 focus:border-brand-emerald transition-all ${
                          darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                        }`}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1.5">Division</label>
                      <input
                        type="text"
                        placeholder="e.g. A"
                        value={editDivision}
                        onChange={(e) => setEditDivision(e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-emerald/10 focus:border-brand-emerald transition-all ${
                          darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                        }`}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-5">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all border ${
                        darkMode ? 'border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white' : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creatorLoading}
                      className="flex-1 bg-brand-emerald hover:bg-brand-secondary text-white py-3 px-6 rounded-xl font-bold text-sm shadow-md transition-all disabled:opacity-50"
                    >
                      {creatorLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <h3 className={`text-lg font-bold flex items-center gap-2 mb-4 ${darkMode ? 'text-white' : 'text-zinc-950'}`}>
                  <ClipboardList className="w-5 h-5 text-brand-emerald" />
                  Create Class
                </h3>
                <form onSubmit={handleCreateClass} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1.5">Stream Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Computer Engineering"
                      value={stream}
                      onChange={(e) => setStream(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-emerald/10 focus:border-brand-emerald transition-all ${
                        darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                      }`}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1.5">Academic Year</label>
                      <input
                        type="text"
                        placeholder="e.g. 2026"
                        value={academicYear}
                        onChange={(e) => setAcademicYear(e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-emerald/10 focus:border-brand-emerald transition-all ${
                          darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                        }`}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1.5">Division</label>
                      <input
                        type="text"
                        placeholder="e.g. A"
                        value={division}
                        onChange={(e) => setDivision(e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-emerald/10 focus:border-brand-emerald transition-all ${
                          darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                        }`}
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={creatorLoading}
                    className="w-full bg-brand-emerald hover:bg-brand-secondary text-white py-3 rounded-xl font-bold text-sm shadow-md transition-all disabled:opacity-50"
                  >
                    {creatorLoading ? 'Generating...' : 'Generate Class Code'}
                  </button>
                </form>

                {generatedCode && (
                  <div className={`mt-5 p-4 rounded-2xl border flex items-center justify-between ${
                    darkMode ? 'bg-brand-emerald/10 border-brand-emerald/20 text-brand-emerald' : 'bg-emerald-50 border-emerald-100'
                  }`}>
                    <div>
                      <div className="text-[10px] text-brand-emerald font-extrabold uppercase tracking-wider">Generated Class Code</div>
                      <div className={`text-2xl font-black tracking-wider mt-0.5 ${darkMode ? 'text-white' : 'text-zinc-950'}`}>{generatedCode}</div>
                    </div>
                    <button
                      onClick={copyToClipboard}
                      className="p-3 bg-brand-emerald hover:bg-brand-secondary text-white rounded-xl shadow-sm transition-all"
                      title="Copy Code"
                    >
                      {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>


          {/* Class Selector List */}
          <div className={`rounded-card border p-6 transition-all duration-300 ${
            darkMode ? 'bg-[#121212] border-brand-emerald/20' : 'bg-brand-glass border-white/10'
          }`}>
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-brand-emerald" />
              Active Classes ({classes.length})
            </h3>
            {classes.length === 0 ? (
              <p className="text-sm text-white/50">No classes created yet. Use the form above to add your first academic stream.</p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
                {classes.map(cls => (
                  <div
                    key={cls.id}
                    className={`relative rounded-2xl border transition-all ${
                      selectedClass?.id === cls.id
                        ? 'bg-brand-emerald border-transparent text-white shadow-lg shadow-brand-emerald/15'
                        : darkMode
                        ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800/80 text-white/80 hover:text-white'
                        : 'bg-white/5 border-white/5 hover:bg-white/10 text-white/80 hover:text-white'
                    }`}
                  >
                    <button
                      onClick={() => handleSelectClass(cls)}
                      className="w-full text-left p-4 pr-12"
                    >
                      <div className="text-xs uppercase font-extrabold opacity-70">Code: {cls.class_code}</div>
                      <div className="text-sm font-black mt-0.5">{cls.stream}</div>
                      <div className="flex items-center justify-between text-xs mt-2 opacity-80 font-semibold">
                        <span>Div: {cls.division} ({cls.academic_year})</span>
                        <span>{cls._count?.students || 0} Students</span>
                      </div>
                    </button>
                    <button
                      onClick={(e) => handleStartEdit(cls, e)}
                      className={`absolute top-4.5 right-4 p-2 rounded-xl transition-all ${
                        selectedClass?.id === cls.id
                          ? 'text-white hover:bg-white/20'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }`}
                      title="Edit Class Details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

              </div>
            )}
          </div>

          {/* Student Roster Card */}
          {selectedClass && (
            <div className={`rounded-card p-6 border transition-all duration-300 ${
              darkMode ? 'bg-[#121212] border-brand-emerald/20 text-white' : 'bg-white text-zinc-800 shadow-card border-zinc-100'
            }`}>
              <h3 className={`text-lg font-bold flex items-center gap-2 mb-4 ${darkMode ? 'text-white' : 'text-zinc-950'}`}>
                <Users className="w-5 h-5 text-brand-emerald" />
                Student Roster ({selectedClass.students?.length || 0})
              </h3>
              
              {!selectedClass.students || selectedClass.students.length === 0 ? (
                <p className={`text-sm ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  No students have joined this class code yet. Share the code <span className="font-extrabold text-brand-emerald">{selectedClass.class_code}</span> with your students.
                </p>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
                  {selectedClass.students.map(student => (
                    <div
                      key={student.id}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                        darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-sm">{student.name}</div>
                        <div className={`text-xs mt-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>{student.email}</div>
                      </div>
                      <button
                        onClick={() => handleRemoveStudent(student.id, student.name)}
                        className={`p-2 rounded-xl transition-all ${
                          darkMode ? 'text-red-400 hover:bg-red-950/40' : 'text-red-500 hover:bg-red-50'
                        }`}
                        title="Remove Student from Class"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column: Timetable Builder */}
        <div className="lg:col-span-8">
          <div className={`rounded-card p-6 transition-all duration-300 ${
            darkMode ? 'bg-[#121212] border border-brand-emerald/20 text-white' : 'bg-white text-zinc-800 border border-zinc-100 shadow-card'
          }`}>
            <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-4 mb-6 ${
              darkMode ? 'border-zinc-800' : 'border-zinc-100'
            }`}>
              <div>
                <h3 className={`text-lg font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-zinc-950'}`}>
                  <Calendar className="w-5 h-5 text-brand-emerald" />
                  Timetable Builder
                </h3>
                {selectedClass && (
                  <p className="text-xs text-zinc-400 mt-1 font-semibold">
                    Managing Schedule for: <span className={darkMode ? 'text-zinc-300' : 'text-zinc-600'}>{selectedClass.stream} - Div {selectedClass.division}</span>
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-3 sm:mt-0">
                <button
                  onClick={loadSampleTimetable}
                  disabled={!selectedClass}
                  className={`font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
                    darkMode ? 'bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white' : 'bg-brand-teal text-white hover:bg-zinc-800'
                  }`}
                >
                  Load Sample Timetable
                </button>
                <button
                  onClick={addSlot}
                  disabled={!selectedClass}
                  className="bg-brand-emerald hover:bg-brand-secondary text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  Add Slot
                </button>
              </div>
            </div>

            {!selectedClass ? (
              <div className="py-20 text-center text-zinc-400">
                <Calendar className="w-12 h-12 mx-auto text-zinc-300 mb-4" />
                <p className="text-sm font-semibold">Create or Select a class from the left panel to load the timetable editor.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {slots.length === 0 ? (
                  <div className="py-12 text-center border-2 border-dashed border-zinc-200 rounded-2xl text-zinc-400">
                    <p className="text-sm font-semibold mb-3">No timetable slots configured for this class.</p>
                    <button
                      onClick={addSlot}
                      className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs px-4.5 py-2.5 rounded-xl transition-colors"
                    >
                      Configure First Slot
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1 no-scrollbar">
                    {slots.map((slot, index) => (
                      <div 
                        key={index} 
                        className={`flex flex-col md:flex-row items-stretch md:items-center gap-3 p-4.5 border rounded-2xl transition-all duration-300 ${
                          darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-100'
                        }`}
                      >
                        {/* Day Selector */}
                        <div className="w-full md:w-40">
                          <label className="block md:hidden text-[9px] font-extrabold text-zinc-400 uppercase mb-1">Day</label>
                          <select
                            value={slot.day_of_week}
                            onChange={(e) => handleSlotChange(index, 'day_of_week', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-xl text-xs font-bold focus:outline-none focus:border-brand-emerald ${
                              darkMode ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-800'
                            }`}
                          >
                            {daysList.map(day => <option key={day} value={day}>{day}</option>)}
                          </select>
                        </div>

                        {/* Subject Input */}
                        <div className="flex-1">
                          <label className="block md:hidden text-[9px] font-extrabold text-zinc-400 uppercase mb-1">Subject Name</label>
                          <input
                            type="text"
                            placeholder="e.g. DS / Python / DBMS"
                            value={slot.subject_name}
                            onChange={(e) => handleSlotChange(index, 'subject_name', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-xl text-xs font-bold focus:outline-none focus:border-brand-emerald ${
                              darkMode ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-800'
                            }`}
                            required
                          />
                        </div>

                        {/* Time Selectors */}
                        <div className="flex items-center gap-2">
                          <div className="w-24">
                            <label className="block md:hidden text-[9px] font-extrabold text-zinc-400 uppercase mb-1">Start</label>
                            <select
                              value={slot.start_time}
                              onChange={(e) => handleSlotChange(index, 'start_time', e.target.value)}
                              className={`w-full px-2.5 py-2 border rounded-xl text-xs font-bold focus:outline-none focus:border-brand-emerald ${
                                darkMode ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-800'
                              }`}
                            >
                              {hoursList.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                          </div>
                          <span className={`font-bold text-xs mt-4 md:mt-0 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>to</span>
                          <div className="w-24">
                            <label className="block md:hidden text-[9px] font-extrabold text-zinc-400 uppercase mb-1">End</label>
                            <select
                              value={slot.end_time}
                              onChange={(e) => handleSlotChange(index, 'end_time', e.target.value)}
                              className={`w-full px-2.5 py-2 border rounded-xl text-xs font-bold focus:outline-none focus:border-brand-emerald ${
                                darkMode ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-800'
                              }`}
                            >
                              {hoursList.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                          </div>
                        </div>

                        {/* Delete Button */}
                        <button
                          onClick={() => removeSlot(index)}
                          className={`p-2.5 rounded-xl transition-colors self-end md:self-auto ${
                            darkMode ? 'bg-red-950/20 text-red-400 hover:bg-red-950/40' : 'bg-red-50 hover:bg-red-100 text-red-500'
                          }`}
                          title="Remove Slot"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Save Button */}
                <div className={`border-t pt-5 mt-6 flex justify-end ${
                  darkMode ? 'border-zinc-800' : 'border-zinc-100'
                }`}>
                  <button
                    onClick={handleSaveTimetable}
                    disabled={timetableLoading || slots.length === 0}
                    className="w-full sm:w-auto bg-brand-emerald hover:bg-brand-secondary text-white py-3 px-8 rounded-xl font-bold text-sm shadow-md transition-all disabled:opacity-50"
                  >
                    {timetableLoading ? 'Saving...' : 'Save Timetable'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Toast {...toast} onClose={() => setToast({ message: '', type: 'info' })} />
    </div>
  );
};

export default AdminDashboard;
