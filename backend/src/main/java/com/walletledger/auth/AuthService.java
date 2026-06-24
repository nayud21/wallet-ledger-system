package com.walletledger.auth;

import com.walletledger.auth.dto.LoginRequest;
import com.walletledger.auth.dto.RegisterRequest;
import com.walletledger.auth.dto.TokenResponse;
import com.walletledger.user.User;
import com.walletledger.user.UserRepository;
import io.smallrye.jwt.build.Jwt;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.ClientErrorException;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.NotAuthorizedException;
import lombok.RequiredArgsConstructor;

import java.time.Duration;
import java.time.Instant;
import java.util.Set;

@ApplicationScoped
@RequiredArgsConstructor
public class AuthService {

    private static final long TOKEN_TTL_SECONDS = 3600;
    private static final String ISSUER = "wallet-ledger";
    // Same message for unknown user and wrong password — avoid user enumeration.
    private static final String INVALID_CREDENTIALS = "Invalid credentials";

    private final UserRepository userRepo;
    private final PasswordHasher passwordHasher;

    @Transactional
    public TokenResponse register(RegisterRequest req) {
        if (userRepo.existsByUsernameOrEmail(req.username(), req.email())) {
            throw new ClientErrorException("Username or email already in use", 409);
        }
        User user = new User();
        user.username = req.username();
        user.email = req.email();
        user.passwordHash = passwordHasher.hash(req.password());
        user.role = "USER";
        user.status = "ACTIVE";
        userRepo.persist(user);
        return issueToken(user);
    }

    @Transactional
    public TokenResponse login(LoginRequest req) {
        User user = userRepo.findByUsernameOrEmail(req.usernameOrEmail()).orElse(null);
        if (user == null || !passwordHasher.matches(req.password(), user.passwordHash)) {
            throw new NotAuthorizedException(INVALID_CREDENTIALS, "Bearer");
        }
        if (!"ACTIVE".equals(user.status)) {
            throw new ForbiddenException("Account is " + user.status.toLowerCase());
        }
        user.lastLoginAt = Instant.now();
        return issueToken(user);
    }

    private TokenResponse issueToken(User user) {
        String token = Jwt.issuer(ISSUER)
            .subject(user.id.toString())
            .upn(user.username)
            .groups(Set.of(user.role))
            .claim("email", user.email)
            .expiresIn(Duration.ofSeconds(TOKEN_TTL_SECONDS))
            .sign();
        return TokenResponse.bearer(token, TOKEN_TTL_SECONDS);
    }
}
