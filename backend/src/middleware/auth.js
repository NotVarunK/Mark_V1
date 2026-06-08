const jwt = require('jsonwebtoken');
const { prisma } = require('../db');

async function authenticateJWT(req, res, next) {
  let token = null;

  // Check signed cookies first
  if (req.signedCookies && req.signedCookies.token) {
    token = req.signedCookies.token;
  } 
  // Fallback to unsigned cookies
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } 
  // Fallback to Authorization header
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Access denied: No session token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        class: {
          include: {
            timetable: true
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Access denied: User session invalid' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('JWT validation failed:', error.message);
    return res.status(401).json({ error: 'Session expired or invalid token' });
  }
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access denied: Action requires one of [${allowedRoles.join(', ')}] roles` 
      });
    }
    
    next();
  };
}

function authorizeRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!rolesArray.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. Administrative privileges required.' 
      });
    }
    
    next();
  };
}

module.exports = { authenticateJWT, requireRole, authorizeRole };
