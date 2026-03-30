package dev.SentinelAi.sentinelai.service.AI;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class LMStudioServiceImpl implements AnalysisService {

    private final RestTemplate restTemplate;

    @Value("${lmstudio.api.url:http://localhost:1234/v1/chat/completions}")
    private String lmStudioUrl;

    @Value("${lmstudio.model.name:qwen/qwen3-vl-4b}")
    private String modelName;

    @Value("${lmstudio.temperature:0.2}")
    private double temperature;

    @Value("${lmstudio.prompt}")
    private String analysisPrompt;
    
    // Image resizing configuration
    private static final int MAX_IMAGE_WIDTH = 640;
    private static final int MAX_IMAGE_HEIGHT = 480;

    @Override
    @Retryable(
        value = {ResourceAccessException.class},
        maxAttempts = 3,
        backoff = @Backoff(delay = 1000, multiplier = 2)
    )
    @SuppressWarnings("deprecation")
    public AnalysisResult analyzeImages(MultipartFile[] files) throws Exception {
        log.info("=== ANALYZING IMAGES ===");
        log.info("Number of images: {}", files.length);

        for (int i = 0; i < files.length; i++) {
            log.info("Image {}: Name={}, Size={} bytes, Type={}",
                     i+1, files[i].getOriginalFilename(), files[i].getSize(), files[i].getContentType());
        }

        // Track inference start time
        long startTime = System.currentTimeMillis();

        List<Map<String, Object>> content = buildRequestContent(files);
        Map<String, Object> requestBody = buildRequestBody(content);
        String report = callLMStudioAPI(requestBody);

        // Track inference end time
        long endTime = System.currentTimeMillis();
        long inferenceTimeMs = endTime - startTime;

        String classification = extractClassification(report);
        String riskLevel = extractRiskLevel(report);
        double confidence = calculateConfidence(report, riskLevel);

        log.info("Analysis complete: classification={}, riskLevel={}, inferenceTime={}ms", 
                 classification, riskLevel, inferenceTimeMs);

        return AnalysisResult.builder()
                .report(report)
                .classification(classification)
                .riskLevel(riskLevel)
                .inferenceTimeMs(inferenceTimeMs)
                .confidence(confidence)
                .build();
    }

    private List<Map<String, Object>> buildRequestContent(MultipartFile[] files) throws Exception {
        List<Map<String, Object>> content = new ArrayList<>();

        Map<String, Object> textPart = new HashMap<>();
        textPart.put("type", "text");
        textPart.put("text", analysisPrompt);
        content.add(textPart);

        for (MultipartFile file : files) {
            // Read and resize image to reduce token count
            BufferedImage originalImage = ImageIO.read(file.getInputStream());
            BufferedImage resizedImage = resizeImage(originalImage);
            
            // Convert resized image to base64
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(resizedImage, "jpg", baos);
            byte[] imageBytes = baos.toByteArray();
            String base64 = Base64.getEncoder().encodeToString(imageBytes);
            
            Map<String, Object> imagePart = new HashMap<>();
            imagePart.put("type", "image_url");

            Map<String, String> imageUrl = new HashMap<>();
            imageUrl.put("url", "data:image/jpeg;base64," + base64);

            imagePart.put("image_url", imageUrl);
            content.add(imagePart);
            
            log.info("Resized image: {}x{} -> tokens est. ~{}", 
                originalImage.getWidth(), originalImage.getHeight(), 
                (base64.length() / 4));
        }
        return content;
    }
    
    /**
     * Resize image to fit within MAX_IMAGE_WIDTH x MAX_IMAGE_HEIGHT
     * while maintaining aspect ratio
     */
    private BufferedImage resizeImage(BufferedImage original) {
        int originalWidth = original.getWidth();
        int originalHeight = original.getHeight();
        
        // Calculate new dimensions maintaining aspect ratio
        double aspectRatio = (double) originalWidth / originalHeight;
        int newWidth, newHeight;
        
        if (originalWidth > originalHeight) {
            // Landscape
            newWidth = MAX_IMAGE_WIDTH;
            newHeight = (int) (MAX_IMAGE_WIDTH / aspectRatio);
        } else {
            // Portrait
            newHeight = MAX_IMAGE_HEIGHT;
            newWidth = (int) (MAX_IMAGE_HEIGHT * aspectRatio);
        }
        
        // Ensure dimensions don't exceed max
        if (newWidth > MAX_IMAGE_WIDTH) newWidth = MAX_IMAGE_WIDTH;
        if (newHeight > MAX_IMAGE_HEIGHT) newHeight = MAX_IMAGE_HEIGHT;
        
        log.info("Resizing image from {}x{} to {}x{}", 
            originalWidth, originalHeight, newWidth, newHeight);
        
        // Create resized image with better quality
        BufferedImage resized = new BufferedImage(newWidth, newHeight, BufferedImage.TYPE_INT_RGB);
        Graphics2D g2d = resized.createGraphics();
        g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, 
                             RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g2d.setRenderingHint(RenderingHints.KEY_RENDERING, 
                             RenderingHints.VALUE_RENDER_QUALITY);
        g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, 
                             RenderingHints.VALUE_ANTIALIAS_ON);
        g2d.drawImage(original, 0, 0, newWidth, newHeight, null);
        g2d.dispose();
        
        return resized;
    }

    private Map<String, Object> buildRequestBody(List<Map<String, Object>> content) {
        Map<String, Object> message = new HashMap<>();
        message.put("role", "user");
        message.put("content", content);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", modelName);
        requestBody.put("messages", List.of(message));
        requestBody.put("temperature", temperature);

        return requestBody;
    }

    private String callLMStudioAPI(Map<String, Object> requestBody) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

        try {
            log.info("Calling LM Studio API at: {}", lmStudioUrl);
            log.info("Request body - model: {}, messages count: {}", modelName, 
                requestBody.get("messages") != null ? ((List<?>)requestBody.get("messages")).size() : 0);
            
            ResponseEntity<ChatResponse> response = restTemplate.postForEntity(
                    lmStudioUrl,
                    request,
                    ChatResponse.class
            );

            log.info("LM Studio response status: {}", response.getStatusCode());
            
            ChatResponse body = response.getBody();
            if (body == null) {
                log.error("LM Studio returned null body");
                return "Error: LM Studio returned null response";
            }
            
            // Check for error in response
            if (body.getError() != null) {
                log.error("LM Studio returned error: {} - {}", 
                    body.getError().getType(), body.getError().getMessage());
                return "Error: LM Studio API error - " + body.getError().getMessage();
            }
            
            if (body.getChoices() == null || body.getChoices().isEmpty()) {
                log.error("LM Studio returned empty choices. Full response: {}", body);
                return "Error: No response from LM Studio - empty choices";
            }
            
            if (body.getChoices().get(0).getMessage() == null) {
                log.error("LM Studio choice has null message");
                return "Error: No response from LM Studio - null message";
            }
            
            String content = body.getChoices().get(0).getMessage().getContent();
            log.info("LM Studio analysis successful, content length: {} chars", content != null ? content.length() : 0);
            log.info("LM Studio response preview: {}", content != null && content.length() > 200 ? content.substring(0, 200) + "..." : content);
            return content != null ? content : "Error: No response from LM Studio";
            
        } catch (Exception e) {
            log.error("LM Studio API call failed: {}", e.getMessage(), e);
            return "Error: LM Studio API call failed - " + e.getMessage();
        }
    }

    /**
     * Calculate confidence score based on report content and risk level certainty.
     * Returns a value between 0-100.
     */
    private double calculateConfidence(String report, String riskLevel) {
        if (report == null || report.isEmpty()) {
            return 50.0; // Default confidence for empty reports
        }

        String lower = report.toLowerCase();
        double confidence = 85.0; // Base confidence

        // Increase confidence for explicit classifications
        if (lower.contains("classification:") || lower.contains("**classification**")) {
            confidence += 5.0;
        }

        // Increase confidence for explicit risk level mentions
        if (lower.contains("risk level:") || lower.contains("**risk level**")) {
            confidence += 5.0;
        }

        // Increase confidence for detailed reports (more analysis = more confident)
        if (report.length() > 500) {
            confidence += 3.0;
        } else if (report.length() > 300) {
            confidence += 2.0;
        }

        // Increase confidence for specific keyword matches
        if (lower.contains("clearly") || lower.contains("definitely") || 
            lower.contains("obviously") || lower.contains("certainly")) {
            confidence += 4.0;
        }

        // Decrease confidence for uncertain language
        if (lower.contains("possibly") || lower.contains("might be") || 
            lower.contains("unclear") || lower.contains("ambiguous")) {
            confidence -= 5.0;
        }

        if (lower.contains("cannot determine") || lower.contains("unable to determine")) {
            confidence -= 15.0;
        }

        // Cap confidence between 0-100
        return Math.max(0.0, Math.min(100.0, confidence));
    }

    private String extractClassification(String report) {
        if (report == null || report.isEmpty()) {
            log.warn("Empty report received for classification");
            return "Unknown";
        }
        
        String lower = report.toLowerCase();
        
        // Check for explicit classification in the report
        if (lower.contains("classification: suspicious") || lower.contains("classification:suspicious")) {
            return "Suspicious Activity";
        }
        if (lower.contains("classification: normal") || lower.contains("classification:normal")) {
            return "Normal Activity";
        }
        
        // Keyword-based detection for suspicious activity
        if (lower.contains("suspicious activity") || lower.contains("suspicious behavior") ||
            lower.contains("threat") || lower.contains("danger") || lower.contains("weapon") ||
            lower.contains("knife") || lower.contains("gun") || lower.contains("violence") ||
            lower.contains("aggressive") || lower.contains("hostile") || lower.contains("intruder") ||
            lower.contains("break-in") || lower.contains("theft") || lower.contains("crime")) {
            return "Suspicious Activity";
        }
        
        if (lower.contains("normal activity") || lower.contains("routine") || 
            lower.contains("calm") || lower.contains("peaceful")) {
            return "Normal Activity";
        }
        
        log.warn("Could not classify report, defaulting to Unknown. Report preview: {}", 
            report.length() > 100 ? report.substring(0, 100) + "..." : report);
        return "Unknown";
    }

    private String extractRiskLevel(String report) {
        if (report == null || report.isEmpty()) {
            log.warn("Empty report received for risk level extraction");
            return "Unknown";
        }
        
        String lower = report.toLowerCase();

        // Check for explicit risk level in the report (highest priority)
        if (lower.contains("risk level: high") || lower.contains("risk level:high") ||
            lower.contains("risk: high") || lower.contains("risk:high") ||
            lower.contains("**high risk**") || lower.contains("**high**")) {
            log.info("Extracted risk level: HIGH (explicit)");
            return "High";
        }

        // Check for Medium risk
        if (lower.contains("risk level: medium") || lower.contains("risk level:medium") ||
            lower.contains("risk: medium") || lower.contains("risk:medium") ||
            lower.contains("**medium risk**") || lower.contains("**medium**") ||
            lower.contains("moderate risk")) {
            log.info("Extracted risk level: MEDIUM (explicit)");
            return "Medium";
        }

        // Check for Low risk
        if (lower.contains("risk level: low") || lower.contains("risk level:low") ||
            lower.contains("risk: low") || lower.contains("risk:low") ||
            lower.contains("**low risk**") || lower.contains("**low**")) {
            log.info("Extracted risk level: LOW (explicit)");
            return "Low";
        }
        
        // Keyword-based risk assessment (fallback)
        if (lower.contains("high risk") || lower.contains("immediate threat") || 
            lower.contains("emergency") || lower.contains("critical") || lower.contains("severe") ||
            lower.contains("weapon") || lower.contains("knife") || lower.contains("gun") ||
            lower.contains("violence") || lower.contains("assault")) {
            log.info("Extracted risk level: HIGH (keyword-based)");
            return "High";
        }
        
        if (lower.contains("medium risk") || lower.contains("moderate") || 
            lower.contains("monitor") || lower.contains("caution")) {
            log.info("Extracted risk level: MEDIUM (keyword-based)");
            return "Medium";
        }

        // Default to Low if unclear
        log.info("Extracted risk level: LOW (default)");
        return "Low";
    }

    // --- Internal DTOs to map the OpenAI-compatible JSON structure ---

    @Data
    private static class ChatResponse {
        private List<Choice> choices;
        private ErrorDetail error;
    }

    @Data
    private static class Choice {
        private Message message;
    }

    @Data
    private static class Message {
        private String content;
    }
    
    @Data
    private static class ErrorDetail {
        private String message;
        private String type;
    }
}