"""
Independent reference values.

This does not port the TypeScript; it deliberately computes the same numbers a
**different way**, so that a mistake in one path does not hide in the other.

- matrix product: numpy einsum (the TS uses a triple loop)
- softmax: the definition itself, exp(s)/Sum exp(s) (the TS subtracts the maximum)
- the integer stretch (Q, K, V, QK^T): Python Fraction, exact, no floating-point drift
- layer norm, the feed-forward network, the loss and beam search: written out again
  from the definitions, with numpy doing the linear algebra

If the two paths agree to within 1e-9, the chance that both are wrong in the same
way drops sharply.

Run: python3 tests/fixtures/generate_fixtures.py
"""

import json
import math
from decimal import Decimal, localcontext
from fractions import Fraction
from pathlib import Path

import numpy as np

OUT = Path(__file__).parent / "reference.json"

# The worked example from section 8.2 of docs/plan.md
X = [[1, 0, 1, 0], [0, 1, 0, 1], [1, 1, 0, 0]]
WQ = [[1, 0], [0, 1], [1, 0], [0, 1]]
WK = [[0, 1], [1, 0], [0, 1], [1, 0]]
WV = [[1, 0], [0, 1], [2, 0], [0, 2]]


def frac_matmul(a, b):
    """Exact matrix product over Fraction."""
    n, p, m = len(a), len(b), len(b[0])
    return [
        [sum((Fraction(a[i][k]) * Fraction(b[k][j]) for k in range(p)), Fraction(0)) for j in range(m)]
        for i in range(n)
    ]


def to_float(m):
    return [[float(v) for v in row] for row in m]


def naive_softmax(scores, allowed):
    """
    The definition, straight. No subtracting the maximum for stability.

    A float exp overflows once the score passes about 700, so this works in
    50-digit Decimal instead. That handles exp(1001) as it stands, without any
    stabilising trick, which is exactly what makes it an independent check on
    the stabilised softmax in TypeScript.
    """
    with localcontext() as ctx:
        ctx.prec = 50
        exps = [Decimal(repr(s)).exp() if ok else Decimal(0) for s, ok in zip(scores, allowed)]
        total = sum(exps, Decimal(0))
        if total == 0:
            raise ValueError("every position is blocked, so no probability is defined")
        return [float(e / total) for e in exps]


def causal(n):
    return [[j <= i for j in range(n)] for i in range(n)]


def allow_all(n):
    return [[True] * n for _ in range(n)]


def attention_case(name, scaled, masked, X=X, WQ=WQ, WK=WK, WV=WV):
    # 1) Projection, exact, over Fraction
    Q = frac_matmul(X, WQ)
    K = frac_matmul(X, WK)
    V = frac_matmul(X, WV)

    # 2) The scores QK^T, exact, over Fraction
    KT = [[K[i][j] for i in range(len(K))] for j in range(len(K[0]))]
    S = frac_matmul(Q, KT)

    # Cross-check with numpy einsum
    npS = np.einsum("ik,jk->ij", np.array(X, float) @ np.array(WQ, float),
                    np.array(X, float) @ np.array(WK, float))
    assert np.allclose(npS, np.array(to_float(S)), atol=1e-12), f"{name}: QK^T does not agree"

    d_k = len(WQ[0])
    factor = 1.0 / math.sqrt(d_k) if scaled else 1.0
    scaled_scores = [[float(v) * factor for v in row] for row in S]

    n = len(X)
    allowed = causal(n) if masked else allow_all(n)

    A = [naive_softmax(scaled_scores[i], allowed[i]) for i in range(n)]

    # 3) Output O = A.V, in numpy (A is floating point by now anyway)
    O = (np.array(A, float) @ np.array(to_float(V), float)).tolist()

    # Rows must sum to 1. Necessary, not sufficient - this does not prove the values right.
    for i, row in enumerate(A):
        assert abs(sum(row) - 1.0) < 1e-12, f"{name}: probabilities in row {i} do not sum to 1"

    return {
        "name": name,
        "settings": {"scaled": scaled, "masked": masked},
        "dims": {"n": n, "dModel": len(X[0]), "dK": d_k, "dV": len(WV[0])},
        "X": X, "WQ": WQ, "WK": WK, "WV": WV,
        "Q": to_float(Q), "K": to_float(K), "V": to_float(V),
        "KT": to_float(KT),
        "scores": to_float(S),
        "scaleFactor": factor,
        "scaledScores": scaled_scores,
        "allowed": allowed,
        # JSON has no -Infinity, so blocked positions are written as null
        "maskedScores": [
            [scaled_scores[i][j] if allowed[i][j] else None for j in range(n)]
            for i in range(n)
        ],
        "weights": A,
        "output": O,
    }


