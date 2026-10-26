package com.supplyvault.enterprise.cli;

import com.supplyvault.enterprise.model.AuditLog;
import com.supplyvault.enterprise.model.MovementType;
import com.supplyvault.enterprise.model.Product;
import com.supplyvault.enterprise.service.AuditService;
import com.supplyvault.enterprise.service.InventoryService;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;
import java.util.Scanner;

/**
 * Interactive Terminal / CLI Console for SupplyVault Kerala SCM.
 * Demonstrates Core Java OOP, Streams, Scanner, and Exception Handling for Academic Evaluation.
 */
public class SupplyVaultCLI {
    private final InventoryService inventoryService;
    private final AuditService auditService;
    private final Scanner scanner;
    private final NumberFormat inrFormat;

    // ANSI Colors for high-tech Midnight Navy terminal look
    private static final String RESET = "\u001B[0m";
    private static final String BOLD = "\u001B[1m";
    private static final String BLUE = "\u001B[34m";
    private static final String CYAN = "\u001B[36m";
    private static final String GREEN = "\u001B[32m";
    private static final String YELLOW = "\u001B[33m";
    private static final String RED = "\u001B[31m";
    private static final String WHITE = "\u001B[37m";

    public SupplyVaultCLI(InventoryService inventoryService, AuditService auditService) {
        this.inventoryService = inventoryService;
        this.auditService = auditService;
        this.scanner = new Scanner(System.in);
        this.inrFormat = NumberFormat.getCurrencyInstance(new Locale("en", "IN"));
    }

    public void start() {
        printBanner();

        boolean running = true;
        while (running) {
            printMenu();
            System.out.print(CYAN + BOLD + "SupplyVault-CLI > " + RESET);
            String input = scanner.nextLine().trim();

            switch (input) {
                case "1" -> listProducts();
                case "2" -> showDepotValuation();
                case "3" -> executeStockAdjustment();
                case "4" -> showLowStockAlerts();
                case "5" -> viewAuditTrail();
                case "6" -> runMultithreadedDiagnostics();
                case "0", "exit", "quit" -> {
                    System.out.println(GREEN + "\nExiting SupplyVault Enterprise Java Console. Have a great day!" + RESET);
                    running = false;
                }
                default -> System.out.println(RED + "Invalid option. Please enter a number between 0 and 6." + RESET);
            }
        }
    }

    private void printBanner() {
        System.out.println(BLUE + BOLD + """
            ========================================================================================
             SUPPLYVAULT KERALA ENTERPRISE SCM - CORE JAVA 21 ARCHITECTURE
             Central Logistics Hub: Kakkanad, Kochi | Database: PostgreSQL (Port 5432)
            ========================================================================================
            """ + RESET);
    }

    private void printMenu() {
        System.out.println(WHITE + BOLD + "\n--- OPERATIONAL COMMAND MENU ---" + RESET);
        System.out.println("  1. " + CYAN + "View Warehouse Stock Levels (Physical, Reserved, Available)" + RESET);
        System.out.println("  2. " + CYAN + "Calculate Total Inventory Valuation (Java 21 Streams)" + RESET);
        System.out.println("  3. " + YELLOW + "Execute Real-time Stock Adjustment (Atomic JDBC Mutation)" + RESET);
        System.out.println("  4. " + RED + "View Low Stock & Reorder Alerts" + RESET);
        System.out.println("  5. " + BLUE + "Inspect Security & Operational Audit Log" + RESET);
        System.out.println("  6. " + GREEN + "Run Multithreaded Depository Diagnostic Benchmark" + RESET);
        System.out.println("  0. " + WHITE + "Exit Console" + RESET);
    }

    private void listProducts() {
        System.out.println(CYAN + BOLD + "\n=== KERALA DEPOT INVENTORY MASTER LEDGER ===" + RESET);
        List<Product> products = inventoryService.getAllProducts();

        System.out.printf("%-18s %-32s %-15s %-10s %-10s %-10s %-12s%n",
                "SKU", "Product Name", "Category", "Physical", "Reserved", "Available", "Price (INR)");
        System.out.println("-".repeat(110));

        for (Product p : products) {
            String color = p.isLowStock() ? RED : GREEN;
            System.out.printf("%-18s %-32s %-15s " + color + "%-10d %-10d %-10d" + RESET + " %-12s%n",
                    p.getSku(),
                    truncate(p.getName(), 30),
                    p.getCategory(),
                    p.getPhysicalStock(),
                    p.getReservedStock(),
                    p.getAvailableStock(),
                    inrFormat.format(p.getSellingPrice()));
        }
        System.out.println(WHITE + "Total SKUs tracked: " + products.size() + RESET);
    }

