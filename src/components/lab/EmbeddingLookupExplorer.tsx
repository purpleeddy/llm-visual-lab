import { useState } from 'react';
import { MatrixGrid } from './MatrixGrid';
import { DEFAULT_X, LEARNING_EXAMPLE } from '../../lib/math/examples';
import type { Locale } from '../../lib/i18n/routing';

/** The three worked-example vectors as an explicit ID lookup table. */
export function EmbeddingLookupExplorer({ locale }: { locale: Locale }) {
  const ko = locale === 'ko'; const [id, setId] = useState(0); const tokens = LEARNING_EXAMPLE[locale].tokens;
  return <section className="lab lab--embedding-lookup" aria-label={ko ? '토큰 번호로 벡터 찾기' : 'Look up a vector by token ID'}>
    <header className="lab__header"><div><h3 className="lab__title">{ko ? '토큰 번호로 벡터 찾기' : 'Look up a vector by token ID'}</h3><p className="lab__kind">{ko ? '예시 값으로 만든 표 · 번호로 행 찾기' : 'Illustrative values · row lookup by ID'}</p></div></header>
    <p className="lab__note">{ko ? `공통 문장의 ${tokens.join(' / ')}에 ID 0, 1, 2를 붙였습니다. E는 이 세 조각의 벡터만 보여 주는 예시 표입니다. 조각을 고르면 그 번호의 행에서 값 네 개를 꺼냅니다. 번호는 주소이며, 큰 번호가 더 중요한 뜻을 나타내지는 않습니다.` : `The shared sentence uses ${tokens.join(' / ')}, with IDs 0, 1 and 2. E shows just these three illustrative embedding rows. Choose a chunk to retrieve its four values. An ID is an address; a larger ID does not imply a more important meaning.`}</p>
    <div className="segmented" role="group" aria-label={ko ? '조회할 토큰' : 'Token to look up'}>{tokens.map((token, i) => <button key={token} aria-pressed={id === i} onClick={() => setId(i)}>{token} · ID {i}</button>)}</div>
    <div className="mini-flow" aria-live="polite"><div><strong>{ko ? '토큰' : 'Token'}</strong><p>{tokens[id]}</p></div><span aria-hidden="true">→</span><div><strong>ID</strong><p>{id}</p></div><span aria-hidden="true">→</span><div><strong>{ko ? '벡터 네 값' : 'Four-feature vector'}</strong><p className="embedding-lookup__vector">({DEFAULT_X[id].join(', ')})</p></div></div>
    <MatrixGrid matrix={DEFAULT_X} name="E" shape="3 × 4" rowLabels={tokens.map((token, i) => `ID ${i} · ${token}`)} highlightRow={id} tone="input" compact />
    <p className="lab__hint">{ko ? `마지막 조각 “${tokens[2]}”를 고르기 전에 ID 2의 행을 찾아보세요. 세 행을 문장 순서대로 쌓으면 다음 단원의 입력 X가 됩니다. 이 값은 이해를 돕기 위해 정했으며, 실제 모델이 학습한 벡터는 아닙니다.` : `Find ID 2 before choosing the final chunk, ${tokens[2]}. Stack the three rows in sentence order to obtain input X for the next unit. These values illustrate the calculation; they are not trained embeddings.`}</p>
  </section>;
}
