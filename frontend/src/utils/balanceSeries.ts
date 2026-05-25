import type { LedgerEntryResponse } from '../types/api';

export interface BalanceSeries {
  points: number[];
  monthChange: number;
}

export function buildBalanceSeries(
  entries: LedgerEntryResponse[],
  currentBalance: number,
  days = 30,
): BalanceSeries {
  if (!entries.length) {
    return { points: Array(days).fill(currentBalance), monthChange: 0 };
  }
  const sorted = [...entries].sort(
    (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt),
  );

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const oldest = new Date(today);
  oldest.setDate(today.getDate() - (days - 1));
  oldest.setHours(0, 0, 0, 0);

  let bal = currentBalance;
  const dayBalances: number[] = new Array(days).fill(NaN);
  let cursorDay = days - 1;
  dayBalances[cursorDay] = bal;

  for (let i = sorted.length - 1; i >= 0; i--) {
    const e = sorted[i];
    const t = new Date(e.createdAt);
    if (t < oldest) break;
    const dayIndex = Math.floor(
      (t.setHours(0, 0, 0, 0) - oldest.getTime()) / 86400000,
    );
    while (cursorDay > dayIndex) {
      dayBalances[cursorDay - 1] = bal;
      cursorDay--;
    }
    bal -= e.direction === 'CREDIT' ? e.amount : -e.amount;
    dayBalances[cursorDay] = bal;
  }
  while (cursorDay > 0) {
    dayBalances[cursorDay - 1] = bal;
    cursorDay--;
  }

  let last = currentBalance;
  for (let i = 0; i < days; i++) {
    if (Number.isNaN(dayBalances[i])) dayBalances[i] = last;
    else last = dayBalances[i];
  }
  const first = dayBalances[0];
  const monthChange = first === 0 ? 0 : (currentBalance - first) / Math.abs(first);
  return { points: dayBalances, monthChange };
}
