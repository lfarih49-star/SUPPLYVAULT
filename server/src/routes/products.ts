import { Router, Request, Response } from 'express';
import { query, withTransaction } from '../db';
import { authenticate, authorizeRoles } from '../middleware/auth';
import { logAudit } from '../utils/audit';
import { createNotification } from '../utils/notifications';

const router = Router();

// GET /api/products
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { category, search, status, lowStockOnly } = req.query;

    let sql = `
      SELECT 
        id, sku, name, description, category, unit,
        purchase_cost::float as "purchaseCost",
        selling_price::float as "sellingPrice",
        physical_stock as "physicalStock",
        reserved_stock as "reservedStock",
        (physical_stock - reserved_stock) as "availableStock",
        min_stock_level as "minStockLevel",
        reorder_quantity as "reorderQuantity",
        status, image_url as "imageUrl",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM sv_products
      WHERE 1=1
    `;
    const params: any[] = [];

    // Buyers shouldn't see discontinued products or internal purchase costs
    if (req.user?.role === 'BUYER') {
      sql += ` AND status != 'DISCONTINUED'`;
    }

    if (category && category !== 'ALL') {
      params.push(category);
      sql += ` AND category = $${params.length}`;
    }

    if (status && status !== 'ALL') {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }

    if (lowStockOnly === 'true') {
      sql += ` AND physical_stock <= min_stock_level`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (LOWER(name) LIKE LOWER($${params.length}) OR LOWER(sku) LIKE LOWER($${params.length}) OR LOWER(description) LIKE LOWER($${params.length}))`;
    }

    sql += ` ORDER BY name ASC;`;

    const result = await query(sql, params);

    // Hide purchase cost from Buyer
    const products = result.rows.map(p => {
      if (req.user?.role === 'BUYER') {
        const { purchaseCost, ...buyerSafe } = p;
        return buyerSafe;
      }
      return p;
    });

    return res.json(products);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/products/categories
router.get('/categories', authenticate, async (_req: Request, res: Response) => {
  try {
    const result = await query(`SELECT DISTINCT category FROM sv_products ORDER BY category ASC;`);
    return res.json(result.rows.map(r => r.category));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/products/:id
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT 
        id, sku, name, description, category, unit,
        purchase_cost::float as "purchaseCost",
        selling_price::float as "sellingPrice",
        physical_stock as "physicalStock",
        reserved_stock as "reservedStock",
        (physical_stock - reserved_stock) as "availableStock",
        min_stock_level as "minStockLevel",
        reorder_quantity as "reorderQuantity",
        status, image_url as "imageUrl",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM sv_products WHERE id = $1;
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const p = result.rows[0];
    if (req.user?.role === 'BUYER') {
      const { purchaseCost, ...buyerSafe } = p;
      return res.json(buyerSafe);
    }
    return res.json(p);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/products (Manager only)
router.post('/', authenticate, authorizeRoles('MANAGER'), async (req: Request, res: Response) => {
  const {
    sku, name, description, category, unit,
    purchaseCost, sellingPrice, physicalStock = 0,
    minStockLevel = 10, reorderQuantity = 50, imageUrl
  } = req.body;

  if (!sku || !name || !category || purchaseCost == null || sellingPrice == null) {
    return res.status(400).json({ error: 'SKU, name, category, purchaseCost, and sellingPrice are required.' });
  }

  if (purchaseCost < 0 || sellingPrice < 0) {
    return res.status(400).json({ error: 'Financial values in INR cannot be negative.' });
  }

  try {
    const existingSku = await query(`SELECT id FROM sv_products WHERE LOWER(sku) = LOWER($1);`, [sku.trim()]);
    if (existingSku.rows.length > 0) {
      return res.status(400).json({ error: `SKU '${sku}' already exists.` });
    }

    const initialStatus = physicalStock === 0 ? 'OUT_OF_STOCK' : (physicalStock <= minStockLevel ? 'LOW_STOCK' : 'ACTIVE');

    const result = await query(`
      INSERT INTO sv_products (
        sku, name, description, category, unit,
        purchase_cost, selling_price, physical_stock, reserved_stock,
        min_stock_level, reorder_quantity, status, image_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, $10, $11, $12)
      RETURNING *;
    `, [
      sku.trim().toUpperCase(), name.trim(), description || '', category.trim(), unit || 'Units',
      purchaseCost, sellingPrice, physicalStock, minStockLevel, reorderQuantity, initialStatus, imageUrl || null
    ]);

    const created = result.rows[0];

    // Log opening stock movement if physicalStock > 0
    if (physicalStock > 0) {
      await query(`
        INSERT INTO sv_inventory_movements (
          product_id, product_name, type, quantity,
          physical_before, physical_after, reserved_before, reserved_after,
          reason, performed_by
        ) VALUES ($1, $2, 'STOCK_IN', $3, 0, $3, 0, 0, 'Initial Catalogue Provisioning', $4);
      `, [created.id, created.name, physicalStock, req.user!.fullName]);
    }

    await logAudit(req.user!, 'CREATE_PRODUCT', 'PRODUCT', created.id, `Created product ${created.sku} (${created.name}) at ₹${sellingPrice}`);

    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT & PATCH /api/products/:id (Manager only)
const updateProductHandler = async (req: Request, res: Response) => {
  const { name, description, category, unit, purchaseCost, sellingPrice, minStockLevel, reorderQuantity, status, imageUrl } = req.body;

  try {
    const existing = await query(`SELECT * FROM sv_products WHERE id = $1;`, [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const current = existing.rows[0];
    const newStatus = status || (current.physical_stock === 0 ? 'OUT_OF_STOCK' : (current.physical_stock <= (minStockLevel || current.min_stock_level) ? 'LOW_STOCK' : 'ACTIVE'));
    const finalImageUrl = imageUrl !== undefined ? imageUrl : current.image_url;

    await query(`
      UPDATE sv_products SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        unit = COALESCE($4, unit),
        purchase_cost = COALESCE($5, purchase_cost),
        selling_price = COALESCE($6, selling_price),
        min_stock_level = COALESCE($7, min_stock_level),
        reorder_quantity = COALESCE($8, reorder_quantity),
        status = $9,
        image_url = $10,
        updated_at = NOW()
      WHERE id = $11;
    `, [name, description, category, unit, purchaseCost, sellingPrice, minStockLevel, reorderQuantity, newStatus, finalImageUrl, req.params.id]);

    await logAudit(req.user!, 'UPDATE_PRODUCT', 'PRODUCT', req.params.id, `Updated product details and image`);

    // Fetch formatted updated product
    const updatedRes = await query(`
      SELECT 
        id, sku, name, description, category, unit,
        purchase_cost::float as "purchaseCost",
        selling_price::float as "sellingPrice",
        physical_stock as "physicalStock",
        reserved_stock as "reservedStock",
        (physical_stock - reserved_stock) as "availableStock",
        min_stock_level as "minStockLevel",
        reorder_quantity as "reorderQuantity",
        status, image_url as "imageUrl",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM sv_products WHERE id = $1;
    `, [req.params.id]);

    return res.json(updatedRes.rows[0]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

router.put('/:id', authenticate, authorizeRoles('MANAGER'), updateProductHandler);
router.patch('/:id', authenticate, authorizeRoles('MANAGER'), updateProductHandler);

// POST /api/products/:id/adjust-stock (Manager or Staff)
router.post('/:id/adjust-stock', authenticate, authorizeRoles('MANAGER', 'STAFF'), async (req: Request, res: Response) => {
  const { type, quantity, reason } = req.body; // type: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT'

  if (!type || quantity == null || !reason) {
    return res.status(400).json({ error: 'Type, quantity, and reason are required.' });
  }

  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Quantity must be a positive integer.' });
  }

  try {
    const updatedProduct = await withTransaction(async (client) => {
      // Lock product row
      const pRes = await client.query(`SELECT * FROM sv_products WHERE id = $1 FOR UPDATE;`, [req.params.id]);
      if (pRes.rows.length === 0) {
        throw new Error('Product not found.');
      }

      const p = pRes.rows[0];
      const physicalBefore = p.physical_stock;
      const reservedBefore = p.reserved_stock;
      let physicalAfter = physicalBefore;

      if (type === 'STOCK_IN') {
        physicalAfter = physicalBefore + qty;
      } else if (type === 'STOCK_OUT') {
        const available = physicalBefore - reservedBefore;
        if (qty > available) {
          throw new Error(`Cannot stock-out ${qty} units. Only ${available} units available (${reservedBefore} reserved).`);
        }
        physicalAfter = physicalBefore - qty;
      } else if (type === 'ADJUSTMENT') {
        // Direct set to quantity or delta
        if (qty < reservedBefore) {
          throw new Error(`Cannot adjust physical stock below current reserved commitments (${reservedBefore} units).`);
        }
        physicalAfter = qty;
      } else {
        throw new Error(`Invalid stock adjustment type: ${type}`);
      }

      const newStatus = physicalAfter === 0 ? 'OUT_OF_STOCK' : (physicalAfter <= p.min_stock_level ? 'LOW_STOCK' : 'ACTIVE');

      // Update product
      const updateRes = await client.query(`
        UPDATE sv_products SET
          physical_stock = $1,
          status = $2,
          updated_at = NOW()
        WHERE id = $3
        RETURNING *;
      `, [physicalAfter, newStatus, p.id]);

      // Record movement
      await client.query(`
        INSERT INTO sv_inventory_movements (
          product_id, product_name, type, quantity,
          physical_before, physical_after, reserved_before, reserved_after,
          reason, performed_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
      `, [p.id, p.name, type, qty, physicalBefore, physicalAfter, reservedBefore, reservedBefore, reason, req.user!.fullName]);

      // If low stock, create notification
      if (newStatus === 'LOW_STOCK' || newStatus === 'OUT_OF_STOCK') {
        await client.query(`
          INSERT INTO sv_notifications (target_role, title, message, type)
          VALUES ('MANAGER', 'Inventory Alert: ' || $1, 'Product ' || $2 || ' stock adjusted to ' || $3 || ' units (' || $4 || ').', 'ALERT');
        `, [p.name, p.sku, physicalAfter, newStatus]);
      }

      return updateRes.rows[0];
    });

    await logAudit(req.user!, 'ADJUST_STOCK', 'PRODUCT', req.params.id, `${type} ${qty} units. Reason: ${reason}`);

    return res.json({
      success: true,
      product: updatedProduct,
      message: `Inventory updated successfully. New physical stock: ${updatedProduct.physical_stock} units.`,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

export default router;

