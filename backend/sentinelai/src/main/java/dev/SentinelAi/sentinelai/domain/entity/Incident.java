package dev.SentinelAi.sentinelai.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "incidents", indexes = {
    @Index(name = "idx_incidents_risk_level", columnList = "riskLevel"),
    @Index(name = "idx_incidents_created_at", columnList = "createdAt")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Incident {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "TEXT")
    private String summary;

    private String riskLevel;

    private String classification;

    private LocalDateTime createdAt;

    private String reportFilePath;

    private String camera;

    private String zone;

    private String confidence;

    private String riskScore;

    private String processingTime;

    private Integer framesAnalyzed;

    @Column(length = 500)
    private String fileName;  // Original uploaded filename

    @Column(columnDefinition = "TEXT")
    private String detailedReport;

    @OneToMany(mappedBy = "incident", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private List<IncidentFrame> frames;
}
