/** The learning order of the article. Stable anchors survive heading changes. */
import type { Locale } from './i18n/routing';
export const ARTICLE_ID = '';
export type SectionStatus = 'complete' | 'planned';
export interface SectionGroup {
  id: string;
  title: Record<Locale, string>;
  summary: Record<Locale, string>;
  paper: Record<Locale, string>;
}
export interface SectionItem {
  id: string;
  title: Record<Locale, string>;
  navTitle: Record<Locale, string>;
  group: string;
  status: SectionStatus;
  stage?: string;
  prerequisites: string[];
  goal: Record<Locale, string>;
  check: { question: Record<Locale, string>; answer: Record<Locale, string> };
}
export const GROUPS: SectionGroup[] = [
  {
    "id": "start",
    "title": {
      "ko": "입력과 숫자",
      "en": "Inputs and numbers"
    },
    "summary": {
      "ko": "문맥 → 토큰 → 벡터 → 계산",
      "en": "Context → tokens → vectors → arithmetic"
    },
    "paper": {
      "ko": "논문 3.4 · GPT 3.1",
      "en": "paper §3.4 · GPT §3.1"
    }
  },
  {
    "id": "attention",
    "title": {
      "ko": "문맥과 순서",
      "en": "Context and order"
    },
    "summary": {
      "ko": "비중 → attention → 가리기와 위치 확장",
      "en": "Shares → attention → positions and masks"
    },
    "paper": {
      "ko": "논문 3.2.1 · 3.5",
      "en": "paper §3.2.1 · 3.5"
    }
  },
  {
    "id": "layer",
    "title": {
      "ko": "층과 모델",
      "en": "Blocks and models"
    },
    "summary": {
      "ko": "head → 한 층 → 전체 경로",
      "en": "Heads → one block → the whole route"
    },
    "paper": {
      "ko": "논문 3.2.2 · 3.3 · 3.1",
      "en": "paper §3.2.2 · 3.3 · 3.1"
    }
  },
  {
    "id": "use",
    "title": {
      "ko": "생성과 학습",
      "en": "Generation and learning"
    },
    "summary": {
      "ko": "생성 → 손실 → 갱신 → 평가",
      "en": "Generation → loss → update → evaluation"
    },
    "paper": {
      "ko": "논문 5 · 6 · 7",
      "en": "paper §5 · 6 · 7"
    }
  }
];

