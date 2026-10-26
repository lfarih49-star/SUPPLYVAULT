package com.supplyvault.enterprise.service;

import com.supplyvault.enterprise.model.AuditLog;
import com.supplyvault.enterprise.model.InventoryMovement;
import com.supplyvault.enterprise.repository.AuditRepository;
import com.supplyvault.enterprise.repository.AuditRepositoryImpl;

import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/**
 * Enterprise Multithreaded Audit Service.
 * Uses an asynchronous ExecutorService worker pool to log security & operational events.
 */
public class AuditService {
    private final AuditRepository auditRepository;
    private final ExecutorService executorService;

    public AuditService() {
        this.auditRepository = new AuditRepositoryImpl();
        this.executorService = Executors.newFixedThreadPool(2, r -> {
            Thread t = new Thread(r, "SupplyVault-AuditWorker");
            t.setDaemon(true);
            return t;
        });
    }

    public void logAsync(AuditLog log) {
        executorService.submit(() -> {
            try {
                auditRepository.save(log);
            } catch (Exception e) {
                System.err.println("[AsyncAuditWorker Error] " + e.getMessage());
            }
        });
    }

    public void recordMovementSync(InventoryMovement movement) {
        auditRepository.saveMovement(movement);
    }

    public List<AuditLog> getRecentLogs(int limit) {
        return auditRepository.findAll(limit);
    }

    public List<AuditLog> getLogsByRole(String role, int limit) {
        return auditRepository.findByRole(role, limit);
    }

    public List<AuditLog> searchLogs(String query, int limit) {
        return auditRepository.search(query, limit);
    }

    public void shutdown() {
        executorService.shutdown();
        try {
            if (!executorService.awaitTermination(2, TimeUnit.SECONDS)) {
                executorService.shutdownNow();
            }
        } catch (InterruptedException e) {
            executorService.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }
}
