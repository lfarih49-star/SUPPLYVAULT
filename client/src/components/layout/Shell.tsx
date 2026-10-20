import React, { useState } from 'react';
import {
  Boxes,
  ClipboardList,
  FileText,
  ShoppingBag,
  Truck,
  History,
  ShieldCheck,
  LayoutDashboard,
  Package,
  Compass,
  CheckCircle,
  Menu,
  X,
  Search,
  ShoppingCart,
  Bell,
  LogOut,
  Building2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Role } from '@shared/types';
import { CartDrawer } from '../common/CartDrawer';
import { NotificationsPopover } from '../common/NotificationsPopover';

interface ShellProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  children: React.ReactNode;
}

export const Shell: React.FC<ShellProps> = ({
  currentTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  children,
}) => {
  const { user, logout, unreadCount, cart } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  if (!user) return null;

  // Role-based Nav Configuration
  const getNavItems = (role: Role) => {
    switch (role) {
      case 'MANAGER':
        return [
          { id: 'dashboard', label: 'Command Centre', icon: LayoutDashboard },
          { id: 'products', label: 'Product Catalogue', icon: Package },
          { id: 'inventory', label: 'Warehouse Stock', icon: Boxes },
          { id: 'restock', label: 'Requisition Approvals', icon: ClipboardList },
          { id: 'purchase-orders', label: 'Purchase Orders', icon: FileText },
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
        return 'border-blue-500/40 text-blue-300 bg-blue-950/40 shadow-[0_0_10px_rgba(37,99,235,0.15)]';
      case 'STAFF':
        return 'border-slate-700 text-slate-300 bg-navy-900/80';
      case 'BUYER':
        return 'border-blue-500/40 text-blue-300 bg-blue-950/40 shadow-[0_0_10px_rgba(37,99,235,0.15)]';
      case 'DELIVERY_AGENT':
        return 'border-slate-700 text-slate-300 bg-navy-900/80';
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col antialiased">
      {/* Top Luxury Midnight Navy Frosted Navbar */}
      <header className="sticky top-0 z-30 h-16 bg-navy-950/90 backdrop-blur-2xl border-b border-slate-800/80 shadow-[0_4px_30px_rgba(0,0,0,0.6)] flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 text-slate-300 hover:bg-navy-900 rounded-xl transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Brand Mark with Navy Crest */}
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-b from-navy-850 to-navy-950 border border-blue-500/40 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.25),inset_0_1px_0_rgba(255,255,255,0.1)] group">
              <span className="font-mono text-sm font-black text-blue-400 tracking-wider">SV</span>
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_6px_#3b82f6] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black tracking-tight text-slate-100 uppercase">
                  Supply<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-blue-200">Vault</span>
                </span>
                <span className="hidden sm:inline-block text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-950/80 text-blue-400 border border-blue-500/30 uppercase tracking-widest font-bold">
                  Kerala Hub
                </span>
              </div>
              <p className="hidden md:block text-[10px] text-slate-400 tracking-wider uppercase font-semibold">
                Kerala IT Hardware & Computing Supply Chain Network
              </p>
            </div>
          </div>
        </div>

        {/* Global Search with Shortcut Pill */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search hardware catalog, orders, POs, serials..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-10 py-1.5 text-xs bg-navy-900/90 border border-slate-800 rounded-full text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/70 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner"
            />
            <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono text-slate-500 bg-navy-950 border border-slate-800 rounded absolute right-3 top-1/2 -translate-y-1/2">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right Tools & User Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Buyer Cart Trigger */}
          {user.role === 'BUYER' && (
            <button
              onClick={() => setCartOpen(true)}
              className="relative p-2 text-slate-300 hover:bg-navy-900 rounded-xl transition-colors border border-transparent hover:border-slate-800"
              title="View Cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {cart.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-gradient-to-r from-blue-500 to-blue-700 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg shadow-blue-500/40 animate-pulse">
                  {cart.reduce((s: number, i: any) => s + i.quantity, 0)}
                </span>
              )}
            </button>
          )}

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 text-slate-300 hover:bg-navy-900 rounded-xl transition-colors border border-transparent hover:border-slate-800"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute 1.5 top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full ring-2 ring-navy-950 shadow-[0_0_8px_#3b82f6]" />
              )}
            </button>
            <NotificationsPopover
              isOpen={notificationsOpen}
              onClose={() => setNotificationsOpen(false)}
            />
          </div>

          {/* User Profile Pill & Logout */}
          <div className="flex items-center gap-2.5 pl-3 border-l border-slate-800">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-bold text-slate-100 leading-tight">
                {user.fullName}
              </p>
              <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border ${getRoleBadge(user.role)}`}>
                {user.role}
              </span>
            </div>

            <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-navy-850 to-navy-950 text-blue-300 border border-blue-500/40 font-bold flex items-center justify-center text-xs shadow-inner">
              {user.fullName.charAt(0)}
            </div>

            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-xl transition-colors"
              title="Logout session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Body with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Obsidian Navy Sidebar */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-40 w-64 bg-navy-950/95 backdrop-blur-2xl text-slate-200 border-r border-slate-800 flex flex-col
            transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          {/* Sidebar Top Identity */}
          <div className="p-5 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  Privileged Access
                </p>
                <h3 className="text-sm font-extrabold text-white tracking-tight mt-0.5">
                  {user.role.replace('_', ' ')} WORKSPACE
                </h3>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
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
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium tracking-wide transition-all
                    ${
                      isActive
                        ? 'bg-blue-600/15 text-blue-300 font-semibold border-l-2 border-blue-500 shadow-[inset_0_0_12px_rgba(37,99,235,0.15)]'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-navy-900/60'
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer with Live Cluster Beacon */}
          <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_6px_#3B82F6] animate-pulse" />
                Cluster:
              </span>
              <span className="text-slate-300 font-mono text-[10px]">kerala-cochin-1 (Kochi)</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Central Depot:</span>
              <span className="text-slate-300 font-mono text-[10px]">Kakkanad, Ernakulam</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Timezone:</span>
              <span className="text-slate-300 font-mono text-[10px]">Asia/Kolkata</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-800/60">
              <span>Jurisdiction:</span>
              <span className="text-blue-400 font-mono text-[10px] font-bold">KERALA (GST 32)</span>
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
