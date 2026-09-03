---
name: findings-visualizer
icon: assets/logo/logo-nobg.png
description: >-
  Generate a self-contained interactive visual dashboard from any structured
  report (security audit, code review, production readiness, feature status
  tracking, release checklist, tool comparison, etc.). Use this skill whenever
  the user asks to "visualize a report", "make a report page", "show findings
  visually", "generate a visual report", "turn audit results into a dashboard",
  "make a comparison table", "create a checklist", "track feature status", or
  wants to share/present structured data in a visual format instead of plain
  markdown text. Also trigger when the user says "report viewer", "findings
  dashboard", "make this report look good", or has any structured data with
  severity/status/checked fields that would benefit from a visual dashboard.
---

# Findings Visualizer

Turn any structured report into a self-contained, interactive visual dashboard. The AI writes a small JSON config + data file, runs one command, gets a finished report.

**4 report types supported:**
- **Audit** — findings with severity levels (critical/high/medium/low). Security audits, code reviews, production readiness checks.
- **Status** — items with status (done/in-progress/todo/blocked). Feature trackers, sprint boards, project status.
- **Checklist** — items with a checked boolean. Release checklists, QA gates, deployment readiness.
- **Comparison** — options scored across criteria with pros/cons. Tool selection, architecture decisions, vendor comparison.

## How it works

Two workflows, depending on the situation:

### Workflow A: Build from config (recommended for new reports)

1. **Identify the report type** from the user's data (see "Detecting report type" below)
2. **Write a config JSON + data JSON** (the data shape depends on the type)
3. **Run the build script** — it assembles everything into one self-contained `.html` file
4. **Edit the generated HTML directly** for any custom tweaks the config doesn't cover

### Workflow B: Edit the generated HTML directly (for tweaks and custom sections)

After the build script generates the HTML, you can edit it directly to:
- Add custom sections or annotations that don't fit any component
- Tweak text, spacing, or layout beyond what config options allow
- Insert inline content between components
- Fix or adjust anything in the output

The generated HTML is a single self-contained file with clear `<!-- component-name -->` comment markers separating each section. You can safely edit between these markers. The CSS is in one `<style>` block with clear section comments. The JS is in one `<script>` block at the bottom.

**When to use which:**
- New report from scratch → Workflow A (build from config)
- User asks to "add a section", "change this text", "add a note above the table" → edit the HTML directly
- User asks to "change the color theme" or "hide the sidebar" → edit the config and rebuild (faster, cleaner)
- User asks for something the config doesn't support → build first, then edit the HTML

## Component-driven design

The skill is **data-driven, not type-driven**. There are no rigid "report types" that gate which components can appear. Instead, there are three levels of control:

### Level 1: Auto-detection (default, zero config)
Just provide data. Components appear based on what data fields exist. If you provide `findings` with `severity`, you get severity charts and findings list. If you provide `items` with `status`, you get status cards and feature list. Mix data types freely.

### Level 2: Templates (optional shortcut)
Set `"template": "security-audit"` to get a pre-built component layout for common report types. Templates set a default preset and component order. Any config field overrides the template default.

Available templates:

| Template | Preset | Use for |
|----------|--------|---------|
| `security-audit` | security | Security audits, penetration test reports |
| `code-review` | code-quality | Code reviews, lint reports, tech debt |
| `feature-status` | default | Feature trackers, sprint status, roadmaps |
| `release-checklist` | code-quality | Release gates, QA checklists, deployment readiness |
| `comparison` | architecture | Tool comparison, vendor evaluation, architecture decisions |
| `performance-audit` | performance | Performance audits, load test reports |
| `architecture-review` | architecture | Architecture reviews, design audits |

```json
{
  "title": "Security Audit",
  "findings": "findings.json",
  "template": "security-audit",
  "components": {
    "verdict": { "status": "fail", "title": "NOT READY", "subtitle": "3 criticals" }
  }
}
```

### Level 3: Full manual control
Set `components.order` to explicitly list which components to include and in what order. This overrides both auto-detection and templates entirely.

```json
{
  "title": "Custom Report",
  "findings": "findings.json",
  "items": "checklist.json",
  "components": {
    "order": ["verdict-banner", "summary-cards", "findings-list", "checklist-progress", "checklist-list"]
  }
}
```

### Data shapes and what they trigger

| Data field | What it contains | Components it triggers |
|------------|-----------------|----------------------|
| `findings` with `severity` | Audit findings | summary-cards, severity-chart, findings-list, finding-controls, filter-sidebar |
| `items` with `status` | Feature/task tracking | status-cards, progress-bar, feature-list, filter-sidebar |
| `items` with `checked` | Checklist items | checklist-progress, checklist-list, filter-sidebar |
| `comparison` with `options` | Tool/option comparison | comparison-table |
| `strengths` | Positive highlights | strengths-list |
| `components.verdict` | Pass/warn/fail verdict | verdict-banner |
| `components.stats` | Custom metric cards | stats-bar |
| `findings` with `category` | Category grouping | category-chart, heatmap-chart |
| `findings` with `effort` | Effort estimates | effort-chart |