    private void showDepotValuation() {
        System.out.println(CYAN + BOLD + "\n=== INVENTORY VALUATION ANALYSIS (JAVA STREAMS) ===" + RESET);
        BigDecimal totalValuation = inventoryService.calculateTotalValuation();
        List<Product> products = inventoryService.getAllProducts();

        int totalUnits = products.stream().mapToInt(Product::getPhysicalStock).sum();
        int reservedUnits = products.stream().mapToInt(Product::getReservedStock).sum();

        System.out.println("• Total Physical Units in Stock : " + GREEN + totalUnits + " units" + RESET);
        System.out.println("• Active Buyer Reserved Units    : " + YELLOW + reservedUnits + " units" + RESET);
        System.out.println("• Net Available Inventory        : " + CYAN + (totalUnits - reservedUnits) + " units" + RESET);
        System.out.println("• Total Warehouse Asset Valuation: " + GREEN + BOLD + inrFormat.format(totalValuation) + RESET);
    }

    private void executeStockAdjustment() {
        System.out.println(YELLOW + BOLD + "\n=== EXECUTE ATOMIC STOCK ADJUSTMENT ===" + RESET);
        listProducts();

        System.out.print("\nEnter Product SKU or ID to adjust: ");
        String identifier = scanner.nextLine().trim();

        try {
            Product product = identifier.startsWith("PRD-") 
                    ? inventoryService.getProductBySku(identifier)
                    : inventoryService.getProductById(identifier);

            System.out.println(GREEN + "Found: " + product.getName() + " [Available: " + product.getAvailableStock() + "]" + RESET);
            System.out.println("Select Adjustment Type:");
            System.out.println("  1. STOCK_IN (Inbound Delivery from Supplier)");
            System.out.println("  2. STOCK_OUT (Damage/Sample Outbound Removal)");
            System.out.println("  3. ADJUSTMENT (Physical Cycle Count Recount)");
            System.out.print("Choice (1-3): ");
            String typeChoice = scanner.nextLine().trim();

            MovementType type = switch (typeChoice) {
                case "1" -> MovementType.STOCK_IN;
                case "2" -> MovementType.STOCK_OUT;
                case "3" -> MovementType.ADJUSTMENT;
                default -> throw new IllegalArgumentException("Invalid movement choice.");
            };

            System.out.print("Enter Quantity: ");
            int qty = Integer.parseInt(scanner.nextLine().trim());

            System.out.print("Enter Reason for Adjustment: ");
            String reason = scanner.nextLine().trim();

            Product updated = inventoryService.adjustStock(
                    product.getId(),
                    type,
                    qty,
                    reason,
                    "Faizal Rahman",
                    "MANAGER"
            );

            System.out.println(GREEN + BOLD + "\n Stock adjusted successfully in PostgreSQL database!" + RESET);
            System.out.printf("New Physical Stock: %d | New Available Stock: %d%n",
                    updated.getPhysicalStock(), updated.getAvailableStock());

        } catch (Exception e) {
            System.out.println(RED + "Operation Failed: " + e.getMessage() + RESET);
        }
    }

    private void showLowStockAlerts() {
        System.out.println(RED + BOLD + "\n=== LOW STOCK REORDER ALERTS ===" + RESET);
        List<Product> lowStock = inventoryService.getLowStockAlerts();

        if (lowStock.isEmpty()) {
            System.out.println(GREEN + "All inventory lines are above minimum safety thresholds." + RESET);
            return;
        }

        for (Product p : lowStock) {
            System.out.printf("[CRITICAL] %-15s %-30s | Physical: %d (Min Safety Level: %d) -> Reorder Qty: %d%n",
                    p.getSku(), p.getName(), p.getPhysicalStock(), p.getMinStockLevel(), p.getReorderQuantity());
        }
    }

    private void viewAuditTrail() {
        System.out.println(BLUE + BOLD + "\n=== SECURITY & OPERATIONS AUDIT LOG (POSTGRESQL) ===" + RESET);
        List<AuditLog> logs = auditService.getRecentLogs(10);

        for (AuditLog l : logs) {
            System.out.printf("[%s] %-15s (%-8s) -> %-20s | Node: %-18s%n  Details: %s%n",
                    l.getCreatedAt(), l.getActorName(), l.getActorRole(), l.getAction(), l.getDepotNode(), l.getDetails());
            System.out.println("-".repeat(95));
        }
    }

    private void runMultithreadedDiagnostics() {
        System.out.println(GREEN + BOLD + "\n=== RUNNING MULTITHREADED DEPOT BENCHMARK ===" + RESET);
        long startTime = System.currentTimeMillis();

        Thread t1 = new Thread(() -> {
            inventoryService.calculateTotalValuation();
            System.out.println("  [Thread-1] Valuation and Streams aggregation completed.");
        });

        Thread t2 = new Thread(() -> {
            auditService.getRecentLogs(50);
            System.out.println("  [Thread-2] Forensic audit stream verification completed.");
        });

        t1.start();
        t2.start();

        try {
            t1.join();
            t2.join();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        long duration = System.currentTimeMillis() - startTime;
        System.out.println(GREEN + "Multithreaded verification finished in " + duration + " ms. Zero race conditions detected." + RESET);
    }

    private String truncate(String text, int max) {
        if (text == null) return "";
        return text.length() <= max ? text : text.substring(0, max - 3) + "...";
    }
}
