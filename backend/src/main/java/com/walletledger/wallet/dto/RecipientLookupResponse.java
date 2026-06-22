package com.walletledger.wallet.dto;

import com.walletledger.wallet.Wallet;

import java.util.UUID;

/** Minimal recipient info for the send flow — deliberately omits balance and owner. */
public record RecipientLookupResponse(UUID id, String currency, String status) {

    public static RecipientLookupResponse from(Wallet w) {
        return new RecipientLookupResponse(w.id, w.currency, w.status);
    }
}
