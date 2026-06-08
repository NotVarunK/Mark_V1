const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

async function main() {
  console.log('Seeding timetable slots...');
  
  // Get all classes in database
  const classes = await prisma.class.findMany();
  
  if (classes.length === 0) {
    console.log('No classes found in the database. Please create a class first (or sign up as admin and add one).');
    return;
  }
  
  for (const cls of classes) {
    console.log(`Updating timetable for class: ${cls.stream} (${cls.class_code})`);
    
    // Clear old slots
    await prisma.timetableSlot.deleteMany({
      where: { class_id: cls.id }
    });
    
    // Insert new slots
    await prisma.timetableSlot.createMany({
      data: sampleSlots.map(slot => ({
        class_id: cls.id,
        day_of_week: slot.day_of_week,
        subject_name: slot.subject_name,
        start_time: slot.start_time,
        end_time: slot.end_time
      }))
    });
    
    console.log(`Successfully seeded ${sampleSlots.length} slots for class: ${cls.class_code}`);
  }
}

main()
  .catch(e => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
