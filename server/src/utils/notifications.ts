import { query } from '../db';
import { Role } from '@shared/types';

export async function createNotification({
  userId,
  targetRole,
  title,
  message,
  type = 'INFO',
  referenceUrl,
}: {
  userId?: string;
  targetRole?: 'ALL' | Role;
  title: string;
  message: string;
  type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  referenceUrl?: string;
}) {
  try {
    await query(`
      INSERT INTO sv_notifications (user_id, target_role, title, message, type, reference_url)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      userId || null,
      targetRole || null,
      title,
      message,
      type,
      referenceUrl || null
    ]);
  } catch (err) {
    console.error('[NOTIFICATION_ERROR] Failed to insert notification:', err);
  }
}
