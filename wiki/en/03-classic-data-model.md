# 03 — Classic data model (`data/`)

The classic generation stores the whole knowledge graph and question bank as
plain JSON fetched by the browser at runtime. There is no database and no
build step; the JSON *is* the product.

## Files

| File | Size | Role |
| --- | --- | --- |
| `topics.json` | ~3.1 MB | Knowledge points (topics) for every subject. Each topic has `id`, title, subject/grade metadata, and optionally a `diagnostic_question` fallback. |
| `dependencies.json` | ~1.0 MB | Prerequisite edges `{topicId, prerequisiteId, strength, reason}`. `strength` is `hard` (must master first) or `soft` (helpful). The diagnose engine sorts hard before soft. |
| `questions.json` | ~7.5 MB | The question bank. One JSON object per question (see schema below). |
| `cn-curriculum-standards.json` | ~0.4 MB | National curriculum standard entries used for traceability. |
| `id-aliases.json` | small | Alias → canonical topic id table. |
| `mappings/` | — | Subject and cross-reference mapping helpers consumed by pages. |

## Topic IDs

IDs are namespaced by subject prefix plus a grade/section locator:

- `cnm_*` math, `cne_*` English, `cnp_*` physics, `cnc_*` Chinese,
  `cns_*` science, `cnd_*` morality, `cnh_*` history, `cng_*` geography,
  `cnb_*` biology, `cnk_*` chemistry — followed by a numeric locator.
- `Q_ID_RE` validates the shape; `external: true` nodes are reference-only
  and never receive questions.

`classic.html` recognizes these prefixes in the URL hash and redirects to
`/explore/#<id>` (or `?subject=<s>` for English) so topic links are shareable.

## Question schema

`scripts/validate.py` enforces a strict contract — this is the **ingestion
gate**; violations fail with `VALIDATION FAILED`:

- `id` must match `<topicId>_q<N>` (the topic must exist).
- Fields are limited to the `Q_FIELDS` whitelist:
  `id, topicId, difficulty, type, prompt, answer, choices, accept,
  explanation, verify, figure, unordered, percent, fixed_from_source,
  hideChoiceText`.
  Adding a field requires updating the whitelist in `validate.py`.
- `difficulty` has exactly three tiers: `basic / standard / challenge`
  (legacy name `advanced` is still accepted and treated as `challenge`).
- Each topic has a minimum question count (~4 per topic currently).
- `type` values seen in the data include `choice`, `numeric`, `short`,
  `self` (see §04 for how each is judged).

`verify` is **not** used by the frontend judge; it is only evaluated by
`scripts/verify_questions.py` inside an AST-whitelist sandbox to independently
check answers.

## Editing rules (from `dev/README.md`)

1. Run `./dev/check.sh` after any `data/*.json` change — it runs engine
   tests + `validate.py` + `verify_questions.py` (`quick` skips the last).
2. `questions.json` is 7.5 MB: make targeted text-level insertions preserving
   the existing 2-space JSON indent; never re-serialize the whole file or the
   diff will touch every line.
3. New external links in pages break the offline guarantee — health checks
   assert "no external requests".
4. `add_figures.py` rewrites the whole file with `json.dump(indent=2)` and on
   Windows flips line endings to CRLF, producing a whole-file diff; check
   `git diff --stat` afterwards and `git checkout` if needed.

## Curriculum standards

`cn-curriculum-standards.json` was imported from the upstream project's
public transcription (`math-coach` imports the same source into
`content/curriculum/standards.jsonl`). It is marked `review_status=stub`:
usable for traceability ("which standard clause backs this point"), not an
authoritative copy of the Ministry of Education text.
