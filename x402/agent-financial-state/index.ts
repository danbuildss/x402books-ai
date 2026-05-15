export default async function handler(req: Request) {
  const url    = new URL(req.url);
  const wallet = url.searchParams.get("wallet") ?? "";
  const range  = url.searchParams.get("range")  ?? "30d";

  const res = await fetch(
    `${process.env.XBOOKS_API_URL}/api/v1/agent-financial-state?wallet=${encodeURIComponent(wallet)}&range=${range}`,
    { headers: { "x-internal-secret": process.env.XBOOKS_INTERNAL_SECRET! } },
  );

  return res.json();
}
