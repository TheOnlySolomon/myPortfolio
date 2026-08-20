// Fixed GraphQL query for the homepage's contribution calendar.
// Not accepted from the client — this endpoint has exactly one job,
// so the query is hardcoded here rather than relayed from req.body.
// This prevents the endpoint from being used as an open GraphQL proxy
// against GITHUB_TOKEN for arbitrary queries.
const CONTRIBUTION_QUERY = `
  query {
    user(login: "TheOnlySolomon") {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              contributionCount
              date
            }
          }
        }
      }
    }
  }
`;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      return res.status(500).json({
        error: 'GITHUB_TOKEN is missing from Vercel'
      });
    }

    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ query: CONTRIBUTION_QUERY })
    });

    const data = await response.json();

    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    return res.status(response.status).json(data);

  } catch (error) {
    console.error('GitHub API error:', error);

    return res.status(500).json({
      error: 'Failed to fetch GitHub data'
    });
  }
}