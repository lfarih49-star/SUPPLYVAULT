import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class SupplyVault {

    public static void main(String[] args) {

        System.out.println("======================================");
        System.out.println("       SUPPLYVAULT SYSTEM");
        System.out.println("   Supply Chain Management Platform");
        System.out.println("======================================");

        System.out.println("System Status: Running");
        System.out.println("Technology: Java");
        System.out.println("Database: PostgreSQL");

        System.out.println("\nAvailable User Roles:");
        System.out.println("1. Manager");
        System.out.println("2. Staff");
        System.out.println("3. Buyer");
        System.out.println("4. Delivery Agent");

        String currentTime = LocalDateTime.now()
                .format(DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm:ss"));

        System.out.println("\nSystem Started At: " + currentTime);

        System.out.println("\nSupplyVault demonstration completed.");
        System.out.println("======================================");
    }
}
