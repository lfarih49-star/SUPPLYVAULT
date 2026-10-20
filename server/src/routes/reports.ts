import { Router, Request, Response } from 'express';
import { query } from '../db';
import { authenticate, authorizeRoles } from '../middleware/auth';

const router = Router();

// Helper to escape CSV cell values
function escapeCsv(val: any): string {
  if (val == null) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

// GET /api/reports/audit (Manager only)
router.get('/audit', authenticate, authorizeRoles('MANAGER'), async (_req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT 
        id, actor_id as "actorId", actor_name as "actorName",
        actor_role as "actorRole", action, entity_type as "entityType",
        entity_id as "entityId", details, ip_address as "ipAddress",
        created_at as "createdAt"
      FROM sv_audit_logs
      ORDER BY created_at DESC
      LIMIT 100;
    `);
    return res.json(result.rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/csv (Manager & Staff)
router.get('/csv', authenticate, authorizeRoles('MANAGER', 'STAFF'), async (req: Request, res: Response) => {
  const { type } = req.query; // 'inventory' | 'orders' | 'purchase_orders' | 'movements' | 'suppliers' | 'deliveries'

  try {
    let filename = `supplyvault_${type || 'export'}_${Date.now()}.csv`;
    let csvContent = '';

    if (type === 'inventory') {
      const rows = await query(`
        SELECT 
          sku, name, category, unit,
          purchase_cost, selling_price,
          physical_stock, reserved_stock, (physical_stock - reserved_stock) as available_stock,
          (physical_stock * purchase_cost) as valuation_inr,
          status, min_stock_level, reorder_quantity
        FROM sv_products
        ORDER BY name ASC;
      `);

      const headers = ['SKU', 'Product Name', 'Category', 'Unit', 'Purchase Cost (INR)', 'Selling Price (INR)', 'Physical Stock', 'Reserved Stock', 'Available Stock', 'Valuation (INR)', 'Status', 'Min Stock Level', 'Reorder Qty'];
      csvContent = headers.join(',') + '\n';
      for (const r of rows.rows) {
        csvContent += [
          escapeCsv(r.sku), escapeCsv(r.name), escapeCsv(r.category), escapeCsv(r.unit),
          r.purchase_cost, r.selling_price, r.physical_stock, r.reserved_stock,
          r.available_stock, r.valuation_inr, escapeCsv(r.status), r.min_stock_level, r.reorder_quantity
        ].join(',') + '\n';
      }
    } else if (type === 'orders') {
      const rows = await query(`
        SELECT 
          order_number, buyer_name, buyer_email, status,
          subtotal, tax_amount, total_amount,
          shipping_address, city, postal_code, created_at
        FROM sv_orders
        ORDER BY created_at DESC;
      `);

      const headers = ['Order Number', 'Buyer Name', 'Buyer Email', 'Status', 'Subtotal (INR)', 'GST 18% (INR)', 'Total Amount (INR)', 'Shipping Address', 'City', 'Postal Code', 'Order Date'];
      csvContent = headers.join(',') + '\n';
      for (const r of rows.rows) {
        csvContent += [
          escapeCsv(r.order_number), escapeCsv(r.buyer_name), escapeCsv(r.buyer_email), escapeCsv(r.status),
          r.subtotal, r.tax_amount, r.total_amount,
          escapeCsv(r.shipping_address), escapeCsv(r.city), escapeCsv(r.postal_code), escapeCsv(r.created_at)
        ].join(',') + '\n';
      }
    } else if (type === 'purchase_orders') {
      const rows = await query(`
        SELECT 
          po_number, supplier_name, status, total_amount,
          expected_delivery_date, created_at
        FROM sv_purchase_orders
        ORDER BY created_at DESC;
      `);

      const headers = ['PO Number', 'Supplier Name', 'Status', 'Total Cost (INR)', 'Expected Delivery', 'Created At'];
      csvContent = headers.join(',') + '\n';
      for (const r of rows.rows) {
        csvContent += [
          escapeCsv(r.po_number), escapeCsv(r.supplier_name), escapeCsv(r.status),
          r.total_amount, escapeCsv(r.expected_delivery_date), escapeCsv(r.created_at)
        ].join(',') + '\n';
      }
    } else if (type === 'movements') {
      const rows = await query(`
        SELECT 
          product_name, type, quantity,
          physical_before, physical_after, reserved_before, reserved_after,
          reason, reference_id, performed_by, created_at
        FROM sv_inventory_movements
        ORDER BY created_at DESC;
      `);

      const headers = ['Product', 'Movement Type', 'Quantity', 'Physical Before', 'Physical After', 'Reserved Before', 'Reserved After', 'Reason', 'Ref ID', 'Performed By', 'Timestamp'];
      csvContent = headers.join(',') + '\n';
      for (const r of rows.rows) {
        csvContent += [
          escapeCsv(r.product_name), escapeCsv(r.type), r.quantity,
          r.physical_before, r.physical_after, r.reserved_before, r.reserved_after,
          escapeCsv(r.reason), escapeCsv(r.reference_id), escapeCsv(r.performed_by), escapeCsv(r.created_at)
        ].join(',') + '\n';
      }
    } else if (type === 'deliveries') {
      const rows = await query(`
        SELECT 
          tracking_number, order_number, assigned_agent_name, status,
          recipient_name, delivery_address, city, total_amount,
          dispatched_at, delivered_at, failure_reason
        FROM sv_shipments
        ORDER BY created_at DESC;
      `);

      const headers = ['Tracking Ref', 'Order Number', 'Delivery Agent', 'Status', 'Recipient', 'Address', 'City', 'Order Value (INR)', 'Dispatched At', 'Delivered At', 'Failure Reason'];
      csvContent = headers.join(',') + '\n';
      for (const r of rows.rows) {
        csvContent += [
          escapeCsv(r.tracking_number), escapeCsv(r.order_number), escapeCsv(r.assigned_agent_name), escapeCsv(r.status),
          escapeCsv(r.recipient_name), escapeCsv(r.delivery_address), escapeCsv(r.city), r.total_amount,
          escapeCsv(r.dispatched_at), escapeCsv(r.delivered_at), escapeCsv(r.failure_reason)
        ].join(',') + '\n';
      }
    } else {
      return res.status(400).json({ error: 'Invalid report type requested.' });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csvContent);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;