def softmax_case(name, scores, allowed=None):
    ok = allowed if allowed is not None else [True] * len(scores)
    return {
        "name": name,
        "scores": scores,
        "allowed": ok,
        "probabilities": naive_softmax(scores, ok),
    }


# --- the pieces the later sections need -------------------------------------

HEAD2_WQ = [[1, 0], [0, 1], [0, 0], [0, 0]]
HEAD2_WK = [[1, 0], [0, 1], [0, 0], [0, 0]]
HEAD2_WV = [[0, 1], [1, 0], [0, 0], [0, 0]]
WO = [[1, 0, 0, 1], [0, 1, 1, 0], [1, 1, 0, 0], [0, 0, 1, 1]]

FFN_W1 = [
    [1, -1, 0, 2, 1, 0, -1, 0],
    [0, 1, 1, -1, 0, 2, 0, 1],
    [2, 0, -1, 0, 1, 1, 1, -1],
    [-1, 1, 0, 1, 0, -1, 2, 0],
]
FFN_B1 = [0, -1, 1, 0, -2, 0, 1, 0]
FFN_W2 = [
    [1, 0, 0, 1], [0, 1, 1, 0], [1, -1, 0, 0], [0, 0, 1, -1],
    [1, 1, 0, 0], [0, 0, -1, 1], [-1, 0, 1, 0], [0, 1, 0, 1],
]
FFN_B2 = [0, 1, 0, -1]

TOY_MODEL = {
    "": {"a": 0.5, "b": 0.4, "c": 0.1},
    "a": {"a": 0.1, "b": 0.2, "c": 0.3, ".": 0.4},
    "b": {"a": 0.9, "b": 0.02, "c": 0.03, ".": 0.05},
    "c": {"a": 0.3, "b": 0.3, "c": 0.1, ".": 0.3},
    "a a": {".": 1}, "a b": {".": 1}, "a c": {".": 1},
    "b a": {".": 0.95, "c": 0.05}, "b b": {".": 1}, "b c": {".": 1},
    "c a": {".": 1}, "c b": {".": 1}, "c c": {".": 1},
    "b a c": {".": 1},
}


def attention_output(WQ_, WK_, WV_, scaled, masked):
    """Just the O of one head, reusing the exact-then-naive path above."""
    case = attention_case("head", scaled, masked, X, WQ_, WK_, WV_)
    return case["output"]


def multi_head(scaled, masked):
    """Two heads, laid side by side, then one more matrix."""
    o1 = attention_output(WQ, WK, WV, scaled, masked)
    o2 = attention_output(HEAD2_WQ, HEAD2_WK, HEAD2_WV, scaled, masked)
    concat = [r1 + r2 for r1, r2 in zip(o1, o2)]
    out = (np.array(concat, float) @ np.array(WO, float)).tolist()
    return {
        "settings": {"scaled": scaled, "masked": masked},
        "perHeadOutput": [o1, o2],
        "concat": concat,
        "WO": WO,
        "output": out,
    }


