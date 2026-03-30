package dev.SentinelAi.sentinelai.service;

import dev.SentinelAi.sentinelai.domain.entity.Incident;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Optional;

public interface IncidentService {

    Incident analyzeIncidents(MultipartFile[] files) throws Exception;

    List<Incident> getAllIncidents();

    Optional<Incident> getIncidentsById(Long id);

    boolean deleteIncident(Long id);

    String getReportFileContent(Long id);
}
