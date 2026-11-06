import { useEffect, type ComponentType } from 'react';
import { useStore } from '../state/store';
import { Landing, Quiz, ResultTeaser, Paywall, Onboarding } from '../screens/funnel';
import { TodayPlan, IndexStreak, LineMock, Retest, WeeklyReport, Profile } from '../screens/progress';
import { Play } from './Play';
import { Shell } from './Shell';
import { navigate, PATHS, useRoute } from './router';

const ROUTES: Record<string, { component: ComponentType; needs?: 'baseline' }> = {
  '': { component: Landing },
  quiz: { component: Quiz },
  teaser: { component: ResultTeaser, needs: 'baseline' },
  paywall: { component: Paywall, needs: 'baseline' },
  onboarding: { component: Onboarding, needs: 'baseline' },
  today: { component: TodayPlan, needs: 'baseline' },
  play: { component: Play, needs: 'baseline' },
  index: { component: IndexStreak, needs: 'baseline' },
  line: { component: LineMock, needs: 'baseline' },
  retest: { component: Retest, needs: 'baseline' },
  report: { component: WeeklyReport, needs: 'baseline' },
  profile: { component: Profile, needs: 'baseline' },
};

export function App() {
  const route = useRoute();
  const { state } = useStore();
  const def = ROUTES[route.segments[0] ?? ''];
  const blocked = !def || (def.needs === 'baseline' && !state.baseline);

  useEffect(() => {
    if (!blocked) return;
    // Route changes are sync-priority (useSyncExternalStore) while reducer updates dispatched in the same
    // handler may land one render later — wait a tick so e.g. Quiz → Teaser isn't bounced before the
    // baseline commits. If the state catches up, the cleanup cancels the redirect.
    const id = window.setTimeout(() => {
      // Returning user with a finished funnel lands on Today; everyone else on Landing.
      navigate(state.baseline && state.stage === 'home' ? PATHS.today : PATHS.landing, { replace: true });
    }, 60);
    return () => window.clearTimeout(id);
  }, [blocked, state.baseline, state.stage]);

  if (blocked) return null;
  const Screen = def.component;
  return (
    <Shell>
      <Screen key={route.path} />
    </Shell>
  );
}
