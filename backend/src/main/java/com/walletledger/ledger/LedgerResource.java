package com.walletledger.ledger;

import com.walletledger.ledger.dto.LedgerTransactionResponse;
import com.walletledger.ledger.dto.ReversalRequest;
import com.walletledger.shared.PageResponse;
import io.quarkus.panache.common.Page;
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
    private final LedgerTransactionRepository ledgerTxRepo;

    @GET
    @Path("/transactions")
    public PageResponse<LedgerTransactionResponse> listTransactions(
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("20") int size) {
        var query = ledgerTxRepo.findAll();
        long total = query.count();
        var data = query.page(Page.of(page, size)).list()
            .stream().map(LedgerTransactionResponse::from).toList();
        return new PageResponse<>(data, total, page, size);
    }

    @POST
    @Path("/reversal")
    public LedgerTransactionResponse reverse(@Valid ReversalRequest req) {
        return ledgerService.reverse(req);
    }
}
