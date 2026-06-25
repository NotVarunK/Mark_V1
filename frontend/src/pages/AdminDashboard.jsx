import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Copy, Check, Plus, Trash2, Calendar, ClipboardList, Users, LogOut, Sun, Moon, Edit2, X, UserMinus, UserCheck, UserX, Palmtree, BarChart3, AlertTriangle, Lock } from 'lucide-react';
import Toast from '../components/Toast';

export const AdminDashboard = () => {
  const { user, logout, darkMode, toggleDarkMode } = useAuth();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'info' });

  // Mobile View Sub-Tab States
  const [setupSubTab, setSetupSubTab] = useState('classes'); // 'classes' | 'roster' | 'timetable'
  const [overridesSubTab, setOverridesSubTab] = useState('parameters'); // 'parameters' | 'roster'
  const [exceptionsSubTab, setExceptionsSubTab] = useState('holidays'); // 'holidays' | 'adjustments'
  const [analyticsSubTab, setAnalyticsSubTab] = useState('summary'); // 'summary' | 'subjects' | 'standings'

  // Admin Change Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

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

  // Primary Navigation Tab State
  const [activeAdminTab, setActiveAdminTab] = useState('setup'); // 'setup' | 'overrides' | 'holidays' | 'analytics'

  // Manual Overrides State
  const [overrideClassId, setOverrideClassId] = useState('');
  const [overrideDate, setOverrideDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [overrideSlotId, setOverrideSlotId] = useState('');
  const [overrideRoster, setOverrideRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  // Holidays Manager State
  const [holidays, setHolidays] = useState([]);
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayName, setHolidayName] = useState('');
  const [holidaysLoading, setHolidaysLoading] = useState(false);
  const [addHolidayLoading, setAddHolidayLoading] = useState(false);

  // Temporary Adjustments State
  const [adjustments, setAdjustments] = useState([]);
  const [adjustmentsLoading, setAdjustmentsLoading] = useState(false);
  const [adjustmentClassId, setAdjustmentClassId] = useState('');
  const [adjustmentDate, setAdjustmentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [adjustmentSlotId, setAdjustmentSlotId] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('cancel'); // 'cancel' | 'swap'
  const [adjustmentReplacedSubject, setAdjustmentReplacedSubject] = useState('');
  const [addAdjustmentLoading, setAddAdjustmentLoading] = useState(false);

  // Roster Analytics State
  const [analyticsClassId, setAnalyticsClassId] = useState('');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchClasses();
    fetchHolidays();
  }, []);

  useEffect(() => {
    const selected = classes.find(c => c.id === overrideClassId);
    if (selected && selected.timetable && selected.timetable.length > 0) {
      setOverrideSlotId(selected.timetable[0].id);
    } else {
      setOverrideSlotId('');
      setOverrideRoster([]);
    }
  }, [overrideClassId, classes]);

  useEffect(() => {
    if (overrideClassId && overrideDate && overrideSlotId) {
      fetchOverrideRoster();
    } else {
      setOverrideRoster([]);
    }
  }, [overrideClassId, overrideDate, overrideSlotId]);

  useEffect(() => {
    const selected = classes.find(c => c.id === adjustmentClassId);
    if (selected && selected.timetable && selected.timetable.length > 0) {
      setAdjustmentSlotId(selected.timetable[0].id);
    } else {
      setAdjustmentSlotId('');
    }
  }, [adjustmentClassId, classes]);

  useEffect(() => {
    if (activeAdminTab === 'holidays' && adjustmentClassId) {
      fetchAdjustments(adjustmentClassId);
    }
  }, [activeAdminTab, adjustmentClassId]);

  useEffect(() => {
    if (activeAdminTab === 'analytics' && analyticsClassId) {
      fetchAnalyticsData(analyticsClassId);
    }
  }, [activeAdminTab, analyticsClassId]);

  const fetchAnalyticsData = async (classId) => {
    if (!classId) return;
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/classes/${classId}/analytics`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data);
      } else {
        showToast('Failed to load class analytics.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading analytics.', 'error');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (newPassword.trim().length < 6) {
      showToast('Password must be at least 6 characters long.', 'warning');
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
        showToast('Password updated successfully!', 'success');
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

  const fetchClasses = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/classes`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setClasses(data);
        if (data.length > 0) {
          if (!selectedClass) {
            // Auto-select first class
            setSelectedClass(data[0]);
            setSlots(data[0].timetable || []);
          }
          setOverrideClassId(prev => prev || data[0].id);
          setAnalyticsClassId(prev => prev || data[0].id);
          setAdjustmentClassId(prev => prev || data[0].id);
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

  const fetchHolidays = async () => {
    setHolidaysLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/holidays`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setHolidays(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setHolidaysLoading(false);
    }
  };

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!holidayDate || !holidayName.trim()) {
      showToast('Please fill all holiday fields.', 'warning');
      return;
    }
    setAddHolidayLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/holidays`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: holidayDate,
          name: holidayName.trim()
        }),
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Holiday declared successfully!', 'success');
        setHolidayDate('');
        setHolidayName('');
        fetchHolidays();
      } else {
        showToast(data.error || 'Failed to add holiday.', 'error');
      }
    } catch (err) {
      showToast('Server error declaring holiday.', 'error');
    } finally {
      setAddHolidayLoading(false);
    }
  };

  const handleDeleteHoliday = async (holidayId) => {
    const confirmed = window.confirm('Are you sure you want to delete this holiday? Check-ins on this day will be re-enabled.');
    if (!confirmed) return;
    try {
      const res = await fetch(`${API_BASE}/admin/holidays/${holidayId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Holiday deleted successfully!', 'success');
        fetchHolidays();
      } else {
        showToast(data.error || 'Failed to delete holiday.', 'error');
      }
    } catch (err) {
      showToast('Server error deleting holiday.', 'error');
    }
  };

  const fetchAdjustments = async (classId) => {
    if (!classId) return;
    setAdjustmentsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/classes/${classId}/adjustments`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAdjustments(data);
      } else {
        showToast('Failed to load schedule adjustments.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading schedule adjustments.', 'error');
    } finally {
      setAdjustmentsLoading(false);
    }
  };

  const handleAddAdjustment = async (e) => {
    e.preventDefault();
    if (!adjustmentClassId || !adjustmentSlotId || !adjustmentDate) {
      showToast('Please select a class, slot, and date.', 'warning');
      return;
    }
    if (adjustmentType === 'swap' && !adjustmentReplacedSubject.trim()) {
      showToast('Please specify a replacement subject.', 'warning');
      return;
    }
    setAddAdjustmentLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/adjustments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          class_id: adjustmentClassId,
          slot_id: adjustmentSlotId,
          date: adjustmentDate,
          is_cancelled: adjustmentType === 'cancel',
          replaced_subject: adjustmentType === 'swap' ? adjustmentReplacedSubject.trim() : null
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Schedule adjustment applied successfully!', 'success');
        setAdjustmentReplacedSubject('');
        fetchAdjustments(adjustmentClassId);
      } else {
        showToast(data.detail || data.error || 'Failed to apply schedule adjustment.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Server error applying adjustment.', 'error');
    } finally {
      setAddAdjustmentLoading(false);
    }
  };

  const handleDeleteAdjustment = async (adjustmentId) => {
    const confirmed = window.confirm('Are you sure you want to revert this schedule adjustment?');
    if (!confirmed) return;
    try {
      const res = await fetch(`${API_BASE}/admin/adjustments/${adjustmentId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Schedule adjustment reverted successfully!', 'success');
        fetchAdjustments(adjustmentClassId);
      } else {
        showToast(data.detail || data.error || 'Failed to delete adjustment.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Server error deleting adjustment.', 'error');
    }
  };

  const fetchOverrideRoster = async () => {
    setRosterLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/admin/classes/${overrideClassId}/attendance?date=${overrideDate}&slot_id=${overrideSlotId}`,
        { credentials: 'include' }
      );
      if (res.ok) {
        const data = await res.json();
        setOverrideRoster(data);
      } else {
        setOverrideRoster([]);
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading attendance roster.', 'error');
    } finally {
      setRosterLoading(false);
    }
  };

  const handleOverrideAttendance = async (studentId, status) => {
    try {
      const res = await fetch(`${API_BASE}/admin/attendance/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          slot_id: overrideSlotId,
          date: overrideDate,
          status: status
        }),
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Marked student as ${status.toLowerCase()} successfully!`, 'success');
        fetchOverrideRoster();
      } else {
        showToast(data.error || 'Failed to override attendance.', 'error');
      }
    } catch (err) {
      showToast('Error sending manual override.', 'error');
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
    <div className={`min-h-screen w-full flex flex-col p-4 pt-8 md:p-6 pb-20 transition-colors duration-300 ${
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
          {/* Change Password Button */}
          <button
            onClick={() => setShowPasswordModal(true)}
            className="p-2.5 bg-brand-glass rounded-xl border border-white/10 hover:bg-white/10 transition-colors text-white"
            title="Change Password"
          >
            <Lock className="w-5 h-5 text-brand-emerald" />
          </button>
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

      {/* Navigation Tabs */}
      <div className="flex border-b border-white/10 mb-8 max-w-7xl mx-auto gap-6 px-4 md:px-0 overflow-x-auto no-scrollbar whitespace-nowrap">
        <button
          onClick={() => setActiveAdminTab('setup')}
          className={`flex items-center gap-2 pb-3 text-sm font-extrabold transition-all border-b-2 ${
            activeAdminTab === 'setup'
              ? 'border-brand-emerald text-brand-emerald'
              : 'border-transparent text-white/60 hover:text-white'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          Classes & Timetable
        </button>
        <button
          onClick={() => setActiveAdminTab('overrides')}
          className={`flex items-center gap-2 pb-3 text-sm font-extrabold transition-all border-b-2 ${
            activeAdminTab === 'overrides'
              ? 'border-brand-emerald text-brand-emerald'
              : 'border-transparent text-white/60 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          Roster Overrides
        </button>
        <button
          onClick={() => setActiveAdminTab('holidays')}
          className={`flex items-center gap-2 pb-3 text-sm font-extrabold transition-all border-b-2 ${
            activeAdminTab === 'holidays'
              ? 'border-brand-emerald text-brand-emerald'
              : 'border-transparent text-white/60 hover:text-white'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Schedule Exceptions
        </button>
        <button
          onClick={() => setActiveAdminTab('analytics')}
          className={`flex items-center gap-2 pb-3 text-sm font-extrabold transition-all border-b-2 ${
            activeAdminTab === 'analytics'
              ? 'border-brand-emerald text-brand-emerald'
              : 'border-transparent text-white/60 hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Roster Analytics
        </button>
      </div>

      {/* Mobile Sub-Navigation Pill Bar */}
      {activeAdminTab === 'setup' && (
        <div className="flex lg:hidden gap-2 mb-6 max-w-7xl mx-auto w-full px-4 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setSetupSubTab('classes')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              setupSubTab === 'classes'
                ? 'bg-brand-emerald text-white shadow-md'
                : 'bg-brand-glass text-white/70 border border-white/5'
            }`}
          >
            Class List
          </button>
          <button
            onClick={() => setSetupSubTab('roster')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              setupSubTab === 'roster'
                ? 'bg-brand-emerald text-white shadow-md'
                : 'bg-brand-glass text-white/70 border border-white/5'
            }`}
          >
            Student Roster
          </button>
          <button
            onClick={() => setSetupSubTab('timetable')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              setupSubTab === 'timetable'
                ? 'bg-brand-emerald text-white shadow-md'
                : 'bg-brand-glass text-white/70 border border-white/5'
            }`}
          >
            Timetable
          </button>
        </div>
      )}

      {activeAdminTab === 'overrides' && (
        <div className="flex lg:hidden gap-2 mb-6 max-w-7xl mx-auto w-full px-4 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setOverridesSubTab('parameters')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all text-center whitespace-nowrap ${
              overridesSubTab === 'parameters'
                ? 'bg-brand-emerald text-white shadow-md'
                : 'bg-brand-glass text-white/70 border border-white/5'
            }`}
          >
            Select Session
          </button>
          <button
            onClick={() => setOverridesSubTab('roster')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all text-center whitespace-nowrap ${
              overridesSubTab === 'roster'
                ? 'bg-brand-emerald text-white shadow-md'
                : 'bg-brand-glass text-white/70 border border-white/5'
            }`}
          >
            Overrides Sheet
          </button>
        </div>
      )}

      {activeAdminTab === 'holidays' && (
        <div className="flex lg:hidden gap-2 mb-6 max-w-7xl mx-auto w-full px-4 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setExceptionsSubTab('holidays')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all text-center whitespace-nowrap ${
              exceptionsSubTab === 'holidays'
                ? 'bg-brand-emerald text-white shadow-md'
                : 'bg-brand-glass text-white/70 border border-white/5'
            }`}
          >
            Global Holidays
          </button>
          <button
            onClick={() => setExceptionsSubTab('adjustments')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all text-center whitespace-nowrap ${
              exceptionsSubTab === 'adjustments'
                ? 'bg-brand-emerald text-white shadow-md'
                : 'bg-brand-glass text-white/70 border border-white/5'
            }`}
          >
            Class Adjustments
          </button>
        </div>
      )}

      {activeAdminTab === 'analytics' && (
        <div className="flex lg:hidden gap-2 mb-6 max-w-7xl mx-auto w-full px-4 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setAnalyticsSubTab('summary')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              analyticsSubTab === 'summary'
                ? 'bg-brand-emerald text-white shadow-md'
                : 'bg-brand-glass text-white/70 border border-white/5'
            }`}
          >
            Summary & Alerts
          </button>
          <button
            onClick={() => setAnalyticsSubTab('subjects')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              analyticsSubTab === 'subjects'
                ? 'bg-brand-emerald text-white shadow-md'
                : 'bg-brand-glass text-white/70 border border-white/5'
            }`}
          >
            Subject Stats
          </button>
          <button
            onClick={() => setAnalyticsSubTab('standings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              analyticsSubTab === 'standings'
                ? 'bg-brand-emerald text-white shadow-md'
                : 'bg-brand-glass text-white/70 border border-white/5'
            }`}
          >
            Full Standings
          </button>
        </div>
      )}

      <main className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 md:px-0">
        {activeAdminTab === 'setup' && (
          <>
            {/* Left column: Class Creator and Selector */}
            <div className={`lg:col-span-4 space-y-8 ${setupSubTab !== 'classes' && setupSubTab !== 'roster' ? 'hidden lg:block' : ''}`}>
              {/* Class Creator / Editor Card */}
              <div className={`rounded-card p-6 transition-all duration-300 ${
                darkMode ? 'bg-[#121212] border border-brand-emerald/20 text-white' : 'bg-white text-zinc-800 shadow-card border border-zinc-100'
              } ${setupSubTab !== 'classes' ? 'hidden lg:block' : ''}`}>
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
              } ${setupSubTab !== 'classes' ? 'hidden lg:block' : ''}`}>
                <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-brand-emerald" />
                  Active Classes ({classes.length})
                </h3>
                {classes.length === 0 ? (
                  <p className="text-sm text-white/50">No classes created yet. Use the form above to add your first academic stream.</p>
                ) : (
                  <div className="space-y-3 lg:max-h-[300px] lg:overflow-y-auto pr-1 no-scrollbar">
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
                } ${setupSubTab !== 'roster' ? 'hidden lg:block' : ''}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-lg font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-zinc-950'}`}>
                      <Users className="w-5 h-5 text-brand-emerald" />
                      Student Roster ({selectedClass.students?.length || 0})
                    </h3>
                    {selectedClass.students && selectedClass.students.length > 0 && (
                      <button
                        onClick={() => {
                          window.open(`${API_BASE}/admin/classes/${selectedClass.id}/export`, '_blank');
                        }}
                        className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 border rounded-lg transition-all ${
                          darkMode ? 'border-brand-emerald/30 text-brand-emerald hover:bg-brand-emerald/10' : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                        }`}
                      >
                        Export CSV
                      </button>
                    )}
                  </div>
                  
                  {!selectedClass.students || selectedClass.students.length === 0 ? (
                    <p className={`text-sm ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      No students have joined this class code yet. Share the code <span className="font-extrabold text-brand-emerald">{selectedClass.class_code}</span> with your students.
                    </p>
                  ) : (
                    <div className="space-y-3 lg:max-h-[300px] lg:overflow-y-auto pr-1 no-scrollbar">
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
            <div className={`lg:col-span-8 ${setupSubTab !== 'timetable' ? 'hidden lg:block' : ''}`}>
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
                      <div className="space-y-3 lg:max-h-[450px] lg:overflow-y-auto pr-1 no-scrollbar">
                        {slots.map((slot, index) => (
                          <div 
                            key={index} 
                            className={`flex flex-col md:flex-row items-stretch md:items-center gap-3 p-4.5 border rounded-2xl transition-all duration-300 ${
                              darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-100'
                            }`}
                          >
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
          </>
        )}

        {activeAdminTab === 'overrides' && (
          <>
            {/* Selector Column */}
            <div className={`lg:col-span-4 space-y-6 ${overridesSubTab !== 'parameters' ? 'hidden lg:block' : ''}`}>
              <div className={`rounded-card p-6 border transition-all duration-300 ${
                darkMode ? 'bg-[#121212] border border-brand-emerald/20 text-white' : 'bg-white text-zinc-800 shadow-card border border-zinc-100'
              }`}>
                <h3 className={`text-lg font-bold flex items-center gap-2 mb-4 ${darkMode ? 'text-white' : 'text-zinc-950'}`}>
                  <Calendar className="w-5 h-5 text-brand-emerald" />
                  Override Parameters
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1.5">Select Class</label>
                    <select
                      value={overrideClassId}
                      onChange={(e) => setOverrideClassId(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-emerald/10 focus:border-brand-emerald transition-all ${
                        darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                      }`}
                    >
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.stream} - Div {c.division} ({c.class_code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1.5">Select Date</label>
                    <input
                      type="date"
                      value={overrideDate}
                      onChange={(e) => setOverrideDate(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-emerald/10 focus:border-brand-emerald transition-all ${
                        darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1.5">Select Timetable Slot</label>
                    <select
                      value={overrideSlotId}
                      onChange={(e) => setOverrideSlotId(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-emerald/10 focus:border-brand-emerald transition-all ${
                        darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                      }`}
                    >
                      {(() => {
                        const selClass = classes.find(c => c.id === overrideClassId);
                        if (!selClass || !selClass.timetable || selClass.timetable.length === 0) {
                          return <option value="">No timetable slots found</option>;
                        }
                        return selClass.timetable.map(slot => (
                          <option key={slot.id} value={slot.id}>
                            {slot.subject_name} ({slot.start_time} - {slot.end_time}) on {slot.day_of_week}
                          </option>
                        ));
                      })()}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Roster Column */}
            <div className={`lg:col-span-8 ${overridesSubTab !== 'roster' ? 'hidden lg:block' : ''}`}>
              <div className={`rounded-card p-6 transition-all duration-300 ${
                darkMode ? 'bg-[#121212] border border-brand-emerald/20 text-white' : 'bg-white text-zinc-800 border border-zinc-100 shadow-card'
              }`}>
                <h3 className={`text-lg font-bold flex items-center gap-2 mb-4 border-b pb-4 ${darkMode ? 'text-white border-zinc-800' : 'text-zinc-950 border-zinc-100'}`}>
                  <Users className="w-5 h-5 text-brand-emerald" />
                  Roster Override Sheet
                </h3>

                {rosterLoading ? (
                  <div className="py-12 text-center text-zinc-400">Loading student roster...</div>
                ) : !overrideSlotId ? (
                  <div className="py-12 text-center text-zinc-400">
                    Please configure a timetable slot for the selected class to begin manual attendance overrides.
                  </div>
                ) : overrideRoster.length === 0 ? (
                  <div className="py-12 text-center text-zinc-400">
                    No students have joined this class division yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className={`border-b ${darkMode ? 'border-zinc-800 text-zinc-400' : 'border-zinc-100 text-zinc-500'} font-bold`}>
                          <th className="pb-3">Name</th>
                          <th className="pb-3 hidden sm:table-cell">Email</th>
                          <th className="pb-3">Batch</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overrideRoster.map(s => (
                          <tr key={s.id} className={`border-b ${darkMode ? 'border-zinc-800/50 hover:bg-zinc-900/30' : 'border-zinc-100/80 hover:bg-zinc-50/50'} transition-all`}>
                            <td className="py-4 font-bold flex flex-col">
                              <span>{s.name}</span>
                              {!s.is_applicable && (
                                <span className="text-[9px] text-amber-500 font-extrabold uppercase mt-0.5 tracking-wider">
                                  Not matching batch
                                </span>
                              )}
                            </td>
                            <td className={`py-4 hidden sm:table-cell ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>{s.email}</td>
                            <td className="py-4 font-bold">
                              {s.batch ? (
                                <span className={`text-[10px] px-2 py-0.5 border rounded-md ${
                                  darkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-zinc-100 border-zinc-200 text-zinc-600'
                                }`}>{s.batch}</span>
                              ) : 'N/A'}
                            </td>
                            <td className="py-4">
                              {s.status === 'PRESENT' && (
                                <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-emerald-500/10 text-brand-emerald border border-brand-emerald/20 uppercase tracking-wide">
                                  Present
                                </span>
                              )}
                              {s.status === 'ABSENT' && (
                                <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-red-500/10 text-red-400 border border-red-500/20 uppercase tracking-wide">
                                  Absent
                                </span>
                              )}
                              {s.status === null && (
                                <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold border uppercase tracking-wide ${
                                  darkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-500'
                                }`}>
                                  Unmarked
                                </span>
                              )}
                            </td>
                            <td className="py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleOverrideAttendance(s.id, 'PRESENT')}
                                  disabled={s.status === 'PRESENT'}
                                  className={`p-2 rounded-xl transition-all ${
                                    s.status === 'PRESENT'
                                      ? 'opacity-30 cursor-not-allowed text-zinc-500 font-extrabold'
                                      : darkMode
                                      ? 'bg-emerald-500/10 text-brand-emerald hover:bg-emerald-500/20'
                                      : 'bg-emerald-50 text-brand-emerald hover:bg-emerald-100'
                                  }`}
                                  title="Mark Present"
                                >
                                  <UserCheck className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleOverrideAttendance(s.id, 'ABSENT')}
                                  disabled={s.status === 'ABSENT'}
                                  className={`p-2 rounded-xl transition-all ${
                                    s.status === 'ABSENT'
                                      ? 'opacity-30 cursor-not-allowed text-zinc-500 font-extrabold'
                                      : darkMode
                                      ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                      : 'bg-red-50 text-red-500 hover:bg-red-100'
                                  }`}
                                  title="Mark Absent"
                                >
                                  <UserX className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeAdminTab === 'holidays' && (
          <>
            {/* Left Column: Global Holiday Declarations */}
            <div className={`lg:col-span-6 space-y-6 ${exceptionsSubTab !== 'holidays' ? 'hidden lg:block' : ''}`}>
              {/* Add Holiday Form */}
              <div className={`rounded-card p-6 border transition-all duration-300 ${
                darkMode ? 'bg-[#121212] border border-brand-emerald/20 text-white' : 'bg-white text-zinc-800 shadow-card border border-zinc-100'
              }`}>
                <h3 className={`text-lg font-bold flex items-center gap-2 mb-4 ${darkMode ? 'text-white' : 'text-zinc-950'}`}>
                  <Palmtree className="w-5 h-5 text-brand-emerald" />
                  Declare Global Holiday
                </h3>
                
                <form onSubmit={handleAddHoliday} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1.5">Holiday Date</label>
                    <input
                      type="date"
                      value={holidayDate}
                      onChange={(e) => setHolidayDate(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-emerald/10 focus:border-brand-emerald transition-all ${
                        darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1.5">Holiday Name / Occasion</label>
                    <input
                      type="text"
                      placeholder="e.g. Christmas / National Holiday"
                      value={holidayName}
                      onChange={(e) => setHolidayName(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-emerald/10 focus:border-brand-emerald transition-all ${
                        darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                      }`}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={addHolidayLoading}
                    className="w-full bg-brand-emerald hover:bg-brand-secondary text-white py-3 rounded-xl font-bold text-sm shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {addHolidayLoading ? 'Declaring...' : 'Declare Holiday'}
                  </button>
                </form>
              </div>

              {/* Holidays List */}
              <div className={`rounded-card p-6 border transition-all duration-300 ${
                darkMode ? 'bg-[#121212] border border-brand-emerald/20 text-white' : 'bg-white text-zinc-800 border border-zinc-100 shadow-card'
              }`}>
                <h3 className={`text-lg font-bold flex items-center gap-2 mb-4 border-b pb-4 ${darkMode ? 'text-white border-zinc-800' : 'text-zinc-950 border-zinc-100'}`}>
                  <Calendar className="w-5 h-5 text-brand-emerald" />
                  Active Holiday Declarations
                </h3>

                {holidaysLoading ? (
                  <div className="py-12 text-center text-zinc-400">Loading declared holidays...</div>
                ) : holidays.length === 0 ? (
                  <div className="py-12 text-center text-zinc-400">
                    No holidays have been declared yet. Active check-in is enabled for all scheduled slots.
                  </div>
                ) : (
                  <div className="space-y-3 lg:max-h-[350px] lg:overflow-y-auto pr-1 no-scrollbar">
                    {holidays.map(h => (
                      <div
                        key={h.id}
                        className={`flex items-center justify-between p-4.5 rounded-2xl border transition-all ${
                          darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2.5 rounded-xl border ${
                            darkMode ? 'bg-zinc-950 border-zinc-800 text-amber-500' : 'bg-amber-50 border-amber-100 text-amber-600'
                          }`}>
                            <Palmtree className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-extrabold text-sm">{h.name}</div>
                            <div className={`text-xs mt-1 font-semibold ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                              Date: {new Date(h.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteHoliday(h.id)}
                          className={`p-2.5 rounded-xl transition-all ${
                            darkMode ? 'text-red-400 hover:bg-red-950/40' : 'text-red-500 hover:bg-red-50'
                          }`}
                          title="Delete Holiday"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Temporary Schedule Adjustments */}
            <div className={`lg:col-span-6 space-y-6 ${exceptionsSubTab !== 'adjustments' ? 'hidden lg:block' : ''}`}>
              {/* Add Adjustment Form */}
              <div className={`rounded-card p-6 border transition-all duration-300 ${
                darkMode ? 'bg-[#121212] border border-brand-emerald/20 text-white' : 'bg-white text-zinc-800 shadow-card border border-zinc-100'
              }`}>
                <h3 className={`text-lg font-bold flex items-center gap-2 mb-4 ${darkMode ? 'text-white' : 'text-zinc-950'}`}>
                  <AlertTriangle className="w-5 h-5 text-brand-emerald" />
                  Temporary Schedule Adjustment
                </h3>

                <form onSubmit={handleAddAdjustment} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1.5">Select Class</label>
                    <select
                      value={adjustmentClassId}
                      onChange={(e) => setAdjustmentClassId(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-emerald/10 focus:border-brand-emerald transition-all ${
                        darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                      }`}
                    >
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.stream} - Div {c.division} ({c.class_code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1.5">Adjustment Date</label>
                      <input
                        type="date"
                        value={adjustmentDate}
                        onChange={(e) => setAdjustmentDate(e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-emerald/10 focus:border-brand-emerald transition-all ${
                          darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                        }`}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1.5">Adjustment Type</label>
                      <select
                        value={adjustmentType}
                        onChange={(e) => setAdjustmentType(e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-emerald/10 focus:border-brand-emerald transition-all ${
                          darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                        }`}
                      >
                        <option value="cancel">Cancel Class</option>
                        <option value="swap">Swap / Replace Subject</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1.5">Select Lecture Slot</label>
                    <select
                      value={adjustmentSlotId}
                      onChange={(e) => setAdjustmentSlotId(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-emerald/10 focus:border-brand-emerald transition-all ${
                        darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                      }`}
                    >
                      {(() => {
                        const selClass = classes.find(c => c.id === adjustmentClassId);
                        if (!selClass || !selClass.timetable || selClass.timetable.length === 0) {
                          return <option value="">No slots scheduled for this class</option>;
                        }
                        return selClass.timetable.map(slot => (
                          <option key={slot.id} value={slot.id}>
                            {slot.subject_name} ({slot.start_time} - {slot.end_time}) on {slot.day_of_week}
                          </option>
                        ));
                      })()}
                    </select>
                  </div>

                  {adjustmentType === 'swap' && (
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1.5">Replacement Subject Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Python / DBMS"
                        value={adjustmentReplacedSubject}
                        onChange={(e) => setAdjustmentReplacedSubject(e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-emerald/10 focus:border-brand-emerald transition-all ${
                          darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                        }`}
                        required
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={addAdjustmentLoading}
                    className="w-full bg-brand-emerald hover:bg-brand-secondary text-white py-3 rounded-xl font-bold text-sm shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {addAdjustmentLoading ? 'Applying...' : 'Apply Schedule Adjustment'}
                  </button>
                </form>
              </div>

              {/* Adjustments List */}
              <div className={`rounded-card p-6 border transition-all duration-300 ${
                darkMode ? 'bg-[#121212] border border-brand-emerald/20 text-white' : 'bg-white text-zinc-800 border border-zinc-100 shadow-card'
              }`}>
                <h3 className={`text-lg font-bold flex items-center gap-2 mb-4 border-b pb-4 ${darkMode ? 'text-white border-zinc-800' : 'text-zinc-950 border-zinc-100'}`}>
                  <Calendar className="w-5 h-5 text-brand-emerald" />
                  Active Adjustments for Class
                </h3>

                {adjustmentsLoading ? (
                  <div className="py-12 text-center text-zinc-400">Loading schedule adjustments...</div>
                ) : adjustments.length === 0 ? (
                  <div className="py-12 text-center text-zinc-400">
                    No active temporary adjustments declared for this class.
                  </div>
                ) : (
                  <div className="space-y-3 lg:max-h-[350px] lg:overflow-y-auto pr-1 no-scrollbar">
                    {adjustments.map(adj => (
                      <div
                        key={adj.id}
                        className={`flex items-center justify-between p-4.5 rounded-2xl border transition-all ${
                          darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2.5 rounded-xl border ${
                            adj.is_cancelled 
                              ? (darkMode ? 'bg-red-950/40 border-red-900 text-red-400' : 'bg-red-50 border-red-100 text-red-600')
                              : (darkMode ? 'bg-amber-950/40 border-amber-900 text-amber-400' : 'bg-amber-50 border-amber-100 text-amber-600')
                          }`}>
                            <AlertTriangle className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-extrabold text-sm">
                              {adj.is_cancelled 
                                ? `Cancelled: ${adj.slot?.subject_name || 'Lecture'}`
                                : `Swapped: ${adj.slot?.subject_name || 'Lecture'} ➔ ${adj.replaced_subject}`}
                            </div>
                            <div className={`text-xs mt-1 font-semibold ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                              Date: {new Date(adj.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>
                            {adj.slot && (
                              <div className="text-[10px] text-zinc-400 font-semibold mt-0.5">
                                Scheduled slot: {adj.slot.start_time} - {adj.slot.end_time}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteAdjustment(adj.id)}
                          className={`p-2.5 rounded-xl transition-all ${
                            darkMode ? 'text-red-400 hover:bg-red-950/40' : 'text-red-500 hover:bg-red-50'
                          }`}
                          title="Revert Adjustment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeAdminTab === 'analytics' && (
          <>
            {/* Class Selector Dropdown */}
            <div className={`lg:col-span-4 space-y-6 ${analyticsSubTab !== 'summary' ? 'hidden lg:block' : ''}`}>
              <div className={`rounded-card p-6 border transition-all duration-300 ${
                darkMode ? 'bg-[#121212] border border-brand-emerald/20 text-white' : 'bg-white text-zinc-800 shadow-card border border-zinc-100'
              }`}>
                <h3 className={`text-lg font-bold flex items-center gap-2 mb-4 ${darkMode ? 'text-white' : 'text-zinc-950'}`}>
                  <BarChart3 className="w-5 h-5 text-brand-emerald" />
                  Select Stream
                </h3>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1.5">Stream Division</label>
                  {classes.length === 0 ? (
                    <div className="text-sm text-zinc-400">No classes configured.</div>
                  ) : (
                    <select
                      value={analyticsClassId}
                      onChange={(e) => setAnalyticsClassId(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-emerald/10 focus:border-brand-emerald transition-all ${
                        darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                      }`}
                    >
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.stream} - Div {c.division} ({c.class_code})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Roster Analytics Content */}
            <div className="lg:col-span-8 space-y-6">
              {analyticsLoading ? (
                <div className={`rounded-card p-12 text-center border ${
                  darkMode ? 'bg-[#121212] border-brand-emerald/20 text-zinc-400' : 'bg-white text-zinc-500 border-zinc-100 shadow-card'
                }`}>
                  <div className="animate-pulse font-extrabold text-sm">Aggregating attendance calculations from Neon database...</div>
                </div>
              ) : !analyticsData ? (
                <div className={`rounded-card p-12 text-center border ${
                  darkMode ? 'bg-[#121212] border-brand-emerald/20 text-zinc-400' : 'bg-white text-zinc-500 border-zinc-100 shadow-card'
                }`}>
                  Select a class to view analytics.
                </div>
              ) : (
                <>
                  {/* Summary Metric Cards */}
                  <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 ${analyticsSubTab !== 'summary' ? 'hidden sm:grid' : ''}`}>
                    <div className={`rounded-card p-5 border transition-all ${
                      darkMode ? 'bg-[#121212] border-brand-emerald/20 text-white' : 'bg-white border-zinc-100 shadow-card text-zinc-800'
                    }`}>
                      <div className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider">Class Average</div>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-3xl font-black text-brand-emerald">{analyticsData.class_avg}%</span>
                      </div>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div 
                          className="bg-brand-emerald h-full rounded-full transition-all duration-500" 
                          style={{ width: `${analyticsData.class_avg}%` }}
                        />
                      </div>
                    </div>

                    <div className={`rounded-card p-5 border transition-all ${
                      darkMode ? 'bg-[#121212] border-brand-emerald/20 text-white' : 'bg-white border-zinc-100 shadow-card text-zinc-800'
                    }`}>
                      <div className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider">Total Enrolled</div>
                      <div className="text-3xl font-black text-brand-emerald mt-1">{analyticsData.total_students}</div>
                      <div className="text-xs text-zinc-400 font-semibold mt-2.5">Registered student profiles</div>
                    </div>

                    <div className={`rounded-card p-5 border transition-all ${
                      analyticsData.at_risk.length > 0
                        ? darkMode ? 'bg-red-950/20 border-red-500/20 text-white' : 'bg-red-50 border-red-100 text-zinc-800'
                        : darkMode ? 'bg-[#121212] border-brand-emerald/20 text-white' : 'bg-white border-zinc-100 shadow-card text-zinc-800'
                    }`}>
                      <div className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider">At Risk (&lt;75%)</div>
                      <div className={`text-3xl font-black mt-1 ${analyticsData.at_risk.length > 0 ? 'text-red-500' : 'text-brand-emerald'}`}>
                        {analyticsData.at_risk.length}
                      </div>
                      <div className="text-xs text-zinc-400 font-semibold mt-2.5">Students below attendance bar</div>
                    </div>
                  </div>

                  {/* Low Attendance Alerts / At-Risk */}
                  <div className={`rounded-card p-6 border transition-all ${
                    darkMode ? 'bg-[#121212] border-brand-emerald/20 text-white' : 'bg-white border-zinc-100 shadow-card text-zinc-800'
                  } ${analyticsSubTab !== 'summary' ? 'hidden lg:block' : ''}`}>
                    <h3 className="text-base font-extrabold flex items-center gap-2 mb-4">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      Attendance Alerts (Below 75%)
                    </h3>
                    
                    {analyticsData.at_risk.length === 0 ? (
                      <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                        darkMode ? 'bg-brand-emerald/10 border-brand-emerald/20 text-brand-emerald' : 'bg-emerald-50 border-emerald-100 text-emerald-800'
                      }`}>
                        <Check className="w-5 h-5 flex-shrink-0" />
                        <span className="text-xs font-bold">Class health is optimal! Every student attendance average is currently above the 75% bar.</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:max-h-[220px] lg:overflow-y-auto pr-1 no-scrollbar">
                        {analyticsData.at_risk.map(s => (
                          <div 
                            key={s.id} 
                            className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                              darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                            }`}
                          >
                            <div>
                              <div className="font-extrabold text-sm">{s.name}</div>
                              <div className={`text-[10px] font-semibold mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                Batch: {s.batch || 'N/A'} | {s.email}
                              </div>
                            </div>
                            <span className="text-xs font-black text-red-500 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                              {s.pct}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Subject Breakdown */}
                  <div className={`rounded-card p-6 border transition-all ${
                    darkMode ? 'bg-[#121212] border-brand-emerald/20 text-white' : 'bg-white border-zinc-100 shadow-card text-zinc-800'
                  } ${analyticsSubTab !== 'subjects' ? 'hidden lg:block' : ''}`}>
                    <h3 className="text-base font-extrabold flex items-center gap-2 mb-4">
                      <ClipboardList className="w-5 h-5 text-brand-emerald" />
                      Subject Average Attendance
                    </h3>
                    
                    {analyticsData.subjects_stats.length === 0 ? (
                      <div className="text-sm text-zinc-400 py-4 text-center">No timetable slots or conducted lecture logs found.</div>
                    ) : (
                      <div className="space-y-4">
                        {analyticsData.subjects_stats.map((subj, index) => {
                          const isGreen = subj.pct >= 75.0;
                          const isRed = subj.pct < 60.0;
                          const colorClass = isGreen ? 'bg-brand-emerald' : isRed ? 'bg-red-500' : 'bg-amber-500';
                          const textColorClass = isGreen ? 'text-brand-emerald' : isRed ? 'text-red-500' : 'text-amber-500';
                          return (
                            <div key={index} className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span>{subj.name}</span>
                                <span className={textColorClass}>{subj.pct}% <span className="text-zinc-400">({subj.attended}/{subj.conducted})</span></span>
                              </div>
                              <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                                  style={{ width: `${subj.pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Comprehensive Standings Table */}
                  <div className={`rounded-card p-6 border transition-all ${
                    darkMode ? 'bg-[#121212] border-brand-emerald/20 text-white' : 'bg-white border-zinc-100 shadow-card text-zinc-800'
                  } ${analyticsSubTab !== 'standings' ? 'hidden lg:block' : ''}`}>
                    <h3 className="text-base font-extrabold flex items-center gap-2 mb-4">
                      <Users className="w-5 h-5 text-brand-emerald" />
                      Complete Student Standings
                    </h3>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead>
                          <tr className={`border-b ${darkMode ? 'border-zinc-800 text-zinc-400' : 'border-zinc-100 text-zinc-500'} font-bold`}>
                            <th className="pb-3">Name</th>
                            <th className="pb-3 hidden sm:table-cell">Email</th>
                            <th className="pb-3">Batch</th>
                            <th className="pb-3">Attended</th>
                            <th className="pb-3 text-right">Percentage</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analyticsData.student_stats.map(s => {
                            const isHigh = s.pct >= 75.0;
                            const badgeColor = isHigh 
                              ? 'bg-emerald-500/10 text-brand-emerald border-brand-emerald/20' 
                              : 'bg-red-500/10 text-red-500 border-red-500/20';
                            return (
                              <tr key={s.id} className={`border-b ${darkMode ? 'border-zinc-800/50 hover:bg-zinc-900/30' : 'border-zinc-100/80 hover:bg-zinc-50/50'} transition-all`}>
                                <td className="py-3.5 font-bold">{s.name}</td>
                                <td className={`py-3.5 hidden sm:table-cell ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>{s.email}</td>
                                <td className="py-3.5 font-bold">
                                  {s.batch ? (
                                    <span className={`text-[10px] px-2 py-0.5 border rounded-md ${
                                      darkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-zinc-100 border-zinc-200 text-zinc-600'
                                    }`}>{s.batch}</span>
                                  ) : 'N/A'}
                                </td>
                                <td className="py-3.5 font-semibold text-zinc-400">{s.attended} / {s.conducted}</td>
                                <td className="py-3.5 text-right font-black">
                                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${badgeColor} uppercase tracking-wide`}>
                                    {s.pct}%
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </main>

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

      <Toast {...toast} onClose={() => setToast({ message: '', type: 'info' })} />
    </div>
  );
};

export default AdminDashboard;
