const ROBLOX_USER_ID = "386830245";
const CACHE_KEY = "roblox_stats_cache";
const CACHE_TIME_KEY = "roblox_stats_timestamp";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const FALLBACK_STATS = {
  joined: "2018",
  friends: "200 / 200",
  followers: "500+",
  favorites: "320+",
  status: "Offline",
  statusColor: "#6c757d"
};

async function fetchRobloxStats() {
  const proxy = "https://corsproxy.io/?url=";
  const now = Date.now();

  const cachedData = localStorage.getItem(CACHE_KEY);
  const cachedTimestamp = localStorage.getItem(CACHE_TIME_KEY);

  if (cachedData && cachedTimestamp && (now - parseInt(cachedTimestamp) < CACHE_DURATION)) {
    console.log("Loading Roblox stats from local cache...");
    applyStatsToDOM(JSON.parse(cachedData));
    return;
  }

  try {
    console.log("Fetching live Roblox stats...");
    
    const urlUser = `${proxy}${encodeURIComponent(`https://users.roblox.com/v1/users/${ROBLOX_USER_ID}`)}`;
    const urlFriends = `${proxy}${encodeURIComponent(`https://friends.roblox.com/v1/users/${ROBLOX_USER_ID}/friends/count`)}`;
    const urlFollowers = `${proxy}${encodeURIComponent(`https://friends.roblox.com/v1/users/${ROBLOX_USER_ID}/followers/count`)}`;
    const urlPresence = `${proxy}${encodeURIComponent(`https://presence.roblox.com/v1/presence/users`)}`;
    const urlFavorites = `${proxy}${encodeURIComponent(`https://games.roblox.com/v2/users/${ROBLOX_USER_ID}/favorite/games?limit=50`)}`;

    const [userRes, friendsRes, followersRes, presenceRes, favRes] = await Promise.all([
      fetch(urlUser),
      fetch(urlFriends),
      fetch(urlFollowers),
      fetch(urlPresence, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: [parseInt(ROBLOX_USER_ID)] })
      }),
      fetch(urlFavorites)
    ]);

    const userData = userRes.ok ? await userRes.json() : {};
    const friendsData = friendsRes.ok ? await friendsRes.json() : {};
    const followersData = followersRes.ok ? await followersRes.json() : {};
    const presenceData = presenceRes.ok ? await presenceRes.json() : {};
    const favData = favRes.ok ? await favRes.json() : {};

    let statusText = "Offline";
    let statusColor = "#6c757d";

    if (presenceData.userPresences && presenceData.userPresences.length > 0) {
      const presenceType = presenceData.userPresences[0].userPresenceType;
      switch (presenceType) {
        case 1:
          statusText = "Online";
          statusColor = "#0dcaf0";
          break;
        case 2:
          statusText = "In-Game";
          statusColor = "#198754";
          break;
        case 3:
          statusText = "In-Studio";
          statusColor = "#ffc107";
          break;
        default:
          statusText = "Offline";
          statusColor = "#6c757d";
          break;
      }
    }

    // 3. Assemble stats object (Clean numbers only)
    const liveStats = {
      joined: userData.created ? new Date(userData.created).getFullYear().toString() : FALLBACK_STATS.joined,
      friends: friendsData.count !== undefined ? `${friendsData.count}` : FALLBACK_STATS.friends,
      followers: followersData.count !== undefined ? `${followersData.count}` : FALLBACK_STATS.followers,
      favorites: favData.data ? `${favData.data.length}` : FALLBACK_STATS.favorites,
      status: statusText,
      statusColor: statusColor
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(liveStats));
    localStorage.setItem(CACHE_TIME_KEY, now.toString());

    applyStatsToDOM(liveStats);

  } catch (error) {
    console.warn("Roblox live fetch failed. Using fallback:", error);

    if (cachedData) {
      applyStatsToDOM(JSON.parse(cachedData));
      return;
    }

    applyStatsToDOM(FALLBACK_STATS);
  }
}

function applyStatsToDOM(stats) {
  const elJoined = document.getElementById("stat-joined");
  const elFriends = document.getElementById("stat-friends");
  const elFollowers = document.getElementById("stat-followers");
  const elFavorites = document.getElementById("stat-favorites");
  const elStatus = document.getElementById("stat-status");
  const statusIcon = document.getElementById("status-icon");
  const panelStatus = document.getElementById("status-hud-panel");

  if (elJoined) elJoined.textContent = stats.joined;
  if (elFriends) elFriends.textContent = stats.friends;
  if (elFollowers) elFollowers.textContent = stats.followers;
  if (elFavorites) elFavorites.textContent = stats.favorites;
  
  if (elStatus && panelStatus) {
    elStatus.textContent = stats.status;
    elStatus.style.color = stats.statusColor;
    
    if (statusIcon) {
      statusIcon.style.color = stats.statusColor;
    }
    
    panelStatus.style.setProperty("--status-theme", stats.statusColor);
  }
}

// Ordered list of CORS proxies to try. corsproxy.io changed its API to
// require a "?url=" prefix (the old "?<encoded-url>" format now returns
// nothing usable), and free-tier proxies occasionally rate-limit or go
// down, so we fall back through a couple of alternatives before giving up.
const CORS_PROXIES = [
  (target) => `https://corsproxy.io/?url=${encodeURIComponent(target)}`,
  (target) => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
  (target) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(target)}`
];

async function fetchViaProxies(targetUrl, options = {}) {
  let lastError;
  for (const buildProxyUrl of CORS_PROXIES) {
    try {
      const response = await fetch(buildProxyUrl(targetUrl), options);
      if (!response.ok) {
        lastError = new Error(`Status ${response.status}`);
        continue;
      }
      return await response.json();
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("All proxies failed");
}

function showThumbnailFallback(imgElements) {
  imgElements.forEach(img => {
    img.classList.add("thumb-fallback");
    img.style.background = "linear-gradient(135deg, #161b22, #21262d)";
    img.alt = img.alt || "Game thumbnail unavailable";
  });
}

async function fetchGameThumbnails() {
  const imgElements = Array.from(document.querySelectorAll("img[data-place-id]"));
  if (imgElements.length === 0) return;

  // If a thumbnail 404s or the proxy returns something non-image, don't
  // leave a broken-image icon on screen.
  imgElements.forEach(img => {
    img.addEventListener("error", () => showThumbnailFallback([img]), { once: true });
  });

  const ids = imgElements
    .map(img => img.getAttribute("data-place-id"))
    .filter(Boolean)
    .join(",");

  const targetUrl = `https://thumbnails.roblox.com/v1/places/gameicons?placeIds=${ids}&returnPolicy=Auto&size=512x512&format=Png&isCircular=false`;

  try {
    const result = await fetchViaProxies(targetUrl);

    if (result && result.data && result.data.length) {
      result.data.forEach(item => {
        const matchingImg = document.querySelector(`img[data-place-id="${item.targetId}"]`);
        if (matchingImg && item.imageUrl) {
          matchingImg.src = item.imageUrl;
        }
      });
    } else {
      showThumbnailFallback(imgElements);
    }
  } catch (err) {
    console.warn("Failed to load game icons cleanly:", err.message);
    showThumbnailFallback(imgElements);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  fetchRobloxStats();
  fetchGameThumbnails();
});