# 05 — Classic frontend (classic site)

Everything under the `/#old` entry: `classic.html` plus the `explore/`,
`children/`, `diagnose/` and `assets/` directories. Vanilla HTML/CSS/JS — no
framework, no build.

## classic.html — multi-subject home

`classic.html` is the classic landing page. Its `<meta description>` lists
the coverage: math (primary → high school), Chinese (grades 1–6 + 7–9),
science (1–6), morality (1–6), history (7–9), geography (7–8), biology (7–8),
chemistry (grade 9), English (grade 3 → high school), physics (junior + high
school). Each subject gets its own graph slice from `data/topics.json`.

A small inline script in `<head>` inspects `location.hash`: topic-id patterns
(`cnm_*`, `cne_*`, `cnp_*`, …) redirect straight into `/explore/` so a shared
link like `classic.html#cnm_221` opens the graph focused on that topic.

`?subject=` accepts: `chinese, science, morality, history, geography,
biology, chemistry, english, physics` (math is the default).

## explore/ — knowledge-graph visualization

`explore/index.html` + `app.js` render the topic/dependency graph with
**Cytoscape.js + dagre** (both vendored in `assets/vendor/`, MIT). It is the
"see the whole prerequisite structure" view complementing the diagnostic's
linear session: nodes are topics, edges are prerequisite relations
(hard/soft distinguishable), and the layout is hierarchical by dagre.

`assets/explore.css` holds the explorer styling; `assets/stem-compat.js`
contains compatibility shims for older engines.

## children/ — learning profiles

`children/` implements per-child learning profiles stored **locally in the
browser** (no server, no accounts):

- `index.html` / `page.js` — profile list and detail pages.
- `history.html` / `history.js` — attempt history views.
- `assets/children.js` + `tests/test_children*.js` — data helpers and tests.
- `assets/blindspots.js` — "blind spot" detection (topics that are weak or
  untested), tested by `test_blindspots.js`.

Records are append-only events; export produces JSONL (one event per line).
See `math-coach/docs/records-schema.md` for the record schema used by the
newer generation's sync bridge.

## assets/ — site chrome

| File | Role |
| --- | --- |
| `site.css` | Shared classic-site stylesheet |
| `pwa.css` / `pwa.js` | PWA install prompt & offline chrome |
| `home.js` | Classic home-page behaviors |
| `stem-compat.js` | Engine compatibility shims |
| `icons/` | PWA icons; regenerate with `scripts/make_pwa_icons.py` (Pillow) |
| `vendor/` | Localized MIT libraries — Cytoscape, dagre, qrcode-generator; attribution in `VENDOR.md` |

## PWA / offline (`sw.js`, `manifest.webmanifest`)

The site is an installable PWA. The service worker caches under the
`bmp-pwa-*` namespace so updates don't strand old caches. Constraint from
`dev/README.md`: **new external links break offline capability** — the
health-check scripts assert zero external requests.

## Relationship to the new tutor

The classic site remains fully functional but is in maintenance mode: the
active product is `math-coach/runtime/web/` (see [06-math-coach.md](06-math-coach.md)).
Classic pages still read `data/*.json`, which continues to receive upstream
syncs (e.g. the cn-math-taxonomy merge in commit `01c4991`).
