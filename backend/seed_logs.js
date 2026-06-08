const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding attendance logs...');
  const student = await prisma.user.findFirst({
    where: { role: 'STUDENT' }
  });
  if (!student) {
    console.log('No student found. Please register a student first.');
    return;
  }
  
  const classId = student.class_id;
  if (!classId) {
    console.log('Student is not enrolled in a class.');
    return;
  }

  const slots = await prisma.timetableSlot.findMany({
    where: { class_id: classId }
  });

  if (slots.length === 0) {
    console.log('No timetable slots found for the class.');
    return;
  }

  // Clear previous logs
  await prisma.attendanceLog.deleteMany({
    where: { student_id: student.id }
  });

  const TERM_START_DATE = new Date('2026-03-01');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const logsToCreate = [];

  let current = new Date(TERM_START_DATE);
  while (current <= today) {
    const dayOfWeek = dayNames[current.getDay()];
    // Get slots for this day of week
    const daySlots = slots.filter(s => s.day_of_week === dayOfWeek);

    for (const slot of daySlots) {
      // Check time bounds if it's today
      if (current.getTime() === today.getTime()) {
        const now = new Date();
        const currentMins = now.getHours() * 60 + now.getMinutes();
        const [endH, endM] = slot.end_time.split(':').map(Number);
        const endMins = endH * 60 + endM;
        if (currentMins < endMins) {
          // Slot hasn't ended or happened yet today
          continue;
        }
      }

      // Simulate ~80% attendance probability
      const attended = Math.random() < 0.80;
      if (attended) {
        logsToCreate.push({
          student_id: student.id,
          slot_id: slot.id,
          date: new Date(current),
          status: 'PRESENT'
        });
      }
    }

    // Next day
    current.setDate(current.getDate() + 1);
  }

  console.log(`Creating ${logsToCreate.length} attendance logs...`);
  await prisma.attendanceLog.createMany({
    data: logsToCreate
  });

  console.log('Successfully seeded attendance logs!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
