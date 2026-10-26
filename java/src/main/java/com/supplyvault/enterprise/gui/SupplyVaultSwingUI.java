package com.supplyvault.enterprise.gui;

import com.supplyvault.enterprise.model.AuditLog;
import com.supplyvault.enterprise.model.MovementType;
import com.supplyvault.enterprise.model.Product;
import com.supplyvault.enterprise.service.AuditService;
import com.supplyvault.enterprise.service.InventoryService;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import javax.swing.border.LineBorder;
import javax.swing.table.DefaultTableCellRenderer;
import javax.swing.table.DefaultTableModel;
import javax.swing.table.JTableHeader;
import javax.swing.table.TableRowSorter;
import java.awt.*;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

/**
 * Executive Java Swing Desktop Application for SupplyVault Kerala SCM.
 * Styled in the official Midnight Navy Blue & Black luxury aesthetic.
 */
public class SupplyVaultSwingUI extends JFrame {
    private final InventoryService inventoryService;
    private final AuditService auditService;
    private final NumberFormat inrFormat;
    private final DateTimeFormatter dateFormatter;

    // Luxury Midnight Navy Theme Palette
    private static final Color COLOR_BG = new Color(2, 6, 23);           // #020617
    private static final Color COLOR_SURFACE = new Color(15, 23, 42);     // #0F172A
    private static final Color COLOR_CARD = new Color(11, 19, 43);        // #0B132B
    private static final Color COLOR_BORDER = new Color(30, 41, 59);      // #1E293B
    private static final Color COLOR_PRIMARY = new Color(37, 99, 235);    // #2563EB
    private static final Color COLOR_PRIMARY_HOVER = new Color(29, 78, 216);
    private static final Color COLOR_ACCENT = new Color(56, 189, 248);    // #38BDF8
    private static final Color COLOR_TEXT_MAIN = new Color(248, 250, 252);
    private static final Color COLOR_TEXT_MUTED = new Color(148, 163, 184);
    private static final Color COLOR_ROW_ALT = new Color(7, 15, 30);

    // GUI Components
    private DefaultTableModel productTableModel;
    private DefaultTableModel auditTableModel;
    private TableRowSorter<DefaultTableModel> productSorter;
    private TableRowSorter<DefaultTableModel> auditSorter;
    private JLabel totalValuationLabel;
    private JLabel totalProductsLabel;
    private JLabel lowStockLabel;
    private JLabel auditCountLabel;
    private JTextField searchField;

    public SupplyVaultSwingUI(InventoryService inventoryService, AuditService auditService) {
        this.inventoryService = inventoryService;
        this.auditService = auditService;
        this.inrFormat = NumberFormat.getCurrencyInstance(new Locale("en", "IN"));
        this.dateFormatter = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");

        initUI();
        refreshData();
    }

    private void initUI() {
        setTitle("SupplyVault Kerala Enterprise SCM — Java Desktop Console");
        setSize(1200, 780);
        setMinimumSize(new Dimension(950, 600));
        setLocationRelativeTo(null);
        setDefaultCloseOperation(JFrame.DISPOSE_ON_CLOSE);
        getContentPane().setBackground(COLOR_BG);
        setLayout(new BorderLayout());

        // 1. Header Panel
        add(createHeaderPanel(), BorderLayout.NORTH);

        // 2. Central Body (KPIs + Tabbed Pane)
        JPanel centralPanel = new JPanel(new BorderLayout(0, 15));
        centralPanel.setBackground(COLOR_BG);
        centralPanel.setBorder(new EmptyBorder(15, 20, 20, 20));

        centralPanel.add(createKpiPanel(), BorderLayout.NORTH);
        centralPanel.add(createTabbedContent(), BorderLayout.CENTER);

        add(centralPanel, BorderLayout.CENTER);

        // 3. Status Footer
        add(createFooterPanel(), BorderLayout.SOUTH);
    }

