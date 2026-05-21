package com.walletledger.wallet;

import com.walletledger.ledger.LedgerEntryRepository;
import com.walletledger.ledger.dto.LedgerEntryResponse;
import com.walletledger.wallet.dto.*;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import lombok.RequiredArgsConstructor;
import java.util.List;
import java.util.UUID;

@Path("/api/v1/wallets")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RequiredArgsConstructor
public class WalletResource {

    private final WalletService walletService;
    private final WalletRepository walletRepo;
    private final LedgerEntryRepository ledgerEntryRepo;

    @GET
    public List<WalletResponse> list(@QueryParam("userId") UUID userId) {
        if (userId != null) {
            return walletRepo.findByUserId(userId).stream().map(WalletResponse::from).toList();
        }
        return walletRepo.listAll().stream().map(WalletResponse::from).toList();
    }

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
    public WalletResponse topUp(@Valid TopUpRequest req,
                                @HeaderParam("X-User-Id") UUID callerId) {
        assertOwner(req.walletId(), callerId);
        return walletService.topUp(req);
    }

    @POST
    @Path("/transfer")
    public TransferResponse transfer(@Valid TransferRequest req,
                                     @HeaderParam("X-User-Id") UUID callerId) {
        assertOwner(req.fromWalletId(), callerId);
        return walletService.transfer(req);
    }

    @GET
    @Path("/{id}/entries")
    public List<LedgerEntryResponse> getEntries(@PathParam("id") UUID id) {
        Wallet wallet = walletRepo.findByIdOptional(id)
            .orElseThrow(() -> new NotFoundException("Wallet not found: " + id));
        if (wallet.ledgerAccountId == null) {
            return List.of();
        }
        return ledgerEntryRepo.findByLedgerAccountId(wallet.ledgerAccountId)
            .stream().map(LedgerEntryResponse::from).toList();
    }

    private void assertOwner(UUID walletId, UUID callerId) {
        if (callerId == null) return; // header absent → unauthenticated; defer to future auth layer
        Wallet wallet = walletRepo.findByIdOptional(walletId)
            .orElseThrow(() -> new NotFoundException("Wallet not found: " + walletId));
        if (!callerId.equals(wallet.userId)) {
            throw new ForbiddenException("Wallet does not belong to caller");
        }
    }
}
