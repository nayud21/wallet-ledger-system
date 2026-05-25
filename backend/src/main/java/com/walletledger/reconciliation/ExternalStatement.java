package com.walletledger.reconciliation;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "external_statements")
public class ExternalStatement extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(nullable = false, length = 64)
    public String provider;

    @Column(name = "statement_date", nullable = false)
    public LocalDate statementDate;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    public String content;

    @Column(nullable = false, length = 32)
    public String status = "PENDING";

    @Column(name = "created_at", nullable = false)
    public Instant createdAt = Instant.now();
}
