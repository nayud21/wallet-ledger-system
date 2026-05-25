import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listRuns, listMatches, listExceptions,
  triggerReconciliation, uploadStatement,
  ReconciliationRun,
} from '../api/reconciliation';

function parseSummary(raw: string | null): { matched: number; unmatched: number } {
  try { return JSON.parse(raw ?? '{}'); } catch { return { matched: 0, unmatched: 0 }; }
}

export default function ReconciliationPage() {
  const qc = useQueryClient();
  const [selectedRun, setSelectedRun] = useState<ReconciliationRun | null>(null);
  const [activeTab, setActiveTab] = useState<'matches' | 'exceptions'>('matches');

  // Upload form state
  const [provider, setProvider] = useState('');
  const [statementDate, setStatementDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadMsg, setUploadMsg] = useState('');

  const { data: runs = [], isLoading } = useQuery({
    queryKey: ['recon-runs'],
    queryFn: () => listRuns(50),
  });

  const { data: matches = [] } = useQuery({
    queryKey: ['recon-matches', selectedRun?.id],
    queryFn: () => listMatches(selectedRun!.id),
    enabled: !!selectedRun && activeTab === 'matches',
  });

  const { data: exceptions = [] } = useQuery({
    queryKey: ['recon-exceptions', selectedRun?.id],
    queryFn: () => listExceptions(selectedRun!.id),
    enabled: !!selectedRun && activeTab === 'exceptions',
  });

  const triggerMutation = useMutation({
    mutationFn: triggerReconciliation,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recon-runs'] }),
  });

  const handleUpload = async () => {
    if (!file || !provider || !statementDate) return;
    try {
      const res = await uploadStatement(file, provider, statementDate);
      setUploadMsg(`Uploaded: ${res.lines} lines (id=${res.id})`);
      setFile(null);
    } catch (e: unknown) {
      setUploadMsg(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <div className="flex h-full gap-4 p-4 text-sm">
      {/* Left panel — runs list + upload */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-3">
        {/* Upload CSV */}
        <div className="rounded border border-slate-200 bg-white p-3 flex flex-col gap-2">
          <h2 className="font-semibold text-slate-700">Upload Statement</h2>
          <input
            className="border rounded px-2 py-1 text-xs w-full"
            placeholder="Provider"
            value={provider}
            onChange={e => setProvider(e.target.value)}
          />
          <input
            type="date"
            className="border rounded px-2 py-1 text-xs w-full"
            value={statementDate}
            onChange={e => setStatementDate(e.target.value)}
          />
          <input
            type="file"
            accept=".csv"
            className="text-xs"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
          />
          <button
            className="bg-indigo-600 text-white rounded px-2 py-1 text-xs disabled:opacity-50"
            disabled={!file || !provider || !statementDate}
            onClick={handleUpload}
          >
            Upload CSV
          </button>
          {uploadMsg && <p className="text-xs text-slate-500">{uploadMsg}</p>}
        </div>

        {/* Trigger run */}
        <div className="rounded border border-slate-200 bg-white p-3 flex flex-col gap-2">
          <h2 className="font-semibold text-slate-700">Run Reconciliation</h2>
          <input
            type="date"
            className="border rounded px-2 py-1 text-xs w-full"
            value={statementDate}
            onChange={e => setStatementDate(e.target.value)}
          />
          <button
            className="bg-emerald-600 text-white rounded px-2 py-1 text-xs disabled:opacity-50"
            disabled={!statementDate || triggerMutation.isPending}
            onClick={() => triggerMutation.mutate(statementDate)}
          >
            {triggerMutation.isPending ? 'Running…' : 'Run Now'}
          </button>
        </div>

        {/* Runs list */}
        <div className="rounded border border-slate-200 bg-white flex-1 overflow-y-auto">
          <div className="px-3 py-2 border-b text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Runs
          </div>
          {isLoading && <p className="p-3 text-slate-400 text-xs">Loading…</p>}
          {runs.map(run => {
            const s = parseSummary(run.summary);
            const active = selectedRun?.id === run.id;
            return (
              <button
                key={run.id}
                onClick={() => { setSelectedRun(run); setActiveTab('matches'); }}
                className={`w-full text-left px-3 py-2 border-b last:border-0 hover:bg-slate-50 ${active ? 'bg-indigo-50' : ''}`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium text-slate-700">{run.runDate}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${run.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {run.status}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  ✓ {s.matched} matched · ✗ {s.unmatched} unmatched
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right panel — matches / exceptions */}
      <div className="flex-1 flex flex-col rounded border border-slate-200 bg-white overflow-hidden">
        {!selectedRun ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            Select a run to view details
          </div>
        ) : (
          <>
            <div className="flex border-b px-4 pt-3 gap-4">
              <button
                className={`pb-2 text-xs font-semibold border-b-2 ${activeTab === 'matches' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500'}`}
                onClick={() => setActiveTab('matches')}
              >
                Matches ({matches.length})
              </button>
              <button
                className={`pb-2 text-xs font-semibold border-b-2 ${activeTab === 'exceptions' ? 'border-red-500 text-red-600' : 'border-transparent text-slate-500'}`}
                onClick={() => setActiveTab('exceptions')}
              >
                Exceptions ({exceptions.length})
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              {activeTab === 'matches' && (
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-slate-500 uppercase tracking-wide">
                    <tr>
                      <th className="px-3 py-2 text-left">ID</th>
                      <th className="px-3 py-2 text-left">Ledger Entry</th>
                      <th className="px-3 py-2 text-left">Statement</th>
                      <th className="px-3 py-2 text-left">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map(m => (
                      <tr key={m.id} className="border-t hover:bg-slate-50">
                        <td className="px-3 py-1.5 text-slate-400">{m.id}</td>
                        <td className="px-3 py-1.5 font-mono">{m.ledgerEntryId ?? '—'}</td>
                        <td className="px-3 py-1.5 font-mono">{m.externalStatementId ?? '—'}</td>
                        <td className="px-3 py-1.5 text-slate-500 max-w-xs truncate">{m.details ?? '—'}</td>
                      </tr>
                    ))}
                    {matches.length === 0 && (
                      <tr><td colSpan={4} className="px-3 py-4 text-center text-slate-400">No matches</td></tr>
                    )}
                  </tbody>
                </table>
              )}

              {activeTab === 'exceptions' && (
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-slate-500 uppercase tracking-wide">
                    <tr>
                      <th className="px-3 py-2 text-left">ID</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Payload</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exceptions.map(ex => (
                      <tr key={ex.id} className="border-t hover:bg-slate-50">
                        <td className="px-3 py-1.5 text-slate-400">{ex.id}</td>
                        <td className="px-3 py-1.5 font-medium text-red-600">{ex.type}</td>
                        <td className="px-3 py-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-xs ${ex.status === 'OPEN' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                            {ex.status}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-slate-500 max-w-xs truncate font-mono">{ex.payload}</td>
                      </tr>
                    ))}
                    {exceptions.length === 0 && (
                      <tr><td colSpan={4} className="px-3 py-4 text-center text-slate-400">No exceptions</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
