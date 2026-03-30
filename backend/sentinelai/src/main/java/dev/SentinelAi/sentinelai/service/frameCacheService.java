package dev.SentinelAi.sentinelai.service;

import java.io.File;
import java.util.List;

public interface frameCacheService {
    void cacheFrames(String sessionId, List<File> frameFiles);
    List<String> getCachedFrames(String sessionId);
    void evictFrames(String sessionId);
}
