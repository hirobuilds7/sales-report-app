import type { SalesRow } from "./types";

export type MonthlyAggregate = {
  month: string;
  revenue: number;
  quantity: number;
  orderCount: number;
};

export type ChannelAggregate = {
  channel: string;
  revenue: number;
  quantity: number;
  share: number;
};

export type ProductAggregate = {
  sku: string;
  productName: string;
  category: string;
  revenue: number;
  quantity: number;
};

export type DailyAggregate = {
  date: string;
  revenue: number;
};

export function getMonth(date: string): string {
  return date.slice(0, 7);
}

export function sortByMonth(months: string[]): string[] {
  return [...months].sort();
}

export function aggregateByMonth(rows: SalesRow[]): MonthlyAggregate[] {
  const map = new Map<string, MonthlyAggregate>();
  for (const r of rows) {
    const month = getMonth(r.date);
    const cur = map.get(month) ?? { month, revenue: 0, quantity: 0, orderCount: 0 };
    cur.revenue += r.revenue;
    cur.quantity += r.quantity;
    cur.orderCount += 1;
    map.set(month, cur);
  }
  return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
}

export function aggregateByChannel(rows: SalesRow[]): ChannelAggregate[] {
  const map = new Map<string, ChannelAggregate>();
  let total = 0;
  for (const r of rows) {
    const cur = map.get(r.channel) ?? { channel: r.channel, revenue: 0, quantity: 0, share: 0 };
    cur.revenue += r.revenue;
    cur.quantity += r.quantity;
    map.set(r.channel, cur);
    total += r.revenue;
  }
  const list = Array.from(map.values());
  for (const c of list) c.share = total > 0 ? c.revenue / total : 0;
  return list.sort((a, b) => b.revenue - a.revenue);
}

export function aggregateByProduct(rows: SalesRow[], limit = 10): ProductAggregate[] {
  const map = new Map<string, ProductAggregate>();
  for (const r of rows) {
    const cur = map.get(r.sku) ?? {
      sku: r.sku,
      productName: r.productName,
      category: r.category,
      revenue: 0,
      quantity: 0,
    };
    cur.revenue += r.revenue;
    cur.quantity += r.quantity;
    map.set(r.sku, cur);
  }
  return Array.from(map.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export function aggregateByDay(rows: SalesRow[]): DailyAggregate[] {
  const map = new Map<string, DailyAggregate>();
  for (const r of rows) {
    const cur = map.get(r.date) ?? { date: r.date, revenue: 0 };
    cur.revenue += r.revenue;
    map.set(r.date, cur);
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function filterByMonth(rows: SalesRow[], month: string): SalesRow[] {
  return rows.filter((r) => getMonth(r.date) === month);
}

export function listMonths(rows: SalesRow[]): string[] {
  const set = new Set<string>();
  for (const r of rows) set.add(getMonth(r.date));
  return sortByMonth(Array.from(set));
}

export function previousMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, "0")}`;
}

export function previousYearSameMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${y - 1}-${String(m).padStart(2, "0")}`;
}

export type ComparisonStat = {
  current: number;
  previous: number;
  delta: number;
  deltaRate: number | null;
};

export function compareTotals(rows: SalesRow[], month: string): {
  total: number;
  vsPrevMonth: ComparisonStat;
  vsPrevYear: ComparisonStat;
} {
  const current = filterByMonth(rows, month).reduce((s, r) => s + r.revenue, 0);
  const prevM = filterByMonth(rows, previousMonth(month)).reduce((s, r) => s + r.revenue, 0);
  const prevY = filterByMonth(rows, previousYearSameMonth(month)).reduce((s, r) => s + r.revenue, 0);
  const stat = (cur: number, prev: number): ComparisonStat => ({
    current: cur,
    previous: prev,
    delta: cur - prev,
    deltaRate: prev > 0 ? (cur - prev) / prev : null,
  });
  return {
    total: current,
    vsPrevMonth: stat(current, prevM),
    vsPrevYear: stat(current, prevY),
  };
}

export function formatYen(n: number): string {
  return `¥${Math.round(n).toLocaleString("ja-JP")}`;
}

export function formatPercent(n: number | null): string {
  if (n === null) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${(n * 100).toFixed(1)}%`;
}

export function formatMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${y}年${m}月`;
}
