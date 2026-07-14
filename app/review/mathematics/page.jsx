import MathematicsReviewPage from '@/components/review/MathematicsReviewPage';

export const metadata = { title: 'Mathematics release proof · MyCSECPal' };

export default function Page() {
  if (process.env.NODE_ENV === 'production') return null;
  return <MathematicsReviewPage/>;
}
