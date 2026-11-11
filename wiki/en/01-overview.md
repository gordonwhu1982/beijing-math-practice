# 01 — Overview

## What this is

**beijing-math-practice** (北京数学练习, "Beijing Math Practice") is a personal
knowledge-graph and self-adaptive practice engineering project. Despite the
name, the classic generation covers math plus nine other school subjects
(Chinese, science, morality & rule of law, history, geography, biology,
chemistry, English, physics); the newer `math-coach` generation focuses on
junior-high math only.

Core ideas:

- **Knowledge points first, questions second.** The graph of topics and their
  prerequisite edges is the primary artifact; questions hang off topics.
- **Adaptive diagnosis by backtracking.** `diagnose/engine.js` walks backward
  along prerequisite edges to find the root cause of a wrong answer instead of
  just reporting a score.
- **Pure static, zero dependencies.** No build step, no backend, no accounts,
  no database. Third-party libraries (Cytoscape, dagre, KaTeX, qrcode) are
  vendored locally. Everything works from `python -m http.server`.
- **Data gates before data.** JSON edits are gated by `scripts/validate.py`,
  `scripts/verify_questions.py`, and `dev/check.sh`; the repo treats data as
  code.

## Who it is for

Personal use — the author practices with their own child (a grade-8 student on
the Beijing edition 2024 textbook). The data is AI-drafted and has **not** been
reviewed item-by-item by teachers; see "Honesty grading" below. Not for
commercial use (CC BY-NC 4.0 upstream data; see [LICENSE](../../LICENSE)).

## Quick start

```bash
python -m http.server 8000     # pages fetch data/*.json — file:// will NOT work
./dev/check.sh                 # engine tests + data validation + question verify
```

Then open <http://localhost:8000/> for the new entry switcher, or
`classic.html` for the classic site, `/explore/` for the graph,
`/diagnose/` for the adaptive diagnostic (`?target=cnm_221&demo=1` for a demo),
and `/children/` for learning profiles.

## Two entries, one repo

`index.html` is a thin switcher with two tabs:

- **新版练习 / New practice** → `math-coach/design/ux-redesign/prototype/` (the
  current tutor UI prototype, whose runtime data lives in
  `math-coach/runtime/web/data/` and is checked into the repo so the public
  pages work without a build).
- **原来的站点 / Classic site** → `classic.html` and the `/#old` hash.

`math-coach/` documents note that it was originally developed as a separate
private repo and later merged into this one; it keeps its own `docs/`,
`tools/`, `content/` and governance files (`AGENTS.md`, `DELIVERY_MAP.json`,
`docs/delivery/`).

## Honesty grading (read before trusting the data)

The project is explicit about what is verified vs. drafted:

- **Verified**: the grade-8-volume-1 (801) chapter TOC against the 2024
  textbook; prerequisite graph acyclic; question→topic references valid;
  rubric point totals correct; zero KaTeX render errors.
- **Not verified**: all ~700 knowledge-point definitions are `ai_draft`;
  curriculum-standard entries are a public transcription (`review_status=stub`)
  not checked against the Ministry of Education PDF; only ~16% of the 2708
  questions have machine-judgeable structured answers — the rest intentionally
  fall back to manual/self grading rather than risk false "correct" verdicts;
  question→knowledge-point mappings are `ai_draft` (~1 in 7 spot-checked items
  point at an adjacent wrong point) and are used as hints, not mastery scores.

When the wiki or the data seems to overclaim, the authoritative statements are
in `math-coach/docs/STATE.md` and `math-coach/README.md` §"诚实分级".

## License

- Repo code and self-authored content: see `LICENSE`.
- Graph/question data derives from a knowledge-sharing **CC BY-NC 4.0**
  dataset; attribution details in `assets/vendor/VENDOR.md`.
- Upstream question sources are cite-only: they are not redistributed in the
  repo or the published package.
