import { useState } from 'react';
import { MatrixGrid } from './MatrixGrid';
import { DEFAULT_X } from '../../lib/math/examples';
import type { Locale } from '../../lib/i18n/routing';

/** The three worked-example vectors as an explicit ID lookup table. */
export function EmbeddingLookupExplorer({ locale }: { locale: Locale }) {
  const ko = locale === 'ko'; const [id, setId] = useState(0); const tokens = ['a', 'b', 'c'];
  return <section className="lab lab--embedding-lookup" aria-label={ko ? '토큰 번호로 벡터 찾기' : 'Look up a vector by token ID'}>
    <header className="lab__header"><div><h3 className="lab__title">{ko ? '토큰 번호로 벡터 찾기' : 'Look up a vector by token ID'}</h3><p className="lab__kind">{ko ? '손으로 정한 표 · 실제 행 조회' : 'Hand-chosen table · actual row lookup'}</p></div></header>
    <p className="lab__note">{ko ? 'a, b, c에 ID 0, 1, 2를 붙인 작은 표입니다. 토큰을 고르면 같은 번호의 행에서 값 네 개를 꺼냅니다. 번호 자체를 곱하거나 큰 번호를 더 큰 의미로 취급하지 않습니다.' : 'A tiny table assigning IDs 0, 1 and 2 to a, b and c. Choosing a token retrieves four features from its ID row. The ID itself is not multiplied and a larger ID does not imply a larger meaning.'}</p>
    <div className="segmented" role="group" aria-label={ko ? '조회할 토큰' : 'Token to look up'}>{tokens.map((token, i) => <button key={token} aria-pressed={id === i} onClick={() => setId(i)}>{token} · ID {i}</button>)}</div>
    <div className="mini-flow" aria-live="polite"><div><strong>{ko ? '토큰' : 'Token'}</strong><p>{tokens[id]}</p></div><span aria-hidden="true">→</span><div><strong>ID</strong><p>{id}</p></div><span aria-hidden="true">→</span><div><strong>{ko ? '벡터 네 값' : 'Four-feature vector'}</strong><p className="embedding-lookup__vector">({DEFAULT_X[id].join(', ')})</p></div></div>
    <MatrixGrid matrix={DEFAULT_X} name="E" shape="3 × 4" rowLabels={['ID 0', 'ID 1', 'ID 2']} highlightRow={id} tone="input" compact />
    <p className="lab__hint">{ko ? 'c를 고르기 전에 나올 행을 찾아보세요. 이 예제의 세 ID를 순서대로 조회해 쌓으면 다음 단원에서 곱하는 입력 X입니다. 이 값들에는 실제 단어 의미가 학습되지 않았습니다.' : 'Find the row before choosing c. Looking up these three IDs in order and stacking their vectors produces input X for the next unit. These values do not contain learned word meanings.'}</p>
  </section>;
}
