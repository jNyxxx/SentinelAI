package dev.SentinelAi.sentinelai.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import lombok.Builder;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
public class VideoProcessingService {

    // Frame extraction constants
    private static final String TEMP_DIR = System.getProperty("user.dir") + "/temp-frames/";
    private static final int FRAMES_TO_EXTRACT = 3;  // Before, During, Aftermath
    private static final long MIN_FRAME_SIZE_BYTES = 5000;

    // FFmpeg configuration
    private static final int DEFAULT_VIDEO_DURATION_SECONDS = 10;

    @Value("${ffmpeg.path}")
    private String ffmpegPath;

    @Value("${ffprobe.path}")
    private String ffprobePath;

    /**
     * Result object for frame extraction containing extracted frames and timing data.
     */
    @Data
    @Builder
    public static class FrameExtractionResult {
        private List<File> frames;
        private long extractionTimeMs;
        private double videoDurationSeconds;
    }

    private String resolveBinaryPath(String configured, String fallbackName) {
        if (configured == null || configured.isBlank()) {
            return fallbackName;
        }
        try {
            Path p = Paths.get(configured);
            if (Files.exists(p)) {
                return p.toString();
            }
        } catch (Exception ignored) {
        }
        return fallbackName;
    }

    /**
     * Extract frames from video file with timing tracking.
     * @param videoFile The video file to extract frames from
     * @return FrameExtractionResult containing frames and timing data
     * @throws IOException if frame extraction fails
     */
    public FrameExtractionResult extractFrames(MultipartFile videoFile) throws IOException {
        log.info("=== EXTRACTING FRAMES ===");
        log.info("Video: {}", videoFile.getOriginalFilename());
        log.info("Size: {} bytes", videoFile.getSize());

        long startTime = System.currentTimeMillis();

        Path tempDir = Paths.get(TEMP_DIR);
        if (!Files.exists(tempDir)) {
            Files.createDirectories(tempDir);
        }

        String timestamp = String.valueOf(System.currentTimeMillis());
        File tempVideo = new File(TEMP_DIR + "video_" + timestamp + ".mp4");

        try {
            java.nio.file.Files.write(tempVideo.toPath(), videoFile.getBytes());
            log.info("Video saved to temp: {}", tempVideo.getAbsolutePath());
        } catch (IOException e) {
            log.error("Failed to save temp video file", e);
            throw new IOException("Failed to save temp video: " + e.getMessage(), e);
        }

        // Get video duration using FFprobe
        double duration = getVideoDuration(tempVideo.getAbsolutePath());
        log.info("Video duration: {} seconds", duration);

        // Extract 3 frames at different timestamps for complete incident timeline
        // 10% = Before incident, 50% = During incident, 90% = Aftermath
        List<File> frames = new ArrayList<>();

        try {
            String resolvedFfmpeg = resolveBinaryPath(ffmpegPath, "ffmpeg");

            // Extract frames at 10%, 50%, 90% of video duration
            double[] percentages = { 0.1, 0.5, 0.9 };

            for (int i = 0; i < FRAMES_TO_EXTRACT; i++) {
                double seekTime = duration * percentages[i];
                String outputFrame = TEMP_DIR + "frame_" + timestamp + "_" + (i+1) + ".jpg";

                // Extract frame at specific timestamp
                ProcessBuilder pb = new ProcessBuilder(
                    "cmd.exe", "/c",
                    resolvedFfmpeg, "-y", "-ss", String.valueOf(seekTime),
                    "-i", tempVideo.getAbsolutePath(),
                    "-vframes", "1",
                    "-q:v", "2",
                    outputFrame
                );
                pb.redirectErrorStream(true);
                Process process = pb.start();
                process.waitFor();

                File frameFile = new File(outputFrame);
                if (frameFile.exists() && frameFile.length() > MIN_FRAME_SIZE_BYTES) {
                    frames.add(frameFile);
                    log.info("Extracted frame {} at {:.1f}s ({:.0f}% of video) - Size: {} bytes",
                             i+1, seekTime, percentages[i] * 100, frameFile.length());
                } else {
                    log.error("Frame {} extraction failed - File exists: {}, Size: {} bytes",
                             i+1, frameFile.exists(), frameFile.length());
                }
            }

            log.info("Extracted {} frames from video (Before/During/Aftermath)", frames.size());
            tempVideo.delete();
            
            long endTime = System.currentTimeMillis();
            long extractionTimeMs = endTime - startTime;
            log.info("Frame extraction completed in {}ms", extractionTimeMs);
            
            return FrameExtractionResult.builder()
                    .frames(frames)
                    .extractionTimeMs(extractionTimeMs)
                    .videoDurationSeconds(duration)
                    .build();

        } catch (IOException e) {
            log.error("FFmpeg extraction failed: {}", e.getMessage(), e);
            throw new IOException("FFmpeg extraction failed: " + e.getMessage(), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Frame extraction interrupted: {}", e.getMessage());
            throw new IOException("Frame extraction interrupted", e);
        }
    }

    /**
     * Get video duration in seconds using FFprobe
     */
    private double getVideoDuration(String videoPath) {
        try {
            String resolvedFfprobe = resolveBinaryPath(ffprobePath, "ffprobe");
            
            // Use FFprobe with proper Windows syntax
            ProcessBuilder pb = new ProcessBuilder(
                "cmd.exe", "/c",
                resolvedFfprobe, "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                videoPath
            );
            pb.redirectErrorStream(true);
            Process process = pb.start();
            
            java.io.BufferedReader reader = new java.io.BufferedReader(
                new java.io.InputStreamReader(process.getInputStream())
            );
            String line = reader.readLine();
            process.waitFor();
            
            if (line != null && !line.isEmpty()) {
                try {
                    double duration = Double.parseDouble(line.trim());
                    log.debug("Video duration: {} seconds", duration);
                    return duration > 0 ? duration : DEFAULT_VIDEO_DURATION_SECONDS;
                } catch (NumberFormatException e) {
                    log.warn("Invalid duration format: {}", line);
                }
            }
        } catch (Exception e) {
            log.warn("Could not determine video duration: {}", e.getMessage());
        }
        return DEFAULT_VIDEO_DURATION_SECONDS; // Default 10 seconds if can't determine
    }

    public void cleanupFrames(List<File> frames) {
        log.debug("Cleaning up {} temporary frames", frames.size());
        for (File frame : frames) {
            frame.delete();
        }
        log.debug("Cleanup complete");
    }

}