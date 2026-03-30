package dev.SentinelAi.sentinelai.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

/**
 * Redis Configuration for SentinelAI
 * Configures RedisTemplate for caching video frames
 */
@Configuration
public class RedisConfig {

    /**
     * Configure RedisTemplate with proper serializers
     * 
     * @param factory RedisConnectionFactory (auto-configured by Spring Boot)
     * @return RedisTemplate configured for String keys and Object values
     */
    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory factory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        
        // Set connection factory
        template.setConnectionFactory(factory);
        
        // Use String serializer for keys
        template.setKeySerializer(new StringRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        
        // Use Jackson JSON serializer for values (supports List, custom objects)
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        template.setHashValueSerializer(new GenericJackson2JsonRedisSerializer());
        
        // Enable transaction support (optional)
        template.setEnableTransactionSupport(false);
        
        // Initialize template
        template.afterPropertiesSet();
        
        return template;
    }
}
