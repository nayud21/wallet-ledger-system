package com.walletledger.audit;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import lombok.RequiredArgsConstructor;

import java.util.Map;

@ApplicationScoped
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository repo;
    private final ObjectMapper mapper;

    public void log(String entity, String entityId, String action, Map<String, Object> diff, String performedBy) {
        AuditLog log = new AuditLog();
        log.entity = entity;
        log.entityId = entityId;
        log.action = action;
        log.diff = toJson(diff);
        log.performedBy = performedBy;
        repo.persist(log);
    }

    public void log(String entity, String entityId, String action, Map<String, Object> diff) {
        log(entity, entityId, action, diff, "system");
    }

    private String toJson(Map<String, Object> diff) {
        try {
            return mapper.writeValueAsString(diff);
        } catch (Exception e) {
            return "{}";
        }
    }
}
