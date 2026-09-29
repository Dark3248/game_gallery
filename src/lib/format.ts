import type { Platform } from "@/db/schema";

export const PLATFORM_LABELS: Record<Platform, string> = {
  steam: "Steam",
  epic: "Epic",
};

export function formatPlaytime(minutes: number): string {
  if (minutes <= 0) return "未游玩";
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = minutes / 60;
  return `${hours < 10 ? hours.toFixed(1) : Math.round(hours).toLocaleString("zh-CN")} 小时`;
}

export function formatHours(minutes: number): string {
  return (minutes / 60).toLocaleString("zh-CN", { maximumFractionDigits: 1 });
}

export function formatDate(value: Date | string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export function formatDateTime(value: Date | string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("zh-CN", { hour12: false });
}

export function completionPercent(unlocked: number, total: number): number {
  return total > 0 ? Math.round((unlocked / total) * 100) : 0;
}
