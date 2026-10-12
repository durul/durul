// Generates github-streak.svg and github-activity.svg from the GitHub GraphQL API,
// so the README does not depend on third-party Vercel instances at page load.
import { writeFileSync } from "node:fs";

const TOKEN = process.env.GH_TOKEN;
const USER = process.env.GH_USER || "durul";
const OUT_DIR = process.env.OUT_DIR || ".";

if (!TOKEN) throw new Error("GH_TOKEN is required");

const C = {
  bg: "#1F222E",
  accent: "#F85D7F",
  line: "#F8D866",
  text: "#FFFFFF",
  muted: "#9E9E9E",
  grid: "rgba(255,255,255,0.08)",
  divider: "rgba(228,226,226,0.3)",
};
const FONT = "'Segoe UI', Ubuntu, -apple-system, 'Helvetica Neue', sans-serif";

async function gql(query, variables = {}) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(JSON.stringify(json.errors || json));
  return json.data;
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

function computeStats(days) {
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

const days = await fetchDays();
const stats = computeStats(days);
writeFileSync(`${OUT_DIR}/github-streak.svg`, streakSvg(stats));
writeFileSync(`${OUT_DIR}/github-activity.svg`, activitySvg(days));
console.log(`total=${stats.total} current=${stats.current.length} longest=${stats.longest.length} days=${days.length}`);
