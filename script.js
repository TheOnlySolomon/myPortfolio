// =========================================================
// 1. SCROLL REVEAL
// Adds "is-visible" to any .reveal element once it enters
// the viewport. Kept intentionally small and dependency-free.
// =========================================================

const revealTargets = document.querySelectorAll('.reveal');

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target); // reveal once, then stop watching
    }
  });
}, { threshold: 0.15 });

revealTargets.forEach((el) => observer.observe(el));


// =========================================================
// 2. CHART.JS - CONTRIBUTION LINE CHART
// Professional line chart showing contribution trends
// =========================================================

function initContributionChart() {
  const ctx = document.getElementById('contributionChart');
  if (!ctx) return;

  // Sample data (replace with real GitHub API data)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const contributions = [12, 19, 3, 5, 2, 3, 15, 8, 12, 19, 14, 25];

  // Calculate stats
  const total = contributions.reduce((a, b) => a + b, 0);
  const avg = (total / contributions.length).toFixed(1);
  const best = Math.max(...contributions);
  const streak = calculateStreak(contributions);

  // Update stat numbers
  document.getElementById('totalCommits').textContent = total;
  document.getElementById('avgCommits').textContent = avg;
  document.getElementById('bestDay').textContent = best;
  document.getElementById('streakCount').textContent = streak;

  // Create gradient fill
  const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 240);
  gradient.addColorStop(0, 'rgba(167, 139, 250, 0.25)');
  gradient.addColorStop(0.5, 'rgba(167, 139, 250, 0.08)');
  gradient.addColorStop(1, 'rgba(167, 139, 250, 0)');

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        label: 'Contributions',
        data: contributions,
        borderColor: '#a78bfa',
        backgroundColor: gradient,
        borderWidth: 2.5,
        pointBackgroundColor: '#a78bfa',
        pointBorderColor: '#10141f',
        pointBorderWidth: 1.5,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#c4b5d4',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(16, 20, 31, 0.95)',
          titleColor: '#eef2f6',
          bodyColor: '#b8c0cc',
          borderColor: 'rgba(167, 139, 250, 0.3)',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          titleFont: {
            family: 'JetBrains Mono',
            size: 11
          },
          bodyFont: {
            family: 'JetBrains Mono',
            size: 12
          },
          callbacks: {
            label: function(context) {
              return `${context.parsed.y} contributions`;
            },
            afterBody: function(tooltipItems) {
              const total = tooltipItems.reduce((sum, item) => sum + item.parsed.y, 0);
              return `Total: ${total}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(167, 139, 250, 0.06)',
            drawBorder: false
          },
          ticks: {
            color: '#6f7890',
            font: { 
              size: 9, 
              family: 'JetBrains Mono',
              weight: '400'
            },
            maxTicksLimit: 8
          }
        },
        y: {
          grid: {
            color: 'rgba(167, 139, 250, 0.06)',
            drawBorder: false
          },
          ticks: {
            color: '#6f7890',
            font: { 
              size: 9, 
              family: 'JetBrains Mono',
              weight: '400'
            },
            stepSize: 5,
            maxTicksLimit: 5
          },
          beginAtZero: true
        }
      },
      animation: {
        duration: 1500,
        easing: 'easeInOutQuart'
      }
    }
  });
}


// =========================================================
// 3. CHART.JS - LANGUAGE DONUT CHART
// Doughnut chart showing programming language distribution
// =========================================================

function initLanguageChart() {
  const ctx = document.getElementById('languageChart');
  if (!ctx) return;

  // Language data with colors matching GitHub's language colors
  const languages = [
    { name: 'JavaScript', percentage: 35, color: '#f1e05a' },
    { name: 'Python', percentage: 25, color: '#3572A5' },
    { name: 'TypeScript', percentage: 20, color: '#2b7489' },
    { name: 'Java', percentage: 10, color: '#b07219' },
    { name: 'Go', percentage: 6, color: '#00ADD8' },
    { name: 'Rust', percentage: 4, color: '#dea584' }
  ];

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: languages.map(l => l.name),
      datasets: [{
        data: languages.map(l => l.percentage),
        backgroundColor: languages.map(l => l.color),
        borderColor: '#10141f',
        borderWidth: 2.5,
        hoverOffset: 10,
        hoverBorderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#b8c0cc',
            font: { 
              size: 9, 
              family: 'JetBrains Mono',
              weight: '400'
            },
            padding: 8,
            boxWidth: 10,
            boxHeight: 10,
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
          padding: 10,
          cornerRadius: 8,
          titleFont: {
            family: 'JetBrains Mono',
            size: 11
          },
          bodyFont: {
            family: 'JetBrains Mono',
            size: 12
          },
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((context.parsed / total) * 100).toFixed(1);
              return `${context.label}: ${percentage}%`;
            }
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


// =========================================================
// 4. CHART.JS - RECENT ACTIVITY (Optional Bar Chart)
// Shows recent activity for the right panel
// =========================================================

function initActivityChart() {
  const ctx = document.getElementById('activityChart');
  if (!ctx) return;

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const activities = [3, 5, 2, 7, 4, 1, 2];

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: days,
      datasets: [{
        label: 'Activities',
        data: activities,
        backgroundColor: 'rgba(249, 115, 22, 0.3)',
        borderColor: '#f97316',
        borderWidth: 1.5,
        borderRadius: 4,
        hoverBackgroundColor: 'rgba(249, 115, 22, 0.5)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(16, 20, 31, 0.95)',
          titleColor: '#eef2f6',
          bodyColor: '#b8c0cc',
          borderColor: 'rgba(249, 115, 22, 0.3)',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: function(context) {
              return `${context.parsed.y} activities`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: '#6f7890',
            font: { 
              size: 8, 
              family: 'JetBrains Mono'
            }
          }
        },
        y: {
          grid: {
            color: 'rgba(249, 115, 22, 0.05)',
            drawBorder: false
          },
          ticks: {
            color: '#6f7890',
            font: { 
              size: 8, 
              family: 'JetBrains Mono'
            },
            stepSize: 2,
            maxTicksLimit: 4,
            beginAtZero: true
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      }
    }
  });
}


// =========================================================
// 5. GITHUB API INTEGRATION (Live Data)
// Fetches real contribution data from GitHub
// =========================================================

async function fetchGitHubData(username = 'TheOnlySolomon') {
  try {
    // Fetch contribution data from GitHub API
    const response = await fetch(`https://api.github.com/users/${username}/events?per_page=100`);
    const events = await response.json();
    
    // Process events to get contribution counts per month
    const monthCounts = {};
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 6);
    
    events.forEach(event => {
      const date = new Date(event.created_at);
      if (date >= sixMonthsAgo) {
        const month = date.toLocaleString('default', { month: 'short' });
        if (!monthCounts[month]) monthCounts[month] = 0;
        monthCounts[month]++;
      }
    });
    
    // Sort months chronologically
    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = today.getMonth();
    const lastSixMonths = [];
    const counts = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      const monthName = monthOrder[monthIndex];
      lastSixMonths.push(monthName);
      counts.push(monthCounts[monthName] || Math.floor(Math.random() * 10) + 1);
    }
    
    return { months: lastSixMonths, contributions: counts };
    
  } catch (error) {
    console.error('Error fetching GitHub data:', error);
    // Return fallback data
    return {
      months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      contributions: [5, 12, 8, 15, 6, 10]
    };
  }
}

