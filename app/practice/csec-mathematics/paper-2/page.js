import { redirect } from 'next/navigation';
export default async function Page({searchParams}){const params=await searchParams;const query=params?.attemptId?`?attemptId=${encodeURIComponent(params.attemptId)}`:'';redirect(`/practice/mathematics/paper-2${query}`)}
