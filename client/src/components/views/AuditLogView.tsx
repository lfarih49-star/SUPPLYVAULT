import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Download,
  Filter,
  User,
  Boxes,
  FileText,
  Lock,
  Truck,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  Eye,
  Activity,
  Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/format';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { AuditLog } from '@shared/types';

export const AuditLogView: React.FC = () => {
  const { token } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Selected Log for Deep Inspection Modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchAuditLogs = async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      const res = await fetch('/api/reports/audit?limit=250', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [token]);

  // Export CSV
  const handleExportCSV = async () => {
    if (!token) return;
    setDownloading(true);
    try {
      const res = await fetch('/api/reports/csv?type=audit', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `supplyvault_audit_trail_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      console.error('Failed to export audit CSV:', err);
    } finally {
      setDownloading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Categorize Actions
  const getActionCategory = (action: string) => {
    const act = (action || '').toUpperCase();
    if (act.includes('STOCK') || act.includes('INVENTORY') || act.includes('ADJUST')) return 'STOCK';
    if (act.includes('LOGIN') || act.includes('AUTH') || act.includes('LOGOUT')) return 'AUTH';
    if (act.includes('PO_') || act.includes('PURCHASE') || act.includes('RECEIPT')) return 'PROCUREMENT';
    if (act.includes('RESTOCK') || act.includes('REQUISITION')) return 'REQUISITION';
    if (act.includes('ORDER') || act.includes('CHECKOUT')) return 'ORDERS';
    if (act.includes('SHIPMENT') || act.includes('DELIVERY') || act.includes('DISPATCH')) return 'LOGISTICS';
    return 'OTHER';
  };

  // KPI Metrics Calculation
  const metrics = useMemo(() => {
    const total = logs.length;
    let stockAdjustments = 0;
    let procurementAndOrders = 0;
    let authAndSecurity = 0;

    for (const log of logs) {
      const cat = getActionCategory(log.action);
      if (cat === 'STOCK') stockAdjustments++;
      else if (cat === 'PROCUREMENT' || cat === 'ORDERS' || cat === 'REQUISITION') procurementAndOrders++;
      else if (cat === 'AUTH') authAndSecurity++;
    }

    return { total, stockAdjustments, procurementAndOrders, authAndSecurity };
  }, [logs]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Role Filter
      if (selectedRole !== 'ALL' && log.actorRole !== selectedRole) {
        return false;
      }

      // Category Filter
      if (selectedCategory !== 'ALL') {
        const cat = getActionCategory(log.action);
        if (cat !== selectedCategory) return false;
      }

      // Text Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const actor = (log.actorName || '').toLowerCase();
        const action = (log.action || '').toLowerCase();
        const entityType = (log.entityType || '').toLowerCase();
        const entityId = (log.entityId || '').toLowerCase();
        const details = (log.details || '').toLowerCase();
        const ip = (log.ipAddress || '').toLowerCase();

        return (
          actor.includes(query) ||
          action.includes(query) ||
          entityType.includes(query) ||
          entityId.includes(query) ||
          details.includes(query) ||
          ip.includes(query)
        );
      }

      return true;
    });
  }, [logs, selectedRole, selectedCategory, searchQuery]);

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'MANAGER':
        return 'blue';
      case 'STAFF':
        return 'teal';
      case 'BUYER':
        return 'gold';
      case 'DELIVERY_AGENT':
        return 'success';
      default:
        return 'neutral';
    }
  };

  const getActionBadgeVariant = (action: string) => {
    const cat = getActionCategory(action);
    switch (cat) {
      case 'STOCK':
        return 'warning';
      case 'AUTH':
        return 'blue';
      case 'PROCUREMENT':
        return 'teal';
      case 'REQUISITION':
        return 'gold';
      case 'ORDERS':
        return 'success';
      case 'LOGISTICS':
        return 'teal';
      default:
        return 'neutral';
    }
  };

  const resolveDepotNode = (ip?: string) => {
    if (!ip) return 'Direct Terminal';
    if (ip.startsWith('10.14.20')) return 'Kakkanad HQ Node';
    if (ip.startsWith('10.14.22')) return 'Depot Bay C-12';
    if (ip.startsWith('10.14.35')) return 'Technopark Terminal';
    if (ip.startsWith('10.14.15')) return 'Cochin Port Gateway';
    return 'Secure Kerala Intranet';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
                Operations & Security Audit Trail
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Kerala Central Depository • Immutable real-time forensic ledger of inventory balance mutations, PO authorizations, dispatches, and authentication sessions.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchAuditLogs}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl border border-slate-800 hover:border-slate-700 bg-navy-900/90 hover:bg-navy-800 text-slate-300 text-xs font-semibold flex items-center gap-2 transition-all"
            title="Refresh logs from server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleExportCSV}
            disabled={downloading}
            className="px-4 py-2 btn-luxury-navy text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            {downloading ? 'Exporting...' : 'Export Audit CSV'}
          </button>
        </div>
      </div>

      {/* 4 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-navy-900 border border-slate-800/80 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Total Recorded Events</span>
            <h3 className="text-xl font-bold font-mono text-slate-100">{metrics.total}</h3>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-navy-900 border border-slate-800/80 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Stock Mutations & Audits</span>
            <h3 className="text-xl font-bold font-mono text-amber-300">{metrics.stockAdjustments}</h3>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-navy-900 border border-slate-800/80 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Procurement & Orders</span>
            <h3 className="text-xl font-bold font-mono text-blue-300">{metrics.procurementAndOrders}</h3>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-navy-900 border border-slate-800/80 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Auth & Security Sessions</span>
            <h3 className="text-xl font-bold font-mono text-teal-300">{metrics.authAndSecurity}</h3>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-navy-900 border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search audit trail by actor, action, product, order, details, or IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-navy-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Quick Active Record Counter */}
          <div className="text-xs text-slate-400 font-mono flex items-center gap-2 self-end md:self-center">
            <span>Showing: <strong className="text-slate-100">{filteredLogs.length}</strong> of {logs.length}</span>
            {(searchQuery || selectedRole !== 'ALL' || selectedCategory !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedRole('ALL');
                  setSelectedCategory('ALL');
                }}
                className="text-[11px] text-blue-400 hover:underline"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center gap-4">
          {/* Role Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 font-semibold uppercase mr-1">Role:</span>
            {['ALL', 'MANAGER', 'STAFF', 'BUYER', 'DELIVERY_AGENT'].map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  selectedRole === role
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-navy-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {role === 'ALL' ? 'All Roles' : role.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-slate-800 hidden md:block" />

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 font-semibold uppercase mr-1">Category:</span>
            {[
              { id: 'ALL', label: 'All Actions' },
              { id: 'STOCK', label: 'Stock Mutations' },
              { id: 'PROCUREMENT', label: 'Procurement & POs' },
              { id: 'REQUISITION', label: 'Requisitions' },
              { id: 'ORDERS', label: 'Buyer Orders' },
              { id: 'LOGISTICS', label: 'Logistics' },
              { id: 'AUTH', label: 'Auth & Login' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-navy-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-navy-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-mono uppercase tracking-widest text-blue-400">Loading audit records from PostgreSQL...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <ShieldCheck className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">No audit records matched your filter criteria.</p>
            <p className="text-xs text-slate-500">Try loosening your search query or selecting "All Roles".</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-navy-950/70 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Timestamp (IST)</th>
                  <th className="py-3.5 px-4">Operator / Actor</th>
                  <th className="py-3.5 px-4 text-center">Role</th>
                  <th className="py-3.5 px-4">Action Event</th>
                  <th className="py-3.5 px-4">Entity Target</th>
                  <th className="py-3.5 px-4">Event Narrative</th>
                  <th className="py-3.5 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredLogs.map((log) => {
                  const roleVariant = getRoleBadgeVariant(log.actorRole);
                  const actionVariant = getActionBadgeVariant(log.action);
                  const nodeName = resolveDepotNode(log.ipAddress);

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-navy-950/50 transition-colors group cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      {/* Timestamp */}
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap font-mono text-[11px]">
                        {formatDate(log.createdAt, true)}
                      </td>

                      {/* Actor */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-950/80 border border-blue-500/30 text-blue-300 font-bold flex items-center justify-center text-[10px] shrink-0">
                            {log.actorName ? log.actorName.split(' ').map(n => n[0]).join('').slice(0, 2) : 'SV'}
                          </div>
                          <div>
                            <span className="font-bold text-slate-200 block truncate max-w-[140px]">
                              {log.actorName || 'System Automated'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono block">
                              {nodeName}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <Badge variant={roleVariant} size="sm">
                          {log.actorRole}
                        </Badge>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant={actionVariant} size="sm">
                          {log.action}
                        </Badge>
                      </td>

                      {/* Entity Target */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-navy-950 border border-slate-800 text-slate-300 font-semibold">
                            {log.entityType || 'SYSTEM'}
                          </span>
                          {log.entityId && (
                            <span className="text-slate-400 font-mono text-[11px] truncate max-w-[100px]" title={log.entityId}>
                              {log.entityId}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Details */}
                      <td className="py-3 px-4 text-slate-400 max-w-xs truncate text-[11px]">
                        {log.details || '—'}
                      </td>

                      {/* Inspect Button */}
                      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 rounded-lg border border-slate-800 hover:border-blue-500/50 bg-navy-950 hover:bg-navy-900 text-slate-300 hover:text-blue-300 text-[11px] font-semibold inline-flex items-center gap-1 transition-all"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deep Inspection Modal */}
      {selectedLog && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedLog(null)}
          title="Audit Log Forensic Inspection"
          maxWidth="2xl"
        >
          <div className="space-y-5 text-xs">
            {/* Header Identity */}
            <div className="p-4 rounded-xl bg-navy-950 border border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-100 text-sm">{selectedLog.action}</h4>
                  <p className="text-slate-400 text-[11px] font-mono mt-0.5">
                    Target Entity: <span className="text-slate-200">{selectedLog.entityType}</span> {selectedLog.entityId && `(${selectedLog.entityId})`}
                  </p>
                </div>
              </div>
              <Badge variant={getRoleBadgeVariant(selectedLog.actorRole)} size="md">
                {selectedLog.actorRole}
              </Badge>
            </div>

            {/* Forensic Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-xl bg-navy-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Operator Name</span>
                <span className="text-slate-200 font-bold text-xs mt-1 block">{selectedLog.actorName || 'Automated Internal Job'}</span>
              </div>

              <div className="p-3 rounded-xl bg-navy-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Logged Timestamp</span>
                <span className="text-slate-200 font-mono text-xs mt-1 block">{formatDate(selectedLog.createdAt, true)}</span>
              </div>

              <div className="p-3 rounded-xl bg-navy-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Network Origin IP</span>
                <span className="text-slate-200 font-mono text-xs mt-1 block">{selectedLog.ipAddress || '10.14.20.10 (Local Intranet)'}</span>
              </div>

              <div className="p-3 rounded-xl bg-navy-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Physical Depository Node</span>
                <span className="text-slate-200 font-bold text-xs mt-1 block">{resolveDepotNode(selectedLog.ipAddress)}</span>
              </div>
            </div>

            {/* Event Narrative / Details */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">Full Event Payload & Narrative</span>
              <div className="p-3.5 rounded-xl bg-navy-950 border border-slate-800 text-slate-200 font-mono text-xs leading-relaxed break-words">
                {selectedLog.details || 'No detailed parameters recorded for this operation.'}
              </div>
            </div>

            {/* Unique Record ID */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-navy-950 border border-slate-800/80 text-[11px] font-mono text-slate-400">
              <span className="truncate max-w-md">Record UUID: {selectedLog.id}</span>
              <button
                onClick={() => copyToClipboard(selectedLog.id, selectedLog.id)}
                className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 shrink-0 ml-2"
              >
                {copiedId === selectedLog.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedId === selectedLog.id ? 'Copied' : 'Copy UUID'}
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
