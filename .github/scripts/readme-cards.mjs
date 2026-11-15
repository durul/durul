// Generates the README cards (stats, top languages, streak, activity graph and
// trophies) from the GitHub GraphQL API, so the README does not depend on
// third-party Vercel instances at page load.
import { writeFileSync } from "node:fs";

const TOKEN = process.env.GH_TOKEN;
const USER = process.env.GH_USER || "durul";
const OUT_DIR = process.env.OUT_DIR || ".";

if (!TOKEN) throw new Error("GH_TOKEN is required");

const C = {
  bg: "#1F222E",
  tile: "#272B3A",
  accent: "#F85D7F",
  line: "#F8D866",
  text: "#FFFFFF",
  muted: "#9E9E9E",
  grid: "rgba(255,255,255,0.08)",
  divider: "rgba(228,226,226,0.3)",
};
const FONT = "'Segoe UI', Ubuntu, -apple-system, 'Helvetica Neue', sans-serif";

// Retries transient API failures (502s and timeouts are common on large queries).
async function gql(query, variables = {}, attempts = 3) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: { Authorization: `bearer ${TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables }),
      });
      const json = await res.json();
      if (!res.ok || json.errors) throw new Error(`${res.status} ${JSON.stringify(json.errors || json)}`);
      return json.data;
    } catch (error) {
      if (attempt >= attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 5000));
    }
  }
}

async function fetchDays() {
  const { user } = await gql(`query($login: String!) { user(login: $login) { createdAt } }`, { login: USER });
  const now = new Date();
  const startYear = new Date(user.createdAt).getUTCFullYear();

  // contributionsCollection spans at most one year, so request one alias per year.
  const aliases = [];
  for (let y = startYear; y <= now.getUTCFullYear(); y++) {
    const from = `${y}-01-01T00:00:00Z`;
    const to = y === now.getUTCFullYear() ? now.toISOString() : `${y}-12-31T23:59:59Z`;
    aliases.push(`y${y}: contributionsCollection(from: "${from}", to: "${to}") {
      contributionCalendar { weeks { contributionDays { date contributionCount } } }
    }`);
  }
  const data = await gql(`query($login: String!) { user(login: $login) { ${aliases.join("\n")} } }`, { login: USER });

  const days = new Map();
  for (const year of Object.values(data.user)) {
    for (const week of year.contributionCalendar.weeks) {
      for (const d of week.contributionDays) days.set(d.date, d.contributionCount);
    }
  }
  return [...days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

// Stats and trophies count public activity only, like the hosted cards they
// replace (those ran with a token that could not see private repos). The
// languages card also includes private repos, which needs a token with `repo` scope.
async function fetchProfile() {
  const yearStart = `${new Date().getUTCFullYear()}-01-01T00:00:00Z`;
  const data = await gql(`query($login: String!, $prQuery: String!, $issueQuery: String!, $yearStart: DateTime!) {
    prs: search(query: $prQuery, type: ISSUE) { issueCount }
    issues: search(query: $issueQuery, type: ISSUE) { issueCount }
    user(login: $login) {
      name createdAt
      followers { totalCount }
      organizations(first: 1) { totalCount }
      repositoriesContributedTo(first: 1, privacy: PUBLIC, contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, REPOSITORY]) { totalCount }
      thisYear: contributionsCollection(from: $yearStart) {
        commitContributionsByRepository(maxRepositories: 100) { repository { isPrivate } contributions { totalCount } }
      }
      lastYear: contributionsCollection {
        totalCommitContributions restrictedContributionsCount totalPullRequestReviewContributions
      }
    }
  }`, {
    login: USER,
    prQuery: `author:${USER} is:pr is:public`,
    issueQuery: `author:${USER} is:issue is:public`,
    yearStart,
  });

  const repos = [];
  let after = null;
  do {
    const { user } = await gql(`query($login: String!, $after: String) { user(login: $login) {
      repositories(first: 100, after: $after, ownerAffiliations: OWNER) {
        pageInfo { hasNextPage endCursor }
        nodes {
          isFork isPrivate stargazerCount createdAt
          languages(first: 10, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name color } } }
        }
      }
    } }`, { login: USER, after });
    repos.push(...user.repositories.nodes);
    after = user.repositories.pageInfo.hasNextPage ? user.repositories.pageInfo.endCursor : null;
  } while (after);

  const u = data.user;
  const publicRepos = repos.filter((r) => !r.isPrivate);
  return {
    name: u.name || USER,
    createdAt: u.createdAt,
    followers: u.followers.totalCount,
    orgs: u.organizations.totalCount,
    contributedTo: u.repositoriesContributedTo.totalCount,
    prs: data.prs.issueCount,
    issues: data.issues.issueCount,
    commitsThisYear: u.thisYear.commitContributionsByRepository
      .filter((r) => !r.repository.isPrivate)
      .reduce((sum, r) => sum + r.contributions.totalCount, 0),
    // The trophy card counts private contributions too, as restricted contributions.
    commitsLastYear: u.lastYear.totalCommitContributions + u.lastYear.restrictedContributionsCount,
    reviews: u.lastYear.totalPullRequestReviewContributions,
    stars: publicRepos.reduce((sum, r) => sum + r.stargazerCount, 0),
    repos: publicRepos,
    allRepos: repos,
  };
}

function computeStreak(days) {
  const total = days.reduce((sum, d) => sum + d.count, 0);
  const first = days.find((d) => d.count > 0)?.date ?? days[0].date;

  let longest = { length: 0, start: null, end: null };
  let run = { length: 0, start: null };
  for (const d of days) {
    if (d.count > 0) {
      if (run.length === 0) run.start = d.date;
      run.length++;
      if (run.length > longest.length) longest = { length: run.length, start: run.start, end: d.date };
    } else {
      run = { length: 0, start: null };
    }
  }

  // Today without contributions yet does not break the current streak.
  let i = days.length - 1;
  if (days[i].count === 0) i--;
  const current = { length: 0, start: days[days.length - 1].date, end: days[days.length - 1].date };
  if (i >= 0 && days[i].count > 0) current.end = days[i].date;
  while (i >= 0 && days[i].count > 0) {
    current.length++;
    current.start = days[i].date;
    i--;
  }

  return { total, first, longest, current, today: days[days.length - 1].date };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtDate(iso, withYear) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}${withYear ? `, ${y}` : ""}`;
}

