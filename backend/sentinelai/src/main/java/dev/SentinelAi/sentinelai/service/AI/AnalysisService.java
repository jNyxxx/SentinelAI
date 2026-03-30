package dev.SentinelAi.sentinelai.service.AI;

import org.springframework.web.multipart.MultipartFile;
import java.util.Map;

public interface AnalysisService {
    /**
     * Analyze images using AI and return the analysis result
     * @param files Array of image files to analyze
     * @return AnalysisResult containing report, classification, riskLevel, and timing metrics
     * @throws Exception if analysis fails
     */
    AnalysisResult analyzeImages(MultipartFile[] files) throws Exception;
    
    /**
     * Legacy method for backward compatibility - returns Map format
     * @param files Array of image files to analyze
     * @return Map containing 'report', 'classification', and 'riskLevel'
     * @throws Exception if analysis fails
     * @deprecated Use analyzeImages(MultipartFile[]) which returns AnalysisResult
     */
    @Deprecated
    default Map<String, String> analyzeImagesLegacy(MultipartFile[] files) throws Exception {
        AnalysisResult result = analyzeImages(files);
        Map<String, String> map = new java.util.HashMap<>();
        map.put("report", result.getReport());
        map.put("classification", result.getClassification());
        map.put("riskLevel", result.getRiskLevel());
        return map;
    }
}
