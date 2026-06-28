"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { formatYen } from "@/lib/aggregate";

const COLORS = ["#2563eb", "#0ea5e9", "#6366f1", "#14b8a6", "#f59e0b", "#ef4444"];

type Datum = { channel: string; revenue: number };

export default function ChannelPieChart({ data }: { data: Datum[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="revenue"
            nameKey="channel"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={95}
            paddingAngle={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
            formatter={(v, _name, item) => [
              formatYen(typeof v === "number" ? v : Number(v) || 0),
              (item?.payload as { channel?: string } | undefined)?.channel ?? "",
            ]}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            wrapperStyle={{ fontSize: 12, color: "#475569" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
