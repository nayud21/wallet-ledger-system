package com.walletledger.wallet;

import com.walletledger.auth.CurrentUser;
import com.walletledger.ledger.LedgerEntryRepository;
import com.walletledger.ledger.dto.LedgerEntryResponse;
import com.walletledger.wallet.dto.*;
import com.walletledger.wallet.event.WalletEventBus;
import io.smallrye.common.annotation.Blocking;
import io.smallrye.mutiny.Multi;
import jakarta.annotation.security.RolesAllowed;
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
    private final CurrentUser currentUser;

    @GET
    @RolesAllowed("ADMIN")
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
    @RolesAllowed("ADMIN")
    public WalletStatsResponse stats() {
        return walletService.getStats();
    }

    @POST
    @RolesAllowed({"USER", "ADMIN"})
    public Response create(@Valid CreateWalletRequest req) {
        WalletResponse result = walletService.createWallet(req);
        return Response.status(Response.Status.CREATED).entity(result).build();
    }

    @GET
    @Path("/me")
    @RolesAllowed("USER")
    public List<WalletResponse> myWallets() {
        return walletRepo.findByUserId(currentUser.id()).stream().map(WalletResponse::from).toList();
    }

    @GET
    @Path("/me/transactions")
    @RolesAllowed("USER")
    public List<LedgerEntryResponse> myTransactions(@QueryParam("page") @DefaultValue("0") int page,
                                                    @QueryParam("size") @DefaultValue("20") int size) {
        return ledgerEntryRepo.findByUserId(currentUser.id(), page, Math.min(size, 100))
            .stream().map(LedgerEntryResponse::from).toList();
    }

    @GET
    @Path("/{id}")
    @RolesAllowed({"USER", "ADMIN"})
    public WalletResponse get(@PathParam("id") UUID id) {
        Wallet wallet = walletRepo.findByIdOptional(id)
            .orElseThrow(() -> new NotFoundException("Wallet not found: " + id));
        walletService.assertOwnership(wallet);
        return WalletResponse.from(wallet);
    }

    @POST
    @Path("/top-up")
    @RolesAllowed({"USER", "ADMIN"})
    public WalletResponse topUp(@Valid TopUpRequest req) {
        return walletService.topUp(req);
    }

    @POST
    @Path("/transfer")
    @RolesAllowed({"USER", "ADMIN"})
    public TransferResponse transfer(@Valid TransferRequest req) {
        return walletService.transfer(req);
    }

    @GET
    @Path("/{id}/entries")
    @RolesAllowed({"USER", "ADMIN"})
    public List<LedgerEntryResponse> getEntries(@PathParam("id") UUID id) {
        Wallet wallet = walletRepo.findByIdOptional(id)
            .orElseThrow(() -> new NotFoundException("Wallet not found: " + id));
        walletService.assertOwnership(wallet);
        if (wallet.ledgerAccountId == null) {
            return List.of();
        }
        return ledgerEntryRepo.findByLedgerAccountId(wallet.ledgerAccountId)
            .stream().map(LedgerEntryResponse::from).toList();
    }

    @POST
    @Path("/{id}/freeze")
    @RolesAllowed("ADMIN")
    @Transactional
    public WalletResponse freeze(@PathParam("id") UUID id) {
        return walletService.freeze(id);
    }

    @POST
    @Path("/{id}/unfreeze")
    @RolesAllowed("ADMIN")
    @Transactional
    public WalletResponse unfreeze(@PathParam("id") UUID id) {
        return walletService.unfreeze(id);
    }

    @GET
    @Path("/recent-recipients")
    @RolesAllowed({"USER", "ADMIN"})
    public List<RecentRecipientResponse> recentRecipients(@QueryParam("limit") @DefaultValue("5") int limit) {
        return walletRepo.findRecentRecipients(currentUser.id(), Math.min(limit, 10));
    }

    @GET
    @Path("/{id}/stream")
    @RolesAllowed({"USER", "ADMIN"})
    @Blocking
    @Produces(MediaType.SERVER_SENT_EVENTS)
    @RestStreamElementType(MediaType.APPLICATION_JSON)
    public Multi<String> stream(@PathParam("id") UUID id) {
        Wallet wallet = walletRepo.findByIdOptional(id)
            .orElseThrow(() -> new NotFoundException("Wallet not found: " + id));
        walletService.assertOwnership(wallet);
        return walletEventBus.subscribe(id);
    }
}
