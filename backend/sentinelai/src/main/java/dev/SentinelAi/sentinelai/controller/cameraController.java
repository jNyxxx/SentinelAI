package dev.SentinelAi.sentinelai.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/cameras")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:4173"})
@Slf4j
public class cameraController {

    // In-memory camera state storage (use Redis/database for production)
    private final Map<String, CameraState> cameraStates = new HashMap<>();

    // Simulated camera feeds (for demo without physical cameras)
    private final List<Map<String, String>> registeredCameras = Arrays.asList(
        createCamera("CAM-01", "North Corridor", "Alpha", "active"),
        createCamera("CAM-02", "Server Room 4B", "Beta", "alert"),
        createCamera("CAM-03", "Main Lobby", "Alpha", "active"),
        createCamera("CAM-04", "Perimeter East", "Gamma", "active")
    );

    private Map<String, String> createCamera(String id, String label, String sector, String status) {
        Map<String, String> cam = new HashMap<>();
        cam.put("id", id);
        cam.put("label", label);
        cam.put("sector", sector);
        cam.put("status", status);
        return cam;
    }

    /**
     * Get list of all registered cameras
     */
    @GetMapping
    public ResponseEntity<?> getCameras() {
        log.info("Getting all cameras");
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, String> cam : registeredCameras) {
            Map<String, Object> cameraInfo = new HashMap<>(cam);
            CameraState state = cameraStates.get(cam.get("id"));
            cameraInfo.put("isCapturing", state != null && state.isCapturing);
            cameraInfo.put("currentFrame", state != null ? state.currentFrame : null);
            result.add(cameraInfo);
        }
        
        // Add virtual webcam if it's active
        CameraState webcamState = cameraStates.get("WEBCAM-01");
        if (webcamState != null && webcamState.isCapturing()) {
            Map<String, Object> webcamInfo = new HashMap<>();
            webcamInfo.put("id", "WEBCAM-01");
            webcamInfo.put("label", "Live Webcam");
            webcamInfo.put("sector", "Live Monitor");
            webcamInfo.put("status", "active");
            webcamInfo.put("isCapturing", true);
            webcamInfo.put("currentFrame", webcamState.getCurrentFrame());
            result.add(webcamInfo);
        }
        
