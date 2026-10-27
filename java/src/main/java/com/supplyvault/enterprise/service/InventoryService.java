package com.supplyvault.enterprise.service;

import com.supplyvault.enterprise.exception.EntityNotFoundException;
import com.supplyvault.enterprise.exception.InsufficientStockException;
import com.supplyvault.enterprise.exception.ValidationException;
import com.supplyvault.enterprise.model.AuditLog;
import com.supplyvault.enterprise.model.InventoryMovement;
import com.supplyvault.enterprise.model.MovementType;
import com.supplyvault.enterprise.model.Product;
import com.supplyvault.enterprise.repository.ProductRepository;
import com.supplyvault.enterprise.repository.ProductRepositoryImpl;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Enterprise Stock Management Service.
 * Implements business rules for Kerala Depository real-time inventory adjustments.
 */
public class InventoryService {
    private final ProductRepository productRepository;
    private final AuditService auditService;

    public InventoryService(AuditService auditService) {
        this.productRepository = new ProductRepositoryImpl();
        this.auditService = auditService;
    }

    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    public Product getProductById(String id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Product", id));
    }

    public Product getProductBySku(String sku) {
        return productRepository.findBySku(sku)
                .orElseThrow(() -> new EntityNotFoundException("Product SKU", sku));
    }

    public List<Product> getLowStockAlerts() {
        return productRepository.findLowStockProducts();
    }

    /**
     * Calculates total inventory valuation in INR across all products using Java 21 Streams API.
     */
    public BigDecimal calculateTotalValuation() {
        return productRepository.findAll().stream()
                .map(Product::getInventoryValuation)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Executes atomic stock adjustment and emits audit event.
     */
    public synchronized Product adjustStock(String productId, MovementType type, int quantity,
                                           String reason, String actorName, String actorRole) {
        if (quantity <= 0) {
            throw new ValidationException("Adjustment quantity must be greater than zero.");
        }

        Product product = getProductById(productId);
        int physicalBefore = product.getPhysicalStock();
        int reservedBefore = product.getReservedStock();
        int physicalAfter = physicalBefore;

        switch (type) {
            case STOCK_IN -> physicalAfter += quantity;
            case STOCK_OUT -> {
                int available = physicalBefore - reservedBefore;
                if (quantity > available) {
                    throw new InsufficientStockException(product.getSku(), quantity, available);
                }
                physicalAfter -= quantity;
            }
            case ADJUSTMENT -> physicalAfter = quantity; // Absolute physical count
            default -> throw new ValidationException("Unsupported direct adjustment type: " + type);
        }

        // 1. Update stock in DB
        productRepository.updateStock(productId, physicalAfter, reservedBefore);

        // 2. Record inventory movement ledger
        InventoryMovement movement = new InventoryMovement(
                UUID.randomUUID().toString(),
                product.getId(),
                product.getName(),
                type.name(),
                quantity,
                physicalBefore,
                physicalAfter,
                reservedBefore,
                reservedBefore,
                reason != null ? reason : "Direct stock adjustment via Java Enterprise Service",
                "JAVA-DEPOT-" + System.currentTimeMillis() % 100000,
                actorName != null ? actorName : "Anjali Menon",
                null
        );
        auditService.recordMovementSync(movement);

        // 3. Emit asynchronous audit log
        AuditLog audit = new AuditLog();
        audit.setId(UUID.randomUUID().toString());
        audit.setActorName(actorName != null ? actorName : "Anjali Menon");
        audit.setActorRole(actorRole != null ? actorRole : "STAFF");
        audit.setAction("STOCK_ADJUSTMENT");
        audit.setEntityType("PRODUCT");
        audit.setEntityId(product.getSku());
        audit.setDetails(String.format("Adjusted %s via %s. Qty: %d (Before: %d, After: %d). Reason: %s",
                product.getName(), type, quantity, physicalBefore, physicalAfter, reason));
        audit.setIpAddress("10.14.22.45");
        auditService.logAsync(audit);

        // Return updated product state
        product.setPhysicalStock(physicalAfter);
        return product;
    }
}

