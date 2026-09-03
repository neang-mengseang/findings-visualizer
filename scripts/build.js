#!/usr/bin/env node
/**
 * audit-report-viewer build script
 *
 * Assembles a self-contained report from the shell + components.
 * The AI writes a small config JSON + findings JSON, runs this script.
 *
 * Usage:
 *   node scripts/build.js <config.json> [-o output.html] [--open] [--help]
 *
 * See SKILL.md for full config format.
 */

const fs = require("fs");
const path = require("path");

// ===== COLOR PRESETS (dark + light variants) =====
const PRESETS = {
  default: {
    dark: { "--accent": "#818cf8", "--accent-bg": "rgba(129,140,248,0.12)" },
    light: { "--accent": "#4f46e5", "--accent-bg": "rgba(79,70,229,0.08)" },
  },
  security: {
    dark: { "--accent": "#f87171", "--accent-bg": "rgba(248,113,113,0.12)", "--critical": "#fb7185", "--critical-bg": "rgba(251,113,133,0.10)", "--critical-text": "#fda4af" },
    light: { "--accent": "#dc2626", "--accent-bg": "rgba(220,38,38,0.08)", "--critical": "#e11d48", "--critical-bg": "#fef2f3", "--critical-text": "#be123c" },
  },
  performance: {
    dark: { "--accent": "#22d3ee", "--accent-bg": "rgba(34,211,238,0.12)" },
    light: { "--accent": "#0891b2", "--accent-bg": "rgba(8,145,178,0.08)" },
  },
  architecture: {
    dark: { "--accent": "#c084fc", "--accent-bg": "rgba(192,132,252,0.12)" },
    light: { "--accent": "#7c3aed", "--accent-bg": "rgba(124,58,237,0.08)" },
  },
  "code-quality": {
    dark: { "--accent": "#34d399", "--accent-bg": "rgba(52,211,153,0.12)" },
    light: { "--accent": "#059669", "--accent-bg": "rgba(5,150,105,0.08)" },
  },
  infra: {
    dark: { "--accent": "#fb923c", "--accent-bg": "rgba(251,146,60,0.12)" },
    light: { "--accent": "#ea580c", "--accent-bg": "rgba(234,88,12,0.08)" },
  },
};

// ===== LAYOUT PRESETS =====
const LAYOUTS = {
  default: {
    bentoOrder: ["summary-cards", "stats-bar", "severity-chart", "category-chart", "effort-chart", "heatmap-chart"],
    severitySpan: 3, categorySpan: 5, effortSpan: 4, heatmapSpan: 12,
    padding: "36px 44px", gap: "12px",
  },
  compact: {
    bentoOrder: ["summary-cards", "severity-chart", "category-chart", "effort-chart"],
    severitySpan: 4, categorySpan: 4, effortSpan: 4, heatmapSpan: 0,
    padding: "24px 32px", gap: "8px",
  },
  "charts-first": {
    bentoOrder: ["severity-chart", "category-chart", "effort-chart", "heatmap-chart", "summary-cards", "stats-bar"],
    severitySpan: 4, categorySpan: 4, effortSpan: 4, heatmapSpan: 12,
    padding: "36px 44px", gap: "12px",
  },
  "list-first": {
    bentoOrder: ["summary-cards", "severity-chart"],
    severitySpan: 12, categorySpan: 0, effortSpan: 0, heatmapSpan: 0,
    padding: "36px 44px", gap: "12px",
  },
};

// ===== DEFAULT COMPONENT ORDER =====
const DEFAULT_ORDER = [
  "export-bar",
  "verdict-banner",
  "summary-cards",
  "stats-bar",
  "status-cards",
  "progress-bar",
  "checklist-progress",
  "severity-chart",
  "category-chart",
  "effort-chart",
  "heatmap-chart",
  "filter-sidebar",
  "search-bar",
  "finding-controls",
  "strengths-list",
  "findings-list",
  "feature-list",
  "comparison-table",
  "checklist-list",
  "theme-toggle",
];

