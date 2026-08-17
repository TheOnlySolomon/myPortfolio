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
  const proxy = "/api/roblox?url=";
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

// Fetches Roblox data through our own Vercel serverless function
// (/api/roblox.js), which proxies server-to-server. This avoids the CORS
// and free-tier origin restrictions that come with public CORS proxies.
async function fetchViaProxies(targetUrl, options = {}) {
  const proxyUrl = `/api/roblox?url=${encodeURIComponent(targetUrl)}`;
  const response = await fetch(proxyUrl, options);
  if (!response.ok) {
    throw new Error(`Status ${response.status}`);
  }
  return await response.json();
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

// Fetches group name/description/member count + icon for each
// data-group-id card in #groups-container, via the same server-side proxy.
async function fetchGroups() {
  const cards = Array.from(document.querySelectorAll("[data-group-id]"));
  if (cards.length === 0) return;

  const ids = cards
    .map(card => card.getAttribute("data-group-id"))
    .filter(Boolean)
    .join(",");

  try {
    const [groupsResult, iconsResult] = await Promise.all([
      fetchViaProxies(`https://groups.roblox.com/v2/groups?groupIds=${ids}`),
      fetchViaProxies(`https://thumbnails.roblox.com/v1/groups/icons?groupIds=${ids}&size=150x150&format=Png&isCircular=false`)
    ]);

    const groupData = (groupsResult && groupsResult.data) || [];
    const iconData = (iconsResult && iconsResult.data) || [];

    cards.forEach(card => {
      const groupId = card.getAttribute("data-group-id");
      const group = groupData.find(g => String(g.id) === groupId);
      const icon = iconData.find(i => String(i.targetId) === groupId);

      const nameEl = card.querySelector(".group-name");
      const membersEl = card.querySelector(".group-members");
      const descEl = card.querySelector(".group-description");
      const iconEl = card.querySelector("[data-group-icon]");

      if (group) {
        if (nameEl) nameEl.textContent = group.name;
        // v2 sometimes omits memberCount, so guard against undefined
        if (membersEl) {
          membersEl.textContent = typeof group.memberCount === "number"
            ? `${group.memberCount.toLocaleString()} Members`
            : "";
        }
        if (descEl) descEl.textContent = group.description || "";
      } else {
        if (nameEl) nameEl.textContent = "Unavailable";
        if (membersEl) membersEl.textContent = "";
      }

      if (iconEl) {
        if (icon && icon.imageUrl) {
          iconEl.src = icon.imageUrl;
          iconEl.alt = group ? group.name : "Group icon";
        } else {
          iconEl.style.display = "none";
        }
      }
    });
  } catch (err) {
    console.warn("Failed to load group data:", err.message);
    cards.forEach(card => {
      const nameEl = card.querySelector(".group-name");
      const membersEl = card.querySelector(".group-members");
      if (nameEl) nameEl.textContent = "Unavailable";
      if (membersEl) membersEl.textContent = "";
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  fetchRobloxStats();
  fetchGameThumbnails();
  fetchGroups();
});