import { notFound } from 'next/navigation';
import EnglishReviewPage from '@/components/review/EnglishReviewPage';

export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <EnglishReviewPage />;
}
