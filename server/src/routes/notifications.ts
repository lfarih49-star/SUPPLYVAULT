import { Router, Request, Response } from 'express';
import { query } from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/notifications
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const result = await query(`
      SELECT 
        id, user_id as "userId", target_role as "targetRole",
        title, message, type, read, reference_url as "referenceUrl",
        created_at as "createdAt"
      FROM sv_notifications
      WHERE (user_id = $1 OR target_role = $2 OR target_role = 'ALL' OR target_role IS NULL)
      ORDER BY created_at DESC
      LIMIT 50;
    `, [user.id, user.role]);

    return res.json(result.rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const result = await query(`
      SELECT COUNT(id)::int as "unreadCount"
      FROM sv_notifications
      WHERE read = FALSE
        AND (user_id = $1 OR target_role = $2 OR target_role = 'ALL' OR target_role IS NULL);
    `, [user.id, user.role]);

    return res.json({ unreadCount: result.rows[0].unreadCount });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications/:id/read
router.post('/:id/read', authenticate, async (req: Request, res: Response) => {
  try {
    await query(`UPDATE sv_notifications SET read = TRUE WHERE id = $1;`, [req.params.id]);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications/mark-all-read
router.post('/mark-all-read', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    await query(`
      UPDATE sv_notifications SET read = TRUE
      WHERE (user_id = $1 OR target_role = $2 OR target_role = 'ALL' OR target_role IS NULL);
    `, [user.id, user.role]);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;

