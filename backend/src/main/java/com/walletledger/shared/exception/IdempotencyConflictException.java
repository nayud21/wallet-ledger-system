package com.walletledger.shared.exception;

public class IdempotencyConflictException extends RuntimeException {
    public IdempotencyConflictException(String idempotencyKey) {
        super("Idempotency key already used with different parameters: " + idempotencyKey);
    }
}
