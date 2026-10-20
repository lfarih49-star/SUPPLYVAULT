import React, { useState } from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../utils/format';
import { AspectImage } from './AspectImage';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess?: (orderNumber: string) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose, onOrderSuccess }) => {
  const { cart, removeFromCart, updateCartQuantity, clearCart, cartTotalINR, token } = useAuth();
  const [shippingAddress, setShippingAddress] = useState('Ganga Building, Phase III, Technopark Campus, Kazhakkoottam');
  const [city, setCity] = useState('Thiruvananthapuram');
  const [postalCode, setPostalCode] = useState('695583');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const subtotal = cartTotalINR;
  const tax = Math.round(subtotal * 0.18 * 100) / 100; // 18% GST
  const grandTotal = subtotal + tax;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        items: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        shippingAddress,
        city,
        postalCode,
        notes,
      };

      const res = await fetch('/api/orders/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Checkout failed.');
      }

      clearCart();
      onClose();
      if (onOrderSuccess) {
        onOrderSuccess(data.order.order_number || data.order.orderNumber);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-navy-900 border-l border-slate-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-navy-950/40">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-bold text-slate-100 tracking-tight">
                Procurement Cart
              </h2>
              <span className="text-xs bg-blue-600/10 text-blue-300 dark:bg-navy-900 dark:text-blue-300 font-semibold px-2 py-0.5 rounded-full">
                {cart.reduce((s, i) => s + i.quantity, 0)} items
              </span>
            </div>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-400 dark:hover:text-slate-200 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
                <ShoppingBag className="w-12 h-12 text-slate-300 dark:text-slate-400 mb-3" />
                <p className="font-medium text-slate-300">Your cart is empty</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Browse our luxury enterprise catalogue and add items to your requisition cart.
                </p>
              </div>
            ) : (
              cart.map(({ product, quantity }) => (
                <div
                  key={product.id}
                  className="p-3.5 rounded-xl border border-slate-800 bg-navy-950/50 flex gap-3 items-center"
                >
                  <div className="w-16 h-16 shrink-0">
                    <AspectImage
                      src={product.imageUrl}
                      alt={product.name}
                      aspectRatio="1/1"
                      fallbackText={product.sku}
                      containerClassName="w-16 h-16 rounded-lg border border-slate-700"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-blue-400 font-mono">{product.sku}</p>
                    <h4 className="text-sm font-medium text-slate-100 truncate">{product.name}</h4>
                    <p className="text-xs font-bold text-slate-100 mt-0.5">
                      {formatINR(product.sellingPrice)}
                    </p>

                    {/* Stepper */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="inline-flex items-center border border-slate-700 rounded-lg bg-navy-900 overflow-hidden text-xs">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(product.id, quantity - 1)}
                          className="px-2 py-0.5 hover:bg-slate-800 text-slate-300 font-bold"
                        >
                          -
                        </button>
                        <span className="px-2.5 py-0.5 font-semibold text-slate-200">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(product.id, quantity + 1)}
                          className="px-2 py-0.5 hover:bg-slate-800 text-slate-300 font-bold"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-xs text-slate-400">{product.unit}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => removeFromCart(product.id)}
                    className="text-slate-400 hover:text-rose-500 p-1.5 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}

            {cart.length > 0 && (
              <form onSubmit={handleCheckout} id="checkout-form" className="mt-6 pt-4 border-t border-slate-800 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Delivery Address (Kerala, India)
                </h3>

                {error && (
                  <div className="p-3 text-xs bg-rose-950/40 text-rose-300 rounded-lg border border-rose-800/60">
                    {error}
                  </div>
                )}

                <div>
                  <label className="text-xs text-slate-400">Street / Facility Address</label>
                  <input
                    type="text"
                    required
                    value={shippingAddress}
                    onChange={e => setShippingAddress(e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-xs border border-slate-700 rounded-lg bg-navy-950 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400">City</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-xs border border-slate-700 rounded-lg bg-navy-950 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">PIN Code</label>
                    <input
                      type="text"
                      required
                      value={postalCode}
                      onChange={e => setPostalCode(e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-xs border border-slate-700 rounded-lg bg-navy-950 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400">Delivery Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="Gate entry instructions, contact on arrival"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-xs border border-slate-700 rounded-lg bg-navy-950 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
              </form>
            )}
          </div>

          {/* Footer with Calculations */}
          {cart.length > 0 && (
            <div className="p-6 border-t border-slate-800 bg-navy-950/80 space-y-3">
              <div className="space-y-1.5 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-100 font-mono">{formatINR(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST (18% Integrated)</span>
                  <span className="font-semibold text-slate-100 font-mono">{formatINR(tax)}</span>
                </div>
                <div className="pt-2 border-t border-slate-700 flex justify-between text-sm font-bold text-slate-100">
                  <span>Grand Total</span>
                  <span className="text-blue-400 font-mono text-base">{formatINR(grandTotal)}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-blue-400 dark:text-blue-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Atomic stock reservation upon checkout confirmation</span>
              </div>

              <button
                type="submit"
                form="checkout-form"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-gradient-to-r from-navy-900 via-navy-800 to-navy-900 hover:from-navy-800 hover:to-navy-700 text-blue-400 font-semibold rounded-xl shadow-lg border border-blue-500/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Confirming Reservation...' : 'Confirm Order & Reserve Stock'}
                <ArrowRight className="w-4 h-4 text-blue-400" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

