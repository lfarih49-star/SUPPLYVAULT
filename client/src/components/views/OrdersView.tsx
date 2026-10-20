import React, { useState, useEffect } from 'react';
import { ShoppingBag, ArrowRight, CheckCircle2, Truck, Box, Package } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatINR, formatDate } from '../../utils/format';
import { Badge } from '../common/Badge';
import { Order } from '@shared/types';

export const OrdersView: React.FC = () => {
  const { token, user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/orders${statusFilter !== 'ALL' ? `?status=${statusFilter}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setOrders(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [token, statusFilter]);

  const advanceStatus = async (orderId: string, nextStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Buyer Orders Fulfilment
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Order lifecycle management from placement, atomic reservation, packing, to logistics dispatch.
          </p>
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {['ALL', 'PLACED', 'CONFIRMED', 'PROCESSING', 'PACKED', 'DISPATCHED', 'DELIVERED', 'CANCELLED'].map(st => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap ${
              statusFilter === st
                ? 'bg-navy-900 text-gold-400 dark:bg-gold-500 dark:text-navy-950 shadow-sm'
                : 'bg-white dark:bg-navy-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-gold-500'
            }`}
          >
            {st === 'ALL' ? 'All Orders' : st}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-navy-950/60 text-slate-400 font-semibold uppercase">
                <th className="py-3 px-4">Order Number</th>
                <th className="py-3 px-4">Buyer Customer</th>
                <th className="py-3 px-4">Destination</th>
                <th className="py-3 px-4 text-right font-mono">Amount (INR)</th>
                <th className="py-3 px-4 text-center">Fulfilment Status</th>
                <th className="py-3 px-4">Tracking Number</th>
                <th className="py-3 px-4 text-right">Progress Workflow</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {orders.map(o => (
                <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-navy-950/40">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                    {o.orderNumber}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{o.buyerName}</div>
                    <span className="text-[10px] text-slate-400">{o.buyerEmail}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                    {o.city} ({o.postalCode})
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-gold-600 dark:text-gold-400">
                    {formatINR(o.totalAmount)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge
                      variant={
                        o.status === 'DELIVERED'
                          ? 'success'
                          : o.status === 'DISPATCHED'
                          ? 'teal'
                          : o.status === 'PACKED'
                          ? 'blue'
                          : o.status === 'PROCESSING'
                          ? 'warning'
                          : o.status === 'CANCELLED'
                          ? 'danger'
                          : 'neutral'
                      }
                      size="sm"
                    >
                      {o.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500">
                    {o.trackingNumber || '—'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {o.status === 'PLACED' && (
                        <button
                          onClick={() => advanceStatus(o.id, 'CONFIRMED')}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs"
                        >
                          Confirm
                        </button>
                      )}
                      {o.status === 'CONFIRMED' && (
                        <button
                          onClick={() => advanceStatus(o.id, 'PROCESSING')}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-navy-950 font-bold rounded-lg text-xs"
                        >
                          Process
                        </button>
                      )}
                      {o.status === 'PROCESSING' && (
                        <button
                          onClick={() => advanceStatus(o.id, 'PACKED')}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs"
                        >
                          Mark Packed
                        </button>
                      )}
                      {o.status === 'PACKED' && (
                        <button
                          onClick={() => advanceStatus(o.id, 'DISPATCHED')}
                          className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs"
                        >
                          Dispatch
                        </button>
                      )}
                      {o.status === 'DISPATCHED' && (
                        <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5" /> In Transit
                        </span>
                      )}
                      {o.status === 'DELIVERED' && (
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Complete
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
    </div>
  );
};
