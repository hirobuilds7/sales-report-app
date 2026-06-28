import CsvDropzone from "@/components/CsvDropzone";
import {
  Sparkles,
  Clock,
  TrendingUp,
  MessageSquare,
  FileText,
  Shield,
} from "lucide-react";

export default function Home() {
  return (
    <div className="flex-1">
      {/* Hero */}
      <section className="border-b border-slate-200 bg-gradient-to-b from-white to-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-14 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              <Sparkles className="h-3.5 w-3.5" />
              業務ツールサンプル / 旗艦出品のデモ
            </span>
            <h1 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
              Excelで毎月やってる売上集計を、
              <br className="hidden sm:block" />
              <span className="text-blue-700">CSVドラッグ→1クリック</span>
              で月次レポートに。
            </h1>
            <p className="mt-4 text-slate-600 leading-relaxed">
              Amazon・楽天・Shopifyなどから降ってくる売上CSVを取り込むだけで、ダッシュボード・前年同月比・商品TOP10・経営者向け月次サマリを自動生成。さらに、データを文脈にした
              <span className="font-semibold text-slate-800">AIが「来月どう動くべきか」まで答える</span>
              業務ツールです。
            </p>
            <div className="mt-6">
              <CsvDropzone />
            </div>
            <p className="mt-3 text-xs text-slate-500">
              ※ アップロードしたCSVはブラウザ内（localStorage）でのみ扱います。サーバには送信されません。
            </p>
          </div>

          {/* Before/After visualization */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">Before</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">
                Excel月末作業（3〜4時間）
              </p>
              <div className="mt-3 space-y-1.5 text-xs">
                <div className="rounded bg-slate-100 px-2 py-1 text-slate-600">
                  amazon_sales.csv を開く
                </div>
                <div className="rounded bg-slate-100 px-2 py-1 text-slate-600">
                  rakuten_export.csv をコピペ
                </div>
                <div className="rounded bg-slate-100 px-2 py-1 text-slate-600">
                  shopify_orders.csv 結合
                </div>
                <div className="rounded bg-slate-100 px-2 py-1 text-slate-600">
                  ピボットを毎月作り直し
                </div>
                <div className="rounded bg-slate-100 px-2 py-1 text-slate-600">
                  グラフをスクショ → 共有
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 shadow-sm">
              <p className="text-xs font-medium text-blue-700">After</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                このツール（5秒）
              </p>
              <div className="mt-3 space-y-1.5 text-xs">
                <div className="rounded bg-white px-2 py-1 text-slate-700 border border-blue-100">
                  CSVをドラッグ＆ドロップ
                </div>
                <div className="rounded bg-white px-2 py-1 text-slate-700 border border-blue-100">
                  ダッシュボード自動描画
                </div>
                <div className="rounded bg-white px-2 py-1 text-slate-700 border border-blue-100">
                  前月比・前年同月比カード
                </div>
                <div className="rounded bg-white px-2 py-1 text-slate-700 border border-blue-100">
                  AIが今月の傾向を要約
                </div>
                <div className="rounded bg-white px-2 py-1 text-slate-700 border border-blue-100">
                  チャットで打ち手を相談
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            このサンプルでできること
          </h2>
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard
              icon={<Clock className="h-5 w-5" />}
              title="複数チャネルCSVを統合"
              body="Amazon・楽天・Shopify など列名がバラバラでも、別名解決でまとめて取り込み。"
            />
            <FeatureCard
              icon={<TrendingUp className="h-5 w-5" />}
              title="ダッシュボード自動描画"
              body="売上推移・チャネル別シェア・商品TOP10・前月比/前年同月比カード。"
            />
            <FeatureCard
              icon={<FileText className="h-5 w-5" />}
              title="経営者向け月次レポート"
              body="ページを開くだけで、月次サマリをそのまま共有可能。Markdownで保存もOK。"
            />
            <FeatureCard
              icon={<Sparkles className="h-5 w-5" />}
              title="AI要約コメント"
              body="数字の動きをClaudeが3〜4文で要約。「何が起きてるか」を読み解くひと押し。"
            />
            <FeatureCard
              icon={<MessageSquare className="h-5 w-5" />}
              title="AI改善提案チャット"
              body="「来月どう動くべき？」「この商品なんで伸びた？」を売上データを文脈にClaudeと対話。"
            />
            <FeatureCard
              icon={<Shield className="h-5 w-5" />}
              title="ブラウザ内で完結"
              body="アップロードCSVはローカル保存。AI連携時のみサーバへ匿名化済みの要約データを送信。"
            />
          </div>
        </div>
      </section>

      {/* Context block */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-12 grid lg:grid-cols-3 gap-8">
          <div>
            <h3 className="text-sm font-semibold text-blue-700">想定ユーザー</h3>
            <p className="mt-2 text-slate-700 text-sm leading-relaxed">
              個人事業主〜小規模ECの店長・運営担当者。月末に複数チャネルのCSVを集計・サマリ作成している方。
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-blue-700">置き換える業務</h3>
            <p className="mt-2 text-slate-700 text-sm leading-relaxed">
              Excelの手作業ピボット・チャネル別集計のコピペ・経営層への月次報告書作成。
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-blue-700">カスタマイズ前提</h3>
            <p className="mt-2 text-slate-700 text-sm leading-relaxed">
              これは旗艦出品の業務ツールサンプルです。実案件では、お客様のCSV仕様・KPI・出力フォーマット（PDF/Slack/メール送付）に合わせて作り込みます。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-blue-700">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
          {icon}
        </span>
        <span className="text-sm font-semibold text-slate-900">{title}</span>
      </div>
      <p className="mt-3 text-sm text-slate-600 leading-relaxed">{body}</p>
    </div>
  );
}
