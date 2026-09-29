"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PLATFORM_COLORS = { Steam: "#4c9be8", Epic: "#b8bcc8" } as const;
const BAR_COLOR = "#f5b942";

const tooltipStyle = {
  contentStyle: {
    background: "oklch(0.205 0 0)",
    border: "1px solid oklch(1 0 0 / 10%)",
    borderRadius: 8,
    fontSize: 12,
  },
  itemStyle: { color: "oklch(0.985 0 0)" },
  labelStyle: { color: "oklch(0.708 0 0)" },
};

export function PlatformPie({
  data,
  unit,
}: {
  data: { name: keyof typeof PLATFORM_COLORS; value: number }[];
  unit: string;
}) {
  const shown = data.filter((d) => d.value > 0);
  if (shown.length === 0) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={shown}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
          stroke="none"
          label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`}
        >
          {shown.map((d) => (
            <Cell key={d.name} fill={PLATFORM_COLORS[d.name]} />
          ))}
        </Pie>
        <Tooltip {...tooltipStyle} formatter={(v) => `${Number(v).toLocaleString("zh-CN")} ${unit}`} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TopPlaytimeChart({ data }: { data: { title: string; hours: number }[] }) {
  if (data.length === 0) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
        <CartesianGrid horizontal={false} stroke="oklch(1 0 0 / 8%)" />
        <XAxis type="number" tick={{ fill: "oklch(0.708 0 0)", fontSize: 12 }} unit=" h" />
        <YAxis
          type="category"
          dataKey="title"
          width={160}
          tick={{ fill: "oklch(0.85 0 0)", fontSize: 12 }}
          tickFormatter={(t: string) => (t.length > 14 ? `${t.slice(0, 13)}…` : t)}
        />
        <Tooltip {...tooltipStyle} cursor={{ fill: "oklch(1 0 0 / 5%)" }} formatter={(v) => [`${v} 小时`, "时长"]} />
        <Bar dataKey="hours" fill={BAR_COLOR} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CompletionChart({ data }: { data: { label: string; count: number }[] }) {
  if (data.every((d) => d.count === 0)) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ right: 8 }}>
        <CartesianGrid vertical={false} stroke="oklch(1 0 0 / 8%)" />
        <XAxis dataKey="label" tick={{ fill: "oklch(0.708 0 0)", fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fill: "oklch(0.708 0 0)", fontSize: 12 }} width={32} />
        <Tooltip {...tooltipStyle} cursor={{ fill: "oklch(1 0 0 / 5%)" }} formatter={(v) => [`${v} 款`, "游戏"]} />
        <Bar dataKey="count" fill={BAR_COLOR} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function Empty() {
  return <p className="py-16 text-center text-sm text-muted-foreground">暂无数据</p>;
}
