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

    const fetchOptions = {
      method: req.method,
      headers: {
        "Content-Type": "application/json"
      }
    };

    if (req.method === "POST") {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(target.toString(), fetchOptions);
    const data = await response.json();

    return res.status(response.status).json(data);

  } catch (error) {
    console.error("Roblox API error:", error);

    return res.status(500).json({
      error: "Failed to fetch Roblox data"
    });
  }
}