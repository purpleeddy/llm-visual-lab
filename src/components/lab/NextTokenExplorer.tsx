import { useMemo, useState } from 'react';
import { greedy } from '../../lib/math/generation';
import { TOY_MODEL } from '../../lib/math/examples';
import { fmt } from '../../lib/math/format';
import type { Locale } from '../../lib/i18n/routing';

/** A prefix lookup and an actual greedy trace, with no claim that the table is learned. */
export function NextTokenExplorer({ locale }: { locale: Locale }) {
  const ko = locale === 'ko';
  const run = useMemo(() => greedy(TOY_MODEL), []);
  const [round, setRound] = useState(0);
  const done = round === run.steps.length;
  const step = run.steps[Math.min(round, run.steps.length - 1)];
  const prefix = done ? run.best.tokens : step.before[0].tokens;
  const distribution = done ? [] : Object.entries(TOY_MODEL[prefix.join(' ')]);
  const lastChosen = round > 0 ? run.steps[round - 1].kept[0].tokens.at(-1) : null;
  return <section className="lab lab--next-token" aria-label={ko ? '다음 토큰을 하나씩 붙이기' : 'Append one token at a time'} data-round={round}>
    <header className="lab__header"><div><h3 className="lab__title">{ko ? '다음 토큰을 하나씩 붙이기' : 'Append one token at a time'}</h3><p className="lab__kind">{ko ? '손으로 정한 확률 · 실제 선택 계산' : 'Hand-written probabilities · computed choices'}</p></div><button className="btn" onClick={() => setRound(0)}>{ko ? '처음으로' : 'Reset'}</button></header>
    <p className="lab__note">{ko ? 'a, b, c와 끝 표시 .만 있는 작은 어휘입니다. 확률표는 사람이 정했고, 다음 토큰 선택과 전체 확률은 코드가 계산합니다. 새 문맥이 생기면 다음 확률표도 달라집니다.' : 'A tiny vocabulary: a, b, c and the end marker. The probability tables are hand-written; token choices and sequence probabilities are computed. A new prefix uses a different table.'}</p>
    <div className="mini-flow" aria-live="polite"><div><strong>{ko ? '지금까지의 문맥' : 'Context so far'}</strong><p className="next-token__prefix">{ko ? '시작' : 'start'} {prefix.join(' ')}</p></div><span aria-hidden="true">→</span><div><strong>{ko ? '다음 토큰의 확률' : 'Next-token probabilities'}</strong><p>{done ? (ko ? '끝 표시를 골랐으므로 멈춥니다.' : 'The end marker stops generation.') : (ko ? '아래 표에서 합이 1인 후보들을 봅니다.' : 'The candidates below sum to one.')}</p></div><span aria-hidden="true">→</span><div><strong>{ko ? '골라서 입력 뒤에 붙이기' : 'Choose and append'}</strong><p className="next-token__chosen">{lastChosen ? `${ko ? '방금 붙인 것' : 'Last appended'}: ${lastChosen}` : (ko ? '먼저 무엇이 붙을지 예측하세요.' : 'Predict the next choice first.')}</p></div></div>
    {!done && <div className="terms__tablewrap"><table className="terms__table"><thead><tr><th scope="col">{ko ? '후보' : 'Candidate'}</th><th scope="col">{ko ? '확률' : 'Probability'}</th><th scope="col">{ko ? '비중' : 'Share'}</th></tr></thead><tbody>{distribution.map(([token, p]) => <tr key={token}><th scope="row">{token}</th><td>{fmt(p, 3)}</td><td><div className="probability-bar" style={{ width: `${p * 100}%` }} aria-hidden="true" /></td></tr>)}</tbody></table></div>}
    <button className="btn" onClick={() => setRound(r => Math.min(run.steps.length, r + 1))} disabled={done}>{ko ? '가장 큰 확률의 토큰 붙이기' : 'Append the most likely token'}</button>
    <p className="lab__hint">{done ? `${ko ? '만든 토큰열' : 'Generated sequence'}: ${run.best.tokens.join(' ')} · ${ko ? '전체 확률' : 'Sequence probability'} ${fmt(run.best.probability, 3)}` : (ko ? '붙이기 전후의 표를 비교하세요. 가중치를 새로 배우는 것이 아니라, 문맥을 바꾸어 다음 선택을 계산하는 과정입니다.' : 'Compare the table before and after appending. This changes the context used for a prediction; it does not retrain weights.')}</p>
  </section>;
}
