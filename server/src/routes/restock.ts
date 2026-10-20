import { Router, Request, Response } from 'express';
import { query } from '../db';
import { authenticate, authorizeRoles } from '../middleware/auth';
import { logAudit } from '../utils/audit';
import { createNotification } from '../utils/notifications';

const router = Router();

// GET /api/restock
router.get('/', authenticate, authorizeRoles('MANAGER', 'STAFF'), async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT 
        r.id, r.product_id as "productId", r.product_name as "productName",
        r.current_stock as "currentStock", r.requested_quantity as "requestedQuantity",
        r.approved_quantity as "approvedQuantity", r.priority, r.reason, r.status,
        r.requested_by as "requestedBy", r.requester_name as "requesterName",
        r.reviewed_by as "reviewedBy", r.reviewer_notes as "reviewerNotes",
        r.purchase_order_id as "purchaseOrderId",
        r.created_at as "createdAt", r.updated_at as "updatedAt",
        p.sku as "productSku", p.category as "productCategory",
        p.purchase_cost::float as "unitCostINR"
      FROM sv_restock_requests r
      LEFT JOIN sv_products p ON p.id = r.product_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status && status !== 'ALL') {
      params.push(status);
      sql += ` AND r.status = $${params.length}`;
    }

    sql += ` ORDER BY CASE r.priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END, r.created_at DESC;`;

    const result = await query(sql, params);
    return res.json(result.rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/restock (Staff or Manager submits)
router.post('/', authenticate, authorizeRoles('STAFF', 'MANAGER'), async (req: Request, res: Response) => {
  const { productId, requestedQuantity, priority = 'MEDIUM', reason } = req.body;

  if (!productId || !requestedQuantity || !reason) {
    return res.status(400).json({ error: 'ProductId, requestedQuantity, and reason are required.' });
  }

  const qty = parseInt(requestedQuantity, 10);
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Requested quantity must be greater than 0.' });
  }

  try {
    const productRes = await query(`SELECT id, name, sku, physical_stock FROM sv_products WHERE id = $1;`, [productId]);
    if (productRes.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const product = productRes.rows[0];

    const result = await query(`
      INSERT INTO sv_restock_requests (
        product_id, product_name, current_stock, requested_quantity,
        priority, reason, status, requested_by, requester_name
      ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, $8)
      RETURNING *;
    `, [product.id, product.name, product.physical_stock, qty, priority, reason.trim(), req.user!.id, req.user!.fullName]);

    const created = result.rows[0];

    // Notify Manager
    await createNotification({
      targetRole: 'MANAGER',
      title: `New Restock Request: ${product.name}`,
      message: `${req.user!.fullName} requested ${qty} units of ${product.sku} (${priority} priority).`,
      type: priority === 'URGENT' ? 'ALERT' : 'WARNING',
    });

    await logAudit(req.user!, 'SUBMIT_RESTOCK_REQUEST', 'RESTOCK_REQUEST', created.id, `Requisition for ${qty} units of ${product.name}`);

    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/restock/:id/review (Manager only)
router.post('/:id/review', authenticate, authorizeRoles('MANAGER'), async (req: Request, res: Response) => {
  const { decision, approvedQuantity, notes } = req.body; // decision: 'APPROVE' | 'REJECT'

  if (!decision || (decision !== 'APPROVE' && decision !== 'REJECT')) {
    return res.status(400).json({ error: "Decision must be 'APPROVE' or 'REJECT'." });
  }

  try {
    const reqRes = await query(`SELECT * FROM sv_restock_requests WHERE id = $1;`, [req.params.id]);
    if (reqRes.rows.length === 0) {
      return res.status(404).json({ error: 'Restock request not found.' });
    }

    const currentReq = reqRes.rows[0];
    if (currentReq.status !== 'PENDING') {
      return res.status(400).json({ error: `Request has already been processed with status: ${currentReq.status}` });
    }

    const finalStatus = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    const finalQty = decision === 'APPROVE' ? (parseInt(approvedQuantity, 10) || currentReq.requested_quantity) : 0;

    const result = await query(`
      UPDATE sv_restock_requests SET
        status = $1,
        approved_quantity = $2,
        reviewed_by = $3,
        reviewer_notes = $4,
        updated_at = NOW()
      WHERE id = $5
      RETURNING *;
    `, [finalStatus, finalQty, req.user!.id, notes || null, currentReq.id]);

    const updated = result.rows[0];

    // Notify the requesting Staff member
    await createNotification({
      userId: currentReq.requested_by,
      targetRole: 'STAFF',
      title: `Restock Request ${finalStatus}: ${currentReq.product_name}`,
      message: decision === 'APPROVE'
        ? `Manager ${req.user!.fullName} approved ${finalQty} units. ${notes ? 'Notes: ' + notes : ''}`
        : `Manager ${req.user!.fullName} rejected request. Reason: ${notes || 'No reason specified'}`,
      type: decision === 'APPROVE' ? 'SUCCESS' : 'WARNING',
    });

    await logAudit(req.user!, `${decision}_RESTOCK_REQUEST`, 'RESTOCK_REQUEST', currentReq.id, `${decision} requisition. Approved Qty: ${finalQty}`);

    return res.json({
      success: true,
      request: {
        ...updated,
        approvedQuantity: updated.approved_quantity,
        requestedQuantity: updated.requested_quantity,
        productName: updated.product_name,
      },
      message: `Restock request ${finalStatus.toLowerCase()} successfully.`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;

