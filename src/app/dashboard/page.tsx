"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useDataset } from "@/lib/store";
import EmptyDataset from "@/components/EmptyDataset";
import { MetricCard, CompareCard } from "@/components/StatCard";
import RevenueTrendChart from "@/components/charts/RevenueTrendChart";
import ChannelPieChart from "@/components/charts/ChannelPieChart";
import {
  aggregateByMonth,
  aggregateByChannel,
  aggregateByProduct,
  compareTotals,
  formatMonth,
  formatYen,
  listMonths,
} from "@/lib/aggregate";
import { FileText, Trash2 } from "lucide-react";

export default function DashboardPage() {
  const { dataset, setDataset, loaded } = useDataset();

  const view = useMemo(() => {
    if (!dataset) return null;
    const months = listMonths(dataset.rows);
    const latest = months[months.length - 1];
    const monthly = aggregateByMonth(dataset.rows);
    const channel = aggregateByChannel(dataset.rows);
    const products = aggregateByProduct(dataset.rows, 10);
    const totals = compareTotals(dataset.rows, latest);
    const totalRevenue = dataset.rows.reduce((s, r) => s + r.revenue, 0);
    return { months, latest, monthly, channel, products, totals, totalRevenue };
  }, [dataset]);

  if (!loaded) return null;
  if (!dataset || !view) return <EmptyDataset purpose="ダッシュボード" />;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-blue-700">ダッシュボード</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            売上サマリ・全期間
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            データソース: <span className="font-medium text-slate-700">{dataset.sourceName}</span>
            ・ 期間: {formatMonth(view.months[0])} 〜 {formatMonth(view.latest)}・ {dataset.rows.length.toLocaleString()}件
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/report"
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <FileText className="h-4 w-4" />
            月次レポートを見る
          </Link>
          <button
            type="button"
            onClick={() => setDataset(null)}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            <Trash2 className="h-4 w-4" />
            データを破棄
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="期間内 総売上"
          value={formatYen(view.totalRevenue)}
          hint={`${view.months.length}ヶ月の合計`}
          emphasis
        />
        <CompareCard
          label={`${formatMonth(view.latest)} 売上`}
          stat={view.totals.vsPrevMonth}
          hint="前月比"
        />
        <CompareCard
          label={`${formatMonth(view.latest)} 売上`}
          stat={view.totals.vsPrevYear}
          hint="前年同月比"
        />
        <MetricCard
          label="取扱SKU数"
          value={view.products.length >= 10 ? "10+" : String(view.products.length)}
          hint={`カテゴリ: ${new Set(dataset.rows.map((r) => r.category)).size}`}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">月別売上推移</h2>
            <span className="text-xs text-slate-500">月次・全チャネル合算</span>
          </div>
          <div className="mt-2">
            <RevenueTrendChart
              data={view.monthly.map((m) => ({
                label: formatMonth(m.month),
                revenue: m.revenue,
              }))}
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">チャネル別売上</h2>
          <p className="text-xs text-slate-500">期間合計に占めるシェア</p>
          <div className="mt-2">
            <ChannelPieChart
              data={view.channel.map((c) => ({ channel: c.channel, revenue: c.revenue }))}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">商品別売上 TOP10</h2>
          <span className="text-xs text-slate-500">期間合計</span>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="py-2 text-left font-medium w-10">#</th>
                <th className="py-2 text-left font-medium">商品</th>
                <th className="py-2 text-left font-medium hidden sm:table-cell">カテゴリ</th>
                <th className="py-2 text-right font-medium">数量</th>
                <th className="py-2 text-right font-medium">売上</th>
              </tr>
            </thead>
            <tbody>
              {view.products.map((p, i) => (
                <tr key={p.sku} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 text-slate-500">{i + 1}</td>
                  <td className="py-2">
                    <div className="font-medium text-slate-900">{p.productName}</div>
                    <div className="text-xs text-slate-500">{p.sku}</div>
                  </td>
                  <td className="py-2 hidden sm:table-cell text-slate-600">{p.category}</td>
                  <td className="py-2 text-right text-slate-700">{p.quantity.toLocaleString()}</td>
                  <td className="py-2 text-right font-medium text-slate-900">{formatYen(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
