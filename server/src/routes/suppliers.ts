import { Router, Request, Response } from 'express';
import { query } from '../db';
import { authenticate, authorizeRoles } from '../middleware/auth';
import { logAudit } from '../utils/audit';

const router = Router();

// GET /api/suppliers
router.get('/', authenticate, authorizeRoles('MANAGER', 'STAFF'), async (_req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT 
        s.id, s.name, s.contact_person as "contactPerson", s.email, s.phone,
        s.address, s.city, s.lead_time_days as "leadTimeDays", s.status,
        s.rating::float as "rating", s.created_at as "createdAt",
        COUNT(po.id) as "totalPurchaseOrders",
        COALESCE(SUM(po.total_amount), 0)::float as "totalSpendINR"
      FROM sv_suppliers s
      LEFT JOIN sv_purchase_orders po ON po.supplier_id = s.id
      GROUP BY s.id
      ORDER BY s.name ASC;
    `);
    return res.json(result.rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/suppliers/:id
router.get('/:id', authenticate, authorizeRoles('MANAGER', 'STAFF'), async (req: Request, res: Response) => {
  try {
    const supplierRes = await query(`
      SELECT 
        id, name, contact_person as "contactPerson", email, phone,
        address, city, lead_time_days as "leadTimeDays", status,
        rating::float as "rating", created_at as "createdAt"
      FROM sv_suppliers WHERE id = $1;
    `, [req.params.id]);

    if (supplierRes.rows.length === 0) {
      return res.status(404).json({ error: 'Supplier not found.' });
    }

    const posRes = await query(`
      SELECT 
        id, po_number as "poNumber", status, total_amount::float as "totalAmount",
        created_at as "createdAt", expected_delivery_date as "expectedDeliveryDate"
      FROM sv_purchase_orders
      WHERE supplier_id = $1
      ORDER BY created_at DESC;
    `, [req.params.id]);

    return res.json({
      ...supplierRes.rows[0],
      purchaseOrders: posRes.rows,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/suppliers (Manager only)
router.post('/', authenticate, authorizeRoles('MANAGER'), async (req: Request, res: Response) => {
  const { name, contactPerson, email, phone, address, city, leadTimeDays = 5, rating = 4.5 } = req.body;

  if (!name || !contactPerson || !email || !phone || !address || !city) {
    return res.status(400).json({ error: 'Name, contactPerson, email, phone, address, and city are required.' });
  }

  try {
    const result = await query(`
      INSERT INTO sv_suppliers (name, contact_person, email, phone, address, city, lead_time_days, rating)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING 
        id, name, contact_person as "contactPerson", email, phone,
        address, city, lead_time_days as "leadTimeDays", status,
        rating::float as "rating", created_at as "createdAt";
    `, [name.trim(), contactPerson.trim(), email.trim(), phone.trim(), address.trim(), city.trim(), leadTimeDays, rating]);

    const created = result.rows[0];
    await logAudit(req.user!, 'CREATE_SUPPLIER', 'SUPPLIER', created.id, `Created supplier ${created.name}`);

    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/suppliers/:id (Manager only)
router.put('/:id', authenticate, authorizeRoles('MANAGER'), async (req: Request, res: Response) => {
  const { name, contactPerson, email, phone, address, city, leadTimeDays, status, rating } = req.body;

  try {
    const result = await query(`
      UPDATE sv_suppliers SET
        name = COALESCE($1, name),
        contact_person = COALESCE($2, contact_person),
        email = COALESCE($3, email),
        phone = COALESCE($4, phone),
        address = COALESCE($5, address),
        city = COALESCE($6, city),
        lead_time_days = COALESCE($7, lead_time_days),
        status = COALESCE($8, status),
        rating = COALESCE($9, rating),
        updated_at = NOW()
      WHERE id = $10
      RETURNING 
        id, name, contact_person as "contactPerson", email, phone,
        address, city, lead_time_days as "leadTimeDays", status,
        rating::float as "rating", created_at as "createdAt";
    `, [name, contactPerson, email, phone, address, city, leadTimeDays, status, rating, req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Supplier not found.' });
    }

    await logAudit(req.user!, 'UPDATE_SUPPLIER', 'SUPPLIER', req.params.id, `Updated supplier details`);

    return res.json(result.rows[0]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;

