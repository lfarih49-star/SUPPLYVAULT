package com.supplyvault.enterprise.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.net.URI;
import java.sql.Connection;
import java.sql.SQLException;

/**
 * Enterprise Database Configuration & HikariCP Connection Pool.
 * Implements the thread-safe Singleton Design Pattern.
 */
public class DatabaseConfig {
    private static volatile DatabaseConfig instance;
    private final HikariDataSource dataSource;

    private DatabaseConfig() {
        String dbUrl = resolveDatabaseUrl();
        HikariConfig config = new HikariConfig();

        try {
            if (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://")) {
                URI uri = new URI(dbUrl.replace("postgresql://", "http://").replace("postgres://", "http://"));
                String host = uri.getHost();
                int port = uri.getPort() == -1 ? 5432 : uri.getPort();
                String path = uri.getPath();
                String database = (path != null && path.length() > 1) ? path.substring(1) : "supplyvault";

                String jdbcUrl = String.format("jdbc:postgresql://%s:%d/%s", host, port, database);
                config.setJdbcUrl(jdbcUrl);

                if (uri.getUserInfo() != null) {
                    String[] userParts = uri.getUserInfo().split(":");
                    config.setUsername(userParts[0]);
                    if (userParts.length > 1) {
                        config.setPassword(userParts[1]);
                    }
                }
            } else {
                config.setJdbcUrl("jdbc:postgresql://localhost:5432/supplyvault");
                config.setUsername("postgres");
                config.setPassword("root");
            }
        } catch (Exception e) {
            config.setJdbcUrl("jdbc:postgresql://localhost:5432/supplyvault");
            config.setUsername("postgres");
            config.setPassword("root");
        }

        config.setDriverClassName("org.postgresql.Driver");
        config.setMaximumPoolSize(10);
        config.setMinimumIdle(2);
        config.setIdleTimeout(30000);
        config.setConnectionTimeout(10000);
        config.setPoolName("SupplyVault-HikariPool");

        this.dataSource = new HikariDataSource(config);
    }

    public static DatabaseConfig getInstance() {
        if (instance == null) {
            synchronized (DatabaseConfig.class) {
                if (instance == null) {
                    instance = new DatabaseConfig();
                }
            }
        }
        return instance;
    }

    public Connection getConnection() throws SQLException {
        return dataSource.getConnection();
    }

    public void close() {
        if (dataSource != null && !dataSource.isClosed()) {
            dataSource.close();
        }
    }

    private String resolveDatabaseUrl() {
        // 1. Check system environment
        String envUrl = System.getenv("DATABASE_URL");
        if (envUrl != null && !envUrl.isBlank()) return envUrl;

        // 2. Check Java system property
        String propUrl = System.getProperty("DATABASE_URL");
        if (propUrl != null && !propUrl.isBlank()) return propUrl;

        // 3. Check .env file in parent directories
        File[] envFiles = {
            new File(".env"),
            new File("../.env"),
            new File("../../.env"),
            new File("server/.env"),
            new File("../server/.env")
        };

        for (File f : envFiles) {
            if (f.exists() && f.isFile()) {
                try (BufferedReader reader = new BufferedReader(new FileReader(f))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        line = line.trim();
                        if (line.startsWith("DATABASE_URL=")) {
                            return line.substring("DATABASE_URL=".length()).trim();
                        }
                    }
                } catch (Exception ignored) {}
            }
        }

        return "postgresql://postgres:root@localhost:5432/supplyvault";
    }
}

