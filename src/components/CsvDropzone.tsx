"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { parseSalesCsv } from "@/lib/parse-csv";
import { useDataset } from "@/lib/store";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "success"; rows: number };

export default function CsvDropzone() {
  const router = useRouter();
  const { setDataset } = useDataset();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setStatus({ kind: "loading" });
      try {
        const text = await file.text();
        const result = parseSalesCsv(text);
        if (!result.ok) {
          setStatus({ kind: "error", message: result.error });
          return;
        }
        if (result.rows.length === 0) {
          setStatus({ kind: "error", message: "有効な行が見つかりませんでした。" });
          return;
        }
        setDataset({
          rows: result.rows,
          sourceName: file.name,
          loadedAt: new Date().toISOString(),
        });
        setStatus({ kind: "success", rows: result.rows.length });
        setTimeout(() => router.push("/dashboard"), 400);
      } catch (e) {
        setStatus({
          kind: "error",
          message: e instanceof Error ? e.message : "読み込みに失敗しました。",
        });
      }
    },
    [router, setDataset],
  );

  const loadSample = useCallback(async () => {
    setStatus({ kind: "loading" });
    try {
      const res = await fetch("/sample-sales.csv");
      if (!res.ok) throw new Error(`サンプル読込失敗: ${res.status}`);
      const text = await res.text();
      const result = parseSalesCsv(text);
      if (!result.ok) {
        setStatus({ kind: "error", message: result.error });
        return;
      }
      setDataset({
        rows: result.rows,
        sourceName: "sample-sales.csv（デモ）",
        loadedAt: new Date().toISOString(),
      });
      setStatus({ kind: "success", rows: result.rows.length });
      setTimeout(() => router.push("/dashboard"), 400);
    } catch (e) {
      setStatus({
        kind: "error",
        message: e instanceof Error ? e.message : "サンプル読み込みに失敗しました。",
      });
    }
  }, [router, setDataset]);

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={loadSample}
          disabled={status.kind === "loading"}
          className="group rounded-xl bg-blue-600 px-5 py-4 text-left text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-60"
        >
          <div className="flex items-center gap-2 text-sm font-medium opacity-90">
            <FileSpreadsheet className="h-4 w-4" />
            まずは触ってみる
          </div>
          <div className="mt-1 text-lg font-semibold">サンプルデータで開く</div>
          <div className="mt-1 text-xs opacity-80">
            小売EC・3チャネル × 12ヶ月のサンプル売上を即読み込み
          </div>
        </button>

        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
          className={[
            "relative rounded-xl border-2 border-dashed px-5 py-4 cursor-pointer transition-colors",
            dragOver
              ? "border-blue-500 bg-blue-50"
              : "border-slate-300 bg-white hover:border-slate-400",
          ].join(" ")}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Upload className="h-4 w-4" />
            自社のデータで試す
          </div>
          <div className="mt-1 text-lg font-semibold text-slate-900">CSVをドロップ／選択</div>
          <div className="mt-1 text-xs text-slate-500">
            日付・チャネル・商品名・数量・単価の列があればOK
          </div>
        </label>
      </div>

      {status.kind === "loading" && (
        <p className="flex items-center gap-2 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          読み込み中…
        </p>
      )}
      {status.kind === "success" && (
        <p className="flex items-center gap-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          {status.rows.toLocaleString()}行 読み込み完了。ダッシュボードへ移動します…
        </p>
      )}
      {status.kind === "error" && (
        <p className="flex items-start gap-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{status.message}</span>
        </p>
      )}
    </div>
  );
}
