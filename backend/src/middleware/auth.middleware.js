import jwt from 'jsonwebtoken';
import env from '../config/environment.js';
import { query } from '../config/database.js';

export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication token required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET);

    const [users] = await query(
      'SELECT id, name, email, role, is_active FROM users WHERE id = ? LIMIT 1',
      [decoded.userId]
    );

    if (users.length === 0 || !users[0].is_active) {
      return res.status(401).json({ error: 'Invalid token or inactive account' });
    }

    req.user = users[0];
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }
}

export default authMiddleware;
