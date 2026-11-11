# 08 — Development workflow

## Running locally

Everything needs a plain HTTP server — `fetch` and ES modules are refused
under `file://`:

```bash
# classic site + diagnose + explore (root)
python -m http.server 8000          # or dev/start-server.bat

# math-coach frontend
cd math-coach && python -m http.server 8080
# → http://127.0.0.1:8080/runtime/web/
```

After editing `math-coach/content/`, rebuild the web slices before
refreshing: `python tools/build_web.py` (full rebuild order in
[06](06-math-coach.md)). The generated `runtime/web/data/` **is** committed
so GitHub Pages works without a build step.

## The one-command gate

```bash
./dev/check.sh          # classic: node tests + validate.py + verify_questions.py
./dev/check.sh quick    # skip question verify
cd math-coach && bash tools/check_all.sh          # all math-coach gates (~1 min)
bash tools/check_all.sh --web                     # + headless Chrome smoke (~4–6 min)
node tools/ux_asserts.js --shots out/shots/x      # visual assertions + screenshots
```

Rule of thumb from `dev/README.md`: **any `data/*.json` change must pass
`dev/check.sh` before commit.**

## Tests (`tests/`)

Node-based unit tests, no framework:

| Test | Covers |
| --- | --- |
| `test_engine.js` | diagnose engine (graph build, session, judging, summarize) |
| `test_question_ids.js` | question-id ↔ topic-id contract |
| `test_blindspots.js` / `test_children.js` / `test_children_browser.js` | profile & blind-spot logic |
| `test_home.js` / `test_jmor_frontend.js` / `test_stem_compat.js` / `test_report_link.js` | classic frontend helpers |

`tests/fixtures/` holds test data. math-coach adds its own JS regression
suites under `tools/` (judge specs, math text, ux asserts, smoke).

## Git conventions (`dev/README.md`)

- LF line endings everywhere (`.gitattributes`); **do not** enable
  `core.autocrlf` on Windows — it produces whole-file phantom diffs.
- One commit per logical change; commit messages state *what data changed
  and why* (see `git log` — messages are in Chinese, e.g. "同步上游诊断和
  多学科题库").
- `data/questions.json` edits: targeted text insertion only (see
  [03](03-classic-data-model.md)).
- `out/` and `math-coach/build/` are git-ignored; `runtime/web/data/` is
  intentionally committed.
- Remotes: `origin` = GitHub (deploy target), `upstream` = local mirror of
  the original upstream project, `taxonomy` = cn-math-taxonomy content
  source. `dev/push-github.sh` pushes main → origin.

## Deployment

GitHub Pages serves the repo root (`.nojekyll` present). The live URL is
<https://gordonwhu1982.github.io/beijing-math-practice/>. `index.html`
switches between the new tutor (`#new`) and the classic site (`#old`).
PWA assets (`manifest.webmanifest`, `sw.js`, `assets/icons/`) make both
generations installable/offline-capable.

## math-coach governance

`math-coach/` follows the `multi-agent-software-delivery` skill workflow:
load the skill, read `docs/delivery/PROJECT_GOVERNANCE.md`,
`PROJECT_BRIEF.md`, `AGENT_REGISTRY.md`, `docs/STATE.md`, and
`PROJECT_STATE.json` `next_actions` before substantive work. Important work
must be written back into project docs with requirement/task IDs; claims of
passing tests/acceptance require real evidence. See `AGENTS.md` and
`DELIVERY_MAP.json`.

## Reporting bad questions

`.github/ISSUE_TEMPLATE/question-fix.yml` provides a structured issue form
for reporting incorrect questions — the intended feedback channel since the
data is AI-drafted.
