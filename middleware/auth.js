const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'inkwell_dev_secret_change_me';

function auth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ error: 'No token provided' });
  const token = header.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Optional auth - doesn't fail if no token, but populates req.user if valid
function optionalAuth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) return next();
  const token = header.split(' ')[1];
  if (!token) return next();
  try {
    req.user = jwt.verify(token, SECRET);
  } catch (e) {
    // ignore invalid token for optional auth
  }
  next();
}

module.exports = { auth, optionalAuth, SECRET };
