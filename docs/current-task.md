# Current scope — rewrite the article as “build a next-word machine”

- Started: 2026-10-24, after the author judged the restructured article's structure and
  narration still hard to follow (“지금 구조나 설명이 좋지 않다 — 서술 방식, 문서 전체 시나리오”).
- Decisions by the author: scenario A (each chapter starts where the machine fails and adds
  the part that fixes it); a new shared example whose numbers can be read; 합니다체.

## Diagnosis of the previous narration

1. The numbers carried no meaning: (1,0,1,0)-style vectors and convenient coefficients made
   intermediate values such as (2.833, 0.167) unreadable; 71.8% for 갔다 came from a
   hand-tuned readout.
2. The motivating story (“어제/내일 학교에”) and the computed example disagreed, and the text
   had to say so.
3. It narrated the machine's pipeline order: one forward pass split over units, each ending
   with what it hands to the next, rather than the reader's questions.
4. Many coined names for one thing (고정 계수, 참고 숫자, 참고 비중, 몫, 표현, 어휘 출력 계수).
5. Caveats in almost every paragraph.

## The example (`src/lib/math/story.ts`, designed values, said once in the article)

- Words (ko / en): 어제 · 내일 · 학교에 · 갔다 · 간다 · 끝 / Yesterday · Tomorrow · I · went · will · end.
- Slots of a word vector: 과거 · 미래 · 장소 · 동작 / past · future · person · verb.
  어제 (1,0,0,0), 내일 (0,1,0,0), 학교에 (0,0,1,0), 갔다 (1,0,0,1), 간다 (0,1,0,1).
- Q/K slots: 시간 · 장소. The place position asks for time (W_Q: 장소 → 시간 3); past and
  future offer time, the place slot offers place; V is the word's own slots.
- Next-word score table: each candidate's column says which slots it likes
  (갔다: 과거 +2, 미래 −2, 장소 +1, 동작 −3; 끝: 동작 +3; …).
- Computed story (both languages share every number):
  last word only → 갔다 31.7% = 간다 31.7% for both sentences; attention → shares 89.3% /
  10.7%, mixed (0.893, 0, 1.107, 0), 갔다 88.1% (내일: 간다 88.1%); after appending 갔다 → 끝
  97.1%; training pairs 어제→학교에 1.8% (loss 4.04), →갔다 88.1%, →끝 97.1%; one learning
  step on (과거, 갔다) from an untrained table: 37.9% → 50.0%, loss 0.970 → 0.692.

## Chapters (article ids)

| # | id | Reader's question | Failure or hook | What is computed / shown |
| --- | --- | --- | --- | --- |
| 1 | `language-model` | What does an LLM compute? | Guess the word after “어제 학교에” | Interactive: first word 어제/내일 flips the top candidate; append, recompute, stop at 끝 |
| 2 | `tokens` | How does text become numbers? | A machine computes only numbers | Word table with named slots; vector; tokens are pieces in real models |
| 3 | `context` | Can the last word decide? | 학교에 alone gives 갔다 = 간다 | Next-word score table; score = matching slots multiplied and added (`#similarity`); softmax |
| 4 | `attention` | How does a position use earlier words? | Needs time information from 어제 | Q/K/V as question, label, content; match scores → shares → mixed → added → 88.1% |
| 5 | `positions` | Which words may it read, in what order? | Future words do not exist yet; attention ignores order | Mask table for 어제 학교에 갔다; position vectors in words |
| 6 | `blocks` | Is one look enough? | One question at a time, nothing between slots | A block: several heads, adding back, a per-word network, normalization, stacked N times |
| 7 | `generation` | How do probabilities become a sentence? | Choosing is a separate rule | Greedy vs sampling on the six probabilities; append; stop at 끝 |
| 8 | `training` | Who set these numbers? | The untrained table cannot tell 갔다 from 간다 | One sentence → three pairs; loss; one gradient step |
| 9 | `real-llm` | What differs in a real LLM? | — | Scale, learned unreadable slots, sub-word tokens, probability is not truth; links to the paper |

Style: 합니다체; every paragraph opens with the reader's question; one idea per paragraph;
fixed names (단어, 벡터, 칸, 일치 점수, 몫, 다음 단어 점수, 점수표, 확률, 계수); caveats in one
“실제 LLM에서는” note per chapter; numbers in the text only when they mean something.

