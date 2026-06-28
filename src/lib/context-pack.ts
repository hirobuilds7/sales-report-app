import type { SalesRow } from "./types";
import {
  aggregateByChannel,
  aggregateByMonth,
  aggregateByProduct,
  formatMonth,
} from "./aggregate";

export type ContextPack = {
  sourceName: string;
  rowCount: number;
  months: { month: string; revenue: number }[];
  channels: { channel: string; revenue: number; share: number }[];
  topProducts: { productName: string; category: string; revenue: number; quantity: number }[];
};

export function buildContextPack(rows: SalesRow[], sourceName: string): ContextPack {
  const months = aggregateByMonth(rows).map((m) => ({
    month: m.month,
    revenue: m.revenue,
  }));
  const channels = aggregateByChannel(rows).map((c) => ({
    channel: c.channel,
    revenue: c.revenue,
    share: c.share,
  }));
  const topProducts = aggregateByProduct(rows, 10).map((p) => ({
    productName: p.productName,
    category: p.category,
    revenue: p.revenue,
    quantity: p.quantity,
  }));
  return {
    sourceName,
    rowCount: rows.length,
    months,
    channels,
    topProducts,
  };
}

export function contextPackToPromptText(pack: ContextPack): string {
  const yen = (n: number) => `¥${Math.round(n).toLocaleString("ja-JP")}`;
  const lines: string[] = [];
  lines.push(`データソース: ${pack.sourceName}（${pack.rowCount.toLocaleString()}件）`);
  lines.push("");
  lines.push("月別売上:");
  for (const m of pack.months) {
    lines.push(`- ${formatMonth(m.month)}: ${yen(m.revenue)}`);
  }
  lines.push("");
  lines.push("チャネル別売上（期間合計）:");
  for (const c of pack.channels) {
    lines.push(`- ${c.channel}: ${yen(c.revenue)}（シェア${(c.share * 100).toFixed(1)}%）`);
  }
  lines.push("");
  lines.push("商品別売上TOP10（期間合計）:");
  pack.topProducts.forEach((p, i) => {
    lines.push(`${i + 1}. ${p.productName}（${p.category}）: ${yen(p.revenue)} / 数量${p.quantity.toLocaleString()}`);
  });
  return lines.join("\n");
}
