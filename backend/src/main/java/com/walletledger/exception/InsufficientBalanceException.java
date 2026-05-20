package com.walletledger.exception;

public class InsufficientBalanceException extends RuntimeException {
    public InsufficientBalanceException(String currency, java.math.BigDecimal available, java.math.BigDecimal requested) {
        super("Insufficient balance: available " + available + " " + currency + ", requested " + requested);
    }
}
