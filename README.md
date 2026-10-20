# SUPPLYVAULT — Luxury Enterprise Supply Chain Management Platform
## Four Independently Authorized Roles | Strict INR (₹) Only | Production-Ready Full-Stack

SupplyVault is a luxury enterprise-grade supply chain and wholesale procurement platform built with refined visual design, real operational workflows, PostgreSQL persistence, and four independently authorized role experiences: **MANAGER, STAFF, BUYER, and DELIVERY_AGENT**.

---

## 1. Quick Start Guide (Windows / PowerShell)

### Prerequisites
- Node.js 20+ (Node v24 supported)
- PostgreSQL 16+ (Running on localhost:5432)
- pnpm or npm

### Setup Environment
In `C:\Users\FARIH\.gemini\antigravity\scratch\SupplyVault`:
The database is pre-configured in `.env`:
```env
DATABASE_URL=postgresql://postgres:root@localhost:5432/supplyvault
PORT=5000
JWT_SECRET=supplyvault-luxury-secret-key-2026-btech-viva-secure
NODE_ENV=development
DEFAULT_CURRENCY=INR
DEFAULT_LOCALE=en-IN
DEFAULT_TIMEZONE=Asia/Kolkata
```

### Install & Run
```powershell
# 1. Navigate to project root
cd C:\Users\FARIH\.gemini\antigravity\scratch\SupplyVault

# 2. Run Typecheck (0 errors)
pnpm run typecheck

# 3. Full Production Build (Client + Server bundle)
pnpm run build

# 4. Start Production Server (Serves API + Built React Client on Port 5000)
pnpm start
# Open http://localhost:5000 in your browser

# OR for Hot-Reload Development:
pnpm run dev
# Backend runs on http://localhost:5000, Vite dev client on http://localhost:5173
```

---

## 2. Authorized Viva Demo Accounts

| Role | Username | Password | Dedicated Portal & Permissions |
|---|---|---|---|
| **MANAGER** | `manager` | `manager123` | Executive Command Centre, valuation in INR, restock approval queue, PO issuance, full audit trail, CSV exports |
| **STAFF** | `staff` | `staff123` | Warehouse Operations Hub, order packing & dispatch, goods receipt verification (stock credits), stock adjustments |
| **BUYER** | `buyer` | `buyer123` | Luxury wholesale catalogue, cart slide-over drawer, server-side atomic stock reservations, order tracking |
| **DELIVERY_AGENT** | `agent` | `agent123` | Mobile-first mission control, field shipment transitions (`PICKED_UP` → `IN_TRANSIT` → `OUT_FOR_DELIVERY` → `DELIVERED`), exception logs |

---

## 3. Strict INR-Only Policy Compliance

- **Exclusively Supported Currency:** Indian Rupee (`INR` / `₹`).
- **Formatting Standards:** `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })` formatting with Indian numeric grouping (e.g. `₹1,25,000.00`).
- **Timezone:** `Asia/Kolkata` across all displayed order timestamps, movements, and audit entries.
- **Backend-Calculated Totals:** Zero trust in client monetary payloads; subtotal and 18% Integrated GST calculated on the server.
- **Zero Foreign Currencies:** No USD, USDT, EUR, conversion widgets, or external exchange rate dependencies.

---

## 4. Architecture & Data Integrity Safeguards

- **Backend:** Express + TypeScript with node-postgres (`pg`) connection pooling and ACID database transactions.
- **Frontend:** React + TypeScript + Vite + Tailwind CSS + Lucide Icons + Recharts.
- **Atomic Stock Reservation:**
  When a buyer checks out:
  $$\text{Available Stock} = \text{Physical Stock} - \text{Reserved Stock}$$
  PostgreSQL row locks (`FOR UPDATE`) prevent overselling under high concurrency.
- **Goods Receipt Verification:**
  Stock is never incremented simply by creating or approving a PO. Only verified goods receipts credit physical inventory and write to `sv_inventory_movements`.
- **State Machine Safeguards:**
  Strict status transitions enforced on backend for shipments (`ASSIGNED` → `PICKED_UP` → `IN_TRANSIT` → `OUT_FOR_DELIVERY` → `DELIVERED` / `FAILED_ATTEMPT`).
- **Live Event Center:**
  Persistent notifications and security audit logs generated on all business events.

---

## 5. Completed & Verified Workflows

1. **Manager Executive Command Centre:** Real-time KPI calculations (inventory valuation in INR, sales value, procurement expenditure), Recharts interactive visualizations, restock requisition approvals queue.
2. **Staff Operations Hub:** Order packing and dispatching, fast stock adjustments, requisition submission, goods receipt processing.
3. **Buyer Wholesale Storefront:** Category filter pills, real-time availability badges, slide-over cart drawer, address entry, server-side GST calculation, live order progress timeline.
4. **Delivery Agent Logistics Control:** Mobile-optimized card view, 1-tap status updates, customer phone/address access, failed delivery exception logger.
5. **Data Exports:** Filtered CSV downloads for Inventory Valuation, Buyer Orders, Purchase Orders, Movement Ledger, and Delivery Logs.

---

## 6. 100% Free Cloud Deployment Guide (Neon + Render)

Because SupplyVault compiles both the frontend client and backend API into a single unified Express service, you can host the entire system **100% free of charge** using:
- **Free Database:** [Neon.tech](https://neon.tech) (Permanent free managed serverless PostgreSQL)
- **Free Web App Host:** [Render.com](https://render.com) (Free Node.js web service with free HTTPS)

### Step 1: Create Free PostgreSQL Database on Neon
1. Go to [https://neon.tech](https://neon.tech) and sign up with GitHub or Google (Free Forever).
2. Click **Create Project**, name it `supplyvault`, and select region **Asia Pacific (Singapore)**.
3. Copy the generated **Connection String** (it looks like `postgresql://neondb_owner:password@ep-xyz.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`).

### Step 2: Push Your Code to GitHub
1. Create a new repository on [GitHub](https://github.com/new) (e.g. `supplyvault`).
2. Run these commands from the project directory:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/supplyvault.git
   git push -u origin main
   ```

### Step 3: Deploy to Render (Zero Cost)
1. Go to [https://render.com](https://render.com) and log in with GitHub.
2. Click **New +** $\to$ **Web Service**.
3. Select your `supplyvault` repository.
4. Configure the settings:
   - **Name:** `supplyvault` (or any unique name)
   - **Region:** Singapore (or closest to you)
   - **Branch:** `main`
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`
5. Click **Advanced** $\to$ **Add Environment Variable**:
   - `DATABASE_URL` = *(Paste your Neon connection string from Step 1)*
   - `NODE_ENV` = `production`
   - `DEFAULT_CURRENCY` = `INR`
   - `DEFAULT_LOCALE` = `en-IN`
   - `DEFAULT_TIMEZONE` = `Asia/Kolkata`
   - `JWT_SECRET` = `supplyvault-prod-secret-key-btech-2026-viva`
6. Click **Deploy Web Service**.
7. In ~2 minutes, Render will build and deploy your app at a live URL like:
   `https://supplyvault-xyz.onrender.com`

*Note: On first startup, SupplyVault automatically detects the empty cloud database, runs all 12 table migrations, and seeds the 4 demo role accounts automatically!*


