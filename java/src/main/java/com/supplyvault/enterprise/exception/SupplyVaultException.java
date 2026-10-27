package com.supplyvault.enterprise.exception;

public class SupplyVaultException extends RuntimeException {
    public SupplyVaultException(String message) {
        super(message);
    }

    public SupplyVaultException(String message, Throwable cause) {
        super(message, cause);
    }
}

