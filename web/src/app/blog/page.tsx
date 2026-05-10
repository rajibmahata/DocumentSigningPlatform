import type { Metadata } from 'next';
import BlogHomeClient from './BlogHomeClient';

export const metadata: Metadata = {
  title: 'Blog – Document Signing Tips, Guides & Updates | DocSignerHub',
  description:
    'Explore expert guides on digital signatures, e-signing workflows, compliance, and document automation. Stay ahead with DocSignerHub insights.',
  openGraph: {
    title: 'Blog – DocSignerHub',
    description: 'Expert guides on digital signatures, compliance, and document automation.',
    url: 'https://docsignerhub.com/blog',
    type: 'website',
  },
  alternates: { canonical: 'https://docsignerhub.com/blog' },
};

const LD_JSON = {
  '@context': 'https://schema.org',
  '@type': 'Blog',
  name: 'DocSignerHub Blog',
  url: 'https://docsignerhub.com/blog',
  description: 'Expert guides on digital signatures, e-signing workflows, compliance, and document automation.',
  publisher: {
    '@type': 'Organization',
    name: 'DocSignerHub',
    url: 'https://docsignerhub.com',
  },
};

export default function BlogPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(LD_JSON) }}
      />
      <BlogHomeClient />
    </>
  );
}
