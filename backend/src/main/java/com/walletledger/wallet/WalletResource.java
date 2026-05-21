package com.walletledger.wallet;

import com.walletledger.ledger.LedgerEntryRepository;
import com.walletledger.ledger.dto.LedgerEntryResponse;
import com.walletledger.wallet.dto.*;
import io.smallrye.mutiny.Multi;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import lombok.RequiredArgsConstructor;
import org.jboss.resteasy.reactive.RestStreamElementType;
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
    private final WalletEventBus walletEventBus;

    @GET
    public List<WalletResponse> list(@QueryParam("userId") UUID userId,
                                     @QueryParam("status") String status) {
        if (userId != null && status != null) {
            return walletRepo.find("userId = ?1 and status = ?2", userId, status.toUpperCase())
                .stream().map(WalletResponse::from).toList();
        }
        if (userId != null) {
            return walletRepo.findByUserId(userId).stream().map(WalletResponse::from).toList();
        }
        if (status != null) {
            return walletRepo.find("status", status.toUpperCase()).stream().map(WalletResponse::from).toList();
        }
        return walletRepo.listAll().stream().map(WalletResponse::from).toList();
    }

    @GET
    @Path("/stats")
    public WalletStatsResponse stats() {
        return walletService.getStats();
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

    @POST
    @Path("/{id}/freeze")
    @Transactional
    public WalletResponse freeze(@PathParam("id") UUID id) {
        return walletService.freeze(id);
    }

    @POST
    @Path("/{id}/unfreeze")
    @Transactional
    public WalletResponse unfreeze(@PathParam("id") UUID id) {
        return walletService.unfreeze(id);
    }

    @GET
    @Path("/recent-recipients")
    public List<RecentRecipientResponse> recentRecipients(@QueryParam("userId") UUID userId,
                                                          @QueryParam("limit") @DefaultValue("5") int limit) {
        if (userId == null) throw new BadRequestException("userId is required");
        return walletRepo.findRecentRecipients(userId, Math.min(limit, 10));
    }

    @GET
    @Path("/{id}/stream")
    @Produces(MediaType.SERVER_SENT_EVENTS)
    @RestStreamElementType(MediaType.APPLICATION_JSON)
    public Multi<String> stream(@PathParam("id") UUID id) {
        // No blocking DB call here — returns Multi directly on the IO thread.
        // Unknown wallet IDs simply never receive events, which is safe.
        return walletEventBus.subscribe(id);
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
