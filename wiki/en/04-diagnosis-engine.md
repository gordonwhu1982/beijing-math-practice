# 04 — Adaptive diagnosis engine (`diagnose/engine.js`)

The heart of the classic generation. `engine.js` is a **pure-function**
module — no DOM, no dependencies — that runs identically in the browser
(exposed as `window.DiagEngine`) and in Node (`require()` it; the unit tests
in `tests/test_engine.js` do exactly that).

## API surface (from the file header)

```
buildGraph(topics, deps, questions?) -> graph
createSession(graph, targets, {limit, seed, avoid}) -> session
nextQuestion(graph, session) -> topicId | null
nextItem(graph, session) -> {topicId, question, attempt} | null
applyAnswer(graph, session, id, 'correct'|'wrong'|'skip', {text, prompt, pin, qid}) -> new session
summarize(graph, session) -> {root causes, learning path, mastered/shaky/weak/untested}
gradeTargets(graph, '一年级'|'七上'|'高一'|'选必二', subject?) -> {ids, volumes, label}
createSession(graph, ids, {mode:'screen', confirm}) -> screening session
chapterSummary(graph, session) -> per-chapter rollup (weakest first)
layout(graph, session, summary) -> layered layout for the path graph
judgeQuestion(question, userText) -> {verdict:'correct'|'wrong'|'manual', reason}
```

Sessions are plain JSON-serializable data; `applyAnswer` returns a **new**
session rather than mutating, which makes the whole diagnosis deterministic
and replayable.

## The backtracking algorithm

The engine treats the prerequisite graph as a search space and walks
**backward** from the target:

1. Ask questions on the target topic, ordered `standard` (improved)
   difficulty first; after consecutive correct answers it escalates to
   `challenge` to confirm mastery; after a wrong answer it drops back to
   `basic` to remediate.
2. A topic is **mastered** only after `confirm` consecutive correct answers
   (default 3, configurable 2/3/5; capped by the actual question bank size).
   Mastery is inferred upward: if a topic is mastered, its ancestors are
   treated as mastered too.
3. On a wrong answer (or "don't know"), the engine serves **one easier
   confirmation question**:
   - confirmation correct → topic is **shaky** (不稳); no further backtrack.
   - confirmation also wrong → topic is **weak** (薄弱); the engine
     backtracks along prerequisite edges — **hard** edges before **soft**
     ones — to find the root cause.
4. `summarize` partitions topics into mastered / shaky / weak / untested and
   produces a learning path plus per-chapter rollup for the UI.

Screening mode (`mode:'screen'`) restricts the session to the target set
itself — backtracking cannot leave the screened volumes — with a default
question cap (`SCREEN_LIMIT`). `gradeTargets` maps grade labels like
`一年级` / `七上` / `高一` / `选必二` to topic-id sets, defaulting to math but
accepting `subject` filters (`english`, `physics`, `all`).

## Judging (`judgeQuestion`)

Automatic verdicts are deliberately conservative:

- **`choice`** questions: normalized text comparison against the keyed choice.
- **`numeric`**: NFKC normalization + exact rational-number comparison
  (so `1/2`, `0.5`, `½` compare correctly).
- **`short` / `self`**: always `manual` — the UI asks the learner (or parent)
  to self-grade. The engine never pretends to grade free text.

`scripts/engine_norm.py` is a Python port of the same `normalizeText` logic,
used by offline verification tools so Python and JS agree on normalization.

## UI and sharing

`diagnose/index.html` + `app.js` render the session: question card, verdict
feedback, and a results view with the root-cause chain and suggested learning
path. `share.js` encodes results into shareable links. Demo entry:
`/diagnose/?target=cnm_221&demo=1`.

## Where it's tested

- `tests/test_engine.js` — unit tests run in Node.
- `scripts/demo_grade.js` — runs a whole-grade screening through the real
  `data/*.json` and prints a per-chapter summary (engine smoke test).
- `dev/check.sh` runs the unit tests on every data change.
