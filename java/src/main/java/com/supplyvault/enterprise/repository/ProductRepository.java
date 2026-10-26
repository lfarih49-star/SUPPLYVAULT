package com.supplyvault.enterprise.repository;

import com.supplyvault.enterprise.model.Product;

import java.util.List;
import java.util.Optional;

public interface ProductRepository {
    List<Product> findAll();
    Optional<Product> findById(String id);
    Optional<Product> findBySku(String sku);
    List<Product> findByCategory(String category);
    List<Product> findLowStockProducts();
    void updateStock(String productId, int newPhysical, int newReserved);
}
