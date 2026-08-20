// -------------------- YouTube live stats --------------------
// Fetches channel stats through our own Vercel serverless function
// (/api/youtube.js), which keeps the YouTube API key server-side.

const YOUTUBE_HANDLE = "solomonlegend7025";
const YT_CACHE_KEY = "youtube_stats_cache";
const YT_CACHE_TIME_KEY = "youtube_stats_timestamp";
const YT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const YT_FALLBACK_STATS = {
  subs: "300+",
  videos: "40+",
  views: "10K+",
  joined: "2018"
};

async function fetchYoutubeStats() {
  const now = Date.now();

  const cachedData = localStorage.getItem(YT_CACHE_KEY);
  const cachedTimestamp = localStorage.getItem(YT_CACHE_TIME_KEY);

  if (cachedData && cachedTimestamp && (now - parseInt(cachedTimestamp) < YT_CACHE_DURATION)) {
    console.log("Loading YouTube stats from local cache...");
    applyYoutubeStatsToDOM(JSON.parse(cachedData));
    return;
  }

  try {
    console.log("Fetching live YouTube stats...");

    const response = await fetch(`/api/youtube?handle=${encodeURIComponent(YOUTUBE_HANDLE)}`);
    const data = response.ok ? await response.json() : {};

    const channel = data.items && data.items[0];
    if (!channel) throw new Error("No channel data returned");

    const stats = channel.statistics || {};
    const snippet = channel.snippet || {};

    const liveStats = {
      subs: stats.subscriberCount !== undefined ? Number(stats.subscriberCount).toLocaleString() : YT_FALLBACK_STATS.subs,
      videos: stats.videoCount !== undefined ? Number(stats.videoCount).toLocaleString() : YT_FALLBACK_STATS.videos,
      views: stats.viewCount !== undefined ? Number(stats.viewCount).toLocaleString() : YT_FALLBACK_STATS.views,
      joined: snippet.publishedAt ? new Date(snippet.publishedAt).getFullYear().toString() : YT_FALLBACK_STATS.joined
    };

    localStorage.setItem(YT_CACHE_KEY, JSON.stringify(liveStats));
    localStorage.setItem(YT_CACHE_TIME_KEY, now.toString());

    applyYoutubeStatsToDOM(liveStats);

  } catch (error) {
    console.warn("YouTube live fetch failed. Using fallback:", error);

    if (cachedData) {
      applyYoutubeStatsToDOM(JSON.parse(cachedData));
      return;
    }

    applyYoutubeStatsToDOM(YT_FALLBACK_STATS);
  }
}

function applyYoutubeStatsToDOM(stats) {
  const elSubs = document.getElementById("stat-yt-subs");
  const elVideos = document.getElementById("stat-yt-videos");
  const elViews = document.getElementById("stat-yt-views");
  const elJoined = document.getElementById("stat-yt-joined");

  if (elSubs) elSubs.textContent = stats.subs;
  if (elVideos) elVideos.textContent = stats.videos;
  if (elViews) elViews.textContent = stats.views;
  if (elJoined) elJoined.textContent = stats.joined;
}

document.addEventListener("DOMContentLoaded", () => {
  fetchYoutubeStats();
});

