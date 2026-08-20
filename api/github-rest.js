export default async function handler(req, res) {
  const { endpoint } = req.query;

  if (!endpoint) {
    return res.status(400).json({ error: 'Missing endpoint parameter' });
  }

  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    return res.status(500).json({ error: 'GITHUB_TOKEN is missing from Vercel' });
  }

  try {
    const githubUrl = `https://api.github.com/${endpoint}`;

    const response = await fetch(githubUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json'
      }
    });

    const data = await response.json();

    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    return res.status(response.status).json(data);

  } catch (error) {
    console.error('GitHub REST proxy error:', error);
    return res.status(500).json({ error: 'Failed to fetch GitHub data' });
  }
}