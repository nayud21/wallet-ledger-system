import { apiFetch } from './client';
import type { PageResponse, PaymentEventResponse } from '../types/api';

export function fetchEvents(page = 0, size = 20, status?: string): Promise<PageResponse<PaymentEventResponse>> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (status) params.set('status', status);
  return apiFetch<PageResponse<PaymentEventResponse>>(`/api/v1/payment/events?${params}`);
}
