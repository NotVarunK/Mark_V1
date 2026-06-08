const cron = require('node-cron');
const { prisma } = require('./db');

function initCron() {
  // Run every hour on the hour: '0 * * * *'
  // For easy local testing, you can also support matching when run.
  cron.schedule('0 * * * *', async () => {
    console.log('[CRON] Running hourly attendance check-in reminders...');
    await runCronNudges();
  });

  console.log('[CRON] Attendance reminder cron job scheduled (every hour).');
}

async function runCronNudges() {
  try {
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = days[now.getDay()]; // e.g. "Monday"

    if (currentDay === 'Sunday') {
      // No classes scheduled on Sunday
      return;
    }

    const nowHours = now.getHours();
    const nowMinutes = now.getMinutes();
    const nowTotalMinutes = nowHours * 60 + nowMinutes;

    // Fetch all slots scheduled for today
    const slots = await prisma.timetableSlot.findMany({
      where: { day_of_week: currentDay },
      include: {
        class: {
          include: {
            students: {
              where: { role: 'STUDENT' }
            }
          }
        }
      }
    });

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    for (const slot of slots) {
      // Parse slot end time "HH:MM"
      const [endHour, endMin] = slot.end_time.split(':').map(Number);
      const slotEndTotalMinutes = endHour * 60 + endMin;

      // Check if slot ended in the last 15 minutes:
      // slotEndTotalMinutes must be <= nowTotalMinutes and >= nowTotalMinutes - 15
      const timeDiff = nowTotalMinutes - slotEndTotalMinutes;
      if (timeDiff >= 0 && timeDiff <= 15) {
        console.log(`[CRON] Found slot ${slot.subject_name} (${slot.start_time} - ${slot.end_time}) which ended ${timeDiff} mins ago.`);

        // Fetch students who did log attendance today for this slot
        const attendanceLogs = await prisma.attendanceLog.findMany({
          where: {
            slot_id: slot.id,
            date: todayDate,
            status: 'PRESENT'
          }
        });

        const attendedStudentIds = new Set(attendanceLogs.map(log => log.student_id));
        const studentsInClass = slot.class.students;

        // Find students who missed check-in
        const missingStudents = studentsInClass.filter(student => !attendedStudentIds.has(student.id));

        missingStudents.forEach(student => {
          console.log(`[CRON NOTIFICATION] Send nudge to ${student.name}: Forgot to mark attendance for ${slot.subject_name}?`);
        });
      }
    }
  } catch (error) {
    console.error('[CRON ERROR] Failed to run attendance reminders:', error);
  }
}

module.exports = { initCron, runCronNudges };
