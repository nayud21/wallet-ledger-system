package com.walletledger.exception;

import java.util.UUID;

public class WalletNotActiveException extends RuntimeException {
    public WalletNotActiveException(UUID walletId, String status) {
        super("Wallet " + walletId + " is not active (status=" + status + ")");
    }
}
