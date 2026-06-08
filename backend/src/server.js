require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { connectDb } = require('./db');
const { initCron } = require('./cron');

const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');
const attendanceRouter = require('./routes/attendance');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration - allow credential sharing for cookies
app.use(cors({
  origin: 'http://localhost:5173', // Vite default port
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
// Enable signed cookies using the JWT secret as cookie secret
app.use(cookieParser(process.env.JWT_SECRET));

// Register API Routes
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api', attendanceRouter); // Handles /api/student/join, /api/attendance/checkin, and /api/attendance/dashboard

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', time: new Date() });
});

// Database Error Handling Middleware (Quality Gateway)
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);

  // Handle Prisma Known Request Errors
  if (err.code) {
    switch (err.code) {
      case 'P2002': // Unique constraint violation
        return res.status(409).json({ 
          error: 'Database conflict: A record with this unique attribute already exists.' 
        });
      case 'P2003': // Foreign key constraint violation
        return res.status(400).json({ 
          error: 'Database reference error: Specified relationship resource does not exist.' 
        });
      case 'P2025': // Record to update/delete not found
        return res.status(404).json({ 
          error: 'Database error: Requested record not found.' 
        });
      default:
        return res.status(400).json({ 
          error: `Database operational error: ${err.message || 'Operation failed'}` 
        });
    }
  }

  // Handle default syntax or standard server errors
  const status = err.status || 500;
  const message = err.message || 'An unexpected server error occurred.';
  res.status(status).json({ error: message });
});

// Start Server
async function startServer() {
  // 1. Verify DB Connection
  await connectDb();

  // 2. Start Cron Jobs
  initCron();

  // 3. Listen on Port
  app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`  CheckIn Backend Server Running on:     `);
    console.log(`  http://localhost:${PORT}               `);
    console.log(`=========================================`);
  });
}

startServer();
