import {
  CartesianGrid,
  Line,
  Area,
  ComposedChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toGraphData } from "../calculations/graphData";
import type { DailyScore } from "../calculations/dailyScore";
import { useEffect, useState } from "react";

interface CompletionGraphProps {
  dailyScores: DailyScore[];
}

const BASELINE = 60;

export function CompletionGraph({ dailyScores }: CompletionGraphProps) {
  const fullData = toGraphData(dailyScores);

  // Map data so null values stay null/undefined for Recharts connectNulls={false}
  const chartData = fullData.map((pt) => ({
    ...pt,
    completion: pt.completion !== null ? pt.completion : null,
    baseline: BASELINE,
  }));

  const [isDark, setIsDark] = useState(
    () =>
      window.matchMedia("(prefers-color-scheme: dark)").matches ||
      document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () =>
      setIsDark(
        document.documentElement.classList.contains("dark") || mq.matches
      );
    mq.addEventListener("change", update);
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => {
      mq.removeEventListener("change", update);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="relative h-56 w-full rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 select-none">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{
            top: 8,
            right: 12,
            bottom: 0,
            left: -18,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            className="text-zinc-200 dark:text-zinc-800"
          />

          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            stroke={isDark ? "#a1a1aa" : "#71717a"}
          />

          <YAxis
            domain={[0, 100]}
            tickLine={false}
            axisLine={false}
            fontSize={12}
            stroke={isDark ? "#a1a1aa" : "#71717a"}
            tickFormatter={(value) => `${value}%`}
          />

          <Tooltip
            formatter={(value, name) => {
              if (value === null || value === undefined) return ["Not logged", "Completion"];
              if (name === "completion") return [`${value}%`, "Completion"];
              if (name === "baseline") return [`${value}%`, "Baseline"];
              return [`${value}%`, "Value"];
            }}
            labelFormatter={(label) => `Day ${label}`}
            contentStyle={{
              borderRadius: 8,
              border: `1px solid ${isDark ? "#3f3f46" : "#d4d4d8"}`,
              backgroundColor: isDark ? "#18181b" : "#ffffff",
              color: isDark ? "#f4f4f5" : "#09090b",
            }}
          />

          {/* RED BASELINE SHADED AREA (0% TO 60%) */}
          <ReferenceArea
            y1={0}
            y2={BASELINE}
            fill="#ef4444"
            fillOpacity={0.12}
            ifOverflow="extendDomain"
          />

          {/* RED BASELINE DASHED LINE */}
          <Line
            type="monotone"
            dataKey="baseline"
            stroke="#ef4444"
            strokeWidth={2}
            strokeDasharray="6 5"
            dot={false}
            activeDot={false}
            connectNulls
            isAnimationActive={false}
          />

          {/* GREEN TRANSLUCENT FILL AREA (PERFECTLY LOCKED TO LINE AND DOTS) */}
          <Area
            type="monotone"
            dataKey="completion"
            fill="#22c55e"
            fillOpacity={0.3}
            stroke="none"
            connectNulls={false}
            isAnimationActive={false}
          />

          {/* GREEN COMPLETION LINE & DOTS */}
          <Line
            type="monotone"
            dataKey="completion"
            stroke="#16a34a"
            strokeWidth={3}
            dot={(props: any) => {
              const { cx, cy, payload } = props;
              if (payload.completion === null || payload.completion === undefined) return <g key={props.key || cx} />;
              return (
                <circle
                  key={props.key || cx}
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill="#16a34a"
                  stroke="#16a34a"
                  strokeWidth={1}
                />
              );
            }}
            activeDot={(props: any) => {
              const { cx, cy, payload } = props;
              if (payload.completion === null || payload.completion === undefined) return <g key={props.key || cx} />;
              return (
                <circle
                  key={props.key || cx}
                  cx={cx}
                  cy={cy}
                  r={5}
                  fill="#16a34a"
                  stroke="#16a34a"
                />
              );
            }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}