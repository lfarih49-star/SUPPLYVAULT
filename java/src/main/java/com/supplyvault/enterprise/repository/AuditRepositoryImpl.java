package com.supplyvault.enterprise.repository;

import com.supplyvault.enterprise.config.DatabaseConfig;
import com.supplyvault.enterprise.exception.SupplyVaultException;
import com.supplyvault.enterprise.model.AuditLog;
import com.supplyvault.enterprise.model.InventoryMovement;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class AuditRepositoryImpl implements AuditRepository {
    private final DatabaseConfig dbConfig = DatabaseConfig.getInstance();

    @Override
    public List<AuditLog> findAll(int limit) {
        String sql = "SELECT * FROM sv_audit_logs ORDER BY created_at DESC LIMIT ?";
        List<AuditLog> list = new ArrayList<>();

        try (Connection conn = dbConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, limit);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    list.add(mapResultSetToAuditLog(rs));
                }
            }
        } catch (SQLException e) {
            throw new SupplyVaultException("Failed to query audit logs", e);
        }
        return list;
    }

    @Override
    public List<AuditLog> findByRole(String role, int limit) {
        String sql = "SELECT * FROM sv_audit_logs WHERE actor_role = ? ORDER BY created_at DESC LIMIT ?";
        List<AuditLog> list = new ArrayList<>();

        try (Connection conn = dbConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, role);
            ps.setInt(2, limit);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    list.add(mapResultSetToAuditLog(rs));
                }
            }
        } catch (SQLException e) {
            throw new SupplyVaultException("Failed to query audit logs by role: " + role, e);
        }
        return list;
    }

    @Override
    public List<AuditLog> search(String query, int limit) {
        String sql = """
            SELECT * FROM sv_audit_logs
            WHERE actor_name ILIKE ? OR action ILIKE ? OR details ILIKE ? OR entity_type ILIKE ?
            ORDER BY created_at DESC LIMIT ?
        """;
        List<AuditLog> list = new ArrayList<>();
        String wild = "%" + query + "%";

        try (Connection conn = dbConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, wild);
            ps.setString(2, wild);
            ps.setString(3, wild);
            ps.setString(4, wild);
            ps.setInt(5, limit);

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    list.add(mapResultSetToAuditLog(rs));
                }
            }
        } catch (SQLException e) {
            throw new SupplyVaultException("Failed searching audit logs with query: " + query, e);
        }
        return list;
    }

    @Override
    public void save(AuditLog log) {
        String sql = """
            INSERT INTO sv_audit_logs (id, actor_id, actor_name, actor_role, action, entity_type, entity_id, details, ip_address, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        """;

        try (Connection conn = dbConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, log.getId() != null ? log.getId() : UUID.randomUUID().toString());
            ps.setString(2, log.getActorId());
            ps.setString(3, log.getActorName());
            ps.setString(4, log.getActorRole());
            ps.setString(5, log.getAction());
            ps.setString(6, log.getEntityType());
            ps.setString(7, log.getEntityId());
            ps.setString(8, log.getDetails());
            ps.setString(9, log.getIpAddress() != null ? log.getIpAddress() : "10.14.20.10");

            ps.executeUpdate();
        } catch (SQLException e) {
            throw new SupplyVaultException("Failed inserting audit record into PostgreSQL", e);
        }
    }

    @Override
    public void saveMovement(InventoryMovement m) {
        String sql = """
            INSERT INTO sv_inventory_movements 
            (id, product_id, product_name, type, quantity, physical_before, physical_after, reserved_before, reserved_after, reason, reference_id, performed_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        """;

        try (Connection conn = dbConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, m.getId() != null ? m.getId() : UUID.randomUUID().toString());
            ps.setString(2, m.getProductId());
            ps.setString(3, m.getProductName());
            ps.setString(4, m.getType());
            ps.setInt(5, m.getQuantity());
            ps.setInt(6, m.getPhysicalBefore());
            ps.setInt(7, m.getPhysicalAfter());
            ps.setInt(8, m.getReservedBefore());
            ps.setInt(9, m.getReservedAfter());
            ps.setString(10, m.getReason());
            ps.setString(11, m.getReferenceId());
            ps.setString(12, m.getPerformedBy());

            ps.executeUpdate();
        } catch (SQLException e) {
            throw new SupplyVaultException("Failed inserting inventory movement record", e);
        }
    }

    private AuditLog mapResultSetToAuditLog(ResultSet rs) throws SQLException {
        AuditLog log = new AuditLog();
        log.setId(rs.getString("id"));
        log.setActorId(rs.getString("actor_id"));
        log.setActorName(rs.getString("actor_name"));
        log.setActorRole(rs.getString("actor_role"));
        log.setAction(rs.getString("action"));
        log.setEntityType(rs.getString("entity_type"));
        log.setEntityId(rs.getString("entity_id"));
        log.setDetails(rs.getString("details"));
        log.setIpAddress(rs.getString("ip_address"));

        Timestamp ts = rs.getTimestamp("created_at");
        if (ts != null) log.setCreatedAt(ts.toLocalDateTime());

        return log;
    }
}

