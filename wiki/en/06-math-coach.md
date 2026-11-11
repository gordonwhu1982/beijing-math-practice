# 06 — math-coach (the current product)

`math-coach/` is a junior-high math tutor for the author's own child
(Beijing edition, currently grade 8 volume 1 / 2024 textbook). It is a pure
static site — no backend, no accounts, no database — where **Git-tracked
text is the authoritative data** and everything else is derived.

Authoritative docs inside the folder: `README.md` (what exists + honesty
grading), `docs/STATE.md` (current status, how to run, gate coverage),
`AGENTS.md` + `docs/delivery/` (multi-agent delivery governance).

## Curriculum framework

Six Beijing-edition volumes → 26 chapters → 143 sections:

| Volume | Code | Sections (approx) | Status |
| --- | --- | --- | --- |
| 七上 | 701 | ~29 | content draft, edition to verify |
| 七下 | 702 | ~32 | content draft, edition to verify |
| 八上 | 801 | 27 | **verified against the 2024 textbook** |
| 八下 | 802 | ~19 | content draft, edition to verify |
| 九上 | 901 | ~25 | content draft, edition to verify |
| 九下 | 902 | ~11 | content draft, edition to verify |

Knowledge points live in `content/framework/knowledge_points/<vol>.json` +
a per-point enrichment sidecar `<vol>.detail.jsonl`. Measured snapshot
(2026-11-11): **711 enriched knowledge points** across the six volumes,
each with definition / conditions / boundaries / objectives / aliases /
textbook page refs — all `review_status=ai_draft`.

## Content layers (`content/`)

The data contract is `content/registry/schema.json` — **17 entity types**,
validated by `tools/schema_check.py` (errors gate; v3 gaps reported
separately in `build/report/schema/gaps.csv`).

| Layer | File(s) | Contents (snapshot 2026-11-11) |
| --- | --- | --- |
| Relations | `relations/edges.jsonl` | **7053 edges**, 12 relation types (`applies_to`, `uses_skill`, `prerequisite_of`, `assessed_by`, `is_part_of`, `belongs_to`, `misconception_of`, `sequence`, `supports`, `contrast_with`, `equivalent_to`, `explained_by`), each edge carrying mandatory `evidence`. Derived by `tools/edges_build.py` from five authoritative sources; gated by `tools/relations_check.py` (10 invariants: endpoints exist, no self-loops, acyclic, sequence covers adjacent sections…). |
| Curriculum standards | `curriculum/standards.jsonl` | **314** standard entries (compulsory-edition four stages + senior high; math = `cms-*`), imported as `review_status=stub`. |
| Section→standard map | `curriculum/kp_standards.json` | Section-level links (981 links across 143 sections; 2 sections explicitly marked "no corresponding standard"). |
| Solution methods | `skills/<vol>/ch*.jsonl` | **674 methods** in three tiers: textbook-internal / 培优 (enrichment) / 竞赛·拓展 (competition). Each has steps with justification, `failure_signals`, `desc`, `boundaries` (anti-"universal method" declarations), `thought_refs`. |
| Misconceptions | `misconceptions/<vol>/ch*.jsonl` | Wrong-answer-pattern instances in 8 categories with remediation suggestions. |
| Thought layer | `thoughts.jsonl` | **16** entries: 6 upper-level ideas + 10 method families, each with `desc`/`boundaries`/`parent`/`competencies`. |
| Competencies | `registry/competencies.json` | Six core competencies CP-01…CP-06. Competency links are **two-layer**: an asserted layer (from the mapped standard clause, rule + AI review) and a derived layer (method → thought → competency, two hops). The UI labels which layer a claim comes from. |
| Manual prerequisite edges | `framework/prerequisites.json` (section-level, 159) + `framework/kp_prerequisites.json` (point-level, 183) | Human/AI-drafted edges, each with `why`. |
| Questions | `questions/801/ch*.jsonl` | **2708 questions** total (ch10 482 / ch11 614 / ch12 1242 / ch13 370), six difficulty tiers. Only volume 801 has questions so far. |
| Question sidecars | `ch*.answer.jsonl`, `ch*.spec.jsonl`, `ch*.options.jsonl`, `ch*.kp.jsonl`, `ch*.meta.jsonl` | Textbook answers, machine-readable answer specs, extracted MCQ options, question→knowledge-point mappings, per-question metadata. |
| Rubric | `rubric/801/*.jsonl` | **3179 scoring points** across 546 questions (each sums to 100), all `ai_draft`. |

