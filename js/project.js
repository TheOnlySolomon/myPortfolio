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

// Reverses formatCount() so totals can be summed from already-rendered
// card text (handles plain numbers as well as "K"/"M" suffixed ones).
function parseFormattedCount(text) {
  if (!text) return 0;
  const match = text.match(/([\d.]+)\s*(K|M)?/i);
  if (!match) return 0;
  let num = parseFloat(match[1]);
  const suffix = (match[2] || "").toUpperCase();
  if (suffix === "K") num *= 1_000;
  if (suffix === "M") num *= 1_000_000;
  return Math.round(num);
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

  // Repo count doesn't depend on the network, so it can be set immediately.
  const totalReposEl = document.getElementById("statTotalRepos");
  if (totalReposEl) totalReposEl.textContent = cards.length;

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

  updateRepoTotals(cards);
}

// Sums stars/forks across every repo card (live values where the fetch
// succeeded, static fallback values where it didn't) into the stat cards.
function updateRepoTotals(cards) {
  let totalStars = 0;
  let totalForks = 0;

  cards.forEach((card) => {
    totalStars += parseFormattedCount(card.querySelector(".repo-stars")?.textContent);
    totalForks += parseFormattedCount(card.querySelector(".repo-forks")?.textContent);
  });

  const totalStarsEl = document.getElementById("statTotalStars");
  const totalForksEl = document.getElementById("statTotalForks");

  if (totalStarsEl) totalStarsEl.textContent = formatCount(totalStars) ?? totalStars;
  if (totalForksEl) totalForksEl.textContent = formatCount(totalForks) ?? totalForks;
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

    const totalFavEl = document.getElementById("statTotalFavorites");
    if (totalFavEl && favorites !== null) totalFavEl.textContent = favorites;
  } catch (err) {
    console.warn("Live Roblox stats unavailable, keeping static fallback:", err.message);
  }
}

// ---------------------------------------------------------
// Commit stats (reuses the fixed contribution-calendar query
// already served by /api/github for the homepage's stats panel)
// ---------------------------------------------------------
async function loadCommitStats() {
  const totalCommitsEl = document.getElementById("statTotalCommits");
  if (!totalCommitsEl) return;

  try {
    const res = await fetch("/api/github");
    if (!res.ok) throw new Error(`GitHub API error ${res.status}`);

    const data = await res.json();
    const total = data?.data?.user?.contributionsCollection?.contributionCalendar?.totalContributions;
    if (typeof total !== "number") throw new Error("Malformed contribution data");

    totalCommitsEl.textContent = formatCount(total) ?? total;
  } catch (err) {
    console.warn("Live commit stats unavailable, keeping placeholder:", err.message);
  }
}

// ---------------------------------------------------------
// Live GitHub profile picture (falls back to the local
// ./imgs/i-profile.png already in the HTML if the fetch fails)
// ---------------------------------------------------------
async function loadGithubAvatar() {
  const avatarEl = document.getElementById("github-avatar");
  if (!avatarEl) return;

  const username = "TheOnlySolomon";
  try {
    const res = await fetch(`/api/github-rest?endpoint=${encodeURIComponent(`users/${username}`)}`);
    if (!res.ok) throw new Error(`GitHub API error ${res.status}`);

    const data = await res.json();
    if (!data.avatar_url) throw new Error("No avatar_url in response");

    avatarEl.src = data.avatar_url;
  } catch (err) {
    console.warn("Live GitHub avatar unavailable, keeping local fallback:", err.message);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadRepoStats();
  loadRobloxGameStats();
  loadCommitStats();
  loadGithubAvatar();
});

// -------------------- Spotify live top chart --------------------
// Fetches a live chart through our own Vercel serverless function
// (/api/spotify.js), which keeps the Spotify client secret server-side.

const SP_CACHE_KEY = "spotify_top_cache";
const SP_CACHE_TIME_KEY = "spotify_top_timestamp";
const SP_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

async function fetchSpotifyTop() {
  const list = document.getElementById("playlist-list");
  if (!list) return;

  const now = Date.now();
  const cachedData = localStorage.getItem(SP_CACHE_KEY);
  const cachedTimestamp = localStorage.getItem(SP_CACHE_TIME_KEY);

  if (cachedData && cachedTimestamp && (now - parseInt(cachedTimestamp) < SP_CACHE_DURATION)) {
    renderPlaylist(JSON.parse(cachedData));
    return;
  }

  try {
    const response = await fetch("/api/spotify");
    if (!response.ok) throw new Error(`Spotify proxy responded ${response.status}`);

    const data = await response.json();
    const tracks = data.tracks || [];
    if (!tracks.length) throw new Error("No tracks returned");

    localStorage.setItem(SP_CACHE_KEY, JSON.stringify(tracks));
    localStorage.setItem(SP_CACHE_TIME_KEY, now.toString());

    renderPlaylist(tracks);
  } catch (error) {
    console.warn("Spotify live fetch failed:", error);

    if (cachedData) {
      renderPlaylist(JSON.parse(cachedData));
      return;
    }

    list.innerHTML = `<p class="m-0" style="font-size: 0.75rem; color: var(--gray-1, #8b949e);">Couldn't load the live chart right now.</p>`;
  }
}

function escapePlaylistHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function renderPlaylist(tracks) {
  const list = document.getElementById("playlist-list");
  if (!list) return;

  list.innerHTML = tracks.map(track => `
    <a href="${track.url || '#'}" target="_blank" rel="noopener noreferrer"
      class="d-flex align-items-center gap-2 py-1 text-decoration-none"
      style="border-bottom: 1px solid var(--line-bright, #30363d);">
      <span style="width: 1.4rem; font-size: 0.7rem; color: var(--gray-1, #8b949e); flex-shrink: 0;">${track.rank}</span>
      ${track.image ? `<img src="${track.image}" alt="" width="28" height="28" style="border-radius: 4px; flex-shrink: 0;">` : ""}
      <span class="d-flex flex-column" style="min-width: 0;">
        <span style="font-size: 0.75rem; color: var(--white, #f0f6fc); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapePlaylistHtml(track.title)}</span>
        <span style="font-size: 0.68rem; color: var(--gray-1, #8b949e); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapePlaylistHtml(track.artist)}</span>
      </span>
    </a>
  `).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  fetchSpotifyTop();
});