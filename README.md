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

### Vercel（旧）

Vercelへの自動デプロイを想定していました。環境変数 `ANTHROPIC_API_KEY` を設定してください。

## ライセンス

このサンプルのコードは MIT License で公開しています。
