export default async function handler(req: Request) {
  const url   = new URL(req.url);
  const wallet = url.searchParams.get("wallet") ?? "";
  const range  = url.searchParams.get("range")  ?? "30d";
  const page   = url.searchParams.get("page")   ?? "1";
  const limit  = url.searchParams.get("limit")  ?? "50";

  const res = await fetch(
    `${process.env.XBOOKS_API_URL}/api/v1/transactions?wallet=${encodeURIComponent(wallet)}&range=${range}&page=${page}&limit=${limit}`,
    { headers: { "x-internal-secret": process.env.XBOOKS_INTERNAL_SECRET! } },
  );

  return res.json();
}
