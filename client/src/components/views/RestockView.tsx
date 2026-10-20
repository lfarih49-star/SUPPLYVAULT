import React, { useState, useEffect } from 'react';
import { ClipboardList, Plus, CheckCircle2, XCircle, Clock, Check, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/format';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { RestockRequest, Product } from '@shared/types';

export const RestockView: React.FC = () => {
  const { token, user } = useAuth();
  const [requests, setRequests] = useState<RestockRequest[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Staff Submit Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedProdId, setSelectedProdId] = useState('');
  const [reqQty, setReqQty] = useState(30);
  const [reqPriority, setReqPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('HIGH');
  const [reqReason, setReqReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Manager Review Modal
  const [reviewItem, setReviewItem] = useState<RestockRequest | null>(null);
  const [approvedQty, setApprovedQty] = useState(0);
  const [reviewNotes, setReviewNotes] = useState('');

  const fetchRestocks = async () => {
    if (!token) return;
    try {
      const [rRes, pRes] = await Promise.all([
        fetch(`/api/restock${statusFilter !== 'ALL' ? `?status=${statusFilter}` : ''}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/products', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (rRes.ok) setRequests(await rRes.json());
      if (pRes.ok) setProducts(await pRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestocks();
  }, [token, statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProdId || !token) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/restock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: selectedProdId,
          requestedQuantity: reqQty,
          priority: reqPriority,
          reason: reqReason,
        }),
      });

      if (res.ok) {
        setCreateModalOpen(false);
        setReqReason('');
        fetchRestocks();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReview = async (decision: 'APPROVE' | 'REJECT') => {
    if (!reviewItem || !token) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/restock/${reviewItem.id}/review`, {
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
        setReviewItem(null);
        fetchRestocks();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isManager = user?.role === 'MANAGER';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">
            Restock Requisitions & Approvals
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            End-to-end inventory requisition pipeline connecting warehouse floor requests to management PO authorization.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 text-navy-950 font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" /> New Restock Request
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(st => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all ${
              statusFilter === st
                ? 'bg-navy-900 text-gold-400 dark:bg-gold-500 dark:text-navy-950 shadow-sm'
                : 'bg-navy-900 text-slate-300 border border-slate-800 hover:border-gold-500'
            }`}
          >
            {st === 'ALL' ? 'All Requisitions' : st}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-navy-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-navy-950/60 text-slate-400 font-semibold uppercase">
                <th className="py-3 px-4">Product / SKU</th>
                <th className="py-3 px-4 font-mono text-center">Current Stock</th>
                <th className="py-3 px-4 font-mono text-center">Requested Qty</th>
                <th className="py-3 px-4 font-mono text-center">Approved Qty</th>
                <th className="py-3 px-4 text-center">Priority</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Requester</th>
                <th className="py-3 px-4">Date</th>
                {isManager && <th className="py-3 px-4 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {requests.map(r => (
                <tr key={r.id} className="hover:bg-navy-950/40">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-100">{r.productName}</div>
                    <span className="font-mono text-[10px] text-gold-600 dark:text-gold-400">{r.productSku}</span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono">{r.currentStock}</td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-gold-600 dark:text-gold-400">{r.requestedQuantity}</td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-emerald-600">
                    {r.approvedQuantity != null ? r.approvedQuantity : '—'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge
                      variant={r.priority === 'URGENT' ? 'danger' : r.priority === 'HIGH' ? 'warning' : 'neutral'}
                      size="sm"
                    >
                      {r.priority}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge
                      variant={r.status === 'APPROVED' ? 'success' : r.status === 'REJECTED' ? 'danger' : 'warning'}
                      size="sm"
                    >
                      {r.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-slate-400">{r.requesterName}</td>
                  <td className="py-3 px-4 text-slate-400">{formatDate(r.createdAt, false)}</td>
                  {isManager && (
                    <td className="py-3 px-4 text-right">
                      {r.status === 'PENDING' ? (
                        <button
                          onClick={() => {
                            setReviewItem(r);
                            setApprovedQty(r.requestedQuantity);
                            setReviewNotes('');
                          }}
                          className="px-3 py-1.5 bg-gold-500 hover:bg-gold-600 text-navy-950 font-bold rounded-lg shadow-sm"
                        >
                          Review
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono">Reviewed</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff Requisition Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Submit Stock Requisition"
        subtitle="Request approval from Management to replenish inventory."
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold block mb-1">Product</label>
            <select
              required
              value={selectedProdId}
              onChange={e => setSelectedProdId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-navy-950"
            >
              <option value="">-- Select Product --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) — Available: {p.availableStock}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold block mb-1">Requested Qty</label>
              <input
                type="number"
                min="1"
                required
                value={reqQty}
                onChange={e => setReqQty(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-navy-950 font-mono font-bold"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Priority</label>
              <select
                value={reqPriority}
                onChange={e => setReqPriority(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-navy-950"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent (Stock Out Imminent)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold block mb-1">Operational Justification</label>
            <textarea
              required
              rows={3}
              placeholder="Provide context for requirement..."
              value={reqReason}
              onChange={e => setReqReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-navy-950"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-gold-500 hover:bg-gold-600 text-navy-950 font-bold rounded-xl shadow-md transition-all"
          >
            {isSubmitting ? 'Submitting...' : 'Transmit Requisition to Manager'}
          </button>
        </form>
      </Modal>

      {/* Review Modal */}
      {reviewItem && (
        <Modal
          isOpen={true}
          onClose={() => setReviewItem(null)}
          title={`Review Requisition: ${reviewItem.productName}`}
          subtitle={`Requested by ${reviewItem.requesterName} • Priority: ${reviewItem.priority}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-navy-950 rounded-xl border border-slate-800 space-y-1">
              <div><span className="text-slate-400">SKU:</span> <b className="font-mono text-gold-600">{reviewItem.productSku}</b></div>
              <div><span className="text-slate-400">Current Stock:</span> <b className="font-mono">{reviewItem.currentStock} units</b></div>
              <div><span className="text-slate-400">Reason:</span> <span className="italic">{reviewItem.reason}</span></div>
            </div>

            <div>
              <label className="font-semibold block mb-1">Approved Quantity (Units)</label>
              <input
                type="number"
                min="1"
                value={approvedQty}
                onChange={e => setApprovedQty(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-navy-950 font-mono font-bold"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Review Notes</label>
              <textarea
                rows={2}
                placeholder="Approved for immediate procurement..."
                value={reviewNotes}
                onChange={e => setReviewNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-navy-950"
              />
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleReview('REJECT')}
                className="flex-1 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl border border-rose-200"
              >
                Reject Requisition
              </button>
              <button
                type="button"
                disabled={isSubmitting || approvedQty <= 0}
                onClick={() => handleReview('APPROVE')}
                className="flex-1 py-2 bg-gold-500 hover:bg-gold-600 text-navy-950 font-bold rounded-xl shadow-md"
              >
                Approve & Authorize
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
