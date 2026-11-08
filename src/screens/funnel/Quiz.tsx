import { useState } from 'react';
import { AssessmentRunner, type AssessmentPhase } from '../../app/AssessmentRunner';
import { navigate, PATHS } from '../../app/router';
import { useT } from '../../i18n/useT';
import { useStore } from '../../state/store';
import type { GameResult } from '../../state/types';
import { Screen } from '../../ui/Screen';
import s from './funnel.module.css';

/** 60-second baseline assessment on form A. */
export function Quiz() {
  const t = useT();
  const { dispatch } = useStore();
  const [phase, setPhase] = useState<AssessmentPhase>('intro');

  const onComplete = (results: GameResult[]) => {
    dispatch({ type: 'assessmentDone', kind: 'baseline', results });
    dispatch({ type: 'setStage', stage: 'teaser' });
    navigate(PATHS.teaser, { replace: true });
  };

  return (
    <Screen juryKey="quiz" className={s.root} hideJury={phase === 'play'}>
      <div className={s.quizHead}>
        <h2>{t('funnel.quiz.title')}</h2>
        <span className="muted small">{t('funnel.quiz.sub')}</span>
      </div>
      <AssessmentRunner form="A" onComplete={onComplete} onPhaseChange={setPhase} />
    </Screen>
  );
}
