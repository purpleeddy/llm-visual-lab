# "Attention Is All You Need" — coverage map

> 2026-09-11, structural change: the commentary was merged from eight documents
> into **one page of twelve sections**, and that page became the home page.
> The "Explained in" column now points at section anchors inside `/{ko,en}/`
> (for example `/ko/#attention`).
> The reader-facing pages do not lead with section numbers from the paper. This
> table carries that correspondence instead.
>
> 2026-09-12: the remaining six sections were written, so P2, P3 and P4 are done.
> The rows still marked partial say what they leave out.

This document records how each section, equation, figure and table of the paper
maps onto the commentary in the wiki. It is the coverage map required by section
4.1 of `docs/plan.md`, and it is updated as the commentary grows.

## The version of the paper used

| Item | Value |
| --- | --- |
| Title | Attention Is All You Need |
| Authors | Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Łukasz Kaiser, Illia Polosukhin |
| arXiv ID | [1706.03762](https://arxiv.org/abs/1706.03762) |
| **Version used** | **v7 (submitted 2023-08-02)** |
| Published in | 31st Conference on Neural Information Processing Systems (NIPS 2017), Long Beach, CA, USA |
| Length | 15 pages, 5 figures, 4 tables, 40 references |
| File downloaded | `https://arxiv.org/pdf/1706.03762v7` |
| Checked on | 2026-09-10 |

The version history is v1 (2017-06-12), v2 (2017-06-19), v3 (2017-06-20),
v4 (2017-06-30), v5 (2017-12-06), v6 (2023-07-24), v7 (2023-08-02). v6 and v7
are revisions added in 2023; their cover page carries Google's permission notice
about reusing the figures and tables. This wiki cites **the section, equation,
figure and table numbers of v7**.

The paper has no section called an appendix. After the references there is an
unnumbered item, **"Attention Visualizations"**, which holds figures 3, 4 and 5.

## Status labels

- `P1 done` … `P4 done` — written and reviewed at that stage of work.
  All twelve sections of the article are now written.
- `partial` — deliberately incomplete. What is missing is named in the row.
- `background` — not a contribution of the paper, but context added for the reader.

## Sections

| In the paper | What it says | Explained in | Status | Maths needed | Visualisation | Reviewed |
| --- | --- | --- | --- | --- | --- | --- |
| Abstract | The Transformer: recurrence and convolution removed, attention alone. WMT14 EN-DE 28.4 / EN-FR 41.8 BLEU | the opening of the article | P1 done | none | none | yes |
| §1 Introduction | The sequential computation of RNNs, LSTMs and GRUs blocks parallelism | `#problem` | P1 done | none | sequential versus parallel computation | yes |
| §2 Background | Distance-dependent cost in Extended Neural GPU, ByteNet and ConvS2S; prior work on self-attention | `#problem` | P1 done | O(·) notation introduced | distance between positions against operation count | yes |
| §3 Model Architecture (opening) | The encoder–decoder structure, auto-regressive generation | `#big-picture` | P1 done | none | map of the whole data flow | yes |
| §3.1 Encoder and Decoder Stacks | N=6; 2 sub-layers in the encoder, 3 in the decoder; residual + LayerNorm(x + Sublayer(x)); d_model=512 | `#big-picture` for the shape, `#blocks` for the parts | P2 done | mean and variance | `TransformerMap`, `ResidualPath`, `LayerNormSteps` | yes |
| §3.2 Attention (opening) | Query, key, value and output are all vectors; the output is a weighted sum of values | `#attention` | P1 done | weighted sums | weighted-sum bars | yes |
| §3.2.1 Scaled Dot-Product Attention | Equation (1), the √d_k division, masking, comparison with additive attention | `#similarity`, `#proportion`, `#attention` | P1 done | dot product, exponential, softmax, matrix product | the attention lab, every step | yes |
| §3.2.2 Multi-Head Attention | h=8, d_k=d_v=d_model/h=64, the MultiHead and head_i equations, W_i^Q / W_i^K / W_i^V / W^O | `#multi-head` | P2 done | joining matrices side by side | `MultiHeadSplit`, `HeadPatterns` — the two heads' computed weights | yes |
| §3.2.3 Applications of Attention | The three uses: encoder–decoder attention, encoder self-attention, decoder masked self-attention | the masking part of `#attention`, the layer summary in `#blocks` | P2 done | none | the decoder layer in `#blocks` | yes |
| §3.3 Position-wise Feed-Forward Networks | Equation (2), d_ff=2048, applied identically at every position | `#blocks` | P2 done | ReLU | `FeedForwardShape` — the computed hidden row, before and after | yes |
| §3.4 Embeddings and Softmax | Learned embeddings; the two embedding layers and the pre-softmax linear transform share weights; embeddings multiplied by √d_model | the input path in `#big-picture`; the output distribution in `#training` | P1 partial / P3 partial | none | `TokenPipeline`, `LossPicture` | partial — the shared weights and the √d_model factor are still not covered |
| §3.5 Positional Encoding | PE(pos,2i)=sin(pos/10000^(2i/d_model)), PE(pos,2i+1)=cos(...); wavelengths form a geometric progression from 2π to 10000·2π | `#positions` | P2 done | sine, cosine, period | `PositionWaves`, `PositionGrid` — computed values | yes |
| §4 Why Self-Attention | Comparison on three counts: cost per layer, number of sequential operations, maximum path length | `#problem`, and the n² cost again in `#results` | P1 partial / P4 partial | O(·) notation | `PathLengthDiagram` | partial — only the self-attention and recurrent rows of Table 1 are used |
| §5 Training (opening) | How training is done, in outline | `#training` | P3 done | none | `TrainAndGenerate` | yes |
| §5.1 Training Data and Batching | WMT14 EN-DE, 4.5M sentence pairs, BPE with 37 000 tokens; EN-FR, 36M sentences, word-piece 32 000; about 25 000 source and target tokens per batch | the conditions table in `#training` | P3 done | none | none | yes |
| §5.2 Hardware and Schedule | 8 P100s; base 0.4 s/step over 100K steps (12 hours), big 1.0 s/step over 300K steps (3.5 days) | the conditions table in `#training` | P3 done | none | none | yes |
| §5.3 Optimizer | Equation (3); Adam with β1=0.9, β2=0.98, ε=1e-9; warmup_steps=4000 | `#training` | P3 done | exponents, minimum, gradient (named, not derived) | `LearningRateCurve` — computed | yes |
| §5.4 Regularization | Residual dropout 0.1, dropout on the embedding + PE sum, label smoothing ε_ls=0.1 | `#training` | P3 partial | probability distributions | `LossPicture` — computed | partial — dropout is named and its measured effect given, but its arithmetic is not shown |
| §6.1 Machine Translation | base 27.3/38.1, big 28.4/41.8 BLEU; checkpoint averaging; beam 4, α=0.6 | `#results`, with beam search in `#generation` | P4 done | none | `BleuCost` — Table 2 as score against cost | yes |
| §6.2 Model Variations | The (A)–(E) ablations of Table 3 | `#results` | P4 done | none | a selected table | yes — the selection is stated, not the whole table |
| §6.3 English Constituency Parsing | 4 layers, d_model=1024, WSJ 40K, F1 91.3 / 92.7 semi-supervised | `#results` | P4 done | none | none | yes |
| §7 Conclusion | The first transduction model built on attention alone; directions for future work | the opening, and the closing of `#results` | P4 done | none | none | yes |
| References [1]–[40] | 40 references | linked individually where cited | ongoing | — | — | — |

## Equations

| Number | In the paper | Equation | Explained in | Status |
| --- | --- | --- | --- | --- |
| (1) | §3.2.1, p. 4 | Attention(Q,K,V) = softmax(QKᵀ/√d_k)V | `#attention` | P1 done |
| unnumbered | §3.2.2, p. 5 | MultiHead(Q,K,V) = Concat(head_1,…,head_h)W^O, head_i = Attention(QW_i^Q, KW_i^K, VW_i^V) | `#multi-head` | P2 done |
| (2) | §3.3, p. 5 | FFN(x) = max(0, xW_1 + b_1)W_2 + b_2 | `#blocks` | P2 done |
| unnumbered | §3.5, p. 6 | PE(pos,2i) = sin(pos/10000^(2i/d_model)), PE(pos,2i+1) = cos(pos/10000^(2i/d_model)) | `#positions` | P2 done |
| (3) | §5.3, p. 7 | lrate = d_model^(−0.5) · min(step_num^(−0.5), step_num · warmup_steps^(−1.5)) | `#training` | P3 done |
| unnumbered | §3.1, p. 3 | LayerNorm(x + Sublayer(x)) | `#blocks` | P2 done |
| footnote 4 | §3.2.1, p. 4 | q·k = Σ_{i=1}^{d_k} q_i k_i has mean 0 and variance d_k | the end of `#proportion` | P1 done |

## Figures

| Number | In the paper | What it shows | Explained in | Status |
| --- | --- | --- | --- | --- |
| Figure 1 | p. 3 | The whole Transformer architecture | redrawn as our own SVG in `#big-picture` | P1 done |
| Figure 2 (left) | p. 4 | The order of operations in scaled dot-product attention | `#attention` | P1 done |
| Figure 2 (right) | p. 4 | Multi-head attention | redrawn as `MultiHeadSplit` in `#multi-head` | P2 done |
| Figure 3 | p. 13 | A long-range dependency in encoder self-attention at layer 5 ('making … more difficult') | not written | P4 planned |
| Figure 4 | p. 14 | Apparent anaphora resolution in heads 5 and 6 of layer 5 ('its') | not written | P4 planned |
| Figure 5 | p. 15 | Different heads having learned different roles | not written | P4 planned |

The figures from the paper are not reproduced; they are redrawn as our own
diagrams. The permission notice on the cover page allows reproduction for
journalistic and scholarly purposes, but they are redrawn as SVG anyway, for
accuracy of the commentary and so they follow the theme.

## Tables

| Number | In the paper | What it shows | Explained in | Status |
| --- | --- | --- | --- | --- |
| Table 1 | p. 6 | Cost, sequential operations and maximum path length by layer type | only the self-attention and recurrent rows, cited in `#problem` | P1 partial — the convolutional and restricted rows are recorded in `src/lib/paper.ts` but not explained |
| Table 2 | p. 8 | BLEU against training cost | `#results`, as the `BleuCost` scatter | P4 done |
| Table 3 | p. 9 | Architecture ablations (A)–(E) | `#results`, a selected subset | P4 done |
| Table 4 | p. 10 | English constituency parsing results | `#results`, in prose | P4 done |

## Inconsistencies in the paper, and things to watch

1. **The EN-FR BLEU figures disagree.** The abstract and Table 2 (p. 8) give
   41.8 BLEU for Transformer (big) on WMT14 English-to-French. The body of §6.1
   (p. 8) says the same model "achieves a BLEU score of **41.0**". This was not
   corrected in v7. Commentary citing the number uses the 41.8 from Table 2 and
   notes the discrepancy in a footnote.

2. **Where the normalisation sits.** The paper uses `LayerNorm(x + Sublayer(x))`
   — post-norm. That differs from the pre-norm arrangement that became common
   later, so P2 explains the two separately.

3. **No appendix.** There is no section called an appendix. "Attention
   Visualizations", which holds figures 3 to 5, is treated as one, but the
   documents use the paper's own name for it.

4. **The limits of reading attention.** The last paragraph of §4 and figures 3
   to 5 say only that heads "appear" or "seem" to exhibit behaviour related to
   syntactic and semantic structure. Attention weights are not offered as a
   complete causal account of what the model decided.

5. **Conditions the paper does not give.** Initialisation, the details of data
   preprocessing, the exact procedure for checkpoint averaging and similar are
   absent from the paper. The commentary does not fill them in by guesswork.
