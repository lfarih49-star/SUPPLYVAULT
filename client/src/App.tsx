import React, { useState, useEffect } from 'react';
import { useAuth, AuthProvider } from './context/AuthContext';
import { Shell } from './components/layout/Shell';
import { LoginView } from './components/views/LoginView';
import { ManagerDashboard } from './components/views/ManagerDashboard';
import { StaffDashboard } from './components/views/StaffDashboard';
import { BuyerDashboard } from './components/views/BuyerDashboard';
import { DeliveryAgentDashboard } from './components/views/DeliveryAgentDashboard';
import { ProductsView } from './components/views/ProductsView';
import { SuppliersView } from './components/views/SuppliersView';
import { InventoryView } from './components/views/InventoryView';
import { RestockView } from './components/views/RestockView';
import { PurchaseOrdersView } from './components/views/PurchaseOrdersView';
import { OrdersView } from './components/views/OrdersView';
import { ShipmentsView } from './components/views/ShipmentsView';
import { ReportsView } from './components/views/ReportsView';
import { AuditLogView } from './components/views/AuditLogView';

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  // Set default tab on role switch/login
  useEffect(() => {
    if (user) {
      if (user.role === 'BUYER') setCurrentTab('storefront');
      else if (user.role === 'DELIVERY_AGENT') setCurrentTab('deliveries');
      else setCurrentTab('dashboard');
    }
  }, [user?.role]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center text-gold-400">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono uppercase tracking-widest">Loading SupplyVault Enterprise...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  const renderActiveView = () => {
    switch (currentTab) {
      case 'dashboard':
        return user.role === 'STAFF' ? (
          <StaffDashboard onNavigateTab={setCurrentTab} />
        ) : (
          <ManagerDashboard onNavigateTab={setCurrentTab} />
        );
      case 'storefront':
        return <BuyerDashboard initialTab="storefront" />;
      case 'my-orders':
        return <BuyerDashboard initialTab="my-orders" />;
      case 'deliveries':
        return <DeliveryAgentDashboard initialTab="deliveries" />;
      case 'history':
        return <DeliveryAgentDashboard initialTab="history" />;
      case 'products':
        return <ProductsView />;
      case 'suppliers':
        return <SuppliersView />;
      case 'inventory':
        return <InventoryView />;
      case 'restock':
        return <RestockView />;
      case 'purchase-orders':
        return <PurchaseOrdersView />;
      case 'orders':
        return <OrdersView />;
      case 'shipments':
        return <ShipmentsView />;
      case 'reports':
        return <ReportsView />;
      case 'audit':
        return <AuditLogView />;
      default:
        return user.role === 'BUYER' ? (
          <BuyerDashboard />
        ) : user.role === 'DELIVERY_AGENT' ? (
          <DeliveryAgentDashboard />
        ) : (
          <ManagerDashboard onNavigateTab={setCurrentTab} />
        );
    }
  };

  return (
    <Shell
      currentTab={currentTab}
      onTabChange={setCurrentTab}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    >
      {renderActiveView()}
    </Shell>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;

