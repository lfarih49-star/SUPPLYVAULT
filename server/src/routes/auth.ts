import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db';
import { signToken, authenticate, authorizeRoles } from '../middleware/auth';
import { logAudit } from '../utils/audit';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const userRes = await query(
      `SELECT id, username, email, password_hash, full_name, role, phone, avatar_url, created_at FROM sv_users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1) LIMIT 1;`,
      [username.trim()]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials. User not found.' });
    }

    const user = userRes.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials. Incorrect password.' });
    }

    const authPayload = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
    };

    const token = signToken(authPayload);

    await logAudit(authPayload, 'LOGIN', 'USER', user.id, `User logged in from role portal: ${user.role}`, req.ip);

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        phone: user.phone,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
      },
    });
  } catch (err: any) {
    console.error('[AUTH_LOGIN_ERROR]', err);
    return res.status(500).json({ error: 'Authentication failed: ' + err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const userRes = await query(
      `SELECT id, username, email, full_name, role, phone, avatar_url, created_at FROM sv_users WHERE id = $1;`,
      [req.user!.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    const u = userRes.rows[0];
    return res.json({
      id: u.id,
      username: u.username,
      email: u.email,
      fullName: u.full_name,
      role: u.role,
      phone: u.phone,
      avatarUrl: u.avatar_url,
      createdAt: u.created_at,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/delivery-agents (for Manager/Staff to assign shipments)
router.get('/delivery-agents', authenticate, authorizeRoles('MANAGER', 'STAFF'), async (_req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT id, full_name, username, phone, email FROM sv_users WHERE role = 'DELIVERY_AGENT' ORDER BY full_name ASC;`
    );
    return res.json(result.rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/users (Manager only)
router.get('/users', authenticate, authorizeRoles('MANAGER'), async (_req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT id, username, email, full_name, role, phone, created_at FROM sv_users ORDER BY role, full_name;`
    );
    return res.json(result.rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;