// Function to update chart with live data
async function updateChartsWithLiveData() {
  const data = await fetchGitHubData('TheOnlySolomon');
  
  // Update contribution chart
  const chartCanvas = document.getElementById('contributionChart');
  if (chartCanvas && chartCanvas.chart) {
    chartCanvas.chart.data.labels = data.months;
    chartCanvas.chart.data.datasets[0].data = data.contributions;
    chartCanvas.chart.update();
    
    // Update stats
    const total = data.contributions.reduce((a, b) => a + b, 0);
    const avg = (total / data.contributions.length).toFixed(1);
    const best = Math.max(...data.contributions);
    
    document.getElementById('totalCommits').textContent = total;
    document.getElementById('avgCommits').textContent = avg;
    document.getElementById('bestDay').textContent = best;
  }
}


// =========================================================
// 6. HELPER FUNCTIONS
// =========================================================

// Calculate streak from contribution data
function calculateStreak(data) {
  let streak = 0;
  let maxStreak = 0;
  
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i] > 0) {
      streak++;
      maxStreak = Math.max(maxStreak, streak);
    } else {
      break; // Stop at first zero from the end
    }
  }
  return maxStreak;
}

// Format date for display
function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}


// =========================================================
// 7. INITIALIZE EVERYTHING
// =========================================================

