import React, { useState, useEffect } from 'react';
import { ShieldCheck, History, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/format';
import { Badge } from '../common/Badge';
import { AuditLog } from '@shared/types';

export const AuditLogView: React.FC = () => {
  const { token } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAudit = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/reports/audit', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setLogs(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAudit();
  }, [token]);

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
          Security & Operational Audit Trail
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Immutable audit record of all authentication, stock adjustments, purchase order authorizations, and checkout reservations.
        </p>
      </div>

      <div className="bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-navy-950/60 text-slate-400 font-semibold uppercase">
                <th className="py-3 px-4">Timestamp (IST)</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4 text-center">Role</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs.map(l => (
                <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-navy-950/40">
                  <td className="py-3 px-4 text-slate-400 whitespace-nowrap font-mono">{formatDate(l.createdAt, true)}</td>
                  <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">{l.actorName}</td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant={l.actorRole === 'MANAGER' ? 'gold' : l.actorRole === 'STAFF' ? 'teal' : 'blue'} size="sm">
                      {l.actorRole}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-slate-700 dark:text-slate-300">{l.action}</td>
                  <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{l.entityType}</td>
                  <td className="py-3 px-4 text-slate-500 max-w-sm truncate">{l.details || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
