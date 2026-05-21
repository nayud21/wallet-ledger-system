# 12 — TanStack Query Patterns in React

## What TanStack Query Is (and Isn't)

TanStack Query (React Query) is a **server-state manager** — not global client state (Redux), not form state (React Hook Form). It manages:
- **Caching** server responses
- **Background refetching** when data becomes stale
- **Invalidation** to trigger a refetch after a mutation
- **Request deduplication** — multiple components sharing the same `queryKey` produce a single network request

## Core Patterns in This Project

```ts
// Query (read)
export function useRecentRecipients(userId: string) {
    return useQuery({
        queryKey: ['recentRecipients', userId],  // cache key + its dependencies
        queryFn: () => fetchRecentRecipients(userId),
        enabled: !!userId,  // do not fetch until userId is available
    });
}

// Mutation (write) + invalidation
export function useTransfer() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (req: TransferRequest) => transferWallet(req),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['wallets'] });
            qc.invalidateQueries({ queryKey: ['recentRecipients'] }); // auto-refetch list
        },
    });
}
```

### Why Not `useEffect + fetch`?

```ts
// ❌ Anti-pattern
useEffect(() => {
    fetch('/api/v1/wallets/recent-recipients?userId=' + userId)
        .then(r => r.json())
        .then(setRecipients);
}, [userId]);

// ✅ TanStack Query
const { data: recipients } = useRecentRecipients(userId);
```

Problems with `useEffect + fetch`:
- **Race conditions** — if `userId` changes quickly, a stale response can overwrite a newer one
- **No cache** — a new request can fire on every render
- **Manual state management** — must track `isLoading`, `error`, `data` by hand
- **No post-mutation sync** — list stays stale after a transfer succeeds

## queryKey Design

`queryKey` is an array. Elements after the first act as dependencies (like `useEffect` deps):

```ts
['wallets']              // all wallets — broad scope
['wallets', userId]      // wallets for a specific user
['wallets', walletId]    // a single wallet (shares prefix with above — intentional)
['walletEntries', id]    // separate prefix → no conflict with wallets queries
['recentRecipients', userId]
```

`invalidateQueries({ queryKey: ['wallets'] })` invalidates **all** queries whose key starts with `['wallets']` — including `['wallets', userId]` and `['wallets', walletId]`.

## The `enabled` Flag

```ts
useQuery({
    queryKey: ['wallets', id],
    queryFn: () => fetchWallet(id!),
    enabled: !!id,  // guard against null/undefined id
});
```

Without `enabled`, the query fires immediately — even when `id` is `null` — producing a request to `/api/v1/wallets/null`.

## Stale-While-Revalidate

TanStack Query serves cached data instantly (no loading flash), then silently refetches in the background. This is different from "wait for the fetch, then render."

Invalidation does **not** clear the cache immediately — it marks the entry as stale and schedules a background refetch. Components continue to see the old data until the new response arrives.
