import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:root@localhost:5432/supplyvault';
const isCloudDb = connectionString.includes('neon.tech') || 
                  connectionString.includes('supabase.co') || 
                  connectionString.includes('render.com') ||
                  connectionString.includes('sslmode=require') ||
                  (process.env.NODE_ENV === 'production' && !connectionString.includes('localhost'));

export const pool = new Pool({
  connectionString,
  ssl: isCloudDb ? { rejectUnauthorized: false } : false,
});

// Helper for queries
export async function query<T extends pg.QueryResultRow = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}

// Transaction helper
export async function withTransaction<T>(callback: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Initialize tables and seed initial data
export async function initDb() {
  console.log('[DB] Initializing SupplyVault database schema...');

  // Check if existing sv_users table has incompatible schema (e.g. from old Drizzle migration)
  try {
    const tableExists = await query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'sv_users';
    `);
    if (tableExists.rows.length > 0) {
      const colCheck = await query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'sv_users' AND column_name = 'username';
      `);
      if (colCheck.rows.length === 0) {
        console.log('[DB] Detected legacy/incompatible schema. Dropping old tables to establish fresh enterprise schema...');
        await query(`
          DROP TABLE IF EXISTS sv_audit_logs CASCADE;
          DROP TABLE IF EXISTS sv_delivery_events CASCADE;
          DROP TABLE IF EXISTS sv_inventory_movements CASCADE;
          DROP TABLE IF EXISTS sv_notifications CASCADE;
          DROP TABLE IF EXISTS sv_order_events CASCADE;
          DROP TABLE IF EXISTS sv_order_items CASCADE;
          DROP TABLE IF EXISTS sv_orders CASCADE;
          DROP TABLE IF EXISTS sv_purchase_order_items CASCADE;
          DROP TABLE IF EXISTS sv_purchase_orders CASCADE;
          DROP TABLE IF EXISTS sv_restock_requests CASCADE;
          DROP TABLE IF EXISTS sv_sessions CASCADE;
          DROP TABLE IF EXISTS sv_shipments CASCADE;
          DROP TABLE IF EXISTS sv_suppliers CASCADE;
          DROP TABLE IF EXISTS sv_products CASCADE;
          DROP TABLE IF EXISTS sv_users CASCADE;
        `);
      }
    }
  } catch (err) {
    console.warn('[DB] Schema check warning:', err);
  }

  // 1. Users table
  await query(`
    CREATE TABLE IF NOT EXISTS sv_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(100) NOT NULL,
      role VARCHAR(20) NOT NULL CHECK (role IN ('MANAGER', 'STAFF', 'BUYER', 'DELIVERY_AGENT')),
      phone VARCHAR(20),
      avatar_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 2. Suppliers table
  await query(`
    CREATE TABLE IF NOT EXISTS sv_suppliers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(150) NOT NULL,
      contact_person VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      address TEXT NOT NULL,
      city VARCHAR(50) NOT NULL,
      lead_time_days INT DEFAULT 5,
      status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
      rating NUMERIC(3, 2) DEFAULT 4.5,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 3. Products table (strictly INR-only prices with DECIMAL(12, 2))
  await query(`
    CREATE TABLE IF NOT EXISTS sv_products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sku VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(200) NOT NULL,
      description TEXT,
      category VARCHAR(50) NOT NULL,
      unit VARCHAR(20) NOT NULL DEFAULT 'Units',
      purchase_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
      selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
      physical_stock INT NOT NULL DEFAULT 0,
      reserved_stock INT NOT NULL DEFAULT 0,
      min_stock_level INT NOT NULL DEFAULT 10,
      reorder_quantity INT NOT NULL DEFAULT 50,
      status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'LOW_STOCK', 'OUT_OF_STOCK', 'DISCONTINUED')),
      image_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 4. Inventory Movements table
  await query(`
    CREATE TABLE IF NOT EXISTS sv_inventory_movements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID REFERENCES sv_products(id) ON DELETE CASCADE,
      product_name VARCHAR(200) NOT NULL,
      type VARCHAR(30) NOT NULL CHECK (type IN ('STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'GOODS_RECEIPT', 'ORDER_RESERVED', 'ORDER_RELEASED', 'ORDER_DISPATCHED')),
      quantity INT NOT NULL,
      physical_before INT NOT NULL,
      physical_after INT NOT NULL,
      reserved_before INT NOT NULL,
      reserved_after INT NOT NULL,
      reason TEXT NOT NULL,
      reference_id VARCHAR(100),
      performed_by VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 5. Restock Requests table
  await query(`
    CREATE TABLE IF NOT EXISTS sv_restock_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID REFERENCES sv_products(id) ON DELETE CASCADE,
      product_name VARCHAR(200) NOT NULL,
      current_stock INT NOT NULL,
      requested_quantity INT NOT NULL,
      approved_quantity INT,
      priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
      reason TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'ORDERED', 'FULFILLED')),
      requested_by UUID REFERENCES sv_users(id),
      requester_name VARCHAR(100) NOT NULL,
      reviewed_by UUID REFERENCES sv_users(id),
      reviewer_notes TEXT,
      purchase_order_id UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 6. Purchase Orders table
  await query(`
    CREATE TABLE IF NOT EXISTS sv_purchase_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      po_number VARCHAR(50) UNIQUE NOT NULL,
      supplier_id UUID REFERENCES sv_suppliers(id),
      supplier_name VARCHAR(150) NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CLOSED', 'REJECTED')),
      total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
      expected_delivery_date DATE,
      notes TEXT,
      created_by UUID REFERENCES sv_users(id),
      approved_by UUID REFERENCES sv_users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 7. Purchase Order Items table
  await query(`
    CREATE TABLE IF NOT EXISTS sv_purchase_order_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      purchase_order_id UUID REFERENCES sv_purchase_orders(id) ON DELETE CASCADE,
      product_id UUID REFERENCES sv_products(id),
      product_name VARCHAR(200) NOT NULL,
      quantity INT NOT NULL,
      unit_cost NUMERIC(12, 2) NOT NULL,
      total_cost NUMERIC(12, 2) NOT NULL,
      received_quantity INT DEFAULT 0
    );
  `);

  // 8. Buyer Orders table
  await query(`
    CREATE TABLE IF NOT EXISTS sv_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_number VARCHAR(50) UNIQUE NOT NULL,
      buyer_id UUID REFERENCES sv_users(id),
      buyer_name VARCHAR(100) NOT NULL,
      buyer_email VARCHAR(100) NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'PLACED' CHECK (status IN ('PLACED', 'CONFIRMED', 'PROCESSING', 'PACKED', 'DISPATCHED', 'DELIVERED', 'CANCELLED')),
      subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
      tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
      total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
      shipping_address TEXT NOT NULL,
      city VARCHAR(50) NOT NULL,
      postal_code VARCHAR(20) NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 9. Buyer Order Items table
  await query(`
    CREATE TABLE IF NOT EXISTS sv_order_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID REFERENCES sv_orders(id) ON DELETE CASCADE,
      product_id UUID REFERENCES sv_products(id),
      product_name VARCHAR(200) NOT NULL,
      sku VARCHAR(50) NOT NULL,
      quantity INT NOT NULL,
      unit_price NUMERIC(12, 2) NOT NULL,
      total_price NUMERIC(12, 2) NOT NULL,
      image_url TEXT
    );
  `);

  // 10. Shipments table
  await query(`
    CREATE TABLE IF NOT EXISTS sv_shipments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID REFERENCES sv_orders(id) ON DELETE CASCADE,
      order_number VARCHAR(50) NOT NULL,
      tracking_number VARCHAR(50) UNIQUE NOT NULL,
      assigned_agent_id UUID REFERENCES sv_users(id),
      assigned_agent_name VARCHAR(100),
      status VARCHAR(30) NOT NULL DEFAULT 'ASSIGNED' CHECK (status IN ('ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED_ATTEMPT')),
      recipient_name VARCHAR(100) NOT NULL,
      recipient_phone VARCHAR(20) NOT NULL,
      delivery_address TEXT NOT NULL,
      city VARCHAR(50) NOT NULL,
      postal_code VARCHAR(20) NOT NULL,
      estimated_delivery DATE,
      dispatched_at TIMESTAMPTZ,
      delivered_at TIMESTAMPTZ,
      delivery_notes TEXT,
      failure_reason TEXT,
      attempts JSONB DEFAULT '[]'::jsonb,
      total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 11. Notifications table
  await query(`
    CREATE TABLE IF NOT EXISTS sv_notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES sv_users(id) ON DELETE CASCADE,
      target_role VARCHAR(20) CHECK (target_role IN ('ALL', 'MANAGER', 'STAFF', 'BUYER', 'DELIVERY_AGENT')),
      title VARCHAR(150) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(20) NOT NULL DEFAULT 'INFO' CHECK (type IN ('INFO', 'SUCCESS', 'WARNING', 'ALERT')),
      read BOOLEAN NOT NULL DEFAULT FALSE,
      reference_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 12. Audit Logs table
  await query(`
    CREATE TABLE IF NOT EXISTS sv_audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      actor_id UUID,
      actor_name VARCHAR(100) NOT NULL,
      actor_role VARCHAR(20) NOT NULL,
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50) NOT NULL,
      entity_id VARCHAR(100) NOT NULL,
      details TEXT,
      ip_address VARCHAR(50),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Seed default users if none exist
  const existingUsers = await query(`SELECT count(*) as count FROM sv_users;`);
  if (parseInt(existingUsers.rows[0].count) === 0) {
    console.log('[DB] Seeding primary demo roles...');
    const salt = await bcrypt.genSalt(10);
    const managerHash = await bcrypt.hash('manager123', salt);
    const staffHash = await bcrypt.hash('staff123', salt);
    const buyerHash = await bcrypt.hash('buyer123', salt);
    const agentHash = await bcrypt.hash('agent123', salt);

    await query(`
      INSERT INTO sv_users (username, email, password_hash, full_name, role, phone) VALUES
      ('manager', 'manager@supplyvault.in', $1, 'Aarav Singhania', 'MANAGER', '+91 98200 12345'),
      ('staff', 'staff@supplyvault.in', $2, 'Priya Sharma', 'STAFF', '+91 98200 23456'),
      ('buyer', 'buyer@enterprise.in', $3, 'Rohan Mehta', 'BUYER', '+91 98200 34567'),
      ('agent', 'agent@logistics.in', $4, 'Vikram Deshmukh', 'DELIVERY_AGENT', '+91 98200 45678');
    `, [managerHash, staffHash, buyerHash, agentHash]);
  }

  // Seed suppliers if none exist
  const existingSuppliers = await query(`SELECT count(*) as count FROM sv_suppliers;`);
  if (parseInt(existingSuppliers.rows[0].count) === 0) {
    console.log('[DB] Seeding luxury enterprise suppliers...');
    await query(`
      INSERT INTO sv_suppliers (name, contact_person, email, phone, address, city, lead_time_days, rating) VALUES
      ('Titan Precision Metallurgy Ltd', 'Rajesh Verma', 'supplies@titanprecision.co.in', '+91 22 6678 1100', 'Plot 44, MIDC Industrial Area, Andheri East', 'Mumbai', 4, 4.8),
      ('Kaveri Silk & High-Grade Textiles', 'Lakshmi Narayanan', 'orders@kaveritextiles.in', '+91 80 4123 9088', 'Phase II, Peenya Industrial Estate', 'Bengaluru', 3, 4.9),
      ('Apex Polymer & Luxury Packaging', 'Suresh Gupta', 'b2b@apexpackaging.in', '+91 11 2876 5432', 'Okhla Industrial Area, Phase III', 'New Delhi', 5, 4.6),
      ('Coromandel Advanced Electronics', 'M. Annamalai', 'sales@coromandelelec.com', '+91 44 2490 8765', 'SIPCOT Industrial Complex, Sriperumbudur', 'Chennai', 6, 4.7);
    `);
  }

  // Seed products if none exist
  const existingProducts = await query(`SELECT count(*) as count FROM sv_products;`);
  if (parseInt(existingProducts.rows[0].count) === 0) {
    console.log('[DB] Seeding INR-based luxury enterprise catalogue...');
    await query(`
      INSERT INTO sv_products (sku, name, description, category, unit, purchase_cost, selling_price, physical_stock, reserved_stock, min_stock_level, reorder_quantity, status, image_url) VALUES
      ('SV-AERO-01', 'AeroGrade Titanium Alloy Sheets', 'Precision cold-rolled aerospace grade 5 titanium alloy for structural assemblies.', 'Raw Materials', 'Sheets', 12500.00, 18900.00, 45, 0, 15, 30, 'ACTIVE', 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=600&q=80'),
      ('SV-BOX-09', 'Velvet-Lined Magnetic Presentation Vaults', 'Handcrafted matte obsidian rigid gift vaults with champagne gold debossed foil.', 'Luxury Packaging', 'Units', 480.00, 950.00, 180, 0, 50, 150, 'ACTIVE', 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=80'),
      ('SV-SENS-42', 'Industrial IoT Telemetry Micro-Sensors', 'Hermetically sealed multi-axis vibration and thermal monitoring nodes.', 'Hardware & Components', 'Units', 2400.00, 3950.00, 8, 0, 20, 50, 'LOW_STOCK', 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80'),
      ('SV-FIB-18', 'Prepreg Carbon Fiber Weave Spools', 'High-tensile unidirectional 3K carbon composite tow for precision tooling.', 'Raw Materials', 'Rolls', 8900.00, 13500.00, 28, 0, 10, 25, 'ACTIVE', 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80'),
      ('SV-VAL-77', 'Precision Stainless Diaphragm Valves', 'Ultra-clean 316L electropolished fluid control valves for pharmaceutical lines.', 'Hardware & Components', 'Units', 4200.00, 6800.00, 62, 0, 15, 40, 'ACTIVE', 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80'),
      ('SV-SEAL-03', 'Tamper-Evident Holographic Security Seals', 'Sequential barcode etched security seals for cross-border vault transport.', 'Logistics Supplies', 'Packs', 350.00, 650.00, 0, 0, 30, 100, 'OUT_OF_STOCK', 'https://images.unsplash.com/photo-1607344645866-009c320b5ab8?auto=format&fit=crop&w=600&q=80');
    `);
  }

  // Seed sample restock request, PO, and sample order for rich initial state
  const existingRequests = await query(`SELECT count(*) as count FROM sv_restock_requests;`);
  if (parseInt(existingRequests.rows[0].count) === 0) {
    const pLow = await query(`SELECT id, name, physical_stock FROM sv_products WHERE sku = 'SV-SENS-42' LIMIT 1;`);
    const uStaff = await query(`SELECT id, full_name FROM sv_users WHERE role = 'STAFF' LIMIT 1;`);
    if (pLow.rows.length && uStaff.rows.length) {
      await query(`
        INSERT INTO sv_restock_requests (product_id, product_name, current_stock, requested_quantity, priority, reason, status, requested_by, requester_name) VALUES
        ($1, $2, $3, 40, 'URGENT', 'Critical telemetry inventory below reorder point of 20 units.', 'PENDING', $4, $5);
      `, [pLow.rows[0].id, pLow.rows[0].name, pLow.rows[0].physical_stock, uStaff.rows[0].id, uStaff.rows[0].full_name]);
    }
  }

  // Seed sample Purchase Orders if none exist
  const existingPOs = await query(`SELECT count(*) as count FROM sv_purchase_orders;`);
  if (parseInt(existingPOs.rows[0].count) === 0) {
    const supp = await query(`SELECT id, name FROM sv_suppliers WHERE name LIKE 'Titan%' LIMIT 1;`);
    const prod = await query(`SELECT id, name, purchase_cost FROM sv_products WHERE sku = 'SV-AERO-01' LIMIT 1;`);
    const mgr = await query(`SELECT id FROM sv_users WHERE role = 'MANAGER' LIMIT 1;`);
    if (supp.rows.length && prod.rows.length && mgr.rows.length) {
      const poRes = await query(`
        INSERT INTO sv_purchase_orders (po_number, supplier_id, supplier_name, status, total_amount, expected_delivery_date, notes, created_by, approved_by)
        VALUES ('PO-2026-001', $1, $2, 'APPROVED', 375000.00, CURRENT_DATE + INTERVAL '5 days', 'Priority replenishment batch for titanium alloy plates.', $3, $3)
        RETURNING id;
      `, [supp.rows[0].id, supp.rows[0].name, mgr.rows[0].id]);

      await query(`
        INSERT INTO sv_purchase_order_items (purchase_order_id, product_id, product_name, quantity, unit_cost, total_cost, received_quantity)
        VALUES ($1, $2, $3, 30, $4, 375000.00, 0);
      `, [poRes.rows[0].id, prod.rows[0].id, prod.rows[0].name, prod.rows[0].purchase_cost]);
    }
  }

  // Seed sample Orders and Shipments if none exist
  const existingOrders = await query(`SELECT count(*) as count FROM sv_orders;`);
  if (parseInt(existingOrders.rows[0].count) === 0) {
    const buyer = await query(`SELECT id, full_name, email, phone FROM sv_users WHERE role = 'BUYER' LIMIT 1;`);
    const agent = await query(`SELECT id, full_name, phone FROM sv_users WHERE role = 'DELIVERY_AGENT' LIMIT 1;`);
    const p1 = await query(`SELECT id, sku, name, selling_price, image_url FROM sv_products WHERE sku = 'SV-AERO-01' LIMIT 1;`);
    const p2 = await query(`SELECT id, sku, name, selling_price, image_url FROM sv_products WHERE sku = 'SV-BOX-09' LIMIT 1;`);
    const p3 = await query(`SELECT id, sku, name, selling_price, image_url FROM sv_products WHERE sku = 'SV-VAL-77' LIMIT 1;`);

    if (buyer.rows.length && agent.rows.length && p1.rows.length && p2.rows.length) {
      const bId = buyer.rows[0].id;
      const bName = buyer.rows[0].full_name;
      const bEmail = buyer.rows[0].email;
      const agId = agent.rows[0].id;
      const agName = agent.rows[0].full_name;

      // 1. Order in CONFIRMED state (ready for warehouse staff to pack)
      const ord1 = await query(`
        INSERT INTO sv_orders (order_number, buyer_id, buyer_name, buyer_email, status, subtotal, tax_amount, total_amount, shipping_address, city, postal_code, notes)
        VALUES ('ORD-2026-001', $1, $2, $3, 'CONFIRMED', 37800.00, 6804.00, 44604.00, 'Tower B, Tech Mahindra Tech Park, Hinjewadi Phase 3', 'Pune', '411057', 'Deliver to Bay 4 Loading Dock.')
        RETURNING id;
      `, [bId, bName, bEmail]);

      await query(`
        INSERT INTO sv_order_items (order_id, product_id, product_name, sku, quantity, unit_price, total_price, image_url)
        VALUES ($1, $2, $3, $4, 2, $5, 37800.00, $6);
      `, [ord1.rows[0].id, p1.rows[0].id, p1.rows[0].name, p1.rows[0].sku, p1.rows[0].selling_price, p1.rows[0].image_url]);

      await query(`UPDATE sv_products SET reserved_stock = reserved_stock + 2 WHERE id = $1`, [p1.rows[0].id]);

      // 2. Order in DISPATCHED state with OUT_FOR_DELIVERY shipment
      const ord2 = await query(`
        INSERT INTO sv_orders (order_number, buyer_id, buyer_name, buyer_email, status, subtotal, tax_amount, total_amount, shipping_address, city, postal_code, notes)
        VALUES ('ORD-2026-002', $1, $2, $3, 'DISPATCHED', 9500.00, 1710.00, 11210.00, 'Godrej One, 10th Floor, Pirojshanagar, Vikhroli East', 'Mumbai', '400079', 'Contact security for pass upon arrival.')
        RETURNING id;
      `, [bId, bName, bEmail]);

      await query(`
        INSERT INTO sv_order_items (order_id, product_id, product_name, sku, quantity, unit_price, total_price, image_url)
        VALUES ($1, $2, $3, $4, 10, $5, 9500.00, $6);
      `, [ord2.rows[0].id, p2.rows[0].id, p2.rows[0].name, p2.rows[0].sku, p2.rows[0].selling_price, p2.rows[0].image_url]);

      await query(`
        INSERT INTO sv_shipments (order_id, order_number, tracking_number, assigned_agent_id, assigned_agent_name, status, recipient_name, recipient_phone, delivery_address, city, postal_code, estimated_delivery, dispatched_at, total_amount)
        VALUES ($1, 'ORD-2026-002', 'TRK-IN-889021', $2, $3, 'OUT_FOR_DELIVERY', $4, '+91 98200 34567', 'Godrej One, 10th Floor, Pirojshanagar, Vikhroli East', 'Mumbai', '400079', CURRENT_DATE, NOW() - INTERVAL '3 hours', 11210.00);
      `, [ord2.rows[0].id, agId, agName, bName]);

      // 3. Order in DELIVERED state
      if (p3.rows.length) {
        const ord3 = await query(`
          INSERT INTO sv_orders (order_number, buyer_id, buyer_name, buyer_email, status, subtotal, tax_amount, total_amount, shipping_address, city, postal_code, notes)
          VALUES ('ORD-2026-003', $1, $2, $3, 'DELIVERED', 34000.00, 6120.00, 40120.00, 'Prestige Tech Park, Marathahalli-Sarjapur Ring Rd', 'Bengaluru', '560103', 'Handed over to Receiving Dept.')
          RETURNING id;
        `, [bId, bName, bEmail]);

        await query(`
          INSERT INTO sv_order_items (order_id, product_id, product_name, sku, quantity, unit_price, total_price, image_url)
          VALUES ($1, $2, $3, $4, 5, $5, 34000.00, $6);
        `, [ord3.rows[0].id, p3.rows[0].id, p3.rows[0].name, p3.rows[0].sku, p3.rows[0].selling_price, p3.rows[0].image_url]);

        await query(`
          INSERT INTO sv_shipments (order_id, order_number, tracking_number, assigned_agent_id, assigned_agent_name, status, recipient_name, recipient_phone, delivery_address, city, postal_code, estimated_delivery, dispatched_at, delivered_at, total_amount)
          VALUES ($1, 'ORD-2026-003', 'TRK-IN-884019', $2, $3, 'DELIVERED', $4, '+91 98200 34567', 'Prestige Tech Park, Marathahalli-Sarjapur Ring Rd', 'Bengaluru', '560103', CURRENT_DATE - INTERVAL '2 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days', 40120.00);
        `, [ord3.rows[0].id, agId, agName, bName]);
      }
    }
  }

  // Seed sample inventory movements for timeline charts if none exist
  const existingMovements = await query(`SELECT count(*) as count FROM sv_inventory_movements;`);
  if (parseInt(existingMovements.rows[0].count) === 0) {
    const products = await query(`SELECT id, sku, name, physical_stock FROM sv_products;`);
    for (const p of products.rows) {
      await query(`
        INSERT INTO sv_inventory_movements (product_id, product_name, type, quantity, physical_before, physical_after, reserved_before, reserved_after, reason, performed_by, created_at)
        VALUES ($1, $2, 'STOCK_IN', $3, 0, $3, 0, 0, 'Initial catalog balance audit', 'System Seeder', NOW() - INTERVAL '5 days');
      `, [p.id, p.name, p.physical_stock]);
    }
  }

  // Seed welcome notification
  const existingNotifications = await query(`SELECT count(*) as count FROM sv_notifications;`);
  if (parseInt(existingNotifications.rows[0].count) === 0) {
    await query(`
      INSERT INTO sv_notifications (target_role, title, message, type) VALUES
      ('ALL', 'SupplyVault Platform Operational', 'Enterprise supply chain system online with strict INR currency governance and four authorized role portals.', 'INFO'),
      ('MANAGER', 'Restock Request Requires Review', 'Urgent stock requisition submitted for Industrial IoT Telemetry Micro-Sensors.', 'WARNING'),
      ('STAFF', 'Telemetry Stock Alert', 'Product SV-SENS-42 is below safety threshold (8 units remaining).', 'ALERT');
    `);
  }

  console.log('[DB] Database schema and initial seed data verified successfully.');
}
