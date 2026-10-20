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

type ChartPalette = 'cyan' | 'violet' | 'amber' | 'spectrum';

const PALETTES = {
  cyan: {
    id: 'cyan' as const,
    label: 'Electric Cyan',
    accentColor: '#38BDF8',
    borderColor: '#0284C7',
    gradientId: 'barGradientCyan',
    barFill: 'url(#barGradientCyan)',
    pieColors: ['#38BDF8', '#0284C7', '#818CF8', '#F59E0B', '#10B981', '#EC4899', '#94A3B8'],
    cardBorder: 'border-cyan-500/30',
    glowColor: 'rgba(6, 182, 212, 0.25)',
  },
  violet: {
    id: 'violet' as const,
    label: 'Neon Violet',
    accentColor: '#A855F7',
    borderColor: '#7C3AED',
    gradientId: 'barGradientViolet',
    barFill: 'url(#barGradientViolet)',
    pieColors: ['#C084FC', '#8B5CF6', '#6366F1', '#EC4899', '#F43F5E', '#14B8A6', '#94A3B8'],
    cardBorder: 'border-violet-500/30',
    glowColor: 'rgba(168, 85, 247, 0.25)',
  },
  amber: {
    id: 'amber' as const,
    label: 'Champagne Gold',
    accentColor: '#FBBF24',
    borderColor: '#D97706',
    gradientId: 'barGradientAmber',
    barFill: 'url(#barGradientAmber)',
    pieColors: ['#FDE047', '#F59E0B', '#FB923C', '#EA580C', '#06B6D4', '#10B981', '#EF4444'],
    cardBorder: 'border-amber-500/30',
    glowColor: 'rgba(245, 158, 11, 0.25)',
  },
  spectrum: {
    id: 'spectrum' as const,
    label: 'Multi-Spectrum',
    accentColor: '#F43F5E',
    borderColor: '#EC4899',
    gradientId: 'barGradientCyan',
    barFill: '#38BDF8',
    pieColors: ['#38BDF8', '#A855F7', '#34D399', '#FBBF24', '#F43F5E', '#818CF8', '#FB923C'],
    cardBorder: 'border-emerald-500/30',
    glowColor: 'rgba(236, 72, 153, 0.25)',
  },
};

