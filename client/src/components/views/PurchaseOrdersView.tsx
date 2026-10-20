import React, { useState, useEffect } from 'react';
import { FileText, Plus, CheckCircle2, Send, PackageCheck, Eye, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatINR, formatDate } from '../../utils/format';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { PurchaseOrder, Supplier, Product } from '@shared/types';

export const PurchaseOrdersView: React.FC = () => {
  const { token, user } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Create PO Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [poItems, setPoItems] = useState<{ productId: string; quantity: number }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Goods Receipt Modal
  const [receiptPo, setReceiptPo] = useState<any | null>(null);
  const [receiptInputs, setReceiptInputs] = useState<Record<string, number>>({});
  const [isReceiving, setIsReceiving] = useState(false);

  const fetchPOs = async () => {
    if (!token) return;
    try {
      const [poRes, sRes, pRes] = await Promise.all([
        fetch('/api/purchase-orders', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/suppliers', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/products', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (poRes.ok) setPurchaseOrders(await poRes.json());
      if (sRes.ok) setSuppliers(await sRes.json());
      if (pRes.ok) setProducts(await pRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPOs();
  }, [token]);

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId || poItems.length === 0 || !token) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          supplierId: selectedSupplierId,
          expectedDeliveryDate: expectedDate || undefined,
          notes: poNotes,
          items: poItems,
        }),
      });

      if (res.ok) {
        setCreateModalOpen(false);
        setPoItems([]);
        setPoNotes('');
        fetchPOs();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprovePO = async (id: string) => {
    try {
      await fetch(`/api/purchase-orders/${id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchPOs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleOrderPO = async (id: string) => {
    try {
      await fetch(`/api/purchase-orders/${id}/order`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchPOs();
    } catch (err) {
      console.error(err);
    }
  };

  const openGoodsReceiptModal = async (poId: string) => {
    try {
      const res = await fetch(`/api/purchase-orders/${poId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const poDetails = await res.json();
        setReceiptPo(poDetails);
        const initialInputs: Record<string, number> = {};
        poDetails.items?.forEach((item: any) => {
          const remaining = item.quantity - (item.receivedQuantity || 0);
          initialInputs[item.id] = Math.max(0, remaining);
        });
        setReceiptInputs(initialInputs);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostGoodsReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptPo || !token) return;
    setIsReceiving(true);
    try {
      const receipts = Object.entries(receiptInputs).map(([itemId, receivedNow]) => ({
        itemId,
        receivedNow: Number(receivedNow),
      }));

      const res = await fetch(`/api/purchase-orders/${receiptPo.id}/receive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ receipts }),
      });

      if (res.ok) {
        setReceiptPo(null);
        fetchPOs();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsReceiving(false);
    }
  };

  const addItemToPO = (prodId: string) => {
    if (!prodId) return;
    if (poItems.some(i => i.productId === prodId)) return;
    setPoItems(prev => [...prev, { productId: prodId, quantity: 20 }]);
  };

  const isManager = user?.role === 'MANAGER';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Procurement & Purchase Orders
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Requisitions, management authorization, supplier dispatch, and physical goods receipt auditing.
          </p>
        </div>

        <button
          onClick={() => {
            setCreateModalOpen(true);
            if (poItems.length === 0 && products.length > 0) {
              setPoItems([{ productId: products[0].id, quantity: 25 }]);
            }
          }}
          className="px-4 py-2 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 text-navy-950 font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" /> Create Purchase Order
        </button>
      </div>

      {/* PO Table */}
      <div className="bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-navy-950/60 text-slate-400 font-semibold uppercase">
                <th className="py-3 px-4">PO Number</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4 text-right font-mono">Total Cost</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Order Date</th>
                <th className="py-3 px-4">Expected Delivery</th>
                <th className="py-3 px-4 text-right">Workflow Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {purchaseOrders.map(po => (
                <tr key={po.id} className="hover:bg-slate-50/50 dark:hover:bg-navy-950/40">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                    {po.poNumber}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">{po.supplierName}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-gold-600 dark:text-gold-400">
                    {formatINR(po.totalAmount)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge
                      variant={
                        po.status === 'RECEIVED'
                          ? 'success'
                          : po.status === 'ORDERED'
                          ? 'teal'
                          : po.status === 'APPROVED'
                          ? 'blue'
                          : po.status === 'PENDING_APPROVAL'
                          ? 'warning'
                          : 'neutral'
                      }
                      size="sm"
                    >
                      {po.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-slate-400">{formatDate(po.createdAt, false)}</td>
                  <td className="py-3 px-4 text-slate-400">{po.expectedDeliveryDate ? formatDate(po.expectedDeliveryDate, false) : '—'}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {isManager && po.status === 'PENDING_APPROVAL' && (
                        <button
                          onClick={() => handleApprovePO(po.id)}
                          className="px-2.5 py-1 bg-gold-500 hover:bg-gold-600 text-navy-950 font-bold rounded-lg shadow-sm"
                        >
                          Approve PO
                        </button>
                      )}

                      {po.status === 'APPROVED' && (
                        <button
                          onClick={() => handleOrderPO(po.id)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" /> Transmit to Supplier
                        </button>
                      )}

                      {(po.status === 'ORDERED' || po.status === 'PARTIALLY_RECEIVED') && (
                        <button
                          onClick={() => openGoodsReceiptModal(po.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm flex items-center gap-1"
                        >
                          <PackageCheck className="w-3 h-3" /> Verify Goods Receipt
                        </button>
                      )}

                      {po.status === 'RECEIVED' && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Stock Credited
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Purchase Order Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Requisition Purchase Order"
        subtitle="Purchase Order totals are calculated server-side in Indian Rupees (₹)."
      >
        <form onSubmit={handleCreatePO} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold block mb-1">Select Supplier</label>
            <select
              required
              value={selectedSupplierId}
              onChange={e => setSelectedSupplierId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-navy-950"
            >
              <option value="">-- Choose Supplier --</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.city}) — Lead time: {s.leadTimeDays}d
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold block mb-1">Expected Delivery Date</label>
              <input
                type="date"
                value={expectedDate}
                onChange={e => setExpectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-navy-950"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">PO Notes (Optional)</label>
              <input
                type="text"
                placeholder="FOB Destination, Net 30"
                value={poNotes}
                onChange={e => setPoNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-navy-950"
              />
            </div>
          </div>

          {/* Line items */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold uppercase tracking-wider text-slate-500">PO Line Items</span>
              <select
                onChange={e => {
                  addItemToPO(e.target.value);
                  e.target.value = '';
                }}
                className="text-xs px-2 py-1 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-navy-950"
              >
                <option value="">+ Add Product Line</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({formatINR(p.purchaseCost)})</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {poItems.map((item, idx) => {
                const prod = products.find(p => p.id === item.productId);
                return (
                  <div key={idx} className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-navy-950 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{prod?.name}</p>
                      <span className="text-slate-400 font-mono">Unit: {formatINR(prod?.purchaseCost)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => {
                          const val = parseInt(e.target.value, 10) || 1;
                          setPoItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: val } : it));
                        }}
                        className="w-20 px-2 py-1 border rounded bg-white dark:bg-navy-900 font-mono text-center font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => setPoItems(prev => prev.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || poItems.length === 0}
            className="w-full py-2.5 bg-gold-500 hover:bg-gold-600 text-navy-950 font-bold rounded-xl shadow-md transition-all"
          >
            {isSubmitting ? 'Submitting PO...' : 'Issue Purchase Order'}
          </button>
        </form>
      </Modal>

      {/* Goods Receipt Verification Modal */}
      {receiptPo && (
        <Modal
          isOpen={true}
          onClose={() => setReceiptPo(null)}
          title={`Verify Goods Receipt: ${receiptPo.poNumber}`}
          subtitle={`Supplier: ${receiptPo.supplierName} • Stock will be credited upon verification`}
        >
          <form onSubmit={handlePostGoodsReceipt} className="space-y-4 text-xs">
            <div className="space-y-3">
              {receiptPo.items?.map((item: any) => (
                <div key={item.id} className="p-3 bg-slate-50 dark:bg-navy-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100">{item.productName}</h4>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Ordered: <b>{item.quantity}</b> | Previously Received: <b>{item.receivedQuantity || 0}</b>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Receive Now:</span>
                    <input
                      type="number"
                      min="0"
                      max={item.quantity - (item.receivedQuantity || 0)}
                      value={receiptInputs[item.id] || 0}
                      onChange={e => setReceiptInputs({ ...receiptInputs, [item.id]: parseInt(e.target.value, 10) || 0 })}
                      className="w-20 px-2 py-1 border rounded bg-white dark:bg-navy-900 font-mono text-center font-bold text-emerald-600"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300">
              <b>Inventory Rule:</b> Physical inventory will automatically increment for the received units and a GOODS_RECEIPT audit log entry will be created.
            </div>

            <button
              type="submit"
              disabled={isReceiving}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              {isReceiving ? 'Crediting Physical Stock...' : 'Confirm Goods Receipt & Credit Stock'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
};
