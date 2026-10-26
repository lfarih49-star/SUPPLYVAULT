package com.supplyvault.enterprise.model;

/**
 * Enterprise user roles in the SupplyVault Kerala SCM ecosystem.
 */
public enum Role {
    MANAGER("Command Centre Manager - Kakkanad Central"),
    STAFF("Operations Warehouse Executive - Bay C-12"),
    BUYER("Wholesale Procurement Merchant"),
    DELIVERY_AGENT("Kerala Logistics Field Officer");

    private final String description;

    Role(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