    private JPanel createHeaderPanel() {
        JPanel header = new JPanel(new BorderLayout());
        header.setBackground(COLOR_SURFACE);
        header.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createMatteBorder(0, 0, 1, 0, COLOR_BORDER),
                new EmptyBorder(16, 24, 16, 24)
        ));

        // Brand & Subtitle
        JPanel brandPanel = new JPanel(new GridLayout(2, 1, 0, 3));
        brandPanel.setOpaque(false);

        JLabel titleLabel = new JLabel("SUPPLYVAULT KERALA ENTERPRISE");
        titleLabel.setFont(new Font("Segoe UI", Font.BOLD, 18));
        titleLabel.setForeground(COLOR_TEXT_MAIN);

        JLabel subtitleLabel = new JLabel("Central Logistics Hub: Kakkanad, Kochi • Real-time PostgreSQL SCM Console");
        subtitleLabel.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        subtitleLabel.setForeground(COLOR_TEXT_MUTED);

        brandPanel.add(titleLabel);
        brandPanel.add(subtitleLabel);
        header.add(brandPanel, BorderLayout.WEST);

        // Right Actions (Search & Buttons)
        JPanel actionsPanel = new JPanel(new FlowLayout(FlowLayout.RIGHT, 10, 0));
        actionsPanel.setOpaque(false);

        searchField = new JTextField(15);
        searchField.setBackground(COLOR_BG);
        searchField.setForeground(COLOR_TEXT_MAIN);
        searchField.setCaretColor(COLOR_ACCENT);
        searchField.setBorder(BorderFactory.createCompoundBorder(
                new LineBorder(COLOR_BORDER, 1),
                new EmptyBorder(6, 10, 6, 10)
        ));
        searchField.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        searchField.addCaretListener(e -> filterTables(searchField.getText()));

        JLabel searchIcon = new JLabel("🔍 Search:");
        searchIcon.setForeground(COLOR_TEXT_MUTED);
        searchIcon.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        actionsPanel.add(searchIcon);
        actionsPanel.add(searchField);

        JButton adjustBtn = createStyledButton("⚡ Adjust Stock", COLOR_PRIMARY);
        adjustBtn.addActionListener(e -> openStockAdjustmentDialog());
        actionsPanel.add(adjustBtn);

        JButton refreshBtn = createStyledButton("⟳ Refresh", COLOR_CARD);
        refreshBtn.addActionListener(e -> refreshData());
        actionsPanel.add(refreshBtn);

        header.add(actionsPanel, BorderLayout.EAST);
        return header;
    }

    private JPanel createKpiPanel() {
        JPanel kpiGrid = new JPanel(new GridLayout(1, 4, 14, 0));
        kpiGrid.setOpaque(false);

        totalProductsLabel = new JLabel("0");
        kpiGrid.add(createKpiCard("TOTAL PRODUCTS", totalProductsLabel, COLOR_ACCENT));

        totalValuationLabel = new JLabel("₹ 0");
        kpiGrid.add(createKpiCard("INVENTORY VALUATION", totalValuationLabel, new Color(74, 222, 128)));

        lowStockLabel = new JLabel("0");
        kpiGrid.add(createKpiCard("LOW STOCK ALERTS", lowStockLabel, new Color(248, 113, 113)));

        auditCountLabel = new JLabel("0");
        kpiGrid.add(createKpiCard("RECORDED AUDIT EVENTS", auditCountLabel, new Color(192, 132, 252)));

        return kpiGrid;
    }

    private JPanel createKpiCard(String title, JLabel valueLabel, Color accentColor) {
        JPanel card = new JPanel(new BorderLayout(0, 4));
        card.setBackground(COLOR_CARD);
        card.setBorder(BorderFactory.createCompoundBorder(
                new LineBorder(COLOR_BORDER, 1, true),
                new EmptyBorder(12, 16, 12, 16)
        ));

        JLabel titleLbl = new JLabel(title);
        titleLbl.setFont(new Font("Segoe UI", Font.BOLD, 10));
        titleLbl.setForeground(COLOR_TEXT_MUTED);

        valueLabel.setFont(new Font("Segoe UI", Font.BOLD, 18));
        valueLabel.setForeground(accentColor);

        card.add(titleLbl, BorderLayout.NORTH);
        card.add(valueLabel, BorderLayout.CENTER);
        return card;
    }

    private JTabbedPane createTabbedContent() {
        JTabbedPane tabbedPane = new JTabbedPane();
        tabbedPane.setBackground(COLOR_SURFACE);
        tabbedPane.setForeground(COLOR_TEXT_MAIN);
        tabbedPane.setFont(new Font("Segoe UI", Font.BOLD, 12));

        // Tab 1: Inventory Table
        tabbedPane.addTab("📦 Warehouse Inventory Ledger", createProductTablePanel());

        // Tab 2: Audit Trail Table
        tabbedPane.addTab("🛡️ Operations & Security Audit Trail", createAuditTablePanel());

        return tabbedPane;
    }

    private JPanel createProductTablePanel() {
        JPanel panel = new JPanel(new BorderLayout());
        panel.setBackground(COLOR_CARD);

        String[] cols = {"SKU", "Product Name", "Category", "Unit", "Physical Stock", "Reserved", "Available", "Price (INR)", "Valuation (INR)", "Status"};
        productTableModel = new DefaultTableModel(cols, 0) {
            @Override
            public boolean isCellEditable(int row, int col) { return false; }
        };

        JTable table = new JTable(productTableModel);
        styleTable(table);

        productSorter = new TableRowSorter<>(productTableModel);
        table.setRowSorter(productSorter);

        JScrollPane scrollPane = new JScrollPane(table);
        scrollPane.getViewport().setBackground(COLOR_BG);
        scrollPane.setBorder(new LineBorder(COLOR_BORDER, 1));
        panel.add(scrollPane, BorderLayout.CENTER);

        return panel;
    }

    private JPanel createAuditTablePanel() {
        JPanel panel = new JPanel(new BorderLayout());
        panel.setBackground(COLOR_CARD);

        String[] cols = {"Timestamp (IST)", "Operator", "Role", "Action Event", "Entity Target", "Details Narrative", "Depository Node"};
        auditTableModel = new DefaultTableModel(cols, 0) {
            @Override
            public boolean isCellEditable(int row, int col) { return false; }
        };

        JTable table = new JTable(auditTableModel);
        styleTable(table);

        auditSorter = new TableRowSorter<>(auditTableModel);
        table.setRowSorter(auditSorter);

        JScrollPane scrollPane = new JScrollPane(table);
        scrollPane.getViewport().setBackground(COLOR_BG);
        scrollPane.setBorder(new LineBorder(COLOR_BORDER, 1));
        panel.add(scrollPane, BorderLayout.CENTER);

        return panel;
    }

    private void styleTable(JTable table) {
        table.setBackground(COLOR_SURFACE);
        table.setForeground(COLOR_TEXT_MAIN);
        table.setGridColor(COLOR_BORDER);
        table.setRowHeight(32);
        table.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        table.setSelectionBackground(new Color(30, 58, 138));
        table.setSelectionForeground(Color.WHITE);

        JTableHeader header = table.getTableHeader();
        header.setBackground(COLOR_BG);
        header.setForeground(COLOR_TEXT_MUTED);
        header.setFont(new Font("Segoe UI", Font.BOLD, 11));
        header.setBorder(BorderFactory.createMatteBorder(0, 0, 1, 0, COLOR_BORDER));

        table.setDefaultRenderer(Object.class, new DefaultTableCellRenderer() {
            @Override
            public Component getTableCellRendererComponent(JTable t, Object val, boolean sel, boolean foc, int row, int col) {
                Component c = super.getTableCellRendererComponent(t, val, sel, foc, row, col);
                if (!sel) {
                    c.setBackground(row % 2 == 0 ? COLOR_SURFACE : COLOR_ROW_ALT);
                    c.setForeground(COLOR_TEXT_MAIN);
                }
                setBorder(new EmptyBorder(0, 10, 0, 10));
                return c;
            }
        });
    }

    private JPanel createFooterPanel() {
        JPanel footer = new JPanel(new BorderLayout());
        footer.setBackground(COLOR_BG);
        footer.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createMatteBorder(1, 0, 0, 0, COLOR_BORDER),
                new EmptyBorder(8, 20, 8, 20)
        ));

        JLabel statusLabel = new JLabel("● PostgreSQL 5432: Connected | HikariCP Connection Pool Active | Java 21 LTS");
        statusLabel.setFont(new Font("Segoe UI", Font.PLAIN, 11));
        statusLabel.setForeground(COLOR_TEXT_MUTED);

        JLabel copyright = new JLabel("SupplyVault Kerala SCM © 2026");
        copyright.setFont(new Font("Segoe UI", Font.PLAIN, 11));
        copyright.setForeground(COLOR_TEXT_MUTED);

        footer.add(statusLabel, BorderLayout.WEST);
        footer.add(copyright, BorderLayout.EAST);
        return footer;
    }

    private JButton createStyledButton(String text, Color bg) {
        JButton btn = new JButton(text);
        btn.setFont(new Font("Segoe UI", Font.BOLD, 12));
        btn.setBackground(bg);
        btn.setForeground(Color.WHITE);
        btn.setFocusPainted(false);
        btn.setBorder(BorderFactory.createCompoundBorder(
                new LineBorder(COLOR_BORDER, 1, true),
                new EmptyBorder(6, 14, 6, 14)
        ));
        btn.setCursor(new Cursor(Cursor.HAND_CURSOR));
        return btn;
    }

    private void filterTables(String query) {
        if (query == null || query.isBlank()) {
            productSorter.setRowFilter(null);
            auditSorter.setRowFilter(null);
        } else {
            productSorter.setRowFilter(RowFilter.regexFilter("(?i)" + query));
            auditSorter.setRowFilter(RowFilter.regexFilter("(?i)" + query));
        }
    }

    public void refreshData() {
        SwingWorker<Void, Void> worker = new SwingWorker<>() {
            List<Product> products = java.util.Collections.emptyList();
            List<AuditLog> auditLogs = java.util.Collections.emptyList();
            BigDecimal valuation = BigDecimal.ZERO;
            int lowStockCount = 0;

            @Override
            protected Void doInBackground() {
                try {
                    products = inventoryService.getAllProducts();
                    auditLogs = auditService.getRecentLogs(50);
                    valuation = inventoryService.calculateTotalValuation();
                    lowStockCount = inventoryService.getLowStockAlerts().size();
                } catch (Exception e) {
                    System.err.println("[GUI Background Load] Error querying database: " + e.getMessage());
                }
                return null;
            }

            @Override
            protected void done() {
                if (products == null) products = java.util.Collections.emptyList();
                if (auditLogs == null) auditLogs = java.util.Collections.emptyList();
                if (valuation == null) valuation = BigDecimal.ZERO;

                // Update KPI Cards
                totalProductsLabel.setText(String.valueOf(products.size()));
                totalValuationLabel.setText(inrFormat.format(valuation));
                lowStockLabel.setText(String.valueOf(lowStockCount));
                auditCountLabel.setText(String.valueOf(auditLogs.size()));

                // Update Products Table
                productTableModel.setRowCount(0);
                for (Product p : products) {
                    productTableModel.addRow(new Object[]{
                            p.getSku(),
                            p.getName(),
                            p.getCategory(),
                            p.getUnit(),
                            p.getPhysicalStock(),
                            p.getReservedStock(),
                            p.getAvailableStock(),
                            inrFormat.format(p.getSellingPrice()),
                            inrFormat.format(p.getInventoryValuation()),
                            p.getStatus()
                    });
                }

                // Update Audit Table
                auditTableModel.setRowCount(0);
                for (AuditLog l : auditLogs) {
                    auditTableModel.addRow(new Object[]{
                            l.getCreatedAt() != null ? l.getCreatedAt().format(dateFormatter) : "Recent",
                            l.getActorName(),
                            l.getActorRole(),
                            l.getAction(),
                            l.getEntityType() + (l.getEntityId() != null ? " (" + l.getEntityId() + ")" : ""),
                            l.getDetails(),
                            l.getDepotNode()
                    });
                }
            }
        };
        worker.execute();
    }

    private void openStockAdjustmentDialog() {
        JDialog dialog = new JDialog(this, "Execute Real-time Stock Adjustment", true);
        dialog.setSize(440, 380);
        dialog.setLocationRelativeTo(this);
        dialog.getContentPane().setBackground(COLOR_SURFACE);
        dialog.setLayout(new BorderLayout());

        JPanel form = new JPanel(new GridLayout(5, 2, 10, 12));
        form.setBackground(COLOR_SURFACE);
        form.setBorder(new EmptyBorder(20, 24, 20, 24));

        List<Product> products = inventoryService.getAllProducts();
        JComboBox<Product> productCombo = new JComboBox<>(products.toArray(new Product[0]));
        JComboBox<MovementType> typeCombo = new JComboBox<>(new MovementType[]{
                MovementType.STOCK_IN, MovementType.STOCK_OUT, MovementType.ADJUSTMENT
        });
        JSpinner qtySpinner = new JSpinner(new SpinnerNumberModel(10, 1, 10000, 1));
        JTextField reasonField = new JTextField("Physical recount reconciliation");

        form.add(createFormLabel("Select SKU / Product:"));
        form.add(productCombo);

        form.add(createFormLabel("Adjustment Type:"));
        form.add(typeCombo);

        form.add(createFormLabel("Quantity:"));
        form.add(qtySpinner);

        form.add(createFormLabel("Reason Narrative:"));
        form.add(reasonField);

        dialog.add(form, BorderLayout.CENTER);

        JPanel btnPanel = new JPanel(new FlowLayout(FlowLayout.RIGHT, 10, 12));
        btnPanel.setBackground(COLOR_BG);

        JButton cancelBtn = createStyledButton("Cancel", COLOR_CARD);
        cancelBtn.addActionListener(e -> dialog.dispose());

        JButton submitBtn = createStyledButton("Confirm Stock Update", COLOR_PRIMARY);
        submitBtn.addActionListener(e -> {
            Product selected = (Product) productCombo.getSelectedItem();
            MovementType type = (MovementType) typeCombo.getSelectedItem();
            int qty = (int) qtySpinner.getValue();
            String reason = reasonField.getText();

            if (selected != null && type != null) {
                try {
                    inventoryService.adjustStock(
                            selected.getId(),
                            type,
                            qty,
                            reason,
                            "Faizal Rahman",
                            "MANAGER"
                    );
                    JOptionPane.showMessageDialog(dialog,
                            "Stock balance updated successfully in PostgreSQL!",
                            "Adjustment Success", JOptionPane.INFORMATION_MESSAGE);
                    dialog.dispose();
                    refreshData();
                } catch (Exception ex) {
                    JOptionPane.showMessageDialog(dialog,
                            "Failed to adjust stock: " + ex.getMessage(),
                            "Error", JOptionPane.ERROR_MESSAGE);
                }
            }
        });

        btnPanel.add(cancelBtn);
        btnPanel.add(submitBtn);
        dialog.add(btnPanel, BorderLayout.SOUTH);

        dialog.setVisible(true);
    }

    private JLabel createFormLabel(String text) {
        JLabel lbl = new JLabel(text);
        lbl.setForeground(COLOR_TEXT_MAIN);
        lbl.setFont(new Font("Segoe UI", Font.BOLD, 12));
        return lbl;
    }
}
