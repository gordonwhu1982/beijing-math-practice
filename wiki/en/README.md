# Wiki — English

Documentation for **beijing-math-practice**, a personal K-12 knowledge-graph
and adaptive-practice engineering project. All content is static, zero-dependency,
and runs locally over a plain HTTP server.

Live site: <https://gordonwhu1982.github.io/beijing-math-practice/>

The repository contains **two generations** of the product:

| Generation | Where | What it is |
| --- | --- | --- |
| Classic site | `classic.html`, `data/`, `diagnose/`, `explore/`, `children/`, `assets/` | Multi-subject (math + 9 other subjects) knowledge graph with prerequisite edges, adaptive diagnostic engine, Cytoscape graph explorer, and per-child learning profiles. Still fully functional behind `/#old`. |
| New tutor | `index.html` → `math-coach/runtime/web/` | A junior-high math tutor rebuilt around the Beijing edition curriculum: six volumes, ~700 knowledge points, ~700 solution methods, a unified relation graph, a 2708-question bank, and a ten-screen hash-routed SPA. |

## Pages

| Page | Contents |
| --- | --- |
| [01-overview.md](01-overview.md) | What the project is, who it is for, quick start, license and honesty grading |
| [02-repository-layout.md](02-repository-layout.md) | Directory-by-directory map of the repo |
| [03-classic-data-model.md](03-classic-data-model.md) | `data/*.json` schema, ID rules, difficulty model, validation whitelist |
| [04-diagnosis-engine.md](04-diagnosis-engine.md) | `diagnose/engine.js` — pure-function adaptive backtracking algorithm |
| [05-classic-frontend.md](05-classic-frontend.md) | classic.html, explore graph view, children profiles, PWA/offline |
| [06-math-coach.md](06-math-coach.md) | The new tutor: curriculum framework, content layers, graph views, question judging |
| [07-data-pipeline-and-gates.md](07-data-pipeline-and-gates.md) | scripts/ tools, verification gates, textbook extraction pipeline |
| [08-development-workflow.md](08-development-workflow.md) | dev/ scripts, tests, git conventions, deployment |

## Reading order

New to the repo: 01 → 02 → 03 → 04, then 06 for the current product.
Contributing data or code: 03 → 07 → 08.
