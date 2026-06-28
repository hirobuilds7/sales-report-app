"use client";

import { useEffect, useMemo, useState } from "react";
import { useDataset } from "@/lib/store";
import EmptyDataset from "@/components/EmptyDataset";
import { MetricCard, CompareCard } from "@/components/StatCard";
import RevenueTrendChart from "@/components/charts/RevenueTrendChart";
import {
  aggregateByChannel,
  aggregateByDay,
  aggregateByProduct,
  compareTotals,
  filterByMonth,
  formatMonth,
  formatYen,
  listMonths,
} from "@/lib/aggregate";
import { buildMonthlyReportMarkdown } from "@/lib/report-markdown";
import { Download, Sparkles, Loader2 } from "lucide-react";

export default function ReportPage() {
  const { dataset, loaded } = useDataset();
  const months = useMemo(() => (dataset ? listMonths(dataset.rows) : []), [dataset]);
  const [month, setMonth] = useState<string>("");
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (months.length > 0 && !month) {
      setMonth(months[months.length - 1]);
    }
  }, [months, month]);

  const view = useMemo(() => {
    if (!dataset || !month) return null;
    const monthRows = filterByMonth(dataset.rows, month);
    const totals = compareTotals(dataset.rows, month);
    const channels = aggregateByChannel(monthRows);
    const products = aggregateByProduct(monthRows, 10);
    const daily = aggregateByDay(monthRows);
    const orderCount = monthRows.length;
    const avgOrder = orderCount > 0 ? totals.total / orderCount : 0;
    return { monthRows, totals, channels, products, daily, orderCount, avgOrder };
  }, [dataset, month]);

  useEffect(() => {
    setAiSummary(null);
    setAiError(null);
  }, [month]);

  if (!loaded) return null;
  if (!dataset) return <EmptyDataset purpose="月次レポート" />;
  if (months.length === 0 || !view) return <EmptyDataset purpose="月次レポート" />;

  async function generateSummary() {
    if (!dataset || !view || !month) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          total: view.totals.total,
          prevMonth: view.totals.vsPrevMonth,
          prevYear: view.totals.vsPrevYear,
          channels: view.channels.map((c) => ({
            channel: c.channel,
            revenue: c.revenue,
            share: c.share,
          })),
          topProducts: view.products.map((p) => ({
            productName: p.productName,
            category: p.category,
            revenue: p.revenue,
            quantity: p.quantity,
          })),
        }),
      });
      const data = (await res.json()) as { summary?: string; error?: string };
      if (!res.ok) {
        setAiError(data.error ?? "AI要約の生成に失敗しました。");
        return;
      }
      setAiSummary(data.summary ?? "");
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "通信エラー");
    } finally {
      setAiLoading(false);
    }
  }

  function downloadMarkdown() {
    if (!dataset || !month) return;
    const md = buildMonthlyReportMarkdown(dataset.rows, month, aiSummary);
    const blob = new Blob([md], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `売上レポート_${month}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-blue-700">経営者向け月次サマリ</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            {formatMonth(month)} 売上レポート
          </h1>
          <p className="mt-1 text-sm text-slate-500">データソース: {dataset.sourceName}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {formatMonth(m)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={downloadMarkdown}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Download className="h-4 w-4" />
            テキストで保存
          </button>
        </div>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="売上合計" value={formatYen(view.totals.total)} emphasis />
        <CompareCard label="前月比" stat={view.totals.vsPrevMonth} />
        <CompareCard label="前年同月比" stat={view.totals.vsPrevYear} />
        <MetricCard
          label="受注件数 / 平均単価"
          value={`${view.orderCount.toLocaleString()}件`}
          hint={`平均: ${formatYen(view.avgOrder)}`}
        />
      </section>

      <section className="rounded-xl border border-blue-200 bg-blue-50/50 p-5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-slate-900 inline-flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-blue-700" />
            AI要約コメント
          </h2>
          {aiSummary ? (
            <button
              type="button"
              onClick={generateSummary}
              disabled={aiLoading}
              className="text-xs text-blue-700 hover:underline disabled:opacity-50"
            >
              再生成
            </button>
          ) : (
            <button
              type="button"
              onClick={generateSummary}
              disabled={aiLoading}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {aiLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              AIで要約を生成
            </button>
          )}
        </div>
        {aiSummary ? (
          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-800 leading-relaxed">
            {aiSummary}
          </p>
        ) : aiLoading ? (
          <p className="mt-3 text-sm text-slate-500">分析中…</p>
        ) : aiError ? (
          <p className="mt-3 text-sm text-red-700">{aiError}</p>
        ) : (
          <p className="mt-3 text-sm text-slate-600">
            ボタンを押すと、この月の数字（売上・前月比・チャネル別・商品TOP）を文脈にClaudeが3〜4文で要約します。
          </p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">日別売上推移</h2>
        <p className="text-xs text-slate-500">{formatMonth(month)}内の日次の動き</p>
        <div className="mt-2">
          <RevenueTrendChart
            data={view.daily.map((d) => ({
              label: d.date.slice(-2) + "日",
              revenue: d.revenue,
            }))}
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">チャネル別売上</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="py-2 text-left font-medium">チャネル</th>
                <th className="py-2 text-right font-medium">売上</th>
                <th className="py-2 text-right font-medium">シェア</th>
              </tr>
            </thead>
            <tbody>
              {view.channels.map((c) => (
                <tr key={c.channel} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 font-medium text-slate-900">{c.channel}</td>
                  <td className="py-2 text-right text-slate-900">{formatYen(c.revenue)}</td>
                  <td className="py-2 text-right text-slate-600">
                    {(c.share * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">商品別売上 TOP10</h2>
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
                  <td className="py-2 text-right text-slate-700">
                    {p.quantity.toLocaleString()}
                  </td>
                  <td className="py-2 text-right font-medium text-slate-900">
                    {formatYen(p.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
