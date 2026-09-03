---
name: findings-visualizer
description: >-
  Generate a self-contained interactive visual dashboard from any structured
  findings report (security audit, code review, production readiness, performance
  audit, etc.). Use this skill whenever the user asks to "visualize a report",
  "make a report page", "show findings visually", "generate a visual report",
  "turn audit results into a dashboard", or wants to share/present findings in
  a visual format instead of plain markdown text. Also trigger when the user
  says "report viewer", "findings dashboard", or "make this report look good".
---

# Findings Visualizer

Turn any structured findings report into a self-contained, interactive visual dashboard. The AI writes a small JSON config + findings file, runs one command, gets a finished report.

**Features:** light/dark theme toggle, print/PDF export, JSON export, severity filters, text search, sort, expand/collapse all, keyboard shortcuts, 4 chart types (donut, bar, effort, heatmap), strengths section, custom stat cards, branding, color presets, layout presets.

## How it works (3 steps)

1. **Write a findings JSON file** (the data)
2. **Write a small config JSON file** (metadata + customization)
3. **Run the build script** — it assembles everything into one self-contained file

No hand-writing markup. The build script does all assembly.

## Step 1: Findings JSON

Array of finding objects:

```json
[
  {
    "id": "C1",
    "title": "Double-booking race condition",
    "severity": "critical",
    "category": "Backend",
    "location": "bookings.service.ts:450-525",
    "impact": "Two concurrent bookings for the same slot both succeed",
    "recommendation": "Add a partial unique index or re-check inside the transaction",
    "effort": "2 hours",
    "tags": ["race-condition", "database"]
  }
]
```

| Field | Required | Description |
|-------|----------|-------------|
| `id` | yes | Short identifier (e.g. "C1", "SEC-001") |
| `title` | yes | One-line summary |
| `severity` | yes | `critical`, `high`, `medium`, or `low` (lowercase) |
| `category` | no | Grouping label for category filter chips + charts |
| `location` | no | File path and/or line number |
| `impact` | no | What happens if unfixed |
| `recommendation` | no | How to fix it |
| `effort` | no | Estimated fix time (e.g. "30 min", "2 hours", "1 day") |
| `tags` | no | Array of string tags |

## Step 2: Config JSON

### Minimal (just works)

```json
{
  "title": "Security Audit Report",
  "subtitle": "Q4 2026 penetration test",
  "findings": "findings.json"
}
```

### With presets + branding (still simple)

```json
{
  "title": "Security Audit Report",
  "subtitle": "Q4 2026 penetration test",
  "date": "December 1, 2026",
  "findings": "findings.json",
  "preset": "security",
  "layout": "compact",
  "brand": { "author": "Jane Doe", "company": "Acme Inc", "footer": "Confidential" },
  "components": {
    "verdict": { "status": "fail", "title": "NOT READY", "subtitle": "3 critical vulnerabilities" },
    "stats": [{ "num": "50", "label": "Endpoints tested", "icon": "api" }]
  }
}
```

### Full customization

```json
{
  "title": "Architecture Review",
  "subtitle": "Module boundaries, type safety, data model",
  "findings": "findings.json",
  "strengths": ["Clean three-tier module model", "Atomic payout claim pattern"],
  "preset": "architecture",
  "theme": { "--accent": "#c084fc", "--critical": "#ec4899" },
  "layout": "charts-first",
  "brand": {
    "author": "John Smith",
    "company": "TechCorp",
    "logo": "data:image/svg+xml,<svg ...></svg>",
    "footer": "Internal use only"
  },
  "customCss": ".verdict-banner { border-radius: 20px; }",
  "components": {
    "verdict": { "status": "warn", "title": "SOLID WITH CAVEATS", "subtitle": "1 high, 3 medium" },
    "stats": [{ "num": "332", "label": "Endpoints", "icon": "api" }],
    "order": ["verdict-banner", "summary-cards", "severity-chart", "findings-list"],
    "hide": ["heatmap-chart", "effort-chart"]
  }
}
```

### Config reference

| Field | Required | Description |
|-------|----------|-------------|
| `title` | yes | Report title |
| `subtitle` | yes | Subtitle |
| `date` | no | Date string, defaults to today |
| `findings` | yes | Path to JSON file OR inline array |
| `strengths` | no | Path to JSON file OR inline array of strings |
| `preset` | no | Color preset (see below) |
| `theme` | no | CSS variable overrides, merges on top of preset |
| `layout` | no | Layout preset (see below) |
| `brand` | no | `{ author, company, logo, footer }` |
| `customCss` | no | Raw CSS string, appended last (full escape hatch) |
| `components.verdict` | no | `{ status, title, subtitle }` — status: "fail"/"warn"/"pass" |
| `components.stats` | no | Array of `{ num, label, icon? }` — icons: api, file, shield, clock, check, alert |
| `components.order` | no | Array of component names — controls which to include and their order |
| `components.hide` | no | Array of component names to exclude (alternative to `order`) |

