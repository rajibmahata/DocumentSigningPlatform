import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { publicBlogApi } from '@/lib/api';
import BlogDetailClient from './BlogDetailClient';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const blog = await publicBlogApi.getBySlug(slug);
  if (!blog) return { title: 'Article not found | DocSignerHub' };
  return {
    title: `${blog.title} | DocSignerHub Blog`,
    description: blog.metaDescription ?? undefined,
    keywords: blog.keywords ?? undefined,
    openGraph: {
      title: blog.title,
      description: blog.metaDescription ?? undefined,
      url: `https://docsignerhub.com/blog/${slug}`,
      type: 'article',
      publishedTime: blog.publishedAt ?? undefined,
      images: blog.coverImageUrl ? [{ url: blog.coverImageUrl }] : [],
    },
    alternates: { canonical: `https://docsignerhub.com/blog/${slug}` },
  };
}

export default async function BlogDetailPage({ params }: Props) {
  const { slug } = await params;
  const [blog, related] = await Promise.all([
    publicBlogApi.getBySlug(slug),
    publicBlogApi.getRelated(slug, 3),
  ]);
  if (!blog) notFound();

  const ldJson = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: blog.title,
    description: blog.metaDescription,
    image: blog.coverImageUrl,
    datePublished: blog.publishedAt,
    dateModified: blog.updatedAt,
    author: { '@type': 'Organization', name: 'DocSignerHub' },
    publisher: {
      '@type': 'Organization',
      name: 'DocSignerHub',
      url: 'https://docsignerhub.com',
    },
    keywords: blog.keywords,
    url: `https://docsignerhub.com/blog/${slug}`,
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://docsignerhub.com' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://docsignerhub.com/blog' },
      { '@type': 'ListItem', position: 3, name: blog.title, item: `https://docsignerhub.com/blog/${slug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJson) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <BlogDetailClient blog={blog} related={related} />
    </>
  );
}