## Frontend (`runtime/web/`)

Hash-routed SPA, one file per screen under `js/views/`:
`#/today #/toc #/sec #/kp #/map #/rel #/thoughts #/weak #/practice #/retry
#/archive` plus secondary pages `#/rel/<kid>` and `#/thoughts`.

- **Graph views** (`#/map`): panorama-first with seven lenses —
  volume/chapter/thought panorama, chapter graph, section skeleton,
  knowledge-point, method, misconception, and thought views. Two edge
  styles coexist: prerequisite edges (solid, "can you learn it") and
  textbook-sequence edges (dashed, "book order"). Card size, spacing and
  label truncation scale with zoom level so the six-volume panorama stays
  legible.
- **Core-competency filter**: multi-select chips; a knowledge point counts
  if it exercises *any* selected competency. Two provenance layers are kept
  separate in the UI ("按方法推断" labels the derived layer).
- **Practice judging**: only questions with structured answer specs
  (`ch*.spec.jsonl`, produced by `answer_spec_build.py` +
  `answer_spec_merge.py` + `answer_spec_prune.js`) are auto-judged —
  snapshot: 427/2642 ≈ 16%. Everything else deliberately falls back to
  `manual` ("rather not judge than judge wrong"). Three iron rules have
  regression tests: only a unique value may be judged wrong; missing/extra
  values in a set are manual; half-written intervals are not wrong.
  MCQ options extracted into `ch*.options.jsonl` render as clickable cards.
- **Wrong-answer retry queue**: max ~6 questions at a time; rationale in
  `docs/retry-queue.md`.
- **Records**: answers stored in `localStorage` (`mc.records.v1`,
  append-only); JSONL export/import sync bridge — no accounts, no server
  (`docs/records-schema.md`).
- **Math rendering**: KaTeX 0.16.11 vendored locally; ~38k formulas render
  with zero errors.

## Build pipeline (`tools/`)

Rebuild order matters (edges depend on content, framework on edges, web
data on framework):

```bash
python tools/edges_build.py        # content/** → relations/edges.jsonl
python tools/relations_check.py    # edge-table gate
python tools/skill_prereq_check.py # method-ordering draft gate
python tools/framework_gen.py      # → build/framework/{nodes,edges}.jsonl
python tools/build_web.py          # → runtime/web/data/*.js
bash   tools/check_all.sh          # all gates (~1 min); --web adds headless Chrome smoke
```

Other gates: `schema_check.py`, `questions_check.py`, `rubric_check.py`,
`katex_selftest.js`, `math_text_check.js` (ratchet against
`tools/math_baseline.json`), `ch12_math_audit.py`, `judge_spec_test.js`
(54-case judging regression), `judge_spec_audit.js`, `ux_asserts.js`
(38 visual criteria × ~26 routes), `web_smoke.js` (63 headless-Chrome
checks), `sc_probe.js` (graph-size probe).

Textbook-exercise extraction pipeline:
`textbook_exercise_extract.py` (PDF → draft blocks with `text_quality`
grading) → `textbook_span_rebuild.py` (re-pair split fraction spans) →
`textbook_map_sec.py` (block → section via discriminative terms) →
`textbook_ingest.py` (idempotent merge into `ch*.jsonl`). See
`docs/textbook-extraction.md` — including why chapter 11 (radicals as
vector graphics) is largely unrecoverable from the text layer.

## Known gaps (honest grading, abbreviated)

- All knowledge-point definitions, methods, misconceptions, rubric points
  and question→KP mappings are `ai_draft` — no teacher review yet. The ~90
  enrichment/competition-tier methods are the least textbook-grounded.
- Only volume 801 has questions (2708); the other five volumes have zero.
- ~2218 questions have no `purpose` classification; 132 questions are
  deliberately left unmapped to any knowledge point (out-of-syllabus
  stretch content) rather than force-fit.
- 4★–5★ questions in ch12 (336 items) may contain real web-sourced exam
  questions: `visibility=stem_public`, `redistributable=false`.
