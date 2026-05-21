# 11 — Server-Sent Events (SSE) with Quarkus Reactive

## Why SSE over Polling or WebSocket?

| | Polling | **SSE** | WebSocket |
|---|---|---|---|
| Direction | Client pull | **Server push** | Bidirectional |
| Protocol | HTTP | **HTTP/1.1 EventStream** | ws:// upgrade |
| Quarkus support | Native | **Native via Mutiny Multi** | Requires extra lib |
| Best for | Simple, infrequent checks | **One-way notifications** | Chat, real-time games |

For the "notify on incoming transfer" use case, SSE is the right choice: one-way server push over plain HTTP, no extra protocol overhead.

## Quarkus REST (Reactive) Pattern

```java
@GET
@Path("/{id}/stream")
@Produces(MediaType.SERVER_SENT_EVENTS)
@RestStreamElementType(MediaType.APPLICATION_JSON)
public Multi<String> stream(@PathParam("id") UUID id) {
    return walletEventBus.subscribe(id); // no blocking DB call here
}
```

**Critical constraint:** this method runs on the Vert.x IO thread. It must only return the `Multi` (a lazy stream descriptor) and do nothing else. Any blocking JDBC call inside triggers `BlockingNotAllowedException` and eventually worker thread exhaustion (503s).

## WalletEventBus — CDI Event Bus Pattern

```java
@ApplicationScoped
public class WalletEventBus {
    private final Map<UUID, List<MultiEmitter<? super String>>> emitters = new ConcurrentHashMap<>();

    public Multi<String> subscribe(UUID walletId) {
        return Multi.createFrom().emitter(emitter -> {
            emitters.computeIfAbsent(walletId, k -> new CopyOnWriteArrayList<>()).add(emitter);
            emitter.onTermination(() -> /* remove emitter */);
        });
    }

    // Fires only after the transaction commits successfully
    void onWalletEvent(@Observes(during = TransactionPhase.AFTER_SUCCESS) WalletEvent event) {
        // serialize to JSON + emit to all subscribers of event.walletId()
    }
}
```

### Why `AFTER_SUCCESS` matters

CDI transaction observer phases: `IN_PROGRESS`, `BEFORE_COMPLETION`, **`AFTER_SUCCESS`**, `AFTER_FAILURE`, `AFTER_COMPLETION`.

- `AFTER_SUCCESS` — fires only after a successful commit → no phantom events when the TX rolls back
- `IN_PROGRESS` — fires even if the TX later fails → the client would see "you received money" for a transfer that was never persisted

### CopyOnWriteArrayList vs ArrayList

The emitters list is read/written from multiple threads simultaneously (Vert.x IO thread for reads, CDI observer thread for writes). `CopyOnWriteArrayList` is the correct thread-safe choice when reads heavily outnumber writes.

## Frontend — useWalletStream Hook

```ts
export function useWalletStream(walletIds: string[]) {
    const toast = useToast();
    const qc = useQueryClient();

    useEffect(() => {
        const sources = walletIds.map(id => {
            const es = new EventSource(`/api/v1/wallets/${id}/stream`);
            es.onmessage = (e) => {
                const event = JSON.parse(e.data);
                if (event.type === 'CREDIT') {
                    toast.push({ kind: 'success', title: 'Transfer received', subtitle: `+${event.amount} ${event.currency}` });
                    qc.invalidateQueries({ queryKey: ['wallets'] });
                }
            };
            return es;
        });
        return () => sources.forEach(s => s.close());
    }, [walletIds.join(',')]);
}
```

Mounted inside `ConsumerLayout` so SSE connections are active across all consumer pages and cleaned up automatically on unmount.

## Common Errors

| Error | Cause | Fix |
|---|---|---|
| `BlockingNotAllowedException` | JDBC call inside SSE endpoint (IO thread) | Remove all DB calls from `stream()` |
| `503 Worker thread exhaustion` | Each SSE connection holds a worker thread | Use reactive pattern — do not annotate with `@Blocking` |
| Phantom notification | CDI observer using `IN_PROGRESS` | Switch to `AFTER_SUCCESS` |
