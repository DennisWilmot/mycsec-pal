import RouteScreen from '@/components/RouteScreen';
import Screen from '@/components/screens/EnglishPaper1Page';
import { redirect } from 'next/navigation';

export default async function Page({ searchParams }) {
  const params = await searchParams;
  if (!params?.attemptId) redirect('/practice/english-a/paper-1/briefing');
  return <RouteScreen Screen={Screen}/>;
}
