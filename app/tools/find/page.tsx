// app/tools/find/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FLAGS } from '@/lib/flags';
import { SITE_NAME } from '@/lib/brand';
import GuidedFilterClient from '@/components/GuidedFilterClient';

export const metadata: Metadata = {
  title: `Find tools — ${SITE_NAME}`,
  description: 'Filter AI tools by category, role, tasks, languages, pricing and more.',
};

export default function GuidedFindPage() {
  if (!FLAGS.SHOW_GUIDED_UI) {
    notFound(); // return 404 when flag is off
  }
  return <GuidedFilterClient />;
}
