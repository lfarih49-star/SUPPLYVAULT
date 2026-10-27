package com.supplyvault.enterprise.model;

/**
 * Types of inventory mutations executed in SupplyVault.
 */
public enum MovementType {
    STOCK_IN("Depot Stock Inbound Restock"),
    STOCK_OUT("Depot Stock Outbound Removal"),
    ADJUSTMENT("Cycle Count Physical Recount Adjustment"),
    GOODS_RECEIPT("Purchase Order Goods Received from Supplier"),
    ORDER_RESERVED("Buyer Order Stock Reservation"),
    ORDER_RELEASED("Cancelled Order Stock Restitution"),
    ORDER_DISPATCHED("Shipment Dispatched from Kakkanad Node");

    private final String description;

    MovementType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}

