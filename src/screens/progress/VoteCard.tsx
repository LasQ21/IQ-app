import { useState } from 'react';
import { useT } from '../../i18n/useT';
import { liveVote } from '../../live/client';
import { useLiveRecord } from '../../live/useLiveReporter';
import { VOTES } from '../../live/schema';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import s from './progress.module.css';

/** One-tap "would you come back tomorrow?" for the live jury dashboard (anonymous, part of the live record). */
export function VoteCard() {
  const t = useT();
  const rec = useLiveRecord();
  const [editing, setEditing] = useState(false);
  const answered = rec.vote !== undefined && !editing;

  return (
    <Card data-testid="today-vote" data-vote={rec.vote}>
      <fieldset className={s.vote}>
        <legend className={s.voteTitle}>{t('progress.today.vote.title')}</legend>
        {answered ? (
          <div className={s.voteDone}>
            <p className="small muted" role="status">
              <b>{t(`progress.today.vote.${rec.vote}`)}</b> · {t('progress.today.vote.thanks')}
            </p>
            <Button variant="ghost" onClick={() => setEditing(true)} data-testid="vote-change">
              {t('progress.today.vote.change')}
            </Button>
          </div>
        ) : (
          <div className={s.voteRow}>
            {VOTES.map((v) => (
              <Button
                key={v}
                variant={rec.vote === v ? 'primary' : 'secondary'}
                aria-pressed={rec.vote === v}
                data-testid={`vote-${v}`}
                onClick={() => {
                  liveVote(v);
                  setEditing(false);
                }}
              >
                {t(`progress.today.vote.${v}`)}
              </Button>
            ))}
          </div>
        )}
      </fieldset>
    </Card>
  );
}
