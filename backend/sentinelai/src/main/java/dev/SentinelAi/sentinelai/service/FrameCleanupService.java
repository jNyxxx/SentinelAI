package dev.SentinelAi.sentinelai.service;

import dev.SentinelAi.sentinelai.domain.entity.IncidentFrame;
import dev.SentinelAi.sentinelai.domain.entity.Incident;
import dev.SentinelAi.sentinelai.repository.IncidentFrameRepo;
import dev.SentinelAi.sentinelai.repository.IncidentRepo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.nio.file.Files;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class FrameCleanupService {

    private final IncidentFrameRepo incidentFrameRepo;
    private final IncidentRepo incidentRepo;
    private final frameCacheService frameCacheService;

    // ========================================================================
    // PROMOTE FRAMES FROM REDIS TO PERMANENT DISK
    // High/Medium risk only — Low risk frames are evicted from cache
    // ========================================================================
    @Transactional
    public void promoteFrames(String sessionId, Long incidentId, String riskLevel) {
        log.info("=== PROMOTE FRAMES CALLED ===");
        log.info("SessionId: {}, IncidentId: {}, RiskLevel: {}", sessionId, incidentId, riskLevel);
        
        // Low risk - don't save frames
        if (riskLevel.equalsIgnoreCase("Low")) {
            log.info("Low risk - frames evicted from cache. Nothing saved.");
            frameCacheService.evictFrames(sessionId);
            return;
        }

        List<String> cachedFrames = frameCacheService.getCachedFrames(sessionId);
        log.info("Cached frames count from Redis: {}", cachedFrames.size());
        
        if (cachedFrames.isEmpty()) {
            log.warn("No cached frames found for session: {}", sessionId);
            log.warn("Redis key should be: frames:{}", sessionId);
            return;
        }

        // Fetch the incident entity to associate with frames
        Incident incident = incidentRepo.findById(incidentId)
            .orElseThrow(() -> new RuntimeException("Incident not found with id: " + incidentId));

        String framesDir = System.getProperty("user.dir") + "/incident-frames/" + incidentId + "/";
        log.info("Frames directory: {}", framesDir);
        
        File dir = new File(framesDir);
        if (!dir.exists()) {
            boolean created = dir.mkdirs();
            log.info("Directory created: {}", created);
        }

        int savedCount = 0;
        for (int i = 0; i < cachedFrames.size(); i++) {
            try {
                byte[] imageBytes = Base64.getDecoder().decode(cachedFrames.get(i));
                File dest = new File(framesDir + "frame_" + i + ".jpg");
                Files.write(dest.toPath(), imageBytes);

                IncidentFrame frame = IncidentFrame.builder()
                        .incident(incident)
                        .filePath(dest.getAbsolutePath())
                        .frameIndex(i)
                        .createdAt(LocalDateTime.now())
                        .build();

                incidentFrameRepo.save(frame);
                log.info("Frame {} saved to: {}", i, dest.getAbsolutePath());
                savedCount++;
            } catch (Exception e) {
                log.error("Error promoting frame {}: {}", i, e.getMessage(), e);
                throw new RuntimeException("Failed to promote frame: " + i, e);
            }
        }

        frameCacheService.evictFrames(sessionId);
        log.info("=== PROMOTE FRAMES COMPLETE ===");
        log.info("Successfully saved {} frames for incident {}", savedCount, incidentId);
    }

    // ========================================================================
    // SERVE FRAMES AS BASE64 FOR FRONTEND
    // ========================================================================
    public List<Map<String, Object>> getFramesAsBase64(Long incidentId) {
        log.info("Loading frames for incident: {}", incidentId);
        
        List<IncidentFrame> frames = incidentFrameRepo
                .findByIncidentIdOrderByFrameIndexAsc(incidentId);

        log.info("Found {} frame records in database for incident {}", frames.size(), incidentId);

        List<Map<String, Object>> result = new ArrayList<>();
        for (IncidentFrame frame : frames) {
            try {
                File file = new File(frame.getFilePath());
                if (!file.exists()) {
                    log.warn("Frame file not found: {}", frame.getFilePath());
                    continue;
                }

                byte[] imageBytes = Files.readAllBytes(file.toPath());
                String base64 = Base64.getEncoder().encodeToString(imageBytes);

                Map<String, Object> frameData = new HashMap<>();
                frameData.put("frameIndex", frame.getFrameIndex());
                frameData.put("base64", "data:image/jpeg;base64," + base64);
                frameData.put("createdAt", frame.getCreatedAt());
                frameData.put("filePath", frame.getFilePath());
                result.add(frameData);
            } catch (Exception e) {
                log.error("Error loading frame {} for incident {}: {}", frame.getId(), incidentId, e.getMessage(), e);
            }
        }
        
        log.info("Successfully loaded {} frames for incident {}", result.size(), incidentId);
        return result;
    }

    // ========================================================================
    // SCHEDULED CLEANUP — RUNS EVERY DAY AT MIDNIGHT
    // Deletes frames older than 30 days from disk and PostgreSQL
    // ========================================================================
    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void cleanupExpiredFrames() {
        try {
            LocalDateTime cutoff = LocalDateTime.now().minusDays(30);
            List<IncidentFrame> expiredFrames = incidentFrameRepo.findByCreatedAtBefore(cutoff);

            if (expiredFrames.isEmpty()) {
                log.info("No expired frames to clean up.");
                return;
            }

            int deletedCount = 0;
            for (IncidentFrame frame : expiredFrames) {
                try {
                    File file = new File(frame.getFilePath());
                    if (file.exists()) {
                        file.delete();
                        log.info("Deleted expired frame file: {}", frame.getFilePath());
                    }
                    incidentFrameRepo.delete(frame);
                    deletedCount++;
                    log.info("Deleted expired frame record: {}", frame.getId());
                } catch (Exception e) {
                    log.error("Error deleting expired frame {}: {}", frame.getId(), e.getMessage(), e);
                }
            }

            // Cleanup empty incident frame directories
            File framesRoot = new File(System.getProperty("user.dir") + "/incident-frames/");
            if (framesRoot.exists() && framesRoot.listFiles() != null) {
                for (File directory : framesRoot.listFiles()) {
                    if (directory.isDirectory() && directory.list() != null
                            && directory.list().length == 0) {
                        directory.delete();
                        log.info("Deleted empty directory: {}", directory.getAbsolutePath());
                    }
                }
            }

            log.info("Frame cleanup complete. Removed {} expired frames.", deletedCount);
        } catch (Exception e) {
            log.error("Error during scheduled frame cleanup: {}", e.getMessage(), e);
        }
    }
}