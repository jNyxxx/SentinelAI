package dev.SentinelAi.sentinelai.service.impl;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import dev.SentinelAi.sentinelai.service.fileStorageService;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
public class fileStorageServiceImpl implements fileStorageService{
    
    // Default matches application.properties and README (./incidents-reports)
    @Value("${file.storage.location:./incidents-reports}")
    private String storageLocation;

    @Override
    public String saveReportToFile(String report, String classification, String riskLevel) {
        try {
                        Path rootPath = Paths.get(storageLocation); // creates a directory if it doesnt exist 
            if (!Files.exists(rootPath)) {
                Files.createDirectories(rootPath);
            }

            // To generate filename with timestamp
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String filename = String.format("incident_%s_%s_%s.txt", timestamp, classification.replaceAll("\\s+", "_"), riskLevel);

            Path filePath = rootPath.resolve(filename).normalize();

            //creates the file contents
            StringBuilder content = new StringBuilder();
            content.append("=".repeat(80)).append("\n");
            content.append("INCIDENT REPORT").append("\n");
            
            content.append("=".repeat(80)).append("\n");
            content.append("Generated: ").append(LocalDateTime.now()).append("\n");
            content.append("Classification: ").append(classification).append("\n");
            content.append("Risk Level: ").append(riskLevel).append("\n\n");
            content.append("-".repeat(80)).append("\n");
            content.append("FULL REPORT\n");
            content.append("-".repeat(80)).append("\n\n");
            content.append(report).append("\n\n");
            content.append("=".repeat(80)).append("\n");
            content.append("END OF REPORT\n");
            content.append("=".repeat(80)).append("\n");

            //Writing to file 
            Files.writeString(filePath, content.toString(),
                StandardOpenOption.CREATE,
                StandardOpenOption.TRUNCATE_EXISTING);
            System.out.println("Report saved to: " + filePath.toAbsolutePath());
            return filePath.toString();

        } catch (IOException e) {
            System.err.println("Error saving report to file: " + e.getMessage());
            e.printStackTrace();
            return null;
        }
    }

    @Override
    public String readReportFromFile(String filePath) {
        try {
            Path path = Paths.get(filePath);
            if (Files.exists(path)) {
                return Files.readString(path);
            }else{
                System.err.println("File not found: " + filePath);
                return null;
            }
        } catch (IOException e) {
            System.err.println("Error reading from file: " + e.getMessage());
            return null;
        }
    }

    @Override
    public boolean deleteReportFromFile(String filePath) {
        try {
            Path path = Paths.get(filePath);
            if (Files.exists(path)) {
                Files.delete(path);
                System.out.println("Deleted file: " + filePath);
                return true;
            }
            return false;
        } catch (IOException e) {
            System.err.println("Error in deleting file: " + e.getMessage());
            return false;
        }
    }
    
}
