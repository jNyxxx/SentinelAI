package dev.SentinelAi.sentinelai.controller;

import dev.SentinelAi.sentinelai.security.JwtUtil;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Authentication Controller
 * Handles user login, registration, and token management
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:4173"})
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final JwtUtil jwtUtil;

    /**
     * Login endpoint
     * Returns JWT token on successful authentication
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            // Authenticate user
            authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    request.getUsername(),
                    request.getPassword()
                )
            );

            // Load user details
            UserDetails userDetails = userDetailsService.loadUserByUsername(request.getUsername());

            // Generate JWT token
            String token = jwtUtil.generateToken(userDetails);

            // Build response
            Map<String, Object> response = new HashMap<>();
            response.put("token", token);
            response.put("username", userDetails.getUsername());
            response.put("roles", userDetails.getAuthorities());

            log.info("User logged in successfully: {}", request.getUsername());
            return ResponseEntity.ok(response);

        } catch (BadCredentialsException e) {
            log.error("Invalid credentials for user: {}", request.getUsername());
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Invalid username or password"
            ));
        } catch (Exception e) {
            log.error("Login failed: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of(
                "error", "Authentication failed"
            ));
        }
    }

    /**
     * Register endpoint (simplified - in production would save to database)
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        // In production, this would create a new user in the database
        // For now, return a message that registration is handled by admin
        return ResponseEntity.badRequest().body(Map.of(
            "error", "Registration is handled by system administrator"
        ));
    }

    /**
     * Validate token endpoint
     */
    @GetMapping("/validate")
    public ResponseEntity<?> validateToken(@RequestHeader("Authorization") String authHeader) {
        try {
            String token = authHeader.substring(7);
            boolean isValid = jwtUtil.validateToken(token);
            return ResponseEntity.ok(Map.of("valid", isValid));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("valid", false));
        }
    }

    // Request DTOs
    @Data
    public static class LoginRequest {
        private String username;
        private String password;
    }

    @Data
    public static class RegisterRequest {
        private String username;
        private String password;
        private String email;
    }
}
