import { useState, useEffect } from "react";
import { useRegion } from "@/lib/region-context";

export type DailyData = {
  day: string;
  groupKey: string;
  totalIn: number;
  totalOut: number;
  invocations: number;
};

export type SummaryData = {
  groupKey: string;
  totalIn: number;
  totalOut: number;
  invocations: number;
};

export type AnalyticsData = {
  daily: DailyData[];
  summary: SummaryData[];
  period: { year: number; month: number; startTime: string; endTime: string };
  error?: string;
};

// Bedrock pricing per 1M tokens (us-east-1, approximate)
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-sonnet-4-5-20250929": { input: 3.0, output: 15.0 },
  "claude-sonnet-4-20250514": { input: 3.0, output: 15.0 },
  "claude-opus-4-6": { input: 15.0, output: 75.0 },
  "claude-opus-4-5-20251101": { input: 15.0, output: 75.0 },
  "claude-opus-4-20250514": { input: 15.0, output: 75.0 },
  "claude-opus-4-1-20250805": { input: 15.0, output: 75.0 },
  "claude-haiku-4-5-20251001": { input: 0.80, output: 4.0 },
  "claude-3-7-sonnet-20250219": { input: 3.0, output: 15.0 },
  "claude-3-5-sonnet-20241022": { input: 3.0, output: 15.0 },
  "claude-3-5-sonnet-20240620": { input: 3.0, output: 15.0 },
  "claude-3-5-haiku-20241022": { input: 0.80, output: 4.0 },
  "claude-3-haiku-20240307": { input: 0.25, output: 1.25 },
  "claude-3-sonnet-20240229": { input: 3.0, output: 15.0 },
  "claude-3-opus-20240229": { input: 15.0, output: 75.0 },
};

export function getModelCost(modelKey: string, inputTokens: number, outputTokens: number): number {
  // Try to match model key against pricing
  const pricing = Object.entries(MODEL_PRICING).find(([k]) =>
    modelKey.toLowerCase().includes(k.toLowerCase())
  );
  if (!pricing) return 0;
  const [, p] = pricing;
  return (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
}

export type AnalyticsFilters = {
  apiKey?: string;
  model?: string;
  user?: string;
};

export function useAnalytics(
  groupBy: string,
  year: number,
  month: number,
  filters?: AnalyticsFilters
) {
  const { region } = useRegion();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      region,
      groupBy,
      year: String(year),
      month: String(month),
    });
    if (filters?.apiKey) params.set("apiKey", filters.apiKey);
    if (filters?.model) params.set("model", filters.model);
    if (filters?.user) params.set("user", filters.user);

    fetch(`/api/analytics?${params}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [region, groupBy, year, month, filters?.apiKey, filters?.model, filters?.user]);

  return { data, loading };
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function formatCurrency(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function monthName(m: number): string {
  return MONTH_NAMES[m - 1] ?? "";
}

// Pastel chart colors
export const CHART_COLORS = [
  "hsl(210, 70%, 72%)",   // soft blue
  "hsl(25, 85%, 72%)",    // soft orange
  "hsl(150, 50%, 65%)",   // soft green
  "hsl(340, 60%, 72%)",   // soft pink
  "hsl(270, 55%, 72%)",   // soft purple
  "hsl(45, 80%, 70%)",    // soft yellow
  "hsl(190, 60%, 65%)",   // soft teal
  "hsl(0, 60%, 72%)",     // soft red
  "hsl(230, 50%, 72%)",   // soft indigo
  "hsl(100, 45%, 65%)",   // soft lime
];

// Sanitize key for CSS variable name (no dots, slashes, colons)
export function sanitizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9-]/g, "_");
}