const CATEGORY_COLORS: Record<string, string> = {
  'Enterprise Laptops': '#38BDF8',       // Electric Sky Blue
  'Graphics Cards & GPUs': '#A855F7',   // Neon Purple/Violet
  'Processors (CPUs)': '#06B6D4',       // Vibrant Cyan
  'Memory & Storage': '#FBBF24',        // Champagne Amber
  'Motherboards & Power': '#F43F5E',    // Vivid Coral/Rose
  'Displays & Peripherals': '#10B981',  // Mint Emerald
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
  const [chartColorTheme, setChartColorTheme] = useState<ChartPalette>('cyan');

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
        <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs uppercase tracking-widest font-semibold">Loading Executive Command Centre...</p>
      </div>
    );
  }

  const activePalette = PALETTES[chartColorTheme];

  return (
    <div className="space-y-6">
      {/* Executive Welcome & Actions Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Executive Command Centre
            </h1>
            <Badge variant="gold" size="sm">Active Oversight</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time supply chain operational metrics, inventory valuation, and procurement approvals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={`/api/reports/csv?type=inventory&token=${token}`}
            download
            className="px-3.5 py-2 text-xs font-semibold bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-navy-800 text-slate-700 dark:text-slate-200 rounded-xl shadow-sm flex items-center gap-2 transition-all"
          >
            <FileDown className="w-4 h-4 text-gold-500" />
            Export Inventory CSV
          </a>
          <button
            onClick={() => onNavigateTab('products')}
            className="px-3.5 py-2 text-xs font-semibold bg-navy-900 hover:bg-navy-800 text-gold-400 border border-gold-500/30 rounded-xl shadow-md flex items-center gap-1.5 transition-all"
          >
            Manage Products
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inventory Valuation INR */}
        <div className="p-5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Inventory Valuation</span>
            <div className="p-2 rounded-xl bg-gold-50 dark:bg-gold-950/40 text-gold-600 dark:text-gold-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-mono tracking-tight">
            {formatINR(kpis.inventoryValuationINR)}
          </h2>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
            <span>Physical: <b className="text-slate-700 dark:text-slate-300 font-mono">{kpis.physicalStockUnits} units</b></span>
            <span>Available: <b className="text-emerald-600 dark:text-emerald-400 font-mono">{kpis.availableStockUnits}</b></span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-gold-500 to-amber-400" />
        </div>

        {/* Total Sales Value INR */}
        <div className="p-5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Orders Value</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-mono tracking-tight">
            {formatINR(kpis.totalSalesValueINR)}
          </h2>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
            <span>Awaiting: <b className="text-amber-600 dark:text-amber-400">{kpis.ordersAwaitingProcessing} orders</b></span>
            <span>Delivered: <b className="text-emerald-600 dark:text-emerald-400">{kpis.ordersDelivered}</b></span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
        </div>

        {/* Procurement Expenditure INR */}
        <div className="p-5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Procurement Spend</span>
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-mono tracking-tight">
            {formatINR(kpis.procurementExpenditureINR)}
          </h2>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
            <span>Active Suppliers: <b className="text-slate-700 dark:text-slate-300">{kpis.totalSuppliers}</b></span>
            <span>Pending POs: <b className="text-amber-600 dark:text-amber-400">{kpis.pendingPOsCount}</b></span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-400" />
        </div>

        {/* Critical Alerts Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Operational Tickers</span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h2 className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 font-mono">
              {kpis.lowStockCount + kpis.outOfStockCount}
            </h2>
            <span className="text-xs text-slate-400">inventory alerts</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
            <span>Low Stock: <b className="text-amber-600 dark:text-amber-400">{kpis.lowStockCount}</b></span>
            <span>Out of Stock: <b className="text-rose-600 dark:text-rose-400">{kpis.outOfStockCount}</b></span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-amber-500" />
        </div>
      </div>

      {/* Pending Restock Approvals Queue */}
      <div className="bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gold-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Requisition Approval Queue ({pendingRestocks.length})
            </h2>
          </div>
          <button
            onClick={() => onNavigateTab('restock')}
            className="text-xs text-gold-600 dark:text-gold-400 font-semibold hover:underline flex items-center gap-1"
          >
            Full Requisitions Ledger <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {pendingRestocks.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            All restock requisitions have been approved or reviewed. No pending approvals.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase">
                  <th className="pb-3">Product / SKU</th>
                  <th className="pb-3">Current Stock</th>
                  <th className="pb-3">Requested Qty</th>
                  <th className="pb-3">Priority</th>
                  <th className="pb-3">Requester</th>
                  <th className="pb-3">Reason</th>
                  <th className="pb-3 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pendingRestocks.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-navy-950/40 transition-colors">
                    <td className="py-3 font-medium text-slate-900 dark:text-slate-100">
                      <div>{item.productName}</div>
                      <span className="text-[10px] font-mono text-gold-600 dark:text-gold-400">{item.productSku}</span>
                    </td>
                    <td className="py-3 font-mono">{item.currentStock} units</td>
                    <td className="py-3 font-mono font-bold text-gold-600 dark:text-gold-400">{item.requestedQuantity} units</td>
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
                        className="px-3 py-1.5 bg-gold-500 hover:bg-gold-600 text-navy-950 font-bold text-xs rounded-lg shadow-sm transition-all"
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

      {/* Hardware Supply Chain Operational Flow Diagram & Palette Switcher */}
      <div className="p-5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full animate-ping"
              style={{ backgroundColor: activePalette.accentColor }}
            />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                Supply Chain Operational Workflow Diagram
                <span
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full border hidden sm:inline-block font-semibold"
                  style={{ color: activePalette.accentColor, borderColor: `${activePalette.accentColor}50`, backgroundColor: `${activePalette.accentColor}15` }}
                >
                  Live Pipeline
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">End-to-end hardware procurement, warehouse inventory, order dispatch, and delivery topology</p>
            </div>
          </div>

          {/* Color Palette Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-navy-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs self-start sm:self-auto">
            <span className="text-[10px] font-semibold text-slate-400 px-1.5 flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3" /> Graph Color:
            </span>
            {(Object.keys(PALETTES) as ChartPalette[]).map(pKey => {
              const p = PALETTES[pKey];
              const isActive = chartColorTheme === pKey;
              return (
                <button
                  key={pKey}
                  type="button"
                  onClick={() => setChartColorTheme(pKey)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                    isActive
                      ? 'bg-navy-800 text-white shadow-sm ring-1 ring-inset ring-slate-600'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full shadow" style={{ backgroundColor: p.accentColor }} />
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5-Stage Diagram Progression */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-1">
          {/* Node 1: Procurement */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-navy-950/80 border border-slate-200 dark:border-slate-800 relative group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold text-slate-400">1. Procurement</span>
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                <Building2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100 font-mono">
              {kpis.totalSuppliers} IT Distributors
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              PO Spend: <span className="text-blue-400 font-mono font-bold">{formatINR(kpis.procurementExpenditureINR)}</span>
            </p>
          </div>

          {/* Node 2: Warehouse Vault */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-navy-950/80 border border-slate-200 dark:border-slate-800 relative group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold text-slate-400">2. Hardware Vault</span>
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                <Boxes className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100 font-mono">
              {kpis.physicalStockUnits} Units in Stock
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Valuation: <span className="text-cyan-400 font-mono font-bold">{formatINR(kpis.inventoryValuationINR)}</span>
            </p>
          </div>

          {/* Node 3: QA & Order Packing */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-navy-950/80 border border-slate-200 dark:border-slate-800 relative group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold text-slate-400">3. Fulfillment Bay</span>
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                <Package className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100 font-mono">
              {kpis.ordersAwaitingProcessing} Orders Queued
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Atomic Reservation: <span className="text-amber-400 font-mono font-bold">Guaranteed</span>
            </p>
          </div>

          {/* Node 4: Express Dispatch */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-navy-950/80 border border-slate-200 dark:border-slate-800 relative group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold text-slate-400">4. Transit Dispatch</span>
              <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-400">
                <Truck className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100 font-mono">
              Active Tracking
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Logistics SLA: <span className="text-violet-400 font-mono font-bold">Same Day / 24h</span>
            </p>
          </div>

          {/* Node 5: Client Delivered */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-navy-950/80 border border-slate-200 dark:border-slate-800 relative group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold text-slate-400">5. Client Handover</span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100 font-mono">
              {kpis.ordersDelivered} Delivered
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Gross Revenue: <span className="text-emerald-400 font-mono font-bold">{formatINR(kpis.totalSalesValueINR)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Stock Valuation Chart */}
        <div className="p-6 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Inventory Valuation by Category
              </h3>
              <p className="text-xs text-slate-400">Aggregated line-item valuation</p>
            </div>
            <Badge variant="teal" size="sm">Real Database Aggregation</Badge>
          </div>

          <div className="h-64">
            {charts?.categoryValuation && charts.categoryValuation.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.categoryValuation} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                  <defs>
                    <linearGradient id="barGradientCyan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.95}/>
                      <stop offset="100%" stopColor="#0284C7" stopOpacity={0.7}/>
                    </linearGradient>
                    <linearGradient id="barGradientViolet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#C084FC" stopOpacity={0.95}/>
                      <stop offset="100%" stopColor="#7C3AED" stopOpacity={0.7}/>
                    </linearGradient>
                    <linearGradient id="barGradientAmber" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FDE047" stopOpacity={0.95}/>
                      <stop offset="100%" stopColor="#D97706" stopOpacity={0.7}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                  <XAxis
                    dataKey="category"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    angle={-15}
                    textAnchor="end"
                    stroke="#334155"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickFormatter={val => `₹${(val / 1000).toFixed(0)}k`}
                    stroke="#334155"
                  />
                  <Tooltip
                    formatter={(val: any) => [formatINR(val), 'Valuation']}
                    contentStyle={{
                      backgroundColor: '#050b14',
                      borderColor: activePalette.accentColor,
                      color: '#f8fafc',
                      borderRadius: '12px',
                      boxShadow: `0 8px 24px ${activePalette.glowColor}`,
                      borderWidth: '1px'
                    }}
                  />
                  <Bar
                    dataKey="valuationINR"
                    fill={chartColorTheme === 'spectrum' ? '#38BDF8' : activePalette.barFill}
                    radius={[6, 6, 0, 0]}
                  >
                    {chartColorTheme === 'spectrum' && charts.categoryValuation.map((entry: any, index: number) => (
                      <Cell
                        key={`bar-cell-${index}`}
                        fill={CATEGORY_COLORS[entry.category] || activePalette.pieColors[index % activePalette.pieColors.length]}
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

        {/* Order Status Distribution */}
        <div className="p-6 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Buyer Order Fulfilment Pipeline
              </h3>
              <p className="text-xs text-slate-400">Active distribution of orders across fulfilment statuses</p>
            </div>
            <Badge variant="blue" size="sm">Live Workflow Status</Badge>
          </div>

          <div className="h-64 flex items-center justify-center">
            {charts?.orderStatus && charts.orderStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.orderStatus}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={3}
                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {charts.orderStatus.map((_: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={activePalette.pieColors[index % activePalette.pieColors.length]}
                        stroke="#050b14"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`${val} orders`, 'Count']}
                    contentStyle={{
                      backgroundColor: '#050b14',
                      borderColor: activePalette.accentColor,
                      color: '#f8fafc',
                      borderRadius: '12px',
                      boxShadow: `0 8px 24px ${activePalette.glowColor}`,
                      borderWidth: '1px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400 text-center">
                <Package className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                No buyer orders placed yet. Orders will appear here upon checkout.
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
            <div className="p-3 bg-slate-50 dark:bg-navy-950 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400">Product SKU:</span>
                <p className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedRestock.productSku}</p>
              </div>
              <div>
                <span className="text-slate-400">Current Physical Stock:</span>
                <p className="font-mono font-bold text-amber-600">{selectedRestock.currentStock} units</p>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400">Requisition Reason:</span>
                <p className="text-slate-700 dark:text-slate-300 italic">{selectedRestock.reason}</p>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Approved Quantity (Units)
              </label>
              <input
                type="number"
                min="1"
                value={approvedQty}
                onChange={e => setApprovedQty(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-navy-950 text-slate-900 dark:text-slate-100 font-mono font-bold"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Original requested quantity: {selectedRestock.requestedQuantity} units
              </p>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Manager Review Notes / Supplier Instructions
              </label>
              <textarea
                rows={3}
                placeholder="Authorize for emergency PO from primary metallurgical supplier..."
                value={reviewNotes}
                onChange={e => setReviewNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-navy-950 text-slate-900 dark:text-slate-100 text-xs"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleReviewDecision('REJECT')}
                className="flex-1 py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl border border-rose-200 transition-colors flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" /> Reject Requisition
              </button>
              <button
                type="button"
                disabled={isSubmitting || approvedQty <= 0}
                onClick={() => handleReviewDecision('APPROVE')}
                className="flex-1 py-2.5 px-4 bg-gold-500 hover:bg-gold-600 text-navy-950 font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
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