def positional(n_pos, d_model):
    """The definition, term by term. No vectorising, so the TS loop has nothing to copy."""
    rows = []
    for pos in range(n_pos):
        row = []
        for i in range(d_model // 2):
            div = 10000.0 ** ((2 * i) / d_model)
            row.append(math.sin(pos / div))
            row.append(math.cos(pos / div))
        rows.append(row)
    wl = [2 * math.pi * (10000.0 ** ((2 * i) / d_model)) for i in range(d_model // 2)]
    return {"n": n_pos, "dModel": d_model, "matrix": rows, "wavelengths": wl}


def layer_norm_row(x, eps=1e-5):
    m = sum(x) / len(x)
    var = sum((v - m) ** 2 for v in x) / len(x)
    den = math.sqrt(var + eps)
    return {"input": list(x), "mean": m, "variance": var,
            "denominator": den, "output": [(v - m) / den for v in x]}


def feed_forward(Xm, W1, b1, W2, b2):
    h = (np.array(Xm, float) @ np.array(W1, float) + np.array(b1, float))
    a = np.maximum(h, 0.0)
    o = a @ np.array(W2, float) + np.array(b2, float)
    return {"hidden": h.tolist(), "activated": a.tolist(), "output": o.tolist(),
            "zeroed": int((h <= 0).sum())}


def cross_entropy(probs, target_dist):
    terms = [0.0 if t == 0 else -t * math.log(p) for p, t in zip(probs, target_dist)]
    return {"terms": terms, "loss": sum(terms)}


def label_smoothed(size, target, eps):
    spread = eps / size
    return [(1 - eps + spread) if i == target else spread for i in range(size)]


def lrate(step, d_model=512, warmup=4000):
    return (d_model ** -0.5) * min(step ** -0.5, step * (warmup ** -1.5))


def beam(model, width, max_steps=6):
    """Plain breadth-first with a cut, written independently of the TS."""
    live = [([], 1.0)]
    done = []
    for _ in range(max_steps):
        if not live:
            break
        expanded = []
        for toks, p in live:
            for tok, q in model[" ".join(toks)].items():
                expanded.append((toks + [tok], p * q))
        expanded.sort(key=lambda c: (-c[1], " ".join(c[0])))
        done += [c for c in expanded if c[0][-1] == "."]
        live = [c for c in expanded if c[0][-1] != "."][:width]
        if done and all(p <= max(d[1] for d in done) for _, p in live):
            break
    done.sort(key=lambda c: (-c[1], " ".join(c[0])))
    return {"width": width,
            "best": {"tokens": done[0][0], "probability": done[0][1]},
            "finished": [{"tokens": t, "probability": p} for t, p in done]}


def main():
    n = len(X)
    data = {
        "_comment": (
            "Independent reference values. tests/fixtures/generate_fixtures.py computes "
            "them with numpy einsum, Fraction and the softmax definition itself, and the "
            "TypeScript implementation is checked against them."
        ),
        "matmul": [
            {
                "name": "X.W_Q (the projection in the worked example)",
                "a": X, "b": WQ,
                "result": to_float(frac_matmul(X, WQ)),
            },
            {
                "name": "Q.K^T (the scores in the worked example)",
                "a": to_float(frac_matmul(X, WQ)),
                "b": to_float([[frac_matmul(X, WK)[i][j] for i in range(3)] for j in range(2)]),
                "result": to_float(
                    frac_matmul(
                        frac_matmul(X, WQ),
                        [[frac_matmul(X, WK)[i][j] for i in range(3)] for j in range(2)],
                    )
                ),
            },
            {
                "name": "rectangular product 2x3 . 3x2",
                "a": [[1, 2, 3], [4, 5, 6]],
                "b": [[7, 8], [9, 10], [11, 12]],
                "result": to_float(frac_matmul([[1, 2, 3], [4, 5, 6]], [[7, 8], [9, 10], [11, 12]])),
            },
            {
                "name": "product mixing negatives and decimals",
                "a": [[-1.5, 2.25], [0.5, -3.0]],
                "b": [[2.0, -0.5], [1.25, 4.0]],
                "result": (np.array([[-1.5, 2.25], [0.5, -3.0]]) @ np.array([[2.0, -0.5], [1.25, 4.0]])).tolist(),
            },
        ],
        "dotProduct": [
            {"name": "q₁·k₁", "u": [2, 0], "v": [0, 2], "result": 0.0},
            {"name": "q₁·k₂", "u": [2, 0], "v": [2, 0], "result": 4.0},
            {"name": "q₃·k₃", "u": [1, 1], "v": [1, 1], "result": 2.0},
            {"name": "with negative entries", "u": [1.5, -2.0, 3.0], "v": [-2.0, 0.5, 4.0], "result": float(np.dot([1.5, -2.0, 3.0], [-2.0, 0.5, 4.0]))},
        ],
        "softmax": [
            softmax_case("equal scores", [2.0, 2.0, 2.0]),
            softmax_case("row 1 of the worked example, unscaled", [0.0, 4.0, 2.0]),
            softmax_case("row 1 of the worked example, divided by sqrt(2)", [0.0, 4.0 / math.sqrt(2), 2.0 / math.sqrt(2)]),
            softmax_case("same scores shifted by a constant", [10.0, 14.0, 12.0]),
            softmax_case("causal mask, only the first position open", [0.0, 4.0, 2.0], [True, False, False]),
            softmax_case("causal mask, first two positions open", [4.0, 0.0, 2.0], [True, True, False]),
            softmax_case("large scores, an overflow check", [1000.0, 1001.0, 999.0]),
            softmax_case("negative scores", [-5.0, -3.0, -4.5]),
        ],
        "attention": [
            attention_case("worked example, scaled, no mask", True, False),
            attention_case("worked example, unscaled, no mask", False, False),
            attention_case("worked example, scaled, causal mask", True, True),
            attention_case("worked example, unscaled, causal mask", False, True),
        ],
    }

    data["multiHead"] = [multi_head(True, False), multi_head(True, True)]
    data["positional"] = positional(6, 4)
    data["layerNorm"] = [layer_norm_row([2.0, 8.0, 4.0, 6.0]),
                         layer_norm_row([1.0, 0.0, 1.0, 0.0]),
                         layer_norm_row([-3.0, 1.0, 0.0, 5.0])]
    data["feedForward"] = feed_forward(X, FFN_W1, FFN_B1, FFN_W2, FFN_B2)
    probs = [0.1, 0.6, 0.2, 0.1]
    onehot = [0.0, 1.0, 0.0, 0.0]
    smooth = label_smoothed(4, 1, 0.1)
    data["loss"] = {
        "probabilities": probs,
        "target": 1,
        "oneHot": cross_entropy(probs, onehot),
        "labelSmoothedTarget": smooth,
        "labelSmoothed": cross_entropy(probs, smooth),
    }
    data["learningRate"] = [{"step": s_, "rate": lrate(s_)}
                            for s_ in [1, 100, 1000, 4000, 10000, 100000]]
    data["beam"] = [beam(TOY_MODEL, 1), beam(TOY_MODEL, 2)]

    # Pin the numbers the prose quotes, so the prose cannot drift from the calculation
    base = data["attention"][0]
    data["quotedInProse"] = {
        "_comment": "Numbers written out verbatim in the prose. If these change, the prose must change too.",
        "scoresRow1": base["scores"][0],
        "weightsRow1_3dp": [round(v, 3) for v in base["weights"][0]],
        "weightsRow3_3dp": [round(v, 3) for v in base["weights"][2]],
        "outputRow3_3dp": [round(v, 3) for v in base["output"][2]],
        "causalWeightsRow1": data["attention"][2]["weights"][0],
        "causalOutputRow1": data["attention"][2]["output"][0],
        "sqrt2": math.sqrt(2),
    }

    OUT.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {OUT}")
    print("worked example, scores S =", base["scores"])
    print("worked example, weights A =", [[round(v, 6) for v in r] for r in base["weights"]])
    print("worked example, output O =", [[round(v, 6) for v in r] for r in base["output"]])
    print("causal mask, weights =", [[round(v, 6) for v in r] for r in data["attention"][2]["weights"]])
    print("causal mask, output =", [[round(v, 6) for v in r] for r in data["attention"][2]["output"]])


if __name__ == "__main__":
    main()
