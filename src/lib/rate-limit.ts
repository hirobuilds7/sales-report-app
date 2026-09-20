/**
 * 公開デモ用の回数制限（2026-09-20 追加）
 * ------------------------------------------------------------------
 * 目的＝`/api/chat` `/api/summarize` が無制限に叩かれて Anthropic API 代が
 *       青天井になるのを防ぐ（このデモの API キーは Hiro の財布から出とる）。
 *
 * 実装の型＝**追加サービス無し**（KV / Durable Object / Upstash 等の契約が要らん形）。
 *   ① モジュールスコープのメモリ（同一 isolate 内で即効・0ms）
 *   ② Cloudflare Cache API（`caches.default`）＝同一 colo 内なら isolate をまたいで残る
 *   ①②の大きい方を採用＝どちらかが消えても緩くならん側に倒す。
 *
 * ⚠️ 限界（正直に書いとく）＝Cache API は colo（データセンタ）単位。
 *    世界中の colo から同時に叩かれると「1日300回 × colo 数」まで通りうる。
 *    ★最後の砦は Anthropic Console の月額上限 $10（2026-06-28 Hiro 設定済み）。
 *    もっと厳密にやるなら Workers の ratelimit binding（GA・無料・ただし period は
 *    10秒 or 60秒のみ＝日次が作れん）か Durable Object。今は要らん。
 *
 * ★数値を変えたいときは下の LIMITS だけ触る。
 */

/** 🔴 ここが定数の置き場＝制限値を変えるときはここだけ触る */
export const LIMITS = {
  /** 同一 IP：1分あたりの AI API 呼び出し回数 */
  IP_PER_MINUTE: 10,
  /** 同一 IP：1日あたりの AI API 呼び出し回数 */
  IP_PER_DAY: 50,
  /** デモ全体：1日あたりの AI API 呼び出し回数（＝Hiro の財布の天井） */
  GLOBAL_PER_DAY: 300,
  /** 1メッセージ（ユーザー入力）の最大文字数 */
  MAX_INPUT_CHARS: 2000,
  /** チャット履歴として受け付ける最大メッセージ数 */
  MAX_HISTORY_MESSAGES: 20,
  /** AI 側の発話として受け付ける最大文字数（max_tokens 1200 の実測を超える余裕を持たす） */
  MAX_ASSISTANT_CHARS: 8000,
  /** 1リクエストで受け付ける本文の合計文字数 */
  MAX_TOTAL_CHARS: 30000,
  /** 文脈データ（ContextPack / 月次データ）の配列上限＝プロンプト肥大＝トークン代の防波堤 */
  MAX_CONTEXT_MONTHS: 60,
  MAX_CONTEXT_CHANNELS: 30,
  MAX_CONTEXT_PRODUCTS: 20,
  /** 商品名・チャネル名など1項目あたりの最大文字数 */
  MAX_FIELD_CHARS: 120,
} as const;

/** 日次ウィンドウの区切りを日本時間の 0:00 に合わせる（UTC 0:00 ＝ JST 9:00 やと分かりにくい） */
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;

type Rule = {
  /** バケット名（ログ・ヘッダ用） */
  name: string;
  /** 数える単位＝IP アドレス or "all"（デモ全体） */
  scope: string;
  windowMs: number;
  /** ウィンドウ開始をずらす量（日次は JST 0:00 起点） */
  offsetMs: number;
  limit: number;
  /** 超過時に利用者へ出す日本語メッセージ */
  message: string;
};

export type RateLimitVerdict =
  | { ok: true }
  | { ok: false; rule: Rule; retryAfterSec: number };

// ---------------------------------------------------------------- ① メモリ

type MemoryEntry = { count: number; resetAt: number };
const memory = new Map<string, MemoryEntry>();

function sweepMemory(now: number): void {
  if (memory.size < 2000) return;
  for (const [k, v] of memory) {
    if (v.resetAt <= now) memory.delete(k);
  }
}

// ------------------------------------------------- ② Cloudflare Cache API

type CacheLike = {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
};

/** Workers 以外（`next dev` の Node ランタイム等）では undefined ＝①のメモリだけで動く */
function edgeCache(): CacheLike | null {
  try {
    const c = (globalThis as unknown as { caches?: { default?: CacheLike } }).caches;
    return c?.default ?? null;
  } catch {
    return null;
  }
}

