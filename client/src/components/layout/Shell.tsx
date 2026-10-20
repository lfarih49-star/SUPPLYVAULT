import React, { useState } from 'react';
import {
  LayoutDashboard,
  Package,
  Truck,
  FileText,
  Users,
  ShieldCheck,
  ClipboardList,
  History,
  ShoppingBag,
  Bell,
  LogOut,
  Menu,
  X,
  Search,
  ShoppingCart,
  CheckCircle,
  Building2,
  Boxes,
  Compass
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NotificationsPopover } from '../common/NotificationsPopover';
import { CartDrawer } from '../common/CartDrawer';
import { Role } from '@shared/types';

interface ShellProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Shell: React.FC<ShellProps> = ({
  currentTab,
  onTabChange,
  children,
  searchQuery,
  onSearchChange,
}) => {
  const { user, logout, unreadCount, cart } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  if (!user) return null;

  // Role-specific navigation tabs
  const getNavItems = (role: Role) => {
    switch (role) {
      case 'MANAGER':
        return [
          { id: 'dashboard', label: 'Executive Command', icon: LayoutDashboard },
          { id: 'products', label: 'Products & Catalogue', icon: Package },
          { id: 'inventory', label: 'Inventory & Stock', icon: Boxes },
          { id: 'restock', label: 'Restock Approvals', icon: ClipboardList },
          { id: 'purchase-orders', label: 'Procurement (POs)', icon: FileText },
          { id: 'suppliers', label: 'Supplier Network', icon: Building2 },
          { id: 'orders', label: 'Buyer Orders', icon: ShoppingBag },
          { id: 'shipments', label: 'Logistics & Dispatch', icon: Truck },
          { id: 'reports', label: 'Enterprise Reports', icon: History },
          { id: 'audit', label: 'Audit Security Log', icon: ShieldCheck },
        ];
      case 'STAFF':
        return [
          { id: 'dashboard', label: 'Operations Hub', icon: LayoutDashboard },
          { id: 'inventory', label: 'Stock Adjustments', icon: Boxes },
          { id: 'restock', label: 'Requisition Requests', icon: ClipboardList },
          { id: 'purchase-orders', label: 'Goods Receipts', icon: FileText },
          { id: 'orders', label: 'Order Packing', icon: ShoppingBag },
          { id: 'shipments', label: 'Dispatch Shipments', icon: Truck },
        ];
      case 'BUYER':
        return [
          { id: 'storefront', label: 'Wholesale Storefront', icon: ShoppingBag },
          { id: 'my-orders', label: 'My Orders & Tracking', icon: Package },
        ];
      case 'DELIVERY_AGENT':
        return [
          { id: 'deliveries', label: 'Logistics Mission Control', icon: Compass },
          { id: 'history', label: 'Trip History', icon: CheckCircle },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems(user.role);

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'MANAGER':
        return 'border-gold-500/40 text-gold-400 bg-gold-950/40';
      case 'STAFF':
        return 'border-teal-500/40 text-teal-300 bg-teal-950/40';
      case 'BUYER':
        return 'border-blue-500/40 text-blue-300 bg-blue-950/40';
      case 'DELIVERY_AGENT':
        return 'border-emerald-500/40 text-emerald-300 bg-emerald-950/40';
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col antialiased">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 h-16 bg-navy-900/95 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 text-slate-300 hover:bg-navy-800 rounded-lg"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Brand Mark on Mobile / Header */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-navy-900 to-navy-950 border border-gold-500/40 flex items-center justify-center shadow-md">
              <span className="font-extrabold text-gold-400 font-mono text-sm tracking-wider">SV</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black tracking-tight text-slate-100 uppercase">
                  Supply<span className="text-gold-500">Vault</span>
                </span>
                
              </div>
              <p className="hidden sm:block text-[10px] text-slate-400 tracking-wider uppercase font-semibold">
                Computer Hardware & Laptop Supply Chain
              </p>
            </div>
          </div>
        </div>

        {/* Global Search */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search products, orders, POs, suppliers..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-navy-950 border border-slate-800 rounded-full text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-gold-500/40 transition-all"
            />
          </div>
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Buyer Cart Trigger */}
          {user.role === 'BUYER' && (
            <button
              onClick={() => setCartOpen(true)}
              className="relative p-2 text-slate-300 hover:bg-navy-800 rounded-full transition-colors"
              title="View Cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {cart.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-gold-500 text-navy-950 text-[10px] font-bold rounded-full flex items-center justify-center shadow-md animate-pulse">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </button>
          )}

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 text-slate-300 hover:bg-navy-800 rounded-full transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute 1.5 top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-navy-900" />
              )}
            </button>
            <NotificationsPopover
              isOpen={notificationsOpen}
              onClose={() => setNotificationsOpen(false)}
            />
          </div>

          {/* User Profile Pill & Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-bold text-slate-100 leading-tight">
                {user.fullName}
              </p>
              <span className={`text-[10px] uppercase font-mono px-1.5 py-0.2 rounded border ${getRoleBadge(user.role)}`}>
                {user.role}
              </span>
            </div>

            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gold-500 to-gold-400 text-navy-950 font-bold flex items-center justify-center text-xs shadow">
              {user.fullName.charAt(0)}
            </div>

            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
              title="Logout session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Body with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Midnight Navy Sidebar */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-40 w-64 bg-navy-950 text-slate-200 border-r border-navy-800 flex flex-col
            transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          {/* Sidebar Top Identity */}
          <div className="p-6 border-b border-navy-800/80">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-mono text-gold-400/80 uppercase tracking-widest font-semibold">
                  Platform Portal
                </p>
                <h3 className="text-sm font-bold text-white tracking-tight mt-0.5">
                  {user.role.replace('_', ' ')} PORTAL
                </h3>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium tracking-wide transition-all
                    ${
                      isActive
                        ? 'bg-gradient-to-r from-gold-500/20 to-transparent text-gold-300 font-bold border-l-2 border-gold-400 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-navy-900/60'
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-gold-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-navy-800/80 text-[11px] text-slate-500 space-y-1">
            
            <div className="flex justify-between items-center">
              <span>Timezone:</span>
              <span className="text-slate-300">Asia/Kolkata</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Build:</span>
              <span className="text-slate-400 font-mono">v1.0.0-PROD</span>
            </div>
          </div>
        </aside>

        {/* Content View Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Cart Drawer */}
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
};
