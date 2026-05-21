package com.walletledger.shared.error;

public record ProblemDetail(String type, String title, int status, String detail) {
    static final String BASE = "https://wallet-ledger/problems/";

    public static ProblemDetail of(int status, String title, String detail) {
        String slug = title.toLowerCase().replace(' ', '-');
        return new ProblemDetail(BASE + slug, title, status, detail);
    }
}
