import React, { useState, useEffect } from 'react';
import {
  Compass,
  Truck,
  MapPin,
  Phone,
  CheckCircle2,
  AlertOctagon,
  Clock,
  ArrowRight,
  Package,
  CheckCircle,
  FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatINR, formatDate } from '../../utils/format';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { Shipment } from '@shared/types';

interface DeliveryAgentDashboardProps {
  initialTab?: 'deliveries' | 'history';
}

export const DeliveryAgentDashboard: React.FC<DeliveryAgentDashboardProps> = ({ initialTab = 'deliveries' }) => {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'deliveries' | 'history'>(initialTab);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);

  // Failure Modal
  const [failModalShipment, setFailModalShipment] = useState<Shipment | null>(null);
  const [failureReason, setFailureReason] = useState('Customer unavailable at address');
  const [failureNotes, setFailureNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Status update confirmation
  const [confirmModal, setConfirmModal] = useState<{ shipment: Shipment; nextStatus: string } | null>(null);

  const fetchMyDeliveries = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/shipments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setShipments(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyDeliveries();
  }, [token]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const updateShipmentStatus = async (shipmentId: string, status: string, notes?: string, reason?: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/shipments/${shipmentId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
          notes,
          failureReason: reason,
        }),
      });

      if (res.ok) {
        setConfirmModal(null);
        setFailModalShipment(null);
        fetchMyDeliveries();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeDeliveries = shipments.filter(s => s.status !== 'DELIVERED');
  const completedDeliveries = shipments.filter(s => s.status === 'DELIVERED');

  const getNextAction = (s: Shipment) => {
    switch (s.status) {
      case 'ASSIGNED':
        return { label: 'Pick Up from Hub', nextStatus: 'PICKED_UP', variant: 'blue' };
      case 'PICKED_UP':
        return { label: 'Mark In Transit', nextStatus: 'IN_TRANSIT', variant: 'teal' };
      case 'IN_TRANSIT':
        return { label: 'Out for Delivery', nextStatus: 'OUT_FOR_DELIVERY', variant: 'amber' };
      case 'OUT_FOR_DELIVERY':
        return { label: 'Confirm Delivered', nextStatus: 'DELIVERED', variant: 'emerald' };
      case 'FAILED_ATTEMPT':
        return { label: 'Retry: Out for Delivery', nextStatus: 'OUT_FOR_DELIVERY', variant: 'amber' };
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Mobile-Friendly Logistics Header */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-navy-950 via-navy-900 to-navy-950 text-white border border-navy-800 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-gold-400 animate-spin-slow" />
              <h1 className="text-xl font-black tracking-tight text-white">
                Logistics Mission Control
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Field Courier: <b className="text-gold-400">{user?.fullName}</b> • Schedule: <span className="text-slate-300 font-mono">Asia/Kolkata</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 rounded-xl bg-navy-800/80 border border-navy-700 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Active Trips</span>
              <div className="text-lg font-black font-mono text-gold-400">{activeDeliveries.length}</div>
            </div>
            <div className="px-3.5 py-1.5 rounded-xl bg-navy-800/80 border border-navy-700 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Delivered</span>
              <div className="text-lg font-black font-mono text-emerald-400">{completedDeliveries.length}</div>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-navy-800/80">
          <button
            onClick={() => setActiveTab('deliveries')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'deliveries'
                ? 'bg-gold-500 text-navy-950 shadow-sm'
                : 'text-slate-400 hover:text-white bg-navy-850'
            }`}
          >
            Assigned Queue ({activeDeliveries.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-gold-500 text-navy-950 shadow-sm'
                : 'text-slate-400 hover:text-white bg-navy-850'
            }`}
          >
            Delivered History ({completedDeliveries.length})
          </button>
        </div>
      </div>

      {activeTab === 'deliveries' ? (
        <div className="space-y-4">
          {activeDeliveries.length === 0 ? (
            <div className="p-12 text-center bg-navy-900 rounded-2xl border border-slate-800">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-200">No Active Deliveries Assigned</h3>
              <p className="text-xs text-slate-400 mt-1">All assigned parcels have been delivered or await dispatch at the hub.</p>
            </div>
          ) : (
            activeDeliveries.map(s => {
              const action = getNextAction(s);

              return (
                <div
                  key={s.id}
                  className="p-5 rounded-2xl bg-navy-900 border border-slate-800 shadow-sm space-y-4 hover:border-gold-500/50 transition-all"
                >
                  {/* Top Bar */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-100 text-sm">
                          {s.trackingNumber}
                        </span>
                        <Badge
                          variant={
                            s.status === 'OUT_FOR_DELIVERY'
                              ? 'warning'
                              : s.status === 'FAILED_ATTEMPT'
                              ? 'danger'
                              : 'blue'
                          }
                          size="sm"
                        >
                          {s.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">Order: {s.orderNumber}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Value</span>
                      <div className="font-mono font-bold text-slate-100">
                        {formatINR(s.totalAmount)}
                      </div>
                    </div>
                  </div>

                  {/* Recipient & Destination Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-navy-950/60 border border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Customer Details</span>
                      <div className="font-bold text-slate-100">{s.recipientName}</div>
                      <div className="flex items-center gap-1.5 text-slate-300 mt-1">
                        <Phone className="w-3.5 h-3.5 text-gold-500" />
                        <a href={`tel:${s.recipientPhone}`} className="hover:underline font-mono">
                          {s.recipientPhone}
                        </a>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-navy-950/60 border border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Delivery Address</span>
                      <div className="flex items-start gap-1.5 text-slate-200">
                        <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <span>{s.deliveryAddress}, {s.city} - {s.postalCode}</span>
                      </div>
                    </div>
                  </div>

                  {/* Failure notice if failed attempt */}
                  {s.status === 'FAILED_ATTEMPT' && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-300">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertOctagon className="w-4 h-4" /> Previous Attempt Unsuccessful
                      </div>
                      <p className="mt-0.5 text-[11px]">{s.failureReason || 'Customer unreachable'}</p>
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                    <button
                      onClick={() => setFailModalShipment(s)}
                      className="px-3.5 py-2 text-xs font-semibold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-800 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <AlertOctagon className="w-4 h-4" /> Report Exception / Failed Attempt
                    </button>

                    {action && (
                      <button
                        onClick={() => setConfirmModal({ shipment: s, nextStatus: action.nextStatus })}
                        className="px-5 py-2.5 text-xs font-bold bg-navy-900 hover:bg-navy-800 text-gold-400 border border-gold-500/40 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
                      >
                        {action.label} <ArrowRight className="w-4 h-4 text-gold-400" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Completed History View */
        <div className="space-y-3">
          {completedDeliveries.map(s => (
            <div
              key={s.id}
              className="p-4 rounded-xl bg-navy-900 border border-slate-800 shadow-sm flex items-center justify-between text-xs"
            >
              <div>
                <div className="font-bold text-slate-100 flex items-center gap-2">
                  <span className="font-mono">{s.trackingNumber}</span>
                  <Badge variant="success" size="sm">DELIVERED</Badge>
                </div>
                <div className="text-slate-400 text-[11px] mt-0.5">
                  Delivered to {s.recipientName} ({s.city}) on {formatDate(s.deliveredAt || s.updatedAt, true)}
                </div>
              </div>
              <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {formatINR(s.totalAmount)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Exception Modal */}
      {failModalShipment && (
        <Modal
          isOpen={true}
          onClose={() => setFailModalShipment(null)}
          title="Log Delivery Exception"
          subtitle={`Tracking Ref: ${failModalShipment.trackingNumber} • Order: ${failModalShipment.orderNumber}`}
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-300 block mb-1">
                Reason for Incomplete Delivery
              </label>
              <select
                value={failureReason}
                onChange={e => setFailureReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-navy-950 text-slate-100"
              >
                <option value="Customer unavailable at address">Customer unavailable at address</option>
                <option value="Address unreachable / incorrect PIN code">Address unreachable / incorrect PIN code</option>
                <option value="Premises closed / security refusal">Premises closed / security refusal</option>
                <option value="Customer requested reschedule">Customer requested reschedule</option>
                <option value="Adverse weather / route block">Adverse weather / route block</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-300 block mb-1">
                Field Delivery Notes
              </label>
              <textarea
                rows={3}
                placeholder="Attempted delivery at 4:30 PM. Called phone number twice, no response."
                value={failureNotes}
                onChange={e => setFailureNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-navy-950 text-slate-100"
              />
            </div>

            <button
              disabled={isSubmitting}
              onClick={() => updateShipmentStatus(failModalShipment.id, 'FAILED_ATTEMPT', failureNotes, failureReason)}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md transition-all"
            >
              {isSubmitting ? 'Recording Exception...' : 'Confirm Delivery Exception'}
            </button>
          </div>
        </Modal>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <Modal
          isOpen={true}
          onClose={() => setConfirmModal(null)}
          title={`Update Shipment Status`}
          subtitle={`Advance ${confirmModal.shipment.trackingNumber} to '${confirmModal.nextStatus}'`}
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-300">
              Are you sure you want to transition this delivery to <b className="text-gold-500 font-mono">{confirmModal.nextStatus}</b>?
              {confirmModal.nextStatus === 'DELIVERED' && (
                <span className="block mt-2 text-emerald-600 font-semibold">
                  This will mark the customer order as DELIVERED and generate proof of delivery timestamps.
                </span>
              )}
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-2 bg-navy-950 hover:bg-navy-800 font-semibold rounded-xl text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => updateShipmentStatus(confirmModal.shipment.id, confirmModal.nextStatus)}
                className="flex-1 py-2 bg-gold-500 hover:bg-gold-600 text-navy-950 font-bold rounded-xl shadow-md"
              >
                {isSubmitting ? 'Updating...' : 'Confirm Update'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
