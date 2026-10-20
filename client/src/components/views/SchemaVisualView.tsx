import React, { useState, useEffect } from 'react';
import {
  Database,
  Layers,
  Key,
  Link,
  Table,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Shield,
  FileCode,
  HardDrive
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';

interface SchemaTable {
  name: string;
  category: 'core' | 'commerce' | 'procurement' | 'system';
  description: string;
  columns: {
    name: string;
    type: string;
    isPk?: boolean;
    isFk?: boolean;
    ref?: string;
    nullable?: boolean;
    notes?: string;
  }[];
}

const SCHEMA_DEFINITIONS: SchemaTable[] = [
  {
    name: 'sv_users',
    category: 'core',
    description: 'System authorization directory supporting MANAGER, STAFF, BUYER, and DELIVERY_AGENT roles.',
    columns: [
      { name: 'id', type: 'UUID', isPk: true, notes: 'DEFAULT gen_random_uuid()' },
      { name: 'username', type: 'VARCHAR(50)', notes: 'UNIQUE NOT NULL' },
      { name: 'email', type: 'VARCHAR(100)', notes: 'UNIQUE NOT NULL' },
      { name: 'password_hash', type: 'VARCHAR(255)', notes: 'BCrypt salted hash' },
      { name: 'full_name', type: 'VARCHAR(100)' },
      { name: 'role', type: 'VARCHAR(20)', notes: 'CHECK role IN (MANAGER, STAFF, BUYER, DELIVERY_AGENT)' },
      { name: 'phone', type: 'VARCHAR(20)' },
      { name: 'created_at', type: 'TIMESTAMPTZ', notes: 'DEFAULT NOW()' },
    ],
  },
  {
    name: 'sv_products',
    category: 'commerce',
    description: 'Centrally governed inventory master with atomic stock reservations and INR unit valuations.',
    columns: [
      { name: 'id', type: 'UUID', isPk: true },
      { name: 'sku', type: 'VARCHAR(50)', notes: 'UNIQUE NOT NULL' },
      { name: 'name', type: 'VARCHAR(200)' },
      { name: 'category', type: 'VARCHAR(100)' },
      { name: 'unit', type: 'VARCHAR(20)', notes: 'Units, Sheets, Rolls, Packs' },
      { name: 'purchase_cost', type: 'NUMERIC(12,2)', notes: 'INR procurement cost' },
      { name: 'selling_price', type: 'NUMERIC(12,2)', notes: 'INR selling price' },
      { name: 'physical_stock', type: 'INT', notes: 'Physical warehouse count' },
      { name: 'reserved_stock', type: 'INT', notes: 'Active buyer commitments' },
      { name: 'min_stock_level', type: 'INT', notes: 'Safety threshold' },
      { name: 'reorder_quantity', type: 'INT' },
      { name: 'status', type: 'VARCHAR(20)', notes: 'ACTIVE, LOW_STOCK, OUT_OF_STOCK' },
      { name: 'image_url', type: 'TEXT', notes: 'Fixed 16:9 presentation visual' },
    ],
  },
  {
    name: 'sv_suppliers',
    category: 'procurement',
    description: 'B2B luxury vendor directory tracking supplier lead times, ratings, and contacts.',
    columns: [
      { name: 'id', type: 'UUID', isPk: true },
      { name: 'name', type: 'VARCHAR(150)', notes: 'UNIQUE NOT NULL' },
      { name: 'contact_person', type: 'VARCHAR(100)' },
      { name: 'email', type: 'VARCHAR(100)' },
      { name: 'phone', type: 'VARCHAR(20)' },
      { name: 'city', type: 'VARCHAR(50)' },
      { name: 'lead_time_days', type: 'INT' },
      { name: 'rating', type: 'NUMERIC(2,1)' },
      { name: 'status', type: 'VARCHAR(20)', notes: 'ACTIVE, INACTIVE' },
    ],
  },
  {
    name: 'sv_orders',
    category: 'commerce',
    description: 'Buyer purchase requisitions with 18% GST calculation and order fulfilment tracking.',
    columns: [
      { name: 'id', type: 'UUID', isPk: true },
      { name: 'order_number', type: 'VARCHAR(50)', notes: 'UNIQUE NOT NULL' },
      { name: 'buyer_id', type: 'UUID', isFk: true, ref: 'sv_users.id' },
      { name: 'buyer_name', type: 'VARCHAR(100)' },
      { name: 'status', type: 'VARCHAR(30)', notes: 'PLACED, CONFIRMED, PACKED, DISPATCHED, DELIVERED, CANCELLED' },
      { name: 'subtotal', type: 'NUMERIC(12,2)', notes: 'INR pre-tax' },
      { name: 'tax_amount', type: 'NUMERIC(12,2)', notes: '18% GST INR' },
      { name: 'total_amount', type: 'NUMERIC(12,2)', notes: 'INR grand total' },
      { name: 'shipping_address', type: 'TEXT' },
      { name: 'city', type: 'VARCHAR(50)' },
      { name: 'postal_code', type: 'VARCHAR(20)' },
    ],
  },
  {
    name: 'sv_order_items',
    category: 'commerce',
    description: 'Line items associated with buyer orders with price snapshotting.',
    columns: [
      { name: 'id', type: 'UUID', isPk: true },
      { name: 'order_id', type: 'UUID', isFk: true, ref: 'sv_orders.id' },
      { name: 'product_id', type: 'UUID', isFk: true, ref: 'sv_products.id' },
      { name: 'product_name', type: 'VARCHAR(200)' },
      { name: 'sku', type: 'VARCHAR(50)' },
      { name: 'quantity', type: 'INT' },
      { name: 'unit_price', type: 'NUMERIC(12,2)' },
      { name: 'total_price', type: 'NUMERIC(12,2)' },
    ],
  },
  {
    name: 'sv_shipments',
    category: 'commerce',
    description: 'Logistics tracking with assigned courier agent and field attempt history.',
    columns: [
      { name: 'id', type: 'UUID', isPk: true },
      { name: 'order_id', type: 'UUID', isFk: true, ref: 'sv_orders.id' },
      { name: 'order_number', type: 'VARCHAR(50)' },
      { name: 'tracking_number', type: 'VARCHAR(50)', notes: 'UNIQUE NOT NULL' },
      { name: 'assigned_agent_id', type: 'UUID', isFk: true, ref: 'sv_users.id' },
      { name: 'assigned_agent_name', type: 'VARCHAR(100)' },
      { name: 'status', type: 'VARCHAR(30)', notes: 'ASSIGNED, PICKED_UP, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED' },
      { name: 'recipient_name', type: 'VARCHAR(100)' },
      { name: 'recipient_phone', type: 'VARCHAR(20)' },
      { name: 'attempts', type: 'JSONB', notes: 'Field attempt event history' },
    ],
  },
  {
    name: 'sv_purchase_orders',
    category: 'procurement',
    description: 'Manager and Staff procurement orders placed with registered vendors.',
    columns: [
      { name: 'id', type: 'UUID', isPk: true },
      { name: 'po_number', type: 'VARCHAR(50)', notes: 'UNIQUE NOT NULL' },
      { name: 'supplier_id', type: 'UUID', isFk: true, ref: 'sv_suppliers.id' },
      { name: 'supplier_name', type: 'VARCHAR(150)' },
      { name: 'status', type: 'VARCHAR(30)', notes: 'DRAFT, APPROVED, ORDERED, RECEIVED, CLOSED' },
      { name: 'total_amount', type: 'NUMERIC(12,2)', notes: 'INR procurement total' },
      { name: 'created_by', type: 'UUID', isFk: true, ref: 'sv_users.id' },
      { name: 'approved_by', type: 'UUID', isFk: true, ref: 'sv_users.id' },
    ],
  },
  {
    name: 'sv_purchase_order_items',
    category: 'procurement',
    description: 'Requisition line items for purchase orders with goods receipt counters.',
    columns: [
      { name: 'id', type: 'UUID', isPk: true },
      { name: 'purchase_order_id', type: 'UUID', isFk: true, ref: 'sv_purchase_orders.id' },
      { name: 'product_id', type: 'UUID', isFk: true, ref: 'sv_products.id' },
      { name: 'quantity', type: 'INT' },
      { name: 'unit_cost', type: 'NUMERIC(12,2)' },
      { name: 'total_cost', type: 'NUMERIC(12,2)' },
      { name: 'received_quantity', type: 'INT', notes: 'Incremented upon verified physical receipt' },
    ],
  },
  {
    name: 'sv_inventory_movements',
    category: 'procurement',
    description: 'Immutable atomic audit trail of physical and reserved stock transactions.',
    columns: [
      { name: 'id', type: 'UUID', isPk: true },
      { name: 'product_id', type: 'UUID', isFk: true, ref: 'sv_products.id' },
      { name: 'product_name', type: 'VARCHAR(200)' },
      { name: 'type', type: 'VARCHAR(30)', notes: 'STOCK_IN, STOCK_OUT, ADJUSTMENT, GOODS_RECEIPT, ORDER_RESERVED, ORDER_DISPATCHED' },
      { name: 'quantity', type: 'INT' },
      { name: 'physical_before', type: 'INT' },
      { name: 'physical_after', type: 'INT' },
      { name: 'reserved_before', type: 'INT' },
      { name: 'reserved_after', type: 'INT' },
      { name: 'performed_by', type: 'VARCHAR(100)' },
      { name: 'created_at', type: 'TIMESTAMPTZ' },
    ],
  },
  {
    name: 'sv_restock_requests',
    category: 'procurement',
    description: 'Staff stock requisitions submitted for executive manager approval.',
    columns: [
      { name: 'id', type: 'UUID', isPk: true },
      { name: 'product_id', type: 'UUID', isFk: true, ref: 'sv_products.id' },
      { name: 'requested_quantity', type: 'INT' },
      { name: 'approved_quantity', type: 'INT' },
      { name: 'priority', type: 'VARCHAR(20)', notes: 'LOW, MEDIUM, HIGH, URGENT' },
      { name: 'status', type: 'VARCHAR(20)', notes: 'PENDING, APPROVED, REJECTED, FULFILLED' },
      { name: 'requested_by', type: 'UUID', isFk: true, ref: 'sv_users.id' },
      { name: 'reviewed_by', type: 'UUID', isFk: true, ref: 'sv_users.id' },
    ],
  },
  {
    name: 'sv_notifications',
    category: 'system',
    description: 'Persistent real-time alerts directed to user IDs or authorized roles.',
    columns: [
      { name: 'id', type: 'UUID', isPk: true },
      { name: 'user_id', type: 'UUID', isFk: true, ref: 'sv_users.id' },
      { name: 'target_role', type: 'VARCHAR(20)', notes: 'ALL, MANAGER, STAFF, BUYER, DELIVERY_AGENT' },
      { name: 'title', type: 'VARCHAR(150)' },
      { name: 'message', type: 'TEXT' },
      { name: 'type', type: 'VARCHAR(20)', notes: 'INFO, SUCCESS, WARNING, ALERT' },
      { name: 'read', type: 'BOOLEAN', notes: 'DEFAULT FALSE' },
    ],
  },
  {
    name: 'sv_audit_logs',
    category: 'system',
    description: 'Immutable security ledger logging role actions, entities, and IP addresses.',
    columns: [
      { name: 'id', type: 'UUID', isPk: true },
      { name: 'actor_id', type: 'UUID', isFk: true, ref: 'sv_users.id' },
      { name: 'actor_name', type: 'VARCHAR(100)' },
      { name: 'actor_role', type: 'VARCHAR(20)' },
      { name: 'action', type: 'VARCHAR(100)' },
      { name: 'entity_type', type: 'VARCHAR(50)' },
      { name: 'entity_id', type: 'VARCHAR(100)' },
      { name: 'details', type: 'TEXT' },
      { name: 'created_at', type: 'TIMESTAMPTZ' },
    ],
  },
];

// DBML code representation for dbdiagram.io
const DBML_CODE = `// SUPPLYVAULT ENTERPRISE DATABASE SCHEMA
// Paste into https://dbdiagram.io to generate high-resolution ER poster/PDF

Table sv_users {
  id uuid [pk, default: "gen_random_uuid()"]
  username varchar(50) [unique, not null]
  email varchar(100) [unique, not null]
  password_hash varchar(255) [not null]
  full_name varchar(100) [not null]
  role varchar(20) [not null, note: "MANAGER | STAFF | BUYER | DELIVERY_AGENT"]
  phone varchar(20)
  created_at timestamptz [default: "now()"]
}

Table sv_suppliers {
  id uuid [pk]
  name varchar(150) [unique, not null]
  contact_person varchar(100)
  email varchar(100)
  phone varchar(20)
  address text
  city varchar(50)
  lead_time_days int
  rating numeric(2,1)
  status varchar(20) [default: "ACTIVE"]
}

Table sv_products {
  id uuid [pk]
  sku varchar(50) [unique, not null]
  name varchar(200) [not null]
  description text
  category varchar(100) [not null]
  unit varchar(20) [default: "Units"]
  purchase_cost numeric(12,2) [not null, note: "INR"]
  selling_price numeric(12,2) [not null, note: "INR"]
  physical_stock int [default: 0]
  reserved_stock int [default: 0]
  min_stock_level int [default: 10]
  reorder_quantity int [default: 50]
  status varchar(20) [default: "ACTIVE"]
  image_url text [note: "Fixed 16:9 visual"]
}

Table sv_orders {
  id uuid [pk]
  order_number varchar(50) [unique, not null]
  buyer_id uuid [ref: > sv_users.id]
  buyer_name varchar(100)
  buyer_email varchar(100)
  status varchar(30) [note: "PLACED | CONFIRMED | PACKED | DISPATCHED | DELIVERED"]
  subtotal numeric(12,2) [note: "INR"]
  tax_amount numeric(12,2) [note: "18% GST INR"]
  total_amount numeric(12,2) [note: "INR"]
  shipping_address text
  city varchar(50)
  postal_code varchar(20)
}

Table sv_order_items {
  id uuid [pk]
  order_id uuid [ref: > sv_orders.id]
  product_id uuid [ref: > sv_products.id]
  product_name varchar(200)
  sku varchar(50)
  quantity int
  unit_price numeric(12,2) [note: "INR"]
  total_price numeric(12,2) [note: "INR"]
}

Table sv_shipments {
  id uuid [pk]
  order_id uuid [ref: - sv_orders.id]
  order_number varchar(50)
  tracking_number varchar(50) [unique, not null]
  assigned_agent_id uuid [ref: > sv_users.id]
  assigned_agent_name varchar(100)
  status varchar(30) [note: "ASSIGNED | PICKED_UP | IN_TRANSIT | OUT_FOR_DELIVERY | DELIVERED"]
  recipient_name varchar(100)
  recipient_phone varchar(20)
  attempts jsonb
}

Table sv_purchase_orders {
  id uuid [pk]
  po_number varchar(50) [unique, not null]
  supplier_id uuid [ref: > sv_suppliers.id]
  supplier_name varchar(150)
  status varchar(30) [note: "DRAFT | APPROVED | ORDERED | RECEIVED"]
  total_amount numeric(12,2) [note: "INR"]
  created_by uuid [ref: > sv_users.id]
}

Table sv_purchase_order_items {
  id uuid [pk]
  purchase_order_id uuid [ref: > sv_purchase_orders.id]
  product_id uuid [ref: > sv_products.id]
  quantity int
  unit_cost numeric(12,2) [note: "INR"]
  received_quantity int [default: 0]
}

Table sv_inventory_movements {
  id uuid [pk]
  product_id uuid [ref: > sv_products.id]
  product_name varchar(200)
  type varchar(30) [note: "STOCK_IN | STOCK_OUT | ADJUSTMENT | GOODS_RECEIPT | ORDER_RESERVED | ORDER_DISPATCHED"]
  quantity int
  physical_before int
  physical_after int
  reserved_before int
  reserved_after int
}

Table sv_restock_requests {
  id uuid [pk]
  product_id uuid [ref: > sv_products.id]
  requested_quantity int
  approved_quantity int
  priority varchar(20)
  status varchar(20) [note: "PENDING | APPROVED | REJECTED"]
  requested_by uuid [ref: > sv_users.id]
  reviewed_by uuid [ref: > sv_users.id]
}

Table sv_notifications {
  id uuid [pk]
  user_id uuid [ref: > sv_users.id]
  target_role varchar(20)
  title varchar(150)
  message text
}

Table sv_audit_logs {
  id uuid [pk]
  actor_id uuid [ref: > sv_users.id]
  action varchar(100)
  entity_type varchar(50)
  entity_id varchar(100)
}
`;

export const SchemaVisualView: React.FC = () => {
  const { token } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'core' | 'commerce' | 'procurement' | 'system'>('all');
  const [liveCounts, setLiveCounts] = useState<Record<string, number>>({});
  const [dbMeta, setDbMeta] = useState<any>(null);
  const [copiedDbml, setCopiedDbml] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch('/api/analytics/schema', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.counts) setLiveCounts(data.counts);
        if (data.db) setDbMeta(data.db);
      })
      .catch(console.error);
  }, [token]);

  const handleCopyDbml = () => {
    navigator.clipboard.writeText(DBML_CODE);
    setCopiedDbml(true);
    setTimeout(() => setCopiedDbml(false), 2000);
  };

  const filteredTables = SCHEMA_DEFINITIONS.filter(
    t => selectedFilter === 'all' || t.category === selectedFilter
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
              <Database className="w-6 h-6 text-gold-400" />
              Database Architecture & Visual ER Schema
            </h1>
            <Badge variant="gold" size="sm">PostgreSQL 16</Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Enterprise normalized schema with primary keys, foreign constraints, strict INR monetary types, and live row counts.
          </p>
        </div>

        {/* Quick export tools */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyDbml}
            className="px-3.5 py-2 text-xs font-semibold bg-navy-900 hover:bg-navy-800 text-gold-400 border border-gold-500/30 rounded-xl shadow-md flex items-center gap-1.5 transition-all"
          >
            {copiedDbml ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedDbml ? 'DBML Copied!' : 'Copy Code for dbdiagram.io'}
          </button>
          <a
            href="https://dbdiagram.io/d"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 text-xs font-semibold bg-gold-500 hover:bg-gold-600 text-navy-950 rounded-xl shadow-md flex items-center gap-1.5 transition-all"
          >
            Open dbdiagram.io <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Database Live Telemetry Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-navy-900 p-4 rounded-2xl border border-slate-800 text-xs shadow-sm">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Database Engine</span>
          <p className="font-mono font-bold text-slate-100 mt-0.5">PostgreSQL (Relational)</p>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Active Database</span>
          <p className="font-mono font-bold text-gold-400 mt-0.5">{dbMeta?.databaseName || 'supplyvault'}</p>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Schema Tables</span>
          <p className="font-mono font-bold text-slate-100 mt-0.5">12 Relational Entities</p>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Database Size</span>
          <p className="font-mono font-bold text-emerald-400 mt-0.5">{dbMeta?.databaseSize || '8.2 MB'}</p>
        </div>
      </div>

      {/* Domain Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setSelectedFilter('all')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
            selectedFilter === 'all'
              ? 'bg-gold-500 text-navy-950 shadow-md'
              : 'bg-navy-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          All 12 Tables
        </button>
        <button
          onClick={() => setSelectedFilter('commerce')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
            selectedFilter === 'commerce'
              ? 'bg-gold-500 text-navy-950 shadow-md'
              : 'bg-navy-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          Commerce & Orders (3)
        </button>
        <button
          onClick={() => setSelectedFilter('procurement')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
            selectedFilter === 'procurement'
              ? 'bg-gold-500 text-navy-950 shadow-md'
              : 'bg-navy-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          Procurement & Inventory (5)
        </button>
        <button
          onClick={() => setSelectedFilter('core')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
            selectedFilter === 'core'
              ? 'bg-gold-500 text-navy-950 shadow-md'
              : 'bg-navy-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          Users & Security (1)
        </button>
        <button
          onClick={() => setSelectedFilter('system')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
            selectedFilter === 'system'
              ? 'bg-gold-500 text-navy-950 shadow-md'
              : 'bg-navy-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          Notifications & Audit (2)
        </button>
      </div>

      {/* Relational Entity Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTables.map(t => {
          const rowCountKey = t.name.replace('sv_', '');
          const count = liveCounts[rowCountKey] != null ? liveCounts[rowCountKey] : '-';

          return (
            <div
              key={t.name}
              className="rounded-2xl bg-navy-900 border border-slate-800 overflow-hidden shadow-sm flex flex-col justify-between hover:border-gold-500/40 transition-all"
            >
              <div>
                {/* Table Header */}
                <div className="p-4 bg-navy-950/80 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Table className="w-4 h-4 text-gold-400" />
                      <span className="font-mono font-bold text-sm text-gold-400">{t.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{t.description}</p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-navy-900 text-emerald-400 border border-emerald-500/30 shrink-0">
                    {count} rows
                  </span>
                </div>

                {/* Column List */}
                <div className="p-4 space-y-2 text-xs">
                  {t.columns.map(col => (
                    <div
                      key={col.name}
                      className="flex items-center justify-between py-1 border-b border-slate-800/40 last:border-0"
                    >
                      <div className="flex items-center gap-1.5">
                        {col.isPk ? (
                          <span className="px-1 py-0.2 rounded bg-gold-950 text-gold-400 border border-gold-500/30 text-[9px] font-mono font-bold">
                            PK
                          </span>
                        ) : col.isFk ? (
                          <span className="px-1 py-0.2 rounded bg-blue-950 text-blue-400 border border-blue-500/30 text-[9px] font-mono font-bold">
                            FK
                          </span>
                        ) : (
                          <span className="w-4" />
                        )}
                        <span className="font-mono text-slate-200 font-medium">{col.name}</span>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-[11px] text-slate-400">{col.type}</span>
                        {col.ref && (
                          <div className="text-[9px] text-blue-400 font-mono">
                            $\to$ {col.ref}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Table Footer */}
              <div className="px-4 py-2 bg-navy-950/40 border-t border-slate-800/60 text-[10px] text-slate-500 flex justify-between items-center">
                <span>{t.columns.length} columns defined</span>
                <span className="capitalize text-slate-400 font-mono">{t.category}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Guide Card: How to View Live Visual Diagram in DBeaver / pgAdmin 4 */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-navy-950 via-navy-900 to-navy-950 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-gold-400" />
          <h3 className="text-base font-bold text-slate-100">
            How to Generate Visual ER Diagrams in pgAdmin 4 & DBeaver (2 Clicks)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
          <div className="p-4 rounded-xl bg-navy-950/70 border border-slate-800 space-y-2">
            <h4 className="font-bold text-gold-400 flex items-center gap-1.5">
              <span>Method A: pgAdmin 4 ERD Tool (Installed with PostgreSQL)</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
              <li>Open <b>pgAdmin 4</b> on your computer and connect to your database (<code className="text-slate-300">supplyvault</code>).</li>
              <li>Right-click on the database name <code className="text-slate-300">supplyvault</code>.</li>
              <li>Click <b>Generate ERD (Entity Relationship Diagram)</b>.</li>
              <li>pgAdmin will instantly generate the full visual graphical diagram with all table links, which you can export as PNG/SVG!</li>
            </ol>
          </div>

          <div className="p-4 rounded-xl bg-navy-950/70 border border-slate-800 space-y-2">
            <h4 className="font-bold text-gold-400 flex items-center gap-1.5">
              <span>Method B: Free Online Tool (dbdiagram.io)</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
              <li>Click the gold <b>"Copy Code for dbdiagram.io"</b> button at the top of this page.</li>
              <li>Open <a href="https://dbdiagram.io/d" target="_blank" rel="noopener noreferrer" className="text-gold-400 underline">https://dbdiagram.io/d</a> in your browser.</li>
              <li>Paste the copied DBML code into the left editor panel.</li>
              <li>Click <b>Export $\to$ Export as PDF / PNG</b> to download the poster for your project viva report!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