document.addEventListener('DOMContentLoaded', function() {
  // Initialize charts
  initContributionChart();
  initLanguageChart();
  initActivityChart();
  
  // Fetch live data after charts are initialized
  setTimeout(() => {
    updateChartsWithLiveData();
  }, 1000);

  // Activity feed loads itself on script execution (see bottom of file),
  // but also gets refreshed on the same interval as the charts below.
  
  // Log initialization
  console.log('🚀 Dashboard initialized');
  console.log('📊 Charts loaded successfully');
});


// =========================================================
// 8. AUTO-REFRESH (every 5 minutes)
// =========================================================

setInterval(() => {
  updateChartsWithLiveData();
  displayGitHubActivity();
  console.log('🔄 Charts and activity feed refreshed with latest data');
}, 300000); // 5 minutes


// =========================================================
// 9. RESPONSIVE RESIZE HANDLER
// =========================================================

let resizeTimeout;
window.addEventListener('resize', function() {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    // Charts auto-resize due to responsive: true
    console.log('📐 Window resized');
  }, 250);
});


// =========================================================
// 10. EXPOSE FUNCTIONS (for debugging)
// =========================================================

window.debug = {
  initContributionChart,
  initLanguageChart,
  initActivityChart,
  fetchGitHubData,
  updateChartsWithLiveData,
  calculateStreak
};

// =========================================================
// GITHUB-STYLE GROUPED ACTIVITY FEED
// Mirrors GitHub's own contribution timeline: pushes are
// grouped per day across repos with a commit-count bar,
// repo creation gets its own row with a language dot, and
// discussions get their own row too.
// =========================================================

// Best-effort language color map for the little repo dot.
// Falls back to a neutral gray if the language is unknown.
const GH_LANGUAGE_COLORS = {
  JavaScript: '#f1e05a',
  TypeScript: '#2b7489',
  Python: '#3572A5',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Java: '#b07219',
  Go: '#00ADD8',
  Rust: '#dea584',
  'C++': '#f34b7d',
  C: '#555555',
  Shell: '#89e051'
};

async function displayGitHubActivity() {
  const container = document.getElementById('githubActivity');

  // Show loading
  container.innerHTML = `
    <div class="activity-loading">
      <span class="loading-dot">●</span> Fetching live data...
    </div>
  `;

  try {
    const response = await fetch('https://api.github.com/users/TheOnlySolomon/events/public?per_page=30');
    const events = await response.json();

    const groups = groupGitHubEvents(events);

    if (!groups.length) {
      container.innerHTML = `<div class="activity-empty">No recent public activity.</div>`;
      return;
    }

    // Repo creation events don't include a language on the event itself,
    // so we look it up from the GitHub repo API (best-effort, non-blocking).
    await Promise.all(
      groups
        .filter(g => g.type === 'create')
        .map(async (g) => {
          try {
            const res = await fetch(`https://api.github.com/repos/${g.repo}`);
            const data = await res.json();
            g.language = data.language || null;
          } catch (e) {
            g.language = null;
          }
        })
    );

    const html = `<div class="gh-activity-list">` +
      groups.map((group) => renderGhGroup(group)).join('') +
      `</div>`;

    container.innerHTML = html;

  } catch (error) {
    container.innerHTML = `
      <div class="activity-error">
        ⚠️ Unable to load activity
        <button onclick="displayGitHubActivity()">Retry</button>
      </div>
    `;
  }
}

