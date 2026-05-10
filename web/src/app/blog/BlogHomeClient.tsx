'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { publicBlogApi, BlogSummaryDto, BlogCategoryDto } from '@/lib/api';

function readingTime(content?: string | null) {
  if (!content) return 1;
  return Math.max(1, Math.ceil(content.split(/\s+/).length / 200));
}

function formatDate(d?: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function CategoryBadge({ name }: { name: string }) {
  return (
    <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
      {name}
    </span>
  );
}

function BlogCard({ blog, index }: { blog: BlogSummaryDto; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className="group flex flex-col bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      <Link href={`/blog/${blog.slug}`} className="block">
        {blog.coverImageUrl ? (
          <div className="relative h-48 w-full">
            <Image
              src={blog.coverImageUrl}
              alt={blog.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        ) : (
          <div className="h-48 w-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
            <svg className="w-12 h-12 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        )}
      </Link>
      <div className="flex flex-col flex-1 p-5 gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {blog.category && <CategoryBadge name={blog.category} />}
          <span className="text-xs text-gray-400">{formatDate(blog.publishedAt)}</span>
          <span className="text-xs text-gray-400">· {readingTime(blog.metaDescription)} min read</span>
        </div>
        <Link href={`/blog/${blog.slug}`}>
          <h2 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
            {blog.title}
          </h2>
        </Link>
        {blog.metaDescription && (
          <p className="text-sm text-gray-500 line-clamp-3">{blog.metaDescription}</p>
        )}
        <div className="mt-auto pt-3 border-t border-gray-50">
          <Link
            href={`/blog/${blog.slug}`}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            Read more
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

export default function BlogHomeClient() {
  const [blogs, setBlogs] = useState<BlogSummaryDto[]>([]);
  const [trending, setTrending] = useState<BlogSummaryDto[]>([]);
  const [categories, setCategories] = useState<BlogCategoryDto[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  const PAGE_SIZE = 9;

  const loadBlogs = useCallback(async (cat: string | null, pg: number, replace: boolean) => {
    setLoading(true);
    try {
      const data = await publicBlogApi.getBlogs({ category: cat ?? undefined, page: pg, pageSize: PAGE_SIZE });
      setBlogs(prev => replace ? data : [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    loadBlogs(selectedCategory, 1, true);
  }, [selectedCategory, loadBlogs]);

  useEffect(() => {
    Promise.all([
      publicBlogApi.getTrending(3),
      publicBlogApi.getCategories(),
    ]).then(([t, c]) => {
      setTrending(t);
      setCategories(c);
    });
  }, []);

  const filtered = search.trim()
    ? blogs.filter(b => b.title.toLowerCase().includes(search.toLowerCase()) || b.metaDescription?.toLowerCase().includes(search.toLowerCase()))
    : blogs;

  const featured = trending[0];

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    loadBlogs(selectedCategory, next, false);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-block bg-white/10 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4 border border-white/20">
              Insights & Guides
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
              The DocSignerHub Blog
            </h1>
            <p className="text-lg text-blue-100 max-w-2xl mx-auto mb-8">
              Expert guides on digital signatures, document automation, compliance, and e-signing best practices.
            </p>
            <div className="relative max-w-lg mx-auto">
              <input
                type="search"
                placeholder="Search articles…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl text-gray-900 text-sm shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <svg className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
              </svg>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Featured article */}
        {featured && !selectedCategory && !search && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-14"
          >
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Featured</h2>
            <Link href={`/blog/${featured.slug}`} className="group block">
              <div className="relative rounded-2xl overflow-hidden bg-gray-900 shadow-lg">
                {featured.coverImageUrl ? (
                  <Image
                    src={featured.coverImageUrl}
                    alt={featured.title}
                    width={1200}
                    height={480}
                    className="w-full h-72 md:h-96 object-cover opacity-60 group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-72 md:h-96 bg-gradient-to-br from-blue-900 to-indigo-900" />
                )}
                <div className="absolute inset-0 flex flex-col justify-end p-8">
                  <div className="flex items-center gap-3 mb-2">
                    {featured.category && <CategoryBadge name={featured.category} />}
                    <span className="text-xs text-gray-300">{formatDate(featured.publishedAt)}</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white group-hover:text-blue-200 transition-colors">
                    {featured.title}
                  </h2>
                  {featured.metaDescription && (
                    <p className="text-gray-300 mt-2 line-clamp-2 max-w-2xl">{featured.metaDescription}</p>
                  )}
                </div>
              </div>
            </Link>
          </motion.section>
        )}

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Category filters */}
            <div className="flex items-center gap-2 flex-wrap mb-8">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${!selectedCategory ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-400'}`}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat.slug}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedCategory === cat.name ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-400'}`}
                >
                  {cat.name} <span className="text-xs opacity-60">({cat.postCount})</span>
                </button>
              ))}
            </div>

            {loading && blogs.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-72 bg-white rounded-2xl animate-pulse border border-gray-100" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-24 text-gray-400">
                <p className="text-lg font-medium">No articles found</p>
                <p className="text-sm mt-1">Try a different search term or category</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filtered.map((blog, i) => (
                    <BlogCard key={blog.id} blog={blog} index={i} />
                  ))}
                </div>
                {hasMore && !search && (
                  <div className="text-center mt-10">
                    <button
                      onClick={handleLoadMore}
                      disabled={loading}
                      className="px-8 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Loading…' : 'Load more articles'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-full lg:w-72 flex-shrink-0 space-y-8">
            {/* Trending */}
            {trending.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14l-5-5 1.41-1.41L10 13.17l7.59-7.59L19 7l-9 9z" />
                  </svg>
                  Trending
                </h3>
                <div className="space-y-4">
                  {trending.map((b, i) => (
                    <Link key={b.id} href={`/blog/${b.slug}`} className="flex gap-3 group">
                      <span className="text-2xl font-bold text-gray-100 leading-none">{String(i + 1).padStart(2, '0')}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-800 group-hover:text-blue-600 transition-colors line-clamp-2">
                          {b.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{b.viewCount} views</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Newsletter */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-sm">
              <h3 className="font-semibold mb-2">Get updates in your inbox</h3>
              <p className="text-sm text-blue-100 mb-4">No spam. Unsubscribe anytime.</p>
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900 mb-3 focus:outline-none"
              />
              <button className="w-full bg-white text-blue-700 font-semibold text-sm py-2 rounded-lg hover:bg-blue-50 transition-colors">
                Subscribe
              </button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
