"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";
import type { TimeSeriesPoint } from "@/types";

const AXIS_PROPS = {
  stroke: "var(--muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

const TOOLTIP_STYLE = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  fontSize: "12px",
  color: "var(--popover-foreground)",
} as const;

function shortDate(iso: unknown) {
  return new Date(String(iso)).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}

export function QueriesChart({ data }: { data: TimeSeriesPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Queries over time</CardTitle>
      </CardHeader>
      <CardContent className="pl-0">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="queriesFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" tickFormatter={shortDate} {...AXIS_PROPS} />
            <YAxis width={40} tickFormatter={formatNumber} {...AXIS_PROPS} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelFormatter={shortDate}
              formatter={(value) => [formatNumber(Number(value)), "Queries"]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill="url(#queriesFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function ActiveUsersChart({ data }: { data: TimeSeriesPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Active users</CardTitle>
      </CardHeader>
      <CardContent className="pl-0">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" tickFormatter={shortDate} {...AXIS_PROPS} />
            <YAxis width={40} tickFormatter={formatNumber} {...AXIS_PROPS} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelFormatter={shortDate}
              formatter={(value) => [formatNumber(Number(value)), "Users"]}
              cursor={{ fill: "var(--accent)", opacity: 0.4 }}
            />
            <Bar dataKey="value" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function TokenUsageChart({
  data,
}: {
  data: { date: string; input: number; output: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Token consumption</CardTitle>
      </CardHeader>
      <CardContent className="pl-0">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" tickFormatter={shortDate} {...AXIS_PROPS} />
            <YAxis width={48} tickFormatter={formatNumber} {...AXIS_PROPS} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelFormatter={shortDate}
              formatter={(value, name) => [
                formatNumber(Number(value)),
                name === "input" ? "Input tokens" : "Output tokens",
              ]}
              cursor={{ fill: "var(--accent)", opacity: 0.4 }}
            />
            <Bar dataKey="input" stackId="tokens" fill="var(--chart-3)" />
            <Bar
              dataKey="output"
              stackId="tokens"
              fill="var(--chart-4)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function TopDocumentsChart({
  data,
}: {
  data: { documentId: string; name: string; references: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Most referenced documents</CardTitle>
      </CardHeader>
      <CardContent className="pl-0">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" tickFormatter={formatNumber} {...AXIS_PROPS} />
            <YAxis
              type="category"
              dataKey="name"
              width={140}
              tickFormatter={(name: string) =>
                name.length > 18 ? `${name.slice(0, 18)}…` : name
              }
              {...AXIS_PROPS}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value) => [formatNumber(Number(value)), "References"]}
              cursor={{ fill: "var(--accent)", opacity: 0.4 }}
            />
            <Bar dataKey="references" radius={[0, 4, 4, 0]}>
              {data.map((entry, i) => (
                <Cell
                  key={entry.documentId}
                  fill={`var(--chart-${(i % 5) + 1})`}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
