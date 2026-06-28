import type { SalesRow } from "./types";
import {
  aggregateByChannel,
  aggregateByProduct,
  compareTotals,
  filterByMonth,
  formatMonth,
  formatPercent,
  formatYen,
} from "./aggregate";

export function buildMonthlyReportMarkdown(
  rows: SalesRow[],
  month: string,
  aiSummary: string | null,
): string {
  const monthRows = filterByMonth(rows, month);
  const totals = compareTotals(rows, month);
  const channels = aggregateByChannel(monthRows);
  const products = aggregateByProduct(monthRows, 10);
  const orderCount = monthRows.length;
  const avgOrder = orderCount > 0 ? totals.total / orderCount : 0;

  const lines: string[] = [];
  lines.push(`# ${formatMonth(month)} 売上レポート`);
  lines.push("");
  lines.push(`発行日: ${new Date().toISOString().slice(0, 10)}`);
  lines.push("");
  lines.push("## サマリ");
  lines.push("");
  lines.push(`- 売上合計: **${formatYen(totals.total)}**`);
  lines.push(
    `- 前月比: **${formatPercent(totals.vsPrevMonth.deltaRate)}**（前月: ${formatYen(totals.vsPrevMonth.previous)}）`,
  );
  lines.push(
    `- 前年同月比: **${formatPercent(totals.vsPrevYear.deltaRate)}**（前年同月: ${formatYen(totals.vsPrevYear.previous)}）`,
  );
  lines.push(`- 受注件数: ${orderCount.toLocaleString()}件`);
  lines.push(`- 平均単価: ${formatYen(avgOrder)}`);
  lines.push("");

  if (aiSummary && aiSummary.trim().length > 0) {
    lines.push("## AI要約");
    lines.push("");
    lines.push(aiSummary.trim());
    lines.push("");
  }

  lines.push("## チャネル別売上");
  lines.push("");
  lines.push("| チャネル | 売上 | シェア |");
  lines.push("| --- | ---: | ---: |");
  for (const c of channels) {
    lines.push(`| ${c.channel} | ${formatYen(c.revenue)} | ${(c.share * 100).toFixed(1)}% |`);
  }
  lines.push("");

  lines.push("## 商品別売上 TOP10");
  lines.push("");
  lines.push("| 順位 | 商品 | カテゴリ | 数量 | 売上 |");
  lines.push("| ---: | --- | --- | ---: | ---: |");
  products.forEach((p, i) => {
    lines.push(
      `| ${i + 1} | ${p.productName} | ${p.category} | ${p.quantity.toLocaleString()} | ${formatYen(p.revenue)} |`,
    );
  });
  lines.push("");

  lines.push("---");
  lines.push("");
  lines.push(
    "_このレポートは「売上集計＋月次レポート自動化（旗艦出品の業務ツールサンプル）」で自動生成されました。_",
  );

  return lines.join("\n");
}
