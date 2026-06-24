package com.walletledger.wallet.event;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.smallrye.reactive.messaging.kafka.Record;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.enterprise.event.TransactionPhase;
import org.eclipse.microprofile.reactive.messaging.Channel;
import org.eclipse.microprofile.reactive.messaging.Emitter;
import org.jboss.logging.Logger;

/**
 * Publishes {@link WalletEvent}s to Kafka. Observes the CDI event AFTER_SUCCESS so a rolled-back
 * transaction never emits — but note this is still a post-commit publish (the dual-write gap):
 * a crash in this window drops the notification. Acceptable because these are SSE notifications,
 * not authoritative money events (those move to the Transactional Outbox in F2).
 *
 * Keyed by walletId so all events for one wallet land on one partition and stay ordered.
 */
@ApplicationScoped
public class WalletEventProducer {

    private static final Logger LOG = Logger.getLogger(WalletEventProducer.class);

    private final ObjectMapper mapper;
    private final Emitter<Record<String, String>> emitter;

    // Constructor injection per project rules; @Channel qualifies the Emitter parameter
    // (this is SmallRye messaging injection, not a field @Inject).
    public WalletEventProducer(ObjectMapper mapper,
                               @Channel("wallet-events-out") Emitter<Record<String, String>> emitter) {
        this.mapper = mapper;
        this.emitter = emitter;
    }

    void onWalletEvent(@Observes(during = TransactionPhase.AFTER_SUCCESS) WalletEvent event) {
        try {
            String json = mapper.writeValueAsString(event);
            emitter.send(Record.of(event.walletId().toString(), json));
        } catch (Exception e) {
            LOG.errorf("Failed to publish wallet event for wallet %s: %s", event.walletId(), e.getMessage());
        }
    }
}
