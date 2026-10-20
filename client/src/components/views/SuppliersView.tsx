import React, { useState, useEffect } from 'react';
import { Building2, Plus, Phone, Mail, MapPin, Clock, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatINR, formatDate } from '../../utils/format';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { Supplier } from '@shared/types';

export const SuppliersView: React.FC = () => {
  const { token, user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Supplier Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Mumbai');
  const [leadTimeDays, setLeadTimeDays] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSuppliers = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/suppliers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setSuppliers(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [token]);

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          contactPerson,
          email,
          phone,
          address,
          city,
          leadTimeDays,
        }),
      });

      if (res.ok) {
        setModalOpen(false);
        setName('');
        setContactPerson('');
        setEmail('');
        setPhone('');
        setAddress('');
        fetchSuppliers();
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Supplier & Vendor Network
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Certified enterprise vendor network with lead time monitoring and procurement performance.
          </p>
        </div>

        {isManager && (
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 text-navy-950 font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" /> Onboard Supplier
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {suppliers.map(s => (
          <div
            key={s.id}
            className="p-5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 hover:border-gold-500/40 transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  {s.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Point of Contact: <b className="text-slate-800 dark:text-slate-200">{s.contactPerson}</b>
                </p>
              </div>
              <Badge variant="success" size="sm">
                Active Supplier
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Mail className="w-3.5 h-3.5 text-gold-500 shrink-0" />
                <span className="truncate">{s.email}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Phone className="w-3.5 h-3.5 text-gold-500 shrink-0" />
                <span className="font-mono">{s.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 col-span-2">
                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>{s.address}, {s.city}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                <span>Lead Time: <b className="font-mono text-slate-800 dark:text-slate-200">{s.leadTimeDays} days</b></span>
              </div>
              <div className="flex items-center gap-1 text-gold-500 font-bold font-mono">
                <Star className="w-3.5 h-3.5 fill-gold-500" />
                <span>{s.rating || 4.8} / 5.0</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Onboard Enterprise Supplier"
        subtitle="Registered supplier will be eligible for Purchase Order issuance."
      >
        <form onSubmit={handleCreateSupplier} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold block mb-1">Company / Entity Name</label>
            <input
              type="text"
              required
              placeholder="Bharat Precision Metallurgy Pvt Ltd"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-navy-950"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold block mb-1">Contact Person</label>
              <input
                type="text"
                required
                placeholder="Ramesh Patel"
                value={contactPerson}
                onChange={e => setContactPerson(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-navy-950"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Phone Number</label>
              <input
                type="text"
                required
                placeholder="+91 22 2876 5432"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-navy-950 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold block mb-1">Official Email</label>
              <input
                type="email"
                required
                placeholder="procurement@bharatmetal.in"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-navy-950"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">City</label>
              <input
                type="text"
                required
                placeholder="Mumbai"
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-navy-950"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold block mb-1">Facility Address</label>
              <input
                type="text"
                required
                placeholder="Plot 12, Industrial Estate"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-navy-950"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Lead Time (Days)</label>
              <input
                type="number"
                min="1"
                required
                value={leadTimeDays}
                onChange={e => setLeadTimeDays(parseInt(e.target.value, 10) || 5)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-navy-950 font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-gold-500 hover:bg-gold-600 text-navy-950 font-bold rounded-xl shadow-md transition-all"
          >
            {isSubmitting ? 'Registering...' : 'Register Enterprise Supplier'}
          </button>
        </form>
      </Modal>
    </div>
  );
};
