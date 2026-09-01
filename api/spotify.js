// Server-to-server proxy for the Spotify Web API (Client Credentials flow).
// Keeps the client secret off the client — read from SPOTIFY_CLIENT_ID /
// SPOTIFY_CLIENT_SECRET env vars on Vercel (Project Settings > Environment Variables).
// Create an app at: https://developer.spotify.com/dashboard
//
// Note: Spotify stopped exposing its own editorial playlists (incl. the
// official Global Top 50) through this endpoint in Nov 2024. This points at
// a well-followed, non-Spotify-owned chart playlist that mirrors it instead.

const PLAYLIST_ID = "5FN6Ego7eLX6zHuCMovIR2"; // "Top 50 Global" (daily updated)
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

    const target = new URL(`https://api.spotify.com/v1/playlists/${PLAYLIST_ID}/items`);
    target.searchParams.set("limit", "100");
    target.searchParams.set("fields", "items(item(name,artists(name),album(images),external_urls))");

    const response = await fetch(target.toString(), {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Spotify API request failed" });
    }

    const data = await response.json();

    const tracks = (data.items || [])
      .map(item => item.item || item.track) // handles standard track objects
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