// --- Parse args ---
const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
  audit-report-viewer build script

  Usage:
    node scripts/build.js <config.json> [-o output.html] [--open]

  Options:
    -o <file>   Output file path (default: ./report.html)
    --open      Open the report in the default browser after building
    --help      Show this help message

  Config JSON:
    title       (required) Report title
    subtitle    (required) Subtitle
    date        (optional) Date string, defaults to today
    findings    (required for audit) Path to findings JSON OR inline array. Items with "severity" field.
    items       (required for status/checklist) Path to items JSON OR inline array. Items with "status" or "checked" field.
    comparison  (required for comparison) Object with "options" and "criteria" arrays.
    strengths   (optional) Path to strengths JSON file OR inline array

    preset      (optional) Color preset: "security" | "performance" | "architecture" | "code-quality" | "infra" | "default"
    theme       (optional) CSS variable overrides, merges on top of preset
    layout      (optional) Layout preset: "default" | "compact" | "charts-first" | "list-first"
    brand       (optional) { author, company, logo, footer }
    customCss   (optional) Raw CSS string, appended last (escape hatch)
    components  (optional) {
      verdict   { status, title, subtitle }
      stats     Array of { num, label, icon? }
      order     Array of component names — controls which components to include and their order
      hide      Array of component names to exclude (alternative to order)
    }

  Example:
    node scripts/build.js config.json -o report.html --open
  `);
  process.exit(0);
}

const configPath = args.find(a => !a.startsWith("-"));
const outFlag = args.indexOf("-o");
const outputPath = outFlag !== -1 ? args[outFlag + 1] : null;
const shouldOpen = args.includes("--open");

if (!configPath) {
  console.error("Usage: node scripts/build.js <config.json> [-o output.html] [--open] [--help]");
  process.exit(1);
}

// --- Helpers ---
function readJSON(filepath, label) {
  let raw;
  try { raw = fs.readFileSync(filepath, "utf8"); }
  catch (e) { console.error(`${label} file not found: ${filepath}`); process.exit(1); }
  try { return JSON.parse(raw); }
  catch (e) { console.error(`Invalid JSON in ${label} (${filepath}): ${e.message}`); process.exit(1); }
}

// --- Load config ---
const configDir = path.dirname(path.resolve(configPath));
const config = readJSON(configPath, "Config");

if (!config.title) { console.error("Config missing required field: title"); process.exit(1); }
if (!config.findings && !config.items && !config.comparison) {
  console.error("Config missing required field: one of 'findings', 'items', or 'comparison' is required");
  process.exit(1);
}

// --- Resolve findings (audit type: items with severity) ---
let findings = config.findings || [];
if (typeof findings === "string") {
  const fpath = path.isAbsolute(findings) ? findings : path.join(configDir, findings);
  findings = readJSON(fpath, "Findings");
}
if (!Array.isArray(findings)) { console.error("Findings must be an array or path to JSON array"); process.exit(1); }

// --- Resolve items (status/checklist type: items with status or checked) ---
let items = config.items || [];
if (typeof items === "string") {
  const ipath = path.isAbsolute(items) ? items : path.join(configDir, items);
  items = readJSON(ipath, "Items");
}
if (!Array.isArray(items)) { console.error("Items must be an array or path to JSON array"); process.exit(1); }

// --- Resolve comparison data ---
let comparison = config.comparison || null;
if (typeof comparison === "string") {
  const cpath = path.isAbsolute(comparison) ? comparison : path.join(configDir, comparison);
  comparison = readJSON(cpath, "Comparison");
}

// --- Validate findings (only if present) ---
const VALID_SEVERITIES = ["critical", "high", "medium", "low"];
const errors = [];
findings.forEach((f, i) => {
  if (!f.id) errors.push(`Finding ${i}: missing "id"`);
  if (!f.title) errors.push(`Finding ${i}: missing "title"`);
  if (!f.severity) errors.push(`Finding ${i}: missing "severity"`);
  else if (!VALID_SEVERITIES.includes(f.severity)) errors.push(`Finding ${i}: invalid severity "${f.severity}"`);
});
if (errors.length > 0) {
  console.error("Findings validation failed:");
  errors.forEach(e => console.error(`  - ${e}`));
  process.exit(1);
}

// --- Validate items (only if present) ---
items.forEach((item, i) => {
  if (!item.id) errors.push(`Item ${i}: missing "id"`);
  if (!item.title) errors.push(`Item ${i}: missing "title"`);
});
if (errors.length > 0) {
  console.error("Items validation failed:");
  errors.forEach(e => console.error(`  - ${e}`));
  process.exit(1);
}

// --- Detect report type from data shape ---
const hasSeverity = findings.length > 0 && findings.some(f => f.severity);
const hasStatus = items.length > 0 && items.some(i => i.status);
const hasChecked = items.length > 0 && items.some(i => typeof i.checked === "boolean");
const hasComparison = comparison && comparison.options && comparison.options.length > 0;
const reportType = hasComparison ? "comparison" : hasChecked ? "checklist" : hasStatus ? "status" : "audit";

// --- Resolve strengths ---
let strengths = config.strengths || [];
if (typeof strengths === "string") {
  const spath = path.isAbsolute(strengths) ? strengths : path.join(configDir, strengths);
  strengths = readJSON(spath, "Strengths");
}

// --- Resolve preset + theme ---
const presetName = config.preset || "default";
const preset = PRESETS[presetName] || PRESETS.default;

// theme can be:
//   { "--accent": "#..." }              -> applies to both dark + light
//   { dark: {...}, light: {...} }        -> per-mode overrides
const userTheme = (config.theme && typeof config.theme === "object") ? config.theme : {};
const hasModeSplit = userTheme.dark || userTheme.light;
const flatOverrides = hasModeSplit ? {} : userTheme;
const darkOverrides = hasModeSplit ? (userTheme.dark || {}) : flatOverrides;
const lightOverrides = hasModeSplit ? (userTheme.light || {}) : flatOverrides;

const mergedDark = { ...preset.dark, ...darkOverrides };
const mergedLight = { ...preset.light, ...lightOverrides };

let themeCss = "/* dark mode overrides */\n:root {\n";
for (const [key, val] of Object.entries(mergedDark)) {
  themeCss += `  ${key}: ${val};\n`;
}
themeCss += "}\n";
themeCss += "/* light mode overrides */\n:root[data-theme=\"light\"] {\n";
for (const [key, val] of Object.entries(mergedLight)) {
  themeCss += `  ${key}: ${val};\n`;
}
themeCss += "}\n";

// --- Resolve layout ---
const layoutName = config.layout || "default";
const layout = LAYOUTS[layoutName] || LAYOUTS.default;

// --- Templates (optional shortcuts for common report types) ---
const TEMPLATES = {
  "security-audit": {
    preset: "security",
    components: {
      order: ["verdict-banner", "summary-cards", "stats-bar", "severity-chart", "category-chart", "effort-chart", "heatmap-chart", "search-bar", "finding-controls", "findings-list", "strengths-list", "filter-sidebar", "export-bar", "theme-toggle"]
    }
  },
  "code-review": {
    preset: "code-quality",
    components: {
      order: ["verdict-banner", "summary-cards", "severity-chart", "category-chart", "search-bar", "finding-controls", "findings-list", "strengths-list", "filter-sidebar", "export-bar", "theme-toggle"]
    }
  },
  "feature-status": {
    preset: "default",
    components: {
      order: ["status-cards", "progress-bar", "feature-list", "filter-sidebar", "export-bar", "theme-toggle"]
    }
  },
  "release-checklist": {
    preset: "code-quality",
    components: {
      order: ["checklist-progress", "checklist-list", "filter-sidebar", "export-bar", "theme-toggle"]
    }
  },
  "comparison": {
    preset: "architecture",
    sidebar: false,
    components: {
      order: ["comparison-table", "export-bar", "theme-toggle"]
    }
  },
  "performance-audit": {
    preset: "performance",
    components: {
      order: ["verdict-banner", "summary-cards", "stats-bar", "severity-chart", "category-chart", "effort-chart", "search-bar", "finding-controls", "findings-list", "strengths-list", "filter-sidebar", "export-bar", "theme-toggle"]
    }
  },
  "architecture-review": {
    preset: "architecture",
    components: {
      order: ["verdict-banner", "summary-cards", "severity-chart", "category-chart", "effort-chart", "heatmap-chart", "search-bar", "finding-controls", "findings-list", "strengths-list", "filter-sidebar", "export-bar", "theme-toggle"]
    }
  }
};

// Apply template if specified (template provides defaults, config overrides)
let templateConfig = {};
if (config.template && TEMPLATES[config.template]) {
  templateConfig = TEMPLATES[config.template];
  // Template provides default preset, but config.preset overrides
  if (!config.preset && templateConfig.preset) config.preset = templateConfig.preset;
  // Template provides default sidebar, but config.sidebar overrides
  if (config.sidebar === undefined && templateConfig.sidebar !== undefined) {
    config.sidebar = templateConfig.sidebar;
  }
}

// --- Determine component order + inclusion ---
// Priority: config.components.order > template.components.order > DEFAULT_ORDER (auto-detect)
let componentNames;
if (config.components?.order && Array.isArray(config.components.order)) {
  componentNames = config.components.order;
} else if (templateConfig.components?.order) {
  componentNames = [...templateConfig.components.order];
  if (config.components?.hide && Array.isArray(config.components.hide)) {
    componentNames = componentNames.filter(n => !config.components.hide.includes(n));
  }
} else {
  componentNames = [...DEFAULT_ORDER];
  if (config.components?.hide && Array.isArray(config.components.hide)) {
    componentNames = componentNames.filter(n => !config.components.hide.includes(n));
  }
}

// Auto-include logic: data-driven, not type-driven
// Any component shows if its data exists, regardless of "report type"
const includeSearch = (findings.length > 5) || (items.length > 5);
const includeVerdict = config.components?.verdict !== undefined && config.components?.verdict !== false;
const includeStats = config.components?.stats !== undefined && config.components?.stats !== false;
const includeStrengths = Array.isArray(strengths) && strengths.length > 0;
const includeCategoryChart = findings.some(f => f.category) || items.some(i => i.category);
const includeEffortChart = findings.some(f => f.effort);
const includeHeatmap = findings.some(f => f.category) && findings.some(f => f.severity);
const includeSummaryCards = findings.length > 0 && findings.some(f => f.severity);
const includeSeverityChart = findings.length > 0 && findings.some(f => f.severity);
const includeFindingsList = findings.length > 0;
const includeFindingControls = findings.length > 0;
const includeStatusCards = items.length > 0 && items.some(i => i.status);
const includeProgressBar = items.length > 0 && items.some(i => i.status);
const includeChecklistProgress = items.length > 0 && items.some(i => typeof i.checked === "boolean");
const includeFeatureList = items.length > 0 && items.some(i => i.status);
const includeChecklistList = items.length > 0 && items.some(i => typeof i.checked === "boolean");
const includeComparisonTable = comparison && comparison.options && comparison.options.length > 0;

// If using default order, auto-include based on data presence
if (!config.components?.order) {
  componentNames = componentNames.filter(name => {
    if (name === "verdict-banner") return includeVerdict;
    if (name === "stats-bar") return includeStats;
    if (name === "search-bar") return includeSearch;
    if (name === "strengths-list") return includeStrengths;
    if (name === "category-chart") return includeCategoryChart;
    if (name === "effort-chart") return includeEffortChart;
    if (name === "heatmap-chart") return includeHeatmap && layout.heatmapSpan > 0;
    if (name === "summary-cards") return includeSummaryCards;
    if (name === "severity-chart") return includeSeverityChart;
    if (name === "findings-list") return includeFindingsList;
    if (name === "finding-controls") return includeFindingControls;
    if (name === "filter-sidebar") return true;
    if (name === "status-cards") return includeStatusCards;
    if (name === "progress-bar") return includeProgressBar;
    if (name === "feature-list") return includeFeatureList;
    if (name === "checklist-progress") return includeChecklistProgress;
    if (name === "checklist-list") return includeChecklistList;
    if (name === "comparison-table") return includeComparisonTable;
    return true;
  });
} else {
  // Custom order: include everything specified, only filter if data is completely missing
  componentNames = componentNames.filter(name => {
    if (name === "strengths-list") return includeStrengths;
    if (name === "category-chart") return includeCategoryChart;
    if (name === "effort-chart") return includeEffortChart;
    if (name === "heatmap-chart") return includeHeatmap;
    if (name === "comparison-table") return includeComparisonTable;
    return true;
  });
}

// --- Paths ---
const scriptDir = __dirname;
const skillDir = path.dirname(scriptDir);
const shellPath = path.join(skillDir, "assets", "shell.html");
const compDir = path.join(skillDir, "assets", "components");

// --- Extract sections from a component file ---
function parseComponent(file) {
  let raw;
  try { raw = fs.readFileSync(path.join(compDir, file), "utf8"); }
  catch (e) { console.error(`Component file not found: ${file}`); process.exit(1); }
  const extract = (tag) => {
    const m = raw.match(new RegExp(`<!-- ${tag} -->\\s*([\\s\\S]*?)(?=<!-- (?:HTML|CSS|JS) -->|$)`));
    return m ? m[1].trim() : "";
  };
  return { html: extract("HTML"), css: extract("CSS"), js: extract("JS") };
}

// --- Load shell ---
let shell = fs.readFileSync(shellPath, "utf8");

// --- Load + concatenate components ---
let css = "";
let sidebarHtml = "";
let headerHtml = "";
let bentoHtml = "";
let preBentoHtml = "";
let postBentoHtml = "";
let mainBodyHtml = "";
let js = "";

const bentoComponents = layout.bentoOrder;

for (const name of componentNames) {
  const file = `${name}.html`;
  const comp = parseComponent(file);

  css += `\n/* ${name} */\n${comp.css}\n`;
  js += `\n// ${name}\n${comp.js}\n`;

  if (name === "filter-sidebar") {
    sidebarHtml += `\n<!-- ${name} -->\n${comp.html}\n`;
  } else if (name === "theme-toggle" || name === "export-bar") {
    headerHtml += `\n<!-- ${name} -->\n${comp.html}\n`;
  } else if (name === "verdict-banner") {
    preBentoHtml += `\n<!-- ${name} -->\n${comp.html}\n`;
  } else if (name === "status-cards" || name === "progress-bar" || name === "checklist-progress") {
    bentoHtml += `\n<!-- ${name} -->\n${comp.html}\n`;
  } else if (bentoComponents.includes(name)) {
    bentoHtml += `\n<!-- ${name} -->\n${comp.html}\n`;
  } else if (name === "search-bar" || name === "finding-controls" || name === "findings-list" || name === "strengths-list") {
    // Audit-type body components go in the Findings tab
    mainBodyHtml += `\n<!-- ${name} -->\n${comp.html}\n`;
  } else if (name === "feature-list" || name === "comparison-table" || name === "checklist-list") {
    // Non-audit body components go in the Overview tab (active by default)
    postBentoHtml += `\n<!-- ${name} -->\n${comp.html}\n`;
  } else {
    postBentoHtml += `\n<!-- ${name} -->\n${comp.html}\n`;
  }
}

