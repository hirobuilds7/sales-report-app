"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, Send, X, Sparkles, Loader2 } from "lucide-react";
import { useDataset } from "@/lib/store";
import { buildContextPack } from "@/lib/context-pack";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "来月どう動くべき？",
  "伸びた商品は何？理由を推測して",
  "弱いチャネルと打ち手を教えて",
];

export default function AiChatWidget() {
  const { dataset } = useDataset();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const context = useMemo(
    () => (dataset ? buildContextPack(dataset.rows, dataset.sourceName) : null),
    [dataset],
  );

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, open]);

  const send = useCallback(
    async (text: string) => {
      if (!context || sending || !text.trim()) return;
      const userMsg: Msg = { role: "user", content: text.trim() };
      const newHistory = [...messages, userMsg];
      setMessages([...newHistory, { role: "assistant", content: "" }]);
      setInput("");
      setSending(true);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: newHistory, context }),
        });
        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const copy = prev.slice();
            copy[copy.length - 1] = { role: "assistant", content: acc };
            return copy;
          });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "通信エラー";
        setMessages((prev) => {
          const copy = prev.slice();
          copy[copy.length - 1] = {
            role: "assistant",
            content: `エラーが発生しました: ${msg}`,
          };
          return copy;
        });
      } finally {
        setSending(false);
      }
    },
    [context, messages, sending],
  );

  if (!dataset) return null;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="AIに相談する"
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-lg hover:bg-blue-700"
        >
          <Sparkles className="h-4 w-4" />
          AIに相談する
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-40 w-[min(420px,calc(100vw-2.5rem))] h-[min(560px,calc(100vh-4rem))] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <MessageSquare className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">売上アドバイザー</p>
                <p className="text-xs text-slate-500">あなたの売上データを文脈に回答</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              aria-label="閉じる"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-sm text-slate-600 space-y-3">
                <p>
                  ダッシュボードの売上データを文脈に、経営判断の相談に答えます。
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={[
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed",
                  m.role === "user"
                    ? "ml-auto bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-800",
                ].join(" ")}
              >
                {m.content || (sending && i === messages.length - 1 ? (
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    考え中…
                  </span>
                ) : "")}
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="border-t border-slate-200 px-3 py-3 flex items-end gap-2"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder="売上について聞いてみる…"
              className="flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300 max-h-32"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              aria-label="送信"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
