import { Router, Request, Response } from 'express';
import { query } from '../db';
import { authenticate, authorizeRoles } from '../middleware/auth';

const router = Router();

// GET /api/inventory/movements
router.get('/movements', authenticate, authorizeRoles('MANAGER', 'STAFF'), async (req: Request, res: Response) => {
  try {
    const { productId, type, limit = 100 } = req.query;

    let sql = `
      SELECT 
        m.id, m.product_id as "productId", m.product_name as "productName",
        m.type, m.quantity,
        m.physical_before as "physicalBefore", m.physical_after as "physicalAfter",
        m.reserved_before as "reservedBefore", m.reserved_after as "reservedAfter",
        m.reason, m.reference_id as "referenceId", m.performed_by as "performedBy",
        m.created_at as "createdAt"
      FROM sv_inventory_movements m
      WHERE 1=1
    `;
    const params: any[] = [];

    if (productId) {
      params.push(productId);
      sql += ` AND m.product_id = $${params.length}`;
    }

    if (type && type !== 'ALL') {
      params.push(type);
      sql += ` AND m.type = $${params.length}`;
    }

    sql += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1};`;
    params.push(parseInt(limit as string, 10) || 100);

    const result = await query(sql, params);
    return res.json(result.rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/valuation
router.get('/valuation', authenticate, authorizeRoles('MANAGER', 'STAFF'), async (_req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT 
        COALESCE(SUM(physical_stock * purchase_cost), 0)::float as "totalValuationINR",
        COALESCE(SUM(reserved_stock * purchase_cost), 0)::float as "reservedValuationINR",
        COALESCE(SUM((physical_stock - reserved_stock) * purchase_cost), 0)::float as "availableValuationINR",
        COALESCE(SUM(physical_stock * selling_price), 0)::float as "retailValuationINR",
        COALESCE(SUM(physical_stock), 0)::int as "totalPhysicalUnits",
        COALESCE(SUM(reserved_stock), 0)::int as "totalReservedUnits",
        COALESCE(SUM(physical_stock - reserved_stock), 0)::int as "totalAvailableUnits",
        COUNT(CASE WHEN physical_stock <= min_stock_level AND physical_stock > 0 THEN 1 END)::int as "lowStockItems",
        COUNT(CASE WHEN physical_stock = 0 THEN 1 END)::int as "outOfStockItems"
      FROM sv_products;
    `);

    // Category breakdown valuation
    const catResult = await query(`
      SELECT 
        category,
        COUNT(id)::int as "productCount",
        SUM(physical_stock)::int as "physicalStock",
        COALESCE(SUM(physical_stock * purchase_cost), 0)::float as "valuationINR"
      FROM sv_products
      GROUP BY category
      ORDER BY "valuationINR" DESC;
    `);

    return res.json({
      summary: result.rows[0],
      categories: catResult.rows,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;