// --- Build bento grid CSS from layout ---
let bentoCss = `
.bento-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: ${layout.gap}; margin-bottom: 24px; }
.bento-grid > .summary { grid-column: span 12; margin-bottom: 0; }
.bento-grid > .stats-bar { grid-column: span 12; margin-bottom: 0; }
.bento-grid > .status-summary { grid-column: span 8; margin-bottom: 0; }
.bento-grid > .progress-wrap { grid-column: span 4; margin-bottom: 0; }
.bento-grid > .checklist-progress-wrap { grid-column: span 4; margin-bottom: 0; }
.bento-grid > .chart-card { margin-bottom: 0; }
.bento-grid > .chart-card.severity-chart-wrap { grid-column: span ${layout.severitySpan}; }
.bento-grid > .chart-card.category-chart-wrap { grid-column: span ${layout.categorySpan}; }
.bento-grid > .chart-card.effort-chart-wrap { grid-column: span ${layout.effortSpan}; }
.bento-grid > .chart-card.heatmap-chart-wrap { grid-column: span ${layout.heatmapSpan}; }
@media (max-width: 1100px) {
  .bento-grid > .chart-card.severity-chart-wrap,
  .bento-grid > .chart-card.effort-chart-wrap,
  .bento-grid > .checklist-progress-wrap,
  .bento-grid > .progress-wrap { grid-column: span 6; }
  .bento-grid > .chart-card.category-chart-wrap,
  .bento-grid > .status-summary { grid-column: span 12; }
}
@media (max-width: 700px) {
  .bento-grid > .chart-card,
  .bento-grid > .summary,
  .bento-grid > .stats-bar,
  .bento-grid > .status-summary,
  .bento-grid > .progress-wrap,
  .bento-grid > .checklist-progress-wrap { grid-column: span 12; }
}
.main { padding: ${layout.padding}; }
`;

