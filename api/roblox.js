// Server-to-server proxy for Roblox's public API.
// Avoids relying on third-party CORS proxies (corsproxy.io, allorigins, etc.),
// which restrict or block requests from production domains. Since this runs
// on Vercel's server, not in the browser, there's no CORS restriction at all.

const ALLOWED_HOSTS = new Set([
  "users.roblox.com",
  "friends.roblox.com",
  "presence.roblox.com",
  "games.roblox.com",
  "groups.roblox.com",
  "thumbnails.roblox.com",
  "apis.roblox.com"
]);

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Missing url parameter" });
  }

  let target;
  try {
    target = new URL(url);
  } catch {
    return res.status(400).json({ error: "Invalid url parameter" });
  }

  if (!ALLOWED_HOSTS.has(target.hostname)) {
    return res.status(400).json({ error: "Host not allowed" });
  }

  try {
    const fetchOptions = {
      method: req.method,
      headers: { "Content-Type": "application/json" }
    };

    if (req.method === "POST") {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(target.toString(), fetchOptions);
    const data = await response.json();

    return res.status(response.status).json(data);
  } catch (error) {
    console.error("Roblox proxy error:", error);
    return res.status(500).json({ error: "Failed to fetch Roblox data" });
  }
}