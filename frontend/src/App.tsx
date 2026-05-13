import { useQuery } from '@tanstack/react-query';

interface Health {
  status: string;
  service: string;
}

export default function App() {
  const { data, isLoading, error } = useQuery<Health>({
    queryKey: ['health'],
    queryFn: async () => {
      const res = await fetch('/api/v1/health');
      if (!res.ok) throw new Error('Health check failed');
      return res.json();
    },
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-6 py-3">
        <h1 className="text-lg font-semibold">Wallet Ledger</h1>
      </header>
      <main className="grid grid-cols-12 gap-4 px-6 py-4">
        <aside className="col-span-2 rounded border border-slate-200 bg-white p-3 text-sm">
          <nav className="flex flex-col gap-1">
            <a className="rounded px-2 py-1 hover:bg-slate-100" href="#">Wallets</a>
            <a className="rounded px-2 py-1 hover:bg-slate-100" href="#">Ledger</a>
            <a className="rounded px-2 py-1 hover:bg-slate-100" href="#">Reconciliation</a>
            <a className="rounded px-2 py-1 hover:bg-slate-100" href="#">Audit</a>
          </nav>
        </aside>
        <section className="col-span-10 rounded border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-medium text-slate-600">Backend status</h2>
          {isLoading && <p className="text-sm">Checking...</p>}
          {error && <p className="text-sm text-red-600">Backend unreachable. Start it with `./mvnw quarkus:dev`.</p>}
          {data && (
            <pre className="rounded bg-slate-900 p-3 text-xs text-slate-100">{JSON.stringify(data, null, 2)}</pre>
          )}
        </section>
      </main>
    </div>
  );
}
