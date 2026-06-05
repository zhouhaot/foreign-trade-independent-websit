package com.tradesite.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

@Component
public class DataInitConfig implements CommandLineRunner {

    private static final String ENV_ADMIN_PASSWORD = "ADMIN_INITIAL_PASSWORD";

    private final PasswordEncoder passwordEncoder;

    public DataInitConfig(PasswordEncoder passwordEncoder) {
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        String adminPassword = System.getenv(ENV_ADMIN_PASSWORD);
        if (adminPassword == null || adminPassword.isEmpty()) {
            System.out.println(">>> ADMIN_INITIAL_PASSWORD not set — skipping admin user creation.");
            System.out.println(">>> Set the environment variable to create the admin user on first startup.");
            return;
        }

        try {
            Class.forName("org.sqlite.JDBC");
            try (Connection conn = DriverManager.getConnection("jdbc:sqlite:tradeplus.db")) {
                // Check if admin user exists
                boolean exists = false;
                try (PreparedStatement ps = conn.prepareStatement("SELECT COUNT(*) FROM sys_user WHERE username = ?")) {
                    ps.setString(1, "admin");
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next() && rs.getInt(1) > 0) {
                            exists = true;
                        }
                    }
                }

                // Create admin only if not exists
                if (!exists) {
                    String encodedPassword = passwordEncoder.encode(adminPassword);
                    try (PreparedStatement ps = conn.prepareStatement(
                            "INSERT INTO sys_user (username, password, role) VALUES (?, ?, ?)")) {
                        ps.setString(1, "admin");
                        ps.setString(2, encodedPassword);
                        ps.setString(3, "admin");
                        ps.executeUpdate();
                    }
                    System.out.println(">>> Admin user created successfully.");
                }
            }
        } catch (Exception e) {
            System.err.println(">>> Failed to init admin user: " + e.getMessage());
        }
    }
}
