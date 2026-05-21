package com.walletledger.shared.error;

import com.walletledger.shared.exception.*;
import jakarta.validation.ConstraintViolationException;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

@Provider
public class GlobalExceptionMapper implements ExceptionMapper<Throwable> {

    private static final String PROBLEM_JSON = "application/problem+json";

    @Override
    public Response toResponse(Throwable ex) {
        if (ex instanceof InsufficientBalanceException) {
            return problem(422, "Insufficient Balance", ex.getMessage());
        }
        if (ex instanceof CurrencyMismatchException) {
            return problem(422, "Currency Mismatch", ex.getMessage());
        }
        if (ex instanceof WalletNotActiveException) {
            return problem(422, "Wallet Not Active", ex.getMessage());
        }
        if (ex instanceof IdempotencyConflictException) {
            return problem(409, "Idempotency Conflict", ex.getMessage());
        }
        if (ex instanceof AlreadyReversedException) {
            return problem(422, "Already Reversed", ex.getMessage());
        }
        if (ex instanceof NotFoundException) {
            return problem(404, "Not Found", ex.getMessage());
        }
        if (ex instanceof ConstraintViolationException cve) {
            String detail = cve.getConstraintViolations().stream()
                .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                .reduce((a, b) -> a + "; " + b)
                .orElse("Validation failed");
            return problem(400, "Validation Error", detail);
        }
        if (ex instanceof jakarta.ws.rs.BadRequestException) {
            return problem(400, "Bad Request", ex.getMessage());
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
