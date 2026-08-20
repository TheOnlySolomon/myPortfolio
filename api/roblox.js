// Server-to-server Roblox API proxy

const ALLOWED_HOSTS = new Set([
  "users.roblox.com",
  "friends.roblox.com",
  "presence.roblox.com",
  "games.roblox.com",
  "groups.roblox.com",
  "thumbnails.roblox.com",
  "badges.roblox.com",
  "accountinformation.roblox.com",
  "apis.roblox.com"
]);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // If a URL is provided, use the generic Roblox proxy
  const { url } = req.query;

  try {
    // Badge request
    if (!url) {
      const userId = "386830245";

      const response = await fetch(
        `https://badges.roblox.com/v1/users/${userId}/badges?sortOrder=Desc&limit=10`
      );

      if (!response.ok) {
        return res.status(response.status).json({
          error: "Roblox badge API request failed"
        });
      }

      const data = await response.json();
      res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
      return res.status(200).json(data);
    }

    // Generic Roblox API proxy
    let target;

    try {
      target = new URL(url);
    } catch {
      return res.status(400).json({
        error: "Invalid url parameter"
      });
    }

    if (!ALLOWED_HOSTS.has(target.hostname)) {
      return res.status(400).json({
        error: "Host not allowed"
      });
    }

    const response = await fetch(target.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });
    const data = await response.json();

    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    return res.status(response.status).json(data);

  } catch (error) {
    console.error("Roblox API error:", error);

    return res.status(500).json({
      error: "Failed to fetch Roblox data"
    });
  }
}