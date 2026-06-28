import Papa from "papaparse";
import type { SalesRow } from "./types";

const HEADER_ALIASES: Record<keyof SalesRow, string[]> = {
  date: ["日付", "date", "受注日", "売上日"],
  channel: ["チャネル", "channel", "販売チャネル", "店舗"],
  sku: ["SKU", "sku", "商品コード"],
  productName: ["商品名", "product", "productName", "商品"],
  category: ["カテゴリ", "category", "カテゴリー"],
  quantity: ["数量", "quantity", "qty", "個数"],
  unitPrice: ["単価", "unitPrice", "price"],
  revenue: ["売上", "revenue", "金額", "売上金額"],
};

function resolveColumn(headers: string[], field: keyof SalesRow): string | null {
  const aliases = HEADER_ALIASES[field];
  for (const a of aliases) {
    const match = headers.find((h) => h.trim() === a);
    if (match) return match;
  }
  return null;
}

export type ParseResult =
  | { ok: true; rows: SalesRow[]; skipped: number }
  | { ok: false; error: string };

export function parseSalesCsv(csvText: string): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });
  if (parsed.errors.length > 0) {
    const first = parsed.errors[0];
    return { ok: false, error: `CSV解析エラー: ${first.message}` };
  }
  const headers = parsed.meta.fields ?? [];
  const required: (keyof SalesRow)[] = [
    "date",
    "channel",
    "productName",
    "quantity",
    "unitPrice",
  ];
  const resolved = {} as Record<keyof SalesRow, string | null>;
  for (const f of Object.keys(HEADER_ALIASES) as (keyof SalesRow)[]) {
    resolved[f] = resolveColumn(headers, f);
  }
  const missing = required.filter((f) => !resolved[f]);
  if (missing.length > 0) {
    return {
      ok: false,
      error: `必須列が見つかりません: ${missing.join(", ")}`,
    };
  }

  const rows: SalesRow[] = [];
  let skipped = 0;
  for (const rec of parsed.data) {
    const date = (rec[resolved.date!] ?? "").trim();
    const channel = (rec[resolved.channel!] ?? "").trim();
    const productName = (rec[resolved.productName!] ?? "").trim();
    if (!date || !channel || !productName) {
      skipped++;
      continue;
    }
    const qty = Number(rec[resolved.quantity!] ?? "0");
    const unitPrice = Number(rec[resolved.unitPrice!] ?? "0");
    if (!Number.isFinite(qty) || !Number.isFinite(unitPrice)) {
      skipped++;
      continue;
    }
    const sku = resolved.sku ? (rec[resolved.sku] ?? "").trim() : "";
    const category = resolved.category ? (rec[resolved.category] ?? "").trim() : "未分類";
    const revenueRaw = resolved.revenue ? Number(rec[resolved.revenue] ?? "0") : qty * unitPrice;
    const revenue = Number.isFinite(revenueRaw) && revenueRaw > 0 ? revenueRaw : qty * unitPrice;
    rows.push({
      date,
      channel,
      sku: sku || `${productName}-${channel}`,
      productName,
      category: category || "未分類",
      quantity: qty,
      unitPrice,
      revenue,
    });
  }

  return { ok: true, rows, skipped };
}
