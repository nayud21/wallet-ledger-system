package com.walletledger.wallet.event;

import io.smallrye.mutiny.Multi;
import io.smallrye.mutiny.subscription.MultiEmitter;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Pure in-JVM SSE fan-out. It no longer observes WalletEvents directly — the Kafka consumer
 * ({@link WalletEventConsumer}) is now the event source and calls {@link #fanOut}. This keeps the
 * SSE delivery in-process while the event transport became Kafka.
 */
@ApplicationScoped
public class WalletEventBus {

    private final Map<UUID, List<MultiEmitter<? super String>>> emitters = new ConcurrentHashMap<>();

    public Multi<String> subscribe(UUID walletId) {
        return Multi.createFrom().emitter(emitter -> {
            emitters.computeIfAbsent(walletId, k -> new CopyOnWriteArrayList<>()).add(emitter);
            emitter.onTermination(() -> {
                List<MultiEmitter<? super String>> list = emitters.get(walletId);
                if (list != null) list.remove(emitter);
            });
        });
    }

    /** Push an already-serialized event JSON to every SSE subscriber of this wallet on this node. */
    public void fanOut(UUID walletId, String json) {
        List<MultiEmitter<? super String>> list = emitters.get(walletId);
        if (list == null || list.isEmpty()) return;
        list.forEach(e -> {
            try { e.emit(json); } catch (Exception ignored) {}
        });
    }
}
