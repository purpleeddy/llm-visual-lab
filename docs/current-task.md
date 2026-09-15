# Current scope — the walkthrough is easy to follow: no seams, a picture at every key point

- Started: 2026-09-15
- Earlier scopes are recorded in `docs/progress.md`

## Why

A reader of "전체 그림 먼저 보기" could not picture "토큰 수만큼의 줄이 쌓인 덩어리가
encoder 로 들어갑니다". Two causes:

- **The words drifted.** The body called a token's numbers "숫자 뭉치", a caption alone
  said "숫자 한 줄", and the next step said "줄이 쌓인 덩어리". Nothing in the body made
  the switch, and 덩어리 also meant the encoder/decoder halves and, in the next
  section's lead, a single vector.
- **Nothing showed it.** Every figure on the page was a build-time still; the only
  interactive elements were four islands in sections 3–6. The token pipeline figure
  stopped at ⊕, and no element showed rows stacking into a block, the block entering
  the encoder, or the same count coming out.

The standard set for this scope: comprehension over everything — an apt example, a
figure that moves where a still one fails, an interaction at each key point, and no
ambiguity at any boundary. This is also what `docs/plan.md` §5.3–5.4 and §7 already ask
for ("이 문장을 읽은 독자가 다음 문장을 이해할 준비가 되었는가?").

## What changes

**Stage 1 — the big picture becomes a stepped walk.**

- `src/components/lab/Stepper.tsx` — the prev/next rail extracted from `AttentionLab`,
  which now uses it. Same markup and classes, so the existing checks did not move.
- `src/components/lab/BigPictureWalk.tsx` — seven frames: tokens → a row → a block →
  ⊕ position → encoder (5 rows in, 5 rows out) → decoder (masked rows, the encoder's
  rows read) → the two kinds of probability side by side. A mini map lights the part of
  the architecture each frame is at. Frames 1–4 share one drawing whose parts slide into
  place; 5–7 fade in. Motion uses the `--motion*` tokens, so reduced motion turns it into
  cuts. Copy in `src/lib/i18n/labText.ts` (`WALK_TEXT`).
- `TokenPipeline.astro` is removed; the walk replaces it. `TransformerMap` stays as the
  overview above the walk.
- The big-picture prose in both languages names the shape once ("한 줄" / "a row"),
  bridges rows → block before ⊕, opens step 3 by pointing back at that block, and points
  each step at a frame. "두 덩어리" → "두 부분"; the `numbers` lead no longer calls a
  vector a 덩어리; softmax, the mask, "shifted right" and 갈래/head are each named at
  first use.

**Stage 2 — the seams in every other section.** One name per thing (줄 → 벡터 → 행,
갈래 = head only, 가리기 named once and tied to the "Causal mask" switch, 흩어진 정도
defined at first use, 절 for a section), the `proportion` section no longer opens on
scores the reader has not seen, the seven lab steps are mapped onto the four steps of the
formula, row-wise softmax and the rectangular cross-attention matrix are explained,
head two's weights `A⁽²⁾` are printed so `O⁽²⁾` can be checked, `W₁`/`b₁` are printed so
the feed-forward numbers can be checked, BLEU/F1/perplexity/ln/Adam/투영/Sublayer get a
one-line gloss at first use, and the `n × n` cost is stated in the attention section
before the results section relies on it.

**Stage 3 — interactions and figures where the brief promised them.**

- Islands (`src/components/lab/`): `PositionExplorer` (position + pair),
  `LayerNormExplorer` (editable row, add-to-all, multiply-all, γ, β),
  `ResidualExplorer` (bypass on/off through six feed-forward layers, cos θ to the input),
  `LossExplorer` (probability on the right word, ε), `BeamExplorer` (width 1/2/3),
  `BleuCostExplorer` (en-De / en-Fr), `HeadPatternsExplorer` (query token). Copy in
  `src/lib/i18n/explorers.ts`. Each replaces the still it grew out of: `PositionWaves`,
  `PositionGrid`, `LayerNormSteps`, `LossPicture`, `BeamTree`, `BleuCost`,
  `HeadPatterns` are removed.
- Stills (`src/components/site/`): `SerialWait` (queueing vs at once, in `#problem`),
  `TransposeFlip` (rows become columns), `ConcatShape` (heads joined, × W_O),
  `HeadBudget` (8 × 64 = 512), `BleuExample` (what BLEU counts).
- `src/styles/lab.css` — walk and explorer styles.
- `tests/e2e/site.spec.ts` — the figure list follows the new ids; the walk has a check on
  both pages; each explorer has one check of the fact it exists to show.

## Out of scope

- `TransformerMap` still fades Add & Norm, Feed Forward, Linear and Softmax and its
  caption still says they are left for later (the open problem recorded in the previous
  scope). The walk's mini map does not fade anything.
- Committing, until asked.
