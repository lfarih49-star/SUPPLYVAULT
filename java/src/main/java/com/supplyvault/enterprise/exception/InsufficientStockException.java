package com.supplyvault.enterprise.exception;

public class InsufficientStockException extends SupplyVaultException {
    private final String sku;
    private final int requested;
    private final int available;

    public InsufficientStockException(String sku, int requested, int available) {
        super(String.format("Insufficient inventory for SKU [%s]: Requested %d units, but only %d available.",
                sku, requested, available));
        this.sku = sku;
        this.requested = requested;
        this.available = available;
    }

    public String getSku() { return sku; }
    public int getRequested() { return requested; }
    public int getAvailable() { return available; }
}
