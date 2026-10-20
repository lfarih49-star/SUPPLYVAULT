import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Filter, AlertTriangle, Edit3, ArrowUpDown, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../utils/format';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { AspectImage } from '../common/AspectImage';
import { ImageUploader } from '../common/ImageUploader';
import { Product } from '@shared/types';

export const ProductsView: React.FC = () => {
  const { token, user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [loading, setLoading] = useState(true);

  // Add Product Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newSku, setNewSku] = useState('');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCat, setNewCat] = useState('Raw Materials');
  const [newUnit, setNewUnit] = useState('Units');
  const [newPurchaseCost, setNewPurchaseCost] = useState(1000);
  const [newSellingPrice, setNewSellingPrice] = useState(1500);
  const [newPhysicalStock, setNewPhysicalStock] = useState(50);
  const [newMinStock, setNewMinStock] = useState(15);
  const [newReorderQty, setNewReorderQty] = useState(50);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit Product & Image Modal (Manager only)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCat, setEditCat] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editPurchaseCost, setEditPurchaseCost] = useState(0);
  const [editSellingPrice, setEditSellingPrice] = useState(0);
  const [editMinStock, setEditMinStock] = useState(10);
  const [editReorderQty, setEditReorderQty] = useState(50);
  const [editStatus, setEditStatus] = useState<any>('ACTIVE');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchProducts = async () => {
    if (!token) return;
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch('/api/products', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/products/categories', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (prodRes.ok) setProducts(await prodRes.json());
      if (catRes.ok) setCategories(await catRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [token]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sku: newSku,
          name: newName,
          description: newDesc,
          category: newCat,
          unit: newUnit,
          purchaseCost: newPurchaseCost,
          sellingPrice: newSellingPrice,
          physicalStock: newPhysicalStock,
          minStockLevel: newMinStock,
          reorderQuantity: newReorderQty,
          imageUrl: newImageUrl || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create product.');

      setAddModalOpen(false);
      setNewSku('');
      setNewName('');
      setNewDesc('');
      setNewImageUrl('');
      fetchProducts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setEditName(p.name);
    setEditDesc(p.description || '');
    setEditCat(p.category);
    setEditUnit(p.unit);
    setEditPurchaseCost(p.purchaseCost || 0);
    setEditSellingPrice(p.sellingPrice);
    setEditMinStock(p.minStockLevel);
    setEditReorderQty(p.reorderQuantity);
    setEditStatus(p.status);
    setEditImageUrl(p.imageUrl || '');
    setEditError(null);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !token) return;
    setIsEditSubmitting(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editName,
          description: editDesc,
          category: editCat,
          unit: editUnit,
          purchaseCost: editPurchaseCost,
          sellingPrice: editSellingPrice,
          minStockLevel: editMinStock,
          reorderQuantity: editReorderQty,
          status: editStatus,
          imageUrl: editImageUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update product.');

      setEditingProduct(null);
      fetchProducts();
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const filtered = products.filter(p => {
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesLow = !lowStockFilter || p.physicalStock <= p.minStockLevel;
    const matchesSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesLow && matchesSearch;
  });

  const isManager = user?.role === 'MANAGER';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
            Products & Enterprise Catalogue
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Centrally governed item master with fixed 16:9 presentation visuals, strict INR unit costs, and reorder levels.
          </p>
        </div>

        {isManager && (
          <button
            onClick={() => setAddModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 text-navy-950 font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" /> Add New Product
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-navy-900 p-4 rounded-2xl border border-slate-800 shadow-sm text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 border border-slate-700 rounded-xl bg-navy-950 text-slate-100 focus:outline-none focus:ring-2 focus:ring-gold-500/40"
          >
            <option value="ALL">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <button
            onClick={() => setLowStockFilter(!lowStockFilter)}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-colors ${
              lowStockFilter
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/40 font-bold'
                : 'border-slate-700 text-slate-400 hover:bg-navy-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Low Stock Alerts Only
          </button>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search SKU or name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-700 rounded-xl bg-navy-950 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500/40"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-navy-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-navy-950/80 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-3 w-28">Visual</th>
                <th className="py-3 px-4">SKU / Product</th>
                <th className="py-3 px-4">Category</th>
                {isManager && <th className="py-3 px-4 text-right">Purchase Cost (INR)</th>}
                <th className="py-3 px-4 text-right">Selling Price (INR)</th>
                <th className="py-3 px-4 text-center">Physical Stock</th>
                <th className="py-3 px-4 text-center">Reserved</th>
                <th className="py-3 px-4 text-center">Available Stock</th>
                <th className="py-3 px-4 text-center">Status</th>
                {isManager && <th className="py-3 px-4 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-navy-950/40 transition-colors">
                  <td className="py-2 px-3 w-28">
                    <AspectImage
                      src={p.imageUrl}
                      alt={p.name}
                      aspectRatio="16/9"
                      fallbackText={p.sku}
                      containerClassName="w-24 h-14 rounded-lg shadow-sm border border-slate-800"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-100">{p.name}</div>
                    <span className="font-mono text-[10px] text-gold-400 font-semibold">{p.sku}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-400">{p.category}</td>
                  {isManager && (
                    <td className="py-3 px-4 text-right font-mono text-slate-400">
                      {formatINR(p.purchaseCost || 0)}
                    </td>
                  )}
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-100">
                    {formatINR(p.sellingPrice)}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-slate-300">{p.physicalStock} {p.unit}</td>
                  <td className="py-3 px-4 text-center font-mono text-amber-400">{p.reservedStock}</td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-emerald-400">
                    {p.availableStock}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge
                      variant={
                        p.status === 'ACTIVE'
                          ? 'success'
                          : p.status === 'LOW_STOCK'
                          ? 'warning'
                          : p.status === 'OUT_OF_STOCK'
                          ? 'danger'
                          : 'neutral'
                      }
                      size="sm"
                    >
                      {p.status}
                    </Badge>
                  </td>
                  {isManager && (
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => openEditModal(p)}
                        className="px-2.5 py-1.5 rounded-xl bg-navy-800 hover:bg-navy-700 text-gold-400 border border-gold-500/30 text-[11px] font-semibold inline-flex items-center gap-1.5 transition-all shadow-sm"
                        title="Edit Details & Upload Image"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit / Image
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal (with fixed 16:9 Image Uploader) */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add New Enterprise Product"
        subtitle="Provision item with fixed 16:9 presentation visuals and INR accounting."
      >
        <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-950/50 text-rose-300 rounded-lg border border-rose-800">
              {error}
            </div>
          )}

          {/* 16:9 Image Uploader */}
          <div className="p-3 bg-navy-950 rounded-xl border border-slate-800">
            <ImageUploader
              value={newImageUrl}
              onChange={setNewImageUrl}
              label="Product Presentation Image (16:9 Ratio)"
              productTitle={newName || 'New Product'}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold block mb-1 text-slate-300">SKU (Unique)</label>
              <input
                type="text"
                required
                placeholder="SV-TITAN-09"
                value={newSku}
                onChange={e => setNewSku(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-navy-950 text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-gold-500/40"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1 text-slate-300">Category</label>
              <input
                type="text"
                required
                placeholder="Raw Materials"
                value={newCat}
                onChange={e => setNewCat(e.target.value)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-navy-950 text-slate-100 focus:outline-none focus:ring-2 focus:ring-gold-500/40"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold block mb-1 text-slate-300">Product Name</label>
            <input
              type="text"
              required
              placeholder="Precision Forged Alloy Billets"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-navy-950 text-slate-100 focus:outline-none focus:ring-2 focus:ring-gold-500/40"
            />
          </div>

          <div>
            <label className="font-semibold block mb-1 text-slate-300">Description</label>
            <textarea
              rows={2}
              placeholder="Aerospace grade alloy..."
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-navy-950 text-slate-100 focus:outline-none focus:ring-2 focus:ring-gold-500/40"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-semibold block mb-1 text-slate-300">Purchase Cost (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={newPurchaseCost}
                onChange={e => setNewPurchaseCost(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-navy-950 text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-gold-500/40"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1 text-slate-300">Selling Price (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={newSellingPrice}
                onChange={e => setNewSellingPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-navy-950 text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-gold-500/40"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1 text-slate-300">Unit</label>
              <input
                type="text"
                required
                value={newUnit}
                onChange={e => setNewUnit(e.target.value)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-navy-950 text-slate-100 focus:outline-none focus:ring-2 focus:ring-gold-500/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-semibold block mb-1 text-slate-300">Opening Stock</label>
              <input
                type="number"
                min="0"
                required
                value={newPhysicalStock}
                onChange={e => setNewPhysicalStock(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-navy-950 text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-gold-500/40"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1 text-slate-300">Min Safety Level</label>
              <input
                type="number"
                min="1"
                required
                value={newMinStock}
                onChange={e => setNewMinStock(parseInt(e.target.value, 10) || 10)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-navy-950 text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-gold-500/40"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1 text-slate-300">Reorder Qty</label>
              <input
                type="number"
                min="1"
                required
                value={newReorderQty}
                onChange={e => setNewReorderQty(parseInt(e.target.value, 10) || 50)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-navy-950 text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-gold-500/40"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-gold-500 hover:bg-gold-600 text-navy-950 font-bold rounded-xl shadow-md transition-all mt-2"
          >
            {isSubmitting ? 'Provisioning...' : 'Provision Product in Catalogue'}
          </button>
        </form>
      </Modal>

      {/* Edit Product & Image Modal (Manager Dedicated Feature) */}
      <Modal
        isOpen={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        title="Edit Product & Presentation Visual"
        subtitle={`Update master records and upload fixed 16:9 presentation images for ${editingProduct?.sku}.`}
      >
        {editingProduct && (
          <form onSubmit={handleUpdateProduct} className="space-y-4 text-xs">
            {editError && (
              <div className="p-3 bg-rose-950/50 text-rose-300 rounded-lg border border-rose-800">
                {editError}
              </div>
            )}

            {/* 16:9 Image Uploader with crop & preview */}
            <div className="p-3 bg-navy-950 rounded-xl border border-slate-800">
              <ImageUploader
                value={editImageUrl}
                onChange={setEditImageUrl}
                label="Product Presentation Image (16:9 Fixed Ratio)"
                productTitle={editName || editingProduct.name}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1 text-slate-300">SKU (Immutable)</label>
                <input
                  type="text"
                  disabled
                  value={editingProduct.sku}
                  className="w-full px-3 py-2 border border-slate-800 rounded-lg bg-navy-950 text-gold-400 font-mono cursor-not-allowed opacity-80"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1 text-slate-300">Category</label>
                <input
                  type="text"
                  required
                  value={editCat}
                  onChange={e => setEditCat(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-navy-950 text-slate-100 focus:outline-none focus:ring-2 focus:ring-gold-500/40"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold block mb-1 text-slate-300">Product Name</label>
              <input
                type="text"
                required
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-navy-950 text-slate-100 focus:outline-none focus:ring-2 focus:ring-gold-500/40"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1 text-slate-300">Description</label>
              <textarea
                rows={2}
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-navy-950 text-slate-100 focus:outline-none focus:ring-2 focus:ring-gold-500/40"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="font-semibold block mb-1 text-slate-300">Purchase Cost (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={editPurchaseCost}
                  onChange={e => setEditPurchaseCost(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-navy-950 text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-gold-500/40"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1 text-slate-300">Selling Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={editSellingPrice}
                  onChange={e => setEditSellingPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-navy-950 text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-gold-500/40"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1 text-slate-300">Unit</label>
                <input
                  type="text"
                  required
                  value={editUnit}
                  onChange={e => setEditUnit(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-navy-950 text-slate-100 focus:outline-none focus:ring-2 focus:ring-gold-500/40"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="font-semibold block mb-1 text-slate-300">Min Safety Level</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={editMinStock}
                  onChange={e => setEditMinStock(parseInt(e.target.value, 10) || 10)}
                  className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-navy-950 text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-gold-500/40"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1 text-slate-300">Reorder Qty</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={editReorderQty}
                  onChange={e => setEditReorderQty(parseInt(e.target.value, 10) || 50)}
                  className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-navy-950 text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-gold-500/40"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1 text-slate-300">Catalog Status</label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-navy-950 text-slate-100 focus:outline-none focus:ring-2 focus:ring-gold-500/40"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="LOW_STOCK">LOW_STOCK</option>
                  <option value="OUT_OF_STOCK">OUT_OF_STOCK</option>
                  <option value="DISCONTINUED">DISCONTINUED</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-navy-800 font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isEditSubmitting}
                className="flex-1 py-2.5 bg-gold-500 hover:bg-gold-600 text-navy-950 font-bold rounded-xl shadow-md transition-all"
              >
                {isEditSubmitting ? 'Saving Changes...' : 'Save Product & Image'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
