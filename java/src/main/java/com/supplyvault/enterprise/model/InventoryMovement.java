package com.supplyvault.enterprise.model;

import java.time.LocalDateTime;

/**
 * Atomic stock balance movement tracking entity.
 */
public class InventoryMovement {
    private String id;
    private String productId;
    private String productName;
    private String type;
    private int quantity;
    private int physicalBefore;
    private int physicalAfter;
    private int reservedBefore;
    private int reservedAfter;
    private String reason;
    private String referenceId;
    private String performedBy;
    private LocalDateTime createdAt;

    public InventoryMovement() {}

    public InventoryMovement(String id, String productId, String productName, String type,
                             int quantity, int physicalBefore, int physicalAfter,
                             int reservedBefore, int reservedAfter, String reason,
                             String referenceId, String performedBy, LocalDateTime createdAt) {
        this.id = id;
        this.productId = productId;
        this.productName = productName;
        this.type = type;
        this.quantity = quantity;
        this.physicalBefore = physicalBefore;
        this.physicalAfter = physicalAfter;
        this.reservedBefore = reservedBefore;
        this.reservedAfter = reservedAfter;
        this.reason = reason;
        this.referenceId = referenceId;
        this.performedBy = performedBy;
        this.createdAt = createdAt;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }

    public int getPhysicalBefore() { return physicalBefore; }
    public void setPhysicalBefore(int physicalBefore) { this.physicalBefore = physicalBefore; }

    public int getPhysicalAfter() { return physicalAfter; }
    public void setPhysicalAfter(int physicalAfter) { this.physicalAfter = physicalAfter; }

    public int getReservedBefore() { return reservedBefore; }
    public void setReservedBefore(int reservedBefore) { this.reservedBefore = reservedBefore; }

    public int getReservedAfter() { return reservedAfter; }
    public void setReservedAfter(int reservedAfter) { this.reservedAfter = reservedAfter; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getReferenceId() { return referenceId; }
    public void setReferenceId(String referenceId) { this.referenceId = referenceId; }

    public String getPerformedBy() { return performedBy; }
    public void setPerformedBy(String performedBy) { this.performedBy = performedBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
