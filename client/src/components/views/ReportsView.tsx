import React, { useState } from 'react';
import { FileDown, FileSpreadsheet, Download, Table, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';

export const ReportsView: React.FC = () => {
  const { token, user } = useAuth();
  const [downloadingType, setDownloadingType] = useState<string | null>(null);

  const reportCards = [
    {
      id: 'inventory',
      title: 'Inventory Valuation & Master Ledger',
      description: 'Complete catalogue with physical, reserved, and available stock units, and line item valuations.',
      filename: 'supplyvault_inventory_valuation.csv',
      variant: 'gold',
    },
    {
      id: 'orders',
      title: 'Buyer Orders & Revenue Report',
      description: 'Historical buyer sales, GST 18% breakdowns, customer addresses, and order fulfilment tracking statuses.',
      filename: 'supplyvault_orders_revenue.csv',
      variant: 'blue',
    },
    {
      id: 'purchase_orders',
      title: 'Procurement & Purchase Orders Report',
      description: 'Supplier PO expenditures, approval timestamps, and goods receipts delivery tracking.',
      filename: 'supplyvault_procurement_pos.csv',
      variant: 'teal',
    },
    {
      id: 'movements',
      title: 'Stock Movements & Adjustments Ledger',
      description: 'Full atomic stock ledger containing stock-in, stock-out, reservations, releases, and goods receipt movements.',
      filename: 'supplyvault_stock_movements.csv',
      variant: 'warning',
    },
    {
      id: 'deliveries',
      title: 'Logistics & Delivery Performance Report',
      description: 'Tracking numbers, assigned delivery agents, delivery completion timestamps, and field failure reasons.',
      filename: 'supplyvault_delivery_performance.csv',
      variant: 'success',
    },
    {
      id: 'audit',
      title: 'Security & Operations Audit Trail',
      description: 'Immutable forensic ledger of all authentication sessions, stock count adjustments, PO authorizations, and dispatches.',
      filename: 'supplyvault_audit_trail.csv',
      variant: 'blue',
    },
  ];

  const handleDownload = async (type: string, filename: string) => {
    setDownloadingType(type);
    try {
      const res = await fetch(`/api/reports/csv?type=${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloadingType(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-slate-800">
        <h1 className="text-2xl font-black text-slate-100 tracking-tight">
          Enterprise Reports & Data Exports
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Export actual persisted operational datasets with proper UTF-8 CSV formatting.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {reportCards.map(rep => (
          <div
            key={rep.id}
            className="p-6 rounded-2xl bg-navy-900 border border-slate-800 shadow-sm flex flex-col justify-between space-y-4 hover:border-blue-500/40 transition-all"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <Badge variant={rep.variant as any} size="sm">
                  CSV Export Available
                </Badge>
                <FileSpreadsheet className="w-5 h-5 text-slate-400" />
              </div>
              <h3 className="text-base font-bold text-slate-100 tracking-tight">
                {rep.title}
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {rep.description}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400">{rep.filename}</span>
              <button
                onClick={() => handleDownload(rep.id, rep.filename)}
                disabled={downloadingType === rep.id}
                className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-blue-400 border border-blue-500/30 rounded-xl shadow-md text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {downloadingType === rep.id ? (
                  'Exporting...'
                ) : (
                  <>
                    <Download className="w-4 h-4" /> Download CSV
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

