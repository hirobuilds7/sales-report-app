import Anthropic from "@anthropic-ai/sdk";
import type { ContextPack } from "@/lib/context-pack";
import { contextPackToPromptText } from "@/lib/context-pack";

export const runtime = "edge";

const MODEL_ID = process.env.CHAT_MODEL ?? "claude-sonnet-4-6";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatBody = {
  messages: ChatMessage[];
  context: ContextPack;
};

const SYSTEM_PROMPT = `あなたは小売EC事業者の売上データを読み解く経営アドバイザーです。
ユーザーから送られた売上データ（月別・チャネル別・商品別TOP10）を文脈にして、
質問に的確な日本語で答えてください。

ルール:
- 数字を出す時は本文中のデータの値のみを使う。推測値や架空の数字は出さない。
- 「来月の打ち手」「伸びた要因」「注意点」のように具体的に答える。
- 余計な前置きや謙遜はせず、結論から書く。
- 1〜3段落程度の長さに収める。
- データに含まれない情報（在庫・広告費・コスト等）は「データだけからは判断できません」と素直に答える。`;

function fallbackReply(messages: ChatMessage[]): string {
  const last = messages[messages.length - 1];
  return [
    `現在AIチャットを利用できません（ANTHROPIC_API_KEYが未設定）。`,
    `頂いた質問「${last?.content ?? ""}」については、ダッシュボードのチャネル別売上・商品TOP10・月別推移をご参照ください。`,
  ].join("\n");
}

export async function POST(req: Request) {
  let body: ChatBody;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return Response.json({ error: "messages required" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const text = fallbackReply(body.messages);
    return new Response(text, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const client = new Anthropic({ apiKey });
  const systemPrompt = `${SYSTEM_PROMPT}\n\n以下が現在ユーザーが扱っている売上データです:\n\n${contextPackToPromptText(body.context)}`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const apiStream = client.messages.stream({
          model: MODEL_ID,
          max_tokens: 1200,
          system: systemPrompt,
          messages: body.messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        });
        for await (const event of apiStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "AIチャットでエラーが発生しました";
        controller.enqueue(encoder.encode(`\n\n[エラー: ${msg}]`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      "Connection": "keep-alive",
    },
  });
}
