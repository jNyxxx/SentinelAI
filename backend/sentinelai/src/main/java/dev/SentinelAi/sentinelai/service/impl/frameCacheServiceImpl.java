package dev.SentinelAi.sentinelai.service.impl;

import dev.SentinelAi.sentinelai.service.frameCacheService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.io.File;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class frameCacheServiceImpl implements frameCacheService{
    
    private final RedisTemplate<String, Object>redisTemplate;

    @Value("${redis.frames.expiry:1800}")
    private long frameExpiry;

    @Override
    public void cacheFrames(String sessionId, List<File>frameFiles){
        log.info("Caching {} frames for session: {}", frameFiles.size(), sessionId);
        
         List<String> base64Frames = new ArrayList<>();
        for (File frame : frameFiles) {
            try {
                byte[] bytes = Files.readAllBytes(frame.toPath());
                String base64 = Base64.getEncoder().encodeToString(bytes);
                base64Frames.add(base64);
            } catch (Exception e) {
                log.error("Error caching frame {}: {}", frame.getName(), e.getMessage(), e);
            }
        }
        
        String redisKey = "frames:" + sessionId;
        redisTemplate.opsForValue().set(
            redisKey,
            base64Frames,
            frameExpiry,
            TimeUnit.SECONDS
        );
        log.info("Frames cached to Redis with key: {} (TTL: {} seconds)", redisKey, frameExpiry);
    }

    @Override
    public List<String> getCachedFrames(String sessionId) {
        String redisKey = "frames:" + sessionId;
        
        Object cached = redisTemplate.opsForValue().get(redisKey);
        if (cached instanceof List<?>list) {
            log.info("Retrieved {} frames from Redis for session: {}", list.size(), sessionId);
            return list.stream()
            .filter(item -> item instanceof String)
            .map(item -> (String) item)
            .collect(java.util.stream.Collectors.toList());
        }
        log.warn("No frames found in Redis for session: {}", sessionId);
        return new ArrayList<>();
    }

    @Override
    public void evictFrames(String sessionId) {
        redisTemplate.delete("frames:" + sessionId);
    }
    
}
