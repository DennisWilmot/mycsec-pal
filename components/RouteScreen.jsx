'use client';

import { useRouter } from 'next/navigation';

const routes = {
  landing: '/',
  onboarding: '/onboarding',
  practice: '/practice',
  briefing1: '/practice/mathematics/paper-1/briefing',
  briefing2: '/practice/mathematics/paper-2/briefing',
  paper1: '/practice/mathematics/paper-1',
  paper2: '/practice/mathematics/paper-2',
  results: '/results',
  progress: '/progress',
  settings: '/settings',
};

export default function RouteScreen({ Screen }) {
  const router = useRouter();
  const navigate = (screen) => {
    router.push(routes[screen] || '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  return <Screen navigate={navigate} />;
}
