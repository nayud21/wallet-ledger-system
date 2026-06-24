package com.walletledger.wallet.event;

import io.smallrye.reactive.messaging.kafka.api.IncomingKafkaRecordMetadata;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.reactive.messaging.Incoming;
import org.eclipse.microprofile.reactive.messaging.Message;

import java.util.List;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.CopyOnWriteArrayList;

/** Test-only consumer that records every message published to the wallet-events topic. */
@ApplicationScoped
public class TestWalletEventCollector {

    public record Captured(String key, String value) {}

    private final List<Captured> received = new CopyOnWriteArrayList<>();

    @Incoming("wallet-events-test-in")
    public CompletionStage<Void> collect(Message<String> msg) {
        String key = msg.getMetadata(IncomingKafkaRecordMetadata.class)
            .map(m -> (String) m.getKey())
            .orElse(null);
        received.add(new Captured(key, msg.getPayload()));
        return msg.ack();
    }

    public List<Captured> snapshot() {
        return List.copyOf(received);
    }
}
