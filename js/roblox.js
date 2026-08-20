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

function truncateText(text, maxLength = 120) {
  if (!text) return "No description provided.";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

// Basic HTML escaping since badge names/URLs come from an external API
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

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

function formatVisitCount(num) {
  if (typeof num !== "number") return "--";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return `${num}`;
}

// Fetch Roblox avatar thumbnail
async function fetchAvatar() {
  const avatarImg = document.getElementById("avatar-image");
  if (!avatarImg) return;

  try {
    const targetUrl = `https://thumbnails.roblox.com/v1/users/avatar?userIds=${ROBLOX_USER_ID}&size=420x420&format=Png&isCircular=true`;
    const result = await fetchViaProxies(targetUrl);
    
    if (result && result.data && result.data.length > 0 && result.data[0].imageUrl) {
      avatarImg.src = result.data[0].imageUrl;
      avatarImg.alt = "Solomon's Roblox Avatar";
    } else {
      // Fallback if avatar can't be loaded
      avatarImg.style.display = "none";
    }
  } catch (error) {
    console.warn("Could not load avatar:", error);
    avatarImg.style.display = "none";
  }
}

function formatCreatedDate(dateString) {
  if (!dateString) return "--";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

async function fetchMyGames() {
  const cards = Array.from(document.querySelectorAll(".my-game-card"));
  if (cards.length === 0) return;

  const applyFallbackText = () => {
    cards.forEach(card => {
      const descEl = card.querySelector(".my-game-desc");
      const visitsEl = card.querySelector(".my-game-visits");
      const createdEl = card.querySelector(".my-game-created");
      const genreEl = card.querySelector(".my-game-genre");
      if (descEl) descEl.textContent = "Live data unavailable right now.";
      if (visitsEl) visitsEl.textContent = "--";
      if (createdEl) createdEl.textContent = "--";
      if (genreEl) genreEl.textContent = "--";
    });
  };

  try {
    const universeLookups = await Promise.all(
      cards.map(async card => {
        const placeId = card.getAttribute("data-place-id");
        try {
          const result = await fetchViaProxies(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`);
          return { placeId, universeId: result && result.universeId ? result.universeId : null };
        } catch {
          return { placeId, universeId: null };
        }
      })
    );

    const universeIds = universeLookups.map(u => u.universeId).filter(Boolean);
    if (universeIds.length === 0) throw new Error("No universe IDs resolved");

    const gamesResult = await fetchViaProxies(`https://games.roblox.com/v1/games?universeIds=${universeIds.join(",")}`);
    const gameList = (gamesResult && gamesResult.data) || [];

    const thumbsResult = await fetchViaProxies(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeIds.join(",")}&size=512x512&format=Png&isCircular=false`);
    const thumbList = (thumbsResult && thumbsResult.data) || [];

    cards.forEach(card => {
      const placeId = card.getAttribute("data-place-id");
      const lookup = universeLookups.find(u => u.placeId === placeId);

      const nameEl = card.querySelector(".my-game-name");
      const descEl = card.querySelector(".my-game-desc");
      const visitsEl = card.querySelector(".my-game-visits");
      const createdEl = card.querySelector(".my-game-created");
      const genreEl = card.querySelector(".my-game-genre");
      const imgEl = card.querySelector("[data-my-game-thumb]");

      const game = lookup && lookup.universeId ? gameList.find(g => String(g.id) === String(lookup.universeId)) : null;
      const thumb = lookup && lookup.universeId ? thumbList.find(t => String(t.targetId) === String(lookup.universeId)) : null;

      if (game) {
        if (nameEl) nameEl.textContent = game.name || nameEl.textContent;
        if (descEl) descEl.textContent = truncateText(game.description, 220);
        if (visitsEl) visitsEl.textContent = formatVisitCount(game.visits);
        if (createdEl) createdEl.textContent = formatCreatedDate(game.created);
        if (genreEl) genreEl.textContent = game.genre || card.getAttribute("data-fallback-genre") || "All Genres";
      } else {
        if (descEl) descEl.textContent = "Live data unavailable right now.";
        if (visitsEl) visitsEl.textContent = "--";
        if (createdEl) createdEl.textContent = "--";
        if (genreEl) genreEl.textContent = "--";
      }

      if (imgEl) {
        if (thumb && thumb.imageUrl) {
          imgEl.src = thumb.imageUrl;
          imgEl.alt = game ? game.name : "Game thumbnail";
        } else {
          showThumbnailFallback([imgEl]);
        }
      }
    });
  } catch (err) {
    console.warn("Failed to load live game data:", err.message);
    applyFallbackText();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  fetchRobloxStats();
  fetchGameThumbnails();
  fetchGroups();
  fetchMyGames();
  fetchAvatar(); // Add this line
});

async function loadRobloxBadges() {
  const container = document.getElementById("roblox-badges");

  try {
    const url = encodeURIComponent(
      `https://accountinformation.roblox.com/v1/users/${ROBLOX_USER_ID}/roblox-badges`
    );

    const res = await fetch(`/api/roblox?url=${url}`);
    if (!res.ok) throw new Error("Failed to fetch badges");

    const data = await res.json();
    const badges = Array.isArray(data) ? data : data.data || [];

    container.innerHTML = badges.slice(0, 10).map(badge => `
      <img src="${escapeHtml(badge.imageUrl)}"
           class="roblox-badge-icon"
           alt="${escapeHtml(badge.name)}"
           title="${escapeHtml(badge.name)}">
    `).join("");

  } catch (error) {
    console.error("Roblox badge error:", error);
    container.innerHTML =
      `<p class="text-secondary">Unable to load Roblox badges.</p>`;
  }
}

loadRobloxBadges();