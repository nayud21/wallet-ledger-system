package com.walletledger.dto;

import java.util.List;

public record PageResponse<T>(List<T> data, long total, int page, int size) {}
