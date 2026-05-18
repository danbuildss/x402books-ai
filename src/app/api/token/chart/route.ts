import { NextResponse } from "next/server";

type OhlcvItem = [number, number, number, number, number, number]; // [ts, o, h, l, c, vol]

type GeckoResponse = {
  data?: {
    attributes?: {
      ohlcv_list?: OhlcvItem[];
    };
  };
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address")?.toLowerCase();

  if (!address?.startsWith("0x")) {
    return NextResponse.json({ prices: [] });
  }

  try {
    // 7-day hourly candles on Base
    const url =
      `https://api.geckoterminal.com/api/v2/networks/base/tokens/${address}/ohlcv/hour` +
      `?limit=168&currency=usd`;

    const res = await fetch(url, {
      headers: { Accept: "application/json;version=20230302" },
      signal: AbortSignal.timeout(8_000),
      next: { revalidate: 3600 }, // cache 1hr
    });

    if (!res.ok) return NextResponse.json({ prices: [] });

    const body = await res.json() as GeckoResponse;
    const ohlcv = body.data?.attributes?.ohlcv_list ?? [];

    // Return close prices only, oldest→newest
    const prices = ohlcv
      .map((candle) => ({ ts: candle[0], price: candle[4] }))
      .reverse();

    return NextResponse.json({ prices });
  } catch {
    return NextResponse.json({ prices: [] });
  }
}
