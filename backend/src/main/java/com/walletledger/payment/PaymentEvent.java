package com.walletledger.payment;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;

@Entity
@Table(name = "payment_events")
public class PaymentEvent extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(nullable = false, length = 64)
    public String provider;

    @Column(name = "external_ref", nullable = false, length = 128)
    public String externalRef;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    public String payload;

    @Column(nullable = false, length = 32)
    public String status = "PENDING";

    @Column(name = "created_at", nullable = false)
    public Instant createdAt = Instant.now();
}