## Color presets

| Preset | Accent (dark / light) | Use for |
|--------|----------------------|---------|
| `default` | Indigo / Indigo | General purpose |
| `security` | Red / Red | Security audits, vulnerability reports |
| `performance` | Cyan / Cyan | Performance audits, load testing |
| `architecture` | Purple / Purple | Architecture reviews, design audits |
| `code-quality` | Emerald / Emerald | Code quality, linting, technical debt |
| `infra` | Orange / Orange | Infrastructure, deployment, DevOps |

Each preset has tuned colors for both dark and light mode. Override any color:

### Flat override (applies to both dark + light)

```json
"theme": { "--accent": "#ff6b6b" }
```

### Per-mode override (full control)

```json
"theme": {
  "dark": {
    "--accent": "#f87171",
    "--bg": "#0a0b0f",
    "--surface": "#141519",
    "--critical": "#fb7185"
  },
  "light": {
    "--accent": "#dc2626",
    "--bg": "#faf9f7",
    "--surface": "#ffffff",
    "--critical": "#e11d48"
  }
}
```

### All overridable CSS variables

| Variable | What it controls |
|----------|-----------------|
| `--accent` | Primary accent color (tabs, active filters, links) |
| `--accent-bg` | Accent background tint (badges, hover states) |
| `--bg` | Page background |
| `--surface` | Card/panel background |
| `--surface-hover` | Hover state for cards |
| `--border` | Border color for cards, dividers |
| `--text` | Primary text |
| `--text-muted` | Secondary text |
| `--text-dim` | Tertiary text, labels |
| `--critical` | Critical severity color |
| `--critical-bg` | Critical severity background |
| `--critical-text` | Critical severity text |
| `--high` | High severity color |
| `--high-bg` | High severity background |
| `--high-text` | High severity text |
| `--medium` | Medium severity color |
| `--medium-bg` | Medium severity background |
| `--medium-text` | Medium severity text |
| `--low` | Low severity color |
| `--low-bg` | Low severity background |
| `--low-text` | Low severity text |
| `--shadow` | Card shadow |
| `--shadow-hover` | Card hover shadow |
| `--radius` | Border radius (default: 12px) |
| `--font` | Font family stack |
| `--mono` | Monospace font stack |

## Layout presets

| Layout | Description |
|--------|-------------|
| `default` | Summary cards → stats → donut + bars + effort side by side → heatmap full width |
| `compact` | Tighter spacing, no heatmap, 3 equal-width charts |
| `charts-first` | Charts before summary cards |
| `list-first` | Minimal charts, findings list is the focus |

## Component ordering

Control exactly which components appear and in what order:

```json
"components": {
  "order": ["verdict-banner", "summary-cards", "findings-list", "theme-toggle"]
}
```

Available components: `export-bar`, `verdict-banner`, `summary-cards`, `stats-bar`, `severity-chart`, `category-chart`, `effort-chart`, `heatmap-chart`, `filter-sidebar`, `search-bar`, `finding-controls`, `strengths-list`, `findings-list`, `theme-toggle`.

Or exclude specific ones:
```json
"components": { "hide": ["heatmap-chart", "effort-chart"] }
```

## Branding

```json
"brand": {
  "author": "Jane Doe",
  "company": "Acme Inc",
  "logo": "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' ...></svg>",
  "footer": "Confidential - Internal Use Only"
}
```

- `author` and `company` show in the sidebar under the report title
- `logo` renders as an image in the sidebar (use inline SVG data URI or URL)
- `footer` shows centered text at the bottom of the report

## Custom CSS (escape hatch)

Any CSS string, appended after all other styles. Full control:

```json
"customCss": ".verdict-banner { border-radius: 20px; } .finding { border-left: 3px solid var(--accent); }"
```

## Step 3: Build

```bash
node <skill-path>/scripts/build.js config.json -o report.html --open
```

The `--open` flag opens the report in the browser. Always use it.

## Strengths JSON format

Array of strings or `{ "text": "..." }` objects:
```json
["ABAPayWay webhooks are idempotent", { "text": "Pagination is consistent" }]
```

## Output rules

- Single self-contained `.html` file, no external dependencies
- Works offline, shareable as one file

## Creating new components

Add a new `.html` file in `assets/components/` with HTML, CSS, and JS sections delimited by `<!-- HTML -->`, `<!-- CSS -->`, `<!-- JS -->` comments. Add the component name to `DEFAULT_ORDER` in `scripts/build.js`. The build script picks it up automatically.
