package com.walletledger.shared.exception;

public class AlreadyReversedException extends RuntimeException {
    public AlreadyReversedException(Long txId) {
        super("Transaction " + txId + " is itself a reversal and cannot be reversed again");
    }
}
