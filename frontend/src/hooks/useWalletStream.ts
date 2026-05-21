import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../context/ToastContext';
import { fmtMoney } from '../utils/format';

interface WalletEvent {
  walletId: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  currency: string;
  description: string;
}

export function useWalletStream(walletIds: string[]) {
  const queryClient = useQueryClient();
  const toast = useToast();

  useEffect(() => {
    if (!walletIds.length) return;

    const sources = walletIds.map(id => {
      const es = new EventSource(`/api/v1/wallets/${id}/stream`);

      es.onmessage = (e) => {
        try {
          const event: WalletEvent = JSON.parse(e.data);
          if (event.type === 'CREDIT') {
            const label = event.description === 'TOP_UP' ? 'Top-up received' : 'Transfer received';
            toast.push({
              kind: 'success',
              title: label,
              subtitle: `+${fmtMoney(event.amount, event.currency)} credited to your wallet`,
            });
            // Refresh wallet list and entries so balances update
            queryClient.invalidateQueries({ queryKey: ['wallets'] });
            queryClient.invalidateQueries({ queryKey: ['entries', id] });
          }
        } catch {
          // malformed event — ignore
        }
      };

      es.onerror = () => {
        // Browser auto-reconnects on error; no action needed
      };

      return es;
    });

    return () => sources.forEach(es => es.close());
  }, [walletIds.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps
}
