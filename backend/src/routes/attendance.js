const express = require('express');
const router = express.Router();
const { prisma } = require('../db');
const { authenticateJWT, requireRole } = require('../middleware/auth');

// Campus coordinate configuration
const CAMPUS_LAT = 18.5204;
const CAMPUS_LNG = 73.8567;
const MAX_DISTANCE_METERS = 100;

// Academic term start for calculating slot occurrences (conducted classes)
const TERM_START_DATE = new Date('2026-03-01');

// Helper: Haversine distance formula
function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // distance in meters
}

// Helper: Count number of times a day of the week occurred between two dates
function countDaysBetween(startDate, endDate, targetDayName) {
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
}

// POST /api/student/join - Enrolls a student in a class using class_code
router.post('/student/join', authenticateJWT, requireRole('STUDENT'), async (req, res) => {
  try {
    const { class_code } = req.body;

    if (!class_code) {
      return res.status(400).json({ error: 'Class code is required.' });
    }

    const targetClass = await prisma.class.findUnique({
      where: { class_code: class_code.toUpperCase() }
    });

    if (!targetClass) {
      return res.status(404).json({ error: 'Join failed: Class code not found.' });
    }

    // Join the class
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { class_id: targetClass.id },
      include: { class: true }
    });

    res.json({
      message: 'Successfully joined class.',
      class: updatedUser.class
    });
  } catch (error) {
    console.error('Join class error:', error);
    res.status(500).json({ error: 'Internal server error joining class.' });
  }
});

// POST /api/attendance/checkin - Student check-in with location verification
router.post('/attendance/checkin', authenticateJWT, requireRole('STUDENT'), async (req, res) => {
  try {
    const { slotId, lat, lng } = req.body;

    if (!slotId) {
      return res.status(400).json({ error: 'Slot ID is required.' });
    }

    if (!req.user.class_id) {
      return res.status(400).json({ error: 'Check-in failed: You must join a class first.' });
    }

    // 1. Fetch timetable slot
    const slot = await prisma.timetableSlot.findUnique({
      where: { id: slotId }
    });

    if (!slot) {
      return res.status(404).json({ error: 'Timetable slot not found.' });
    }

    // Verify slot belongs to student's class
    if (slot.class_id !== req.user.class_id) {
      return res.status(400).json({ error: 'Check-in failed: Slot does not belong to your class.' });
    }

    // 2. Set up dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Verify no duplicate log today
    const existingLog = await prisma.attendanceLog.findFirst({
      where: {
        student_id: req.user.id,
        slot_id: slotId,
        date: today
      }
    });

    if (existingLog) {
      return res.status(409).json({ error: 'Already checked in for this slot.' });
    }

    // 3. Location Verification (Haversine distance)
    const disableGeofence = process.env.DISABLE_GEOFENCE === 'true';
    if (!disableGeofence) {
      if (lat === undefined || lng === undefined) {
        return res.status(400).json({ error: 'Location coordinates (lat, lng) are required.' });
      }

      const distance = getHaversineDistance(lat, lng, CAMPUS_LAT, CAMPUS_LNG);
      if (distance > MAX_DISTANCE_METERS) {
        return res.status(403).json({
          error: `Check-in failed: You must be physically present on campus. Current distance: ${Math.round(distance)}m`
        });
      }
    }

    // 4. Create Attendance Log
    const log = await prisma.attendanceLog.create({
      data: {
        student_id: req.user.id,
        slot_id: slotId,
        date: today,
        status: 'PRESENT'
      }
    });

    res.status(201).json({
      message: 'Check-in successful.',
      log
    });
  } catch (error) {
    if (error.code === 'P2002') {
      // Prisma duplicate key code
      return res.status(409).json({ error: 'Already checked in for this slot.' });
    }
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Internal server error during check-in.' });
  }
});

