const express = require('express');
const router = express.Router();
const { prisma } = require('../db');
const { authenticateJWT, authorizeRole } = require('../middleware/auth');

// Protect all admin routes with JWT and Admin role guard
router.use(authenticateJWT, authorizeRole(['ADMIN']));

// Generate a random 6-character alphanumeric code
function generateClassCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// GET /api/admin/classes - Returns all classes with timetables, nested student list and student count
router.get('/classes', async (req, res) => {
  try {
    const classes = await prisma.class.findMany({
      include: {
        timetable: true,
        students: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        _count: { select: { students: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(classes);
  } catch (error) {
    console.error('List classes error:', error);
    res.status(500).json({ error: 'Failed to retrieve classes.' });
  }
});

// POST /api/admin/classes - Creates a class and generates a unique class_code
router.post('/classes', async (req, res) => {
  try {
    const { stream, academic_year, division } = req.body;

    if (!stream || !academic_year || !division) {
      return res.status(400).json({ error: 'Missing required fields: stream, academic_year, division.' });
    }

    // Auto-generate code with collision retry
    let classCode = '';
    let isUnique = false;
    let retries = 0;
    const maxRetries = 10;

    while (!isUnique && retries < maxRetries) {
      classCode = generateClassCode();
      const existing = await prisma.class.findUnique({ where: { class_code: classCode } });
      if (!existing) {
        isUnique = true;
      } else {
        retries++;
      }
    }

    if (!isUnique) {
      return res.status(500).json({ error: 'Failed to generate a unique class code. Please try again.' });
    }

    const newClass = await prisma.class.create({
      data: {
        class_code: classCode,
        stream,
        academic_year,
        division
      }
    });

    res.status(201).json(newClass);
  } catch (error) {
    console.error('Create class error:', error);
    res.status(500).json({ error: 'Internal server error creating class.' });
  }
});

// POST /api/admin/timetable/:classId - Accepts array of slot objects and batch upserts them
router.post('/timetable/:classId', async (req, res) => {
  const { classId } = req.params;
  const { slots } = req.body; // Array of { day_of_week, subject_name, start_time, end_time }

  if (!Array.isArray(slots)) {
    return res.status(400).json({ error: 'Payload must contain a slots array.' });
  }

  try {
    // Check if class exists
    const classExists = await prisma.class.findUnique({ where: { id: classId } });
    if (!classExists) {
      return res.status(404).json({ error: 'Class not found.' });
    }

    // Validate slots
    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const timeRegex = /^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/; // HH:MM

    for (const slot of slots) {
      if (!slot.day_of_week || !slot.subject_name || !slot.start_time || !slot.end_time) {
        return res.status(400).json({ error: 'Each slot must have: day_of_week, subject_name, start_time, end_time.' });
      }
      if (!validDays.includes(slot.day_of_week)) {
        return res.status(400).json({ error: `Invalid day of week. Must be one of: ${validDays.join(', ')}.` });
      }
      if (!timeRegex.test(slot.start_time) || !timeRegex.test(slot.end_time)) {
        return res.status(400).json({ error: 'Times must be in valid HH:MM format.' });
      }
    }

    // Reset and rebuild the timetable for this class in a database transaction
    await prisma.$transaction(async (tx) => {
      // Delete existing slots
      await tx.timetableSlot.deleteMany({ where: { class_id: classId } });

      // Create new slots
      if (slots.length > 0) {
        await tx.timetableSlot.createMany({
          data: slots.map(slot => ({
            class_id: classId,
            day_of_week: slot.day_of_week,
            subject_name: slot.subject_name,
            start_time: slot.start_time,
            end_time: slot.end_time
          }))
        });
      }
    });

    // Fetch updated slots to return
    const updatedSlots = await prisma.timetableSlot.findMany({
      where: { class_id: classId },
      orderBy: [
        { day_of_week: 'asc' },
        { start_time: 'asc' }
      ]
    });

    res.json({ message: 'Timetable updated successfully.', slots: updatedSlots });
  } catch (error) {
    console.error('Timetable sync error:', error);
    res.status(500).json({ error: 'Failed to update timetable.' });
  }
});

// PUT /api/admin/classes/:id - Edit class details
router.put('/classes/:id', async (req, res) => {
  const { id } = req.params;
  const { stream, academic_year, division } = req.body;

  if (!stream || !academic_year || !division) {
    return res.status(400).json({ error: 'Missing required fields: stream, academic_year, division.' });
  }

  try {
    const updatedClass = await prisma.class.update({
      where: { id },
      data: {
        stream,
        academic_year: String(academic_year),
        division
      },
      include: {
        timetable: true,
        students: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        _count: { select: { students: true } }
      }
    });

    res.json(updatedClass);
  } catch (error) {
    console.error('Update class error:', error);
    res.status(500).json({ error: 'Failed to update class details.' });
  }
});

// DELETE /api/admin/classes/:classId/students/:studentId - Remove student from class
router.delete('/classes/:classId/students/:studentId', async (req, res) => {
  const { classId, studentId } = req.params;

  try {
    // Verify student exists and belongs to the specified class
    const student = await prisma.user.findFirst({
      where: { id: studentId, class_id: classId }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found in this class.' });
    }

    // Disassociate the student by setting class_id to null
    await prisma.user.update({
      where: { id: studentId },
      data: { class_id: null }
    });

    res.json({ message: 'Student removed from class successfully.' });
  } catch (error) {
    console.error('Remove student error:', error);
    res.status(500).json({ error: 'Failed to remove student from class.' });
  }
});

module.exports = router;