        log.info("Returning {} cameras", result.size());
        return ResponseEntity.ok(result);
    }

    /**
     * Get camera stream info
     */
    @GetMapping("/{id}/stream")
    public ResponseEntity<?> getCameraStream(@PathVariable String id) {
        Map<String, Object> streamInfo = new HashMap<>();
        streamInfo.put("cameraId", id);
        streamInfo.put("streamType", "mjpeg");
        streamInfo.put("url", "/api/v1/cameras/" + id + "/mjpeg");
        streamInfo.put("fps", 30);
        streamInfo.put("resolution", "1920x1080");
        return ResponseEntity.ok(streamInfo);
    }

    /**
     * Start camera capture
     */
    @PostMapping("/{id}/start")
    public ResponseEntity<?> startCapture(@PathVariable String id) {
        log.info("Starting capture for camera: {}", id);
        CameraState state = cameraStates.computeIfAbsent(id, k -> new CameraState());
        state.setCapturing(true);
        return ResponseEntity.ok(Map.of("status", "started", "cameraId", id));
    }

    /**
     * Stop camera capture
     */
    @PostMapping("/{id}/stop")
    public ResponseEntity<?> stopCapture(@PathVariable String id) {
        log.info("Stopping capture for camera: {}", id);
        CameraState state = cameraStates.get(id);
        if (state != null) {
            state.setCapturing(false);
        }
        return ResponseEntity.ok(Map.of("status", "stopped", "cameraId", id));
    }

    /**
     * Register virtual webcam as active camera
     */
    @PostMapping("/webcam/register")
    public ResponseEntity<?> registerWebcam() {
        log.info("Registering virtual webcam");
        String webcamId = "WEBCAM-01";
        CameraState state = cameraStates.computeIfAbsent(webcamId, k -> new CameraState());
        state.setCapturing(true);
        state.setLastFrameTime(System.currentTimeMillis());
        return ResponseEntity.ok(Map.of(
            "status", "registered",
            "cameraId", webcamId,
            "message", "Webcam registered as active camera"
        ));
    }

    /**
     * Unregister virtual webcam
     */
    @PostMapping("/webcam/unregister")
    public ResponseEntity<?> unregisterWebcam() {
        log.info("Unregistering virtual webcam");
        String webcamId = "WEBCAM-01";
        CameraState state = cameraStates.get(webcamId);
        if (state != null) {
            state.setCapturing(false);
        }
        return ResponseEntity.ok(Map.of(
            "status", "unregistered",
            "cameraId", webcamId,
            "message", "Webcam unregistered"
        ));
    }

    /**
     * Update webcam activity (heartbeat)
     */
    @PostMapping("/webcam/heartbeat")
    public ResponseEntity<?> webcamHeartbeat() {
        String webcamId = "WEBCAM-01";
        CameraState state = cameraStates.computeIfAbsent(webcamId, k -> new CameraState());
        state.setCapturing(true);
        state.setLastFrameTime(System.currentTimeMillis());
        return ResponseEntity.ok(Map.of(
            "status", "active",
            "cameraId", webcamId,
            "timestamp", System.currentTimeMillis()
        ));
    }

    /**
     * Get current frame as base64 (for polling)
     */
    @GetMapping("/{id}/frame")
    public ResponseEntity<?> getCurrentFrame(@PathVariable String id) {
        CameraState state = cameraStates.computeIfAbsent(id, k -> new CameraState());

        // Generate simulated frame if capturing
        if (state.isCapturing) {
            String simulatedBase64 = generateSimulatedFrame(id);
            state.setCurrentFrame(simulatedBase64);
            return ResponseEntity.ok(Map.of(
                "cameraId", id,
                "timestamp", System.currentTimeMillis(),
                "frame", simulatedBase64
            ));
        }

        return ResponseEntity.ok(Map.of("cameraId", id, "frame", null));
    }

    /**
     * Generate simulated frame (placeholder for real camera feed)
     * Creates a simple colored rectangle as base64 JPEG
     */
    private String generateSimulatedFrame(String cameraId) {
        // Generate a simple 640x480 blue-tinted placeholder image as base64
        // This is a minimal valid JPEG header + simple pattern
        // For production, replace with actual camera capture
        try {
            // Create a simple buffered image and encode it
            java.awt.image.BufferedImage image = new java.awt.image.BufferedImage(640, 480, java.awt.image.BufferedImage.TYPE_INT_RGB);
            java.awt.Graphics2D g = image.createGraphics();
            
            // Background gradient
            for (int y = 0; y < 480; y++) {
                for (int x = 0; x < 640; x++) {
                    int r = (int)(20 + (y * 0.05));
                    int g_val = (int)(30 + (x * 0.03));
                    int b = (int)(50 + ((x + y) * 0.02));
                    image.setRGB(x, y, (r << 16) | (g_val << 8) | b);
                }
            }
            
            // Draw camera ID text
            g.setColor(java.awt.Color.WHITE);
            g.setFont(new java.awt.Font("Monospace", java.awt.Font.BOLD, 24));
            g.drawString(cameraId + " - LIVE FEED", 20, 40);
            g.drawString(new java.util.Date().toString(), 20, 70);
            
            // Draw grid pattern
            g.setColor(new java.awt.Color(255, 255, 255, 50));
            for (int i = 0; i < 640; i += 40) {
                g.drawLine(i, 0, i, 480);
            }
            for (int i = 0; i < 480; i += 40) {
                g.drawLine(0, i, 640, i);
            }
            
            g.dispose();
            
            // Encode to base64
            java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
            javax.imageio.ImageIO.write(image, "jpg", baos);
            byte[] imageBytes = baos.toByteArray();
            String base64 = java.util.Base64.getEncoder().encodeToString(imageBytes);
            
            return "data:image/jpeg;base64," + base64;
        } catch (Exception e) {
            log.error("Failed to generate simulated frame: {}", e.getMessage());
            // Return a minimal valid JPEG as fallback
            return "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAB//2Q==";
        }
    }

    /**
     * Camera state holder
     */
    @lombok.Data
    private static class CameraState {
        private boolean isCapturing = false;
        private String currentFrame = null;
        private long lastFrameTime = 0;
    }
}
