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

export default async function handler(req, res) {
    try {
        const username = "TheOnlySolomon";

        // Find Roblox user ID
        const userResponse = await fetch(
            "https://users.roblox.com/v1/usernames/users",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    usernames: [username],
                    excludeBannedUsers: false
                })
            }
        );

        if (!userResponse.ok) {
            throw new Error("Failed to find Roblox user");
        }

        const userData = await userResponse.json();

        if (!userData.data || userData.data.length === 0) {
            throw new Error("Roblox user not found");
        }

        const userId = userData.data[0].id;

        // Get current avatar
        const avatarResponse = await fetch(
            `https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=420x420&format=Png&isCircular=false`
        );

        if (!avatarResponse.ok) {
            throw new Error("Failed to get Roblox avatar");
        }

        const avatarData = await avatarResponse.json();

        if (!avatarData.data || avatarData.data.length === 0) {
            throw new Error("No avatar returned");
        }

        res.status(200).json({
            avatarUrl: avatarData.data[0].imageUrl
        });

    } catch (error) {
        console.error("Roblox API Error:", error);

        res.status(500).json({
            error: "Failed to retrieve Roblox avatar"
        });
    }
}