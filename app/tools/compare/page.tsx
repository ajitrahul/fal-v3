// app/tools/compare/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SITE_NAME } from '@/lib/brand';
import { FLAGS } from '@/lib/flags';
import CompareClient from '@/components/CompareClient';

export const metadata: Metadata = {
  title: `Compare tools — ${SITE_NAME}`,
  description: 'Side-by-side comparison of up to 3 AI tools.',
};

export default function ComparePage() {
  if (!FLAGS.SHOW_COMPARE_UI) {
    notFound();
  }
  return <CompareClient />;
}
