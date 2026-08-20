# Solomon Chua — Personal Portfolio

A HUD/cyberpunk-themed developer portfolio built with HTML, Bootstrap 5, and custom CSS, featuring live data pulled from the GitHub, Roblox, and YouTube APIs. Deployed on Vercel.

## Pages

| File            | Description                                                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `index.html`    | Homepage — profile intro, live GitHub contribution chart, achievement timeline, work experience, and navigation cards into the rest of the site. |
| `roblox.html`   | Roblox hub — live profile stats, badges, favorite games, communities, and self-developed games pulled from the Roblox API.                       |
| `books.html`    | Reading tracker — favorite genres, reading stats, and a curated list of favorite books.                                                          |
| `projects.html` | Project showcase — GitHub-terminal-styled cards for coding projects and a Roblox game, with live star/fork/visit counts.                         |
| `hobbies.html`  | Hobbies and interests page.                                                                                                                      |

## API (Serverless Endpoints)

Vercel serverless functions that proxy third-party API calls server-side, so access tokens/keys are never exposed to the browser.

| Endpoint             | Description                                                                                                                                                            |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api/github.js`      | Proxies GitHub's GraphQL API using `GITHUB_TOKEN`. Powers the live contribution calendar/chart on the homepage.                                                        |
| `api/github-rest.js` | Generic proxy to GitHub's REST API (`api.github.com/{endpoint}`) using `GITHUB_TOKEN`. Powers live repository stats (stars, forks, language) on the Projects page.     |
| `api/roblox.js`      | Proxy to Roblox's public APIs (users, friends, presence, games, groups, thumbnails, badges). Powers live profile stats, game data, and communities on the Roblox page. |
| `api/youtube.js`     | Proxies the YouTube Data API v3 using `YOUTUBE_API_KEY`. Fetches channel snippet and statistics for the connected YouTube handle.                                      |

## Directories

| Directory  | Description                                                                                                                                         |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.vercel/` | Deployment configuration linking this project to Vercel, including project ID and hosting metadata.                                                 |
| `api/`     | Serverless functions that securely proxy requests to the GitHub, Roblox, and YouTube APIs (see table above).                                        |
| `imgs/`    | Static image assets used across the site — profile photo, book covers, and page thumbnails.                                                         |
| `js/`      | Client-side scripts handling UI interactivity and live data fetching for GitHub stats, Roblox game/profile stats, YouTube stats, and project cards. |
| `json/`    | Static data files (`books.json`, `hobbies.json`) rendered dynamically into their respective pages.                                                  |

## Root Files

| File             | Description                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| `style.css`      | Global stylesheet — design tokens, HUD panels/cards, layout, and animations shared across all pages. |
| `package.json`   | Project metadata for npm/Vercel (name, version, ES module type).                                     |
| `.env.local`     | Local environment variables (API keys/tokens) — not committed to version control.                    |
| `.gitignore`     | Excludes environment files and the local `.vercel` folder from git.                                  |
| `.gitattributes` | Enforces consistent line-ending normalization across the repository.                                 |
