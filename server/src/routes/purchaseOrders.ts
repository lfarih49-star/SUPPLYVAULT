import { Router, Request, Response } from 'express';
import { query, withTransaction } from '../db';
import { authenticate, authorizeRoles } from '../middleware/auth';
import { logAudit } from '../utils/audit';
import { createNotification } from '../utils/notifications';

const router = Router();

// GET /api/purchase-orders
router.get('/', authenticate, authorizeRoles('MANAGER', 'STAFF'), async (req: Request, res: Response) => {
  try {
    const { status, supplierId } = req.query;

    let sql = `
      SELECT 
        po.id, po.po_number as "poNumber", po.supplier_id as "supplierId", po.supplier_name as "supplierName",
        po.status, po.total_amount::float as "totalAmount", po.expected_delivery_date as "expectedDeliveryDate",
        po.notes, po.created_by as "createdBy", po.approved_by as "approvedBy",
        po.created_at as "createdAt", po.updated_at as "updatedAt",
        u.full_name as "creatorName"
      FROM sv_purchase_orders po
      LEFT JOIN sv_users u ON u.id = po.created_by
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status && status !== 'ALL') {
      params.push(status);
      sql += ` AND po.status = $${params.length}`;
    }

    if (supplierId) {
      params.push(supplierId);
      sql += ` AND po.supplier_id = $${params.length}`;
    }

    sql += ` ORDER BY po.created_at DESC;`;

    const result = await query(sql, params);
    return res.json(result.rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/purchase-orders/:id
router.get('/:id', authenticate, authorizeRoles('MANAGER', 'STAFF'), async (req: Request, res: Response) => {
  try {
    const poRes = await query(`
      SELECT 
        po.id, po.po_number as "poNumber", po.supplier_id as "supplierId", po.supplier_name as "supplierName",
        po.status, po.total_amount::float as "totalAmount", po.expected_delivery_date as "expectedDeliveryDate",
        po.notes, po.created_by as "createdBy", po.approved_by as "approvedBy",
        po.created_at as "createdAt", po.updated_at as "updatedAt",
        s.email as "supplierEmail", s.phone as "supplierPhone", s.address as "supplierAddress"
      FROM sv_purchase_orders po
      LEFT JOIN sv_suppliers s ON s.id = po.supplier_id
      WHERE po.id = $1;
    `, [req.params.id]);

    if (poRes.rows.length === 0) {
      return res.status(404).json({ error: 'Purchase Order not found.' });
    }

    const itemsRes = await query(`
      SELECT 
        id, product_id as "productId", product_name as "productName",
        quantity, unit_cost::float as "unitCost", total_cost::float as "totalCost",
        received_quantity as "receivedQuantity"
      FROM sv_purchase_order_items
      WHERE purchase_order_id = $1;
    `, [req.params.id]);

    return res.json({
      ...poRes.rows[0],
      items: itemsRes.rows,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/purchase-orders (Manager or Staff creates PO)
router.post('/', authenticate, authorizeRoles('MANAGER', 'STAFF'), async (req: Request, res: Response) => {
  const { supplierId, expectedDeliveryDate, notes, items, autoSubmitForApproval = true } = req.body;

  if (!supplierId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Supplier ID and at least one order item are required.' });
  }

  try {
    const supplierRes = await query(`SELECT id, name FROM sv_suppliers WHERE id = $1;`, [supplierId]);
    if (supplierRes.rows.length === 0) {
      return res.status(404).json({ error: 'Supplier not found.' });
    }
    const supplier = supplierRes.rows[0];

    const poNumber = `PO-${Date.now().toString().slice(-6)}`;
    const isManager = req.user!.role === 'MANAGER';
    const initialStatus = isManager ? 'APPROVED' : (autoSubmitForApproval ? 'PENDING_APPROVAL' : 'DRAFT');

    const createdPO = await withTransaction(async (client) => {
      // Calculate total on server
      let totalAmountINR = 0;
      const sanitizedItems: any[] = [];

      for (const item of items) {
        const prodRes = await client.query(`SELECT id, name, purchase_cost FROM sv_products WHERE id = $1;`, [item.productId]);
        if (prodRes.rows.length === 0) {
          throw new Error(`Product ${item.productId} not found.`);
        }
        const prod = prodRes.rows[0];
        const qty = parseInt(item.quantity, 10);
        if (qty <= 0) throw new Error(`Invalid quantity for product ${prod.name}`);

        const unitCost = item.unitCost != null ? parseFloat(item.unitCost) : parseFloat(prod.purchase_cost);
        const lineTotal = qty * unitCost;
        totalAmountINR += lineTotal;

        sanitizedItems.push({
          productId: prod.id,
          productName: prod.name,
          quantity: qty,
          unitCost,
          totalCost: lineTotal,
        });
      }

      // Insert PO
      const poRes = await client.query(`
        INSERT INTO sv_purchase_orders (
          po_number, supplier_id, supplier_name, status, total_amount,
          expected_delivery_date, notes, created_by, approved_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *;
      `, [
        poNumber, supplier.id, supplier.name, initialStatus, totalAmountINR,
        expectedDeliveryDate || null, notes || null, req.user!.id, isManager ? req.user!.id : null
      ]);

      const po = poRes.rows[0];

      // Insert items
      for (const item of sanitizedItems) {
        await client.query(`
          INSERT INTO sv_purchase_order_items (
            purchase_order_id, product_id, product_name, quantity, unit_cost, total_cost, received_quantity
          ) VALUES ($1, $2, $3, $4, $5, $6, 0);
        `, [po.id, item.productId, item.productName, item.quantity, item.unitCost, item.totalCost]);
      }

      return po;
    });

    await logAudit(req.user!, 'CREATE_PURCHASE_ORDER', 'PURCHASE_ORDER', createdPO.id, `Created ${poNumber} for ₹${createdPO.total_amount}`);

    if (initialStatus === 'PENDING_APPROVAL') {
      await createNotification({
        targetRole: 'MANAGER',
        title: `Purchase Order Awaiting Approval: ${poNumber}`,
        message: `${req.user!.fullName} created PO for ${supplier.name} totaling ₹${parseFloat(createdPO.total_amount).toLocaleString('en-IN')}`,
        type: 'WARNING',
      });
    }

    return res.status(201).json(createdPO);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /api/purchase-orders/:id/approve (Manager only)
router.post('/:id/approve', authenticate, authorizeRoles('MANAGER'), async (req: Request, res: Response) => {
  try {
    const poRes = await query(`SELECT * FROM sv_purchase_orders WHERE id = $1;`, [req.params.id]);
    if (poRes.rows.length === 0) {
      return res.status(404).json({ error: 'Purchase Order not found.' });
    }

    const po = poRes.rows[0];
    if (po.status !== 'PENDING_APPROVAL' && po.status !== 'DRAFT') {
      return res.status(400).json({ error: `Cannot approve PO with status: ${po.status}` });
    }

    const updated = await query(`
      UPDATE sv_purchase_orders SET
        status = 'APPROVED',
        approved_by = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *;
    `, [req.user!.id, po.id]);

    await logAudit(req.user!, 'APPROVE_PURCHASE_ORDER', 'PURCHASE_ORDER', po.id, `Approved ${po.po_number}`);

    return res.json({ success: true, purchaseOrder: updated.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/purchase-orders/:id/order (Manager or Staff transmits order to supplier)
router.post('/:id/order', authenticate, authorizeRoles('MANAGER', 'STAFF'), async (req: Request, res: Response) => {
  try {
    const poRes = await query(`SELECT * FROM sv_purchase_orders WHERE id = $1;`, [req.params.id]);
    if (poRes.rows.length === 0) {
      return res.status(404).json({ error: 'Purchase Order not found.' });
    }

    const po = poRes.rows[0];
    if (po.status !== 'APPROVED') {
      return res.status(400).json({ error: `Only approved POs can be placed with suppliers. Current status: ${po.status}` });
    }

    const updated = await query(`
      UPDATE sv_purchase_orders SET
        status = 'ORDERED',
        updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `, [po.id]);

    await logAudit(req.user!, 'TRANSMIT_PURCHASE_ORDER', 'PURCHASE_ORDER', po.id, `Transmitted ${po.po_number} to supplier`);

    return res.json({ success: true, purchaseOrder: updated.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/purchase-orders/:id/receive (Goods Receipt verification - increases physical inventory!)
router.post('/:id/receive', authenticate, authorizeRoles('MANAGER', 'STAFF'), async (req: Request, res: Response) => {
  const { receipts } = req.body; // receipts: [{ itemId: string, receivedNow: number }]

  if (!Array.isArray(receipts) || receipts.length === 0) {
    return res.status(400).json({ error: 'Receipt records are required.' });
  }

  try {
    const result = await withTransaction(async (client) => {
      const poRes = await client.query(`SELECT * FROM sv_purchase_orders WHERE id = $1 FOR UPDATE;`, [req.params.id]);
      if (poRes.rows.length === 0) {
        throw new Error('Purchase Order not found.');
      }
      const po = poRes.rows[0];

      if (po.status !== 'ORDERED' && po.status !== 'PARTIALLY_RECEIVED') {
        throw new Error(`Cannot receive goods for PO in status '${po.status}'. Must be ORDERED or PARTIALLY_RECEIVED.`);
      }

      let allFullyReceived = true;

      for (const rec of receipts) {
        const itemRes = await client.query(`SELECT * FROM sv_purchase_order_items WHERE id = $1 AND purchase_order_id = $2;`, [rec.itemId, po.id]);
        if (itemRes.rows.length === 0) continue;
        const item = itemRes.rows[0];

        const receivedNow = parseInt(rec.receivedNow, 10);
        if (isNaN(receivedNow) || receivedNow <= 0) continue;

        const newReceivedTotal = item.received_quantity + receivedNow;
        if (newReceivedTotal < item.quantity) {
          allFullyReceived = false;
        }

        // Update item received quantity
        await client.query(`UPDATE sv_purchase_order_items SET received_quantity = $1 WHERE id = $2;`, [newReceivedTotal, item.id]);

        // LOCK AND UPDATE PRODUCT STOCK
        const prodRes = await client.query(`SELECT * FROM sv_products WHERE id = $1 FOR UPDATE;`, [item.product_id]);
        if (prodRes.rows.length > 0) {
          const prod = prodRes.rows[0];
          const physicalBefore = prod.physical_stock;
          const physicalAfter = physicalBefore + receivedNow;
          const newStatus = physicalAfter === 0 ? 'OUT_OF_STOCK' : (physicalAfter <= prod.min_stock_level ? 'LOW_STOCK' : 'ACTIVE');

          await client.query(`
            UPDATE sv_products SET
              physical_stock = $1,
              status = $2,
              updated_at = NOW()
            WHERE id = $3;
          `, [physicalAfter, newStatus, prod.id]);

          // RECORD INVENTORY MOVEMENT (GOODS_RECEIPT)
          await client.query(`
            INSERT INTO sv_inventory_movements (
              product_id, product_name, type, quantity,
              physical_before, physical_after, reserved_before, reserved_after,
              reason, reference_id, performed_by
            ) VALUES ($1, $2, 'GOODS_RECEIPT', $3, $4, $5, $6, $6, $7, $8, $9);
          `, [
            prod.id, prod.name, receivedNow,
            physicalBefore, physicalAfter, prod.reserved_stock,
            `Goods receipt from ${po.supplier_name}`, po.po_number, req.user!.fullName
          ]);
        }
      }

      const newPoStatus = allFullyReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED';
      const updatedPo = await client.query(`
        UPDATE sv_purchase_orders SET
          status = $1,
          updated_at = NOW()
        WHERE id = $2
        RETURNING *;
      `, [newPoStatus, po.id]);

      return updatedPo.rows[0];
    });

    await logAudit(req.user!, 'VERIFY_GOODS_RECEIPT', 'PURCHASE_ORDER', req.params.id, `Goods received for PO ${result.po_number}`);

    await createNotification({
      targetRole: 'ALL',
      title: `Goods Receipt Verified: ${result.po_number}`,
      message: `Stock successfully credited to inventory from supplier ${result.supplier_name}.`,
      type: 'SUCCESS',
    });

    return res.json({
      success: true,
      purchaseOrder: result,
      message: `Goods receipt processed. Stock has been incremented in the physical inventory.`,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

export default router;

