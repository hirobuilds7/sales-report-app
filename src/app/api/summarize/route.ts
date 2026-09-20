import Anthropic from "@anthropic-ai/sdk";
import {
  LIMITS,
  badRequestJson,
  checkRateLimit,
  rateLimitJsonResponse,
  trimField,
  validateTabularInput,
} from "@/lib/rate-limit";

export const runtime = "nodejs";

const MODEL_ID = process.env.SUMMARIZE_MODEL ?? "claude-haiku-4-5";

type ComparisonStat = {
  current: number;
  previous: number;
  delta: number;
  deltaRate: number | null;
};

type SummarizeBody = {
  month: string;
  total: number;
  prevMonth: ComparisonStat;
  prevYear: ComparisonStat;
  channels: { channel: string; revenue: number; share: number }[];
  topProducts: {
    productName: string;
    category: string;
    revenue: number;
    quantity: number;
  }[];
};

function formatPercent(n: number | null): string {
  if (n === null) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${(n * 100).toFixed(1)}%`;
}

function buildFallbackSummary(b: SummarizeBody): string {
  const top = b.topProducts[0]?.productName ?? "—";
  const topChannel = b.channels[0]?.channel ?? "—";
  const mom = formatPercent(b.prevMonth.deltaRate);
  const yoy = formatPercent(b.prevYear.deltaRate);
  return [
    `${b.month}の売上は¥${Math.round(b.total).toLocaleString("ja-JP")}（前月比${mom}・前年同月比${yoy}）でした。`,
    `主力チャネルは${topChannel}、TOP商品は「${top}」です。`,
    `※AI要約を有効にするにはANTHROPIC_API_KEYを設定してください。`,
  ].join(" ");
}

export async function POST(req: Request) {
  let body: SummarizeBody;
  try {
    body = (await req.json()) as SummarizeBody;
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !body.prevMonth || !body.prevYear) {
    return Response.json({ error: "送信されたデータの形式が正しくありません。" }, { status: 400 });
  }

  // 1) 入力長のガード（AI を呼ぶ前＝無料で弾く。回数もまだ消費させん）
  const bad = validateTabularInput(
    [
      { label: "チャネル", value: body.channels, max: LIMITS.MAX_CONTEXT_CHANNELS },
      { label: "商品", value: body.topProducts, max: LIMITS.MAX_CONTEXT_PRODUCTS },
    ],
    [
      { label: "対象月", value: body.month },
      ...(body.channels ?? []).map((c) => ({ label: "チャネル名", value: c?.channel })),
      ...(body.topProducts ?? []).map((p) => ({ label: "商品名", value: p?.productName })),
    ],
  );
  if (bad) return badRequestJson(bad);

  // 2) 回数制限（IP/分・IP/日・デモ全体/日）＝定数は src/lib/rate-limit.ts の LIMITS
  const verdict = await checkRateLimit(req);
  if (!verdict.ok) return rateLimitJsonResponse(verdict);

  // 3) プロンプトに載せる文字列は長さを丸める（＝トークン代の防波堤）
  body = {
    ...body,
    month: trimField(body.month, 16),
    channels: (body.channels ?? []).slice(0, LIMITS.MAX_CONTEXT_CHANNELS).map((c) => ({
      ...c,
      channel: trimField(c?.channel),
    })),
    topProducts: (body.topProducts ?? []).slice(0, LIMITS.MAX_CONTEXT_PRODUCTS).map((p) => ({
      ...p,
      productName: trimField(p?.productName),
      category: trimField(p?.category),
    })),
  };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ summary: buildFallbackSummary(body) });
  }

  const client = new Anthropic({ apiKey });

  const userPrompt = [
    `小売EC事業者の月次売上データです。経営者向けに3〜4文の日本語で要約してください。`,
    ``,
    `対象月: ${body.month}`,
    `売上合計: ¥${Math.round(body.total).toLocaleString("ja-JP")}`,
    `前月比: ${formatPercent(body.prevMonth.deltaRate)}（前月: ¥${Math.round(body.prevMonth.previous).toLocaleString("ja-JP")}）`,
    `前年同月比: ${formatPercent(body.prevYear.deltaRate)}（前年同月: ¥${Math.round(body.prevYear.previous).toLocaleString("ja-JP")}）`,
    ``,
    `チャネル別売上:`,
    ...body.channels.map(
      (c) =>
        `- ${c.channel}: ¥${Math.round(c.revenue).toLocaleString("ja-JP")}（シェア${(c.share * 100).toFixed(1)}%）`,
    ),
    ``,
    `商品別売上TOP10:`,
    ...body.topProducts.map(
      (p, i) =>
        `${i + 1}. ${p.productName}（${p.category}）: ¥${Math.round(p.revenue).toLocaleString("ja-JP")} / 数量${p.quantity}`,
    ),
    ``,
    `要件:`,
    `- 「今月の傾向」「伸びた要素 or 注意点」「経営判断のヒント」の3観点で1段落にまとめる`,
    `- 数字は本文中の値だけを使い、推測値は出さない`,
    `- 余計な見出しや箇条書きは入れず、3〜4文の散文で書く`,
    `- 「〜と思われます」「〜のようです」のような曖昧な語尾は避ける`,
  ].join("\n");

  try {
    const response = await client.messages.create({
      model: MODEL_ID,
      max_tokens: 600,
      messages: [{ role: "user", content: userPrompt }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    const summary = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";
    if (!summary) {
      return Response.json({ summary: buildFallbackSummary(body) });
    }
    return Response.json({ summary });
  } catch (e) {
    const message = e instanceof Error ? e.message : "AI要約の生成に失敗しました";
    return Response.json(
      { error: message, summary: buildFallbackSummary(body) },
      { status: 200 },
    );
  }
}
