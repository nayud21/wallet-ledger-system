package com.walletledger.payment;

import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.jboss.logging.Logger;

import java.util.List;

@ApplicationScoped
@RequiredArgsConstructor
public class PaymentEventProcessor {

    private static final Logger LOG = Logger.getLogger(PaymentEventProcessor.class);

    private final PaymentEventRepository repository;

    @Scheduled(every = "30s", identity = "payment-event-processor")
    @Transactional
    public void processEvents() {
        List<PaymentEvent> pending = repository.findPending();
        if (pending.isEmpty()) return;

        LOG.infof("Processing %d pending payment event(s)", pending.size());
        for (PaymentEvent event : pending) {
            try {
                process(event);
                event.status = "PROCESSED";
            } catch (Exception e) {
                LOG.errorf("Failed to process payment event id=%d provider=%s externalRef=%s: %s",
                        event.id, event.provider, event.externalRef, e.getMessage());
                event.status = "FAILED";
            }
        }
    }

    private void process(PaymentEvent event) {
        // Extension point: route by event.provider or payload type to dedicated handlers.
        LOG.debugf("Processed payment event id=%d provider=%s externalRef=%s",
                event.id, event.provider, event.externalRef);
    }
}
