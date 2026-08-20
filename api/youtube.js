// Server-to-server proxy for the YouTube Data API v3.
// Keeps the API key off the client — it's read from the YOUTUBE_API_KEY
// environment variable on Vercel (Project Settings > Environment Variables).
// Get a key at: https://console.cloud.google.com/apis/credentials
// (enable "YouTube Data API v3" on that project first).

const DEFAULT_HANDLE = "solomonlegend7025";

export default async function handler(req, res) {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "Missing YOUTUBE_API_KEY environment variable" });
  }

  const handle = (req.query.handle || DEFAULT_HANDLE).replace(/^@/, "");

  const target = new URL("https://www.googleapis.com/youtube/v3/channels");
  target.searchParams.set("part", "snippet,statistics");
  target.searchParams.set("forHandle", `@${handle}`);
  target.searchParams.set("key", apiKey);

  try {
    const response = await fetch(target.toString());
    const data = await response.json();

    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    return res.status(response.status).json(data);
  } catch (error) {
    console.error("YouTube proxy error:", error);
    return res.status(500).json({ error: "Failed to fetch YouTube data" });
  }
}