let mainTopHtml;
if (bentoHtml) {
  mainTopHtml = preBentoHtml + `\n<div class="bento-grid">\n${bentoHtml}\n</div>\n` + postBentoHtml;
} else {
  mainTopHtml = preBentoHtml + postBentoHtml;
}

// --- Build init calls ---
let initCalls = "\n// ===== INIT =====\ninitTheme();\n";
if (componentNames.includes("filter-sidebar")) initCalls += "initSidebar(); bindFilters();\n";
initCalls += `document.getElementById("tab-findings-count").textContent = ${findings.length || items.length};\n`;
// Audit type init
if (componentNames.includes("summary-cards")) initCalls += "renderSummary();\nrenderCounts();\n";
if (componentNames.includes("severity-chart")) initCalls += "renderSeverityChart();\n";
if (componentNames.includes("category-chart")) initCalls += "renderCategoryChart();\n";
if (componentNames.includes("effort-chart")) initCalls += "renderEffortChart();\n";
if (componentNames.includes("heatmap-chart")) initCalls += "renderHeatmap();\n";
if (componentNames.includes("search-bar")) initCalls += "bindSearch();\n";
if (componentNames.includes("finding-controls")) initCalls += "bindKeyboard();\n";
if (componentNames.includes("findings-list")) initCalls += "renderFindings();\n";
if (componentNames.includes("strengths-list")) initCalls += "renderStrengths();\n";
// Status type init
if (componentNames.includes("status-cards")) initCalls += "renderStatusCards();\n";
if (componentNames.includes("progress-bar")) initCalls += "renderProgressBar();\n";
if (componentNames.includes("feature-list")) initCalls += "renderFeatureList();\n";
// Checklist type init
if (componentNames.includes("checklist-progress")) initCalls += "renderChecklistProgress();\n";
if (componentNames.includes("checklist-list")) initCalls += "renderChecklistList();\n";
// Comparison type init
if (componentNames.includes("comparison-table")) initCalls += "renderComparisonTable();\n";
// Verdict + stats
if (componentNames.includes("verdict-banner") && config.components?.verdict) {
  const v = config.components.verdict;
  initCalls += `renderVerdict(${JSON.stringify(v.status)}, ${JSON.stringify(v.title)}, ${JSON.stringify(v.subtitle)});\n`;
}
if (componentNames.includes("stats-bar") && config.components?.stats) {
  initCalls += `renderStatsBar(${JSON.stringify(config.components.stats)});\n`;
}

