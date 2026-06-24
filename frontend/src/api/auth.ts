import { apiFetch } from './client';

export interface TokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

export function login(usernameOrEmail: string, password: string): Promise<TokenResponse> {
  return apiFetch<TokenResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ usernameOrEmail, password }),
  });
}

export function register(username: string, email: string, password: string): Promise<TokenResponse> {
  return apiFetch<TokenResponse>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
}
