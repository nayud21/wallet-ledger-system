package com.walletledger.api;

import com.walletledger.dto.*;
import com.walletledger.repository.WalletRepository;
import com.walletledger.service.WalletService;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import lombok.RequiredArgsConstructor;
import java.util.UUID;

@Path("/api/v1/wallets")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RequiredArgsConstructor
public class WalletResource {

    private final WalletService walletService;
    private final WalletRepository walletRepo;

    @POST
    public Response create(@Valid CreateWalletRequest req) {
        WalletResponse result = walletService.createWallet(req);
        return Response.status(Response.Status.CREATED).entity(result).build();
    }

    @GET
    @Path("/{id}")
    public WalletResponse get(@PathParam("id") UUID id) {
        return walletRepo.findByIdOptional(id)
            .map(WalletResponse::from)
            .orElseThrow(() -> new NotFoundException("Wallet not found: " + id));
    }

    @POST
    @Path("/top-up")
    public WalletResponse topUp(@Valid TopUpRequest req) {
        return walletService.topUp(req);
    }

    @POST
    @Path("/transfer")
    public TransferResponse transfer(@Valid TransferRequest req) {
        return walletService.transfer(req);
    }
}
