# Findings Visualizer

A Devin / Claude Code skill that turns any structured findings report into a self-contained, interactive HTML dashboard.

## What it does

Instead of sharing audit findings as a wall of markdown text, this skill generates a single `.html` file you can open in any browser, share with stakeholders, or attach to a PR. No server, no dependencies, no build step.

**Features:**
- Two-tab UI: Overview (charts + stats) and Findings (searchable, filterable list)
- Light/dark theme toggle with per-mode color customization
- 4 chart types: severity donut, category bars, effort breakdown, severity x category heatmap
- Print/PDF export (Ctrl+P optimized stylesheet)
- JSON export (download raw findings back from the page)
- Summary cards with severity counts
- Sort dropdown (by severity, category, effort, or ID)
- Bulk expand/collapse all findings
- Keyboard shortcuts (/ to search, e to expand all, c to collapse)
- Filterable, searchable findings table
- Expandable rows with full details (file, line, impact, fix recommendation)
- Copy-to-clipboard for file paths
- Color-coded severity badges (CRITICAL / HIGH / MEDIUM / LOW)
- Collapsible strengths section
- Custom stat cards for report metrics
- 6 color presets (security, performance, architecture, code-quality, infra, default)
- 4 layout presets (default, compact, charts-first, list-first)
- Branding: author, company, logo, footer
- Custom CSS escape hatch for full control
- Works offline, single file, zero external dependencies

## Install

### Option 1: skills.sh (recommended, all agents)

Works with Claude Code, Cursor, Cline, Windsurf, Gemini CLI, Devin, and 48+ other agent surfaces.

```bash
npx skills add neang-neang-mengseang/findings-visualizer
```

That's it. The skill lands in your local skills directory and is ready to use. No clone, no build, no config.

Pin to a specific version:
```bash
npx skills add neang-neang-mengseang/findings-visualizer@1.0.0
```

### Option 2: Install script (for manual / offline installs)

**Windows (PowerShell):**
```powershell
git clone https://github.com/neang-neang-mengseang/findings-visualizer.git
cd findings-visualizer
.\scripts\install.ps1
```

**macOS / Linux (bash):**
```bash
git clone https://github.com/neang-neang-mengseang/findings-visualizer.git
cd findings-visualizer
chmod +x scripts/install.sh
./scripts/install.sh
```

**Install options:**

| Flag | Description |
|------|-------------|
| `-Target "C:\path"` / `/custom/path` | Install to a custom directory |
| `-Force` / `--force` | Overwrite an existing install |
| `-ClaudeCode` / `--claude` | Install to `./.devin/skills/` in the current project (project-local) |

### Option 3: Claude Code plugin marketplace

```bash
/plugin marketplace add neang-neang-mengseang/findings-visualizer
/plugin install findings-visualizer
```

### Option 4: Manual install

Copy the entire `findings-visualizer/` directory to your skills folder:

| Platform | Devin skills path |
|----------|-------------------|
| Windows | `C:\Users\<you>\AppData\Roaming\devin\skills\findings-visualizer\` |
| macOS | `~/.config/devin/skills/findings-visualizer/` |
| Linux | `~/.config/devin/skills/findings-visualizer/` |

For project-local skills, copy to `.devin/skills/findings-visualizer/` in your project root.

### Verify install

After installing, the skill directory should contain:
```
findings-visualizer/
├── SKILL.md
├── plugin.json
├── scripts/build.js
└── assets/
    ├── shell.html
    └── components/
        └── *.html (14 component files)
```

Restart your agent session to pick up the new skill.

## Usage

Just ask your AI agent:

> "Turn the audit findings into a visual report"
> "Generate an HTML dashboard from these findings"
> "Make this report look good"

The AI will:
1. Collect findings from the conversation or a file
2. Write a small config JSON + findings JSON
3. Run `node scripts/build.js config.json -o report.html --open`
4. The build script assembles everything into one self-contained `.html` file

## Config JSON

### Minimal (just works)

```json
{
  "title": "Security Audit Report",
  "subtitle": "Q4 2026 penetration test",
  "findings": "findings.json"
}
```

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
  "preset": "architecture",
  "theme": {
    "dark": { "--accent": "#c084fc", "--bg": "#0a0b0f" },
    "light": { "--accent": "#7c3aed", "--bg": "#faf9f7" }
  },
  "layout": "charts-first",
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

See SKILL.md for the full config reference.

## Color presets

| Preset | Accent | Use for |
|--------|--------|---------|
| `default` | Indigo | General purpose |
| `security` | Red | Security audits, vulnerability reports |
| `performance` | Cyan | Performance audits, load testing |
| `architecture` | Purple | Architecture reviews, design audits |
| `code-quality` | Emerald | Code quality, linting, technical debt |
| `infra` | Orange | Infrastructure, deployment, DevOps |

Each preset has tuned colors for both dark and light mode. Override any color with `theme: { dark: {...}, light: {...} }`.

## Layout presets

| Layout | Description |
|--------|-------------|
| `default` | Summary cards, stats, charts side by side, heatmap full width |
| `compact` | Tighter spacing, no heatmap, 3 equal-width charts |
| `charts-first` | Charts before summary cards |
| `list-first` | Minimal charts, findings list is the focus |

## Findings JSON format

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

Only `id`, `title`, and `severity` are required. Everything else is optional and gracefully omitted if missing.

## License

MIT - see [LICENSE](LICENSE)
