package com.walletledger.wallet.event;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.enterprise.event.Event;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Phase F1: verifies WalletEvents fired by the domain reach Kafka keyed by walletId and are
 * observed in per-wallet order. Quarkus Dev Services supplies a real Kafka broker (Testcontainers).
 */
@QuarkusTest
class WalletEventStreamTest {

    @Inject
    Event<WalletEvent> events;

    @Inject
    TestWalletEventCollector collector;

    @Inject
    ObjectMapper mapper;

    @Test
    void eventsForOneWalletAreKeyedAndObservedInOrder() throws Exception {
        UUID walletId = UUID.randomUUID();
        int n = 50;
        for (int i = 0; i < n; i++) {
            events.fire(new WalletEvent(walletId, "CREDIT", new BigDecimal(i), "USD", "SEQ"));
        }

        List<TestWalletEventCollector.Captured> mine = awaitFor(walletId, n);
        assertEquals(n, mine.size(), "all events for the wallet should be observed");

        // Every message is keyed by walletId → same partition → ordering guaranteed.
        assertTrue(mine.stream().allMatch(c -> walletId.toString().equals(c.key())),
            "every message must be keyed by walletId");

        // Sequential fire order is preserved end-to-end (amount carries the sequence).
        for (int i = 0; i < n; i++) {
            assertEquals(new BigDecimal(i), amountOf(mine.get(i)));
        }
    }

    @Test
    void concurrentEventsForOneWalletArriveWithoutLossAndKeepPerThreadOrder() throws Exception {
        UUID walletId = UUID.randomUUID();
        int threads = 4;
        int perThread = 25;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        for (int t = 0; t < threads; t++) {
            final int threadId = t;
            pool.submit(() -> {
                await(start);
                for (int i = 0; i < perThread; i++) {
                    events.fire(new WalletEvent(walletId, "CREDIT", new BigDecimal(i), "USD", "T" + threadId));
                }
            });
        }
        start.countDown();
        pool.shutdown();
        assertTrue(pool.awaitTermination(30, TimeUnit.SECONDS));

        List<TestWalletEventCollector.Captured> mine = awaitFor(walletId, threads * perThread);
        assertEquals(threads * perThread, mine.size(), "no events lost across concurrent producers");
        assertTrue(mine.stream().allMatch(c -> walletId.toString().equals(c.key())));

        // Same key → one partition → each producer thread's events stay in the order it sent them.
        for (int t = 0; t < threads; t++) {
            final int threadId = t;
            List<BigDecimal> seq = mine.stream()
                .filter(c -> descriptionOf(c).equals("T" + threadId))
                .map(this::amountOf)
                .toList();
            assertEquals(perThread, seq.size());
            for (int i = 0; i < perThread; i++) {
                assertEquals(new BigDecimal(i), seq.get(i), "per-thread order must be preserved");
            }
        }
    }

    private List<TestWalletEventCollector.Captured> awaitFor(UUID walletId, int expected) throws Exception {
        long deadline = System.currentTimeMillis() + 30_000;
        List<TestWalletEventCollector.Captured> mine;
        do {
            mine = collector.snapshot().stream()
                .filter(c -> walletId.toString().equals(c.key()))
                .toList();
            if (mine.size() >= expected) return mine;
            Thread.sleep(100);
        } while (System.currentTimeMillis() < deadline);
        return mine;
    }

    private BigDecimal amountOf(TestWalletEventCollector.Captured c) {
        return parse(c).amount();
    }

    private String descriptionOf(TestWalletEventCollector.Captured c) {
        return parse(c).description();
    }

    private WalletEvent parse(TestWalletEventCollector.Captured c) {
        try {
            return mapper.readValue(c.value(), WalletEvent.class);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private void await(CountDownLatch latch) {
        try {
            latch.await();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