export const SECTIONS: SectionItem[] = [
  {
    "id": "language-model",
    "title": {
      "ko": "한 계산 여정 — 입력에서 다음 토큰까지",
      "en": "One computation: from input to next token"
    },
    "group": "start",
    "status": "complete",
    "prerequisites": [],
    "goal": {
      "ko": "주어진 두 입력에서 마지막 위치를 따라가며, 계산 → 후보 확률 → 선택 → 새 입력으로 다시 계산하는 고리를 설명합니다.",
      "en": "Follow the final position of two given inputs through computation, candidate probabilities, choice and recomputation with the longer input."
    },
    "check": {
      "question": {
        "ko": "새 토큰을 붙인 뒤 바뀌는 것은 문맥일까요, 배운 가중치일까요?",
        "en": "After appending a token, what changes: the context or the learned weights?"
      },
      "answer": {
        "ko": "문맥이 바뀝니다. 생성 중에는 가중치를 다시 배우지 않고, 바뀐 문맥으로 다음 확률을 계산합니다.",
        "en": "The context changes. Generation uses the learned weights to predict from that new context; it does not retrain them."
      }
    },
    "navTitle": {
      "ko": "입력부터 생성까지",
      "en": "Input to generation"
    }
  },
  {
    "id": "tokens",
    "title": {
      "ko": "글을 숫자로 — 토큰·ID·embedding",
      "en": "Text to numbers: tokens, IDs and embeddings"
    },
    "group": "start",
    "status": "complete",
    "prerequisites": [
      "language-model"
    ],
    "goal": {
      "ko": "토큰, 번호, 벡터를 구분하고 두 입력이 2 × 4 행렬이 되는 이유를 설명합니다.",
      "en": "Distinguish tokens, IDs and vectors, and explain why two inputs become a 2 × 4 matrix."
    },
    "check": {
      "question": {
        "ko": "토큰 번호 0과 4차원 embedding은 같은 종류의 값일까요?",
        "en": "Are token ID 0 and a four-dimensional embedding the same kind of value?"
      },
      "answer": {
        "ko": "번호는 표의 한 행을 찾는 정수입니다. embedding은 그 행에서 꺼낸 숫자 목록입니다. 번호의 크기가 의미의 크기를 뜻하지 않습니다.",
        "en": "An ID is an integer locating a table row. An embedding is the vector retrieved from that row. A larger ID does not mean a larger meaning."
      }
    },
    "navTitle": {
      "ko": "토큰과 벡터",
      "en": "Tokens and vectors"
    }
  },
  {
    "id": "numbers",
    "title": {
      "ko": "숫자를 바꾸고 비교하기 — 행렬곱·내적",
      "en": "Transform and compare numbers: matrix products and dot products"
    },
    "group": "start",
    "status": "complete",
    "prerequisites": [
      "tokens"
    ],
    "goal": {
      "ko": "한 칸을 곱해서 더하고, 계산 전후의 행렬 모양을 예측합니다.",
      "en": "Compute one cell as products added together, and predict input and output shapes."
    },
    "check": {
      "question": {
        "ko": "2 × 4 입력과 4 × 2 계수를 곱하면 무엇이 몇 개 나올까요?",
        "en": "What does multiplying a 2 × 4 input by 4 × 2 coefficients produce?"
      },
      "answer": {
        "ko": "2 × 2 행렬입니다. 입력 두 행은 유지되고 각 행에 새 값 두 개가 생깁니다. 학교에의 행은 (0, 2)이며, 둘째 값은 0×0 + 1×1 + 0×0 + 1×1 = 2입니다.",
        "en": "A 2 × 2 matrix: two input rows remain, each with two new features. The went row is (0, 2); its second entry is 0×0 + 1×1 + 0×0 + 1×1 = 2."
      }
    },
    "navTitle": {
      "ko": "행렬곱과 내적",
      "en": "Matrix arithmetic"
    }
  },
  {
    "id": "proportion",
    "title": {
      "ko": "점수에서 정보의 비중으로 — softmax·가중합",
      "en": "Scores to information shares: softmax and weighted sums"
    },
    "group": "attention",
    "status": "complete",
    "prerequisites": [
      "numbers"
    ],
    "goal": {
      "ko": "음수도 있는 점수를 합이 1인 비중으로 바꾸고, 그 비중으로 값을 섞습니다.",
      "en": "Turn scores, including negative ones, into shares summing to one, then mix values with them."
    },
    "check": {
      "question": {
        "ko": "내용 (3, 0)과 (0, 3)을 약 94.4%와 5.6%로 모으면 무엇이 될까요?",
        "en": "What content results from mixing (3, 0) and (0, 3) with shares of about 94.4% and 5.6%?"
      },
      "answer": {
        "ko": "약 (2.833, 0.167)입니다. 각 좌표에 참고 비중을 곱해 더합니다. softmax의 비중은 주어진 자리에서 내용을 가져오는 몫입니다.",
        "en": "About (2.833, 0.167). Multiply and add matching coordinates using the reference shares. These softmax shares retrieve content from the given positions."
      }
    },
    "navTitle": {
      "ko": "점수와 비중",
      "en": "Scores and shares"
    }
  },
  {
    "id": "attention",
    "title": {
      "ko": "문맥을 섞는 self-attention — Q·K·V부터 출력까지",
      "en": "Mix context with self-attention: Q, K, V to output"
    },
    "group": "attention",
    "status": "complete",
    "prerequisites": [
      "numbers",
      "proportion"
    ],
    "goal": {
      "ko": "한 토큰이 점수와 비중을 만들고 value를 섞는 과정을 끝까지 추적합니다.",
      "en": "Trace one token through scores, weights and a mixture of values."
    },
    "check": {
      "question": {
        "ko": "2 × 2 attention 비중과 2 × 2 내용을 곱한 출력은 무엇을 나타낼까요?",
        "en": "What does multiplying 2 × 2 attention shares by 2 × 2 content values represent?"
      },
      "answer": {
        "ko": "토큰마다 두 자리의 내용을 모은 숫자 두 개, 즉 2 × 2 출력입니다. 학교에 자리의 첫 head 출력은 약 (2.833, 0.167)입니다.",
        "en": "A 2 × 2 output: two gathered features per token. The first-head output at went is about (2.833, 0.167)."
      }
    },
    "navTitle": {
      "ko": "Self-attention",
      "en": "Self-attention"
    }
  },
  {
    "id": "positions",
    "title": {
      "ko": "읽을 수 있는 범위 — causal mask와 위치 확장",
      "en": "Allowed context: causal masking and position extensions"
    },
    "group": "attention",
    "status": "complete",
    "prerequisites": [
      "attention"
    ],
    "goal": {
      "ko": "토큰의 순서를 알려 주는 장치와 미래 토큰을 숨기는 장치를 구분합니다.",
      "en": "Distinguish encoding order from hiding future tokens."
    },
    "check": {
      "question": {
        "ko": "위치 벡터를 넣었으니 학습 때 causal mask를 꺼도 될까요?",
        "en": "Does adding position vectors mean the causal mask can be disabled during training?"
      },
      "answer": {
        "ko": "안 됩니다. 위치는 어느 자리인지 알려 주고, mask는 볼 수 있는 정보를 제한합니다. 한 칸 민 입력에서 뒤 토큰에는 지금 맞혀야 할 정답이 들어 있으므로 가려야 합니다.",
        "en": "No. Position identifies the location; the mask restricts what can be read. A later token in shifted training input contains the current answer and must remain hidden."
      }
    },
    "navTitle": {
      "ko": "가리기와 위치 확장",
      "en": "Mask and position extension"
    }
  },
  {
    "id": "multi-head",
    "title": {
      "ko": "여러 관계를 보는 multi-head — 나누고 다시 합치기",
      "en": "Multi-head: different views, joined and mixed"
    },
    "group": "layer",
    "status": "complete",
    "prerequisites": [
      "attention"
    ],
    "goal": {
      "ko": "두 head의 결과를 옆으로 붙이고 W_O를 곱해 원래 feature 폭으로 돌립니다.",
      "en": "Concatenate two head outputs and multiply by W_O to return to the original feature width."
    },
    "check": {
      "question": {
        "ko": "2 × 2 결과 두 개를 합칠 때 왜 위아래로 쌓지 않을까요?",
        "en": "Why not stack two 2 × 2 head outputs vertically?"
      },
      "answer": {
        "ko": "토큰마다 한 행이라는 대응을 유지해야 합니다. 옆으로 붙여 2 × 4를 만들고 W_O로 feature를 섞습니다. head는 토큰이나 층의 개수가 아닙니다.",
        "en": "Each token must keep one row. Joining sideways gives 2 × 4; W_O mixes the features. Heads are not extra tokens or layers."
      }
    },
    "navTitle": {
      "ko": "Multi-head",
      "en": "Multi-head"
    }
  },
  {
    "id": "blocks",
    "title": {
      "ko": "한 층 완성하기 — FFN·residual·layer norm",
      "en": "Complete a block: FFN, residual and layer norm"
    },
    "group": "layer",
    "status": "complete",
    "prerequisites": [
      "numbers",
      "multi-head"
    ],
    "goal": {
      "ko": "토큰 사이의 섞기와 토큰 안의 변환을 구분하고, 한 층의 입력이 출력까지 이어지는 것을 확인합니다.",
      "en": "Distinguish mixing between tokens from transforming features within a token, and follow a block end to end."
    },
    "check": {
      "question": {
        "ko": "FFN의 가중치는 토큰마다 따로일까요? 정규화는 무엇을 평균낼까요?",
        "en": "Does each token have separate FFN weights? What does layer norm average?"
      },
      "answer": {
        "ko": "같은 층의 FFN 가중치는 모든 토큰이 공유하지만 토큰별 계산은 따로입니다. layer norm은 한 토큰의 feature들을 평균내며 문장 전체 토큰을 평균내지 않습니다.",
        "en": "Tokens share the FFN weights within a layer but are processed separately. Layer norm averages features of one token, not all tokens in the sentence."
      }
    },
    "navTitle": {
      "ko": "한 층의 부품",
      "en": "Block components"
    }
  },
  {
    "id": "big-picture",
    "title": {
      "ko": "전체 Transformer 다시 보기 — 한 층에서 토큰 확률까지",
      "en": "Revisit the Transformer: one block to token probabilities"
    },
    "group": "layer",
    "status": "complete",
    "prerequisites": [
      "positions",
      "blocks"
    ],
    "goal": {
      "ko": "앞에서 구한 마지막 표현을 같은 어휘 출력 계수에 넣어 다음 후보 확률로 바꿉니다.",
      "en": "Pass the final representation through the same vocabulary readout to compute next-candidate probabilities."
    },
    "check": {
      "question": {
        "ko": "마지막 벡터의 길이와 다음 토큰 확률의 개수는 항상 같을까요?",
        "en": "Must hidden-vector width equal the number of next-token probabilities?"
      },
      "answer": {
        "ko": "아닙니다. 마지막 변환은 d_model × 어휘 크기입니다. 이 작은 종합 예제는 둘 다 4로 잡았지만 실제 모델의 feature 폭과 어휘 크기는 보통 다릅니다.",
        "en": "No. The readout is d_model × vocabulary size. Both are 4 in this toy example, but a real model usually has different feature and vocabulary widths."
      }
    },
    "navTitle": {
      "ko": "전체 계산 경로",
      "en": "Whole computation"
    }
  },
  {
    "id": "generation",
    "title": {
      "ko": "실제로 생성하기 — 선택 규칙·생성 고리·종료",
      "en": "Actually generate: choice rules, the loop and stopping"
    },
    "group": "use",
    "status": "complete",
    "prerequisites": [
      "big-picture"
    ],
    "goal": {
      "ko": "같은 토큰 확률에서 greedy와 sampling이 어떻게 고르는지 비교하고 생성의 종료 조건을 설명합니다.",
      "en": "Compare greedy and sampling on the same distribution, and explain how generation stops."
    },
    "check": {
      "question": {
        "ko": "가중치를 고정했는데도 같은 문맥에서 다른 토큰을 고를 수 있을까요?",
        "en": "Can fixed weights choose different tokens from the same context?"
      },
      "answer": {
        "ko": "sampling이면 가능합니다. 가중치는 확률을 만들고 선택 규칙은 그 확률에서 토큰을 고릅니다. greedy와 같은 결정적 규칙에서만 같은 조건의 선택이 같습니다.",
        "en": "Yes, with sampling. Weights produce the probabilities; a selection rule chooses a token from them. A deterministic rule such as greedy repeats a choice only under the same conditions."
      }
    },
    "navTitle": {
      "ko": "생성하는 방법",
      "en": "Token generation"
    }
  },
  {
    "id": "training",
    "title": {
      "ko": "실제로 배우기 — 정답·손실·기울기·갱신",
      "en": "Actually learn: targets, loss, gradients and updates"
    },
    "group": "use",
    "status": "complete",
    "prerequisites": [
      "generation",
      "proportion"
    ],
    "goal": {
      "ko": "두 입력의 예측을 별도 정답 라벨과 비교하고, 같은 네 후보의 손실을 줄이도록 출력 계수 하나를 고칩니다.",
      "en": "Compare the two-input prediction with a separate target and update one readout coefficient to reduce the four-candidate loss."
    },
    "check": {
      "question": {
        "ko": "정답 갔다를 입력에 붙인 뒤 확률을 계산해야 할까요?",
        "en": "Should the target to school be appended before computing its prediction probability?"
      },
      "answer": {
        "ko": "아닙니다. 입력은 나는 / 학교에이고 정답은 별도의 라벨입니다. 현재 정답 확률 약 71.8%를 손실로 바꾸고, 기울기의 반대 방향으로 출력 계수를 고칩니다.",
        "en": "No. The input is I / went and the target is a separate label. Use its current probability, about 71.8%, to compute loss, then update a readout coefficient opposite to its gradient."
      }
    },
    "navTitle": {
      "ko": "손실과 학습 갱신",
      "en": "Loss and updates"
    }
  },
  {
    "id": "results",
    "title": {
      "ko": "결과를 해석하기 — 평가 조건·비용·한계",
      "en": "Interpret results: evaluation conditions, cost and limits"
    },
    "group": "use",
    "status": "complete",
    "prerequisites": [
      "training",
      "generation"
    ],
    "goal": {
      "ko": "같은 조건의 결과만 비교하고 계산값·실험 관찰·원인 추정을 구분합니다.",
      "en": "Compare results under matched conditions, and distinguish computation, observation and causal explanation."
    },
    "check": {
      "question": {
        "ko": "개발 데이터 BLEU 25.8과 평가 데이터 BLEU 27.3만 보고 모델이 좋아졌다고 할 수 있을까요?",
        "en": "Do BLEU 25.8 on development data and 27.3 on test data show that a model improved?"
      },
      "answer": {
        "ko": "아닙니다. 잰 데이터가 다릅니다. 같은 평가 조건에서 비교해야 합니다. head 수에 따른 점수 차이도 그 논문의 실험 조건에서 관찰한 결과이지 모든 모델에 대한 보장은 아닙니다.",
        "en": "No: the datasets differ. Compare under the same evaluation conditions. Head-count results are observations from this paper’s setup, not guarantees for every model."
      }
    },
    "navTitle": {
      "ko": "평가와 한계",
      "en": "Evaluation and limits"
    }
  }
];
export function sectionById(id: string): SectionItem | undefined { return SECTIONS.find(s => s.id === id); }
export function groupById(id: string): SectionGroup | undefined { return GROUPS.find(g => g.id === id); }

