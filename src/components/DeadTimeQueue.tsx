import React, { useState } from "react";
import { Coffee, ChevronDown, ChevronUp, Train, Sparkles, BedDouble } from "lucide-react";
import type { DeadTimeItem } from "../types";

interface DeadTimeQueueProps {
  items: DeadTimeItem[];
  className?: string;
}

const DEFAULT_DEAD_TIME_ITEMS: DeadTimeItem[] = [
  { id: "1", label: "DSA Revision / LeetCode notes", context: "train" },
  { id: "2", label: "PW Lecture or video concept", context: "train" },
  { id: "3", label: "Quick 20-min Power Nap", context: "break" },
  { id: "4", label: "Technical Reading / Documentation", context: "break" },
  { id: "5", label: "Daily Review & Planning Next Day", context: "general" },
];

export function DeadTimeQueue({ items, className = "" }: DeadTimeQueueProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedContext, setSelectedContext] = useState<"all" | "train" | "break" | "general">("all");

  const queue = items && items.length > 0 ? items : DEFAULT_DEAD_TIME_ITEMS;

  const filteredItems = queue.filter((item) =>
    selectedContext === "all" ? true : item.context === selectedContext
  );

  const getContextIcon = (context: string) => {
    switch (context) {
      case "train":
        return <Train size={14} className="text-blue-400" />;
      case "break":
        return <BedDouble size={14} className="text-amber-400" />;
      default:
        return <Sparkles size={14} className="text-indigo-400" />;
    }
  };

  return (
    <div
      className={`rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70 ${className}`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition rounded-2xl"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500 text-xs">
            ☕
          </span>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
              Dead Time / Gap Queue
            </h3>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Turn transit, breaks & waiting into focused mini-wins
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 hidden sm:inline">
            {isOpen ? "Hide" : "Show Options"}
          </span>
          {isOpen ? <ChevronUp size={18} className="text-zinc-400" /> : <ChevronDown size={18} className="text-zinc-400" />}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-zinc-100 p-4 dark:border-zinc-800 animate-in fade-in duration-150">
          {/* Context Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            {(["all", "train", "break", "general"] as const).map((ctx) => (
              <button
                key={ctx}
                onClick={() => setSelectedContext(ctx)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition ${
                  selectedContext === ctx
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                }`}
              >
                {ctx}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2.5 rounded-xl border border-zinc-100 bg-zinc-50/70 p-3 dark:border-zinc-800/60 dark:bg-zinc-950/40 hover:border-zinc-300 dark:hover:border-zinc-700 transition"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-200/60 dark:bg-zinc-800/80">
                  {getContextIcon(item.context)}
                </div>
                <div className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    {item.label}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 capitalize">
                    {item.context}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
