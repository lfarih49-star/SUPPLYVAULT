import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Package,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  Boxes,
  Truck,
  Building2,
  CheckCircle2,
  XCircle,
  FileDown,
  SlidersHorizontal,
  Sparkles,
  ArrowRight,
  Activity
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../utils/format';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { ManagerKPIs, RestockRequest } from '@shared/types';

const SPECTRUM_COLORS = ['#3B82F6', '#2563EB', '#1D4ED8', '#60A5FA', '#1E40AF', '#93C5FD', '#172554'];

const CATEGORY_COLORS: Record<string, string> = {
  'Enterprise Laptops': '#3B82F6',
  'Graphics Cards & GPUs': '#2563EB',
  'Processors (CPUs)': '#1D4ED8',
  'Memory & Storage': '#60A5FA',
  'Motherboards & Power': '#1E40AF',
  'Displays & Peripherals': '#93C5FD',
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  'PLACED': '#60A5FA',
  'CONFIRMED': '#3B82F6',
  'PROCESSING': '#2563EB',
  'PACKED': '#1D4ED8',
  'DISPATCHED': '#1E40AF',
  'DELIVERED': '#2563EB',
  'CANCELLED': '#64748B',
};

interface ManagerDashboardProps {
  onNavigateTab: (tab: string) => void;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ onNavigateTab }) => {
  const { token, user } = useAuth();
  const [kpis, setKpis] = useState<ManagerKPIs | null>(null);
  const [charts, setCharts] = useState<any>(null);
  const [pendingRestocks, setPendingRestocks] = useState<RestockRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Review modal state
  const [selectedRestock, setSelectedRestock] = useState<RestockRequest | null>(null);
  const [approvedQty, setApprovedQty] = useState<number>(0);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    if (!token) return;
    try {
      const [kpiRes, chartRes, restockRes] = await Promise.all([
        fetch('/api/analytics/kpis', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/analytics/charts', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/restock?status=PENDING', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (kpiRes.ok) setKpis(await kpiRes.json());
      if (chartRes.ok) setCharts(await chartRes.json());
      if (restockRes.ok) setPendingRestocks(await restockRes.json());
    } catch (err) {
      console.error('Failed to fetch manager dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleReviewDecision = async (decision: 'APPROVE' | 'REJECT') => {
    if (!selectedRestock || !token) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/restock/${selectedRestock.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          decision,
          approvedQuantity: decision === 'APPROVE' ? approvedQty : 0,
          notes: reviewNotes,
        }),
      });

      if (res.ok) {
        setSelectedRestock(null);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !kpis) {
    return (
      <div className="p-12 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs uppercase tracking-widest font-semibold">Loading Executive Command Centre...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Executive Welcome & Actions Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">
              Executive Command Centre
            </h1>
            <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-blue-600/10 text-blue-400 border border-blue-500/20">Operational Active</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time supply chain operational metrics, inventory valuation, and procurement approvals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={`/api/reports/csv?type=inventory&token=${token}`}
            download
            className="px-3.5 py-2 text-xs font-semibold btn-luxury-secondary rounded-xl flex items-center gap-2"
          >
            <FileDown className="w-4 h-4 text-blue-400" />
            Export Inventory CSV
          </a>
          <button
            onClick={() => onNavigateTab('products')}
            className="px-3.5 py-2 text-xs font-bold btn-luxury-emerald rounded-xl flex items-center gap-1.5"
          >
            Manage Products
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Inventory Valuation */}
        <div className="p-5 rounded-2xl glass-card glass-card-hover space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Inventory Valuation</span>
            <div className="w-9 h-9 rounded-xl bg-blue-600/15 border border-blue-500/30 text-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.25)] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-slate-100 tracking-tight">
              {formatINR(kpis.inventoryValuationINR)}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-2 font-mono">
              <span>Physical: <b className="text-slate-200">{kpis.physicalStockUnits}</b></span>
              <span className="text-slate-600">•</span>
              <span>Available: <b className="text-blue-400">{kpis.availableStockUnits}</b></span>
            </div>
          </div>
        </div>

        {/* Card 2: Orders Value */}
        <div className="p-5 rounded-2xl glass-card glass-card-hover space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Orders Value</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-sky-500/30 text-blue-400 shadow-[0_0_15px_rgba(56,189,248,0.2)] flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-slate-100 tracking-tight">
              {formatINR(kpis.totalSalesValueINR)}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-2 font-mono">
              <span>Awaiting: <b className="text-amber-400">{kpis.ordersAwaitingProcessing}</b></span>
              <span className="text-slate-600">•</span>
              <span>Delivered: <b className="text-blue-400">{kpis.ordersDelivered}</b></span>
            </div>
          </div>
        </div>

        {/* Card 3: Procurement Spend */}
        <div className="p-5 rounded-2xl glass-card glass-card-hover space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Procurement Spend</span>
            <div className="w-9 h-9 rounded-xl bg-blue-600/15 border border-blue-500/30 text-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.25)] flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-slate-100 tracking-tight">
              {formatINR(kpis.procurementExpenditureINR)}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-2 font-mono">
              <span>Suppliers: <b className="text-slate-200">{kpis.totalSuppliers}</b></span>
              <span className="text-slate-600">•</span>
              <span>Active POs: <b className="text-amber-400">{kpis.pendingPOsCount}</b></span>
            </div>
          </div>
        </div>

        {/* Card 4: Inventory Alerts */}
        <div className="p-5 rounded-2xl glass-card glass-card-hover space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Stock Alerts</span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)] flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-rose-400 tracking-tight">
              {kpis.lowStockCount + kpis.outOfStockCount}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-2 font-mono">
              <span>Low Stock: <b className="text-amber-400">{kpis.lowStockCount}</b></span>
              <span className="text-slate-600">•</span>
              <span>Out of Stock: <b className="text-rose-400">{kpis.outOfStockCount}</b></span>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Restock Approvals Queue */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold text-slate-100 tracking-tight">
              Requisition Approval Queue ({pendingRestocks.length})
            </h2>
          </div>
          <button
            onClick={() => onNavigateTab('restock')}
            className="text-xs text-blue-400 font-semibold hover:underline flex items-center gap-1"
          >
            Full Requisitions Ledger <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {pendingRestocks.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            <CheckCircle2 className="w-8 h-8 text-blue-400 mx-auto mb-2 opacity-80" />
            All restock requisitions have been approved or reviewed. No pending approvals.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                  <th className="pb-3">Product / SKU</th>
                  <th className="pb-3">Current Stock</th>
                  <th className="pb-3">Requested Qty</th>
                  <th className="pb-3">Priority</th>
                  <th className="pb-3">Requester</th>
                  <th className="pb-3">Reason</th>
                  <th className="pb-3 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {pendingRestocks.map(item => (
                  <tr key={item.id} className="hover:bg-navy-950/40 transition-colors">
                    <td className="py-3 font-medium text-slate-100">
                      <div>{item.productName}</div>
                      <span className="text-[10px] font-mono text-blue-400">{item.productSku}</span>
                    </td>
                    <td className="py-3 font-mono">{item.currentStock} units</td>
                    <td className="py-3 font-mono font-bold text-blue-400">{item.requestedQuantity} units</td>
                    <td className="py-3">
                      <Badge
                        variant={item.priority === 'URGENT' ? 'danger' : item.priority === 'HIGH' ? 'warning' : 'neutral'}
                        size="sm"
                      >
                        {item.priority}
                      </Badge>
                    </td>
                    <td className="py-3 text-slate-500">{item.requesterName}</td>
                    <td className="py-3 text-slate-500 max-w-xs truncate">{item.reason}</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedRestock(item);
                          setApprovedQty(item.requestedQuantity);
                          setReviewNotes('');
                        }}
                        className="px-3 py-1.5 btn-luxury-emerald text-xs rounded-lg"
                      >
                        Review Requisition
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Hardware Supply Chain Operational Flow Diagram — Multi-Spectrum */}
      <div className="p-5 rounded-2xl glass-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping" />
            <div>
              <h3 className="text-sm font-bold text-slate-100 tracking-tight flex items-center gap-2">
                Supply Chain Operational Workflow Topology
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-blue-500/40 bg-blue-950/50 text-blue-400 font-bold hidden sm:inline-block">
                  Enterprise Supply Topology
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">End-to-end hardware procurement, warehouse inventory, order dispatch, and delivery topology</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 bg-navy-950 rounded-xl border border-slate-800 text-xs self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-blue-300" /><span className="w-2 h-2 rounded-full bg-blue-400" /><span className="w-2 h-2 rounded-full bg-blue-500" /><span className="w-2 h-2 rounded-full bg-blue-600" /><span className="w-2 h-2 rounded-full bg-blue-700" />
            <span className="text-[11px] font-semibold text-slate-300 ml-1">Navy Blue Pipeline</span>
          </div>
        </div>

        {/* 5-Stage Multi-Spectrum Diagram Progression */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-1">
          {/* Node 1: Procurement */}
          <div className="p-3.5 rounded-xl bg-navy-950/80 border border-slate-800 relative group hover:border-blue-500/50 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold text-blue-400">1. Procurement</span>
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                <Building2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-sm font-extrabold text-slate-100 font-mono">
              {kpis.totalSuppliers} IT Distributors
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              PO Spend: <span className="text-blue-400 font-mono font-bold">{formatINR(kpis.procurementExpenditureINR)}</span>
            </p>
          </div>

          {/* Node 2: Warehouse Vault */}
          <div className="p-3.5 rounded-xl bg-navy-950/80 border border-slate-800 relative group hover:border-blue-500/50 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold text-blue-400">2. Hardware Vault</span>
              <div className="p-1.5 rounded-lg bg-blue-600/10 text-blue-400">
                <Boxes className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-sm font-extrabold text-slate-100 font-mono">
              {kpis.physicalStockUnits} Units in Stock
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Valuation: <span className="text-blue-400 font-mono font-bold">{formatINR(kpis.inventoryValuationINR)}</span>
            </p>
          </div>

          {/* Node 3: QA & Order Packing */}
          <div className="p-3.5 rounded-xl bg-navy-950/80 border border-slate-800 relative group hover:border-amber-500/50 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold text-amber-400">3. Fulfillment Bay</span>
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                <Package className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-sm font-extrabold text-slate-100 font-mono">
              {kpis.ordersAwaitingProcessing} Orders Queued
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Atomic Reservation: <span className="text-amber-400 font-mono font-bold">Guaranteed</span>
            </p>
          </div>

          {/* Node 4: Express Dispatch */}
          <div className="p-3.5 rounded-xl bg-navy-950/80 border border-slate-800 relative group hover:border-blue-500/50 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold text-blue-400">4. Transit Dispatch</span>
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                <Truck className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-sm font-extrabold text-slate-100 font-mono">
              Active Tracking
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Logistics SLA: <span className="text-blue-400 font-mono font-bold">Same Day / 24h</span>
            </p>
          </div>

          {/* Node 5: Client Delivered */}
          <div className="p-3.5 rounded-xl bg-navy-950/80 border border-slate-800 relative group hover:border-blue-500/50 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold text-blue-400">5. Client Handover</span>
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-sm font-extrabold text-slate-100 font-mono">
              {kpis.ordersDelivered} Delivered
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Gross Revenue: <span className="text-blue-400 font-mono font-bold">{formatINR(kpis.totalSalesValueINR)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Stock Valuation Chart */}
        <div className="p-6 rounded-2xl glass-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100 tracking-tight">
                Inventory Valuation by Category
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Real-time aggregate valuation across master hardware SKUs</p>
            </div>
            <span className="text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-navy-950 border border-slate-800 text-slate-300">
              Aggregated
            </span>
          </div>

          <div className="h-64">
            {charts?.categoryValuation && charts.categoryValuation.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.categoryValuation} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.6} />
                  <XAxis
                    dataKey="category"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    angle={-15}
                    textAnchor="end"
                    stroke="#334155"
                    tickLine={false}
                    axisLine={{ stroke: '#1e293b' }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickFormatter={val => `₹${(val / 1000).toFixed(0)}k`}
                    stroke="#334155"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(val: any) => [formatINR(val), 'Valuation']}
                    contentStyle={{
                      backgroundColor: '#071219',
                      borderColor: '#334155',
                      color: '#f8fafc',
                      borderRadius: '8px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="valuationINR" radius={[4, 4, 0, 0]}>
                    {charts.categoryValuation.map((entry: any, index: number) => (
                      <Cell
                        key={`bar-cell-${index}`}
                        fill={CATEGORY_COLORS[entry.category] || SPECTRUM_COLORS[index % SPECTRUM_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No category valuation data available.
              </div>
            )}
          </div>
        </div>

        {/* Order Status Distribution with Clean Side Legend */}
        <div className="p-6 rounded-2xl glass-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100 tracking-tight">
                Order Pipeline Distribution
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Active wholesale orders by current fulfilment milestone</p>
            </div>
            <span className="text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-navy-950 border border-slate-800 text-slate-300">
              Live Pipeline
            </span>
          </div>

          <div className="h-64">
            {charts?.orderStatus && charts.orderStatus.length > 0 ? (
              <div className="h-full grid grid-cols-1 sm:grid-cols-2 items-center gap-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.orderStatus}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {charts.orderStatus.map((entry: any, index: number) => (
                        <Cell
                          key={`pie-cell-${index}`}
                          fill={ORDER_STATUS_COLORS[entry.status] || SPECTRUM_COLORS[index % SPECTRUM_COLORS.length]}
                          stroke="#071219"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [`${val} orders`, 'Orders']}
                      contentStyle={{
                        backgroundColor: '#071219',
                        borderColor: '#334155',
                        color: '#f8fafc',
                        borderRadius: '8px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                        fontSize: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-1.5 overflow-y-auto max-h-56 pr-2 text-xs">
                  {charts.orderStatus.map((entry: any, index: number) => {
                    const color = ORDER_STATUS_COLORS[entry.status] || SPECTRUM_COLORS[index % SPECTRUM_COLORS.length];
                    const totalCount = charts.orderStatus.reduce((acc: number, curr: any) => acc + curr.count, 0);
                    const pct = totalCount > 0 ? ((entry.count / totalCount) * 100).toFixed(0) : '0';
                    return (
                      <div key={entry.status} className="flex items-center justify-between p-2 rounded-lg bg-navy-950/70 border border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                          <span className="font-semibold text-slate-200">{entry.status}</span>
                        </div>
                        <div className="font-mono text-slate-400">
                          <span className="font-bold text-slate-100">{entry.count}</span>
                          <span className="text-[10px] text-slate-500 ml-1.5">({pct}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                <Package className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
                No orders placed yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Restock Request Modal */}
      {selectedRestock && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedRestock(null)}
          title={`Review Requisition: ${selectedRestock.productName}`}
          subtitle={`Submitted by ${selectedRestock.requesterName} • Priority: ${selectedRestock.priority}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-navy-950 rounded-xl border border-slate-800 grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400">Product SKU:</span>
                <p className="font-mono font-bold text-slate-200">{selectedRestock.productSku}</p>
              </div>
              <div>
                <span className="text-slate-400">Current Physical Stock:</span>
                <p className="font-mono font-bold text-amber-600">{selectedRestock.currentStock} units</p>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400">Requisition Reason:</span>
                <p className="text-slate-300 italic">{selectedRestock.reason}</p>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-300 block mb-1">
                Approved Quantity (Units)
              </label>
              <input
                type="number"
                min="1"
                value={approvedQty}
                onChange={e => setApprovedQty(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-navy-950 text-slate-100 font-mono font-bold"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Original requested quantity: {selectedRestock.requestedQuantity} units
              </p>
            </div>

            <div>
              <label className="font-semibold text-slate-300 block mb-1">
                Manager Review Notes / Supplier Instructions
              </label>
              <textarea
                rows={3}
                placeholder="Authorize for emergency purchase order from national distributor (e.g. Redington/Ingram Micro)..."
                value={reviewNotes}
                onChange={e => setReviewNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-navy-950 text-slate-100 text-xs"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleReviewDecision('REJECT')}
                className="flex-1 py-2.5 px-4 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-semibold rounded-xl border border-rose-800/60 transition-colors flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" /> Reject Requisition
              </button>
              <button
                type="button"
                disabled={isSubmitting || approvedQty <= 0}
                onClick={() => handleReviewDecision('APPROVE')}
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-navy-950 font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Authorize Requisition
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