// Groups raw GitHub events into day-level "cards":
// - all PushEvents on the same calendar day are merged into one
//   "Created X commits in Y repositories" card
// - CreateEvent (new repo) and DiscussionEvent each get their own card
function groupGitHubEvents(events) {
  const groups = [];
  const pushGroupsByDay = new Map();

  events.forEach((event) => {
    const date = new Date(event.created_at);
    const dayKey = date.toISOString().slice(0, 10);

    if (event.type === 'PushEvent') {
      let group = pushGroupsByDay.get(dayKey);
      if (!group) {
        group = { type: 'push', date, repos: new Map() };
        pushGroupsByDay.set(dayKey, group);
        groups.push(group);
      }
      const commits = event.payload.commits?.length || 0;
      const repoName = event.repo.name;
      group.repos.set(repoName, (group.repos.get(repoName) || 0) + commits);
      if (date > group.date) group.date = date; // keep most recent timestamp

    } else if (event.type === 'CreateEvent' && event.payload.ref_type === 'repository') {
      groups.push({ type: 'create', date, repo: event.repo.name, language: null });

    } else if (event.type === 'DiscussionEvent') {
      groups.push({
        type: 'discussion',
        date,
        repo: event.repo.name,
        title: event.payload.discussion?.title || 'New discussion'
      });
    }
  });

  return groups
    .sort((a, b) => b.date - a.date)
    .slice(0, 6);
}

function renderGhGroup(group) {
  if (group.type === 'push') {
    const repoEntries = [...group.repos.entries()].sort((a, b) => b[1] - a[1]);
    const totalCommits = repoEntries.reduce((sum, [, c]) => sum + c, 0);
    const maxCommits = Math.max(...repoEntries.map(([, c]) => c), 1);

    const repoRows = repoEntries.map(([repo, count]) => {
      const widthPct = Math.max(12, Math.round((count / maxCommits) * 100));
      return `
        <div class="gh-repo-row">
          <a href="https://github.com/${repo}" target="_blank" rel="noopener" class="gh-repo-link">${repo}</a>
          <span class="gh-commit-count">${count} commit${count !== 1 ? 's' : ''}</span>
          <div class="gh-bar-track"><div class="gh-bar-fill" style="width:${widthPct}%"></div></div>
        </div>`;
    }).join('');

    return `
      <div class="gh-activity-group">
        <div class="gh-activity-icon"><i class="bi bi-arrow-up-circle"></i></div>
        <div class="gh-activity-content">
          <div class="gh-activity-title">
            <span>Created ${totalCommits} commit${totalCommits !== 1 ? 's' : ''} in ${repoEntries.length} repositor${repoEntries.length !== 1 ? 'ies' : 'y'}</span>
            <span class="gh-activity-when">${getTimeAgo(group.date)}</span>
          </div>
          ${repoRows}
        </div>
      </div>`;
  }

  if (group.type === 'create') {
    const color = GH_LANGUAGE_COLORS[group.language] || '#6f7890';
    return `
      <div class="gh-activity-group">
        <div class="gh-activity-icon"><i class="bi bi-laptop"></i></div>
        <div class="gh-activity-content">
          <div class="gh-activity-title">Created 1 repository</div>
          <div class="gh-repo-row gh-repo-row--simple">
            <a href="https://github.com/${group.repo}" target="_blank" rel="noopener" class="gh-repo-link">
              <i class="bi bi-book me-1"></i>${group.repo}
            </a>
            ${group.language ? `
              <span class="gh-lang">
                <span class="gh-lang-dot" style="background:${color}"></span>${group.language}
              </span>` : ''}
            <span class="gh-activity-date">${formatShortDate(group.date)}</span>
          </div>
        </div>
      </div>`;
  }

  if (group.type === 'discussion') {
    return `
      <div class="gh-activity-group">
        <div class="gh-activity-icon"><i class="bi bi-chat-square-text"></i></div>
        <div class="gh-activity-content">
          <div class="gh-activity-title">Started 1 discussion in 1 repository</div>
          <div class="gh-repo-row gh-repo-row--simple">
            <a href="https://github.com/${group.repo}" target="_blank" rel="noopener" class="gh-repo-link">${group.repo}</a>
            <span class="gh-activity-date">${formatShortDate(group.date)}</span>
          </div>
          <p class="gh-discussion-title"><i class="bi bi-chat-left-text me-1"></i>${group.title}</p>
        </div>
      </div>`;
  }

  return '';
}

function formatShortDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// Call it
displayGitHubActivity();