// GET /api/attendance/dashboard - Combined student & class health dashboard
router.get('/attendance/dashboard', authenticateJWT, async (req, res) => {
  try {
    const classId = req.user.class_id;

    if (!classId) {
      return res.json({
        overall: { attended: 0, conducted: 0, pct: 0.0 },
        subjects: [],
        leaderboard: [],
        classInsights: {
          avgClassPct: 0.0,
          bestSubject: 'N/A',
          worstSubject: 'N/A'
        }
      });
    }

    const today = new Date();

    // Fetch all timetable slots and student logs
    const timetable = await prisma.timetableSlot.findMany({
      where: { class_id: classId }
    });

    const studentLogs = await prisma.attendanceLog.findMany({
      where: {
        student_id: req.user.id,
        status: 'PRESENT'
      }
    });

    // 1. Calculate stats per slot and subject
    const subjectMap = {};
    let totalConducted = 0;

    timetable.forEach(slot => {
      const conducted = countDaysBetween(TERM_START_DATE, today, slot.day_of_week);
      
      if (!subjectMap[slot.subject_name]) {
        subjectMap[slot.subject_name] = { attended: 0, conducted: 0 };
      }
      subjectMap[slot.subject_name].conducted += conducted;
      totalConducted += conducted;
    });

    studentLogs.forEach(log => {
      const slot = timetable.find(s => s.id === log.slot_id);
      if (slot && subjectMap[slot.subject_name]) {
        subjectMap[slot.subject_name].attended += 1;
      }
    });

    // Make sure conducted counts are at least equal to attended (failsafe for local dev edge cases)
    Object.keys(subjectMap).forEach(subj => {
      if (subjectMap[subj].conducted < subjectMap[subj].attended) {
        subjectMap[subj].conducted = subjectMap[subj].attended;
      }
    });

    const totalAttended = studentLogs.length;
    const overallPct = totalConducted > 0 ? (totalAttended / totalConducted) * 100 : 0.0;

    const subjects = Object.keys(subjectMap).map(name => {
      const { attended, conducted } = subjectMap[name];
      return {
        name,
        attended,
        conducted,
        pct: conducted > 0 ? parseFloat(((attended / conducted) * 100).toFixed(1)) : 0.0
      };
    });

    // 2. Fetch all students in the class to compute Leaderboard and Class Health
    const students = await prisma.user.findMany({
      where: { class_id: classId, role: 'STUDENT' },
      include: { attendance: { where: { status: 'PRESENT' } } }
    });

    // Calculate details for each student
    const leaderboardList = students.map(student => {
      const attended = student.attendance.length;
      const pct = totalConducted > 0 ? parseFloat(((attended / totalConducted) * 100).toFixed(1)) : 0.0;
      return {
        studentId: student.id,
        name: student.name,
        pct
      };
    });

    // Sort by pct descending
    leaderboardList.sort((a, b) => b.pct - a.pct);

    // 3. Class Insights: overall class average, best subject, worst subject
    const avgClassPct = leaderboardList.length > 0
      ? parseFloat((leaderboardList.reduce((acc, curr) => acc + curr.pct, 0) / leaderboardList.length).toFixed(1))
      : 0.0;

    // Subject performance class-wide
    const subjectClassMap = {};
    timetable.forEach(slot => {
      if (!subjectClassMap[slot.subject_name]) {
        subjectClassMap[slot.subject_name] = { attended: 0, conducted: 0 };
      }
      // Total conducted class-wide = conducted occurrences * total student count
      subjectClassMap[slot.subject_name].conducted += countDaysBetween(TERM_START_DATE, today, slot.day_of_week) * students.length;
    });

    // Gather all logs for all students in this class
    const allClassLogs = await prisma.attendanceLog.findMany({
      where: {
        student: { class_id: classId },
        status: 'PRESENT'
      },
      include: { slot: true }
    });

    allClassLogs.forEach(log => {
      if (log.slot && subjectClassMap[log.slot.subject_name]) {
        subjectClassMap[log.slot.subject_name].attended += 1;
      }
    });

    let bestSubject = 'N/A';
    let worstSubject = 'N/A';
    let maxSubjPct = -1;
    let minSubjPct = 101;

    Object.keys(subjectClassMap).forEach(subj => {
      const { attended, conducted } = subjectClassMap[subj];
      if (conducted > 0) {
        const pct = (attended / conducted) * 100;
        if (pct > maxSubjPct) {
          maxSubjPct = pct;
          bestSubject = subj;
        }
        if (pct < minSubjPct) {
          minSubjPct = pct;
          worstSubject = subj;
        }
      }
    });

    res.json({
      overall: {
        attended: totalAttended,
        conducted: totalConducted,
        pct: parseFloat(overallPct.toFixed(1))
      },
      subjects,
      leaderboard: leaderboardList,
      classInsights: {
        avgClassPct,
        bestSubject,
        worstSubject
      },
      logs: studentLogs
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Internal server error fetching dashboard.' });
  }
});

module.exports = router;
