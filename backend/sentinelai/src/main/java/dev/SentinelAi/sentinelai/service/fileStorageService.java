package dev.SentinelAi.sentinelai.service;

public interface fileStorageService {

    String saveReportToFile(String report, String classification, String riskLevel);

    String readReportFromFile(String filePath);

    boolean deleteReportFromFile(String filePath);
}