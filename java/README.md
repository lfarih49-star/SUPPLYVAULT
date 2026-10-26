# SupplyVault Kerala Enterprise SCM — Java 21 Enterprise Edition

Enterprise Java Architecture, JDBC Data Layer, Multithreaded Audit Worker, REST API, and Swing Desktop Console for Academic & University Evaluation.

---

## 1. Academic Concepts Demonstrated

| Academic Concept | Implementation in SupplyVault Java | File Reference |
| :--- | :--- | :--- |
| **Object-Oriented Programming (OOP)** | Inheritance, Encapsulation, Polymorphism, Abstraction | `model/Product.java`, `model/AuditLog.java`, `model/Order.java` |
| **Design Patterns** | **Singleton**: `DatabaseConfig.java`<br>**Repository Pattern**: `ProductRepository.java`<br>**Factory / Strategy**: `MovementType.java` | `config/DatabaseConfig.java`<br>`repository/ProductRepository.java` |
| **JDBC & Database Integration** | Connection Pooling (`HikariCP`), PreparedStatements, Transactions, SQL queries on PostgreSQL | `config/DatabaseConfig.java`<br>`repository/ProductRepositoryImpl.java` |
| **Multithreading & Concurrency** | Asynchronous audit worker queue with `ExecutorService` and Thread-safe synchronized mutations | `service/AuditService.java`<br>`service/InventoryService.java` |
| **Java 21 Streams & Lambdas** | `filter()`, `map()`, `reduce()`, `mapToInt().sum()` for valuation and low stock analytics | `service/InventoryService.java`<br>`cli/SupplyVaultCLI.java` |
| **Custom Exception Hierarchy** | Structured business rule exceptions with parameter tracking | `exception/InsufficientStockException.java`<br>`exception/EntityNotFoundException.java` |
| **REST Networking & HTTP Protocol** | Lightweight HTTP REST Server handling JSON requests and CORS | `server/SupplyVaultHttpServer.java` |
| **Graphical User Interface (GUI)** | Desktop window using Java Swing styled with custom Midnight Navy Blue & Black luxury theme | `gui/SupplyVaultSwingUI.java` |

---

## 2. Package Architecture

```text
com.supplyvault.enterprise
├── Main.java                          # Master entry point (GUI / CLI / Server router)
├── config/
│   └── DatabaseConfig.java            # Thread-safe Singleton HikariCP PostgreSQL pool
├── model/
│   ├── Product.java                   # Product entity with business valuation methods
│   ├── AuditLog.java                  # Immutable security audit entity
│   ├── Order.java                     # Commercial B2B order entity
│   ├── InventoryMovement.java         # Atomic movement ledger entity
│   ├── Role.java                      # Enum (MANAGER, STAFF, BUYER, DELIVERY_AGENT)
│   └── MovementType.java              # Enum (STOCK_IN, STOCK_OUT, ADJUSTMENT, etc.)
├── exception/
│   ├── SupplyVaultException.java      # Base unchecked exception
│   ├── InsufficientStockException.java# Triggered on negative stock breaches
│   ├── EntityNotFoundException.java   # Triggered on invalid SKU / UUID lookup
│   └── ValidationException.java       # Triggered on illegal operational inputs
├── repository/
│   ├── ProductRepository.java         # Interface for product data access
│   ├── ProductRepositoryImpl.java     # JDBC PostgreSQL implementation
│   ├── AuditRepository.java           # Interface for audit trails & movements
│   └── AuditRepositoryImpl.java       # JDBC PostgreSQL implementation
├── service/
│   ├── InventoryService.java          # Real-time atomic stock adjustments & streams
│   └── AuditService.java              # Multithreaded ExecutorService logging worker
├── server/
│   └── SupplyVaultHttpServer.java     # Lightweight REST API server (Port 8080)
├── cli/
│   └── SupplyVaultCLI.java            # Interactive ANSI terminal console
└── gui/
    └── SupplyVaultSwingUI.java        # Midnight Navy Blue & Black luxury desktop GUI
```

---

## 3. How to Run

### Option A: Launch the Luxury Swing Desktop GUI
```powershell
# From project root:
pnpm java:gui
# Or with Java directly:
java -jar java/target/supplyvault-enterprise-1.0.0.jar --gui
```

### Option B: Launch the Interactive Terminal CLI (Ideal for Lab Viva)
```powershell
# From project root:
pnpm java:cli
# Or with Java directly:
java -jar java/target/supplyvault-enterprise-1.0.0.jar --cli
```

### Option C: Launch the Java REST API Server (Port 8080)
```powershell
# From project root:
pnpm java:server
# Or with Java directly:
java -jar java/target/supplyvault-enterprise-1.0.0.jar --server
```

### Option D: Recompile with Maven
```powershell
# From project root:
pnpm java:build
# Or navigate to java folder:
cd java
mvn clean package -DskipTests
```
