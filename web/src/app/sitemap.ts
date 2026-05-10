import type { MetadataRoute } from 'next';
import { BlogSummaryDto } from '@/lib/api';

const BASE_URL = 'https://docsignerhub.com';
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5163';

async function fetchAllBlogs(): Promise<BlogSummaryDto[]> {
  try {
    const res = await fetch(`${API_BASE}/api/public/blogs?page=1&pageSize=500`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    return (await res.json()) as BlogSummaryDto[];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const blogs = await fetchAllBlogs();

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE_URL}/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/how-to-use`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/faq`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/docs`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
  ];

  const blogPages: MetadataRoute.Sitemap = blogs.map(blog => ({
    url: `${BASE_URL}/blog/${blog.slug}`,
    lastModified: blog.publishedAt ? new Date(blog.publishedAt) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...staticPages, ...blogPages];
}
