package dev.SentinelAi.sentinelai.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "incident_frames", indexes = {
    @Index(name = "idx_incident_frame_incident_id", columnList = "incident_id"),
    @Index(name = "idx_incident_frame_created_at", columnList = "created_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IncidentFrame {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "incident_id", nullable = false, foreignKey = @ForeignKey(name = "fk_incident_frame_incident"))
    private Incident incident;

    private String filePath;

    private Integer frameIndex;

    private LocalDateTime createdAt;
}
