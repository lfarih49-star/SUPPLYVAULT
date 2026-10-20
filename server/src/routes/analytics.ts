import { Router, Request, Response } from 'express';
import { query } from '../db';
import { authenticate, authorizeRoles } from '../middleware/auth';

const router = Router();

// GET /api/analytics/kpis (Manager & Staff)
router.get('/kpis', authenticate, authorizeRoles('MANAGER', 'STAFF'), async (_req: Request, res: Response) => {
  try {
    // 1. Inventory & Products
    const prodStats = await query(`
      SELECT 
        COUNT(id)::int as "totalProducts",
        COUNT(DISTINCT category)::int as "totalCategories",
        COALESCE(SUM(physical_stock), 0)::int as "physicalStockUnits",
        COALESCE(SUM(reserved_stock), 0)::int as "reservedStockUnits",
        COALESCE(SUM(physical_stock - reserved_stock), 0)::int as "availableStockUnits",
        COALESCE(SUM(physical_stock * purchase_cost), 0)::float as "inventoryValuationINR",
        COUNT(CASE WHEN physical_stock <= min_stock_level AND physical_stock > 0 THEN 1 END)::int as "lowStockCount",
        COUNT(CASE WHEN physical_stock = 0 THEN 1 END)::int as "outOfStockCount"
      FROM sv_products;
    `);

    // 2. Suppliers
    const suppStats = await query(`SELECT COUNT(id)::int as "totalSuppliers" FROM sv_suppliers WHERE status = 'ACTIVE';`);

    // 3. Restock requests
    const restockStats = await query(`SELECT COUNT(id)::int as "pendingRestockRequestsCount" FROM sv_restock_requests WHERE status = 'PENDING';`);

    // 4. Purchase orders
    const poStats = await query(`
      SELECT 
        COUNT(CASE WHEN status = 'PENDING_APPROVAL' THEN 1 END)::int as "pendingPOsCount",
        COALESCE(SUM(CASE WHEN status NOT IN ('REJECTED', 'DRAFT') THEN total_amount ELSE 0 END), 0)::float as "procurementExpenditureINR"
      FROM sv_purchase_orders;
    `);

    // 5. Buyer orders
    const orderStats = await query(`
      SELECT 
        COUNT(CASE WHEN status IN ('PLACED', 'CONFIRMED', 'PROCESSING') THEN 1 END)::int as "ordersAwaitingProcessing",
        COUNT(CASE WHEN status = 'DELIVERED' THEN 1 END)::int as "ordersDelivered",
        COALESCE(SUM(CASE WHEN status != 'CANCELLED' THEN total_amount ELSE 0 END), 0)::float as "totalSalesValueINR"
      FROM sv_orders;
    `);

    // 6. Shipments
    const shipStats = await query(`
      SELECT 
        COUNT(CASE WHEN status IN ('PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY') THEN 1 END)::int as "ordersInTransit",
        COUNT(CASE WHEN status = 'FAILED_ATTEMPT' THEN 1 END)::int as "failedDeliveriesCount"
      FROM sv_shipments;
    `);

    const p = prodStats.rows[0];
    const s = suppStats.rows[0];
    const r = restockStats.rows[0];
    const po = poStats.rows[0];
    const o = orderStats.rows[0];
    const sh = shipStats.rows[0];

    return res.json({
      totalProducts: p.totalProducts,
      totalCategories: p.totalCategories,
      totalSuppliers: s.totalSuppliers,
      physicalStockUnits: p.physicalStockUnits,
      reservedStockUnits: p.reservedStockUnits,
      availableStockUnits: p.availableStockUnits,
      inventoryValuationINR: p.inventoryValuationINR,
      lowStockCount: p.lowStockCount,
      outOfStockCount: p.outOfStockCount,
      pendingRestockRequestsCount: r.pendingRestockRequestsCount,
      pendingPOsCount: po.pendingPOsCount,
      ordersAwaitingProcessing: o.ordersAwaitingProcessing,
      ordersInTransit: sh.ordersInTransit,
      ordersDelivered: o.ordersDelivered,
      totalSalesValueINR: o.totalSalesValueINR,
      procurementExpenditureINR: po.procurementExpenditureINR,
      failedDeliveriesCount: sh.failedDeliveriesCount,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/charts
router.get('/charts', authenticate, authorizeRoles('MANAGER', 'STAFF'), async (_req: Request, res: Response) => {
  try {
    // 1. Stock & Valuation by category
    const categoryData = await query(`
      SELECT 
        category,
        COUNT(id)::int as "products",
        SUM(physical_stock)::int as "units",
        COALESCE(SUM(physical_stock * purchase_cost), 0)::float as "valuationINR"
      FROM sv_products
      GROUP BY category
      ORDER BY "valuationINR" DESC;
    `);

    // 2. Order status distribution
    const orderStatusData = await query(`
      SELECT status, COUNT(id)::int as count
      FROM sv_orders
      GROUP BY status;
    `);

    // 3. Shipment status breakdown
    const shipmentStatusData = await query(`
      SELECT status, COUNT(id)::int as count
      FROM sv_shipments
      GROUP BY status;
    `);

    // 4. Top selling or stocked products
    const topProducts = await query(`
      SELECT 
        sku, name, physical_stock as "physicalStock",
        selling_price::float as "sellingPriceINR",
        (physical_stock * purchase_cost)::float as "valuationINR"
      FROM sv_products
      ORDER BY (physical_stock * purchase_cost) DESC
      LIMIT 6;
    `);

    // 5. Recent timeline activity
    const activityData = await query(`
      SELECT 
        TO_CHAR(created_at, 'DD Mon') as date,
        COUNT(id)::int as movements,
        SUM(quantity)::int as units
      FROM sv_inventory_movements
      WHERE created_at >= NOW() - INTERVAL '14 days'
      GROUP BY TO_CHAR(created_at, 'DD Mon'), DATE(created_at)
      ORDER BY DATE(created_at) ASC;
    `);

    return res.json({
      categoryValuation: categoryData.rows,
      orderStatus: orderStatusData.rows,
      shipmentStatus: shipmentStatusData.rows,
      topProducts: topProducts.rows,
      movementTimeline: activityData.rows,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/schema (Live database table metrics & schema overview)
router.get('/schema', authenticate, authorizeRoles('MANAGER'), async (_req: Request, res: Response) => {
  try {
    const counts = await query(`
      SELECT 
        (SELECT count(*) FROM sv_users)::int as users,
        (SELECT count(*) FROM sv_products)::int as products,
        (SELECT count(*) FROM sv_suppliers)::int as suppliers,
        (SELECT count(*) FROM sv_orders)::int as orders,
        (SELECT count(*) FROM sv_order_items)::int as order_items,
        (SELECT count(*) FROM sv_purchase_orders)::int as purchase_orders,
        (SELECT count(*) FROM sv_purchase_order_items)::int as purchase_order_items,
        (SELECT count(*) FROM sv_shipments)::int as shipments,
        (SELECT count(*) FROM sv_inventory_movements)::int as inventory_movements,
        (SELECT count(*) FROM sv_restock_requests)::int as restock_requests,
        (SELECT count(*) FROM sv_notifications)::int as notifications,
        (SELECT count(*) FROM sv_audit_logs)::int as audit_logs;
    `);

    const dbStats = await query(`
      SELECT 
        current_database() as "databaseName",
        version() as "version",
        pg_size_pretty(pg_database_size(current_database())) as "databaseSize";
    `);

    return res.json({
      counts: counts.rows[0],
      db: dbStats.rows[0],
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;

