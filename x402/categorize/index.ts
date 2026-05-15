export default async function handler(req: Request) {
  const body = await req.json() as { wallet?: string; range?: string };

  const res = await fetch(
    `${process.env.XBOOKS_API_URL}/api/v1/categorize`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": process.env.XBOOKS_INTERNAL_SECRET!,
      },
      body: JSON.stringify({ wallet: body.wallet ?? "", range: body.range ?? "30d" }),
    },
  );

  return res.json();
}
