import { DM_Sans, Fraunces } from 'next/font/google';
import PostHogIdentity from '@/components/PostHogIdentity';
import './globals.css';
import './question-visuals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata = {
  title: 'MyCSECPal',
  description: 'CSEC Paper 1 and Paper 2 practice with AI-powered marking.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${fraunces.variable}`}>
        <PostHogIdentity />
        {children}
      </body>
    </html>
  );
}
