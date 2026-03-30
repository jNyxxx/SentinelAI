package dev.SentinelAi.sentinelai.service.AI;

import lombok.Builder;
import lombok.Data;

/**
 * Result object for AI analysis containing both the analysis output and performance metrics.
 */
@Data
@Builder
public class AnalysisResult {
    
    /**
     * The full AI-generated report text
     */
    private String report;
    
    /**
     * Classification result (e.g., "Suspicious Activity", "Normal Activity")
     */
    private String classification;
    
    /**
     * Risk level assessment (High, Medium, Low)
     */
    private String riskLevel;
    
    /**
     * Actual AI inference time in milliseconds
     */
    private long inferenceTimeMs;
    
    /**
     * Number of tokens used in the API call (if available)
     */
    private int tokenUsage;
    
    /**
     * Confidence score extracted from or calculated based on AI response (0-100)
     */
    private double confidence;
}
