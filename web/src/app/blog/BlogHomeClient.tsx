'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { publicBlogApi, BlogSummaryDto, BlogCategoryDto } from '@/lib/api';

function readingTime(content?: string | null) {
  if (!content) return 3;
  return Math.max(1, Math.ceil(content.split(/\s+/).length / 200));
}

function formatDate(d?: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const CAT_COLORS: Record<string, string> = {
  'Industry Insights': 'bg-violet-100 text-violet-700',
  'Industry News':     'bg-amber-100 text-amber-700',
  'How To':            'bg-emerald-100 text-emerald-700',
  'Legal & Compliance':'bg-rose-100 text-rose-700',
  'Product':           'bg-cyan-100 text-cyan-700',
};
function catColor(name?: string | null) {
  return (name && CAT_COLORS[name]) || 'bg-indigo-100 text-indigo-700';
}

/* ── Featured Hero Card ───────────────────────────────────────────── */
function FeaturedCard({ blog }: { blog: BlogSummaryDto }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative group rounded-3xl overflow-hidden shadow-2xl"
    >
      <Link href={`/blog/${blog.slug}`} className="block">
        {/* Background */}
        <div className="relative h-[480px] md:h-[540px] w-full">
          {blog.coverImageUrl ? (
            <Image
              src={blog.coverImageUrl} alt={blog.title} fill priority
              className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950" />
          )}
          {/* Layered gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
        </div>

        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-12">
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-indigo-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest">
              Featured
            </span>
            {blog.category && (
              <span className="bg-white/15 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full border border-white/20">
                {blog.category}
              </span>
            )}
          </div>
          <h2 className="text-2xl md:text-4xl font-extrabold text-white leading-tight mb-3 group-hover:text-indigo-200 transition-colors max-w-3xl">
            {blog.title}
          </h2>
          {blog.metaDescription && (
            <p className="text-gray-300 text-sm md:text-base line-clamp-2 max-w-2xl mb-5">
              {blog.metaDescription}
            </p>
          )}
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              {formatDate(blog.publishedAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {readingTime(blog.metaDescription)} min read
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              {blog.viewCount.toLocaleString()} views
            </span>
          </div>
          <div className="mt-5 flex items-center gap-2 text-white font-semibold text-sm">
            Read Article
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ── Regular Blog Card ────────────────────────────────────────────── */
function BlogCard({ blog, index }: { blog: BlogSummaryDto; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-indigo-200 shadow-sm hover:shadow-xl transition-all duration-300"
    >
      <Link href={`/blog/${blog.slug}`} className="block relative overflow-hidden">
        {blog.coverImageUrl ? (
          <div className="relative h-48 w-full">
            <Image
              src={blog.coverImageUrl} alt={blog.title} fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        ) : (
          <div className="h-48 w-full bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center relative">
            <div className="absolute inset-0 opacity-30"
              style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, #6366f1 0%, transparent 50%), radial-gradient(circle at 75% 75%, #a855f7 0%, transparent 50%)' }} />
            <svg className="w-10 h-10 text-indigo-300 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        )}
      </Link>

      <div className="flex flex-col flex-1 p-5 gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {blog.category && (
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${catColor(blog.category)}`}>
              {blog.category}
            </span>
          )}
          <span className="text-[11px] text-gray-400 ml-auto">{formatDate(blog.publishedAt)}</span>
        </div>

        <Link href={`/blog/${blog.slug}`}>
          <h2 className="text-[15px] font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
            {blog.title}
          </h2>
        </Link>

        {blog.metaDescription && (
          <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">{blog.metaDescription}</p>
        )}

        <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3 text-[11px] text-gray-400">
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {readingTime(blog.metaDescription)} min
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              {blog.viewCount.toLocaleString()}
            </span>
          </div>
          <Link
            href={`/blog/${blog.slug}`}
            className="text-[11px] font-semibold text-indigo-600 flex items-center gap-0.5 hover:gap-1.5 transition-all"
          >
            Read <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

/* ── Skeleton loader ─────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="h-48 bg-gray-100" />
      <div className="p-5 space-y-3">
        <div className="h-3 bg-gray-100 rounded w-1/3" />
        <div className="h-4 bg-gray-100 rounded" />
        <div className="h-4 bg-gray-100 rounded w-4/5" />
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-3/4" />
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────────── */
export default function BlogHomeClient() {
  const [blogs,           setBlogs]           = useState<BlogSummaryDto[]>([]);
  const [trending,        setTrending]        = useState<BlogSummaryDto[]>([]);
  const [categories,      setCategories]      = useState<BlogCategoryDto[]>([]);
  const [selectedCategory,setSelectedCategory]= useState<string | null>(null);
  const [search,          setSearch]          = useState('');
  const [page,            setPage]            = useState(1);
  const [loading,         setLoading]         = useState(true);
  const [hasMore,         setHasMore]         = useState(true);
  const [email,           setEmail]           = useState('');
  const [subscribed,      setSubscribed]      = useState(false);

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
    Promise.all([publicBlogApi.getTrending(5), publicBlogApi.getCategories()])
      .then(([t, c]) => { setTrending(t); setCategories(c); });
  }, []);

  const filtered = search.trim()
    ? blogs.filter(b =>
        b.title.toLowerCase().includes(search.toLowerCase()) ||
        b.metaDescription?.toLowerCase().includes(search.toLowerCase()))
    : blogs;

  const featured   = trending[0];
  const trendingRest = trending.slice(1);

  return (
    <main className="min-h-screen bg-[#f8f7ff]">

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] text-white">
        {/* Animated blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              Updated weekly · Expert-verified content
            </span>
            <h1 className="text-5xl md:text-6xl font-extrabold mb-5 leading-[1.1] tracking-tight">
              The{' '}
              <span className="bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                DocSignerHub
              </span>{' '}
              Blog
            </h1>
            <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
              Expert playbooks on digital signatures, document automation, compliance, and AI-powered workflows — trusted by 10,000+ professionals.
            </p>
          </motion.div>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="relative max-w-xl mx-auto"
          >
            <div className="relative flex items-center">
              <svg className="absolute left-4 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
              </svg>
              <input
                type="search"
                placeholder="Search 100+ articles…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-11 pr-32 py-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white/15 transition-all"
              />
              <button className="absolute right-2 bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                Search
              </button>
            </div>
            {/* Popular tags */}
            <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
              <span className="text-xs text-slate-500">Popular:</span>
              {['eSignature', 'Compliance', 'AI Automation', 'DocuSign'].map(t => (
                <button
                  key={t}
                  onClick={() => setSearch(t)}
                  className="text-xs text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-full transition-colors border border-white/10"
                >
                  {t}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-center gap-8 mt-10 text-sm text-slate-400"
          >
            {[['100+', 'Articles'], ['50K+', 'Monthly readers'], ['4.9★', 'Avg rating']].map(([val, label]) => (
              <div key={label} className="text-center">
                <div className="text-white font-bold text-base">{val}</div>
                <div className="text-xs">{label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-14">

        {/* ── FEATURED ─────────────────────────────────────────────── */}
        <AnimatePresence>
          {featured && !selectedCategory && !search && (
            <section className="mb-14">
              <div className="flex items-center gap-3 mb-5">
                <span className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Editor&apos;s Pick</h2>
              </div>
              <FeaturedCard blog={featured} />
            </section>
          )}
        </AnimatePresence>

        <div className="flex flex-col lg:flex-row gap-12">

          {/* ── MAIN CONTENT ────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">

            {/* Category tabs */}
            <div className="flex items-center gap-2 flex-wrap mb-8 pb-4 border-b border-gray-200">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  !selectedCategory
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'bg-white text-gray-500 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                }`}
              >
                All Articles
              </button>
              {categories.map(cat => (
                <button
                  key={cat.slug}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                    selectedCategory === cat.name
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : 'bg-white text-gray-500 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                >
                  {cat.name}
                  <span className={`ml-1.5 text-xs ${selectedCategory === cat.name ? 'text-indigo-200' : 'text-gray-400'}`}>
                    {cat.postCount}
                  </span>
                </button>
              ))}
            </div>

            {/* Articles grid */}
            {loading && blogs.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-center py-24"
              >
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-700 font-semibold">No articles found</p>
                <p className="text-sm text-gray-400 mt-1">Try a different search or category</p>
                <button
                  onClick={() => { setSearch(''); setSelectedCategory(null); }}
                  className="mt-4 text-sm text-indigo-600 font-medium hover:underline"
                >
                  Clear filters
                </button>
              </motion.div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  <AnimatePresence mode="popLayout">
                    {filtered.map((blog, i) => (
                      <BlogCard key={blog.id} blog={blog} index={i} />
                    ))}
                  </AnimatePresence>
                </div>
                {hasMore && !search && (
                  <div className="text-center mt-12">
                    <button
                      onClick={() => { const next = page + 1; setPage(next); loadBlogs(selectedCategory, next, false); }}
                      disabled={loading}
                      className="inline-flex items-center gap-2 px-8 py-3.5 bg-white border-2 border-indigo-200 text-indigo-600 rounded-2xl text-sm font-semibold hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50"
                    >
                      {loading
                        ? <><span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /> Loading…</>
                        : <>Load more articles <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></>
                      }
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── SIDEBAR ─────────────────────────────────────────────── */}
          <aside className="w-full lg:w-72 flex-shrink-0 space-y-6">

            {/* Trending */}
            {trendingRest.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-1 h-5 bg-gradient-to-b from-orange-400 to-red-500 rounded-full" />
                  <h3 className="text-sm font-bold text-gray-800">Trending Articles</h3>
                  <span className="ml-auto text-xs bg-orange-50 text-orange-600 font-semibold px-2 py-0.5 rounded-full">🔥 Hot</span>
                </div>
                <div className="space-y-4">
                  {trendingRest.map((b, i) => (
                    <Link key={b.id} href={`/blog/${b.slug}`} className="flex gap-3 group">
                      <span className="text-2xl font-black text-gray-100 leading-none w-8 flex-shrink-0 group-hover:text-indigo-200 transition-colors">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
                          {b.title}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          {b.viewCount.toLocaleString()} views
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Newsletter CTA — AIDA formula */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-6 text-white shadow-xl">
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
              <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/10 rounded-full" />
              <div className="relative">
                <div className="text-2xl mb-2">📬</div>
                <h3 className="font-bold text-base mb-1">Get the weekly digest</h3>
                <p className="text-xs text-indigo-200 mb-4 leading-relaxed">
                  Join 8,000+ professionals. Expert insights on e-signing delivered every Tuesday.
                </p>
                {subscribed ? (
                  <div className="bg-white/20 rounded-xl p-3 text-center text-sm font-semibold">
                    ✅ You&apos;re in! Check your inbox.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-white/15 border border-white/20 text-white placeholder-indigo-300 text-sm focus:outline-none focus:bg-white/25 transition-all"
                    />
                    <button
                      onClick={() => { if (email) setSubscribed(true); }}
                      className="w-full bg-white text-indigo-700 font-bold text-sm py-2.5 rounded-xl hover:bg-indigo-50 transition-colors shadow-lg"
                    >
                      Subscribe free →
                    </button>
                  </div>
                )}
                <p className="text-[10px] text-indigo-300 mt-3 text-center">No spam · Unsubscribe anytime</p>
              </div>
            </div>

            {/* Quick CTA card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h3 className="font-bold text-sm text-gray-900 mb-1">Ready to automate?</h3>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                Start signing documents in minutes. No card required.
              </p>
              <Link
                href="/auth/register"
                className="inline-block w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm py-2.5 rounded-xl hover:opacity-90 transition-opacity shadow-md shadow-indigo-200"
              >
                Start for free →
              </Link>
            </div>
          </aside>
        </div>
      </div>

      {/* ── BOTTOM BANNER ──────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-indigo-900 to-purple-900 py-16 px-4 mt-8">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h2 className="text-2xl md:text-3xl font-extrabold mb-3">
            Stop printing. Start signing — 14 days free.
          </h2>
          <p className="text-indigo-200 mb-6 text-sm md:text-base">
            10,000+ businesses trust DocSignerHub to close deals faster.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/auth/register"
              className="bg-white text-indigo-700 font-bold px-8 py-3 rounded-2xl hover:bg-indigo-50 transition-colors shadow-xl text-sm"
            >
              Get started free
            </Link>
            <Link
              href="/how-to-use"
              className="border-2 border-white/30 text-white font-semibold px-6 py-3 rounded-2xl hover:bg-white/10 transition-colors text-sm"
            >
              See how it works →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