// --- Hide tabs for non-audit types (everything is in Overview) ---
const showTabs = reportType === "audit";
const tabsCss = showTabs ? "" : `.view-tabs { display: none !important; }`;

// --- Sidebar visibility ---
const showSidebar = config.sidebar !== false && (sidebarHtml.trim() !== "" || config.brand);
const sidebarCss = showSidebar ? "" : `.sidebar { display: none !important; } .layout { flex-direction: column; } .main { max-width: 1200px; margin: 0 auto; width: 100%; }`;

// --- Branding ---
let brandCss = "";
let brandHeaderHtml = "";
let brandFooterHtml = "";

if (config.brand) {
  const b = config.brand;
  if (b.logo) {
    brandHeaderHtml = `<img class="brand-logo" src="${b.logo}" alt="${b.company || 'Logo'}" />`;
    brandCss += `.brand-logo { height: 32px; width: auto; margin-bottom: 12px; border-radius: 4px; }\n`;
  }
  if (b.author || b.company) {
    const parts = [b.author, b.company].filter(Boolean);
    brandHeaderHtml += `<div class="brand-meta">${parts.join(" · ")}</div>`;
    brandCss += `.brand-meta { font-size: 12px; color: var(--text-dim); margin-top: 8px; font-family: var(--mono); }\n`;
  }
  if (b.footer) {
    brandFooterHtml = `<div class="brand-footer">${b.footer}</div>`;
    brandCss += `.brand-footer { text-align: center; padding: 24px; font-size: 12px; color: var(--text-dim); border-top: 1px solid var(--border); margin-top: 40px; }\n`;
  }
}

