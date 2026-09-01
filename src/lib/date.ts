export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function getMonthDays(date: Date): Date[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const days = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: days }, (_, index) => new Date(year, month, index + 1));
}

export function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

export function isFutureIso(isoDate: string): boolean {
  return isoDate > todayIso();
}

export function weekLabel(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const week = Math.floor((date.getDate() + first.getDay() - 1) / 7) + 1;
  return `Week ${week}`;
}
