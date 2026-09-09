import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import env from '../config/environment.js';

export class AuthController {
  async register(req, res, next) {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email and password are required' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }

      const [existing] = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email.toLowerCase()]);
      if (existing.length > 0) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const [result] = await query(
        `INSERT INTO users (name, email, password_hash, role, is_active)
         VALUES (?, ?, ?, 'USER', TRUE)`,
        [name.trim(), email.toLowerCase().trim(), passwordHash]
      );

      const userId = result.insertId;
      const token = jwt.sign({ userId, role: 'USER' }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });

      res.status(201).json({
        success: true,
        message: 'Account registered successfully',
        token,
        user: {
          id: userId,
          name: name.trim(),
          email: email.toLowerCase().trim(),
          role: 'USER',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const [users] = await query(
        'SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = ? LIMIT 1',
        [email.toLowerCase().trim()]
      );

      if (users.length === 0) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const user = users[0];
      if (!user.is_active) {
        return res.status(403).json({ error: 'Account is deactivated. Please contact support.' });
      }

      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = jwt.sign({ userId: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async me(req, res) {
    res.json({
      success: true,
      user: req.user,
    });
  }

  async logout(req, res) {
    res.json({ success: true, message: 'Logged out successfully' });
  }
}

const authController = new AuthController();
export default authController;
export { authController };