### Mixing data types

You can provide multiple data fields in one config. All relevant components will appear:

```json
{
  "title": "Security Audit with Fix Checklist",
  "findings": "audit-findings.json",
  "items": "fix-checklist.json",
  "strengths": ["Good auth patterns"],
  "preset": "security",
  "components": {
    "verdict": { "status": "fail", "title": "NOT READY", "subtitle": "3 criticals" }
  }
}
```

This produces a report with: verdict banner, summary cards, severity chart, findings list, checklist progress, checklist list, strengths, and sidebar filters. All from one config.

## Step 1: Data JSON

### Audit findings (severity-based)

```json
[
  {
    "id": "C1",
    "title": "JWT secret hardcoded in Dockerfile",
    "severity": "critical",
    "category": "Backend",
    "location": "Dockerfile:24",
    "impact": "Anyone with image access can extract the secret",
    "recommendation": "Use Docker secrets or env injection at runtime",
    "effort": "1 hour",
    "tags": ["secrets", "docker"]
  }
]
```

| Field | Required | Description |
|-------|----------|-------------|
| `id` | yes | Short identifier (e.g. "C1", "SEC-001") |
| `title` | yes | One-line summary |
| `severity` | yes | `critical`, `high`, `medium`, or `low` (lowercase) |
| `category` | no | Grouping label for filter chips + charts |
| `location` | no | File path and/or line number |
| `impact` | no | What happens if unfixed |
| `recommendation` | no | How to fix it |
| `effort` | no | Estimated fix time (e.g. "30 min", "2 hours") |
| `tags` | no | Array of string tags |

### Status items (feature/task tracking)

```json
[
  {
    "id": "F1",
    "title": "Push notifications",
    "description": "Real-time push via Firebase Cloud Messaging",
    "status": "done",
    "assignee": "Sarah Chen",
    "progress": 100,
    "category": "Mobile",
    "tags": ["fcm", "notifications"],
    "notes": "Optional extra context shown when expanded"
  }
]
```

| Field | Required | Description |
|-------|----------|-------------|
| `id` | yes | Short identifier |
| `title` | yes | Feature/task name |
| `description` | no | One-line description shown under title |
| `status` | yes | `done`, `in-progress`, `todo`, or `blocked` (lowercase, hyphenated) |
| `assignee` | no | Person responsible |
| `progress` | no | 0-100, shown as progress bar. Auto-inferred from status if omitted |
| `category` | no | Grouping label |
| `tags` | no | Array of string tags |
| `notes` | no | Extra context shown in expanded view |
| `dueDate` | no | Due date string |

### Checklist items (release/QA gates)

```json
[
  {
    "id": "C1",
    "title": "All unit tests passing",
    "checked": true,
    "category": "Testing",
    "owner": "Sarah",
    "notes": "Optional notes shown under the item"
  }
]
```

| Field | Required | Description |
|-------|----------|-------------|
| `id` | yes | Short identifier |
| `title` | yes | Checklist item text |
| `checked` | yes | `true` or `false` |
| `category` | no | Grouping label (items grouped by category in the list) |
| `owner` | no | Person responsible |
| `notes` | no | Extra context shown under the item |

### Comparison data (tool/option evaluation)

