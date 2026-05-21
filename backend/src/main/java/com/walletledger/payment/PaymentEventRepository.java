package com.walletledger.payment;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class PaymentEventRepository implements PanacheRepository<PaymentEvent> {

    public List<PaymentEvent> findPending() {
        return list("status", "PENDING");
    }

    public boolean existsByProviderAndExternalRef(String provider, String externalRef) {
        return count("provider = ?1 and externalRef = ?2", provider, externalRef) > 0;
    }
}
