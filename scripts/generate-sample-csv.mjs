import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = resolve(__dirname, "..", "public", "sample-sales.csv");

const CHANNELS = ["Amazon", "楽天", "Shopify"];

const PRODUCTS = [
  { sku: "APP-001", name: "オーガニックコットンTシャツ ホワイト", category: "アパレル", price: 2980 },
  { sku: "APP-002", name: "オーガニックコットンTシャツ ネイビー", category: "アパレル", price: 2980 },
  { sku: "APP-003", name: "リネンシャツ Mサイズ", category: "アパレル", price: 5980 },
  { sku: "APP-004", name: "デニムワイドパンツ", category: "アパレル", price: 7980 },
  { sku: "APP-005", name: "ウールニットカーディガン", category: "アパレル", price: 8980 },
  { sku: "ZAK-001", name: "帆布トートバッグ Mサイズ", category: "雑貨", price: 3480 },
  { sku: "ZAK-002", name: "本革ミニ財布", category: "雑貨", price: 6800 },
  { sku: "ZAK-003", name: "陶器マグカップ 2個セット", category: "雑貨", price: 2480 },
  { sku: "ZAK-004", name: "アロマキャンドル ラベンダー", category: "雑貨", price: 1980 },
  { sku: "ZAK-005", name: "木製カッティングボード", category: "雑貨", price: 3980 },
  { sku: "ZAK-006", name: "ステンレスタンブラー 350ml", category: "雑貨", price: 2280 },
  { sku: "ZAK-007", name: "リネンキッチンクロス 3枚組", category: "雑貨", price: 1680 },
  { sku: "FOO-001", name: "シングルオリジンコーヒー豆 200g", category: "食品", price: 1980 },
  { sku: "FOO-002", name: "国産はちみつ 250g", category: "食品", price: 2480 },
  { sku: "FOO-003", name: "有機紅茶アソート 20袋", category: "食品", price: 1680 },
  { sku: "FOO-004", name: "ドライフルーツミックス 150g", category: "食品", price: 1280 },
  { sku: "FOO-005", name: "クラフトチョコレート 4種セット", category: "食品", price: 3680 },
  { sku: "FOO-006", name: "オリーブオイル EXV 250ml", category: "食品", price: 2980 },
  { sku: "FOO-007", name: "国産味噌 500g", category: "食品", price: 1480 },
  { sku: "FOO-008", name: "燻製ナッツアソート 200g", category: "食品", price: 1880 },
];

// 季節係数（月→倍率）。12月にギフト需要で跳ね、夏に少し落ちる。
const SEASON = {
  1: 0.9, 2: 0.85, 3: 1.0, 4: 1.05, 5: 1.0, 6: 0.95,
  7: 0.9, 8: 0.85, 9: 1.0, 10: 1.1, 11: 1.2, 12: 1.6,
};

// チャネル×カテゴリの相性。楽天は食品強い、Shopifyはアパレル強い、Amazonは雑貨強い、みたいな差。
const AFFINITY = {
  Amazon: { アパレル: 1.0, 雑貨: 1.25, 食品: 0.9 },
  楽天: { アパレル: 0.95, 雑貨: 1.0, 食品: 1.3 },
  Shopify: { アパレル: 1.2, 雑貨: 1.05, 食品: 0.85 },
};

// 決定論的なPRNG（mulberry32）。Math.randomを使うと毎回CSVが変わるので固定。
function makeRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function generate() {
  const rng = makeRng(20260628);
  const rows = [];
  rows.push(["日付", "チャネル", "SKU", "商品名", "カテゴリ", "数量", "単価", "売上"].join(","));

  // 2025-07 から 2026-06 までの12ヶ月。前年同月比デモのため広めに取る。
  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(2025, 6 + i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }

  // 全体トレンド：12ヶ月で緩やかに右肩上がり（+1%/月くらい）。
  let monthIdx = 0;
  for (const { year, month } of months) {
    const trend = 1 + monthIdx * 0.012;
    const seasonal = SEASON[month] ?? 1.0;
    const days = daysInMonth(year, month);

    for (let day = 1; day <= days; day++) {
      // 1日あたり 8〜20件の取引（多めにしてリアル感）
      const txnCount = 8 + Math.floor(rng() * 13);
      for (let t = 0; t < txnCount; t++) {
        const product = PRODUCTS[Math.floor(rng() * PRODUCTS.length)];
        const channel = CHANNELS[Math.floor(rng() * CHANNELS.length)];
        const affinity = AFFINITY[channel][product.category];
        const base = trend * seasonal * affinity;
        // 数量：基本1、ボーナス倍率に応じてたまに2-4個
        let qty = 1;
        if (rng() < 0.18 * base) qty += 1;
        if (rng() < 0.06 * base) qty += 1;
        if (rng() < 0.02 * base) qty += 1;
        // 単価：たまに10-15%ディスカウント
        const discount = rng() < 0.12 ? (rng() < 0.5 ? 0.9 : 0.85) : 1.0;
        const unitPrice = Math.round(product.price * discount);
        const revenue = qty * unitPrice;
        const date = `${year}-${pad(month)}-${pad(day)}`;
        rows.push([date, channel, product.sku, product.name, product.category, qty, unitPrice, revenue].join(","));
      }
    }
    monthIdx++;
  }
  return rows.join("\n") + "\n";
}

const csv = generate();
mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, csv, "utf8");

const lines = csv.split("\n").filter(Boolean).length;
console.log(`✓ Wrote ${lines.toLocaleString()} rows (incl. header) to ${OUTPUT}`);
