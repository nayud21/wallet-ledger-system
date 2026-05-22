package com.walletledger.audit;

import jakarta.enterprise.context.ApplicationScoped;
import lombok.RequiredArgsConstructor;

@ApplicationScoped
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository repo;

    public void log(String entity, String entityId, String action, String diff, String performedBy) {
        AuditLog log = new AuditLog();
        log.entity = entity;
        log.entityId = entityId;
        log.action = action;
        log.diff = diff;
        log.performedBy = performedBy;
        repo.persist(log);
    }

    public void log(String entity, String entityId, String action, String diff) {
        log(entity, entityId, action, diff, "system");
    }
}