// --- Custom CSS escape hatch ---
const customCss = config.customCss || "";

// --- Assemble ---
shell = shell
  .replace("__REPORT_TITLE__", config.title || "Report")
  .replace(/__REPORT_TITLE__/g, config.title || "Report")
  .replace(/__REPORT_SUBTITLE__/g, config.subtitle || "")
  .replace(/__SIDEBAR_TITLE__/g, config.sidebarTitle || config.title || "Report")
  .replace(/__GENERATED_DATE__/g, config.date || new Date().toLocaleDateString())
  .replace("__FINDINGS_JSON__", JSON.stringify(findings))
  .replace("__STRENGTHS_JSON__", JSON.stringify(strengths))
  .replace("__ITEMS_JSON__", JSON.stringify(items))
  .replace("__COMPARISON_JSON__", JSON.stringify(comparison || {}))
  .replace("/* {{COMPONENT_CSS}} */", css + bentoCss + brandCss + customCss + tabsCss + sidebarCss)
  .replace("<!-- {{BRAND_HEADER}} -->", brandHeaderHtml)
  .replace("<!-- {{BRAND_FOOTER}} -->", brandFooterHtml)
  .replace("<!-- {{COMPONENT_SIDEBAR}} -->", sidebarHtml)
  .replace("<!-- {{COMPONENT_HEADER}} -->", headerHtml ? `<div class="header-actions">${headerHtml}</div>` : "")
  .replace("<!-- {{COMPONENT_MAIN_TOP}} -->", mainTopHtml)
  .replace("<!-- {{COMPONENT_MAIN_BODY}} -->", mainBodyHtml)
  .replace("/* {{THEME_CSS}} */", themeCss)
  .replace("/* {{COMPONENT_JS}} */", js + initCalls);

// --- Write output ---
const outFile = outputPath || path.join(process.cwd(), "report.html");
fs.writeFileSync(outFile, shell, "utf8");

console.log(`\n  Report generated: ${outFile}`);
const dataCount = findings.length || items.length || (comparison?.options?.length || 0);
console.log(`  Type: ${reportType} | Items: ${dataCount} | Strengths: ${strengths.length} | Components: ${componentNames.length}`);
console.log(`  Preset: ${presetName} | Layout: ${layoutName}${config.brand ? " | Branded" : ""}`);

if (shouldOpen) {
  const { exec } = require("child_process");
  const cmd = process.platform === "win32" ? `powershell -Command "Start-Process '${outFile.replace(/'/g, "''")}'"`
    : process.platform === "darwin" ? `open "${outFile}"`
    : `xdg-open "${outFile}"`;
  exec(cmd, () => console.log("  Opened in browser."));
}

console.log("");
