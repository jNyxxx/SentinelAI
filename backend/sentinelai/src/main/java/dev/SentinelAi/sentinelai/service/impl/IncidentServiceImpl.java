package dev.SentinelAi.sentinelai.service.impl;

import dev.SentinelAi.sentinelai.domain.entity.Incident;
import dev.SentinelAi.sentinelai.repository.IncidentRepo;
import dev.SentinelAi.sentinelai.service.fileStorageService;
import dev.SentinelAi.sentinelai.service.AI.AnalysisResult;
import dev.SentinelAi.sentinelai.service.AI.AnalysisService;
import dev.SentinelAi.sentinelai.service.IncidentService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class IncidentServiceImpl implements IncidentService{

    private final IncidentRepo repo;
    private final fileStorageService fileStorageService;
    private final AnalysisService analysisService;

    @Override
    @Transactional
    public Incident analyzeIncidents(MultipartFile[] files) throws Exception {
        log.info("Analyzing {} files", files.length);

        // Now returns AnalysisResult with timing data
        AnalysisResult analysisResult = analysisService.analyzeImages(files);

        String report = analysisResult.getReport();
        String classification = analysisResult.getClassification();
        String riskLevel = analysisResult.getRiskLevel();

        log.info("Analysis complete: classification={}, riskLevel={}, inferenceTime={}ms",
                 classification, riskLevel, analysisResult.getInferenceTimeMs());

        String filePath = fileStorageService.saveReportToFile(report, classification, riskLevel);

        Incident incident = Incident.builder()
                .summary(report.substring(0, Math.min(300, report.length())))
                .riskLevel(riskLevel)
                .classification(classification)
                .reportFilePath(filePath)
                .createdAt(LocalDateTime.now())
                .build();

        log.info("Saving incident to database");
        return repo.save(incident);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Incident> getAllIncidents() {
        return repo.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Incident> getIncidentsById(Long id) {
        return repo.findById(id);
    }

    @Override
    @Transactional
    public boolean deleteIncident(Long id) {
        log.info("Deleting incident {}", id);
        Optional<Incident> incidentOpt = repo.findById(id);

        if (incidentOpt.isEmpty()) {
            log.warn("Incident {} not found", id);
            return false;
        }

        Incident incident = incidentOpt.get();

        // Delete file
        if (incident.getReportFilePath() != null) {
            fileStorageService.deleteReportFromFile(incident.getReportFilePath());
            log.info("Deleted report file: {}", incident.getReportFilePath());
        }

        // Delete from database
        repo.deleteById(id);
        log.info("Deleted incident {}", id);
        return true;
    }

    @Override
    @Transactional(readOnly = true)
    public String getReportFileContent(Long id) {
        Optional<Incident> incidentOpt = repo.findById(id);

        if (incidentOpt.isEmpty()) {
            log.warn("Incident {} not found", id);
            return null;
        }

        Incident incident = incidentOpt.get();
        return fileStorageService.readReportFromFile(incident.getReportFilePath());
    }

}
