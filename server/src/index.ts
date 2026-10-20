import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './db';

import authRouter from './routes/auth';
import productsRouter from './routes/products';
import suppliersRouter from './routes/suppliers';
import inventoryRouter from './routes/inventory';
import restockRouter from './routes/restock';
import purchaseOrdersRouter from './routes/purchaseOrders';
import ordersRouter from './routes/orders';
import shipmentsRouter from './routes/shipments';
import analyticsRouter from './routes/analytics';
import notificationsRouter from './routes/notifications';
import reportsRouter from './routes/reports';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'UP',
    platform: 'SupplyVault Kerala Enterprise SCM',
    region: 'Kerala, India',
    centralHub: 'Kakkanad, Kochi',
    currency: 'INR',
    locale: 'en-IN',
    timezone: 'Asia/Kolkata',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/restock', restockRouter);
app.use('/api/purchase-orders', purchaseOrdersRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/shipments', shipmentsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/reports', reportsRouter);

import fs from 'fs';

// Serve frontend in production build
const clientDistPath = fs.existsSync(path.resolve(__dirname, 'client'))
  ? path.resolve(__dirname, 'client')
  : path.resolve(__dirname, '../../dist/client');
app.use(express.static(clientDistPath));

app.get('*', (_req, res, next) => {
  if (_req.url.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      res.status(404).send('SupplyVault API Server Running. Please start client dev server or build frontend.');
    }
  });
});

// Centralized error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[SERVER_ERROR]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

async function startServer() {
  try {
    await initDb();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`====================================================`);
      console.log(` SUPPLYVAULT — Luxury Enterprise Supply Chain Platform`);
      console.log(` Backend listening on: http://localhost:${PORT}`);
      console.log(` Currency Standard: STRICT INR ONLY (₹)`);
      console.log(` Primary Roles: MANAGER, STAFF, BUYER, DELIVERY_AGENT`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('Fatal initialization error:', err);
    process.exit(1);
  }
}

startServer();
