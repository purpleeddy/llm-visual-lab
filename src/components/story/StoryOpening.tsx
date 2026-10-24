import { useMemo, useState } from 'react';
import type { Locale } from '../../lib/i18n/routing';
import { STORY_ID, STORY_VOCAB, storyRun } from '../../lib/math/story';
import { fmtPercent } from '../../lib/math/format';
import '../../styles/story.css';

/**
 * The opening game: the machine's probabilities for the word after “어제/내일 학교에”.
 * Switching the first word flips the favourite; appending recomputes; the end marker stops.
 */
export function StoryOpening({ locale }: { locale: Locale }) {
  const ko = locale === 'ko';
  const words = STORY_VOCAB[locale];
  const [ids, setIds] = useState<number[]>([STORY_ID.past, STORY_ID.middle]);
  const [finished, setFinished] = useState(false);
  const [status, setStatus] = useState(ko ? '빈칸에 올 단어의 확률입니다.' : 'Probabilities for the word in the blank.');
  const run = useMemo(() => storyRun(ids), [ids]);
  const probabilities = run.probabilities[run.last];
  const top = run.nextId;
  const percent = (id: number) => fmtPercent(probabilities[id], 1);

  const start = (first: number) => {
    setIds([first, STORY_ID.middle]);
    setFinished(false);
    const fresh = storyRun([first, STORY_ID.middle]);
    const share = fmtPercent(fresh.probabilities[fresh.last][fresh.nextId], 1);
    setStatus(ko ? `첫 단어가 ‘${words[first]}’인 문장으로 다시 계산했습니다. 1위: ${words[fresh.nextId]} ${share}` : `Recomputed with “${words[first]}” first. Favourite: ${words[fresh.nextId]} ${share}`);
  };
  const advance = () => {
    if (top === STORY_ID.end) {
      setFinished(true);
      setStatus(ko ? `끝 표시가 ${percent(top)}로 가장 커서 멈췄습니다.` : `The end marker is largest at ${percent(top)}, so the machine stopped.`);
      return;
    }
    const next = [...ids, top];
    setIds(next);
    const again = storyRun(next);
    const share = fmtPercent(again.probabilities[again.last][again.nextId], 1);
    setStatus(ko ? `‘${words[top]}’ 단어를 붙이고 늘어난 입력으로 다시 계산했습니다. 1위: ${words[again.nextId]} ${share}` : `Appended “${words[top]}” and recomputed with the longer input. Favourite: ${words[again.nextId]} ${share}`);
  };

  return <section className="story story-game lab--story-opening" aria-label={ko ? '다음 단어 맞히기' : 'Guess the next word'}
    data-story-ids={ids.join(',')} data-finished={String(finished)}>
    <div className="segmented" role="group" aria-label={ko ? '첫 단어' : 'First word'}>
      {[STORY_ID.past, STORY_ID.future].map(id => <button type="button" key={id} aria-pressed={ids[0] === id} onClick={() => start(id)}>{words[id]}</button>)}
    </div>
    <p className="story-game__sentence" data-story-sentence>
      {ids.map((id, i) => <span key={i} className="story-game__word" data-word={id} data-new={String(i >= 2 && i === ids.length - 1)}>{words[id]}</span>)}
      {finished ? null : <span className="story-game__blank" aria-label={ko ? '빈칸' : 'blank'}>?</span>}
    </p>
    {finished ? null : <ul className="story-bars" aria-label={ko ? '빈칸에 올 단어의 확률' : 'Probabilities for the blank'}>
      {probabilities.map((p, i) => <li key={i} data-top={String(i === top)} data-word={i}>
        <span>{words[i]}</span>
        <span className="story-bars__value" data-story-probability>{fmtPercent(p, 1)}</span>
        <span className="story-bars__track" aria-hidden="true"><span className="story-bars__fill" style={{ width: `${(p * 100).toFixed(2)}%` }} /></span>
      </li>)}
    </ul>}
    <div className="story-game__controls">
      {finished
        ? <button type="button" className="btn" data-story-restart onClick={() => start(ids[0])}>{ko ? '처음부터' : 'Start again'}</button>
        : <button type="button" className="btn" data-story-advance onClick={advance}>{top === STORY_ID.end ? (ko ? '끝에서 멈추기' : 'Stop at the end marker') : (ko ? `${words[top]} 붙이기` : `Append “${words[top]}”`)}</button>}
    </div>
    <p className="story-game__status" role="status" aria-live="polite" aria-atomic="true">{status}</p>
  </section>;
}
