package com.walletledger.wallet.event;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.smallrye.mutiny.Multi;
import io.smallrye.mutiny.subscription.MultiEmitter;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.enterprise.event.TransactionPhase;
import lombok.RequiredArgsConstructor;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@ApplicationScoped
@RequiredArgsConstructor
public class WalletEventBus {

    private final ObjectMapper mapper;
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

    // Fires only after the transaction commits — no phantom events on rollback
    void onWalletEvent(@Observes(during = TransactionPhase.AFTER_SUCCESS) WalletEvent event) {
        List<MultiEmitter<? super String>> list = emitters.get(event.walletId());
        if (list == null || list.isEmpty()) return;
        try {
            String json = mapper.writeValueAsString(event);
            list.forEach(e -> {
                try { e.emit(json); } catch (Exception ignored) {}
            });
        } catch (Exception ignored) {}
    }
}
