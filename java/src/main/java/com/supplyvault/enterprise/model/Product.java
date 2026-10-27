package com.supplyvault.enterprise.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Product Entity representing Kerala Depository inventory.
 */
public class Product {
    private String id;
    private String sku;
    private String name;
    private String description;
    private String category;
    private String unit;
    private BigDecimal purchaseCost;
    private BigDecimal sellingPrice;
    private int physicalStock;
    private int reservedStock;
    private int minStockLevel;
    private int reorderQuantity;
    private String supplierId;
    private String imageUrl;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Product() {}

    public Product(String id, String sku, String name, String category, String unit,
                   BigDecimal purchaseCost, BigDecimal sellingPrice,
                   int physicalStock, int reservedStock, int minStockLevel,
                   int reorderQuantity, String status) {
        this.id = id;
        this.sku = sku;
        this.name = name;
        this.category = category;
        this.unit = unit;
        this.purchaseCost = purchaseCost;
        this.sellingPrice = sellingPrice;
        this.physicalStock = physicalStock;
        this.reservedStock = reservedStock;
        this.minStockLevel = minStockLevel;
        this.reorderQuantity = reorderQuantity;
        this.status = status;
    }

    // Business Logic Methods
    public int getAvailableStock() {
        return Math.max(0, this.physicalStock - this.reservedStock);
    }

    public BigDecimal getInventoryValuation() {
        if (purchaseCost == null) return BigDecimal.ZERO;
        return purchaseCost.multiply(BigDecimal.valueOf(this.physicalStock));
    }

    public boolean isLowStock() {
        return this.physicalStock <= this.minStockLevel;
    }

    public boolean isOutOfStock() {
        return this.physicalStock <= 0;
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public BigDecimal getPurchaseCost() { return purchaseCost; }
    public void setPurchaseCost(BigDecimal purchaseCost) { this.purchaseCost = purchaseCost; }

    public BigDecimal getSellingPrice() { return sellingPrice; }
    public void setSellingPrice(BigDecimal sellingPrice) { this.sellingPrice = sellingPrice; }

    public int getPhysicalStock() { return physicalStock; }
    public void setPhysicalStock(int physicalStock) { this.physicalStock = physicalStock; }

    public int getReservedStock() { return reservedStock; }
    public void setReservedStock(int reservedStock) { this.reservedStock = reservedStock; }

    public int getMinStockLevel() { return minStockLevel; }
    public void setMinStockLevel(int minStockLevel) { this.minStockLevel = minStockLevel; }

    public int getReorderQuantity() { return reorderQuantity; }
    public void setReorderQuantity(int reorderQuantity) { this.reorderQuantity = reorderQuantity; }

    public String getSupplierId() { return supplierId; }
    public void setSupplierId(String supplierId) { this.supplierId = supplierId; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    @Override
    public String toString() {
        return String.format("[%s] %s | Physical: %d, Reserved: %d, Available: %d | Status: %s",
                sku, name, physicalStock, reservedStock, getAvailableStock(), status);
    }
}

