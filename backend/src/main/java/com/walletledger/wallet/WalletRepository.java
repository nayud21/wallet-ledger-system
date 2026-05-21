package com.walletledger.wallet;

import com.walletledger.wallet.dto.RecentRecipientResponse;
import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import lombok.RequiredArgsConstructor;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
@RequiredArgsConstructor
public class WalletRepository implements PanacheRepositoryBase<Wallet, UUID> {

    private final EntityManager em;

    private static final String RECENT_RECIPIENTS_SQL = """
        SELECT to_w.id, u.username, to_w.currency
        FROM ledger_entries debit_e
        JOIN ledger_transactions lt  ON lt.id = debit_e.ledger_tx_id
        JOIN ledger_entries credit_e ON credit_e.ledger_tx_id = lt.id
                                    AND credit_e.direction = 'CREDIT'
        JOIN wallets from_w ON from_w.ledger_account_id = debit_e.ledger_account_id
        JOIN wallets to_w   ON to_w.ledger_account_id   = credit_e.ledger_account_id
        JOIN users u        ON u.id = to_w.user_id
        WHERE from_w.user_id = :userId
          AND debit_e.direction = 'DEBIT'
          AND lt.description LIKE 'TRANSFER:%'
          AND to_w.user_id != :userId
        GROUP BY to_w.id, u.username, to_w.currency
        ORDER BY MAX(debit_e.created_at) DESC
        LIMIT :limit
        """;

    @SuppressWarnings("unchecked")
    public List<RecentRecipientResponse> findRecentRecipients(UUID userId, int limit) {
        return em.createNativeQuery(RECENT_RECIPIENTS_SQL)
            .setParameter("userId", userId)
            .setParameter("limit", limit)
            .getResultList()
            .stream()
            .map(row -> {
                Object[] r = (Object[]) row;
                return new RecentRecipientResponse(
                    UUID.fromString(r[0].toString()),
                    (String) r[1],
                    (String) r[2]
                );
            })
            .toList();
    }

    public Optional<Wallet> findByIdForUpdate(UUID id) {
        return find("id", id).withLock(LockModeType.PESSIMISTIC_WRITE).firstResultOptional();
    }

    public Optional<Wallet> findByLedgerAccountId(Long ledgerAccountId) {
        return find("ledgerAccountId", ledgerAccountId).firstResultOptional();
    }

    public List<Wallet> findByUserId(UUID userId) {
        return list("userId", userId);
    }
}
