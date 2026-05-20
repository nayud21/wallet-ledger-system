package com.walletledger.api;

import com.walletledger.dto.LedgerTransactionResponse;
import com.walletledger.dto.ReversalRequest;
import com.walletledger.service.LedgerService;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import lombok.RequiredArgsConstructor;

@Path("/api/v1/ledger")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RequiredArgsConstructor
public class LedgerResource {

    private final LedgerService ledgerService;

    @POST
    @Path("/reversal")
    public LedgerTransactionResponse reverse(@Valid ReversalRequest req) {
        return ledgerService.reverse(req);
    }
}
