package dev.SentinelAi.sentinelai.controller;

import java.io.File;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import dev.SentinelAi.sentinelai.domain.entity.Incident;
import dev.SentinelAi.sentinelai.domain.entity.IncidentFrame;
import dev.SentinelAi.sentinelai.repository.IncidentFrameRepo;
import dev.SentinelAi.sentinelai.repository.IncidentRepo;
import dev.SentinelAi.sentinelai.service.FrameCleanupService;
import dev.SentinelAi.sentinelai.service.VideoProcessingService;
import dev.SentinelAi.sentinelai.service.fileStorageService;
import dev.SentinelAi.sentinelai.service.frameCacheService;
import dev.SentinelAi.sentinelai.service.AI.AnalysisService;
import dev.SentinelAi.sentinelai.validator.FileValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/incidents")
@RequiredArgsConstructor
@CrossOrigin(
        origins = {
                "http://localhost:5173",
                "http://localhost:4173"
        }
)
@Slf4j
public class IncidentController {

    private final AnalysisService analysisService;
    private final fileStorageService fileStorageService;
    private final IncidentRepo incidentRepo;
    private final IncidentFrameRepo incidentFrameRepo;
    private final VideoProcessingService videoProcessingService;
    private final frameCacheService frameCacheService;
    private final FrameCleanupService frameCleanupService;
    private final FileValidator fileValidator;

