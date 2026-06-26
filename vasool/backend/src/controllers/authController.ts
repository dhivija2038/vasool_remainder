import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPool } from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';

export async function login(req: Request, res: Response) {
  // Accept either `email` (preferred) or legacy `username` field from the client.
  const email: string | undefined = req.body.email || req.body.username;
  const { password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const pool = getPool();
    const [users] = await pool.query<any[]>('SELECT * FROM users WHERE username = ?', [email.trim().toLowerCase()]);

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const secret = process.env.JWT_SECRET || 'vasool_shop_owner_secret_jwt_key_2026_safe';
    const token = jwt.sign(
      { id: user.id, username: user.username, owner_name: user.owner_name },
      secret,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        owner_name: user.owner_name,
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

export async function getMe(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  res.json({ user: req.user });
}

/**
 * Verifies a plain-text password against the currently logged-in user's
 * stored password hash. Used to confirm sensitive/destructive actions
 * (e.g. bulk data deletion) before they are executed.
 */
export async function verifyCurrentUserPassword(username: string, password: string): Promise<boolean> {
  if (!username || !password) return false;

  const pool = getPool();
  const [users] = await pool.query<any[]>('SELECT * FROM users WHERE username = ?', [username]);
  if (users.length === 0) return false;

  return bcrypt.compare(password, users[0].password_hash);
}