/** Cache API のキーは「実在せん自ドメイン風の URL」にする（外から踏めん・衝突せん） */
function cacheRequest(bucketKey: string): Request {
  return new Request(
    `https://rate-limit.sales-report-app.invalid/${encodeURIComponent(bucketKey)}`,
    { method: "GET" },
  );
}

async function cacheRead(bucketKey: string): Promise<number> {
  const cache = edgeCache();
  if (!cache) return 0;
  try {
    const hit = await cache.match(cacheRequest(bucketKey));
    if (!hit) return 0;
    const n = Number((await hit.text()).trim());
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

async function cacheWrite(bucketKey: string, count: number, ttlSec: number): Promise<void> {
  const cache = edgeCache();
  if (!cache) return;
  try {
    await cache.put(
      cacheRequest(bucketKey),
      new Response(String(count), {
        headers: {
          "Content-Type": "text/plain",
          "Cache-Control": `max-age=${Math.max(1, Math.ceil(ttlSec))}`,
        },
      }),
    );
  } catch {
    /* Cache API が使えん環境＝①のメモリだけで動く（黙って続行） */
  }
}

// ------------------------------------------------------------ 本体

/** 固定ウィンドウ方式。全ルールを先に見てから、通る時だけまとめて加算する */
async function consume(rules: Rule[]): Promise<RateLimitVerdict> {
  const now = Date.now();

  const states = await Promise.all(
    rules.map(async (rule) => {
      const shifted = now + rule.offsetMs;
      const windowStart = Math.floor(shifted / rule.windowMs) * rule.windowMs - rule.offsetMs;
      const resetAt = windowStart + rule.windowMs;
      const key = `${rule.name}|${rule.scope}|${windowStart}`;

      const mem = memory.get(key);
      const memCount = mem && mem.resetAt > now ? mem.count : 0;
      const cacheCount = await cacheRead(key);

      return { rule, key, resetAt, count: Math.max(memCount, cacheCount) };
    }),
  );

  const over = states.find((s) => s.count >= s.rule.limit);
  if (over) {
    return {
      ok: false,
      rule: over.rule,
      retryAfterSec: Math.max(1, Math.ceil((over.resetAt - now) / 1000)),
    };
  }

  await Promise.all(
    states.map(async (s) => {
      const next = s.count + 1;
      memory.set(s.key, { count: next, resetAt: s.resetAt });
      await cacheWrite(s.key, next, (s.resetAt - now) / 1000);
    }),
  );

  sweepMemory(now);
  return { ok: true };
}

/** Cloudflare が付ける実クライアント IP。取れん時は "unknown"（全員1バケット＝安全側） */
export function clientIp(req: Request): string {
  const h = req.headers;
  const cf = h.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip")?.trim() || "unknown";
}

/** AI を呼ぶ手前で1回だけ呼ぶ。通れば内部カウンタが +1 される */
export async function checkRateLimit(req: Request): Promise<RateLimitVerdict> {
  const ip = clientIp(req);
  return consume([
    {
      name: "ip-minute",
      scope: ip,
      windowMs: MINUTE_MS,
      offsetMs: 0,
      limit: LIMITS.IP_PER_MINUTE,
      message: `アクセスが集中しています。1分ほど待ってからもう一度お試しください。（公開サンプルのため、AI機能は1分あたり${LIMITS.IP_PER_MINUTE}回までに制限しています）`,
    },
    {
      name: "ip-day",
      scope: ip,
      windowMs: DAY_MS,
      offsetMs: JST_OFFSET_MS,
      limit: LIMITS.IP_PER_DAY,
      message: `本日のAI機能のご利用が上限に達しました。（公開サンプルのため1日${LIMITS.IP_PER_DAY}回まで）明日またお試しください。ダッシュボードとレポートの集計はこのまま全機能ご利用いただけます。`,
    },
    {
      name: "global-day",
      scope: "all",
      windowMs: DAY_MS,
      offsetMs: JST_OFFSET_MS,
      limit: LIMITS.GLOBAL_PER_DAY,
      message: `本日のAI機能の公開枠（全体で1日${LIMITS.GLOBAL_PER_DAY}回）を使い切りました。明日またお試しください。ダッシュボードとレポートの集計はこのまま全機能ご利用いただけます。`,
    },
  ]);
}

function limitHeaders(v: Extract<RateLimitVerdict, { ok: false }>): Record<string, string> {
  return {
    "Retry-After": String(v.retryAfterSec),
    "X-RateLimit-Scope": v.rule.name,
    "X-RateLimit-Limit": String(v.rule.limit),
    "Cache-Control": "no-store",
  };
}

/** `/api/summarize` 用＝クライアントが `data.error` を読む形 */
export function rateLimitJsonResponse(v: Extract<RateLimitVerdict, { ok: false }>): Response {
  return Response.json(
    { error: v.rule.message },
    { status: 429, headers: limitHeaders(v) },
  );
}

/** `/api/chat` 用＝クライアントが本文をそのまま読む形 */
export function rateLimitTextResponse(v: Extract<RateLimitVerdict, { ok: false }>): Response {
  return new Response(v.rule.message, {
    status: 429,
    headers: { ...limitHeaders(v), "Content-Type": "text/plain; charset=utf-8" },
  });
}

// ------------------------------------------------- 入力長のガード（トークン代の防波堤）

export type InvalidInput = { message: string };

export function badRequestJson(err: InvalidInput): Response {
  return Response.json({ error: err.message }, { status: 400, headers: { "Cache-Control": "no-store" } });
}

export function badRequestText(err: InvalidInput): Response {
  return new Response(err.message, {
    status: 400,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/** 文字列を安全側に丸める（undefined / 数値 / 長すぎ を吸収） */
export function trimField(v: unknown, max: number = LIMITS.MAX_FIELD_CHARS): string {
  if (typeof v !== "string") return String(v ?? "").slice(0, max);
  return v.length > max ? `${v.slice(0, max)}…` : v;
}

/** チャットの messages を検査。問題なければ null */
export function validateChatMessages(
  messages: { role: string; content: unknown }[],
): InvalidInput | null {
  if (messages.length > LIMITS.MAX_HISTORY_MESSAGES) {
    return {
      message: `会話が長くなりすぎました（${LIMITS.MAX_HISTORY_MESSAGES}往復まで）。チャットを開き直してからお試しください。`,
    };
  }
  let total = 0;
  for (const m of messages) {
    const content = typeof m.content === "string" ? m.content : "";
    total += content.length;
    if (m.role === "user" && content.length > LIMITS.MAX_INPUT_CHARS) {
      return {
        message: `ご質問が長すぎます（1回あたり${LIMITS.MAX_INPUT_CHARS.toLocaleString("ja-JP")}文字まで）。現在 ${content.length.toLocaleString("ja-JP")} 文字です。短く分けてお送りください。`,
      };
    }
    if (m.role !== "user" && content.length > LIMITS.MAX_ASSISTANT_CHARS) {
      return { message: "送信されたデータが不正です。チャットを開き直してからお試しください。" };
    }
  }
  if (total > LIMITS.MAX_TOTAL_CHARS) {
    return {
      message: `会話が長くなりすぎました（合計${LIMITS.MAX_TOTAL_CHARS.toLocaleString("ja-JP")}文字まで）。チャットを開き直してからお試しください。`,
    };
  }
  return null;
}

/** 配列の長さと文字列長を検査（月次データ・文脈データ共通）。問題なければ null */
export function validateTabularInput(
  arrays: { label: string; value: unknown; max: number }[],
  strings: { label: string; value: unknown }[],
): InvalidInput | null {
  for (const a of arrays) {
    if (a.value === undefined || a.value === null) continue;
    if (!Array.isArray(a.value)) {
      return { message: "送信されたデータの形式が正しくありません。" };
    }
    if (a.value.length > a.max) {
      return {
        message: `${a.label}の件数が上限（${a.max}件）を超えています。件数を絞ってお試しください。`,
      };
    }
  }
  for (const s of strings) {
    if (typeof s.value === "string" && s.value.length > LIMITS.MAX_INPUT_CHARS) {
      return {
        message: `${s.label}が長すぎます（${LIMITS.MAX_INPUT_CHARS.toLocaleString("ja-JP")}文字まで）。現在 ${s.value.length.toLocaleString("ja-JP")} 文字です。`,
      };
    }
  }
  return null;
}