    @GetMapping
    public ResponseEntity<?> getAllIncidents() {
        List<Incident> allIncidents = incidentRepo.findAllByOrderByCreatedAtDesc();

        List<Map<String, Object>> result = new ArrayList<>();
        int displayId = 1;

        for (Incident incident : allIncidents) {
            Map<String, Object> dto = new HashMap<>();
            dto.put("id", incident.getId());
            dto.put("displayId", displayId++);
            dto.put("summary", incident.getSummary());
            dto.put("riskLevel", incident.getRiskLevel());
            dto.put("classification", incident.getClassification());
            dto.put("createdAt", incident.getCreatedAt());
            dto.put("reportFilePath", incident.getReportFilePath());
            dto.put("camera", incident.getCamera());
            dto.put("zone", incident.getZone());
            dto.put("confidence", incident.getConfidence());
            dto.put("riskScore", incident.getRiskScore());
            dto.put("processingTime", incident.getProcessingTime());
            dto.put("framesAnalyzed", incident.getFramesAnalyzed());
            dto.put("detailedReport", incident.getDetailedReport());
            dto.put("fileName", incident.getFileName());
            result.add(dto);
        }

        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteIncident(@PathVariable Long id) {
        log.info("Deleting incident: {}", id);

        try {
            if (!incidentRepo.existsById(id)) {
                log.warn("Incident not found: {}", id);
                return ResponseEntity.notFound().build();
            }

            try {
                String framesDir = System.getProperty("user.dir") + "/incident-frames/" + id + "/";
                File dir = new File(framesDir);

                if (dir.exists()) {
                    File[] files = dir.listFiles();
                    if (files != null) {
                        for (File file : files) {
                            if (!file.delete()) {
                                log.warn("Failed to delete frame file: {}", file.getAbsolutePath());
                            }
                        }
                    }

                    if (!dir.delete()) {
                        log.warn("Failed to delete frames directory: {}", framesDir);
                    } else {
                        log.info("Deleted frames directory for incident {}", id);
                    }
                }
            } catch (Exception e) {
                log.warn("Error deleting frame files: {}", e.getMessage());
            }

            incidentRepo.deleteById(id);

            log.info("Successfully deleted incident: {}", id);
            return ResponseEntity.ok().body(Map.of(
                    "message", "Incident deleted successfully",
                    "deletedId", id
            ));

        } catch (Exception e) {
            log.error("Error deleting incident: {}", id, e);
            return ResponseEntity.internalServerError()
                    .body("Error deleting incident: " + e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getIncidentById(@PathVariable Long id) {
        return incidentRepo.findById(id).map(incident -> {
            Map<String, Object> response = new HashMap<>();
            response.put("id", incident.getId());
            response.put("classification", incident.getClassification());
            response.put("riskLevel", incident.getRiskLevel());
            response.put("createdAt", incident.getCreatedAt());
            response.put("summary", incident.getSummary());
            response.put("camera", incident.getCamera());
            response.put("zone", incident.getZone());
            response.put("confidence", incident.getConfidence());
            response.put("riskScore", incident.getRiskScore());
            response.put("processingTime", incident.getProcessingTime());
            response.put("framesAnalyzed", incident.getFramesAnalyzed());
            response.put("fileName", incident.getFileName());

            try {
                String reportFilePath = incident.getReportFilePath();
                if (reportFilePath == null || reportFilePath.isEmpty()) {
                    throw new RuntimeException("Report file path is null or empty");
                }

                String baseDir = System.getProperty("user.dir") + "/incidents-reports/";
                java.nio.file.Path basePath = java.nio.file.Paths.get(baseDir).normalize().toAbsolutePath();
                java.nio.file.Path reportPath = java.nio.file.Paths.get(reportFilePath).normalize().toAbsolutePath();

                if (!reportPath.startsWith(basePath)) {
                    log.error("Path traversal attempt detected! Report path: {}, Base path: {}", reportPath, basePath);
                    throw new RuntimeException("Invalid report file path");
                }

                if (!java.nio.file.Files.exists(reportPath)) {
                    log.error("Report file does not exist: {}", reportPath);
                    throw new RuntimeException("Report file not found");
                }

                String fullReport = new String(java.nio.file.Files.readAllBytes(reportPath));
                log.info("Read report file, length: {} bytes", fullReport.length());

                response.put("fullReport", fullReport);
                response.put("detailedReport", fullReport);
            } catch (Exception e) {
                log.error("Failed to read report file: {}", e.getMessage());
                response.put("fullReport", incident.getSummary());
                response.put("detailedReport", incident.getSummary());
            }

            return ResponseEntity.ok(response);
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/frames")
    public ResponseEntity<?> getIncidentFrames(@PathVariable Long id) {
        log.info("Getting frames for incident: {}", id);
        List<Map<String, Object>> frames = frameCleanupService.getFramesAsBase64(id);
        log.info("Found {} frames for incident {}", frames.size(), id);
        return ResponseEntity.ok(frames);
    }

    @PostMapping("/analyze")
    public ResponseEntity<?> analyzeIncident(@RequestParam("files") MultipartFile[] files) {
        try {
            if (files == null || files.length == 0) {
                return ResponseEntity.badRequest().body("Please upload at least one image.");
            }

            for (MultipartFile file : files) {
                FileValidator.ValidationResult result = fileValidator.validateImage(file);
                if (!result.isValid()) {
                    log.warn("Image validation failed: {}", result.getError());
                    return ResponseEntity.badRequest().body("Invalid file: " + result.getError());
                }
            }

            long startTime = System.currentTimeMillis();

            dev.SentinelAi.sentinelai.service.AI.AnalysisResult analysisResult =
                    analysisService.analyzeImages(files);

            long endTime = System.currentTimeMillis();
            long totalProcessingTimeMs = endTime - startTime;

            String report = analysisResult.getReport();
            String classification = analysisResult.getClassification();
            String riskLevel = analysisResult.getRiskLevel();
            double confidence = analysisResult.getConfidence();

            String filePath = fileStorageService.saveReportToFile(report, classification, riskLevel);

            long incidentCount = incidentRepo.count();
            String camera = "CAM-" + String.format("%02d", incidentCount + 1);
            String zone = "Zone " + (char) ('A' + (incidentCount % 6));

            String riskScore = calculateRiskScore(riskLevel);
            String processingTime = String.format("%.1fs", totalProcessingTimeMs / 1000.0);
            String summaryText = report.length() > 300 ? report.substring(0, 300) + "..." : report;

            Incident newIncident = Incident.builder()
                    .summary(summaryText)
                    .classification(classification)
                    .riskLevel(riskLevel)
                    .reportFilePath(filePath)
                    .camera(camera)
                    .zone(zone)
                    .confidence(String.format("%.1f%%", confidence))
                    .riskScore(riskScore)
                    .processingTime(processingTime)
                    .framesAnalyzed(files.length)
                    .fileName(files[0].getOriginalFilename())
                    .detailedReport(report)
                    .createdAt(LocalDateTime.now())
                    .build();

            Incident savedIncident = incidentRepo.save(newIncident);

            if (riskLevel.equalsIgnoreCase("High") || riskLevel.equalsIgnoreCase("Medium")) {
                String framesDir = System.getProperty("user.dir") + "/incident-frames/" + savedIncident.getId() + "/";
                File dir = new File(framesDir);
                if (!dir.exists()) {
                    dir.mkdirs();
                }

                for (int i = 0; i < files.length; i++) {
                    MultipartFile file = files[i];
                    File dest = new File(framesDir + "frame_" + i + ".jpg");
                    file.transferTo(dest);

                    IncidentFrame frame = IncidentFrame.builder()
                            .incident(savedIncident)
                            .filePath(dest.getAbsolutePath())
                            .frameIndex(i)
                            .createdAt(LocalDateTime.now())
                            .build();

                    incidentFrameRepo.save(frame);
                }

                log.info("Saved {} evidence frames for incident {}", files.length, savedIncident.getId());
            }

            Map<String, Object> response = new HashMap<>();
            response.put("id", savedIncident.getId());
            response.put("report", report);
            response.put("classification", classification);
            response.put("riskLevel", riskLevel);
            response.put("processingTime", processingTime);
            response.put("confidence", String.format("%.1f%%", confidence));
            response.put("createdAt", savedIncident.getCreatedAt());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error processing incident images", e);
            return ResponseEntity.internalServerError()
                    .body("Error processing incident: " + e.getMessage());
        }
    }

    @PostMapping("/analyze-video")
    public ResponseEntity<?> analyzeVideo(@RequestParam("video") MultipartFile videoFile) {
        log.info("=== VIDEO UPLOAD STARTED ===");
        log.info("Filename: {}", videoFile.getOriginalFilename());
        log.info("Size: {} bytes", videoFile.getSize());

        if (videoFile == null || videoFile.isEmpty()) {
            log.error("Video file is null or empty");
            return ResponseEntity.badRequest().body("Please upload a video file.");
        }

        FileValidator.ValidationResult result = fileValidator.validateVideo(videoFile);
        if (!result.isValid()) {
            log.warn("Video validation failed: {}", result.getError());
            return ResponseEntity.badRequest().body("Invalid video file: " + result.getError());
        }

        try {
            File uploadDir = new File(System.getProperty("user.dir") + "/uploads/");
            if (!uploadDir.exists()) {
                uploadDir.mkdirs();
            }

            File dest = new File(uploadDir, videoFile.getOriginalFilename());
            String savedFilePath = dest.getAbsolutePath();
            java.nio.file.Files.write(dest.toPath(), videoFile.getBytes());

            VideoProcessingService.FrameExtractionResult extractionResult =
                    videoProcessingService.extractFrames(videoFile);

            List<File> frameFiles = extractionResult.getFrames();
            long frameExtractionTimeMs = extractionResult.getExtractionTimeMs();

            if (frameFiles.isEmpty()) {
                return ResponseEntity.status(500).body("Failed to extract frames");
            }

            String sessionId = "incident_" + System.currentTimeMillis();
            frameCacheService.cacheFrames(sessionId, frameFiles);

            MultipartFile[] frames = new MultipartFile[frameFiles.size()];
            for (int i = 0; i < frameFiles.size(); i++) {
                File file = frameFiles.get(i);
                byte[] fileBytes = java.nio.file.Files.readAllBytes(file.toPath());
                frames[i] = new MockMultipartFile(
                        "frame_" + i,
                        file.getName(),
                        MediaType.IMAGE_JPEG_VALUE,
                        fileBytes
                );
            }

            videoProcessingService.cleanupFrames(frameFiles);

            dev.SentinelAi.sentinelai.service.AI.AnalysisResult analysisResult =
                    analysisService.analyzeImages(frames);

            long aiInferenceTimeMs = analysisResult.getInferenceTimeMs();

            String classification = analysisResult.getClassification();
            String riskLevel = analysisResult.getRiskLevel();
            String report = analysisResult.getReport();
            double confidence = analysisResult.getConfidence();

            long totalProcessingTimeMs = frameExtractionTimeMs + aiInferenceTimeMs;
            String processingTime = String.format("%.1fs", totalProcessingTimeMs / 1000.0);

            String filePath = fileStorageService.saveReportToFile(report, classification, riskLevel);
            String detailedReport = buildDetailedReport(
                    classification,
                    riskLevel,
                    report,
                    videoFile.getOriginalFilename()
            );

            long incidentCount = incidentRepo.count();
            String camera = "CAM-" + String.format("%02d", incidentCount + 1);
            String zone = "Zone " + (char) ('A' + (incidentCount % 6));
            String riskScore = calculateRiskScore(riskLevel);
            String summaryText = report.length() > 300 ? report.substring(0, 300) + "..." : report;

            Incident newIncident = Incident.builder()
                    .summary(summaryText)
                    .classification(classification)
                    .riskLevel(riskLevel)
                    .reportFilePath(filePath)
                    .camera(camera)
                    .zone(zone)
                    .confidence(String.format("%.1f%%", confidence))
                    .riskScore(riskScore)
                    .processingTime(processingTime)
                    .framesAnalyzed(frameFiles.size())
                    .fileName(videoFile.getOriginalFilename())
                    .detailedReport(detailedReport)
                    .createdAt(LocalDateTime.now())
                    .build();

            Incident savedIncident = incidentRepo.save(newIncident);

            frameCleanupService.promoteFrames(sessionId, savedIncident.getId(), riskLevel);
            boolean framesStored = !riskLevel.equalsIgnoreCase("Low");

            Map<String, Object> response = new HashMap<>();
            response.put("id", savedIncident.getId());
            response.put("videoName", videoFile.getOriginalFilename());
            response.put("savedPath", savedFilePath);
            response.put("classification", classification);
            response.put("riskLevel", riskLevel);
            response.put("processingTime", processingTime);
            response.put("confidence", String.format("%.1f%%", confidence));
            response.put("framesStored", framesStored);

            return ResponseEntity.ok(response);

        } catch (IOException e) {
            log.error("Error saving video file", e);
            return ResponseEntity.internalServerError()
                    .body("Error saving video: " + e.getMessage());
        } catch (Exception e) {
            log.error("Error processing video - FULL ERROR:", e);
            return ResponseEntity.internalServerError()
                    .body("Error processing video: " + e.getMessage());
        }
    }

    private String buildDetailedReport(String classification, String riskLevel, String summary, String videoName) {
        StringBuilder report = new StringBuilder();
        report.append("SUMMARY:\n");
        report.append("AI analysis of video '").append(videoName).append("' detected: ")
                .append(classification).append("\n\n");

        report.append("DETECTION DETAILS:\n");
        report.append("- Video file processed: ").append(videoName).append("\n");
        report.append("- Classification: ").append(classification).append("\n");
        report.append("- Risk assessment: ").append(riskLevel).append("\n\n");

        report.append("RISK ASSESSMENT:\n");
        report.append("This incident is classified as ")
                .append(riskLevel.toUpperCase())
                .append(" based on AI analysis.\n\n");

        report.append("RECOMMENDED ACTIONS:\n");
        if (riskLevel.equalsIgnoreCase("High") || riskLevel.equalsIgnoreCase("Critical")) {
            report.append("1. Immediate security response required\n");
            report.append("2. Review all evidence frames\n");
            report.append("3. Alert security team\n");
        } else if (riskLevel.equalsIgnoreCase("Medium") || riskLevel.equalsIgnoreCase("Moderate")) {
            report.append("1. Monitor situation\n");
            report.append("2. Review evidence frames\n");
            report.append("3. Consider security dispatch\n");
        } else {
            report.append("No immediate action required. Incident logged for record-keeping.\n");
        }

        return report.toString();
    }

    private String calculateRiskScore(String riskLevel) {
        if (riskLevel == null) {
            return String.format("%.1f/10", 5.0);
        }

        String risk = riskLevel.toLowerCase();
        double score;

        if (risk.contains("high") || risk.contains("critical")) {
            score = 7.5 + (Math.random() * 2.5);
        } else if (risk.contains("medium") || risk.contains("moderate")) {
            score = 4.0 + (Math.random() * 3.4);
        } else {
            score = Math.random() * 3.9;
        }

        return String.format("%.1f/10", score);
    }
}