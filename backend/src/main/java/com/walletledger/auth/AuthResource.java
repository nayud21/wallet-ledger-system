package com.walletledger.auth;

import com.walletledger.auth.dto.LoginRequest;
import com.walletledger.auth.dto.MeResponse;
import com.walletledger.auth.dto.RegisterRequest;
import com.walletledger.auth.dto.TokenResponse;
import io.vertx.core.http.HttpServerRequest;
import jakarta.annotation.security.PermitAll;
import jakarta.annotation.security.RolesAllowed;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import lombok.RequiredArgsConstructor;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.UUID;

@Path("/api/v1/auth")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RequiredArgsConstructor
public class AuthResource {

    private final AuthService authService;
    private final LoginRateLimiter rateLimiter;
    private final JsonWebToken jwt;

    @POST
    @Path("/register")
    @PermitAll
    public Response register(@Valid RegisterRequest req) {
        return Response.status(Response.Status.CREATED).entity(authService.register(req)).build();
    }

    @POST
    @Path("/login")
    @PermitAll
    public TokenResponse login(@Valid LoginRequest req,
                               @HeaderParam("X-Forwarded-For") String xff,
                               @Context HttpServerRequest request) {
        String ip = clientIp(xff, request);
        rateLimiter.check(ip);
        TokenResponse token = authService.login(req);
        rateLimiter.reset(ip);
        return token;
    }

    @GET
    @Path("/me")
    @RolesAllowed({"USER", "ADMIN"})
    public MeResponse me() {
        return new MeResponse(
            UUID.fromString(jwt.getSubject()),
            jwt.getName(),
            jwt.getClaim("email"),
            jwt.getGroups().stream().findFirst().orElse("USER")
        );
    }

    private static String clientIp(String xff, HttpServerRequest request) {
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return request.remoteAddress() != null ? request.remoteAddress().host() : "unknown";
    }
}
