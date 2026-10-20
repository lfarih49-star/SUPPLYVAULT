import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Plus,
  Check,
  Search,
  SlidersHorizontal,
  Package,
  Truck,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatINR, formatDate } from '../../utils/format';
import { Badge } from '../common/Badge';
import { AspectImage } from '../common/AspectImage';
import { Product, Order } from '@shared/types';

interface BuyerDashboardProps {
  initialTab?: 'storefront' | 'my-orders';
}

export const BuyerDashboard: React.FC<BuyerDashboardProps> = ({ initialTab = 'storefront' }) => {
  const { token, user, addToCart, cart } = useAuth();
  const [activeTab, setActiveTab] = useState<'storefront' | 'my-orders'>(initialTab);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedAnimationId, setAddedAnimationId] = useState<string | null>(null);

  const fetchCatalogue = async () => {
    if (!token) return;
    try {
      const [prodRes, catRes, orderRes] = await Promise.all([
        fetch('/api/products', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/products/categories', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (prodRes.ok) setProducts(await prodRes.json());
      if (catRes.ok) setCategories(await catRes.json());
      if (orderRes.ok) setOrders(await orderRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogue();
  }, [token]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1);
    setAddedAnimationId(product.id);
    setTimeout(() => setAddedAnimationId(null), 1200);
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!token || !confirm('Are you sure you want to cancel this order? Stock reservations will be released.')) return;
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchCatalogue();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getOrderStatusSteps = (status: string) => {
    const steps = ['PLACED', 'CONFIRMED', 'PROCESSING', 'PACKED', 'DISPATCHED', 'DELIVERED'];
    const currentIndex = steps.indexOf(status);
    return { steps, currentIndex };
  };

  return (
    <div className="space-y-6">
      {/* Buyer Sub-Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">
            Kerala Hardware Wholesale Storefront
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Enterprise computing hardware catalogue with same-day dispatch across Kochi, Thiruvananthapuram, Kozhikode & statewide IT parks.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 p-1 bg-navy-950 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('storefront')}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              activeTab === 'storefront'
                ? 'bg-navy-800 text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            Product Catalogue
          </button>
          <button
            onClick={() => setActiveTab('my-orders')}
            className={`px-4 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'my-orders'
                ? 'bg-navy-800 text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            My Orders
            <span className="bg-blue-600/20 text-blue-400 dark:text-blue-400 px-1.5 py-0.2 rounded-full font-mono text-[10px]">
              {orders.length}
            </span>
          </button>
        </div>
      </div>

      {activeTab === 'storefront' ? (
        <div className="space-y-6">
          {/* Category Filter Pills & Search */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === 'ALL'
                    ? 'bg-navy-900 text-blue-400 dark:bg-blue-600 dark:text-navy-950 shadow-sm'
                    : 'bg-navy-900 text-slate-300 border border-slate-800 hover:border-blue-500'
                }`}
              >
                All Categories ({products.length})
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-navy-900 text-blue-400 dark:bg-blue-600 dark:text-navy-950 shadow-sm'
                      : 'bg-navy-900 text-slate-300 border border-slate-800 hover:border-blue-500'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search catalogue..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-navy-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProducts.map(product => {
              const isOutOfStock = product.availableStock <= 0;
              const isAdded = addedAnimationId === product.id;

              return (
                <div
                  key={product.id}
                  className="rounded-2xl glass-card glass-card-hover overflow-hidden flex flex-col group"
                >
                  {/* Fixed 16:9 Aspect Ratio Presentation Image */}
                  <div className="relative">
                    <AspectImage
                      src={product.imageUrl}
                      alt={product.name}
                      aspectRatio="16/9"
                      fallbackText={product.name}
                      containerClassName="border-b border-slate-800"
                      badge={
                        <span className="text-[10px] font-mono font-bold bg-navy-950/90 text-blue-400 backdrop-blur-sm px-2 py-0.5 rounded border border-blue-500/30">
                          {product.sku}
                        </span>
                      }
                    />

                    <div className="absolute top-2.5 right-2.5 z-10">
                      {isOutOfStock ? (
                        <Badge variant="danger" size="sm">Out of Stock</Badge>
                      ) : product.availableStock <= product.minStockLevel ? (
                        <Badge variant="warning" size="sm">Only {product.availableStock} Left</Badge>
                      ) : (
                        <Badge variant="success" size="sm">In Stock ({product.availableStock})</Badge>
                      )}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        {product.category}
                      </span>
                      <h3 className="text-sm font-bold text-slate-100 tracking-tight mt-0.5">
                        {product.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {product.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Unit Price</span>
                        <div className="text-base font-extrabold text-slate-100 font-mono">
                          {formatINR(product.sellingPrice)}
                          <span className="text-xs font-normal text-slate-400 font-sans ml-1">/ {product.unit}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddToCart(product)}
                        disabled={isOutOfStock}
                        className={`px-3.5 py-2 text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-all ${
                          isOutOfStock
                            ? 'bg-navy-950 text-slate-400 cursor-not-allowed border border-slate-800'
                            : isAdded
                            ? 'bg-blue-600 text-white'
                            : 'btn-luxury-emerald'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-4 h-4" /> Added
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" /> Add to Requisition
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* My Orders & Tracking View */
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="p-12 text-center bg-navy-900 rounded-2xl border border-slate-800">
              <Package className="w-12 h-12 text-slate-300 dark:text-slate-400 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-200">No Orders Placed Yet</h3>
              <p className="text-xs text-slate-400 mt-1">Explore our product catalogue and place your first wholesale order.</p>
              <button
                onClick={() => setActiveTab('storefront')}
                className="mt-4 px-4 py-2 bg-navy-900 text-blue-400 font-semibold text-xs rounded-xl border border-blue-500/30"
              >
                Browse Products
              </button>
            </div>
          ) : (
            orders.map(order => {
              const { steps, currentIndex } = getOrderStatusSteps(order.status);
              const isEligibleForCancel = order.status === 'PLACED' || order.status === 'CONFIRMED';

              return (
                <div
                  key={order.id}
                  className="p-6 rounded-2xl bg-navy-900 border border-slate-800 shadow-sm space-y-5"
                >
                  {/* Top Bar of Order Card */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-100 font-mono">
                          {order.orderNumber}
                        </span>
                        <Badge
                          variant={
                            order.status === 'DELIVERED'
                              ? 'success'
                              : order.status === 'CANCELLED'
                              ? 'danger'
                              : order.status === 'DISPATCHED'
                              ? 'teal'
                              : 'blue'
                          }
                          size="sm"
                        >
                          {order.status}
                        </Badge>
                      </div>
                      <span className="text-slate-400 text-[11px]">
                        Placed on {formatDate(order.createdAt, true)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Amount</span>
                        <div className="text-sm font-extrabold text-blue-400 dark:text-blue-400 font-mono">
                          {formatINR(order.totalAmount)}
                        </div>
                      </div>

                      {isEligibleForCancel && (
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-semibold rounded-lg border border-rose-800/60 text-xs transition-colors"
                        >
                          Cancel Order
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Delivery Tracking Bar Diagram */}
                  {order.status !== 'CANCELLED' && (
                    <div className="py-2">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-2">
                        <span>Fulfilment Tracking Progression</span>
                        {order.trackingNumber && (
                          <span className="font-mono text-cyan-600 dark:text-cyan-400">
                            Tracking: <b>{order.trackingNumber}</b> ({order.assignedAgentName || 'Agent Assigned'})
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-6 gap-2">
                        {steps.map((st, idx) => {
                          const isDone = idx <= currentIndex;
                          const isCurrent = idx === currentIndex;
                          return (
                            <div key={st} className="space-y-1">
                              <div
                                className={`h-2.5 rounded-full transition-all ${
                                  isDone
                                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 shadow-sm shadow-cyan-500/30'
                                    : 'bg-navy-900 dark:bg-navy-800'
                                }`}
                              />
                              <div className="flex items-center gap-1">
                                {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping inline-block" />}
                                <p className={`text-[10px] truncate ${isCurrent ? 'font-bold text-cyan-400' : isDone ? 'text-blue-300' : 'text-slate-500'}`}>
                                  {st}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Shipping Address Summary */}
                  <div className="text-xs text-slate-400 flex items-center gap-1.5 pt-2">
                    <Truck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Destination: <b>{order.shippingAddress}, {order.city} - {order.postalCode}</b></span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
