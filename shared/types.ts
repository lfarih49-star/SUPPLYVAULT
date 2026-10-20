export type Role = 'MANAGER' | 'STAFF' | 'BUYER' | 'DELIVERY_AGENT';

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: Role;
  phone?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  purchaseCost: number; // in INR
  sellingPrice: number; // in INR
  physicalStock: number;
  reservedStock: number;
  availableStock: number; // physicalStock - reservedStock
  minStockLevel: number;
  reorderQuantity: number;
  status: 'ACTIVE' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'DISCONTINUED';
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  leadTimeDays: number;
  status: 'ACTIVE' | 'INACTIVE';
  rating?: number;
  createdAt: string;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT' | 'GOODS_RECEIPT' | 'ORDER_RESERVED' | 'ORDER_RELEASED' | 'ORDER_DISPATCHED';
  quantity: number;
  physicalBefore: number;
  physicalAfter: number;
  reservedBefore: number;
  reservedAfter: number;
  reason: string;
  referenceId?: string;
  performedBy: string;
  createdAt: string;
}

export interface RestockRequest {
  id: string;
  productId: string;
  productName: string;
  productSku?: string;
  productCategory?: string;
  unitCostINR?: number;
  currentStock: number;
  requestedQuantity: number;
  approvedQuantity?: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ORDERED' | 'FULFILLED';
  requestedBy: string;
  requesterName: string;
  reviewedBy?: string;
  reviewerNotes?: string;
  purchaseOrderId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number; // INR
  totalCost: number; // INR
  receivedQuantity: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CLOSED' | 'REJECTED';
  totalAmount: number; // INR
  expectedDeliveryDate?: string;
  notes?: string;
  createdBy: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
  items?: PurchaseOrderItem[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number; // INR
  totalPrice: number; // INR
  imageUrl?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  status: 'PLACED' | 'CONFIRMED' | 'PROCESSING' | 'PACKED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';
  subtotal: number; // INR
  taxAmount: number; // INR (GST 18%)
  totalAmount: number; // INR
  shippingAddress: string;
  city: string;
  postalCode: string;
  notes?: string;
  trackingNumber?: string;
  assignedAgentName?: string;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
  shipment?: Shipment;
}

export interface DeliveryAttempt {
  timestamp: string;
  reason: string;
  notes?: string;
}

export interface Shipment {
  id: string;
  orderId: string;
  orderNumber: string;
  trackingNumber: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  status: 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED_ATTEMPT';
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  city: string;
  postalCode: string;
  estimatedDelivery?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  deliveryNotes?: string;
  failureReason?: string;
  attempts: DeliveryAttempt[];
  totalAmount: number; // INR
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId?: string;
  targetRole?: 'ALL' | Role;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  read: boolean;
  referenceUrl?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface ManagerKPIs {
  totalProducts: number;
  totalCategories: number;
  totalSuppliers: number;
  physicalStockUnits: number;
  reservedStockUnits: number;
  availableStockUnits: number;
  inventoryValuationINR: number;
  lowStockCount: number;
  outOfStockCount: number;
  pendingRestockRequestsCount: number;
  pendingPOsCount: number;
  ordersAwaitingProcessing: number;
  ordersInTransit: number;
  ordersDelivered: number;
  totalSalesValueINR: number;
  procurementExpenditureINR: number;
  failedDeliveriesCount: number;
}
