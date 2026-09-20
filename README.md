# 売上集計＋月次レポート自動化（業務ツールサンプル）

Excelで毎月やっている売上集計を、CSVをドラッグ→1クリックでダッシュボード＋経営者向け月次レポート＋AI要約まで自動生成するWebツールのデモです。

「Excel・スプレッドシートの集計やコピペをAIで自動化します」というココナラ／ランサーズ出品の業務ツールサンプルとして公開しています。

## できること

- **CSV取込み**：複数チャネル（Amazon／楽天／Shopify 等）のCSVを別名解決でまとめて取り込み
- **ダッシュボード**：売上推移グラフ・チャネル別シェア・商品TOP10・前月比/前年同月比カードを自動描画
- **月次レポート**：経営者向けサマリ画面を自動生成。Markdownでダウンロード可
- **AI要約コメント**：数字の動きをClaudeが3〜4文で要約
- **AI改善提案チャット**：「来月どう動くべき？」「この商品なんで伸びた？」を売上データを文脈にClaudeと対話

## 技術スタック

- Next.js 16（App Router）＋ TypeScript ＋ Tailwind CSS v4
- Recharts（グラフ）／ PapaParse（CSV）／ Lucide React（アイコン）
- Anthropic Claude API（`@anthropic-ai/sdk`）
- Vercel（ホスティング）

APIキーはサーバーサイドのAPI Routeで扱い、ブラウザには渡しません。アップロードされたCSVはブラウザのlocalStorageでのみ保持され、サーバーには送信されません。

## 開発

```bash
npm install
cp .env.example .env.local   # ANTHROPIC_API_KEY を埋める
npm run dev
```

http://localhost:3000 で起動します。

サンプルCSVを再生成したい場合：

```bash
npm run gen-sample
```

## デプロイ

### Cloudflare Workers（現行 / OpenNext アダプタ）

```bash
npm run cf:build     # OpenNext で .open-next/ を生成
npm run cf:preview   # ローカルの workerd で確認（http://127.0.0.1:8787）
npm run cf:deploy    # 本番へ
```

環境変数の置き場は2つに分かれます。

| 変数 | 置き場 | 備考 |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | `npx wrangler secret put ANTHROPIC_API_KEY` | 秘密。リポには絶対に置かない |
| `SUMMARIZE_MODEL` | `wrangler.jsonc` の `vars` | 既定 `claude-haiku-4-5` |
| `CHAT_MODEL` | `wrangler.jsonc` の `vars` | 既定 `claude-sonnet-4-6` |

ローカル開発でシークレットを使うときは `.dev.vars.example` を `.dev.vars` にコピーして値を入れます（`.dev.vars` は gitignore 済み）。

デプロイと検証をまとめて回すには `powershell -ExecutionPolicy Bypass -File .\deploy-cf.ps1`（`-DryRun` を付けるとデプロイせず検証だけ）。

### API の叩き方（`POST /api/summarize`）

リクエストボディの実例は `scripts/sample-summarize-body.json` にあります。

```bash
curl -s -X POST http://127.0.0.1:8787/api/summarize   -H "Content-Type: application/json"   --data-binary @scripts/sample-summarize-body.json
```

```json
{
  "month": "2026-07",
  "total": 12480000,
  "prevMonth": { "current": 12480000, "previous": 11250000, "delta": 1230000, "deltaRate": 0.1093 },
  "prevYear":  { "current": 12480000, "previous":  9860000, "delta": 2620000, "deltaRate": 0.2657 },
  "channels":  [{ "channel": "自社EC", "revenue": 5990000, "share": 0.48 }],
  "topProducts": [{ "productName": "オーガニックコットンTシャツ", "category": "アパレル", "revenue": 1840000, "quantity": 460 }]
}
```

レスポンスは `{ "summary": "..." }`。**`ANTHROPIC_API_KEY` が未設定でも 200 が返ります**（テンプレート文へ自動フォールバックし、本文に「ANTHROPIC_API_KEYを設定してください」が入る）。つまり *200 が返った＝AI要約が生きている、ではない* ので、検証では本文まで見てください。

## AI API の回数制限（公開デモ用・2026-09-20 追加）

`/api/chat` と `/api/summarize` は誰でも叩ける公開エンドポイントなので、Anthropic API の従量課金を守るために回数制限を入れています。

🔴 **制限値の定数は `src/lib/rate-limit.ts` の `LIMITS` 1か所にまとまっています。変えるときはここだけ触ってください。**

| 制限 | 既定値 | 超過時 |
| --- | --- | --- |
| 同一IP／1分 | 10 回 | `429` ＋ 日本語メッセージ |
| 同一IP／1日（JST 0:00 区切り） | 50 回 | `429` |
| デモ全体／1日（JST 0:00 区切り） | 300 回 | `429` |
| 1メッセージの入力文字数 | 2,000 字 | `400` |
| チャット履歴 | 20 件 / 合計 30,000 字 | `400` |
| 文脈データの配列 | 月60・チャネル30・商品20 件 | `400`（超過分は AI に渡す前に切り捨て） |

実装は **追加サービス契約なし**（KV / Durable Object / Upstash 等を使わない形）で、

1. モジュールスコープのメモリ（同一 isolate 内は 0ms）
2. Cloudflare Cache API（`caches.default`）＝同じ colo 内なら isolate をまたいで残る

の**大きい方**を採用しています。⚠️ Cache API は colo 単位なので世界中から同時に叩かれると緩くなります。**最後の砦は Anthropic Console 側の月額上限**（設定済み）です。

`400`（入力長オーバー）は回数を消費せず、AI も呼ばれません（チェック順＝入力長 → 回数制限 → AI 呼び出し）。

### 回数制限の確認コマンド

```bash
# 11回連続 → 11回目が 429（1分10回の制限）
for i in $(seq 1 11); do
  curl -s -o /dev/null -w "$i: %{http_code}\n" -X POST "$BASE/api/summarize" \
    -H "Content-Type: application/json" --data-binary @scripts/sample-summarize-body.json
done

# 429 のヘッダ（どの制限に当たったかが x-ratelimit-scope に出る）
curl -s -D - -o /dev/null -X POST "$BASE/api/summarize" \
  -H "Content-Type: application/json" --data-binary @scripts/sample-summarize-body.json \
  | grep -iE "^HTTP|retry-after|x-ratelimit"

# 入力 2,001 字 → 400
node -e 'const b=require("./scripts/sample-summarize-body.json");b.topProducts[0].productName="あ".repeat(2001);console.log(JSON.stringify(b))' > /tmp/big.json
curl -s -w "\n%{http_code}\n" -X POST "$BASE/api/summarize" -H "Content-Type: application/json" --data-binary @/tmp/big.json
```

ローカルで日次制限まで試すときは `CF-Connecting-IP` ヘッダで IP を詐称できます（本番では Cloudflare が上書きするので効きません）。

### Vercel（旧）

Vercelへの自動デプロイを想定していました。環境変数 `ANTHROPIC_API_KEY` を設定してください。

## ライセンス

このサンプルのコードは MIT License で公開しています。
