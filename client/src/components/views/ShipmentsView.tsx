import React, { useState, useEffect } from 'react';
import { Truck, UserCheck, AlertTriangle, CheckCircle2, Clock, MapPin, Phone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatINR, formatDate } from '../../utils/format';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { Shipment, User } from '@shared/types';

export const ShipmentsView: React.FC = () => {
  const { token, user } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Assign Modal
  const [assignShipment, setAssignShipment] = useState<Shipment | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchShipments = async () => {
    if (!token) return;
    try {
      const [sRes, aRes] = await Promise.all([
        fetch(`/api/shipments${statusFilter !== 'ALL' ? `?status=${statusFilter}` : ''}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/auth/delivery-agents', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (sRes.ok) setShipments(await sRes.json());
      if (aRes.ok) setAgents(await aRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, [token, statusFilter]);

  const handleAssignAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignShipment || !selectedAgentId || !token) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/shipments/${assignShipment.id}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ agentId: selectedAgentId }),
      });

      if (res.ok) {
        setAssignShipment(null);
        fetchShipments();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">
            Logistics & Shipment Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Fleet tracking, delivery agent assignments, delivery exception queues, and proof-of-delivery timestamps.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {['ALL', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED_ATTEMPT'].map(st => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap ${
              statusFilter === st
                ? 'bg-navy-900 text-gold-400 dark:bg-gold-500 dark:text-navy-950 shadow-sm'
                : 'bg-navy-900 text-slate-300 border border-slate-800 hover:border-gold-500'
            }`}
          >
            {st === 'ALL' ? 'All Shipments' : st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-navy-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-navy-950/60 text-slate-400 font-semibold uppercase">
                <th className="py-3 px-4">Tracking Ref</th>
                <th className="py-3 px-4">Order Number</th>
                <th className="py-3 px-4">Assigned Agent</th>
                <th className="py-3 px-4">Recipient & City</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Dispatched At</th>
                <th className="py-3 px-4">Delivered At</th>
                <th className="py-3 px-4 text-right">Dispatch Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {shipments.map(s => (
                <tr key={s.id} className="hover:bg-navy-950/40">
                  <td className="py-3 px-4 font-mono font-bold text-slate-100">
                    {s.trackingNumber}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500">{s.orderNumber}</td>
                  <td className="py-3 px-4">
                    {s.assignedAgentName ? (
                      <span className="font-semibold text-slate-200 flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-teal-500" />
                        {s.assignedAgentName}
                      </span>
                    ) : (
                      <span className="text-amber-600 font-semibold">Unassigned</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-200">{s.recipientName}</div>
                    <span className="text-[10px] text-slate-400">{s.city}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge
                      variant={
                        s.status === 'DELIVERED'
                          ? 'success'
                          : s.status === 'FAILED_ATTEMPT'
                          ? 'danger'
                          : s.status === 'OUT_FOR_DELIVERY'
                          ? 'warning'
                          : 'blue'
                      }
                      size="sm"
                    >
                      {s.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-slate-400">{s.dispatchedAt ? formatDate(s.dispatchedAt, true) : '—'}</td>
                  <td className="py-3 px-4 text-slate-400">{s.deliveredAt ? formatDate(s.deliveredAt, true) : '—'}</td>
                  <td className="py-3 px-4 text-right">
                    {s.status !== 'DELIVERED' && (
                      <button
                        onClick={() => {
                          setAssignShipment(s);
                          setSelectedAgentId(s.assignedAgentId || (agents[0]?.id || ''));
                        }}
                        className="px-2.5 py-1 bg-navy-800 hover:bg-navy-700 text-slate-200 font-semibold rounded-lg shadow-sm"
                      >
                        {s.assignedAgentName ? 'Reassign' : 'Assign Agent'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Agent Modal */}
      {assignShipment && (
        <Modal
          isOpen={true}
          onClose={() => setAssignShipment(null)}
          title={`Assign Delivery Agent`}
          subtitle={`Tracking Ref: ${assignShipment.trackingNumber} • Destination: ${assignShipment.city}`}
        >
          <form onSubmit={handleAssignAgent} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold block mb-1">Select Field Logistics Agent</label>
              <select
                required
                value={selectedAgentId}
                onChange={e => setSelectedAgentId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-navy-950 text-slate-100"
              >
                <option value="">-- Choose Courier Agent --</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.fullName} (@{a.username}) — Phone: {a.phone || 'Available'}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-navy-950 rounded-xl border border-slate-800">
              <span className="text-slate-400 block mb-0.5">Delivery Address:</span>
              <p className="font-medium text-slate-200">
                {assignShipment.deliveryAddress}, {assignShipment.city} - {assignShipment.postalCode}
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !selectedAgentId}
              className="w-full py-2.5 bg-gold-500 hover:bg-gold-600 text-navy-950 font-bold rounded-xl shadow-md transition-all"
            >
              {isSubmitting ? 'Assigning...' : 'Confirm Field Agent Assignment'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
};
