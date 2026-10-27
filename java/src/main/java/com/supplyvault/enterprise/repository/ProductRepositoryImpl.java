package com.supplyvault.enterprise.repository;

import com.supplyvault.enterprise.config.DatabaseConfig;
import com.supplyvault.enterprise.exception.SupplyVaultException;
import com.supplyvault.enterprise.model.Product;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

public class ProductRepositoryImpl implements ProductRepository {
    private final DatabaseConfig dbConfig = DatabaseConfig.getInstance();

    @Override
    public List<Product> findAll() {
        String sql = "SELECT * FROM sv_products ORDER BY name ASC";
        List<Product> products = new ArrayList<>();

        try (Connection conn = dbConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                products.add(mapResultSetToProduct(rs));
            }
        } catch (SQLException e) {
            throw new SupplyVaultException("Failed to fetch products from PostgreSQL database", e);
        }
        return products;
    }

    @Override
    public Optional<Product> findById(String id) {
        String sql = "SELECT * FROM sv_products WHERE id = ?";
        try (Connection conn = dbConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return Optional.of(mapResultSetToProduct(rs));
                }
            }
        } catch (SQLException e) {
            throw new SupplyVaultException("Error querying product by ID: " + id, e);
        }
        return Optional.empty();
    }

    @Override
    public Optional<Product> findBySku(String sku) {
        String sql = "SELECT * FROM sv_products WHERE sku = ?";
        try (Connection conn = dbConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, sku);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return Optional.of(mapResultSetToProduct(rs));
                }
            }
        } catch (SQLException e) {
            throw new SupplyVaultException("Error querying product by SKU: " + sku, e);
        }
        return Optional.empty();
    }

    @Override
    public List<Product> findByCategory(String category) {
        String sql = "SELECT * FROM sv_products WHERE category = ? ORDER BY name ASC";
        List<Product> products = new ArrayList<>();

        try (Connection conn = dbConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, category);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    products.add(mapResultSetToProduct(rs));
                }
            }
        } catch (SQLException e) {
            throw new SupplyVaultException("Error querying products by category: " + category, e);
        }
        return products;
    }

    @Override
    public List<Product> findLowStockProducts() {
        String sql = "SELECT * FROM sv_products WHERE physical_stock <= min_stock_level ORDER BY physical_stock ASC";
        List<Product> products = new ArrayList<>();

        try (Connection conn = dbConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                products.add(mapResultSetToProduct(rs));
            }
        } catch (SQLException e) {
            throw new SupplyVaultException("Error querying low stock products", e);
        }
        return products;
    }

    @Override
    public void updateStock(String productId, int newPhysical, int newReserved) {
        String sql = "UPDATE sv_products SET physical_stock = ?, reserved_stock = ?, updated_at = NOW() WHERE id = ?";
        try (Connection conn = dbConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, newPhysical);
            ps.setInt(2, newReserved);
            ps.setString(3, productId);
            ps.executeUpdate();
        } catch (SQLException e) {
            throw new SupplyVaultException("Failed to update stock for product: " + productId, e);
        }
    }

    private Product mapResultSetToProduct(ResultSet rs) throws SQLException {
        Product p = new Product();
        p.setId(rs.getString("id"));
        p.setSku(rs.getString("sku"));
        p.setName(rs.getString("name"));
        p.setDescription(rs.getString("description"));
        p.setCategory(rs.getString("category"));
        p.setUnit(rs.getString("unit"));
        p.setPurchaseCost(rs.getBigDecimal("purchase_cost"));
        p.setSellingPrice(rs.getBigDecimal("selling_price"));
        p.setPhysicalStock(rs.getInt("physical_stock"));
        p.setReservedStock(rs.getInt("reserved_stock"));
        p.setMinStockLevel(rs.getInt("min_stock_level"));
        p.setReorderQuantity(rs.getInt("reorder_quantity"));
        p.setSupplierId(rs.getString("supplier_id"));
        p.setImageUrl(rs.getString("image_url"));
        p.setStatus(rs.getString("status"));

        Timestamp createdAt = rs.getTimestamp("created_at");
        if (createdAt != null) p.setCreatedAt(createdAt.toLocalDateTime());

        Timestamp updatedAt = rs.getTimestamp("updated_at");
        if (updatedAt != null) p.setUpdatedAt(updatedAt.toLocalDateTime());

        return p;
    }
}

