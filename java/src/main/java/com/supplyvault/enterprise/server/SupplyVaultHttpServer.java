package com.supplyvault.enterprise.server;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import com.supplyvault.enterprise.model.MovementType;
import com.supplyvault.enterprise.model.Product;
import com.supplyvault.enterprise.service.AuditService;
import com.supplyvault.enterprise.service.InventoryService;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Lightweight, high-performance Java HTTP REST API Server.
 * Demonstrates Java Networking, HTTP Protocol handling, and JSON Serialization.
 */
public class SupplyVaultHttpServer {
    private final InventoryService inventoryService;
    private final AuditService auditService;
    private final Gson gson;
    private HttpServer server;
    private final int port;

    public SupplyVaultHttpServer(InventoryService inventoryService, AuditService auditService, int port) {
        this.inventoryService = inventoryService;
        this.auditService = auditService;
        this.port = port;
        this.gson = new GsonBuilder()
                .registerTypeAdapter(LocalDateTime.class, (com.google.gson.JsonSerializer<LocalDateTime>)
                        (src, typeOfSrc, context) -> new com.google.gson.JsonPrimitive(src.toString()))
                .setPrettyPrinting()
                .create();
    }

    public void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress(port), 0);

        // Endpoints
        server.createContext("/api/health", this::handleHealth);
        server.createContext("/api/products", this::handleProducts);
        server.createContext("/api/inventory/valuation", this::handleValuation);
        server.createContext("/api/reports/audit", this::handleAudit);

        server.setExecutor(null); // default executor
        server.start();
        System.out.println("[Java Enterprise REST Server] Listening on http://localhost:" + port);
    }

    public void stop() {
        if (server != null) {
            server.stop(0);
            System.out.println("[Java Enterprise REST Server] Stopped.");
        }
    }

    private void handleHealth(HttpExchange exchange) throws IOException {
        addCorsHeaders(exchange);
        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("status", "UP");
        resp.put("engine", "SupplyVault Java 21 Enterprise Server");
        resp.put("region", "Kerala, India");
        resp.put("hub", "Kakkanad Central Depot, Kochi");
        resp.put("timestamp", LocalDateTime.now().toString());

        sendJsonResponse(exchange, 200, resp);
    }

    private void handleProducts(HttpExchange exchange) throws IOException {
        addCorsHeaders(exchange);
        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        String path = exchange.getRequestURI().getPath();
        if ("GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            List<Product> products = inventoryService.getAllProducts();
            sendJsonResponse(exchange, 200, products);
        } else if ("POST".equalsIgnoreCase(exchange.getRequestMethod()) && path.contains("/adjust-stock")) {
            // e.g. /api/products/PRD-123/adjust-stock
            try {
                String[] parts = path.split("/");
                String productId = parts[3];

                InputStream is = exchange.getRequestBody();
                String body = new String(is.readAllBytes(), StandardCharsets.UTF_8);
                com.google.gson.JsonObject json = com.google.gson.JsonParser.parseString(body).getAsJsonObject();

                String typeStr = json.has("type") ? json.get("type").getAsString() : "STOCK_IN";
                MovementType type = MovementType.valueOf(typeStr);
                int qty = json.has("quantity") ? json.get("quantity").getAsInt() : 10;
                String reason = json.has("reason") ? json.get("reason").getAsString() : "Adjustment via Java REST API";

                Product updated = inventoryService.adjustStock(
                        productId, type, qty, reason, "Faizal Rahman", "MANAGER"
                );
                sendJsonResponse(exchange, 200, updated);
            } catch (Exception e) {
                sendJsonResponse(exchange, 400, Map.of("error", e.getMessage()));
            }
        } else {
            exchange.sendResponseHeaders(405, -1);
        }
    }

    private void handleValuation(HttpExchange exchange) throws IOException {
        addCorsHeaders(exchange);
        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        Map<String, Object> val = new HashMap<>();
        val.put("totalValuationINR", inventoryService.calculateTotalValuation());
        val.put("totalProducts", inventoryService.getAllProducts().size());
        val.put("lowStockCount", inventoryService.getLowStockAlerts().size());

        sendJsonResponse(exchange, 200, val);
    }

    private void handleAudit(HttpExchange exchange) throws IOException {
        addCorsHeaders(exchange);
        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        sendJsonResponse(exchange, 200, auditService.getRecentLogs(100));
    }

    private void addCorsHeaders(HttpExchange exchange) {
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }

    private void sendJsonResponse(HttpExchange exchange, int statusCode, Object data) throws IOException {
        String json = gson.toJson(data);
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);

        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        exchange.sendResponseHeaders(statusCode, bytes.length);

        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }
}
