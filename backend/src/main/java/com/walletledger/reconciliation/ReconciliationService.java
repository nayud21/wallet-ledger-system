package com.walletledger.reconciliation;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.walletledger.ledger.LedgerEntry;
import com.walletledger.ledger.LedgerEntryRepository;
import com.walletledger.reconciliation.dto.ReconciliationExceptionResponse;
import com.walletledger.reconciliation.dto.ReconciliationMatchResponse;
import com.walletledger.reconciliation.dto.ReconciliationRunResponse;
import com.walletledger.reconciliation.dto.StatementLine;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.jboss.logging.Logger;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@ApplicationScoped
@RequiredArgsConstructor
public class ReconciliationService {

    private static final Logger LOG = Logger.getLogger(ReconciliationService.class);
    private static final ObjectMapper MAPPER = new ObjectMapper().registerModule(new JavaTimeModule());

    private final ExternalStatementRepository statementRepository;
    private final ReconciliationRunRepository runRepository;
    private final ReconciliationMatchRepository matchRepository;
    private final ReconciliationExceptionRepository exceptionRepository;
    private final LedgerEntryRepository ledgerEntryRepository;

    @Transactional
    public ReconciliationRun runForDate(LocalDate date) {
        ReconciliationRun run = new ReconciliationRun();
        run.runDate = date;
        runRepository.persist(run);

        List<ExternalStatement> statements = statementRepository.list("statementDate = ?1 AND status = 'PENDING'", date);

        Instant dayStart = date.atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant dayEnd = date.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
        List<LedgerEntry> entries = ledgerEntryRepository.list(
                "createdAt >= ?1 AND createdAt < ?2", dayStart, dayEnd);

        int matched = 0;
        int unmatched = 0;

        // Build lookup: (reference, amount, currency) -> ledger entry
        Map<String, LedgerEntry> entryIndex = new HashMap<>();
        for (LedgerEntry entry : entries) {
            if (entry.reference != null) {
                entryIndex.put(entryKey(entry.reference, entry.amount, entry.currency), entry);
            }
        }

        for (ExternalStatement statement : statements) {
            List<StatementLine> lines = parseLines(statement.content);
            for (StatementLine line : lines) {
                String key = entryKey(line.reference(), line.amount(), line.currency());
                LedgerEntry matchedEntry = entryIndex.remove(key);
                if (matchedEntry != null) {
                    ReconciliationMatch match = new ReconciliationMatch();
                    match.reconciliationRun = run;
                    match.ledgerEntry = matchedEntry;
                    match.externalStatement = statement;
                    match.details = toJson(Map.of(
                            "reference", line.reference(),
                            "amount", line.amount().toPlainString(),
                            "currency", line.currency(),
                            "date", line.date().toString()
                    ));
                    matchRepository.persist(match);
                    matched++;
                } else {
                    createException(run, "UNMATCHED_STATEMENT_LINE", Map.of(
                            "statementId", statement.id,
                            "reference", line.reference(),
                            "amount", line.amount().toPlainString(),
                            "currency", line.currency(),
                            "date", line.date().toString()
                    ));
                    unmatched++;
                }
            }
            statement.status = "PROCESSED";
        }

        // Remaining ledger entries have no matching statement line
        for (LedgerEntry orphan : entryIndex.values()) {
            createException(run, "UNMATCHED_LEDGER_ENTRY", Map.of(
                    "ledgerEntryId", orphan.id,
                    "reference", orphan.reference != null ? orphan.reference : "",
                    "amount", orphan.amount.toPlainString(),
                    "currency", orphan.currency
            ));
            unmatched++;
        }

        run.summary = toJson(Map.of("matched", matched, "unmatched", unmatched));
        run.status = "COMPLETED";

        LOG.infof("Reconciliation run %d for %s: matched=%d unmatched=%d", run.id, date, matched, unmatched);
        return run;
    }

    public List<ReconciliationRunResponse> listRuns(int limit) {
        return runRepository.findRecent(limit).stream()
                .map(r -> new ReconciliationRunResponse(r.id, r.runDate, r.status, r.summary, r.createdAt))
                .toList();
    }

    public List<ReconciliationMatchResponse> listMatches(Long runId) {
        return matchRepository.findByRun(runId).stream()
                .map(m -> new ReconciliationMatchResponse(
                        m.id,
                        m.ledgerEntry != null ? m.ledgerEntry.id : null,
                        m.externalStatement != null ? m.externalStatement.id : null,
                        m.details))
                .toList();
    }

    public List<ReconciliationExceptionResponse> listExceptions(Long runId) {
        return exceptionRepository.findByRun(runId).stream()
                .map(e -> new ReconciliationExceptionResponse(e.id, e.type, e.payload, e.status, e.createdAt))
                .toList();
    }

    private void createException(ReconciliationRun run, String type, Map<String, Object> payload) {
        ReconciliationException ex = new ReconciliationException();
        ex.reconciliationRun = run;
        ex.type = type;
        ex.payload = toJson(payload);
        exceptionRepository.persist(ex);
    }

    private static String entryKey(String reference, BigDecimal amount, String currency) {
        return reference + "|" + amount.stripTrailingZeros().toPlainString() + "|" + currency;
    }

    private static List<StatementLine> parseLines(String content) {
        try {
            return MAPPER.readValue(content, new TypeReference<>() {});
        } catch (Exception e) {
            LOG.warnf("Failed to parse statement content: %s", e.getMessage());
            return List.of();
        }
    }

    private static String toJson(Object value) {
        try {
            return MAPPER.writeValueAsString(value);
        } catch (Exception e) {
            return "{}";
        }
    }
}
