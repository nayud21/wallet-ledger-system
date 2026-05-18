package com.walletledger.domain;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid", updatable = false)
    public UUID id;

    @Column(nullable = false, unique = true, length = 64)
    public String username;

    @Column(nullable = false, unique = true, length = 255)
    public String email;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt = Instant.now();
}
