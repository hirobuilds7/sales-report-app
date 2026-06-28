import { formatYen, formatPercent, type ComparisonStat } from "@/lib/aggregate";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";

export function MetricCard({
  label,
  value,
  hint,
  emphasis = false,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-xl border p-5 shadow-sm",
        emphasis
          ? "border-blue-200 bg-gradient-to-br from-blue-50 to-white"
          : "border-slate-200 bg-white",
      ].join(" ")}
    >
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function CompareCard({
  label,
  stat,
  hint,
}: {
  label: string;
  stat: ComparisonStat;
  hint?: string;
}) {
  const positive = stat.deltaRate !== null && stat.deltaRate > 0;
  const negative = stat.deltaRate !== null && stat.deltaRate < 0;
  const neutral = !positive && !negative;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{formatYen(stat.current)}</p>
      <div className="mt-2 flex items-center gap-1.5 text-sm">
        <span
          className={[
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
            positive
              ? "bg-emerald-50 text-emerald-700"
              : negative
                ? "bg-red-50 text-red-700"
                : "bg-slate-100 text-slate-600",
          ].join(" ")}
        >
          {positive ? (
            <ArrowUp className="h-3 w-3" />
          ) : negative ? (
            <ArrowDown className="h-3 w-3" />
          ) : (
            <Minus className="h-3 w-3" />
          )}
          {formatPercent(stat.deltaRate)}
        </span>
        <span className="text-slate-500 text-xs">前: {formatYen(stat.previous)}</span>
      </div>
      {hint && <p className="mt-2 text-xs text-slate-400">{hint}</p>}
      {neutral && stat.deltaRate === null && (
        <p className="mt-2 text-xs text-slate-400">比較対象月のデータなし</p>
      )}
    </div>
  );
}
