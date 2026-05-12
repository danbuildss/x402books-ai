const APP_URL = process.env.APP_URL || "https://x402books.xyz";

export type TimeRange = "7d" | "14d" | "30d" | "90d";

export type ScanResult = {
  wallet: string;
  range: string;
  summary: {
    totalSpend: number;
    totalIncome: number;
    netFlow: number;
    transactionCount: number;
    likelyX402Count: number;
  };
  categories: Array<{
    category: string;
    label: string;
    count: number;
    totalUsdc: number;
  }>;
  report: {
    budgetStatus: string;
    topCategory: string;
  };
};

export async function scanWallet(
  wallet: string,
  range: TimeRange,
): Promise<ScanResult> {
  const res = await fetch(
    `${APP_URL}/api/scan?wallet=${encodeURIComponent(wallet)}&range=${range}`,
    { signal: AbortSignal.timeout(55_000) },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error || `Scan failed: ${res.status}`);
  }
  return res.json() as Promise<ScanResult>;
}

export async function resolveEns(name: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.ensideas.com/ens/resolve/${encodeURIComponent(name)}`,
      { signal: AbortSignal.timeout(8_000) },
    );
    if (!res.ok) return null;
    const data = await res.json() as { address?: string };
    return /^0x[a-fA-F0-9]{40}$/.test(data?.address ?? "")
      ? data.address!
      : null;
  } catch {
    return null;
  }
}
