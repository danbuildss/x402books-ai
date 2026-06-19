// X API v2 mention fetcher — fetches recent @AskLucaAI mentions, expands author info.

export type XMention = {
  id: string;
  text: string;
  author_username: string;
  author_name: string;
  created_at: string;
  url: string;
};

type XApiResponse = {
  data?: Array<{ id: string; text: string; author_id: string; created_at: string }>;
  includes?: { users?: Array<{ id: string; username: string; name: string }> };
  meta?: { newest_id?: string; result_count?: number };
  errors?: Array<{ message: string }>;
};

export async function fetchRecentMentions(
  bearerToken: string,
  sinceId?: string,
): Promise<XMention[]> {
  const params = new URLSearchParams({
    query:          "@AskLucaAI -is:retweet",
    max_results:    "10",
    "tweet.fields": "author_id,created_at,text",
    expansions:     "author_id",
    "user.fields":  "username,name",
  });
  if (sinceId) params.set("since_id", sinceId);

  const res = await fetch(
    `https://api.twitter.com/2/tweets/search/recent?${params.toString()}`,
    { headers: { Authorization: `Bearer ${bearerToken}` } },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`X API ${res.status}: ${body.slice(0, 200)}`);
  }

  const json: XApiResponse = await res.json();

  if (!json.data || json.data.length === 0) return [];

  const usersById = new Map(
    (json.includes?.users ?? []).map((u) => [u.id, u]),
  );

  return json.data.map((tweet) => {
    const user = usersById.get(tweet.author_id);
    return {
      id:              tweet.id,
      text:            tweet.text,
      author_username: user?.username ?? "unknown",
      author_name:     user?.name     ?? "Unknown",
      created_at:      tweet.created_at,
      url:             `https://x.com/${user?.username ?? "i"}/status/${tweet.id}`,
    };
  });
}
