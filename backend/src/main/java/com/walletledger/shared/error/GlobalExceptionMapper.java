package com.walletledger.shared.error;

import com.walletledger.shared.exception.*;
import jakarta.validation.ConstraintViolationException;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

import java.util.Map;

@Provider
public class GlobalExceptionMapper implements ExceptionMapper<Throwable> {

    private static final String PROBLEM_JSON = "application/problem+json";

    private record ErrorDef(int status, String title) {}

    private static final Map<Class<? extends Throwable>, ErrorDef> ERRORS = Map.of(
        InsufficientBalanceException.class, new ErrorDef(422, "Insufficient Balance"),
        CurrencyMismatchException.class,    new ErrorDef(422, "Currency Mismatch"),
        WalletNotActiveException.class,     new ErrorDef(422, "Wallet Not Active"),
        IdempotencyConflictException.class, new ErrorDef(409, "Idempotency Conflict"),
        AlreadyReversedException.class,     new ErrorDef(422, "Already Reversed"),
        NotFoundException.class,            new ErrorDef(404, "Not Found"),
        BadRequestException.class,          new ErrorDef(400, "Bad Request")
    );

    @Override
    public Response toResponse(Throwable ex) {
        if (ex instanceof ConstraintViolationException cve) {
            String detail = cve.getConstraintViolations().stream()
                .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                .reduce((a, b) -> a + "; " + b)
                .orElse("Validation failed");
            return problem(400, "Validation Error", detail);
        }
        for (var entry : ERRORS.entrySet()) {
            if (entry.getKey().isInstance(ex)) {
                ErrorDef def = entry.getValue();
                return problem(def.status(), def.title(), ex.getMessage());
            }
        }
        return problem(500, "Internal Server Error", "An unexpected error occurred");
    }

    private Response problem(int status, String title, String detail) {
        return Response.status(status)
            .type(PROBLEM_JSON)
            .entity(ProblemDetail.of(status, title, detail))
            .build();
    }
}
