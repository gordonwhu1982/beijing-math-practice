# 02 — Repository layout

```
beijing-math-practice/
├── index.html            Entry switcher: #new → math-coach prototype, #old → classic.html
├── classic.html          Classic multi-subject home; hash-routes topic ids to /explore/
├── manifest.webmanifest  PWA manifest (namespace bmp-pwa-*)
├── sw.js                 Service worker for offline caching
├── .nojekyll             Lets GitHub Pages serve the underscore-free static tree
│
├── data/                 ★ Classic dataset (JSON, fetched at runtime)
│   ├── topics.json         Knowledge points across all subjects (3.1 MB)
│   ├── dependencies.json   Prerequisite edges: topicId → prerequisiteId (hard|soft)
│   ├── questions.json      Question bank (7.5 MB); id must match <topicId>_q<N>
│   ├── cn-curriculum-standards.json  Curriculum standard entries
│   ├── id-aliases.json     Alias table for topic ids
│   └── mappings/           Subject/topic mapping helpers
│
├── diagnose/             Adaptive diagnostic
│   ├── engine.js           Pure-function engine (browser + Node, no DOM)
│   ├── index.html/app.js   Session UI; share.js for shareable result links
│   └── style.css
│
├── explore/              Cytoscape + dagre knowledge-graph visualization
│   ├── index.html/app.js
│
├── children/             Per-child learning profiles (local, in-browser)
│   ├── index.html/history.html/page.js/children.js
│
├── assets/               Classic-site code
│   ├── site.css/pwa.css/pwa.js/home.js/children.js/blindspots.js/stem-compat.js
│   ├── explore.css
│   ├── icons/             PWA icons (regenerate via scripts/make_pwa_icons.py)
│   └── vendor/            Localized MIT libs: cytoscape, dagre, qrcode-generator
│
├── scripts/              Data gates & reusable data tools (Python + Node)
│   ├── validate.py         ★ Ingestion gate: question ids, Q_FIELDS whitelist, difficulty
│   ├── verify_questions.py ★ Evaluates question.verify in an AST-whitelist sandbox
│   ├── check_figures.py    Figure/SVG sanity checks
│   ├── second_pass.py      Blind-solve review pipeline (prepare → compare)
│   ├── primary_recheck.py  Independent recomputation of numeric answers
│   ├── engine_norm.py      Python port of the JS normalizeText logic
│   ├── fig_draw.py         Inline SVG geometry-figure library (54 primitives)
│   ├── add_figures.py      Writes `figure` fields into questions.json (⚠ rewrites whole file)
│   ├── demo_grade.js       Whole-grade screening smoke run through the real engine
│   ├── moe2025_check.py    2025 curriculum-standard clause coverage report (read-only)
│   └── make_pwa_icons.py   PWA icon generator (needs Pillow)
│
├── tests/                Node unit tests for engine + frontend helpers
│   ├── test_engine.js test_blindspots.js test_children.js test_home.js
│   ├── test_question_ids.js test_stem_compat.js test_jmor_frontend.js
│   ├── test_report_link.js test_children_browser.js
│   └── fixtures/
│
├── dev/                  Local development helpers — see dev/README.md
│   ├── check.sh           One-shot: engine tests + validate.py + verify_questions.py
│   ├── start-server.bat   Local static server (default port 8000)
│   └── push-github.sh     Push main → GitHub
│
├── out/                  Local artifacts (git-ignored): figprev.html, verify-report.json
├── .github/ISSUE_TEMPLATE/question-fix.yml   Issue form for reporting bad questions
└── wiki/                 This documentation (en/ + zh/)

math-coach/               ★ The current product — junior-high math tutor
├── AGENTS.md             Agent working rules (multi-agent-software-delivery skill)
├── DELIVERY_MAP.json     Where delivery docs actually live
├── README.md             Authoritative "what exists now" + honesty grading
├── docs/                 STATE.md (current status), plan/, review/, delivery/, specs
├── content/              ★ Authoritative text data (registry, curriculum, relations,
│   │                       framework, skills, misconceptions, questions, rubric)
├── tools/                Build & gate scripts: edges_build, framework_gen,
│   │                       build_web, schema_check, relations_check, judge_*,
│   │                       ux_asserts, web_smoke, check_all.sh …
├── runtime/web/          Static frontend: index.html + app.css + js/{core,store,
│   │                       data,router,boot,fig}.js + views/ (one file per screen)
│   └── data/             Build output checked into git so Pages works w/o build
├── assets/vendor/        KaTeX 0.16.11, cytoscape, dagre (all vendored, MIT)
├── design/ux-redesign/   UX design docs, reviews, interactive prototype
└── build/                All generated artifacts (git-ignored)
```

## Key facts

- **Git hosting**: GitHub `gordonwhu1982/beijing-math-practice`, published via
  GitHub Pages. Two extra remotes exist locally: `upstream` (local mirror of the
  original upstream project) and `taxonomy` (cn-math-taxonomy repo used as a
  content source).
- **Line endings**: LF enforced via `.gitattributes`; do not enable
  `core.autocrlf` on Windows (see `dev/README.md`).
- **`data/questions.json` is 7.5 MB**: edit it with targeted text insertion,
  never re-serialize the whole file.
- **`math-coach/content/` is the authoritative layer**; `math-coach/runtime/web/data/`
  and `math-coach/build/` are derived and reproducible via `tools/build_web.py`.
