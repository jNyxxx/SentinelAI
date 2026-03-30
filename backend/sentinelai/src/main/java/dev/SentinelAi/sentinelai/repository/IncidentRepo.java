package dev.SentinelAi.sentinelai.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import dev.SentinelAi.sentinelai.domain.entity.Incident;

import java.util.List;

public interface IncidentRepo extends JpaRepository<Incident, Long> {
    List<Incident> findAllByOrderByCreatedAtDesc();
}