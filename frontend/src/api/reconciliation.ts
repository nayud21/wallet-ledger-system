import { apiFetch } from './client';

export interface ReconciliationRun {
  id: number;
  runDate: string;
  status: string;
  summary: string | null;
  createdAt: string;
}

export interface ReconciliationMatch {
  id: number;
  ledgerEntryId: number | null;
  externalStatementId: number | null;
  details: string | null;
}

export interface ReconciliationException {
  id: number;
  type: string;
  payload: string;
  status: string;
  createdAt: string;
}

export const listRuns = (limit = 20) =>
  apiFetch<ReconciliationRun[]>(`/api/v1/statements/runs?limit=${limit}`);

export const listMatches = (runId: number) =>
  apiFetch<ReconciliationMatch[]>(`/api/v1/statements/runs/${runId}/matches`);

export const listExceptions = (runId: number) =>
  apiFetch<ReconciliationException[]>(`/api/v1/statements/runs/${runId}/exceptions`);

export const triggerReconciliation = (date: string) =>
  apiFetch<ReconciliationRun>(`/api/v1/statements/reconcile?date=${date}`, { method: 'POST' });

export const uploadStatement = (file: File, provider: string, statementDate: string) => {
  const form = new FormData();
  form.append('file', file);
  form.append('provider', provider);
  form.append('statementDate', statementDate);
  return apiFetch<{ id: number; lines: number }>('/api/v1/statements/upload', {
    method: 'POST',
    headers: {},
    body: form,
  });
};
