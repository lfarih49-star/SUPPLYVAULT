package com.supplyvault.enterprise;

import com.supplyvault.enterprise.cli.SupplyVaultCLI;
import com.supplyvault.enterprise.gui.SupplyVaultSwingUI;
import com.supplyvault.enterprise.server.SupplyVaultHttpServer;
import com.supplyvault.enterprise.service.AuditService;
import com.supplyvault.enterprise.service.InventoryService;

import javax.swing.*;
import java.awt.*;

/**
 * Main Master Entrypoint for SupplyVault Kerala SCM Java Enterprise Edition.
 */
public class Main {
    public static void main(String[] args) {
        System.out.println("=================================================================");
        System.out.println(" Starting SupplyVault Kerala Enterprise SCM (Java 21 Edition)");
        System.out.println(" Central Depository: Kakkanad, Kochi | PostgreSQL JDBC Integration");
        System.out.println("=================================================================");

        AuditService auditService = new AuditService();
        InventoryService inventoryService = new InventoryService(auditService);

        // Add JVM Shutdown Hook
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            System.out.println("\n[JVM Shutdown] Releasing JDBC connections and thread pools...");
            auditService.shutdown();
        }));

        boolean launchServer = false;
        boolean launchCli = false;
        boolean launchGui = false;

        for (String arg : args) {
            if ("--server".equalsIgnoreCase(arg)) launchServer = true;
            else if ("--cli".equalsIgnoreCase(arg)) launchCli = true;
            else if ("--gui".equalsIgnoreCase(arg)) launchGui = true;
        }

        // Start REST API server in background if requested or standalone
        if (launchServer) {
            try {
                SupplyVaultHttpServer server = new SupplyVaultHttpServer(inventoryService, auditService, 8080);
                server.start();
                if (!launchCli && !launchGui) {
                    System.out.println("[Java Enterprise] Server mode active. Press Ctrl+C to terminate.");
                    Thread.currentThread().join();
                    return;
                }
            } catch (Exception e) {
                System.err.println("Failed to start Java HTTP server: " + e.getMessage());
            }
        }

        if (launchCli) {
            SupplyVaultCLI cli = new SupplyVaultCLI(inventoryService, auditService);
            cli.start();
        } else if (launchGui) {
            startSwingGui(inventoryService, auditService);
        } else {
            // Default behavior: Check if Graphical environment is available
            if (!GraphicsEnvironment.isHeadless()) {
                startSwingGui(inventoryService, auditService);
            } else {
                SupplyVaultCLI cli = new SupplyVaultCLI(inventoryService, auditService);
                cli.start();
            }
        }
    }

    private static void startSwingGui(InventoryService inventoryService, AuditService auditService) {
        SwingUtilities.invokeLater(() -> {
            try {
                // Set system look and feel or Nimbus
                for (UIManager.LookAndFeelInfo info : UIManager.getInstalledLookAndFeels()) {
                    if ("Nimbus".equals(info.getName())) {
                        UIManager.setLookAndFeel(info.getClassName());
                        break;
                    }
                }
            } catch (Exception ignored) {}

            SupplyVaultSwingUI ui = new SupplyVaultSwingUI(inventoryService, auditService);
            ui.setVisible(true);
        });
    }
}
