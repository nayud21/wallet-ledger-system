import { apiFetch } from './client';
import type { UserResponse } from '../types/api';

export function fetchUser(id: string): Promise<UserResponse> {
  return apiFetch<UserResponse>(`/api/v1/users/${id}`);
}
