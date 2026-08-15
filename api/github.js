export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query } = req.body;

    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`
      },
      body: JSON.stringify({ query })
    });

    const data = await response.json();

    return res.status(response.status).json(data);

  } catch (error) {
    console.error('GitHub API error:', error);

    return res.status(500).json({
      error: 'Failed to fetch GitHub data'
    });
  }
}