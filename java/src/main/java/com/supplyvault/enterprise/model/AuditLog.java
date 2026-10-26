package com.supplyvault.enterprise.model;

import java.time.LocalDateTime;

/**
 * Immutable Audit Record for security and regulatory compliance.
 */
public class AuditLog {
    private String id;
    private String actorId;
    private String actorName;
    private String actorRole;
    private String action;
    private String entityType;
    private String entityId;
    private String details;
    private String ipAddress;
    private LocalDateTime createdAt;

    public AuditLog() {}

    public AuditLog(String id, String actorId, String actorName, String actorRole,
                    String action, String entityType, String entityId,
                    String details, String ipAddress, LocalDateTime createdAt) {
        this.id = id;
        this.actorId = actorId;
        this.actorName = actorName;
        this.actorRole = actorRole;
        this.action = action;
        this.entityType = entityType;
        this.entityId = entityId;
        this.details = details;
        this.ipAddress = ipAddress;
        this.createdAt = createdAt;
    }

    // Depository node resolution
    public String getDepotNode() {
        if (ipAddress == null) return "Direct Terminal";
        if (ipAddress.startsWith("10.14.20")) return "Kakkanad HQ Node";
        if (ipAddress.startsWith("10.14.22")) return "Depot Bay C-12";
        if (ipAddress.startsWith("10.14.35")) return "Technopark Terminal";
        if (ipAddress.startsWith("10.14.15")) return "Cochin Port Gateway";
        return "Secure Kerala Intranet";
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getActorId() { return actorId; }
    public void setActorId(String actorId) { this.actorId = actorId; }

    public String getActorName() { return actorName; }
    public void setActorName(String actorName) { this.actorName = actorName; }

    public String getActorRole() { return actorRole; }
    public void setActorRole(String actorRole) { this.actorRole = actorRole; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getEntityType() { return entityType; }
    public void setEntityType(String entityType) { this.entityType = entityType; }

    public String getEntityId() { return entityId; }
    public void setEntityId(String entityId) { this.entityId = entityId; }

    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }

    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    @Override
    public String toString() {
        return String.format("[%s] %s (%s) -> %s [%s] - %s",
                createdAt, actorName, actorRole, action, entityType, details);
    }
}
