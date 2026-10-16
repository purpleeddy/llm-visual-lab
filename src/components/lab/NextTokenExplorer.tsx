import { Fragment, useMemo, useState } from 'react';
import { END, greedy } from '../../lib/math/generation';
import { NEXT_TOKEN_SENTENCE_MODELS } from '../../lib/math/examples';
import { fmt } from '../../lib/math/format';
import type { Locale } from '../../lib/i18n/routing';

/** One whole prediction is visible immediately; the only action advances its input. */
export function NextTokenExplorer({ locale, initialRound = 0 }: { locale: Locale; initialRound?: number }) {
  const ko = locale === 'ko';
  const model = NEXT_TOKEN_SENTENCE_MODELS[locale];
  const run = useMemo(() => greedy(model), [model]);
  const openingRound = Math.min(run.steps.length - 1, Math.max(0, Math.trunc(initialRound)));
  const [round, setRound] = useState(openingRound);
  const [interacted, setInteracted] = useState(false);
  const step = run.steps[round];
  const before = step.before[0].tokens;
  const after = step.kept[0].tokens;
  const chosen = after.at(-1)!;
  const done = chosen === END;
  const start = ko ? '시작' : 'start';
  const input = before.join(' ') || start;
  const nextInput = after.join(' ');
  const distribution = model[before.join(' ')];
  const tokenName = (token: string) => token === END ? (ko ? '끝 표시 .' : 'end marker .') : token;
  const probability = distribution[chosen];
  const narration = done
    ? (ko ? `“${input}” 뒤에서는 끝 표시 .의 예시 확률이 가장 큽니다. 이 토큰을 붙였으므로 여기서 글쓰기를 마칩니다.` : `After “${input}”, the end marker . has the largest example probability. Appending this token ends the sequence.`)
    : (ko ? `이 입력에서는 “${tokenName(chosen)}”의 예시 확률 ${Math.round(probability * 100)}%가 가장 큽니다. 이 조각을 뒤에 붙인 결과가 오른쪽의 “${nextInput}”입니다. 다음 계산에는 오른쪽 글 전체를 넣습니다.` : `After “${input}”, “${tokenName(chosen)}” is the largest candidate at ${Math.round(probability * 100)}%. This example appends that one chunk to make “${nextInput}”. The next calculation uses the whole text on the right.`);

  return <section id="manual-table-generation" className="lab lab--next-token" aria-label={ko ? '다음 토큰을 하나씩 붙이기' : 'Append one token at a time'} data-round={after.length} data-stage={done ? 'finished' : 'generated'} data-interacted={interacted}>
    <header className="lab__header"><div>
      <h3 className="lab__title">{ko ? '보충: 정한 확률표로 하나씩 붙이기' : 'Supplement: append using chosen probability tables'}</h3>
      <p className="lab__kind">{ko ? '읽기 쉽게 정한 조각 · 설명용 확률' : 'Illustrative chunks and probabilities'}</p>
    </div></header>

    <div className="next-token__story">
      <div className="next-token__context">
        <strong className="next-token__context-title">{ko ? '이번에 넣은 입력' : 'Input for this prediction'}</strong>
        <div className="next-token__input"><span className="next-token__start">{start}</span>{before.map((token, i) => <Fragment key={i}>{' '}<code className="next-token__token">{token}</code></Fragment>)}</div>

      </div>
      <span className="next-token__arrow" aria-hidden="true">→</span>
      <div className="next-token__after">
        <strong>{ko ? '한 조각을 붙인 결과' : 'After appending one chunk'}</strong>
        <div className="next-token__prefix">{after.map((token, i) => <Fragment key={i}>{i ? ' ' : ''}<code className={`next-token__output-token${i === after.length - 1 ? ' next-token__token--new' : ''}`} aria-label={token === END ? (ko ? '끝 표시' : 'end marker') : undefined}>{token}</code></Fragment>)}</div>
      </div>
    </div>

    <div className="next-token__candidates">
      <p className="next-token__table-title">{ko ? '현재 확률을 구할 때 쓴 입력' : 'Input for the current probabilities'}: <strong data-probability-context>{input}</strong></p>
      <div className="terms__tablewrap"><table className="terms__table">
        <thead><tr><th scope="col">{ko ? '이 입력의 후보(예시)' : 'Candidates for this input (examples)'}</th><th scope="col">{ko ? '현재 입력의 확률' : 'Current probabilities'}</th><th scope="col">{ko ? '비중' : 'Share'}</th></tr></thead>
        <tbody>{Object.entries(distribution).map(([token, p]) => {
          return <tr key={token} className={token === chosen ? 'is-active' : undefined} data-selected={token === chosen}>
            <th scope="row">{tokenName(token)}</th>
            <td><strong className="next-token__percent">{Math.round(p * 100)}%</strong> <span className="next-token__probability">({fmt(p, 3)})</span></td>
            <td><div className="probability-bar" style={{ width: `${p * 100}%`, minWidth: p === 0 ? 0 : undefined }} aria-hidden="true" /></td>
          </tr>;
        })}</tbody>
      </table></div>
    </div>
    <p className="next-token__narration" role="status" aria-live="polite" aria-atomic="true">{narration}</p>
    <div className="next-token__controls">
      <button className="btn next-token__advance" onClick={() => { setInteracted(true); setRound(current => current === run.steps.length - 1 ? 0 : current + 1); }}>{done ? (ko ? '처음부터 다시 보기' : 'Replay from the start') : (ko ? '이 새 입력으로 다음 조각 보기' : 'See the next chunk for this input')}</button>
    </div>
    <p className="lab__note">{ko ? '문맥에 맞는 단어·구 조각을 한 토큰으로 정한 학습용 예시입니다. 표는 실제 모델의 전체 어휘가 아닌 작은 설명용 후보 목록입니다. 단어 하나가 항상 토큰 하나인 것은 아닙니다. 확률도 원리를 보여 주려고 정한 값이며 실제 모델이나 토크나이저의 출력은 아닙니다.' : 'These context-appropriate word and phrase chunks are educational tokens. Each table is a small illustrative candidate list, rather than a real model’s full vocabulary. One word is not always one token. The probabilities are chosen to show the mechanism; they are not model or tokenizer outputs.'}</p>
    <p className="lab__hint">{done ? (ko ? '만든 문장: ' : 'Generated sequence: ') + nextInput : (ko ? '이 예에서는 가장 큰 확률의 후보를 고릅니다. 실제 생성에는 확률에 따라 뽑는 규칙도 있습니다. 선택한 하나를 붙인 뒤 새 문맥으로 다시 계산하는 고리는 같습니다.' : 'This example chooses the highest probability. Generation can also sample from the distribution. Either rule appends one token, then predicts from the new context.')}</p>
    {done && <details className="expand next-token__details"><summary>{ko ? '이 경로의 전체 확률은 어떻게 계산하나요?' : 'How is the probability of this whole path calculated?'}</summary><div className="expand__body"><p className="next-token__path-probability">{ko ? '시작부터 고른 네 확률을 곱하면' : 'Multiplying the four chosen probabilities from the start gives'} 0.6 × 0.6 × 0.7 × 1 = {fmt(run.best.probability, 3)}.</p><p>{ko ? '이 문장이 사실일 확률이나 답이 맞을 확률은 아닙니다. 이 표의 조건별 확률은 선택 규칙을 연습하기 위해 정한 값입니다.' : 'This is not the probability that the sentence is factual or correct. These conditional probabilities are fixed values for practicing selection rules.'}</p></div></details>}
  </section>;
}
