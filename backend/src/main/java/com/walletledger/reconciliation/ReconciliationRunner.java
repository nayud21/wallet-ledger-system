package com.walletledger.reconciliation;

import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import lombok.RequiredArgsConstructor;
import org.jboss.logging.Logger;

import java.time.LocalDate;

@ApplicationScoped
@RequiredArgsConstructor
public class ReconciliationRunner {

    private static final Logger LOG = Logger.getLogger(ReconciliationRunner.class);

    private final ReconciliationService reconciliationService;

    // Runs daily at 02:00 UTC to reconcile the previous day's entries
    @Scheduled(cron = "0 0 2 * * ?", identity = "reconciliation-runner")
    public void runDaily() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        LOG.infof("Starting scheduled reconciliation for %s", yesterday);
        try {
            ReconciliationRun run = reconciliationService.runForDate(yesterday);
            LOG.infof("Reconciliation completed: runId=%d status=%s summary=%s",
                    run.id, run.status, run.summary);
        } catch (Exception e) {
            LOG.errorf("Reconciliation failed for %s: %s", yesterday, e.getMessage());
        }
    }
}
