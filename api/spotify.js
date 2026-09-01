// api/spotify.js
const ARTIST_ID = "06HL4z0CvFAxyA2316fP3w"; // Replace with any Spotify Artist ID (e.g. Taylor Swift)

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

    // --- REPLACED CODE STARTS HERE ---
    const target = new URL(`https://api.spotify.com/v1/artists/${ARTIST_ID}/top-tracks`);
    target.searchParams.set("market", "US");

    const response = await fetch(target.toString(), {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Spotify API error details:", response.status, errBody);
      return res.status(response.status).json({ error: `Spotify API request failed: ${response.status}` });
    }

    const data = await response.json();

    const tracks = (data.tracks || [])
      .slice(0, 10)
      .map((track, index) => ({
        rank: index + 1,
        title: track.name,
        artist: track.artists.map(a => a.name).join(", "),
        image: track.album?.images?.[2]?.url || track.album?.images?.[0]?.url || null,
        url: track.external_urls?.spotify || null
      }));
    // --- REPLACED CODE ENDS HERE ---

    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");
    return res.status(200).json({ tracks });

  } catch (error) {
    console.error("Spotify proxy error:", error);
    return res.status(500).json({ error: "Failed to fetch Spotify data" });
  }
}