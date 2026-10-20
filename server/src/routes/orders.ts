import { Router, Request, Response } from 'express';
import { query, withTransaction } from '../db';
import { authenticate, authorizeRoles } from '../middleware/auth';
import { logAudit } from '../utils/audit';
import { createNotification } from '../utils/notifications';

const router = Router();

// GET /api/orders
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT 
        o.id, o.order_number as "orderNumber", o.buyer_id as "buyerId",
        o.buyer_name as "buyerName", o.buyer_email as "buyerEmail",
        o.status, o.subtotal::float as "subtotal", o.tax_amount::float as "taxAmount",
        o.total_amount::float as "totalAmount", o.shipping_address as "shippingAddress",
        o.city, o.postal_code as "postalCode", o.notes,
        o.created_at as "createdAt", o.updated_at as "updatedAt",
        s.id as "shipmentId", s.tracking_number as "trackingNumber",
        s.status as "shipmentStatus", s.assigned_agent_name as "assignedAgentName"
      FROM sv_orders o
      LEFT JOIN sv_shipments s ON s.order_id = o.id
      WHERE 1=1
    `;
    const params: any[] = [];

    // BUYER CAN ONLY SEE THEIR OWN ORDERS
    if (req.user!.role === 'BUYER') {
      params.push(req.user!.id);
      sql += ` AND o.buyer_id = $${params.length}`;
    }

    if (status && status !== 'ALL') {
      params.push(status);
      sql += ` AND o.status = $${params.length}`;
    }

    sql += ` ORDER BY o.created_at DESC;`;

    const result = await query(sql, params);
    return res.json(result.rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/:id
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const orderRes = await query(`
      SELECT 
        o.id, o.order_number as "orderNumber", o.buyer_id as "buyerId",
        o.buyer_name as "buyerName", o.buyer_email as "buyerEmail",
        o.status, o.subtotal::float as "subtotal", o.tax_amount::float as "taxAmount",
        o.total_amount::float as "totalAmount", o.shipping_address as "shippingAddress",
        o.city, o.postal_code as "postalCode", o.notes,
        o.created_at as "createdAt", o.updated_at as "updatedAt"
      FROM sv_orders o
      WHERE o.id = $1;
    `, [req.params.id]);

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const order = orderRes.rows[0];

    // Ownership check for Buyer
    if (req.user!.role === 'BUYER' && order.buyerId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized to view this order.' });
    }

    const itemsRes = await query(`
      SELECT 
        id, product_id as "productId", product_name as "productName",
        sku, quantity, unit_price::float as "unitPrice", total_price::float as "totalPrice",
        image_url as "imageUrl"
      FROM sv_order_items
      WHERE order_id = $1;
    `, [order.id]);

    const shipmentRes = await query(`
      SELECT 
        id, tracking_number as "trackingNumber", assigned_agent_id as "assignedAgentId",
        assigned_agent_name as "assignedAgentName", status, recipient_name as "recipientName",
        recipient_phone as "recipientPhone", delivery_address as "deliveryAddress",
        city, postal_code as "postalCode", estimated_delivery as "estimatedDelivery",
        dispatched_at as "dispatchedAt", delivered_at as "deliveredAt",
        delivery_notes as "deliveryNotes", failure_reason as "failureReason",
        attempts
      FROM sv_shipments
      WHERE order_id = $1;
    `, [order.id]);

    return res.json({
      ...order,
      items: itemsRes.rows,
      shipment: shipmentRes.rows[0] || null,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Handler for checkout / order placement
const checkoutHandler = async (req: Request, res: Response) => {
  const { items, shippingAddress, city, postalCode, notes } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one item is required in the cart.' });
  }

  if (!shippingAddress || !city || !postalCode) {
    return res.status(400).json({ error: 'Shipping address, city, and postal code are required.' });
  }

  try {
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

    const newOrder = await withTransaction(async (client) => {
      let subtotalINR = 0;
      const verifiedItems: any[] = [];

      for (const item of items) {
        const qty = parseInt(item.quantity, 10);
        if (isNaN(qty) || qty <= 0) {
          throw new Error('Invalid quantity requested.');
        }

        // Lock product row to prevent overselling
        const prodRes = await client.query(
          `SELECT id, sku, name, selling_price, physical_stock, reserved_stock, image_url FROM sv_products WHERE id = $1 FOR UPDATE;`,
          [item.productId]
        );

        if (prodRes.rows.length === 0) {
          throw new Error(`Product ${item.productId} not found.`);
        }

        const prod = prodRes.rows[0];
        const availableStock = prod.physical_stock - prod.reserved_stock;

        if (availableStock < qty) {
          throw new Error(
            `Insufficient available stock for '${prod.name}'. Requested: ${qty}, Available: ${availableStock} units (${prod.reserved_stock} reserved).`
          );
        }

        const unitPrice = parseFloat(prod.selling_price);
        const lineTotal = unitPrice * qty;
        subtotalINR += lineTotal;

        verifiedItems.push({
          productId: prod.id,
          sku: prod.sku,
          name: prod.name,
          quantity: qty,
          unitPrice,
          totalPrice: lineTotal,
          imageUrl: prod.image_url,
          currentPhysical: prod.physical_stock,
          currentReserved: prod.reserved_stock,
        });
      }

      // 18% GST calculation on server
      const taxAmountINR = Math.round((subtotalINR * 0.18) * 100) / 100;
      const totalAmountINR = Math.round((subtotalINR + taxAmountINR) * 100) / 100;

      // Insert Order
      const orderRes = await client.query(`
        INSERT INTO sv_orders (
          order_number, buyer_id, buyer_name, buyer_email,
          status, subtotal, tax_amount, total_amount,
          shipping_address, city, postal_code, notes
        ) VALUES ($1, $2, $3, $4, 'PLACED', $5, $6, $7, $8, $9, $10, $11)
        RETURNING *;
      `, [
        orderNumber, req.user!.id, req.user!.fullName, req.user!.email,
        subtotalINR, taxAmountINR, totalAmountINR,
        shippingAddress.trim(), city.trim(), postalCode.trim(), notes || null
      ]);

      const createdOrder = orderRes.rows[0];

      // Insert items and ATOMICALLY RESERVE STOCK
      for (const item of verifiedItems) {
        await client.query(`
          INSERT INTO sv_order_items (
            order_id, product_id, product_name, sku, quantity, unit_price, total_price, image_url
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
        `, [
          createdOrder.id, item.productId, item.name, item.sku,
          item.quantity, item.unitPrice, item.totalPrice, item.imageUrl
        ]);

        const newReserved = item.currentReserved + item.quantity;

        // Update product reserved stock
        await client.query(`
          UPDATE sv_products SET
            reserved_stock = $1,
            updated_at = NOW()
          WHERE id = $2;
        `, [newReserved, item.productId]);

        // Record stock reservation movement
        await client.query(`
          INSERT INTO sv_inventory_movements (
            product_id, product_name, type, quantity,
            physical_before, physical_after, reserved_before, reserved_after,
            reason, reference_id, performed_by
          ) VALUES ($1, $2, 'ORDER_RESERVED', $3, $4, $4, $5, $6, $7, $8, $9);
        `, [
          item.productId, item.name, item.quantity,
          item.currentPhysical, item.currentReserved, newReserved,
          `Stock reserved for buyer order ${orderNumber}`, orderNumber, req.user!.fullName
        ]);
      }

      return createdOrder;
    });

    await logAudit(req.user!, 'BUYER_CHECKOUT', 'ORDER', newOrder.id, `Order ${orderNumber} placed for ₹${newOrder.total_amount}`);

    await createNotification({
      targetRole: 'MANAGER',
      title: `New Buyer Order: ${orderNumber}`,
      message: `${req.user!.fullName} placed an order for ₹${parseFloat(newOrder.total_amount).toLocaleString('en-IN')}`,
      type: 'INFO',
    });

    return res.status(201).json({
      success: true,
      order: newOrder,
      message: 'Order placed successfully. Inventory has been reserved.',
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

// Register checkout endpoints (both POST / and POST /checkout)
router.post('/checkout', authenticate, checkoutHandler);
router.post('/', authenticate, checkoutHandler);

// Handler for order status updates (Staff or Manager updates order fulfilment status)
const orderStatusHandler = async (req: Request, res: Response) => {
  const { status } = req.body; // 'CONFIRMED' | 'PROCESSING' | 'PACKED' | 'DISPATCHED' | 'DELIVERED'

  if (!status) {
    return res.status(400).json({ error: 'Status is required.' });
  }

  try {
    const updated = await withTransaction(async (client) => {
      const orderRes = await client.query(`SELECT * FROM sv_orders WHERE id = $1 FOR UPDATE;`, [req.params.id]);
      if (orderRes.rows.length === 0) {
        throw new Error('Order not found.');
      }
      const order = orderRes.rows[0];

      // Update order status
      const updatedOrderRes = await client.query(`
        UPDATE sv_orders SET
          status = $1,
          updated_at = NOW()
        WHERE id = $2
        RETURNING *;
      `, [status, order.id]);

      // If status changed to PACKED, automatically generate shipment if none exists
      if (status === 'PACKED' || status === 'DISPATCHED') {
        const existingShipment = await client.query(`SELECT id FROM sv_shipments WHERE order_id = $1;`, [order.id]);
        if (existingShipment.rows.length === 0) {
          const trackingNumber = `TRK-${Date.now().toString().slice(-8)}`;
          await client.query(`
            INSERT INTO sv_shipments (
              order_id, order_number, tracking_number, status,
              recipient_name, recipient_phone, delivery_address,
              city, postal_code, total_amount
            ) VALUES ($1, $2, $3, 'ASSIGNED', $4, $5, $6, $7, $8, $9);
          `, [
            order.id, order.order_number, trackingNumber,
            order.buyer_name, '+91 98200 34567', order.shipping_address,
            order.city, order.postal_code, order.total_amount
          ]);
        }
      }

      // If status changed to DISPATCHED: DEDUCT PHYSICAL AND RESERVED STOCK!
      if (status === 'DISPATCHED' && order.status !== 'DISPATCHED' && order.status !== 'DELIVERED') {
        const items = await client.query(`SELECT * FROM sv_order_items WHERE order_id = $1;`, [order.id]);
        for (const item of items.rows) {
          const prodRes = await client.query(`SELECT * FROM sv_products WHERE id = $1 FOR UPDATE;`, [item.product_id]);
          if (prodRes.rows.length > 0) {
            const prod = prodRes.rows[0];
            const physicalBefore = prod.physical_stock;
            const reservedBefore = prod.reserved_stock;
            const physicalAfter = Math.max(0, physicalBefore - item.quantity);
            const reservedAfter = Math.max(0, reservedBefore - item.quantity);
            const newStatus = physicalAfter === 0 ? 'OUT_OF_STOCK' : (physicalAfter <= prod.min_stock_level ? 'LOW_STOCK' : 'ACTIVE');

            await client.query(`
              UPDATE sv_products SET
                physical_stock = $1,
                reserved_stock = $2,
                status = $3,
                updated_at = NOW()
              WHERE id = $4;
            `, [physicalAfter, reservedAfter, newStatus, prod.id]);

            await client.query(`
              INSERT INTO sv_inventory_movements (
                product_id, product_name, type, quantity,
                physical_before, physical_after, reserved_before, reserved_after,
                reason, reference_id, performed_by
              ) VALUES ($1, $2, 'ORDER_DISPATCHED', $3, $4, $5, $6, $7, $8, $9, $10);
            `, [
              prod.id, prod.name, item.quantity,
              physicalBefore, physicalAfter, reservedBefore, reservedAfter,
              `Dispatched for delivery: order ${order.order_number}`, order.order_number, req.user!.fullName
            ]);
          }
        }
      }

      return updatedOrderRes.rows[0];
    });

    await logAudit(req.user!, 'UPDATE_ORDER_STATUS', 'ORDER', req.params.id, `Status updated to ${status}`);

    // Notify Buyer
    await createNotification({
      userId: updated.buyer_id,
      title: `Order Status Update: ${updated.order_number}`,
      message: `Your order is now in '${status}' status.`,
      type: status === 'DELIVERED' ? 'SUCCESS' : 'INFO',
    });

    return res.json({ success: true, order: updated });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

// Register both POST and PATCH for order status updates
router.post('/:id/status', authenticate, authorizeRoles('MANAGER', 'STAFF'), orderStatusHandler);
router.patch('/:id/status', authenticate, authorizeRoles('MANAGER', 'STAFF'), orderStatusHandler);

// POST /api/orders/:id/cancel (Buyer or Manager - releases reserved stock!)
router.post('/:id/cancel', authenticate, async (req: Request, res: Response) => {
  try {
    const cancelled = await withTransaction(async (client) => {
      const orderRes = await client.query(`SELECT * FROM sv_orders WHERE id = $1 FOR UPDATE;`, [req.params.id]);
      if (orderRes.rows.length === 0) {
        throw new Error('Order not found.');
      }
      const order = orderRes.rows[0];

      if (req.user!.role === 'BUYER' && order.buyer_id !== req.user!.id) {
        throw new Error('Unauthorized to cancel this order.');
      }

      if (order.status !== 'PLACED' && order.status !== 'CONFIRMED') {
        throw new Error(`Order cannot be cancelled in '${order.status}' status.`);
      }

      // Release reserved stock back to available pool
      const items = await client.query(`SELECT * FROM sv_order_items WHERE order_id = $1;`, [order.id]);
      for (const item of items.rows) {
        const prodRes = await client.query(`SELECT * FROM sv_products WHERE id = $1 FOR UPDATE;`, [item.product_id]);
        if (prodRes.rows.length > 0) {
          const prod = prodRes.rows[0];
          const reservedBefore = prod.reserved_stock;
          const reservedAfter = Math.max(0, reservedBefore - item.quantity);

          await client.query(`
            UPDATE sv_products SET
              reserved_stock = $1,
              updated_at = NOW()
            WHERE id = $2;
          `, [reservedAfter, prod.id]);

          await client.query(`
            INSERT INTO sv_inventory_movements (
              product_id, product_name, type, quantity,
              physical_before, physical_after, reserved_before, reserved_after,
              reason, reference_id, performed_by
            ) VALUES ($1, $2, 'ORDER_RELEASED', $3, $4, $4, $5, $6, $7, $8, $9);
          `, [
            prod.id, prod.name, item.quantity,
            prod.physical_stock, reservedBefore, reservedAfter,
            `Cancellation of order ${order.order_number}. Reservation released.`, order.order_number, req.user!.fullName
          ]);
        }
      }

      const updateRes = await client.query(`
        UPDATE sv_orders SET
          status = 'CANCELLED',
          updated_at = NOW()
        WHERE id = $1
        RETURNING *;
      `, [order.id]);

      return updateRes.rows[0];
    });

    await logAudit(req.user!, 'CANCEL_ORDER', 'ORDER', req.params.id, `Cancelled order ${cancelled.order_number}`);

    return res.json({
      success: true,
      order: cancelled,
      message: 'Order cancelled successfully and stock reservation released.',
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

export default router;

