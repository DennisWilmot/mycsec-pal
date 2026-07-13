import RouteScreen from '@/components/RouteScreen';
import Screen from '@/components/screens/Paper2Page';
import { redirect } from 'next/navigation';

export default async function Page({ searchParams }) {
  const params = await searchParams;
  if (!params?.attemptId) redirect('/practice/mathematics/paper-2/briefing');
  return <RouteScreen Screen={Screen}/>;
}
