import type { HabitConfig, HabitTier, HabitCategory } from "../types";

// ── Scoring Thresholds (constants, adjustable later) ─────

export const SCORE_STRONG = 80;
export const SCORE_ACCEPTABLE = 50;
export const SCORE_RECOVERY = 1;

// ── Tier Computation ─────────────────────────────────────

/**
 * Compute which tier a numeric value falls into for a timed/counted habit.
 *
 * Edge cases handled:
 * - Missing thresholds → treat as binary (always "target" if value > 0)
 * - Negative values → clamp to 0
 * - minimum > target → use minimum for both
 * - target > stretch → use target for both
 */
export function computeTier(value: number, config: HabitConfig): HabitTier {
  // Binary habits have no tiers — this function shouldn't be called for them,
  // but handle gracefully
  if (config.habitType === "binary") {
    return value > 0 ? "target" : "missed";
  }

  const safeValue = Math.max(0, value);

  const min = config.tierMinimum;
  const tgt = config.tierTarget;
  const str = config.tierStretch;

  // If no thresholds are defined, treat any positive value as "target"
  if (min == null && tgt == null && str == null) {
    return safeValue > 0 ? "target" : "missed";
  }

  // Sanitize thresholds: enforce min ≤ target ≤ stretch
  const safeMin = Math.max(0, min ?? 0);
  const safeTarget = Math.max(safeMin, tgt ?? safeMin);
  const safeStretch = Math.max(safeTarget, str ?? safeTarget);

  if (safeStretch > 0 && safeValue >= safeStretch) return "stretch";
  if (safeTarget > 0 && safeValue >= safeTarget) return "target";
  if (safeMin > 0 && safeValue >= safeMin) return "minimum";

  return "missed";
}

// ── Score Labels ─────────────────────────────────────────

/**
 * Compute the human-readable label for a Today Score percentage.
 */
export function computeTodayScoreLabel(
  percent: number,
): "Strong Day" | "Acceptable Day" | "Recovery Day" | "Reset" {
  if (percent >= SCORE_STRONG) return "Strong Day";
  if (percent >= SCORE_ACCEPTABLE) return "Acceptable Day";
  if (percent >= SCORE_RECOVERY) return "Recovery Day";
  return "Reset";
}

// ── Category Helpers ─────────────────────────────────────

/**
 * Get the effective category for a habit, defaulting to "core" when
 * no config exists (backward compatibility).
 */
export function getHabitCategory(
  habitId: number,
  configs: Record<number, HabitConfig>,
): HabitCategory {
  return configs[habitId]?.category ?? "core";
}

/**
 * Check whether a timed/counted habit meets minimum threshold.
 * Returns true if value ≥ minimum (meaning it scores 1 point).
 */
export function meetsMinimum(value: number, config: HabitConfig): boolean {
  const tier = computeTier(value, config);
  return tier !== "missed";
}
