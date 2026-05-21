package com.walletledger.shared.exception;

public class CurrencyMismatchException extends RuntimeException {
    public CurrencyMismatchException(String expected, String actual) {
        super("Currency mismatch: expected " + expected + ", got " + actual);
    }
}
