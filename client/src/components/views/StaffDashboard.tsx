import React, { useState, useEffect } from 'react';
import {
  Boxes,
  ClipboardList,
  Package,
  Truck,
  ArrowRight,
  Plus,
  AlertTriangle,
  History,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatINR, formatDate } from '../../utils/format';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { Product, Order, InventoryMovement, RestockRequest } from '@shared/types';

interface StaffDashboardProps {
  onNavigateTab: (tab: string) => void;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ onNavigateTab }) => {
  const { token, user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [myRequests, setMyRequests] = useState<RestockRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // New Restock Modal
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [requestedQty, setRequestedQty] = useState(25);
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('HIGH');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Stock Adjust Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT'>('STOCK_IN');
  const [adjustQty, setAdjustQty] = useState(10);
  const [adjustReason, setAdjustReason] = useState('');

  const fetchStaffData = async () => {
    if (!token) return;
    try {
      const [prodRes, orderRes, movRes, restockRes] = await Promise.all([
        fetch('/api/products', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/orders?status=PLACED', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/inventory/movements?limit=8', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/restock', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (prodRes.ok) setProducts(await prodRes.json());
      if (orderRes.ok) setPendingOrders(await orderRes.json());
      if (movRes.ok) setMovements(await movRes.json());
      if (restockRes.ok) setMyRequests(await restockRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, [token]);

  const handleCreateRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !token) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/restock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: selectedProductId,
          requestedQuantity: requestedQty,
          priority,
          reason,
        }),
      });

      if (res.ok) {
        setRestockModalOpen(false);
        setReason('');
        fetchStaffData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStockAdjustment = async (e: React.FormEvent) => {
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
        setAdjustModalOpen(false);
        setAdjustReason('');
        fetchStaffData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const advanceOrderStatus = async (orderId: string, nextStatus: string) => {
    try {
      await fetch(`/api/orders/${orderId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      fetchStaffData();
    } catch (err) {
      console.error(err);
    }
  };

  const lowStockItems = products.filter(p => p.physicalStock <= p.minStockLevel);

  return (
    <div className="space-y-6">
      {/* Operations Hub Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">
              Warehouse Operations Hub
            </h1>
            <Badge variant="teal" size="sm">Staff Shift Active</Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Daily order packing queues, goods receipt logging, and restock requisition dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setRestockModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-navy-950 font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" /> Submit Restock Requisition
          </button>
        </div>
      </div>

      {/* Task Queue Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-navy-900 border border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 uppercase font-semibold">Orders to Pack</span>
            <h3 className="text-xl font-bold font-mono text-slate-100">{pendingOrders.length}</h3>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-navy-900 border border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 uppercase font-semibold">Low Stock Products</span>
            <h3 className="text-xl font-bold font-mono text-rose-600">{lowStockItems.length}</h3>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-navy-900 border border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 uppercase font-semibold">Active Requisitions</span>
            <h3 className="text-xl font-bold font-mono text-teal-600">{myRequests.filter(r => r.status === 'PENDING').length}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Orders Packing Queue */}
        <div className="p-6 rounded-2xl bg-navy-900 border border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-500" />
              Incoming Buyer Orders ({pendingOrders.length})
            </h2>
            <button
              onClick={() => onNavigateTab('orders')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              View Full Pipeline
            </button>
          </div>

          {pendingOrders.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              All incoming buyer orders have been confirmed and queued for packing.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingOrders.slice(0, 4).map(o => (
                <div
                  key={o.id}
                  className="p-3.5 rounded-xl border border-slate-800 bg-navy-950/40 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-100">{o.orderNumber}</div>
                    <span className="text-slate-500">{o.buyerName} • {o.city}</span>
                    <div className="text-[11px] font-mono font-bold text-gold-600 dark:text-gold-400 mt-0.5">
                      {formatINR(o.totalAmount)}
                    </div>
                  </div>
                  <button
                    onClick={() => advanceOrderStatus(o.id, 'PROCESSING')}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm flex items-center gap-1 text-xs"
                  >
                    Confirm & Process <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Alerts & Fast Adjustment */}
        <div className="p-6 rounded-2xl bg-navy-900 border border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Low Stock Alert Watchlist
            </h2>
            <button
              onClick={() => onNavigateTab('inventory')}
              className="text-xs text-gold-600 dark:text-gold-400 hover:underline"
            >
              Inventory Registry
            </button>
          </div>

          {lowStockItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              All inventory levels are above configured safety thresholds.
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockItems.map(p => (
                <div
                  key={p.id}
                  className="p-3.5 rounded-xl border border-amber-200/60 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/20 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-100">{p.name}</div>
                    <span className="text-[10px] font-mono text-slate-400">{p.sku} • Min: {p.minStockLevel} {p.unit}</span>
                    <div className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                      Physical Stock: {p.physicalStock} {p.unit} (Available: {p.availableStock})
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setAdjustProduct(p);
                      setAdjustQty(p.reorderQuantity);
                      setAdjustModalOpen(true);
                    }}
                    className="px-2.5 py-1.5 bg-navy-900 border border-slate-700 hover:border-gold-500 font-semibold rounded-lg text-slate-200 shadow-sm text-xs"
                  >
                    Adjust Stock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Inventory Movements Feed */}
      <div className="p-6 rounded-2xl bg-navy-900 border border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-gold-500" />
            <h2 className="text-base font-bold text-slate-100 tracking-tight">
              Warehouse Movement Audit Feed
            </h2>
          </div>
          <span className="text-xs text-slate-400">Atomic Stock Ledger</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                <th className="pb-3">Timestamp (IST)</th>
                <th className="pb-3">Product Name</th>
                <th className="pb-3">Movement Type</th>
                <th className="pb-3">Qty Change</th>
                <th className="pb-3">Stock Progression</th>
                <th className="pb-3">Reason / Ref</th>
                <th className="pb-3">Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {movements.map(m => (
                <tr key={m.id} className="hover:bg-navy-950/40">
                  <td className="py-2.5 text-slate-400 whitespace-nowrap">{formatDate(m.createdAt, true)}</td>
                  <td className="py-2.5 font-medium text-slate-100">{m.productName}</td>
                  <td className="py-2.5">
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
                  <td className="py-2.5 font-mono font-bold">{m.quantity}</td>
                  <td className="py-2.5 font-mono text-slate-500">
                    {m.physicalBefore} → <b className="text-slate-200">{m.physicalAfter}</b>
                  </td>
                  <td className="py-2.5 text-slate-500 max-w-xs truncate">{m.reason}</td>
                  <td className="py-2.5 font-medium text-slate-300">{m.performedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submit Restock Requisition Modal */}
      <Modal
        isOpen={restockModalOpen}
        onClose={() => setRestockModalOpen(false)}
        title="Submit Restock Requisition"
        subtitle="Staff stock request will be routed directly to the Manager approval queue."
      >
        <form onSubmit={handleCreateRestock} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-300 block mb-1">
              Select Catalogue Product
            </label>
            <select
              required
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-navy-950 text-slate-100"
            >
              <option value="">-- Choose Product --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) — Stock: {p.physicalStock} units
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-300 block mb-1">
                Requested Quantity (Units)
              </label>
              <input
                type="number"
                min="1"
                required
                value={requestedQty}
                onChange={e => setRequestedQty(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-navy-950 text-slate-100 font-mono font-bold"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-300 block mb-1">
                Priority Tier
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-navy-950 text-slate-100"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent (Safety Stock Critical)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-300 block mb-1">
              Requisition Reason & Justification
            </label>
            <textarea
              required
              rows={3}
              placeholder="Physical inventory depleted due to large wholesale order fulfillment..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-navy-950 text-slate-100"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-gold-500 hover:bg-gold-600 text-navy-950 font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? 'Transmitting...' : 'Dispatch Requisition to Manager'}
          </button>
        </form>
      </Modal>

      {/* Quick Stock Adjustment Modal */}
      {adjustProduct && (
        <Modal
          isOpen={adjustModalOpen}
          onClose={() => setAdjustModalOpen(false)}
          title={`Adjust Inventory: ${adjustProduct.name}`}
          subtitle={`Current Physical: ${adjustProduct.physicalStock} | Reserved: ${adjustProduct.reservedStock} | Available: ${adjustProduct.availableStock}`}
        >
          <form onSubmit={handleStockAdjustment} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-300 block mb-1">
                Adjustment Type
              </label>
              <select
                value={adjustType}
                onChange={e => setAdjustType(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-navy-950 text-slate-100"
              >
                <option value="STOCK_IN">Stock-In (Add Physical Units)</option>
                <option value="STOCK_OUT">Stock-Out (Remove Unreserved Units)</option>
                <option value="ADJUSTMENT">Physical Count Reconciliation (Set Absolute Stock)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-300 block mb-1">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                required
                value={adjustQty}
                onChange={e => setAdjustQty(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-navy-950 text-slate-100 font-mono font-bold"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-300 block mb-1">
                Audit Reason
              </label>
              <input
                type="text"
                required
                placeholder="Discrepancy count, returned material, quality check..."
                value={adjustReason}
                onChange={e => setAdjustReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-navy-950 text-slate-100"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-navy-900 hover:bg-navy-800 text-gold-400 font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 border border-gold-500/30"
            >
              {isSubmitting ? 'Recording Movement...' : 'Apply Stock Change'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
};
