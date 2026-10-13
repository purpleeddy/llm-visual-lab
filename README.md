# LLM Visual Lab

A gradual introduction to LLM principles through small numerical experiments, using
*Attention Is All You Need* and a bridge to decoder-only language models.
Work a small example, change a value, then open the calculation behind it. Korean and English.

![Frame 5 of the walkthrough: five rows go through six encoder layers, five rows come out](docs/readme/walk-encoder.png)

## What's covered

Twelve units in four learning stages:

1. **Inputs and numbers**: next-token prediction → tokens, IDs and embeddings → matrix products and dot products.
2. **Context and order**: softmax and weighted sums → self-attention → positions and causal masks.
3. **Blocks and models**: multi-head attention → FFN, residual and layer norm → the full route and a computed one-block decoder.
4. **Learning and generation**: target alignment, loss and one weight update → greedy, sampling and beam search → evaluation and limits.

Every unit states its goal, earlier prerequisites and a checkpoint with folded reasoning.
Maths help belongs to the calculation that needs it: native, initially closed disclosures
show actual numbers and connect them to notation. There is no front-loaded symbol dictionary.
The contents opens the current stage; detailed headings are available on request.
Old anchors such as `#problem`, `#similarity` and `#attention` still work.

Experiments compute from explicitly hand-chosen inputs. IDs in conceptual illustrations
and prefix probability tables are illustrative; benchmark values come from the paper.
The tiny decoder is a one-block, post-norm illustration, not a trained GPT or full translator.
Its position step adds X+PE without the paper’s embedding rescaling; its vocabulary readout
is an identity matrix. The training experiment really updates one coefficient and recomputes
loss; it does not implement backpropagation through an entire LLM.

## Try it

The attention lab computes equation (1) from inputs you can edit. Click a result cell to
see which row and column produced it and the products that add up to it.

![Attention lab, scores step, one cell of QKᵀ selected](docs/readme/attention-lab.png)

Other experiments let you retrieve an embedding row by ID, append next tokens, follow one
input through attention and a complete block, update one coefficient, and compare greedy
with sampling on the same logits. Existing controls for positions, normalization, residuals,
loss, beam width and benchmark tables remain.

In the learning experiment input 1, 0 and −1 reveal why a learned weight is a multiplication
coefficient, rather than an attention share or a fixed label of importance.

![Positional encoding explorer](docs/readme/position-explorer.png)

Works in light and dark, on phones, and reads without JavaScript (the static build
includes the default state of every experiment).

## Run

```bash
npm install
npm run dev          # http://localhost:4321/llm-visual-lab/
npm run build
npm run preview

npm test             # math (vitest)
npm run typecheck
npx playwright install chromium && npm run test:e2e
```

## Layout

- `src/content/docs/{ko,en}/index.mdx` – the page text
- `src/lib/math/` – pure functions; everything on screen comes from these
- `src/components/lab/` – React experiments
- `src/components/site/` – SVG figures, rendered at build time from the same math
- `src/lib/i18n/` – strings in both languages
- `src/lib/paper.ts` – numbers transcribed from the paper (the only ones not computed here)
- `tests/unit/`, `tests/e2e/` – math against numpy-generated fixtures; browser checks at desktop and phone width

## Paper

Vaswani et al., *Attention Is All You Need*, [arXiv:1706.03762](https://arxiv.org/abs/1706.03762) (v7).
`docs/papers/` lists which parts are worked through and which are only named.
