import type { LedgerEntryResponse } from '../types/api';
import type { CashflowPoint } from '../components/consumer/CashflowCard';
import type { Kpi } from '../components/consumer/KpiCard';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function buildCashflow(entries: LedgerEntryResponse[], days = 7): { points: CashflowPoint[]; rangeLabel: string } {
  const today = startOfDay(new Date());
  const buckets = new Map<number, { income: number; expense: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - i));
    buckets.set(d.getTime(), { income: 0, expense: 0 });
  }
  for (const e of entries) {
    const d = startOfDay(new Date(e.createdAt));
    const slot = buckets.get(d.getTime());
    if (!slot) continue;
    if (e.direction === 'CREDIT') slot.income += e.amount;
    else slot.expense += e.amount;
  }

  const points: CashflowPoint[] = [];
  for (const [ts, v] of buckets) {
    const d = new Date(ts);
    points.push({
      day: DAYS[d.getDay()],
      date: `${MONTHS[d.getMonth()]} ${d.getDate()}`,
      income: v.income,
      expense: v.expense,
    });
  }
  points.sort((a, b) => (a.date > b.date ? 1 : -1));
  const first = points[0]?.date ?? '';
  const last = points[points.length - 1]?.date ?? '';
  return { points, rangeLabel: `${first} – ${last}, ${today.getFullYear()}` };
}

export function buildKpis(entries: LedgerEntryResponse[]): Kpi[] {
  const now = Date.now();
  const D30 = 30 * 24 * 60 * 60 * 1000;
  const cutoff = now - D30;
  const prevCutoff = now - 2 * D30;

  let income30 = 0, expense30 = 0;
  let incomePrev = 0, expensePrev = 0;
  for (const e of entries) {
    const t = +new Date(e.createdAt);
    const credit = e.direction === 'CREDIT';
    if (t >= cutoff) {
      if (credit) income30 += e.amount; else expense30 += e.amount;
    } else if (t >= prevCutoff) {
      if (credit) incomePrev += e.amount; else expensePrev += e.amount;
    }
  }
  const net = income30 - expense30;
  const netPrev = incomePrev - expensePrev;
  const savings = income30 > 0 ? net / income30 : 0;
  const savingsPrev = incomePrev > 0 ? netPrev / incomePrev : 0;

  const pctChange = (cur: number, prev: number) => (prev === 0 ? 0 : (cur - prev) / Math.abs(prev));

  const incDelta = pctChange(income30, incomePrev);
  const expDelta = pctChange(expense30, expensePrev);
  const netDelta = pctChange(net, netPrev);
  const savDelta = savings - savingsPrev;

  return [
    { label: 'Income (30d)',   value: income30,  delta: Math.abs(incDelta), dir: incDelta >= 0 ? 'up' : 'down', tone: 'emerald' },
    { label: 'Expenses (30d)', value: expense30, delta: Math.abs(expDelta), dir: expDelta >= 0 ? 'up' : 'down', tone: 'rose' },
    { label: 'Net cashflow',   value: net,       delta: Math.abs(netDelta), dir: netDelta >= 0 ? 'up' : 'down', tone: 'indigo' },
    { label: 'Savings rate',   value: savings,   delta: Math.abs(savDelta), dir: savDelta >= 0 ? 'up' : 'down', tone: 'slate', isPct: true },
  ];
}
