package dev.SentinelAi.sentinelai.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate Limiting Filter using Bucket4j
 * Prevents DDoS and brute force attacks by limiting request rates
 */
@Component
@Slf4j
public class RateLimitFilter extends OncePerRequestFilter {

    // Map to store buckets per IP address
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    // Rate limit configurations - RELAXED for better UX
    private static final Bandwidth UPLOAD_LIMIT = Bandwidth.builder()
        .capacity(100)  // Max 100 requests
        .refillIntervally(100, Duration.ofMinutes(1))  // Refill 100 tokens per minute
        .build();

    private static final Bandwidth READ_LIMIT = Bandwidth.builder()
        .capacity(500)  // Max 500 requests
        .refillIntervally(500, Duration.ofMinutes(1))  // Refill 500 tokens per minute
        .build();

    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                    HttpServletResponse response, 
                                    FilterChain filterChain) 
            throws ServletException, IOException {
        
        String clientIp = getClientIp(request);
        String requestUri = request.getRequestURI();
        
        // Determine rate limit based on endpoint
        Bandwidth limit = isUploadEndpoint(requestUri) ? UPLOAD_LIMIT : READ_LIMIT;
        
        Bucket bucket = buckets.computeIfAbsent(clientIp, k -> Bucket.builder()
            .addLimit(limit)
            .build());
        
        // Try to consume a token
        if (bucket.tryConsume(1)) {
            // Request allowed, continue filter chain
            filterChain.doFilter(request, response);
        } else {
            // Rate limit exceeded
            log.warn("Rate limit exceeded for IP: {} on URI: {}", clientIp, requestUri);
            response.setStatus(429);  // HTTP 429 Too Many Requests
            response.setContentType("application/json");
            response.getWriter().write("{\"error\": \"Rate limit exceeded. Please try again later.\"}");
        }
    }

    /**
     * Check if endpoint is an upload endpoint (stricter rate limit)
     */
    private boolean isUploadEndpoint(String uri) {
        return uri.contains("/analyze") || 
               uri.contains("/upload") ||
               uri.contains("/auth/login");
    }

    /**
     * Get client IP address from request
     */
    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader != null) {
            return xfHeader.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
