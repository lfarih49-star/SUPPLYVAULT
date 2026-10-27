package com.supplyvault.enterprise.exception;

public class EntityNotFoundException extends SupplyVaultException {
    public EntityNotFoundException(String entityType, String identifier) {
        super(String.format("%s not found with identifier: %s", entityType, identifier));
    }
}

