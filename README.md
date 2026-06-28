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

Vercelへの自動デプロイを想定しています。環境変数 `ANTHROPIC_API_KEY` を設定してください。

## ライセンス

このサンプルのコードは MIT License で公開しています。
