package com.supplyvault.enterprise.repository;

import com.supplyvault.enterprise.model.AuditLog;
import com.supplyvault.enterprise.model.InventoryMovement;

import java.util.List;

public interface AuditRepository {
    List<AuditLog> findAll(int limit);
    List<AuditLog> findByRole(String role, int limit);
    List<AuditLog> search(String query, int limit);
    void save(AuditLog log);
    void saveMovement(InventoryMovement movement);
}

