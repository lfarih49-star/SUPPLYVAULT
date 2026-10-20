import React, { useState, useEffect } from 'react';
import { Boxes, ArrowUpDown, History, TrendingUp, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatINR, formatDate } from '../../utils/format';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { Product, InventoryMovement } from '@shared/types';

export const InventoryView: React.FC = () => {
  const { token, user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'levels' | 'movements'>('levels');
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [valuationData, setValuationData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Stock Adjustment Modal
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT'>('STOCK_IN');
  const [adjustQty, setAdjustQty] = useState(10);
  const [adjustReason, setAdjustReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchInventory = async () => {
    if (!token) return;
    try {
      const [prodRes, movRes, valRes] = await Promise.all([
        fetch('/api/products', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/inventory/movements?limit=100', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/inventory/valuation', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (prodRes.ok) setProducts(await prodRes.json());
      if (movRes.ok) setMovements(await movRes.json());
      if (valRes.ok) setValuationData(await valRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [token]);

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProduct || !token) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/products/${adjustProduct.id}/adjust-stock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: adjustType,
          quantity: adjustQty,
          reason: adjustReason,
        }),
      });

      if (res.ok) {
        setAdjustProduct(null);
        setAdjustReason('');
        fetchInventory();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const summary = valuationData?.summary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">
            Inventory & Stock Auditing
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Reconcile physical, reserved, and available stock units with auditable movement logs.
          </p>
        </div>

        {/* Sub-tab switcher */}
        <div className="flex items-center gap-1 p-1 bg-navy-950 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('levels')}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              activeSubTab === 'levels'
                ? 'bg-navy-800 text-slate-100 shadow-sm'
                : 'text-slate-400'
            }`}
          >
            Live Balances
          </button>
          <button
            onClick={() => setActiveSubTab('movements')}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              activeSubTab === 'movements'
                ? 'bg-navy-800 text-slate-100 shadow-sm'
                : 'text-slate-400'
            }`}
          >
            Movement Audit Trail ({movements.length})
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-navy-900 border border-slate-800 shadow-sm">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Valuation</span>
            <div className="text-xl font-extrabold font-mono text-blue-400 mt-1">
              {formatINR(summary.totalValuationINR)}
            </div>
            <span className="text-[10px] text-slate-500">Physical Stock Basis</span>
          </div>

          <div className="p-4 rounded-xl bg-navy-900 border border-slate-800 shadow-sm">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Physical Units</span>
            <div className="text-xl font-extrabold font-mono text-slate-100 mt-1">
              {summary.totalPhysicalUnits}
            </div>
            <span className="text-[10px] text-slate-500">In Warehouse</span>
          </div>

          <div className="p-4 rounded-xl bg-navy-900 border border-slate-800 shadow-sm">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Reserved Units</span>
            <div className="text-xl font-extrabold font-mono text-amber-600 dark:text-amber-400 mt-1">
              {summary.totalReservedUnits}
            </div>
            <span className="text-[10px] text-slate-500">Committed to Orders</span>
          </div>

          <div className="p-4 rounded-xl bg-navy-900 border border-slate-800 shadow-sm">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Available Stock</span>
            <div className="text-xl font-extrabold font-mono text-blue-400 dark:text-blue-400 mt-1">
              {summary.totalAvailableUnits}
            </div>
            <span className="text-[10px] text-slate-500">Physical − Reserved</span>
          </div>
        </div>
      )}

      {activeSubTab === 'levels' ? (
        <div className="bg-navy-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-navy-950/60 text-slate-400 font-semibold uppercase">
                  <th className="py-3 px-4">Product Name / SKU</th>
                  <th className="py-3 px-4 text-center">Physical Stock</th>
                  <th className="py-3 px-4 text-center">Reserved Commitments</th>
                  <th className="py-3 px-4 text-center">Available Stock</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-navy-950/40">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-100">{p.name}</div>
                      <span className="font-mono text-[10px] text-blue-400">{p.sku}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold">{p.physicalStock} {p.unit}</td>
                    <td className="py-3 px-4 text-center font-mono text-amber-600">{p.reservedStock}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-blue-400 dark:text-blue-400">
                      {p.availableStock}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        variant={p.status === 'ACTIVE' ? 'success' : p.status === 'LOW_STOCK' ? 'warning' : 'danger'}
                        size="sm"
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setAdjustProduct(p);
                          setAdjustQty(10);
                          setAdjustReason('');
                        }}
                        className="px-3 py-1.5 bg-navy-800 hover:bg-navy-700 font-semibold rounded-lg text-slate-200 shadow-sm"
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Movements Log */
        <div className="bg-navy-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-navy-950/60 text-slate-400 font-semibold uppercase">
                  <th className="py-3 px-4">Timestamp (IST)</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 font-mono text-center">Quantity</th>
                  <th className="py-3 px-4 font-mono text-center">Physical Before → After</th>
                  <th className="py-3 px-4 font-mono text-center">Reserved Before → After</th>
                  <th className="py-3 px-4">Audit Reason / Ref</th>
                  <th className="py-3 px-4">Performed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {movements.map(m => (
                  <tr key={m.id} className="hover:bg-navy-950/40">
                    <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">{formatDate(m.createdAt, true)}</td>
                    <td className="py-2.5 px-4 font-medium text-slate-100">{m.productName}</td>
                    <td className="py-2.5 px-4">
                      <Badge
                        variant={
                          m.type === 'GOODS_RECEIPT' || m.type === 'STOCK_IN'
                            ? 'success'
                            : m.type === 'ORDER_RESERVED'
                            ? 'blue'
                            : m.type === 'ORDER_DISPATCHED'
                            ? 'teal'
                            : 'warning'
                        }
                        size="sm"
                      >
                        {m.type.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono font-bold">{m.quantity}</td>
                    <td className="py-2.5 px-4 text-center font-mono text-slate-500">
                      {m.physicalBefore} → <b className="text-slate-200">{m.physicalAfter}</b>
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono text-slate-500">
                      {m.reservedBefore} → <b className="text-amber-600">{m.reservedAfter}</b>
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 max-w-xs truncate">{m.reason}</td>
                    <td className="py-2.5 px-4 font-medium text-slate-300">{m.performedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Adjust Modal */}
      {adjustProduct && (
        <Modal
          isOpen={true}
          onClose={() => setAdjustProduct(null)}
          title={`Adjust Inventory: ${adjustProduct.name}`}
          subtitle={`SKU: ${adjustProduct.sku} | Physical: ${adjustProduct.physicalStock} | Reserved: ${adjustProduct.reservedStock}`}
        >
          <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold block mb-1">Adjustment Type</label>
              <select
                value={adjustType}
                onChange={e => setAdjustType(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-navy-950"
              >
                <option value="STOCK_IN">Stock-In (Add Physical Stock)</option>
                <option value="STOCK_OUT">Stock-Out (Deduct Unreserved Stock)</option>
                <option value="ADJUSTMENT">Reconcile (Set Absolute Physical Stock)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold block mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                required
                value={adjustQty}
                onChange={e => setAdjustQty(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-navy-950 font-mono font-bold"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Reason for Audit Log</label>
              <input
                type="text"
                required
                placeholder="Physical count reconciliation, damage inspection..."
                value={adjustReason}
                onChange={e => setAdjustReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-navy-950"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-navy-950 font-bold rounded-xl shadow-md transition-all"
            >
              {isSubmitting ? 'Recording...' : 'Apply Stock Adjustment'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
};
