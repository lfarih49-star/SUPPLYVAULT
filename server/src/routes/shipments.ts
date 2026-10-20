import { Router, Request, Response } from 'express';
import { query, withTransaction } from '../db';
import { authenticate, authorizeRoles } from '../middleware/auth';
import { logAudit } from '../utils/audit';
import { createNotification } from '../utils/notifications';

const router = Router();

// GET /api/shipments
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { status, agentId } = req.query;

    let sql = `
      SELECT 
        s.id, s.order_id as "orderId", s.order_number as "orderNumber",
        s.tracking_number as "trackingNumber",
        s.assigned_agent_id as "assignedAgentId", s.assigned_agent_name as "assignedAgentName",
        s.status, s.recipient_name as "recipientName", s.recipient_phone as "recipientPhone",
        s.delivery_address as "deliveryAddress", s.city, s.postal_code as "postalCode",
        s.estimated_delivery as "estimatedDelivery", s.dispatched_at as "dispatchedAt",
        s.delivered_at as "deliveredAt", s.delivery_notes as "deliveryNotes",
        s.failure_reason as "failureReason", s.attempts,
        s.total_amount::float as "totalAmount",
        s.created_at as "createdAt", s.updated_at as "updatedAt"
      FROM sv_shipments s
      WHERE 1=1
    `;
    const params: any[] = [];

    // DELIVERY_AGENT CAN ONLY SEE THEIR ASSIGNED SHIPMENTS
    if (req.user!.role === 'DELIVERY_AGENT') {
      params.push(req.user!.id);
      sql += ` AND s.assigned_agent_id = $${params.length}`;
    } else if (agentId) {
      params.push(agentId);
      sql += ` AND s.assigned_agent_id = $${params.length}`;
    }

    if (status && status !== 'ALL') {
      params.push(status);
      sql += ` AND s.status = $${params.length}`;
    }

    sql += ` ORDER BY s.created_at DESC;`;

    const result = await query(sql, params);
    return res.json(result.rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/shipments/assigned (Explicit endpoint for agent assigned deliveries)
router.get('/assigned', authenticate, async (req: Request, res: Response) => {
  try {
    let sql = `
      SELECT 
        s.id, s.order_id as "orderId", s.order_number as "orderNumber",
        s.tracking_number as "trackingNumber",
        s.assigned_agent_id as "assignedAgentId", s.assigned_agent_name as "assignedAgentName",
        s.status, s.recipient_name as "recipientName", s.recipient_phone as "recipientPhone",
        s.delivery_address as "deliveryAddress", s.city, s.postal_code as "postalCode",
        s.estimated_delivery as "estimatedDelivery", s.dispatched_at as "dispatchedAt",
        s.delivered_at as "deliveredAt", s.delivery_notes as "deliveryNotes",
        s.failure_reason as "failureReason", s.attempts,
        s.total_amount::float as "totalAmount",
        s.created_at as "createdAt", s.updated_at as "updatedAt"
      FROM sv_shipments s
      WHERE 1=1
    `;
    const params: any[] = [];
    if (req.user!.role === 'DELIVERY_AGENT') {
      params.push(req.user!.id);
      sql += ` AND s.assigned_agent_id = $${params.length}`;
    }
    sql += ` ORDER BY s.created_at DESC;`;
    const result = await query(sql, params);
    return res.json(result.rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/shipments/:id
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const resShipment = await query(`
      SELECT 
        s.id, s.order_id as "orderId", s.order_number as "orderNumber",
        s.tracking_number as "trackingNumber",
        s.assigned_agent_id as "assignedAgentId", s.assigned_agent_name as "assignedAgentName",
        s.status, s.recipient_name as "recipientName", s.recipient_phone as "recipientPhone",
        s.delivery_address as "deliveryAddress", s.city, s.postal_code as "postalCode",
        s.estimated_delivery as "estimatedDelivery", s.dispatched_at as "dispatchedAt",
        s.delivered_at as "deliveredAt", s.delivery_notes as "deliveryNotes",
        s.failure_reason as "failureReason", s.attempts,
        s.total_amount::float as "totalAmount",
        s.created_at as "createdAt", s.updated_at as "updatedAt"
      FROM sv_shipments s
      WHERE s.id = $1;
    `, [req.params.id]);

    if (resShipment.rows.length === 0) {
      return res.status(404).json({ error: 'Shipment not found.' });
    }

    const shipment = resShipment.rows[0];

    // Agent access restriction
    if (req.user!.role === 'DELIVERY_AGENT' && shipment.assignedAgentId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized to view this shipment.' });
    }

    // Get order items for the delivery manifest
    const itemsRes = await query(`
      SELECT product_name as "productName", quantity, sku
      FROM sv_order_items
      WHERE order_id = $1;
    `, [shipment.orderId]);

    return res.json({
      ...shipment,
      manifest: itemsRes.rows,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/shipments/:id/assign (Manager or Staff assigns/reassigns delivery agent)
router.post('/:id/assign', authenticate, authorizeRoles('MANAGER', 'STAFF'), async (req: Request, res: Response) => {
  const { agentId } = req.body;

  if (!agentId) {
    return res.status(400).json({ error: 'Delivery agent ID is required.' });
  }

  try {
    const agentRes = await query(`SELECT id, full_name FROM sv_users WHERE id = $1 AND role = 'DELIVERY_AGENT';`, [agentId]);
    if (agentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Delivery agent not found.' });
    }

    const agent = agentRes.rows[0];

    const result = await query(`
      UPDATE sv_shipments SET
        assigned_agent_id = $1,
        assigned_agent_name = $2,
        status = CASE WHEN status = 'ASSIGNED' THEN 'ASSIGNED' ELSE status END,
        updated_at = NOW()
      WHERE id = $3
      RETURNING *;
    `, [agent.id, agent.full_name, req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shipment not found.' });
    }

    const updated = result.rows[0];

    // Notify Agent
    await createNotification({
      userId: agent.id,
      targetRole: 'DELIVERY_AGENT',
      title: `New Delivery Assigned: ${updated.tracking_number}`,
      message: `You have been assigned shipment for order ${updated.order_number} to ${updated.city}.`,
      type: 'INFO',
    });

    await logAudit(req.user!, 'ASSIGN_SHIPMENT', 'SHIPMENT', updated.id, `Assigned to ${agent.full_name}`);

    return res.json({ success: true, shipment: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Status update handler (Delivery Agent or Manager/Staff updates shipment status)
const updateShipmentStatusHandler = async (req: Request, res: Response) => {
  const { status, notes, failureReason } = req.body;
  // Allowed statuses: 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED_ATTEMPT'

  if (!status) {
    return res.status(400).json({ error: 'Status is required.' });
  }

  try {
    const result = await withTransaction(async (client) => {
      const shipRes = await client.query(`SELECT * FROM sv_shipments WHERE id = $1 FOR UPDATE;`, [req.params.id]);
      if (shipRes.rows.length === 0) {
        throw new Error('Shipment not found.');
      }

      const s = shipRes.rows[0];

      // Agent can only update their own assigned shipment
      if (req.user!.role === 'DELIVERY_AGENT' && s.assigned_agent_id !== req.user!.id) {
        throw new Error('You can only update your own assigned shipments.');
      }

      // Valid status progression check
      const validTransitions: Record<string, string[]> = {
        'ASSIGNED': ['PICKED_UP', 'CANCELLED'],
        'PICKED_UP': ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'FAILED_ATTEMPT'],
        'IN_TRANSIT': ['OUT_FOR_DELIVERY', 'FAILED_ATTEMPT'],
        'OUT_FOR_DELIVERY': ['DELIVERED', 'FAILED_ATTEMPT'],
        'FAILED_ATTEMPT': ['OUT_FOR_DELIVERY', 'IN_TRANSIT'],
        'DELIVERED': [],
      };

      // Let Managers override, but enforce for Agents
      if (req.user!.role === 'DELIVERY_AGENT') {
        const allowed = validTransitions[s.status] || [];
        if (!allowed.includes(status)) {
          throw new Error(`Invalid status transition from '${s.status}' to '${status}'. Allowed: ${allowed.join(', ')}`);
        }
      }

      let attempts = s.attempts || [];
      if (status === 'FAILED_ATTEMPT') {
        attempts.push({
          timestamp: new Date().toISOString(),
          reason: failureReason || 'Customer unavailable or address unreachable',
          notes: notes || null,
        });
      }

      const isDelivered = status === 'DELIVERED';
      const deliveredAt = isDelivered ? new Date() : s.delivered_at;
      const dispatchedAt = status === 'PICKED_UP' && !s.dispatched_at ? new Date() : s.dispatched_at;

      const updateRes = await client.query(`
        UPDATE sv_shipments SET
          status = $1::varchar,
          dispatched_at = $2,
          delivered_at = $3,
          delivery_notes = COALESCE($4, delivery_notes),
          failure_reason = CASE WHEN $1::varchar = 'FAILED_ATTEMPT' THEN $5 ELSE NULL END,
          attempts = $6::jsonb,
          updated_at = NOW()
        WHERE id = $7
        RETURNING *;
      `, [
        status, dispatchedAt, deliveredAt,
        notes || null, failureReason || null, JSON.stringify(attempts), s.id
      ]);

      // If DELIVERED: update the parent order status to DELIVERED as well!
      if (isDelivered) {
        await client.query(`
          UPDATE sv_orders SET
            status = 'DELIVERED',
            updated_at = NOW()
          WHERE id = $1;
        `, [s.order_id]);
      }

      return updateRes.rows[0];
    });

    await logAudit(req.user!, 'UPDATE_SHIPMENT_STATUS', 'SHIPMENT', result.id, `Status transitioned to ${status}`);

    if (status === 'DELIVERED') {
      await createNotification({
        targetRole: 'MANAGER',
        title: `Shipment Delivered: ${result.tracking_number}`,
        message: `Order ${result.order_number} has been delivered successfully by ${result.assigned_agent_name || req.user!.fullName}.`,
        type: 'SUCCESS',
      });
    } else if (status === 'FAILED_ATTEMPT') {
      await createNotification({
        targetRole: 'MANAGER',
        title: `Delivery Exception: ${result.tracking_number}`,
        message: `Failed delivery attempt for order ${result.order_number}: ${failureReason || 'Address unreachable'}`,
        type: 'ALERT',
      });
    }

    return res.json({
      success: true,
      shipment: result,
      message: `Shipment updated to ${status}.`,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

// Register both POST and PATCH for status updates
router.post('/:id/status', authenticate, updateShipmentStatusHandler);
router.patch('/:id/status', authenticate, updateShipmentStatusHandler);

export default router;
