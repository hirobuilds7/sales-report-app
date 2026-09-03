// OpenNext（Cloudflare Workers アダプタ）の最小構成
// 正本: memory/project-cloudflare.md ／ 設計書 D:/work/ops/sekkei/2026-09-03_cloudflare-stage2.md
// 公式（https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/）の最小形そのまま。
// ISR/増分キャッシュ（R2 等）は使わん＝このアプリは静的ページ＋API Route 2本だけで ISR ルートが無い。
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig();
