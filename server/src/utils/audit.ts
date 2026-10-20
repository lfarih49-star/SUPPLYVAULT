import { query } from '../db';
import { AuthUser } from '../middleware/auth';

export async function logAudit(
  actor: AuthUser | null,
  action: string,
  entityType: string,
  entityId: string,
  details?: string,
  ip?: string
) {
  try {
    await query(`
      INSERT INTO sv_audit_logs (actor_id, actor_name, actor_role, action, entity_type, entity_id, details, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      actor?.id || null,
      actor?.fullName || 'SYSTEM',
      actor?.role || 'SYSTEM',
      action,
      entityType,
      entityId,
      details || null,
      ip || null
    ]);
  } catch (err) {
    console.error('[AUDIT_ERROR] Failed to write audit log:', err);
  }
}