function fmtRange({ start, end }, today) {
  const year = today.slice(0, 4);
  const withYear = start.slice(0, 4) !== year || end.slice(0, 4) !== year;
  if (start === end) return fmtDate(start, withYear);
  return `${fmtDate(start, withYear)} - ${fmtDate(end, withYear)}`;
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const num = (n) => n.toLocaleString("en-US");

function streakSvg(s) {
  const W = 495, H = 195;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="GitHub streak for ${esc(USER)}">
  <title>${esc(USER)}: ${s.current.length} day current streak, ${s.longest.length} day longest streak</title>
  <style>
    text { font-family: ${FONT}; text-anchor: middle; }
    .stat { font-size: 28px; font-weight: 700; fill: ${C.text}; }
    .label { font-size: 14px; font-weight: 400; fill: ${C.text}; }
    .range { font-size: 12px; font-weight: 400; fill: ${C.muted}; }
  </style>
  <defs>
    <mask id="ring-mask">
      <rect width="${W}" height="${H}" fill="white"/>
      <ellipse cx="247.5" cy="32" rx="13" ry="18" fill="black"/>
    </mask>
  </defs>
  <rect width="${W}" height="${H}" rx="4.5" fill="${C.bg}"/>
  <line x1="165" y1="28" x2="165" y2="170" stroke="${C.divider}"/>
  <line x1="330" y1="28" x2="330" y2="170" stroke="${C.divider}"/>

  <text x="82.5" y="79" class="stat">${num(s.total)}</text>
  <text x="82.5" y="115" class="label">Total Contributions</text>
  <text x="82.5" y="145" class="range">${fmtDate(s.first, true)} - Present</text>

  <circle cx="247.5" cy="71" r="40" fill="none" stroke="${C.accent}" stroke-width="5" mask="url(#ring-mask)"/>
  <g transform="translate(247.5, 19.5)">
    <path d="M 1.5 0.67 C 1.5 0.67 2.24 3.32 2.24 5.47 C 2.24 7.53 0.89 9.2 -1.17 9.2 C -3.23 9.2 -4.79 7.53 -4.79 5.47 L -4.76 5.11 C -6.78 7.51 -8 10.62 -8 13.99 C -8 18.41 -4.42 22 0 22 C 4.42 22 8 18.41 8 13.99 C 8 8.6 5.41 3.79 1.5 0.67 Z M -0.29 19 C -2.07 19 -3.51 17.6 -3.51 15.86 C -3.51 14.24 -2.46 13.1 -0.7 12.74 C 1.07 12.38 2.9 11.53 3.92 10.16 C 4.31 11.45 4.51 12.81 4.51 14.2 C 4.51 16.85 2.36 19 -0.29 19 Z" fill="${C.accent}"/>
  </g>
  <text x="247.5" y="81" class="stat">${num(s.current.length)}</text>
  <text x="247.5" y="140" class="label" style="fill: ${C.accent}; font-weight: 700">Current Streak</text>
  <text x="247.5" y="165" class="range">${fmtRange(s.current, s.today)}</text>

  <text x="412.5" y="79" class="stat">${num(s.longest.length)}</text>
  <text x="412.5" y="115" class="label">Longest Streak</text>
  <text x="412.5" y="145" class="range">${s.longest.length ? fmtRange(s.longest, s.today) : "-"}</text>
</svg>
`;
}

// Smallest "nice" integer tick step that fits four gridline intervals above max.
function niceMax(max) {
  const raw = Math.max(max, 4) / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((m) => m * mag >= raw);
  return Math.ceil(m * mag) * 4;
}

function activitySvg(days) {
  const recent = days.slice(-31);
  const W = 1000, H = 340;
  const pad = { left: 70, right: 30, top: 70, bottom: 70 };
  const pw = W - pad.left - pad.right;
  const ph = H - pad.top - pad.bottom;
  const yMax = niceMax(Math.max(...recent.map((d) => d.count), 1));
  const x = (i) => pad.left + (pw * i) / (recent.length - 1);
  const y = (v) => pad.top + ph - (ph * v) / yMax;

  const pts = recent.map((d, i) => [x(i), y(d.count)]);
  const line = pts.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
  const area = `${line} L${x(recent.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;

  const grid = [0, 1, 2, 3, 4].map((k) => {
    const v = (yMax * k) / 4;
    const gy = y(v).toFixed(1);
    return `<line x1="${pad.left}" y1="${gy}" x2="${W - pad.right}" y2="${gy}" stroke="${C.grid}"/>
    <text x="${pad.left - 12}" y="${gy}" class="tick" text-anchor="end" dominant-baseline="middle">${num(v)}</text>`;
  });
  const xTicks = recent.map((d, i) =>
    `<text x="${x(i).toFixed(1)}" y="${H - pad.bottom + 22}" class="tick" text-anchor="middle">${Number(d.date.slice(8))}</text>`);
  const points = pts.map(([px, py], i) =>
    `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3.5" fill="${C.text}"><title>${fmtDate(recent[i].date, true)}: ${recent[i].count}</title></circle>`);

  const range = `${fmtDate(recent[0].date, true)} - ${fmtDate(recent[recent.length - 1].date, true)}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(USER)}'s contribution graph">
  <title>${esc(USER)}'s contributions, ${range}</title>
  <style>
    text { font-family: ${FONT}; }
    .title { font-size: 22px; font-weight: 600; fill: ${C.accent}; }
    .tick { font-size: 12px; fill: ${C.muted}; }
    .axis { font-size: 13px; fill: ${C.accent}; }
  </style>
  <defs>
    <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.line}" stop-opacity="0.35"/>
      <stop offset="1" stop-color="${C.line}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" rx="6" fill="${C.bg}"/>
  <text x="${W / 2}" y="38" class="title" text-anchor="middle">${esc(USER)}'s Contribution Graph</text>
  ${grid.join("\n  ")}
  <path d="${area}" fill="url(#area)"/>
  <path d="${line}" fill="none" stroke="${C.line}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
  ${points.join("\n  ")}
  ${xTicks.join("\n  ")}
  <text x="${pad.left + pw / 2}" y="${H - 18}" class="axis" text-anchor="middle">Days (${range})</text>
  <text transform="translate(22, ${pad.top + ph / 2}) rotate(-90)" class="axis" text-anchor="middle">Contributions</text>
</svg>
`;
}

// Same rank as github-readme-stats: weighted CDFs of each stat mapped to S..C.
function calculateRank({ commits, prs, issues, reviews, stars, followers }) {
  const expCdf = (x) => 1 - 2 ** -x;
  const logNormalCdf = (x) => x / (1 + x);
  const score = 2 * expCdf(commits / 250) + 3 * expCdf(prs / 50) + expCdf(issues / 25) + expCdf(reviews / 2) +
    4 * logNormalCdf(stars / 50) + logNormalCdf(followers / 10);
  const percentile = (1 - score / 12) * 100;
  const thresholds = [1, 12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100];
  const levels = ["S", "A+", "A", "A-", "B+", "B", "B-", "C+", "C"];
  return { level: levels[thresholds.findIndex((t) => percentile <= t)], percentile };
}

// Octicons (MIT, GitHub).
const ICONS = {
  star: "M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25zm0 2.445L6.615 5.5a.75.75 0 01-.564.41l-3.097.45 2.24 2.184a.75.75 0 01.216.664l-.528 3.084 2.769-1.456a.75.75 0 01.698 0l2.77 1.456-.53-3.084a.75.75 0 01.216-.664l2.24-2.183-3.096-.45a.75.75 0 01-.564-.41L8 2.694v.001z",
  history: "M1.643 3.143L.427 1.927A.25.25 0 000 2.104V5.75c0 .138.112.25.25.25h3.646a.25.25 0 00.177-.427L2.715 4.215a6.5 6.5 0 11-1.18 4.458.75.75 0 10-1.493.154 8.001 8.001 0 101.6-5.684zM7.75 4a.75.75 0 01.75.75v2.992l2.028.812a.75.75 0 01-.557 1.392l-2.5-1A.75.75 0 017 8.25v-3.5A.75.75 0 017.75 4z",
  pr: "M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z",
  issue: "M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm9 3a1 1 0 11-2 0 1 1 0 012 0zm-.25-6.25a.75.75 0 00-1.5 0v3.5a.75.75 0 001.5 0v-3.5z",
  repo: "M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z",
};

function statsSvg(p) {
  const W = 467, H = 195;
  const rank = calculateRank({
    commits: p.commitsThisYear, prs: p.prs, issues: p.issues, reviews: p.reviews, stars: p.stars, followers: p.followers,
  });
  const rows = [
    [ICONS.star, "Total Stars Earned:", p.stars],
    [ICONS.history, `Total Commits (${new Date().getUTCFullYear()}):`, p.commitsThisYear],
    [ICONS.pr, "Total PRs:", p.prs],
    [ICONS.issue, "Total Issues:", p.issues],
    [ICONS.repo, "Contributed to (last year):", p.contributedTo],
  ].map(([icon, label, value], i) => `<g transform="translate(25, ${55 + i * 25})">
    <svg width="16" height="16" viewBox="0 0 16 16"><path fill-rule="evenodd" fill="${C.line}" d="${icon}"/></svg>
    <text x="25" y="12.5" class="stat">${label}</text>
    <text x="219" y="12.5" class="stat">${num(value)}</text>
  </g>`);
  const circumference = 2 * Math.PI * 40;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(p.name)}'s GitHub Stats">
  <title>${esc(p.name)}'s GitHub Stats, Rank: ${rank.level}</title>
  <style>
    text { font-family: ${FONT}; }
    .header { font-size: 18px; font-weight: 600; fill: ${C.accent}; }
    .stat { font-size: 14px; font-weight: 600; fill: ${C.text}; }
    .rank { font-size: 24px; font-weight: 800; fill: ${C.text}; text-anchor: middle; }
  </style>
  <rect width="${W}" height="${H}" rx="4.5" fill="${C.bg}"/>
  <text x="25" y="35" class="header">${esc(p.name)}'s GitHub Stats</text>
  ${rows.join("\n  ")}
  <g transform="translate(380.5, 110.5)">
    <circle r="40" fill="none" stroke="${C.accent}" stroke-width="6" opacity="0.2"/>
    <circle r="40" fill="none" stroke="${C.accent}" stroke-width="6" stroke-linecap="round" opacity="0.8" transform="rotate(-90)"
      stroke-dasharray="${circumference.toFixed(2)}" stroke-dashoffset="${((rank.percentile / 100) * circumference).toFixed(2)}"/>
    <text y="9" class="rank">${rank.level}</text>
  </g>
</svg>
`;
}

// Same as github-readme-stats top-langs: bytes across owned, non-fork repos (public and private).
function topLanguages(repos, count = 6) {
  const sizes = new Map();
  for (const repo of repos.filter((r) => !r.isFork)) {
    for (const { size, node } of repo.languages.edges) {
      const lang = sizes.get(node.name) ?? { name: node.name, color: node.color ?? "#858585", size: 0 };
      lang.size += size;
      sizes.set(node.name, lang);
    }
  }
  const top = [...sizes.values()].sort((a, b) => b.size - a.size).slice(0, count);
  const total = top.reduce((sum, l) => sum + l.size, 0);
  return top.map((l) => ({ ...l, percent: (l.size / total) * 100 }));
}

function langsSvg(langs) {
  const rows = Math.ceil(langs.length / 2);
  const W = 300, H = 90 + rows * 25;
  let offset = 0;
  const bar = langs.map((l) => {
    const width = (l.percent / 100) * 250;
    const rect = `<rect x="${offset.toFixed(2)}" width="${width.toFixed(2)}" height="8" fill="${l.color}"/>`;
    offset += width;
    return rect;
  });
  const items = langs.map((l, i) => {
    const x = 25 + Math.floor(i / rows) * 150, y = 80 + (i % rows) * 25;
    return `<circle cx="${x + 5}" cy="${y + 6}" r="5" fill="${l.color}"/>
  <text x="${x + 15}" y="${y + 10}" class="lang">${esc(l.name)} ${l.percent.toFixed(2)}%</text>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Most Used Languages">
  <title>Most Used Languages: ${langs.map((l) => `${esc(l.name)} ${l.percent.toFixed(2)}%`).join(", ")}</title>
  <style>
    text { font-family: ${FONT}; }
    .header { font-size: 18px; font-weight: 600; fill: ${C.accent}; }
    .lang { font-size: 11px; font-weight: 400; fill: ${C.text}; }
  </style>
  <defs><clipPath id="bar"><rect width="250" height="8" rx="5"/></clipPath></defs>
  <rect width="${W}" height="${H}" rx="4.5" fill="${C.bg}"/>
  <text x="25" y="35" class="header">Most Used Languages</text>
  <g transform="translate(25, 55)" clip-path="url(#bar)">${bar.join("")}</g>
  ${items.join("\n  ")}
</svg>
`;
}

// Rank names and thresholds from ryo-ma/github-profile-trophy.
const TROPHY_RANKS = ["SECRET", "SSS", "SS", "S", "AAA", "AA", "A", "B", "C", "?"];
const ladder = (names, mins) => ["SSS", "SS", "S", "AAA", "AA", "A", "B", "C"].map((rank, i) => [rank, names[i], mins[i]]);

function trophy(title, score, caption, conditions, hidden = false) {
  const i = conditions.findIndex(([, , min]) => score >= min);
  const [rank, name] = i >= 0 ? conditions[i] : ["?", "Unknown"];
  // Progress toward the next rank; full once the top rank is reached.
  const floor = i >= 0 ? conditions[i][2] : 0;
  const next = i === 0 ? null : conditions[(i < 0 ? conditions.length : i) - 1][2];
  const progress = next === null ? 1 : Math.min(1, (score - floor) / (next - floor));
  return { title, rank, name, caption, progress, hidden };
}

function buildTrophies(p) {
  const abbr = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
  // Trophies look at the 50 most starred repos for languages and account age.
  const top = [...p.repos].sort((a, b) => b.stargazerCount - a.stargazerCount).slice(0, 50);
  const languages = new Set(top.flatMap((r) => r.languages.edges.slice(0, 2).map((e) => e.node.name))).size;
  const earliest = top.reduce((min, r) => (r.createdAt < min ? r.createdAt : min), p.createdAt);
  const age = Date.now() - new Date(earliest).getTime();
  const years = new Date(age).getUTCFullYear() - 1970;
  const firstYear = new Date(earliest).getUTCFullYear();

  const list = [
    trophy("Stars", p.stars, `${abbr(p.stars)} stars`, ladder(
      ["Super Stargazer", "High Stargazer", "Stargazer", "Super Star", "High Star", "You are a Star", "Middle Star", "First Star"],
      [2000, 700, 200, 100, 50, 30, 10, 1])),
    trophy("Commits", p.commitsLastYear, `${abbr(p.commitsLastYear)} commits`, ladder(
      ["God Committer", "Deep Committer", "Super Committer", "Ultra Committer", "Hyper Committer", "High Committer", "Middle Committer", "First Commit"],
      [4000, 2000, 1000, 500, 200, 100, 10, 1])),
    trophy("Followers", p.followers, `${abbr(p.followers)} followers`, ladder(
      ["Super Celebrity", "Ultra Celebrity", "Hyper Celebrity", "Famous User", "Active User", "Dynamic User", "Many Friends", "First Friend"],
      [1000, 400, 200, 100, 50, 20, 10, 1])),
    trophy("Issues", p.issues, `${abbr(p.issues)} issues`, ladder(
      ["God Issuer", "Deep Issuer", "Super Issuer", "Ultra Issuer", "Hyper Issuer", "High Issuer", "Middle Issuer", "First Issue"],
      [1000, 500, 200, 100, 50, 20, 10, 1])),
    trophy("PullRequest", p.prs, `${abbr(p.prs)} PRs`, ladder(
      ["God Puller", "Deep Puller", "Super Puller", "Ultra Puller", "Hyper Puller", "High Puller", "Middle Puller", "First Pull"],
      [1000, 500, 200, 100, 50, 20, 10, 1])),
    trophy("Repositories", p.repos.length, `${p.repos.length} repos`, ladder(
      ["God Repo Creator", "Deep Repo Creator", "Super Repo Creator", "Ultra Repo Creator", "Hyper Repo Creator", "High Repo Creator", "Middle Repo Creator", "First Repository"],
      [50, 45, 40, 35, 30, 20, 10, 1])),
    trophy("Reviews", p.reviews, `${abbr(p.reviews)} reviews`, ladder(
      ["God Reviewer", "Deep Reviewer", "Super Reviewer", "Ultra Reviewer", "Hyper Reviewer", "Active Reviewer", "Intermediate Reviewer", "New Reviewer"],
      [70, 57, 45, 30, 20, 8, 3, 1])),
  ];
  const allSuper = list.every((t) => t.rank.startsWith("S")) ? 1 : 0;
  list.push(
    trophy("AllSuperRank", allSuper, "All S Rank", [["SECRET", "S Rank Hacker", 1]], true),
    trophy("MultiLanguage", languages, `${languages} languages`, [["SECRET", "Rainbow Lang User", 10]], true),
    trophy("LongTimeUser", years, `${years} years`, [["SECRET", "Village Elder", 10]], true),
    trophy("AncientUser", firstYear <= 2010 ? 1 : 0, "Before 2010", [["SECRET", "Ancient User", 1]], true),
    trophy("OGUser", firstYear <= 2008 ? 1 : 0, "Joined 2008", [["SECRET", "OG User", 1]], true),
    trophy("Joined2020", firstYear === 2020 ? 1 : 0, "Joined 2020", [["SECRET", "Everything started...", 1]], true),
    trophy("Organizations", p.orgs, `${p.orgs} orgs`, [["SECRET", "Jack of all Trades", 3]], true),
    // Measured in units of 100 days.
    trophy("Experience", Math.floor(age / 86_400_000 / 100), `${years} years`, ladder(
      ["Seasoned Veteran", "Grandmaster", "Master Dev", "Expert Dev", "Experienced Dev", "Intermediate Dev", "Junior Dev", "Newbie"],
      [70, 55, 40, 28, 18, 11, 6, 2])),
  );
  return list
    .filter((t) => !t.hidden || t.rank !== "?")
    .sort((a, b) => TROPHY_RANKS.indexOf(a.rank) - TROPHY_RANKS.indexOf(b.rank));
}

function rankColor(rank) {
  if (rank === "SECRET") return C.accent;
  if (rank.startsWith("S")) return C.line;
  if (rank.startsWith("A")) return "#7DD3FC";
  if (rank === "?") return "#5B6275";
  return "#C0C7D6";
}

function trophiesSvg(list) {
  const T = 110, GAP = 6, PAD = 12;
  const cols = Math.min(7, list.length), rows = Math.ceil(list.length / cols);
  const W = PAD * 2 + cols * T + (cols - 1) * GAP, H = PAD * 2 + rows * T + (rows - 1) * GAP;
  const tiles = list.map((t, i) => {
    const x = PAD + (i % cols) * (T + GAP), y = PAD + Math.floor(i / cols) * (T + GAP);
    const color = rankColor(t.rank);
    const letter = t.rank === "SECRET" ? "★" : t.rank;
    const fit = t.name.length > 17 ? ` textLength="100" lengthAdjust="spacingAndGlyphs"` : "";
    return `<g transform="translate(${x}, ${y})">
    <title>${t.title}: ${esc(t.name)} (${t.caption})</title>
    <rect width="${T}" height="${T}" rx="8" fill="${C.tile}"/>
    <text x="55" y="17" class="title">${t.title}</text>
    <path d="M40,24 H70 V33 C70,44 63,51 55,51 C47,51 40,44 40,33 Z" fill="${color}"/>
    <path d="M40,27 H34 C34,36 37,40 42,42 M70,27 H76 C76,36 73,40 68,42" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>
    <rect x="52.5" y="50" width="5" height="7" fill="${color}"/>
    <rect x="45" y="57" width="20" height="5" rx="1.5" fill="${color}"/>
    <text x="55" y="37" class="rank" dominant-baseline="central" style="font-size: ${letter.length > 2 ? 10 : 12}px">${letter}</text>
    <text x="55" y="78" class="name"${fit}>${esc(t.name)}</text>
    <text x="55" y="92" class="caption">${t.caption}</text>
    <rect x="20" y="99" width="70" height="3" rx="1.5" fill="${C.grid}"/>
    <rect x="20" y="99" width="${(70 * t.progress).toFixed(1)}" height="3" rx="1.5" fill="${C.accent}"/>
  </g>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="GitHub Trophies">
  <title>${esc(USER)}'s GitHub Trophies</title>
  <style>
    text { font-family: ${FONT}; text-anchor: middle; }
    .title { font-size: 12px; font-weight: 600; fill: #C9CCD6; }
    .rank { font-weight: 800; fill: ${C.bg}; }
    .name { font-size: 10.5px; font-weight: 600; fill: ${C.text}; }
    .caption { font-size: 10px; fill: ${C.muted}; }
  </style>
  <rect width="${W}" height="${H}" rx="6" fill="${C.bg}"/>
  ${tiles.join("\n  ")}
</svg>
`;
}

const days = await fetchDays();
const streak = computeStreak(days);
writeFileSync(`${OUT_DIR}/github-streak.svg`, streakSvg(streak));
writeFileSync(`${OUT_DIR}/github-activity.svg`, activitySvg(days));

const profile = await fetchProfile();
writeFileSync(`${OUT_DIR}/github-stats.svg`, statsSvg(profile));
writeFileSync(`${OUT_DIR}/github-top-langs.svg`, langsSvg(topLanguages(profile.allRepos)));
const trophies = buildTrophies(profile);
writeFileSync(`${OUT_DIR}/github-trophies.svg`, trophiesSvg(trophies));

console.log(`streak: total=${streak.total} current=${streak.current.length} longest=${streak.longest.length}`);
console.log(`stats: stars=${profile.stars} commits=${profile.commitsThisYear} prs=${profile.prs} issues=${profile.issues} contributedTo=${profile.contributedTo}`);
console.log(`languages: ${profile.allRepos.length} repos (${profile.allRepos.length - profile.repos.length} private)`);
console.log(`trophies: ${trophies.map((t) => `${t.title}=${t.rank}`).join(" ")}`);
