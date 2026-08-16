// =========================================================
// 1. SCROLL REVEAL
// =========================================================
const revealTargets = document.querySelectorAll('.reveal');

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

revealTargets.forEach((el) => observer.observe(el));


// =========================================================
// 2. CHART.JS - CONTRIBUTION LINE CHART (LIVE WITH GRAPHQL)
// =========================================================
let contributionChart = null;

async function initContributionChart() {
  const ctx = document.getElementById('contributionChart');
  if (!ctx) return;

  try {
    // GraphQL query for contribution data
    const query = `
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

const response = await fetch('/api/github', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ query })
});

if (!response.ok) {
  throw new Error(`Server error: ${response.status}`);
}

const data = await response.json();
    const calendar = data.data.user.contributionsCollection.contributionCalendar;
    
    // Process last 6 months of data
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 6);
    
    const monthCounts = {};
    const allDays = calendar.weeks.flatMap(week => week.contributionDays);
    
    allDays.forEach(day => {
      const date = new Date(day.date);
      if (date >= sixMonthsAgo) {
        const month = date.toLocaleString('default', { month: 'short' });
        monthCounts[month] = (monthCounts[month] || 0) + day.contributionCount;
      }
    });

    // Get last 6 months in order
    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = today.getMonth();
    const months = [];
    const contributions = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      const monthName = monthOrder[monthIndex];
      months.push(monthName);
      contributions.push(monthCounts[monthName] || 0);
    }

    // Calculate stats
    const total = calendar.totalContributions;
    const avg = (total / 12).toFixed(1);
    const best = Math.max(...contributions);
    const streak = calculateStreak(contributions);

    document.getElementById('totalCommits').textContent = total;
    document.getElementById('avgCommits').textContent = avg;
    document.getElementById('bestDay').textContent = best;
    document.getElementById('streakCount').textContent = streak;

    // Create chart
    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(167, 139, 250, 0.25)');
    gradient.addColorStop(0.5, 'rgba(167, 139, 250, 0.08)');
    gradient.addColorStop(1, 'rgba(167, 139, 250, 0)');

    if (contributionChart) contributionChart.destroy();

    contributionChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: months,
        datasets: [{
          label: 'Contributions',
          data: contributions,
          borderColor: '#a78bfa',
          backgroundColor: gradient,
          borderWidth: 2,
          pointBackgroundColor: '#a78bfa',
          pointBorderColor: '#10141f',
          pointBorderWidth: 1.5,
          pointRadius: 3,
          pointHoverRadius: 5,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { top: 5, bottom: 5, left: 5, right: 5 }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(16, 20, 31, 0.95)',
            titleColor: '#eef2f6',
            bodyColor: '#b8c0cc',
            borderColor: 'rgba(167, 139, 250, 0.3)',
            borderWidth: 1,
            padding: 8,
            cornerRadius: 6,
            callbacks: {
              label: (context) => `${context.parsed.y} contributions`,
              afterBody: (tooltipItems) => {
                const total = tooltipItems.reduce((sum, item) => sum + item.parsed.y, 0);
                return `Total: ${total}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(167, 139, 250, 0.06)', drawBorder: false },
            ticks: { color: '#6f7890', font: { size: 8, family: 'JetBrains Mono' }, maxTicksLimit: 8 }
          },
          y: {
            grid: { color: 'rgba(167, 139, 250, 0.06)', drawBorder: false },
            ticks: { color: '#6f7890', font: { size: 8, family: 'JetBrains Mono' }, stepSize: 5, maxTicksLimit: 4 },
            beginAtZero: true
          }
        },
        animation: { duration: 1500, easing: 'easeInOutQuart' }
      }
    });

  } catch (error) {
    console.error('Error fetching GitHub data:', error);
    // Fallback to static data
    useFallbackData(ctx);
  }
}

