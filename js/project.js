// =========================================================
// PROJECTS PAGE — LIVE REPO & GAME STATS
// Reuses the existing /api/github-rest and /api/roblox
// serverless proxies (see api/github-rest.js, api/roblox.js).
// Falls back to the static numbers already in the HTML if a
// live fetch fails, so the cards never show a broken state.
// =========================================================

function formatCount(num) {
  if (typeof num !== "number" || isNaN(num)) return null;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return `${num}`;
}

// ---------------------------------------------------------
// GitHub repo stats (stars / forks / language)
// ---------------------------------------------------------
async function fetchGithubRepo(fullName) {
  const res = await fetch(`/api/github-rest?endpoint=${encodeURIComponent(`repos/${fullName}`)}`);
  if (!res.ok) throw new Error(`GitHub API error ${res.status}`);
  return res.json();
}

async function loadRepoStats() {
  const cards = Array.from(document.querySelectorAll("[data-repo]"));
  if (cards.length === 0) return;

  await Promise.all(cards.map(async (card) => {
    const fullName = card.getAttribute("data-repo");
    const starsEl = card.querySelector(".repo-stars");
    const forksEl = card.querySelector(".repo-forks");
    const langEl = card.querySelector(".repo-lang");

    try {
      const data = await fetchGithubRepo(fullName);
      if (data.message) throw new Error(data.message); // e.g. rate limited / not found

      const stars = formatCount(data.stargazers_count);
      const forks = formatCount(data.forks_count);

      if (starsEl && stars !== null) {
        starsEl.textContent = `${stars} ${data.stargazers_count === 1 ? "Star" : "Stars"}`;
      }
      if (forksEl && forks !== null) {
        forksEl.textContent = `${forks} ${data.forks_count === 1 ? "Fork" : "Forks"}`;
      }
      if (langEl && data.language) {
        langEl.textContent = data.language;
      }
    } catch (err) {
      console.warn(`Live GitHub stats unavailable for ${fullName}, keeping static fallback:`, err.message);
    }
  }));
}

// ---------------------------------------------------------
// Roblox game stats (visits / favorites)
// ---------------------------------------------------------
async function fetchRobloxJSON(targetUrl) {
  const res = await fetch(`/api/roblox?url=${encodeURIComponent(targetUrl)}`);
  if (!res.ok) throw new Error(`Roblox API error ${res.status}`);
  return res.json();
}

async function loadRobloxGameStats() {
  const card = document.querySelector("[data-place-id]");
  if (!card) return;

  const placeId = card.getAttribute("data-place-id");
  const visitsEl = card.querySelector(".roblox-visits");
  const favEl = card.querySelector(".roblox-favorites");

  try {
    const universeData = await fetchRobloxJSON(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`);
    const universeId = universeData && universeData.universeId;
    if (!universeId) throw new Error("Could not resolve universe id");

    const [gamesData, favData] = await Promise.all([
      fetchRobloxJSON(`https://games.roblox.com/v1/games?universeIds=${universeId}`),
      fetchRobloxJSON(`https://games.roblox.com/v1/games/${universeId}/favorites/count`)
    ]);

    const game = gamesData && gamesData.data && gamesData.data[0];
    const visits = game ? formatCount(game.visits) : null;
    const favorites = favData ? formatCount(favData.favoritesCount) : null;

    if (visitsEl && visits !== null) visitsEl.textContent = `${visits} Visits`;
    if (favEl && favorites !== null) favEl.textContent = `${favorites} Favorites`;
  } catch (err) {
    console.warn("Live Roblox stats unavailable, keeping static fallback:", err.message);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadRepoStats();
  loadRobloxGameStats();
});