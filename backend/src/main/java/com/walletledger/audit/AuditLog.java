package com.walletledger.audit;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;

@Entity
@Table(name = "audit_logs")
public class AuditLog extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(nullable = false, length = 64)
    public String entity;

    @Column(name = "entity_id", nullable = false, length = 64)
    public String entityId;

    @Column(nullable = false, length = 64)
    public String action;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    public String diff;

    @Column(name = "performed_by", length = 128)
    public String performedBy;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt = Instant.now();
}