## Files

- New: `src/lib/math/story.ts` (+ unit tests), `src/components/story/*`, `tests/e2e/article.spec.ts`.
- The previous article moves verbatim to `src/content/docs/{ko,en}/walkthrough.mdx`
  (“숫자로 끝까지 따라가기”) with its units under `WALKTHROUGH_*` in `nav.ts`; existing e2e
  checks follow it there. Old anchors forward from the article as before.
- `src/content/docs/{ko,en}/index.mdx`, `nav.ts`, `Section`, `PageToc`, `MoreLinks`, the sidebar.
- Checks as before: unit tests, sync + typecheck, build, full e2e with two workers.

---

# Previous scope — restructure: one main path, a lab and a paper companion

- Started: 2026-10-24
- Decisions confirmed by the author on 2026-10-24 ("추천하는 방향으로 진행"):
  1. Three documents: the main article, a lab of editable experiments, and a paper companion.
  2. The main article teaches decoder-only LLM principles with the single two-token
     example (나는 / 학교에 → 갔다; I / went → to school). *Attention Is All You Need*
     specifics live in the paper companion.
  3. Class D duplicates below may be deleted, item by item, once Phase 2 has replaced them.
  4. Units `numbers`, `proportion` and `attention` become one chapter ("앞 자리를 왜,
     어떻게 참고하나"); their anchors stay as step anchors inside it.
  5. Korean and English change together in every phase.

## Why

Measured on a9fd5d4 (desktop 1440 px, Korean page, every disclosure closed):

- 105 `<details>`, 37 top-level, nested up to four deep.
- Visible text ≈ 5.7k of 75k characters (8 %). The MDX is 91 % inside the eleven
  `lesson-legacy` drawers (ko 66k of 73k characters outside the main path).
- Three examples explain the same operations: the main two-token decoder, the folded
  three-token non-causal walk (“나는 학교에 갔다”, identity readout) and the paper's
  encoder–decoder translator. The same “first-head output” reads (2.833, 0.167) in one
  and (0.323, 2.490) in the other.
- The reasons (why context, why exp, why √dₖ, why residuals) and most explorers sit in the
  drawers; the main path is mostly number boxes.
- Main-path prose lives in `LessonComputation.tsx` string literals, the rest in MDX.
- Cause: every earlier scope preserved existing work and layered the new path on top.

## Target structure

| Document | Route | Holds |
| --- | --- | --- |
| Main article | `/ko/`, `/en/` | One example from input to next token, each chapter in the template below |
| Lab | `/ko/lab/`, `/en/lab/` | Editable experiments with their own defaults (the current drawers' explorers) |
| Paper companion | `/ko/paper/`, `/en/paper/` | RNN comparison, encoder–decoder translator, sinusoidal positions, head budget, training setup, BLEU, ablations, limits |

Main chapters after Phase 2: 0 what an LLM does (opening kept) · 1 text to numbers ·
2 why and how to consult earlier positions (comparison → shares → gathering, then the
names Q·K·V and the formula) · 3 masks and order · 4 multi-head · 5 completing a block ·
6 from the final representation to vocabulary probabilities, plus the whole route ·
7 choosing and stopping · 8 learning · 9 this toy model versus a real LLM.

Chapter template: question → picture or interaction → the computation on the shared
snapshot → names and notation (one closed disclosure) → check → links to the lab and the
paper. Disclosures in the main article are one level deep and hold only exact values,
notation or optional depth.

## Triage of the folded content

Classes: **A** promote to the main article, rewritten on the two-token example (Phase 2);
**B** lab; **C** paper companion; **D** delete once replaced (Phase 4).
Phase 1 moves every C block to the paper companion and every A/B/D block to the lab,
verbatim, so the main article loses its drawers before anything is rewritten.
Line numbers refer to `src/content/docs/ko/index.mdx` at a9fd5d4; English mirrors them.

| Unit · drawer | Block (ko heading or component) | Class |
| --- | --- | --- |
| tokens · L117 | 문장의 조각에 번호 붙이기 — tokenizer and ID-as-address prose | A |
| | `EmbeddingLookupExplorer` | B |
| | 벡터 — 순서가 있는 숫자 목록 (vector, dimension) | A |
| | 행렬 — 3 × 4 X, `#math-shape-three`, 다음 계산에 넘길 것은 세 줄 | D |
| numbers · L239 | `AttentionStory` overview / preparation / scores, 기본값으로 계산 이어가기, 두 숫자 줄을 비교하는 점수 만들기 (L298) | D |
| | 행렬곱 — 입력에서 새로운 특징 만들기 (why coefficients), `RowTimesColumn` | A |
| | 같은 한 쌍을 행 × 열로 + `TransposeFlip`, `#math-transpose` | A (figure) / D (prose) |
| | `#matrix-experiments` editable `MatrixProductExplorer` | B |
| | `#math-sum`, `#math-matmul`, 모양만 보고도 알 수 있는 것 + `ShapeFlow` | A |
| | `#dot-experiments`: `DotProductExplorer`, `#math-direction`, vector length | B |
| | `#math-dot` | A |
| proportion · L542 | `AttentionStory` shares / mixture | D |
| | 그냥 나누면 안 될까요, 지수가 하는 일, 양수로 바꾸고 합으로 나눕니다, `#math-softmax` | A |
| | `SoftmaxExplorer` + notes, 모두에게 같은 수를 더하면 + `#math-softmax-shift`, 간격이 좁아지면 | B |
| | `#weighted-two` two-value practice | B |
| | 왜 차원의 제곱근으로 나눌까요 / 항이 많아지면 값이 커집니다 | A |
| attention · L764 | `#problem`: the “it” example, `AttentionArcs`, RNN reading, 불편함 하나·둘 (`SerialWait`, `PathLengthDiagram`), 그래서 생각을 바꿉니다, prior-attention note | C (the “it” motivation is re-told in chapter 2) |
| | 지금까지 셋을 배웠습니다 recap, `QKScoreWalk` | D |
| | Q, K, V 는 어디서 오나요, `#math-qkv`, roles list | A |
| | `QKVRoles`, `AttentionSteps` figures | A (redrawn on two tokens) |
| | 예제의 크기 (512 / 64 / 8) | C |
| | `AttentionLab`, 기본값의 계산, `#attention-third-row`, 나누기를 껐다 켜 보면 | B |
| | `#math-attention`, 이 계산에서 기억할 것 | A |
| positions · L1062 | 어떤 숫자여야 할까요 (why order is needed) | A (original moved with the paper block) |
| | sin 과 cos, 왜 짝마다 속도가 다를까요 + `PositionExplorer`, `#math-position`, 위치별로 계산한 값 + `PositionRows`, 곱하지 않고 더합니다 + note 이렇게 안 하고 그냥 학습시키면 | C |
| | 가리기를 켜 보면 (three-token mask toggle) and note 왜 곱하지 않고 더할까요 (−∞ before softmax) | B (the −∞ reason is A) |
| multi-head · L1230 | 같은 입력, 다른 W + `MultiHeadSplit`; 다시 하나로 + `ConcatShape`, `#math-multi-head`; note 갈래마다 역할이 정해져 있는 건 아닙니다 | A |
| | 예제에 갈래를 하나 더 + `HeadPatternsExplorer`; W_O까지 실제로 계산하기 | B |
| | 전체 폭을 고정하면 계산량이 비슷합니다 + `HeadBudget`; note 갈래가 정말 도움이 되나요 | C |
| blocks · L1433 | feed forward + `FeedForwardShape`, `#math-ffn`, notes; 건너뛰는 길 + `ResidualPath`; 숫자의 크기를 맞추기, `#math-layernorm`, 분산이 뭔가요, 순서가 중요합니다; 한 층을 다시 보면 | A |
| | `ResidualExplorer`, `LayerNormExplorer` | B |
| | 좁히는 계산과 잔차를 숫자로 확인하기 (three-token numbers) | D |
| big-picture · L1663 | 이어서 해보기 + `LayerTraceExplorer`, `#math-readout-identity` | B |
| | 원래 논문의 번역 구조 + `TransformerMap`, `BigPictureWalk`, `#paper-translation` (steps 1–5, 크기 정리, notes), 번역 Transformer와 언어모델 + `ModelRoutes` | C |
| generation · L1874 | `TrainAndGenerate`, `GenerateSteps` and their translator prose, note 줄 서는 문제가 여기서 돌아옵니다 | C (shifted targets and the loop are A, re-told on the decoder) |
| | 확률 계산과 토큰 선택은 다른 단계 + `TokenChoiceExplorer`, `#math-temperature`, 언제 멈출까, 토큰열의 확률 + `#math-logs` | A |
| | 매번 가장 좋은 것을 고르면 + `BeamExplorer`, 후보를 여러 개 들고 가기, beam note | B |
| training · L2047 | 입력과 정답을 한 칸 맞추기, 틀린 정도를 숫자 하나로, `#math-loss`, 왜 정답이 아닌 단어들은 안 보나요, 어느 쪽으로 고칠까, 역전파 범위 | A |
| | `LossExplorer`; 기울기에서 실제 갱신 한 번까지 + `LearningUpdateExplorer`, `#math-gradient` | B |
| | `#paper-smoothing`, 학습률 + `LearningRateCurve`, `#math-schedule`, `#paper-training` | C |
| results · L2301 | BLEU, 점수와 비용 + `BleuCostExplorer`, ablation, 번역 말고 다른 일, 논문의 한계, 표 해석, dev/test split | C |
| | 길이의 비용과 배운 것의 한계, `#math-cost`, closing note | A (chapter 9) |

## Phases

| Phase | Work | Verified by |
| --- | --- | --- |
| 0 | Restore the e2e baseline (see below); this triage | the checks below |
| 1 | Create `lab` and `paper` documents; move C to `paper` and A/B/D to `lab` verbatim; per-document contents and sidebar; old anchors on the main page forward to their new page; e2e targets the new pages | checks below; drawer count on the main page is 0 |
| 2 | Rewrite the main article chapter by chapter in the template; main-path prose moves from TSX to MDX | checks below, 1440/390 px screenshots, first-time-reader pass |
| 3 | Tidy lab and paper pages (one-line purpose and defaults per experiment; the paper reads as one translator example) | checks below |
| 4 | Delete D and the A originals from the lab; remove unused components and CSS; update README and docs | checks below; no unused imports |

Checks: `npm test`; `npm run sync && npm run typecheck`; `npm run build`;
`npx playwright test --workers=2` (four workers overload the cloud container).
`src/lib/math`, fixtures and the unit tests stay unchanged, so the unit suite guards the numbers.

### Phase 0 — e2e baseline

At a9fd5d4 the e2e suite had 106 failures with four workers; with two workers 67 remained:
49 assertion failures and 18 timeouts. Root causes found:

- Unquoted numeric attribute selectors (`[data-token-id=2]`) are invalid CSS; quoted.
- The masthead tools could not wrap, and `.site`'s implicit `auto` column grew to their
  min-content, so at 280 px with 200 % text the whole page was 456 px wide.
- Probability rows did not stack at 200 % text because viewport media queries ignore the
  root font size; the list is now a size container and stacks below 14em.
- Markdown tables inside disclosure bodies were unstyled (selectors only matched direct
  children of a section).
- A Korean particle after `)` stopped CommonMark closing `**`, so the asterisks showed.
- The CSS-variable check only consulted `:root`; component-scoped variables declared in
  their own rule now count as defined.
- Stale expectations after intended changes: the matrix lab labels rows by token
  (`Y(학교에, 2)`), the token-choice note states its own settings, and the English summary
  names the "selection exercise" like its page. The skip-link test opened drawers first,
  which moved focus off the page start.
- With two workers the remaining timeouts came from opening eleven drawers on one heavy
  page; after Phase 1 the slowest test takes under 10 s and the suite runs in about 12 min.

### Phase 1 — done

- `src/content/docs/{ko,en}/lab.mdx` and `paper.mdx` hold the drawers' content verbatim,
  under the main article's section ids. The drawer wrappers, the disclosures that only kept
  experiments off the main path (`#matrix-experiments`, `#dot-experiments`,
  `#softmax-experiments`, `#weighted-two`, `#problem`, `#paper-translation`,
  `#paper-smoothing`, `#paper-training`) and the drawer-only notice “입력과 계수는 아래 각
  실습의 표에 표시합니다” were removed. The tokens accuracy note stayed in the article.
- Links whose unit moved were re-pointed (`#tokens`, `#positions` to the article,
  `#big-picture` to the paper page).
- `MoreLinks` replaces each drawer; `Section` and `PageToc` take a document id;
  `[...slug].astro` computes which ids left the article and the article forwards them.
- The sidebar lists the three documents.

### Phase 2 — pilot chapter 2 (attention), for the author's review

- `numbers`, `proportion` and `attention` are one unit, `attention`; the article has ten
  units in the same four stages (2, 2, 3, 3). The old anchors mark steps inside it.
- Order: the problem (the last position holds only its own chunk; “어제/내일 학교에”) →
  `AttentionFlow`, a picture of the shares and the new values read from the shared
  snapshot → ① scores (matrix product, then why matching entries are multiplied rather
  than summed, then the column layout) → ② shares (why non-negative and summing to 1, why
  the exponential, why ÷√dₖ) → ③ the weighted sum → the names Q·K·V and the formula.
  Notation sits in three closed disclosures (`#math-dot`, `#math-softmax`,
  `#math-attention`). A note says the shares are computed from this input, not learned.
- The chapter links to the lab's `numbers`, `proportion` and `attention` sections and the
  paper's `attention` section. `LessonComputation` captions were left as they are; moving
  them into MDX waits for the review of this pilot.
- The remaining chapters follow the same template once the author confirms the approach.

---

# Previous scope — learn through a task and its numbers

- Started: 2026-10-13
- Completed implementation; final verification is recorded in `docs/progress.md`.

The author is studying LLM principles. Engineering experience is not assumed to supply
linear algebra, probability or calculus prerequisites. This scope covers both languages
and all twelve units, including the later loss, weight update, generation and evaluation.

## Learning sequence

Next-token task → tokens/IDs/embedding → matrix products/dot products → softmax/weighted
sums → attention → positions/masks → heads → FFN/residual/norm → integrated route and
the translation/decoder-only distinction → training → generation → evaluation.

Each unit carries prerequisites, a goal, a reasoned checkpoint and previous/next links.
Keep examples explicitly hand-chosen and distinguish computed attention shares from learned
multiplication coefficients. Do not claim the toy vectors contain learned word meanings.

## Explanation and navigation

The latest feedback rejects a front-loaded notation collection, even if optional.
Calculations are introduced through a task, numbers and a changed input. Native disclosures
at the relevant passage hold detailed steps and map those steps to notation. They start
closed, work with keyboard input and support direct links. No symbol dictionary remains.
The contents shows four coarse stages and the current unit; fine headings expand on request.
Preserve the existing routes and anchors, including the old problem and similarity anchors.

## Scope limits

Reuse the existing maths and visual language; add no dependency or external service.
The integrated decoder uses one post-norm block and a hand-chosen identity readout. The
weight experiment updates one coefficient, including signed/zero inputs. Full Transformer
backpropagation, a trained language model, Adam arithmetic and additional sampling methods
remain outside this scope. Existing work is preserved; no commit, push or deployment.

---

# Previous scope — the reader's questions, answered ahead of time

- Started: 2026-09-16
- Earlier scopes are recorded in `docs/progress.md`

## Rule

Before a section is called done, read it as a curious first-time reader who stops at
every "그럼 X는?", "처음/마지막은?", "누가 정하나?", "학습되나?", "실제로는 몇 개?" and list
what is not answered within ~30 lines. Answer what blocks the next paragraph, in the
section that owns the topic. In the heaviest sections (big-picture, attention) add only a
clause or a pointer. Measure prose per `<Section>` before and after and keep the heaviest
from growing; never state a fact twice. The list of what was added is in
`docs/progress.md`.

---

# Previous scope — the intent comes before the mechanism

- Started: 2026-09-16

## Why

A reader stopped at big-picture step 3 because "attention — 각 줄이 … 정보를 섞습니다"
never says why mixing is wanted, and asked that the whole page be checked for the same
defect. The audit found the reason almost always present but placed after the mechanism,
and a few places with no reason at all. The rule for this scope, already in
`docs/plan.md` §7 ("수식 전에는 계산의 목적"): every mechanism is introduced by the
problem it solves, in the sentence before it. Details and the list of passages are in
`docs/progress.md`.

---

# Previous scope — the walkthrough is easy to follow: no seams, a picture at every key point

- Started: 2026-09-15

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
