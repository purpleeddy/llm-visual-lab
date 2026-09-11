# Current scope — the remaining six sections

- Written against: sections 4.2 (what the explanation covers) and 12 (P2–P4) of `docs/plan.md`
- Earlier scopes are recorded in `docs/progress.md`
- Started: 2026-09-12

## Why

Sections 7 to 12 held their place in the outline and said only "this will be written
later". The request was to write all of them, and to use more diagrams.

## Order of work

The article promises that every number on screen is computed on the page, so the
calculations have to exist before the prose can quote them.

1. **The maths.** `multihead.ts`, `positional.ts`, `blocks.ts`, `training.ts`,
   `generation.ts`, plus the example values they need.
2. **Independent references.** Extend `tests/fixtures/generate_fixtures.py` to compute
   the same things a different way, and check the TypeScript against them. Confirm the
   pre-existing values are untouched.
3. **The paper's own numbers.** Tables 1–4 and the training conditions, read out of
   the PDF into `src/lib/paper.ts`. These are the only uncomputed numbers on the site,
   so they are kept in one file and pinned by a test.
4. **Diagrams.** Twelve, each reading its numbers from the modules above.
5. **The prose**, Korean then English.
6. **Tests, coverage map, screenshots.**

## Rules kept

- No number is typed into a diagram. Dimensions come from `examples.ts`, values from
  the maths modules, paper figures from `paper.ts`.
- Anything not covered is said plainly in the section, and recorded in the coverage map.
- The step names and symbols in a figure come from the same source as the lab's, so a
  figure cannot call something by a name the lab does not use.
- Each figure keeps a unique id prefix; nineteen of them now share one DOM.

## Out of scope

- A multi-head lab. The section is figures and prose; adding a head dimension to
  `AttentionLab` is a separate piece of work.
- Backpropagation. The article explains what the gradient is and says it does not
  compute one.
- Anything after 2017. That is the learning path in the left rail, still unwritten.
