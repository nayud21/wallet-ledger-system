package com.walletledger.wallet.event;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import lombok.RequiredArgsConstructor;
import org.eclipse.microprofile.reactive.messaging.Incoming;
import org.jboss.logging.Logger;

/**
 * Consumes the wallet-events topic and hands each message to the in-JVM SSE fan-out.
 * Every app instance runs this consumer under its own group.id (broadcast), so an SSE client
 * connected to any instance receives every wallet's events. At-least-once delivery means a
 * message may arrive more than once; for cosmetic SSE pings a duplicate is harmless.
 */
@ApplicationScoped
@RequiredArgsConstructor
public class WalletEventConsumer {

    private static final Logger LOG = Logger.getLogger(WalletEventConsumer.class);

    private final ObjectMapper mapper;
    private final WalletEventBus bus;

    @Incoming("wallet-events-in")
    public void consume(String json) {
        try {
            WalletEvent event = mapper.readValue(json, WalletEvent.class);
            bus.fanOut(event.walletId(), json);
        } catch (Exception e) {
            LOG.errorf("Failed to fan out wallet event: %s", e.getMessage());
        }
    }
}
