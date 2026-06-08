const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { prisma } = require('../db');
const { authenticateJWT } = require('../middleware/auth');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


// Academic Email regex validation: must end in .edu or .edu.in
const ACADEMIC_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.edu(\.in)?$/i;

// Sign Up
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields (name, email, password) are required.' });
    }

    // Email Domain Validation
    if (!ACADEMIC_EMAIL_REGEX.test(email)) {
      return res.status(400).json({ 
        error: 'Registration failed: You must use an academic email domain ending in .edu or .edu.in' 
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      return res.status(409).json({ error: 'Registration failed: Email already in use.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create User
    const newUser = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        role: 'STUDENT'
      }
    });

    res.status(201).json({
      message: 'Registration successful.',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({ 
      where: { email: email.toLowerCase() },
      include: { class: true }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Issue JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Attach signed cookie (Express cookie-parser configures signing via secret)
    res.cookie('token', token, {
      httpOnly: true,
      signed: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.json({
      message: 'Login successful.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        class_id: user.class_id,
        class: user.class
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    signed: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  res.json({ message: 'Logged out successfully.' });
});

// Get current session
router.get('/me', authenticateJWT, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      class_id: req.user.class_id,
      class: req.user.class
    }
  });
});

// Google OAuth Sign In
router.post('/google', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Google ID token is required.' });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, name } = payload;

    if (!email) {
      return res.status(400).json({ error: 'Google account has no associated email.' });
    }

    // Verify domain: must end strictly with @despu.edu.in
    if (!email.toLowerCase().endsWith('@despu.edu.in')) {
      return res.status(403).json({ error: 'Access denied: Only @despu.edu.in email addresses are permitted.' });
    }

    // Find or create student
    let user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { class: true }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: name || 'Google Student',
          email: email.toLowerCase(),
          password_hash: 'OAUTH_USER', // Placeholder for OAuth user
          role: 'STUDENT',
          class_id: null
        },
        include: { class: true }
      });
    }

    // Issue JWT
    const jwtToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Attach signed cookie
    res.cookie('token', jwtToken, {
      httpOnly: true,
      signed: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.json({
      message: 'Login successful.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        class_id: user.class_id,
        class: user.class
      }
    });
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(401).json({ error: 'Authentication failed. Invalid Google token.' });
  }
});

module.exports = router;