/**
 * The companion documents. Their sections reuse the main article's ids, so a unit's
 * experiments and its paper background share one anchor name across the three pages.
 */
export interface PageSection {
  id: string;
  title: Record<Locale, string>;
  navTitle: Record<Locale, string>;
}
export const LAB_SECTIONS: PageSection[] = [
  { id: 'tokens', title: { ko: '토큰·ID·embedding 조회', en: 'Tokens, IDs and embedding lookup' }, navTitle: { ko: '토큰과 벡터', en: 'Tokens and vectors' } },
  { id: 'numbers', title: { ko: '행렬곱과 내적 직접 바꿔 보기', en: 'Change matrix products and dot products' }, navTitle: { ko: '행렬곱과 내적', en: 'Matrix arithmetic' } },
  { id: 'proportion', title: { ko: 'softmax와 가중합 직접 바꿔 보기', en: 'Change softmax and weighted sums' }, navTitle: { ko: '점수와 비중', en: 'Scores and shares' } },
  { id: 'attention', title: { ko: '세 토큰 전체 attention 계산', en: 'Full three-token attention' }, navTitle: { ko: 'Self-attention', en: 'Self-attention' } },
  { id: 'positions', title: { ko: '가리기를 켜고 끄기', en: 'Switch the mask on and off' }, navTitle: { ko: '가리기', en: 'Mask' } },
  { id: 'multi-head', title: { ko: '두 head와 출력 계수 W_O', en: 'Two heads and the output coefficients W_O' }, navTitle: { ko: 'Multi-head', en: 'Multi-head' } },
  { id: 'blocks', title: { ko: 'FFN·잔차·정규화 직접 바꿔 보기', en: 'Change the FFN, residual and normalization' }, navTitle: { ko: '한 층의 부품', en: 'Block components' } },
  { id: 'big-picture', title: { ko: '설정을 바꾸는 한 층', en: 'One block with changeable settings' }, navTitle: { ko: '한 층 전체', en: 'Whole block' } },
  { id: 'generation', title: { ko: 'greedy·sampling·beam search', en: 'Greedy, sampling and beam search' }, navTitle: { ko: '생성 규칙', en: 'Generation rules' } },
  { id: 'training', title: { ko: '손실과 두 후보 학습', en: 'Loss and two-candidate learning' }, navTitle: { ko: '손실과 갱신', en: 'Loss and updates' } },
];
export const PAPER_SECTIONS: PageSection[] = [
  { id: 'attention', title: { ko: '왜 attention인가 — 순서대로 읽기의 두 문제', en: 'Why attention: two problems with reading in order' }, navTitle: { ko: '왜 attention인가', en: 'Why attention' } },
  { id: 'positions', title: { ko: 'sin·cos으로 위치 알려 주기', en: 'Positions from sine and cosine' }, navTitle: { ko: 'sin·cos 위치', en: 'Sinusoidal positions' } },
  { id: 'multi-head', title: { ko: 'head 여덟 개와 같은 계산량', en: 'Eight heads at the same cost' }, navTitle: { ko: 'head와 계산량', en: 'Heads and cost' } },
  { id: 'big-picture', title: { ko: '번역기 전체 구조 — encoder와 decoder', en: 'The translator: encoder and decoder' }, navTitle: { ko: '번역기 구조', en: 'Translator' } },
  { id: 'generation', title: { ko: '번역기의 학습과 생성', en: 'Training and generation in the translator' }, navTitle: { ko: '학습과 생성', en: 'Training and generation' } },
  { id: 'training', title: { ko: '논문의 학습 설정', en: 'The paper’s training setup' }, navTitle: { ko: '학습 설정', en: 'Training setup' } },
  { id: 'results', title: { ko: '결과와 한계 — BLEU·비용·ablation', en: 'Results and limits: BLEU, cost and ablations' }, navTitle: { ko: '결과와 한계', en: 'Results and limits' } },
];
export const DOC_SECTIONS: Record<string, PageSection[]> = { lab: LAB_SECTIONS, paper: PAPER_SECTIONS };
export function docSectionById(docId: string, id: string): PageSection | undefined { return DOC_SECTIONS[docId]?.find(s => s.id === id); }
