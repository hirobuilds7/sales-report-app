import Link from "next/link";
import { FileSpreadsheet } from "lucide-react";

export default function EmptyDataset({ purpose }: { purpose: string }) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-20 text-center">
      <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
        <FileSpreadsheet className="h-7 w-7" />
      </div>
      <h2 className="mt-4 text-xl font-semibold text-slate-900">
        まだCSVが読み込まれていません
      </h2>
      <p className="mt-2 text-slate-600">
        {purpose}には売上データが必要です。トップページからサンプルを読み込むか、自社のCSVをアップロードしてください。
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        トップに戻ってサンプルを開く
      </Link>
    </div>
  );
}
