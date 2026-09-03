# Creating new components

Components are self-contained `.html` files in `assets/components/`. Each file holds its HTML, CSS, and JS in clearly delimited sections. The build script extracts these sections and routes them to the correct shell slot.

## File format

Every component file has this structure:

```html
<!-- COMPONENT: my-block -->
<!-- SLOT: COMPONENT_MAIN_TOP -->
<!-- DESCRIPTION: When to include this component -->

<!-- HTML -->
<div class="my-block" id="my-block"></div>

<!-- CSS -->
.my-block {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  margin-bottom: 24px;
}

<!-- JS -->
function renderMyBlock(data) {
  document.getElementById("my-block").innerHTML = escapeHtml(data.text);
}
```

## Available slots

| Slot | Location | Used by |
|------|----------|---------|
| `COMPONENT_MAIN_TOP` | Top of `<main>`, before findings | export-bar, verdict-banner, summary-cards, stats-bar, search-bar, severity-chart, category-chart |
| `COMPONENT_MAIN_BODY` | Below main-top, in `<main>` | findings-list, strengths-list |
| `COMPONENT_SIDEBAR` | Inside `<aside>` | filter-sidebar, theme-toggle |

CSS and JS from all included components are concatenated into `{{COMPONENT_CSS}}` and `{{COMPONENT_JS}}` respectively, regardless of slot.

## Shell context available to components

The shell defines these globals before any component JS runs:

```js
const FINDINGS = [...];      // the findings array
const STRENGTHS = [...];     // the strengths array
let activeSeverity = "all";  // current severity filter
let activeCategory = null;   // current category filter
let searchTerm = "";         // current search text
const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 };

function escapeHtml(s) { ... }
function escapeAttr(s) { ... }
```

Use CSS variables from the shell for theming: `--bg`, `--surface`, `--surface-hover`, `--border`, `--text`, `--text-muted`, `--text-dim`, `--accent`, `--critical`, `--high`, `--medium`, `--low`, `--radius`, `--font`, `--mono`, `--shadow`.

## Registering a new component

1. Create `assets/components/my-block.html` with the format above
2. Add `"my-block"` to the `componentNames` array in `scripts/build.js`
3. Add a filter condition if the component is conditional (not always included):
   ```js
   if (name === "my-block") return includeMyBlock;
   ```
4. Add slot routing if the component goes to `COMPONENT_SIDEBAR` or `COMPONENT_MAIN_BODY` (default is `COMPONENT_MAIN_TOP`):
   ```js
   if (name === "my-block") {
     mainBodyHtml += `\n<!-- ${name} -->\n${comp.html}\n`;
   }
   ```
5. Add the init call in the init section:
   ```js
   if (includeMyBlock) initCalls += "renderMyBlock();\n";
   ```

## Complete example: a timeline component

`assets/components/timeline.html`:

```html
<!-- COMPONENT: timeline -->
<!-- SLOT: COMPONENT_MAIN_TOP -->
<!-- DESCRIPTION: A vertical timeline of findings by date. Include when findings have a `date` field. -->

<!-- HTML -->
<div class="timeline" id="timeline"></div>

<!-- CSS -->
.timeline { display: flex; flex-direction: column; gap: 16px; margin-bottom: 32px; }
.timeline-item { display: flex; gap: 14px; align-items: flex-start; }
.timeline-dot { width: 10px; height: 10px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; }
.timeline-dot.critical { background: var(--critical); }
.timeline-dot.high { background: var(--high); }
.timeline-dot.medium { background: var(--medium); }
.timeline-dot.low { background: var(--low); }
.timeline-content { flex: 1; }
.timeline-content .title { font-weight: 600; font-size: 14px; }
.timeline-content .date { font-size: 12px; color: var(--text-muted); margin-top: 2px; }

<!-- JS -->
function renderTimeline() {
  const items = FINDINGS.filter(f => f.date).sort((a, b) => new Date(b.date) - new Date(a.date));
  if (items.length === 0) return;
  document.getElementById("timeline").innerHTML = items.map(f => `
    <div class="timeline-item">
      <div class="timeline-dot ${f.severity}"></div>
      <div class="timeline-content">
        <div class="title">${escapeHtml(f.title)}</div>
        <div class="date">${escapeHtml(f.date)}</div>
      </div>
    </div>
  `).join("");
}
```

Then in `scripts/build.js`:

```js
// 1. Add to componentNames array
"timeline",

// 2. Add filter condition (conditional: only if findings have dates)
if (name === "timeline") return findings.some(f => f.date);

// 3. Slot routing (COMPONENT_MAIN_TOP is the default, no change needed)

// 4. Add init call
if (findings.some(f => f.date)) initCalls += "renderTimeline();\n";
```
