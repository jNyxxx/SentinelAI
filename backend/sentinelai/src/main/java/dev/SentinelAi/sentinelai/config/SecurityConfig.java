package dev.SentinelAi.sentinelai.config;

import dev.SentinelAi.sentinelai.security.JwtAuthFilter;
import dev.SentinelAi.sentinelai.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Security Configuration for SentinelAI
 * Configures JWT-based authentication and authorization
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
@RequiredArgsConstructor
public class SecurityConfig {

    private final RateLimitFilter rateLimitFilter;
    private final JwtUtil jwtUtil;

    /**
     * Configure security filter chain
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        // Create JWT filter instance to avoid circular dependency
        JwtAuthFilter jwtAuthFilter = new JwtAuthFilter(jwtUtil, userDetailsService());

        http
            // Disable CSRF for stateless JWT authentication
            .csrf(AbstractHttpConfigurer::disable)

            // Configure CORS
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            // Configure authorization
            .authorizeHttpRequests(auth -> auth
                // Public endpoints - GET and POST only (view, analyze, upload)
                .requestMatchers(
                    "/api/auth/**",
                    "/v1/**",
                    "/swagger-ui/**",
                    "/v3/api-docs/**"
                ).permitAll()
                
                // Allow GET and POST for incidents (view, analyze, upload) without auth
                .requestMatchers(
                    org.springframework.http.HttpMethod.GET,
                    "/api/incidents/**"
                ).permitAll()
                .requestMatchers(
                    org.springframework.http.HttpMethod.POST,
                    "/api/incidents/**"
                ).permitAll()
                
                // DELETE operations require authentication
                .requestMatchers(
                    org.springframework.http.HttpMethod.DELETE,
                    "/api/incidents/**"
                ).hasAnyRole("ADMIN", "USER")
                .requestMatchers(
                    org.springframework.http.HttpMethod.PUT,
                    "/api/incidents/**"
                ).hasAnyRole("ADMIN", "USER")
                .requestMatchers(
                    org.springframework.http.HttpMethod.PATCH,
                    "/api/incidents/**"
                ).hasAnyRole("ADMIN", "USER")

                // All other endpoints require authentication
                .anyRequest().authenticated()
            )

            // Configure session management (stateless)
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )

            // Configure authentication provider
            .authenticationProvider(authenticationProvider())

            // Add filters in correct order
            // Rate limit filter runs first (before JWT filter)
            .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
            // JWT filter runs second (also before UsernamePasswordAuthenticationFilter)
            .addFilterBefore(jwtAuthFilter, RateLimitFilter.class);

        return http.build();
    }

    /**
     * Configure authentication provider with custom UserDetailsService
     */
    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService());
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    /**
     * UserDetailsService - In production, this would load from database
     * For now, using in-memory users for demonstration
     */
    @Bean
    public UserDetailsService userDetailsService() {
        return username -> {
            // In production, load user from database
            // For demo, create a default admin user
            if ("admin".equals(username)) {
                return org.springframework.security.core.userdetails.User
                    .withUsername("admin")
                    .password(passwordEncoder().encode("admin123"))
                    .roles("ADMIN", "USER")
                    .build();
            } else if ("user".equals(username)) {
                return org.springframework.security.core.userdetails.User
                    .withUsername("user")
                    .password(passwordEncoder().encode("user123"))
                    .roles("USER")
                    .build();
            }
            throw new UsernameNotFoundException("User not found: " + username);
        };
    }

    /**
     * Configure password encoder (BCrypt)
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Configure authentication manager
     */
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) 
            throws Exception {
        return config.getAuthenticationManager();
    }

    /**
     * CORS configuration
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of(
            "http://localhost:5173",
            "http://localhost:4173",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:4173"
        ));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