function useFallbackData(ctx) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const contributions = [12, 19, 3, 5, 2, 3, 15, 8, 12, 19, 14, 25];

  const total = contributions.reduce((a, b) => a + b, 0);
  const avg = (total / contributions.length).toFixed(1);
  const best = Math.max(...contributions);
  const streak = calculateStreak(contributions);

  document.getElementById('totalCommits').textContent = total;
  document.getElementById('avgCommits').textContent = avg;
  document.getElementById('bestDay').textContent = best;
  document.getElementById('streakCount').textContent = streak;

  const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, 'rgba(167, 139, 250, 0.25)');
  gradient.addColorStop(0.5, 'rgba(167, 139, 250, 0.08)');
  gradient.addColorStop(1, 'rgba(167, 139, 250, 0)');

  if (contributionChart) contributionChart.destroy();

  contributionChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        label: 'Contributions',
        data: contributions,
        borderColor: '#a78bfa',
        backgroundColor: gradient,
        borderWidth: 2,
        pointBackgroundColor: '#a78bfa',
        pointBorderColor: '#10141f',
        pointBorderWidth: 1.5,
        pointRadius: 3,
        pointHoverRadius: 5,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: { top: 5, bottom: 5, left: 5, right: 5 }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(16, 20, 31, 0.95)',
          titleColor: '#eef2f6',
          bodyColor: '#b8c0cc',
          borderColor: 'rgba(167, 139, 250, 0.3)',
          borderWidth: 1,
          padding: 8,
          cornerRadius: 6,
          callbacks: {
            label: (context) => `${context.parsed.y} contributions`,
            afterBody: (tooltipItems) => {
              const total = tooltipItems.reduce((sum, item) => sum + item.parsed.y, 0);
              return `Total: ${total}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(167, 139, 250, 0.06)', drawBorder: false },
          ticks: { color: '#6f7890', font: { size: 8, family: 'JetBrains Mono' }, maxTicksLimit: 8 }
        },
        y: {
          grid: { color: 'rgba(167, 139, 250, 0.06)', drawBorder: false },
          ticks: { color: '#6f7890', font: { size: 8, family: 'JetBrains Mono' }, stepSize: 5, maxTicksLimit: 4 },
          beginAtZero: true
        }
      },
      animation: { duration: 1500, easing: 'easeInOutQuart' }
    }
  });
}


// =========================================================
// 3. CHART.JS - LANGUAGE DONUT CHART (LIVE)
// =========================================================
let languageChart = null;

async function initLanguageChart() {
  const ctx = document.getElementById('languageChart');
  if (!ctx) return;

  try {
    const username = 'TheOnlySolomon';
    const response = await fetch(`/api/github-rest?endpoint=${encodeURIComponent(`users/${username}/repos?per_page=100`)}`);
    if (!response.ok) throw new Error('Failed to fetch repos');
    
    const repos = await response.json();
    const projectRepos = repos.filter(repo => !repo.fork);
    
    const languageMap = {};
    
    for (const repo of projectRepos) {
      const langPath = new URL(repo.languages_url).pathname.slice(1);
      const langResponse = await fetch(`/api/github-rest?endpoint=${encodeURIComponent(langPath)}`);
      if (langResponse.ok) {
        const langData = await langResponse.json();
        for (const [lang, bytes] of Object.entries(langData)) {
          languageMap[lang] = (languageMap[lang] || 0) + bytes;
        }
      }
    }
    
    const totalBytes = Object.values(languageMap).reduce((a, b) => a + b, 0);
    
    const filteredLanguages = {};
    for (const [lang, bytes] of Object.entries(languageMap)) {
      const percentage = (bytes / totalBytes) * 100;
      if (percentage >= 1) {
        filteredLanguages[lang] = bytes;
      }
    }
    
    const sorted = Object.entries(filteredLanguages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    
    const labels = sorted.map(([lang]) => lang);
    const data = sorted.map(([, bytes]) => ((bytes / totalBytes) * 100).toFixed(1));
    
    const colors = {
      'HTML': '#e34c26', 'CSS': '#563d7c', 'JavaScript': '#f1e05a',
      'Python': '#3572A5', 'TypeScript': '#3178c6', 'Java': '#b07219',
      'Go': '#00ADD8', 'Rust': '#dea584', 'C++': '#f34b7d',
      'C#': '#178600', 'PHP': '#4F5D95', 'Ruby': '#701516'
    };
    
    const backgroundColors = sorted.map(([lang]) => 
      colors[lang] || `hsl(${Math.random() * 360}, 70%, 50%)`
    );
    
    if (languageChart) languageChart.destroy();
    
    languageChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: backgroundColors,
          borderColor: '#10141f',
          borderWidth: 2,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { top: 5, bottom: 5, left: 5, right: 5 }
        },
        cutout: '72%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#b8c0cc',
              font: { size: 8, family: 'JetBrains Mono' },
              padding: 4,
              boxWidth: 8,
              boxHeight: 8,
              usePointStyle: true,
              pointStyle: 'circle',
              generateLabels: function(chart) {
                const data = chart.data;
                return data.labels.map((label, i) => ({
                  text: `${label} ${data.datasets[0].data[i]}%`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  strokeStyle: data.datasets[0].backgroundColor[i],
                  pointStyle: 'circle',
                  index: i
                }));
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(16, 20, 31, 0.95)',
            titleColor: '#eef2f6',
            bodyColor: '#b8c0cc',
            borderColor: 'rgba(167, 139, 250, 0.3)',
            borderWidth: 1,
            padding: 8,
            cornerRadius: 6,
            callbacks: {
              label: (context) => `${context.label}: ${context.parsed}%`
            }
          }
        },
        animation: {
          animateRotate: true,
          duration: 1200,
          easing: 'easeInOutQuart'
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching language data:', error);
    // Fallback to static data
    const fallbackData = {
      labels: ['HTML', 'CSS', 'JavaScript', 'Python'],
      data: [40, 25, 20, 15],
      colors: ['#e34c26', '#563d7c', '#f1e05a', '#3572A5']
    };
    
    if (languageChart) languageChart.destroy();
    
    languageChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: fallbackData.labels,
        datasets: [{
          data: fallbackData.data,
          backgroundColor: fallbackData.colors,
          borderColor: '#10141f',
          borderWidth: 2,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { top: 5, bottom: 5, left: 5, right: 5 }
        },
        cutout: '72%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#b8c0cc',
              font: { size: 8, family: 'JetBrains Mono' },
              padding: 4,
              boxWidth: 8,
              boxHeight: 8,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(16, 20, 31, 0.95)',
            titleColor: '#eef2f6',
            bodyColor: '#b8c0cc',
            borderColor: 'rgba(167, 139, 250, 0.3)',
            borderWidth: 1,
            padding: 8,
            cornerRadius: 6,
            callbacks: {
              label: (context) => `${context.label}: ${context.parsed}%`
            }
          }
        },
        animation: {
          animateRotate: true,
          duration: 1200,
          easing: 'easeInOutQuart'
        }
      }
    });
  }
}


// =========================================================
// 4. HELPER FUNCTIONS
// =========================================================
function calculateStreak(data) {
  let streak = 0;
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i] > 0) streak++;
    else break;
  }
  return streak;
}


// =========================================================
// 5. INITIALIZE EVERYTHING
// =========================================================
document.addEventListener('DOMContentLoaded', function() {
  initContributionChart();
  initLanguageChart();
  initProjectsList();
  console.log('🚀 Dashboard initialized');
});


// =========================================================
// MY PROJECTS - LIVE PUBLIC REPO LIST (no hardcoded repos)
// =========================================================
const LANGUAGE_COLORS = {
  'JavaScript': '#f1e05a', 'TypeScript': '#3178c6', 'HTML': '#e34c26',
  'CSS': '#563d7c', 'Python': '#3572A5', 'Java': '#b07219',
  'Go': '#00ADD8', 'Rust': '#dea584', 'C++': '#f34b7d',
  'C#': '#178600', 'PHP': '#4F5D95', 'Ruby': '#701516',
  'Shell': '#89e051', 'Jupyter Notebook': '#DA5B0B'
};

async function initProjectsList() {
  const container = document.getElementById('repoList');
  if (!container) return;

  try {
    const username = 'TheOnlySolomon';
    const response = await fetch(`/api/github-rest?endpoint=${encodeURIComponent(`users/${username}/repos?sort=updated&per_page=100`)}`);
    if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);

    const repos = await response.json();

    // Only real, non-fork public repos - pulled live, nothing hardcoded
    const projectRepos = repos
      .filter(repo => !repo.fork && !repo.private)
      .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));

    if (projectRepos.length === 0) {
      container.innerHTML = '<p class="repo-error">No public repositories found.</p>';
      return;
    }

    container.innerHTML = projectRepos.map(repo => {
      const langColor = LANGUAGE_COLORS[repo.language] || '#8892a6';

      return `
        <a href="${repo.html_url}" target="_blank" rel="noopener" class="repo-card">
          <div class="repo-card-header">
            <i class="bi bi-book"></i>
            <span class="repo-card-name">${escapeHtml(repo.name)}</span>
            <span class="repo-card-badge">Public</span>
          </div>
          <div class="repo-card-footer">
            ${repo.language ? `<span><span class="repo-lang-dot" style="background:${langColor}"></span>${escapeHtml(repo.language)}</span>` : ''}
            <span><i class="bi bi-star"></i> ${repo.stargazers_count}</span>
          </div>
        </a>
      `;
    }).join('');

  } catch (error) {
    console.error('Error fetching repositories:', error);
    container.innerHTML = '<p class="repo-error">Unable to load repositories right now.</p>';
  }
}

// Basic HTML escaping since repo names/descriptions come from an external API
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}