```json
{
  "options": [
    { "name": "PostgreSQL", "verdict": "winner", "notes": "Best fit for relational data" },
    { "name": "MongoDB", "verdict": "alternative", "notes": "Flexible but lacks strict consistency" }
  ],
  "criteria": [
    { "name": "Data model fit" },
    { "name": "ACID transactions" },
    { "name": "Scalability" }
  ],
  "optionsData": [
    { "name": "PostgreSQL", "scores": { "Data model fit": 9, "ACID transactions": 10, "Scalability": 7 } },
    { "name": "MongoDB", "scores": { "Data model fit": 6, "ACID transactions": 5, "Scalability": 8 } }
  ],
  "prosCons": {
    "PostgreSQL": {
      "pros": ["Mature and battle-tested", "Excellent JSON support"],
      "cons": ["Requires manual ops", "Vertical scaling limits"]
    },
    "MongoDB": {
      "pros": ["Flexible schema", "Horizontal scaling built-in"],
      "cons": ["No strict ACID", "Less familiar to team"]
    }
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `options` | yes | Array of `{ name, verdict?, notes? }`. Verdict: "winner", "alternative", "runner-up", "overkill" |
| `criteria` | yes | Array of `{ name }` — the evaluation criteria |
| `optionsData` | yes | Array of `{ name, scores: { criteriaName: number } }` — scores 1-10 |
| `prosCons` | no | `{ optionName: { pros: [], cons: [] } }` |

## Step 2: Config JSON

### Minimal (just works)

```json
{
  "title": "Security Audit Report",
  "subtitle": "Q4 2026 penetration test",
  "findings": "findings.json"
}
```

For status/checklist, use `items` instead of `findings`. For comparison, use `comparison`.

### With presets + branding

```json
{
  "title": "Security Audit Report",
  "subtitle": "Q4 2026 penetration test",
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
  "theme": {
    "dark": { "--accent": "#c084fc", "--bg": "#0a0b0f" },
    "light": { "--accent": "#7c3aed", "--bg": "#faf9f7" }
  },
  "layout": "charts-first",
  "sidebar": false,
  "brand": { "author": "John Smith", "company": "TechCorp", "footer": "Internal use only" },
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
| `findings` | audit | Path to JSON file OR inline array (severity-based) |
| `items` | status/checklist | Path to JSON file OR inline array (status or checked-based) |
| `comparison` | comparison | Object with `options`, `criteria`, `optionsData`, `prosCons` (or path to JSON file) |
| `strengths` | no | Path to JSON file OR inline array of strings |
| `preset` | no | Color preset (see below) |
| `theme` | no | CSS variable overrides, merges on top of preset |
| `layout` | no | Layout preset (see below) |
| `sidebar` | no | `false` to hide the sidebar (auto-hides when empty) |
| `brand` | no | `{ author, company, logo, footer }` |
| `customCss` | no | Raw CSS string, appended last (full escape hatch) |
| `components.verdict` | no | `{ status, title, subtitle }` — status: "fail"/"warn"/"pass" |
| `components.stats` | no | Array of `{ num, label, icon? }` — icons: api, file, shield, clock, check, alert |
| `components.order` | no | Array of component names — controls which to include and their order |
| `components.hide` | no | Array of component names to exclude (alternative to `order`) |

## Color presets

| Preset | Accent | Use for |
|--------|--------|---------|
| `default` | Indigo | General purpose, feature tracking |
| `security` | Red | Security audits, vulnerability reports |
| `performance` | Cyan | Performance audits, load testing |
| `architecture` | Purple | Architecture reviews, comparison reports |
| `code-quality` | Emerald | Code quality, checklists, release gates |
| `infra` | Orange | Infrastructure, deployment, DevOps |

Each preset has tuned colors for both dark and light mode. Override any color:

### Flat override (applies to both dark + light)

```json
"theme": { "--accent": "#ff6b6b" }
```

### Per-mode override (full control)

```json
"theme": {
  "dark": { "--accent": "#f87171", "--bg": "#0a0b0f" },
  "light": { "--accent": "#dc2626", "--bg": "#faf9f7" }
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
| `default` | Summary cards, stats, charts side by side, heatmap full width |
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

Available components: `export-bar`, `verdict-banner`, `summary-cards`, `stats-bar`, `status-cards`, `progress-bar`, `checklist-progress`, `severity-chart`, `category-chart`, `effort-chart`, `heatmap-chart`, `filter-sidebar`, `search-bar`, `finding-controls`, `strengths-list`, `findings-list`, `feature-list`, `comparison-table`, `checklist-list`, `theme-toggle`.

Or exclude specific ones:
```json
"components": { "hide": ["heatmap-chart", "effort-chart"] }
```

## Sidebar

The sidebar shows filters (audit type), branding, and theme toggle. Hide it when not needed:

```json
"sidebar": false
```

The sidebar auto-hides when there's nothing to show (no filters, no branding). For comparison and checklist reports, `sidebar: false` is recommended since there are no severity filters.

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

## Editing the generated HTML

The build script produces a single self-contained `.html` file. You can edit it directly for custom tweaks. The file has clear structure:

```
<style>
  /* ===== THEME: DARK ===== */
  /* ===== THEME: LIGHT ===== */
  /* ===== PRESET + THEME OVERRIDES ===== */
  /* ===== LAYOUT ===== */
  /* ===== VIEW TABS ===== */
  /* ===== COMPONENT SLOTS ===== */
  /* export-bar */
  /* verdict-banner */
  /* summary-cards */
  /* ... other components ... */
  /* ===== RESPONSIVE ===== */
  /* ===== PRINT ===== */
</style>

<body>
  <div class="layout">
    <aside class="sidebar">
      <!-- {{BRAND_HEADER}} -->
      <!-- theme-toggle -->
    </aside>
    <main class="main">
      <div class="main-header"> ... </div>
      <div class="view-tabs"> ... </div>
      <div class="view-panel" id="view-overview">
        <div class="bento-grid">
          <!-- status-cards / summary-cards / charts -->
        </div>
        <!-- feature-list / comparison-table / checklist-list -->
      </div>
      <div class="view-panel" id="view-findings">
        <!-- search-bar / finding-controls / findings-list -->
      </div>
    </main>
  </div>
  <script>
    const FINDINGS = [...];
    const ITEMS = [...];
    const COMPARISON = {...};
    /* component JS + init calls */
  </script>
</body>
```

**Safe edits:**
- Add HTML between `<!-- component-name -->` comment markers
- Add CSS rules at the end of the `<style>` block (they'll override earlier rules)
- Add JS before the closing `</script>` tag
- Edit text content directly in the HTML

**Avoid:**
- Removing `<!-- component-name -->` markers (makes future edits harder)
- Editing the data arrays (`FINDINGS`, `ITEMS`, `COMPARISON`) directly, use the config + rebuild instead
- Removing CSS variables in `:root` (components depend on them)

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

See `references/component-creation.md` for the full guide.
