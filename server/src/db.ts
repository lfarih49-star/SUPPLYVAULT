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

  // Detect and migrate legacy industrial catalogue to Computer Hardware & Laptops wholesale catalogue
  try {
    const legacyCheck = await query(`SELECT COUNT(*) as count FROM sv_products WHERE sku LIKE 'SV-%';`);
    if (parseInt(legacyCheck.rows[0].count) > 0) {
      console.log('[DB] Detected legacy catalogue. Migrating to Computer Hardware & Laptops Wholesale catalogue...');
      await query(`
        TRUNCATE TABLE sv_inventory_movements, sv_order_items, sv_shipments, sv_orders,
                       sv_purchase_order_items, sv_purchase_orders, sv_restock_requests,
                       sv_products, sv_suppliers CASCADE;
      `);
      console.log('[DB] Legacy tables truncated cleanly.');
    }
  } catch (err) {
    console.warn('[DB] Legacy migration check warning:', err);
  }

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
      ('manager', 'faizal.rahman@supplyvault.kerala.in', $1, 'Faizal Rahman', 'MANAGER', '+91 98470 12345'),
      ('staff', 'anjali.menon@supplyvault.kerala.in', $2, 'Anjali Menon', 'STAFF', '+91 94471 23456'),
      ('buyer', 'rahul.nair@malabarinfotech.in', $3, 'Rahul Nair', 'BUYER', '+91 97452 34567'),
      ('agent', 'bilal.logistics@supplyvault.kerala.in', $4, 'Muhammed Bilal', 'DELIVERY_AGENT', '+91 98953 45678');
    `, [managerHash, staffHash, buyerHash, agentHash]);
  }

  // Seed suppliers (Kerala Regional IT Hardware & PC Distributors) if none exist
  const existingSuppliers = await query(`SELECT count(*) as count FROM sv_suppliers;`);
  if (parseInt(existingSuppliers.rows[0].count) === 0) {
    console.log('[DB] Seeding Kerala regional IT hardware & laptop distributors...');
    await query(`
      INSERT INTO sv_suppliers (name, contact_person, email, phone, address, city, lead_time_days, rating) VALUES
      ('Redington India Limited - Kochi Regional Hub', 'Venkatesh Ramanathan', 'kochi.procurement@redingtongroup.com', '+91 484 280 4353', 'Building No. 39/4122, Ravipuram Road, Valanjambalam', 'Kochi', 2, 4.9),
      ('Ingram Micro India Pvt Ltd - Ernakulam Hub', 'K. P. Jayakrishnan', 'kerala.enterprise@ingrammicro.co.in', '+91 484 411 9000', 'Ground Floor, Kaloor-Kadavanthra Road, Kathrikadavu, Kaloor', 'Kochi', 2, 4.8),
      ('Savex Technologies Pvt Ltd - Palarivattom Logistics', 'Devanand Namboodiri', 'kerala.b2b@savex.org', '+91 484 234 1820', 'Door No. 32/2855, Pipeline Road, Palarivattom', 'Kochi', 3, 4.7),
      ('Supertron Infotech Pvt Ltd - Kozhikode Branch', 'K. M. Haris', 'calicut.hardware@supertronindia.com', '+91 495 272 5678', '2nd Floor, Malabar Gate Complex, Ram Mohan Road', 'Kozhikode', 3, 4.6);
    `);
  }

  // Seed products (Computer Hardware & Laptops) if none exist
  const existingProducts = await query(`SELECT count(*) as count FROM sv_products;`);
  if (parseInt(existingProducts.rows[0].count) === 0) {
    console.log('[DB] Seeding Computer Hardware & Laptop Enterprise Wholesale catalogue...');
    await query(`
      INSERT INTO sv_products (sku, name, description, category, unit, purchase_cost, selling_price, physical_stock, reserved_stock, min_stock_level, reorder_quantity, status, image_url) VALUES
      ('LAP-TP-X1C', 'Lenovo ThinkPad X1 Carbon Gen 12', 'Intel Core Ultra 7 155H, 32GB LPDDR5X, 1TB NVMe Gen4 SSD, 14" 2.8K OLED 120Hz display, Carbon fiber chassis, Military-spec durability.', 'Enterprise Laptops', 'Units', 148000.00, 189990.00, 25, 0, 5, 20, 'ACTIVE', 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=800&q=80'),
      ('LAP-MBP-16M3', 'Apple MacBook Pro 16" M3 Max', 'Apple M3 Max 16-core CPU, 40-core GPU, 64GB Unified Memory, 2TB SSD, Liquid Retina XDR 120Hz display, Space Black.', 'Enterprise Laptops', 'Units', 310000.00, 369900.00, 15, 0, 4, 10, 'ACTIVE', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80'),
      ('LAP-ROG-G16', 'ASUS ROG Zephyrus G16 OLED', 'Intel Core Ultra 9 185H, NVIDIA RTX 4080 12GB, 32GB LPDDR5X, 2TB SSD, 16" 2.5K 240Hz ROG Nebula OLED display, CNC aluminum body.', 'Enterprise Laptops', 'Units', 215000.00, 264990.00, 18, 0, 5, 15, 'ACTIVE', 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=800&q=80'),
      ('LAP-DELL-XPS14', 'Dell XPS 14 Pro Developer Ultrabook', 'Intel Core Ultra 7 155H, RTX 4050 6GB, 32GB RAM, 1TB NVMe SSD, 14.5" 3.2K OLED Touch display, CNC machined aluminum and Gorilla Glass 3.', 'Enterprise Laptops', 'Units', 135000.00, 169900.00, 20, 0, 6, 15, 'ACTIVE', 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80'),
      ('GPU-NV-4090OC', 'NVIDIA GeForce RTX 4090 OC 24GB GDDR6X', 'Ada Lovelace Architecture, 16,384 CUDA cores, 24GB GDDR6X 384-bit, 4th Gen Tensor Cores, DLSS 3.5, Quad-slot axial vapor chamber cooling.', 'Graphics Cards & GPUs', 'Units', 158000.00, 194900.00, 12, 0, 3, 10, 'ACTIVE', 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=800&q=80'),
      ('GPU-TUF-4070TIS', 'ASUS TUF Gaming GeForce RTX 4070 Ti Super 16GB', '8,448 CUDA cores, 16GB GDDR6X 256-bit, Military-grade capacitors, Dual ball fan bearings, Protective metal exoskeleton backplate.', 'Graphics Cards & GPUs', 'Units', 72000.00, 88500.00, 28, 0, 8, 20, 'ACTIVE', 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=800&q=80'),
      ('CPU-AMD-7950X3D', 'AMD Ryzen 9 7950X3D 16-Core Processor', '16 Cores, 32 Threads, up to 5.7GHz Boost, 144MB 3D V-Cache, AM5 Socket, PCIe 5.0, 120W TDP enterprise desktop compute engine.', 'Processors (CPUs)', 'Units', 48000.00, 59990.00, 35, 0, 10, 25, 'ACTIVE', 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=800&q=80'),
      ('CPU-INT-14900KS', 'Intel Core i9-14900KS Special Edition', '24 Cores (8P + 16E), 32 Threads, up to 6.2GHz Thermal Velocity Boost, 36MB Intel Smart Cache, LGA1700 Socket, Unlocked extreme performance.', 'Processors (CPUs)', 'Units', 52000.00, 64500.00, 6, 0, 10, 20, 'LOW_STOCK', 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80'),
      ('SSD-SAM-990P4TB', 'Samsung 990 PRO 4TB PCIe 4.0 NVMe SSD', 'Read speeds up to 7,450 MB/s, Write speeds up to 6,900 MB/s, Integrated aluminum heatsink with RGB, Samsung Pascal controller.', 'Memory & Storage', 'Units', 28500.00, 36990.00, 40, 0, 15, 30, 'ACTIVE', 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=800&q=80'),
      ('RAM-GSK-64DDR5', 'G.Skill Trident Z5 RGB 64GB (2x32GB) DDR5-6400MHz', 'Dual channel DDR5 memory kit, CL32-39-39-102 timing, Matte black aluminum heatspreader with translucent RGB light bar, Intel XMP 3.0.', 'Memory & Storage', 'Kits', 17500.00, 23490.00, 50, 0, 15, 40, 'ACTIVE', 'https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=800&q=80'),
      ('MB-ROG-Z790DH', 'ASUS ROG Maximus Z790 Dark Hero Motherboard', '20+1+2 power stages, PCIe 5.0, Wi-Fi 7, Dual Thunderbolt 4 ports, 5x M.2 slots with heatsinks, Polymo lighting display.', 'Motherboards & Power', 'Units', 54000.00, 67900.00, 14, 0, 5, 15, 'ACTIVE', 'https://images.unsplash.com/photo-1563770660941-20978e870e26?auto=format&fit=crop&w=800&q=80'),
      ('PSU-COR-RM1000X', 'Corsair RM1000x Shift 1000W 80+ Gold Modular ATX 3.0', 'Side-mounted modular cable interface, PCIe 5.0 12VHPWR cable, 140mm fluid dynamic bearing fan with Zero RPM mode, 100% Japanese 105°C capacitors.', 'Motherboards & Power', 'Units', 14200.00, 18990.00, 30, 0, 10, 25, 'ACTIVE', 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=800&q=80'),
      ('MON-LG-32UQ85R', 'LG UltraFine 32" 4K UHD Nano IPS Black Display', '3840x2160 resolution, Nano IPS Black panel, 2000:1 contrast ratio, DCI-P3 98% color gamut, 90W USB-C PD, Auto calibration sensor.', 'Displays & Peripherals', 'Units', 51000.00, 64990.00, 16, 0, 5, 15, 'ACTIVE', 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80'),
      ('ACC-KEY-Q1PRO', 'Keychron Q1 Pro Wireless QMK/VIA Custom Keyboard', 'CNC machined 6063 aluminum body, Double-gasket mount design, Hot-swappable Keychron K Pro Banana switches, Bluetooth 5.1 & Type-C.', 'Displays & Peripherals', 'Units', 13500.00, 18490.00, 0, 0, 10, 30, 'OUT_OF_STOCK', 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=800&q=80');
    `);
  }

  // Seed restock request for low-stock CPU if none exist
  const existingRequests = await query(`SELECT count(*) as count FROM sv_restock_requests;`);
  if (parseInt(existingRequests.rows[0].count) === 0) {
    const pLow = await query(`SELECT id, name, physical_stock FROM sv_products WHERE sku = 'CPU-INT-14900KS' LIMIT 1;`);
    const uStaff = await query(`SELECT id, full_name FROM sv_users WHERE role = 'STAFF' LIMIT 1;`);
    if (pLow.rows.length && uStaff.rows.length) {
      await query(`
        INSERT INTO sv_restock_requests (product_id, product_name, current_stock, requested_quantity, priority, reason, status, requested_by, requester_name) VALUES
        ($1, $2, $3, 20, 'URGENT', 'Intel Core i9-14900KS stock level (6 units) is below safety reorder threshold of 10 units. High workstation demand.', 'PENDING', $4, $5);
      `, [pLow.rows[0].id, pLow.rows[0].name, pLow.rows[0].physical_stock, uStaff.rows[0].id, uStaff.rows[0].full_name]);
    }
  }

  // Seed sample Purchase Orders if none exist
  const existingPOs = await query(`SELECT count(*) as count FROM sv_purchase_orders;`);
  if (parseInt(existingPOs.rows[0].count) === 0) {
    const supp = await query(`SELECT id, name FROM sv_suppliers WHERE name LIKE 'Redington%' LIMIT 1;`);
    const prod = await query(`SELECT id, name, purchase_cost FROM sv_products WHERE sku = 'LAP-TP-X1C' LIMIT 1;`);
    const mgr = await query(`SELECT id FROM sv_users WHERE role = 'MANAGER' LIMIT 1;`);
    if (supp.rows.length && prod.rows.length && mgr.rows.length) {
      const poRes = await query(`
        INSERT INTO sv_purchase_orders (po_number, supplier_id, supplier_name, status, total_amount, expected_delivery_date, notes, created_by, approved_by)
        VALUES ('PO-2026-001', $1, $2, 'APPROVED', 2220000.00, CURRENT_DATE + INTERVAL '4 days', 'Enterprise corporate procurement batch for Lenovo ThinkPad laptops.', $3, $3)
        RETURNING id;
      `, [supp.rows[0].id, supp.rows[0].name, mgr.rows[0].id]);

      await query(`
        INSERT INTO sv_purchase_order_items (purchase_order_id, product_id, product_name, quantity, unit_cost, total_cost, received_quantity)
        VALUES ($1, $2, $3, 15, $4, 2220000.00, 0);
      `, [poRes.rows[0].id, prod.rows[0].id, prod.rows[0].name, prod.rows[0].purchase_cost]);
    }
  }

  // Seed sample Orders and Shipments if none exist
  const existingOrders = await query(`SELECT count(*) as count FROM sv_orders;`);
  if (parseInt(existingOrders.rows[0].count) === 0) {
    const buyer = await query(`SELECT id, full_name, email, phone FROM sv_users WHERE role = 'BUYER' LIMIT 1;`);
    const agent = await query(`SELECT id, full_name, phone FROM sv_users WHERE role = 'DELIVERY_AGENT' LIMIT 1;`);
    const p1 = await query(`SELECT id, sku, name, selling_price, image_url FROM sv_products WHERE sku = 'LAP-TP-X1C' LIMIT 1;`);
    const p2 = await query(`SELECT id, sku, name, selling_price, image_url FROM sv_products WHERE sku = 'LAP-MBP-16M3' LIMIT 1;`);
    const p3 = await query(`SELECT id, sku, name, selling_price, image_url FROM sv_products WHERE sku = 'GPU-NV-4090OC' LIMIT 1;`);

    if (buyer.rows.length && agent.rows.length && p1.rows.length && p2.rows.length) {
      const bId = buyer.rows[0].id;
      const bName = buyer.rows[0].full_name;
      const bEmail = buyer.rows[0].email;
      const agId = agent.rows[0].id;
      const agName = agent.rows[0].full_name;

      // 1. Order in CONFIRMED state (ready for warehouse staff to pack)
      const ord1 = await query(`
        INSERT INTO sv_orders (order_number, buyer_id, buyer_name, buyer_email, status, subtotal, tax_amount, total_amount, shipping_address, city, postal_code, notes)
        VALUES ('ORD-2026-001', $1, $2, $3, 'CONFIRMED', 379980.00, 68396.40, 448376.40, 'Ganga Building, Phase III, Technopark Campus, Kazhakkoottam', 'Thiruvananthapuram', '695583', 'Deliver to Technopark Server Room Bay 3.')
        RETURNING id;
      `, [bId, bName, bEmail]);

      await query(`
        INSERT INTO sv_order_items (order_id, product_id, product_name, sku, quantity, unit_price, total_price, image_url)
        VALUES ($1, $2, $3, $4, 2, $5, 379980.00, $6);
      `, [ord1.rows[0].id, p1.rows[0].id, p1.rows[0].name, p1.rows[0].sku, p1.rows[0].selling_price, p1.rows[0].image_url]);

      await query(`UPDATE sv_products SET reserved_stock = reserved_stock + 2 WHERE id = $1`, [p1.rows[0].id]);

      // 2. Order in DISPATCHED state with OUT_FOR_DELIVERY shipment
      const ord2 = await query(`
        INSERT INTO sv_orders (order_number, buyer_id, buyer_name, buyer_email, status, subtotal, tax_amount, total_amount, shipping_address, city, postal_code, notes)
        VALUES ('ORD-2026-002', $1, $2, $3, 'DISPATCHED', 369900.00, 66582.00, 436482.00, 'Leela Infopark, 6th Floor, Infopark Phase 1, Kakkanad', 'Kochi', '682042', 'Priority express dispatch via Seaport-Airport Road for executive dev team.')
        RETURNING id;
      `, [bId, bName, bEmail]);

      await query(`
        INSERT INTO sv_order_items (order_id, product_id, product_name, sku, quantity, unit_price, total_price, image_url)
        VALUES ($1, $2, $3, $4, 1, $5, 369900.00, $6);
      `, [ord2.rows[0].id, p2.rows[0].id, p2.rows[0].name, p2.rows[0].sku, p2.rows[0].selling_price, p2.rows[0].image_url]);

      await query(`
        INSERT INTO sv_shipments (order_id, order_number, tracking_number, assigned_agent_id, assigned_agent_name, status, recipient_name, recipient_phone, delivery_address, city, postal_code, estimated_delivery, dispatched_at, total_amount)
        VALUES ($1, 'ORD-2026-002', 'TRK-IN-889021', $2, $3, 'OUT_FOR_DELIVERY', $4, '+91 97452 34567', 'Leela Infopark, 6th Floor, Infopark Phase 1, Kakkanad', 'Kochi', '682042', CURRENT_DATE, NOW() - INTERVAL '3 hours', 436482.00);
      `, [ord2.rows[0].id, agId, agName, bName]);

      // 3. Order in DELIVERED state
      if (p3.rows.length) {
        const ord3 = await query(`
          INSERT INTO sv_orders (order_number, buyer_id, buyer_name, buyer_email, status, subtotal, tax_amount, total_amount, shipping_address, city, postal_code, notes)
          VALUES ('ORD-2026-003', $1, $2, $3, 'DELIVERED', 389800.00, 70164.00, 459964.00, 'Sahya IT Building, Cyberpark Campus, Mavoor Road Bypass', 'Kozhikode', '673016', 'Delivered to Cyberpark AI Compute Lab.')
          RETURNING id;
        `, [bId, bName, bEmail]);

        await query(`
          INSERT INTO sv_order_items (order_id, product_id, product_name, sku, quantity, unit_price, total_price, image_url)
          VALUES ($1, $2, $3, $4, 2, $5, 389800.00, $6);
        `, [ord3.rows[0].id, p3.rows[0].id, p3.rows[0].name, p3.rows[0].sku, p3.rows[0].selling_price, p3.rows[0].image_url]);

        await query(`
          INSERT INTO sv_shipments (order_id, order_number, tracking_number, assigned_agent_id, assigned_agent_name, status, recipient_name, recipient_phone, delivery_address, city, postal_code, estimated_delivery, dispatched_at, delivered_at, total_amount)
          VALUES ($1, 'ORD-2026-003', 'TRK-IN-884019', $2, $3, 'DELIVERED', $4, '+91 97452 34567', 'Sahya IT Building, Cyberpark Campus, Mavoor Road Bypass', 'Kozhikode', '673016', CURRENT_DATE - INTERVAL '2 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days', 459964.00);
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
        VALUES ($1, $2, 'STOCK_IN', $3, 0, $3, 0, 0, 'Initial hardware inventory provisioning audit', 'System Seeder', NOW() - INTERVAL '5 days');
      `, [p.id, p.name, p.physical_stock]);
    }
  }

  // Seed welcome notification
  const existingNotifications = await query(`SELECT count(*) as count FROM sv_notifications;`);
  if (parseInt(existingNotifications.rows[0].count) === 0) {
    await query(`
      INSERT INTO sv_notifications (target_role, title, message, type) VALUES
      ('ALL', 'SupplyVault Hardware Platform Operational', 'Enterprise computer hardware & laptop wholesale supply chain system online with four authorized role portals.', 'INFO'),
      ('MANAGER', 'Restock Request: Intel Core i9-14900KS', 'Urgent stock requisition submitted for Intel Core i9-14900KS Special Edition processors.', 'WARNING'),
      ('STAFF', 'Hardware Stock Alert', 'Product CPU-INT-14900KS is below safety threshold (6 units remaining, min 10).', 'ALERT');
    `);
  }

  console.log('[DB] Database schema and initial seed data verified successfully.');
}
