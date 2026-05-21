package com.walletledger.shared;

import java.util.List;

public record PageResponse<T>(List<T> data, long total, int page, int size) {}
