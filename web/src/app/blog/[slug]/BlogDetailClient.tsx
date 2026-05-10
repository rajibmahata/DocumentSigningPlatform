'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { BlogDto, BlogSummaryDto, publicBlogApi } from '@/lib/api';

function formatDate(d?: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function readingTime(content?: string | null) {
  if (!content) return 1;
  return Math.max(1, Math.ceil(content.split(/\s+/).length / 200));
}

function ShareBar({ url, title }: { url: string; title: string }) {
  const enc = encodeURIComponent;
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-sm font-medium text-gray-500">Share:</span>
      <a
        href={`https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`}
        target="_blank" rel="noopener noreferrer"
        className="px-3 py-1.5 bg-black text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-colors"
      >𝕏 / Twitter</a>
      <a
        href={`https://www.linkedin.com/shareArticle?mini=true&url=${enc(url)}&title=${enc(title)}`}
        target="_blank" rel="noopener noreferrer"
        className="px-3 py-1.5 bg-[#0077b5] text-white text-xs font-semibold rounded-lg hover:bg-[#006097] transition-colors"
      >LinkedIn</a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`}
        target="_blank" rel="noopener noreferrer"
        className="px-3 py-1.5 bg-[#1877f2] text-white text-xs font-semibold rounded-lg hover:bg-[#1465d1] transition-colors"
      >Facebook</a>
      <a
        href={`mailto:?subject=${enc(title)}&body=${enc(url)}`}
        className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors"
      >Email</a>
    </div>
  );
}

function RelatedCard({ blog }: { blog: BlogSummaryDto }) {
  return (
    <Link href={`/blog/${blog.slug}`} className="group flex gap-4 py-3 border-b border-gray-100 last:border-0">
      {blog.coverImageUrl ? (
        <Image
          src={blog.coverImageUrl}
          alt={blog.title}
          width={72}
          height={56}
          className="rounded-lg object-cover w-18 h-14 flex-shrink-0 group-hover:opacity-90 transition-opacity"
        />
      ) : (
        <div className="w-18 h-14 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-100 flex-shrink-0" style={{ width: 72, height: 56 }} />
      )}
      <div>
        <p className="text-sm font-medium text-gray-800 group-hover:text-blue-600 transition-colors line-clamp-2">
          {blog.title}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{formatDate(blog.publishedAt)}</p>
      </div>
    </Link>
  );
}

export default function BlogDetailClient({ blog, related }: { blog: BlogDto; related: BlogSummaryDto[] }) {
  useEffect(() => {
    publicBlogApi.trackView(blog.slug);
  }, [blog.slug]);

  const canonicalUrl = `https://docsignerhub.com/blog/${blog.slug}`;
  const mins = readingTime(blog.content);
  const tags = blog.tags ? blog.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-white border-b border-gray-100">
        {blog.coverImageUrl && (
          <div className="relative h-64 md:h-96 w-full">
            <Image src={blog.coverImageUrl} alt={blog.title} fill className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />
          </div>
        )}
        <div className="max-w-4xl mx-auto px-4 py-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
            <Link href="/" className="hover:text-blue-600">Home</Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-blue-600">Blog</Link>
            <span>/</span>
            <span className="text-gray-600 truncate max-w-xs">{blog.title}</span>
          </nav>
          <div className="flex items-center gap-2 flex-wrap mb-4">
            {blog.category && (
              <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {blog.category}
              </span>
            )}
            <span className="text-xs text-gray-400">{formatDate(blog.publishedAt)}</span>
            <span className="text-xs text-gray-400">· {mins} min read</span>
            <span className="text-xs text-gray-400">· {blog.viewCount} views</span>
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight mb-4"
          >
            {blog.title}
          </motion.h1>
          {blog.metaDescription && (
            <p className="text-lg text-gray-500 leading-relaxed">{blog.metaDescription}</p>
          )}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {tags.map(t => (
                <span key={t} className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full">{t}</span>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col lg:flex-row gap-12">
        {/* Article */}
        <article className="flex-1 min-w-0">
          <div
            className="prose prose-lg prose-gray max-w-none prose-headings:font-bold prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline"
            dangerouslySetInnerHTML={{ __html: blog.content }}
          />

          {/* Share */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <ShareBar url={canonicalUrl} title={blog.title} />
          </div>

          {/* CTA */}
          <div className="mt-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 text-white text-center shadow-lg">
            <h3 className="text-xl font-bold mb-2">Ready to streamline your document signing?</h3>
            <p className="text-blue-100 text-sm mb-6">Join thousands of businesses using DocSignerHub.</p>
            <Link
              href="/auth/register"
              className="inline-block bg-white text-blue-700 font-semibold px-6 py-2.5 rounded-xl hover:bg-blue-50 transition-colors"
            >
              Start for free
            </Link>
          </div>
        </article>

        {/* Sidebar */}
        <aside className="w-full lg:w-72 flex-shrink-0 space-y-8">
          {related.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Related Articles</h3>
              <div className="space-y-1">
                {related.map(r => <RelatedCard key={r.id} blog={r} />)}
              </div>
            </div>
          )}

          {/* Back to blog */}
          <div className="text-center">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Blog
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
