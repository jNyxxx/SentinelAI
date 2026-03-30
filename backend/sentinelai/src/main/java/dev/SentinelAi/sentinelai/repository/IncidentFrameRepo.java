package dev.SentinelAi.sentinelai.repository;

import dev.SentinelAi.sentinelai.domain.entity.IncidentFrame;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

public interface IncidentFrameRepo extends JpaRepository<IncidentFrame, Long> {
    List<IncidentFrame> findByIncidentIdOrderByFrameIndexAsc(Long incidentId);
    List<IncidentFrame> findByCreatedAtBefore(LocalDateTime cutoff);
    @Transactional
    void deleteByIncidentId(Long incidentId);
    @Transactional
    void deleteByIncident_Id(Long incidentId);
}