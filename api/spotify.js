// /api/spotify.js
const PLAYLIST_ID = "5FN6Ego7eLX6zHuCMovIR2";
const TRACK_LIMIT = 100;

let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken(clientId, clientSecret) {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
    },
    body: "grant_type=client_credentials"
  });

  if (!response.ok) throw new Error(`Spotify token request failed: ${response.status}`);

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

export default async function handler(req, res) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: "Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET environment variable" });
  }

  try {
    const token = await getAccessToken(clientId, clientSecret);

    // FIX: Changed /tracks to /items (the current endpoint)
    const target = new URL(`https://api.spotify.com/v1/playlists/${PLAYLIST_ID}/items`);
    target.searchParams.set("limit", "100");
    target.searchParams.set("fields", "items(track(name,artists(name),album(images),external_urls),item(name,artists(name),album(images),external_urls))");

    const response = await fetch(target.toString(), {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Spotify API error details:", response.status, errBody);
      return res.status(response.status).json({ error: `Spotify API request failed: ${response.status}` });
    }

    const data = await response.json();

    // Map items safely matching both object structures
    const tracks = (data.items || [])
      .map(item => item.track || item.item)
      .filter(Boolean)
      .slice(0, TRACK_LIMIT)
      .map((track, index) => ({
        rank: index + 1,
        title: track.name,
        artist: (track.artists || []).map(a => a.name).join(", "),
        image: track.album?.images?.[2]?.url || track.album?.images?.[0]?.url || null,
        url: track.external_urls?.spotify || null
      }));

    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");
    return res.status(200).json({ tracks });
  } catch (error) {
    console.error("Spotify proxy error:", error);
    return res.status(500).json({ error: "Failed to fetch Spotify data" });
  }
}