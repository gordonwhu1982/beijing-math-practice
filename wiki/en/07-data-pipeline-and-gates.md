# 07 — Data pipeline & quality gates (`scripts/`, `math-coach/tools/`)

Two toolchains coexist: the classic `scripts/` directory (Python + Node,
operating on `data/*.json`) and `math-coach/tools/` (operating on
`math-coach/content/` → `runtime/web/data/`).

## Classic `scripts/` — gates first

| Script | Role |
| --- | --- |
| `validate.py` | **Ingestion gate.** Enforces question-id shape `<topicId>_q<N>`, the `Q_FIELDS` whitelist, three-tier difficulty, per-topic minimum counts. Any violation → `VALIDATION FAILED`. |
| `verify_questions.py` | Evaluates each question's `verify` expression inside an **AST-whitelist sandbox** (no imports, no calls outside the whitelist) to independently check answers. Feeds `out/verify-report.json`. |
| `check_figures.py` | Sanity-checks inline SVG `figure` fields. |

## Classic `scripts/` — reusable data tools

Curated from ~90 upstream scripts by "can it run standalone" + "does it
overwrite master data" (all tested):

| Script | Purpose | Writes? |
| --- | --- | --- |
| `fig_draw.py` | Inline SVG geometry-primitive library (cuboid/cylinder/cone/sphere/angle_arc/right_mark… 54 primitives), `currentColor` only, no external refs | No |
| `add_figures.py` | Writes `figure` fields via fig_draw (121 questions / 60 topics) | ⚠ rewrites `data/questions.json` wholesale |
| `primary_recheck.py` | **Independently recomputes** numeric answers from the prompt (pure stdlib) to catch wrong `answer` values | No |
| `second_pass.py` | Blind-solve review pipeline: `prepare` exports answer-less chunks → human/model answers into `ans_NN.json` → `compare` flags disagreements | `data/_second_pass/` (git-ignored) |
| `engine_norm.py` | Python port of `diagnose/engine.js` `normalizeText` | No |
| `moe2025_check.py` | 2025 curriculum-standard coverage report (clause counts / similarity / gaps), read-only | No |
| `demo_grade.js` | Runs a whole-grade screening through the real engine + real data, prints per-chapter rollup | No |
| `make_pwa_icons.py` | Regenerates PWA icons | `assets/icons/` |
| `hs_common.py`, `hs_sel_common.py`, `phy_lib.py`, `en_lib.py`, `primary_qgen.py` | Upstream "registry DSL" — topic/question/edge/hard/soft helpers and question templates; reference for adding content | No |

**Deliberately not restored** (recoverable from git history `7d7748c` via
`git show 7d7748c:scripts/xxx.py`): the `*_build.py` whole-dataset rewriters
(they depend on ~60 deleted data modules and would destroy current data),
pure data-entry modules (content already lives in `data/*.json`), English
distractor batch scripts, and upstream's screenshot/deploy scripts.

## math-coach `tools/` — build & gates

Full gate suite runs via `bash tools/check_all.sh` (`--web` adds headless
Chrome). Highlights beyond the pipeline in [06](06-math-coach.md):

- `answer_spec_build.py` → `answer_spec_merge.py` → `answer_spec_prune.js`:
  mechanical answer-spec extraction, merge with hand-refined specs, then
  self-pruning (any spec the judge can't confirm against its own reference
  answer is downgraded to `unknown`).
- `judge_spec_test.js` (54 regression cases) + `judge_spec_audit.js`
  (coverage / correct-on-reference / wrong-on-constructed-wrong-values).
- `question_options_extract.py`: pulls `A./B./C./D.` options out of prompts
  into sidecars (`--check` mode detects drift without writing).
- `questions_kp_*.py` family + `out/kp_*.py`: question→knowledge-point
  mapping pipeline (per-section task packages → alias/term matching →
  sidecar `ch*.kp.jsonl`, all `ai_draft`).
- `ux_asserts.js`: 38 visual assertion codes across ~26 routes (min font
  sizes, no horizontal overflow, no `[object Object]`, single solid
  selection state, mobile viewport fit, KaTeX/cytoscape load checks,
  flow assertions…). `--shots <dir>` dumps full-page screenshots.
- `web_smoke.js`: 63 headless-Chrome interaction checks.
- `math_text_check.js`: formula-text ratchet — scans `$` pairing, bare
  commands, control chars against `tools/math_baseline.json`; `--staged`
  checks only staged files, `--write-baseline` re-freezes.
- `check_commit.py`: pre-commit hook — frontend syntax, graph contract,
  judging regression, method-ordering, relation table, formula text; auto-
  adds smoke/visual gates when frontend or styles are staged.

## Data provenance notes

- Classic `data/` derives from a CC BY-NC 4.0 knowledge-sharing dataset
  (see `LICENSE`, `assets/vendor/VENDOR.md`); AI-drafted, not teacher-reviewed.
- `math-coach` question ch10/11/13 were reverse-parsed from the classic
  project's rendered HTML (`legacy_html_import.py`); ch12 came from a
  structured index (`questions_ingest_ch12.py`); textbook exercises are
  merged via the extraction pipeline above.
