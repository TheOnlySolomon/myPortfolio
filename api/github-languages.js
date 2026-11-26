// Aggregated language usage across the owner's public, non-fork repos.
// Replaces the old browser-side loop that made one /api/github-rest call per repo.
// The fan-out now happens here, in parallel, next to GitHub's network, and the
// combined result is cached at Vercel's edge so most visitors never reach GitHub.
//
// Takes no input: the username is fixed, so this can't be used to query
// arbitrary accounts with GITHUB_TOKEN.
const GITHUB_USER = "TheOnlySolomon";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return res.status(500).json({ error: "GITHUB_TOKEN is missing from Vercel" });
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json"
  };

  try {
    const reposRes = await fetch(
      `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&type=owner`,
      { headers, signal: AbortSignal.timeout(8000) }
    );

    if (!reposRes.ok) {
      return res.status(502).json({ error: "GitHub repo request failed" });
    }

    const repos = await reposRes.json();
    if (!Array.isArray(repos)) {
      return res.status(502).json({ error: "Unexpected GitHub response" });
    }

    const ownRepos = repos.filter(repo => !repo.fork && !repo.private);

    // One failed repo shouldn't break the whole chart, so each lookup
    // resolves to {} on any failure instead of rejecting.
    const perRepo = await Promise.all(
      ownRepos.map(async repo => {
        try {
          const langRes = await fetch(repo.languages_url, {
            headers,
            signal: AbortSignal.timeout(8000)
          });
          return langRes.ok ? await langRes.json() : {};
        } catch {
          return {};
        }
      })
    );

    const languages = {};
    for (const repoLangs of perRepo) {
      for (const [lang, bytes] of Object.entries(repoLangs)) {
        if (typeof bytes === "number") {
          languages[lang] = (languages[lang] || 0) + bytes;
        }
      }
    }

    // Only cache successful responses, so a GitHub error isn't served for an hour.
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).json({ languages, repoCount: ownRepos.length });
  } catch (error) {
    console.error("GitHub languages error:", error);
    return res.status(500).json({ error: "Failed to fetch language data" });
  }
}