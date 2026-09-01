interface StatStripProps {
  stats: Array<{ label: string; value: string; title?: string; trend?: "up" | "down" | null; subtext?: string }>;
}

export function StatStrip({ stats }: StatStripProps) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      {stats.map((stat, index) => {
        // Subtle distinct border colors for the 4 stats
        const borderColors = ["border-l-blue-500", "border-l-green-500", "border-l-amber-500", "border-l-purple-500"];
        const accent = borderColors[index % borderColors.length];

        return (
          <div key={stat.label} title={stat.title} className={`rounded border border-zinc-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5 dark:backdrop-blur-sm dark:shadow-inner cursor-default border-l-4 ${accent}`}>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">{stat.label}</div>
            <div className="flex items-center gap-1">
              <div className="text-lg font-semibold">{stat.value}</div>
              {stat.trend === "up" && <span className="text-green-500 text-sm font-bold">↑</span>}
              {stat.trend === "down" && <span className="text-red-500 text-sm font-bold">↓</span>}
            </div>
            {stat.subtext && (
              <div className={`text-[11px] font-medium ${stat.trend === "up" ? "text-green-600 dark:text-green-400" : stat.trend === "down" ? "text-red-600 dark:text-red-400" : "text-zinc-500"}`}>
                {stat.subtext}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
