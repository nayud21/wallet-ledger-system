package com.walletledger.payment.dto;

import com.walletledger.payment.PaymentEvent;

import java.time.Instant;

public record PaymentEventResponse(
        Long id,
        String provider,
        String externalRef,
        String status,
        Instant createdAt
) {
    public static PaymentEventResponse from(PaymentEvent e) {
        return new PaymentEventResponse(e.id, e.provider, e.externalRef, e.status, e.createdAt);
    }
}
