# 売上レポートアプリ（Next 16 / App Router / API Route 2本）を Cloudflare Workers へ
# ビルド + デプロイ + 検証する
# 使い方:
#   検証だけ（デプロイせん）: powershell -ExecutionPolicy Bypass -File .\deploy-cf.ps1 -DryRun
#   本番へ出す             : powershell -ExecutionPolicy Bypass -File .\deploy-cf.ps1
# 正本: memory/project-cloudflare.md（段階②）／設計書 D:/work/ops/sekkei/2026-09-03_cloudflare-stage2.md
#
# 🔴 前提＝ANTHROPIC_API_KEY は wrangler secret に入っとること（1回だけ手で入れる）:
#      npx wrangler secret put ANTHROPIC_API_KEY
#    ★secret が未設定でもアプリは落ちん（route.ts が fallback を返す設計）＝
#      だから「200 が返った」だけでは AI 要約が生きとる証拠にならん。
#      下の検証は本文に fallback の目印（「ANTHROPIC_API_KEY」の文字）が出てへんかまで見る。
param(
  [switch]$DryRun
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

# 1) ビルド（.open-next/ は opennextjs-cloudflare が毎回作り直す）
npm run cf:build
if ($LASTEXITCODE -ne 0) { Write-Error "cf:build failed (exit $LASTEXITCODE)" }

# 1-b) 成果物の実在チェック＝「ビルドが通った」やなく「出荷物が在る」を見る
if (-not (Test-Path "$root\.open-next\worker.js")) { Write-Error ".open-next\worker.js が無い" }
if (-not (Test-Path "$root\.open-next\assets"))    { Write-Error ".open-next\assets が無い" }
$assets = Get-ChildItem -Recurse -File "$root\.open-next\assets"
$assetMB = [math]::Round((($assets | Measure-Object Length -Sum).Sum / 1MB), 2)
Write-Output ("assets = {0} files / {1} MB  |  worker.js = {2} bytes" -f `
  $assets.Count, $assetMB, (Get-Item "$root\.open-next\worker.js").Length)

# 1-c) ★秘密の漏れ検査＝出荷物に APIキーの実体が混ざってへんか（sk-ant- で始まる文字列）
$leak = Select-String -Path "$root\.open-next\worker.js" -Pattern 'sk-ant-' -SimpleMatch -Quiet
if ($leak) { Write-Error "worker.js に APIキーらしき文字列が混ざっとる＝出荷中止" }
Write-Output "OK  出荷物に sk-ant- 文字列なし"

# 2) dry-run＝本番に触らずに「wrangler が受け付ける形か」を確認する（Opus 段はここまで）
if (Test-Path "$root\.wrangler-dry") { Remove-Item -Recurse -Force "$root\.wrangler-dry" }
npx --yes wrangler deploy --dry-run --outdir=.wrangler-dry
if ($LASTEXITCODE -ne 0) { Write-Error "wrangler dry-run failed (exit $LASTEXITCODE)" }
if ($DryRun) { Write-Output "DRY-RUN OK（-DryRun 指定＝ここで終了。本番デプロイはしてへん）"; exit 0 }

# 3) デプロイ（★ここから先は本番。Fable が実行する段）
npm run cf:deploy
if ($LASTEXITCODE -ne 0) { Write-Error "cf:deploy failed (exit $LASTEXITCODE)" }

# 4) 検証＝出荷される値そのもの
$base = "https://sales-report-app.hirobuilds7.workers.dev"

Write-Output "伝播待ち..."
$ready = $false
for ($i = 1; $i -le 30; $i++) {
  $code = curl.exe -s -o NUL -w "%{http_code}" --max-time 10 "$base/"
  if ($code -eq "200") { Write-Output ("  {0}回目で 200" -f $i); $ready = $true; break }
  Start-Sleep -Seconds 3
}
if (-not $ready) { Write-Error "90秒待っても 200 が返らん＝デプロイを疑う" }

$paths = @("/", "/dashboard", "/report")
$fail = 0
foreach ($p in $paths) {
  $code = curl.exe -s -o NUL -w "%{http_code}" --max-time 30 "$base$p"
  if ($code -eq "200") { Write-Output ("OK  {0} -> {1}" -f $p, $code) }
  else { Write-Output ("NG  {0} -> {1}" -f $p, $code); $fail++ }
}

# 4-b) API 実測＝POST /api/summarize（本体は README「API の叩き方」のサンプルと同じ形）
$sample = Join-Path $root "scripts\sample-summarize-body.json"
if (-not (Test-Path $sample)) { Write-Error "$sample が無い" }
$tmp = [System.IO.Path]::GetTempFileName()
$apiCode = curl.exe -s -o $tmp -w "%{http_code}" --max-time 90 `
  -X POST "$base/api/summarize" -H "Content-Type: application/json" --data-binary "@$sample"
$apiBody = Get-Content -Raw -Encoding UTF8 $tmp
Remove-Item $tmp -Force
if ($apiCode -eq "200") { Write-Output "OK  POST /api/summarize -> 200" } else { Write-Output ("NG  POST /api/summarize -> {0}" -f $apiCode); $fail++ }
# ★ここが肝＝secret 未設定でも 200 は返る（fallback）。本物の AI 要約が出とるかを本文で見る。
if ($apiBody -match "ANTHROPIC_API_KEY") {  # ★ASCIIだけで照合（2026-09-03 実害＝cp932読みで日本語が外れて偽OK）
  Write-Output "NG  fallback 文が返っとる＝wrangler secret put ANTHROPIC_API_KEY が未実施"
  $fail++
} else { Write-Output "OK  fallback 文やない＝AI要約が生きとる" }
Write-Output ("    body(先頭200字): {0}" -f $apiBody.Substring(0, [Math]::Min(200, $apiBody.Length)))

# 5) ★このアプリは noindex を付けん本物の営業面＝X-Robots-Tag が"出てへん"ことを確認する側
Write-Output "--- headers（X-Robots-Tag が出てへんのが正） ---"
$hdr = curl.exe -sI --max-time 30 "$base/"
$hdr
if ($hdr -match "(?i)x-robots-tag") { Write-Output "NG  X-Robots-Tag が付いとる（営業面やから付けたらアカン）"; $fail++ }
else { Write-Output "OK  X-Robots-Tag なし" }

if ($fail -gt 0) { Write-Error ("VERIFY FAILED: {0} check(s) failed" -f $fail) }
Write-Output "VERIFY OK: ページ3本 200 + API 200(本物の要約) + noindex なし"
