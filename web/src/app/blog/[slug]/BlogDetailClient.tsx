'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { BlogDto, BlogSummaryDto, publicBlogApi } from '@/lib/api';

function formatDate(d?: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function readingTime(content?: string | null) {
  if (!content) return 1;
  return Math.max(1, Math.ceil(content.split(/\s+/).length / 200));
}

/* ── Floating vertical share bar (desktop) ─────────────────────── */
function ShareBar({ url, title }: { url: string; title: string }) {
  const enc = encodeURIComponent;
  const shares = [
    {
      label: 'X / Twitter',
      href: `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`,
      bg: 'bg-black hover:bg-gray-800',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.73-8.835L1.254 2.25H8.08l4.261 5.638 5.903-5.638Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      label: 'LinkedIn',
      href: `https://www.linkedin.com/shareArticle?mini=true&url=${enc(url)}&title=${enc(title)}`,
      bg: 'bg-[#0077b5] hover:bg-[#006097]',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      ),
    },
    {
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
      bg: 'bg-[#1877f2] hover:bg-[#1465d1]',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      label: 'Email',
      href: `mailto:?subject=${enc(title)}&body=${enc(url)}`,
      bg: 'bg-gray-600 hover:bg-gray-700',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Share</span>
      {shares.map(s => (
        <a
          key={s.label}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          title={`Share on ${s.label}`}
          className={`${s.bg} text-white w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-md`}
        >
          {s.icon}
        </a>
      ))}
    </div>
  );
}

/* ── Related article card ────────────────────────────────────────── */
function RelatedCard({ blog }: { blog: BlogSummaryDto }) {
  return (
    <Link href={`/blog/${blog.slug}`} className="group flex flex-col bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-indigo-200 transition-all">
      {blog.coverImageUrl ? (
        <div className="relative h-40 w-full overflow-hidden">
          <Image
            src={blog.coverImageUrl} alt={blog.title} fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      ) : (
        <div className="h-40 w-full bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
          <svg className="w-8 h-8 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      )}
      <div className="p-4">
        {blog.category && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 mb-1 block">
            {blog.category}
          </span>
        )}
        <h4 className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
          {blog.title}
        </h4>
        <p className="text-xs text-gray-400 mt-2">{formatDate(blog.publishedAt)}</p>
      </div>
    </Link>
  );
}

/* ── Reading Progress Bar ───────────────────────────────────────── */
function ReadingProgressBar() {
  const { scrollYProgress } = useScroll();
  const width = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);
  return (
    <div className="fixed top-0 left-0 right-0 h-1 z-50 bg-gray-100">
      <motion.div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" style={{ width }} />
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────────── */
export default function BlogDetailClient({ blog, related }: { blog: BlogDto; related: BlogSummaryDto[] }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    publicBlogApi.trackView(blog.slug);
  }, [blog.slug]);

  const canonicalUrl = `https://docsignerhub.com/blog/${blog.slug}`;
  const mins = readingTime(blog.content);
  const tags = blog.tags ? blog.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

  const copyLink = () => {
    navigator.clipboard.writeText(canonicalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <ReadingProgressBar />

      <main className="min-h-screen bg-white">

        {/* ── HERO ──────────────────────────────────────────────── */}
        <section className="relative">
          {blog.coverImageUrl ? (
            <div className="relative h-[55vh] min-h-[360px] w-full">
              <Image
                src={blog.coverImageUrl} alt={blog.title} fill priority
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/20" />
            </div>
          ) : (
            <div className="relative h-[45vh] min-h-[320px] w-full overflow-hidden bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]">
              <div className="absolute inset-0 opacity-20"
                style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #6366f1 0%, transparent 60%), radial-gradient(circle at 70% 20%, #a855f7 0%, transparent 50%)' }} />
            </div>
          )}

          {/* Overlaid title */}
          <div className="absolute inset-0 flex flex-col justify-end">
            <div className="max-w-4xl mx-auto px-6 pb-10 w-full">
              {/* Breadcrumb */}
              <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-5">
                <Link href="/" className="hover:text-white transition-colors">Home</Link>
                <span>/</span>
                <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
                <span>/</span>
                <span className="text-gray-300 truncate max-w-[200px]">{blog.title}</span>
              </nav>

              {/* Meta badges */}
              <div className="flex items-center gap-2 flex-wrap mb-4">
                {blog.category && (
                  <span className="bg-indigo-500 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    {blog.category}
                  </span>
                )}
                <span className="bg-white/10 backdrop-blur-sm text-gray-300 text-xs px-2.5 py-1 rounded-full border border-white/10">
                  {formatDate(blog.publishedAt)}
                </span>
                <span className="bg-white/10 backdrop-blur-sm text-gray-300 text-xs px-2.5 py-1 rounded-full border border-white/10 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {mins} min read
                </span>
                <span className="bg-white/10 backdrop-blur-sm text-gray-300 text-xs px-2.5 py-1 rounded-full border border-white/10 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  {blog.viewCount.toLocaleString()} views
                </span>
              </div>

              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-3xl md:text-5xl font-extrabold text-white leading-tight max-w-3xl"
              >
                {blog.title}
              </motion.h1>

              {blog.metaDescription && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-gray-300 mt-3 text-base md:text-lg max-w-2xl leading-relaxed"
                >
                  {blog.metaDescription}
                </motion.p>
              )}
            </div>
          </div>
        </section>

        {/* ── CONTENT AREA ──────────────────────────────────────── */}
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex flex-col lg:flex-row gap-12">

            {/* Left floating share bar (desktop only) */}
            <div className="hidden xl:flex flex-col items-center pt-2 w-12 flex-shrink-0 sticky top-20 self-start">
              <ShareBar url={canonicalUrl} title={blog.title} />
              <button
                onClick={copyLink}
                title="Copy link"
                className={`mt-2 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-md ${copied ? 'bg-emerald-500' : 'bg-gray-200 hover:bg-gray-300'}`}
              >
                {copied ? (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                ) : (
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                )}
              </button>
            </div>

            {/* Article body */}
            <article className="flex-1 min-w-0 max-w-3xl">
              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-8">
                  {tags.map(t => (
                    <span key={t} className="text-xs bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 text-gray-600 px-3 py-1 rounded-full transition-colors cursor-default">
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {/* Article content */}
              <div
                className="prose prose-lg prose-gray max-w-none
                  prose-headings:font-extrabold prose-headings:text-gray-900 prose-headings:tracking-tight
                  prose-h1:text-4xl prose-h2:text-2xl prose-h2:border-b prose-h2:border-gray-100 prose-h2:pb-2
                  prose-p:text-gray-700 prose-p:leading-[1.85] prose-p:text-[17px]
                  prose-a:text-indigo-600 prose-a:font-medium prose-a:no-underline hover:prose-a:underline
                  prose-strong:text-gray-900
                  prose-blockquote:border-l-4 prose-blockquote:border-indigo-400 prose-blockquote:bg-indigo-50 prose-blockquote:rounded-r-xl prose-blockquote:pl-5 prose-blockquote:py-1
                  prose-code:text-indigo-700 prose-code:bg-indigo-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                  prose-pre:bg-gray-900 prose-pre:rounded-2xl
                  prose-img:rounded-2xl prose-img:shadow-lg
                  prose-li:text-gray-700"
                dangerouslySetInnerHTML={{ __html: blog.content }}
              />

              {/* Mobile share row */}
              <div className="xl:hidden mt-10 pt-6 border-t border-gray-100">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Share this article</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { label: '𝕏 Twitter', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(blog.title)}&url=${encodeURIComponent(canonicalUrl)}`, cls: 'bg-black text-white' },
                    { label: 'LinkedIn', href: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(canonicalUrl)}&title=${encodeURIComponent(blog.title)}`, cls: 'bg-[#0077b5] text-white' },
                    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonicalUrl)}`, cls: 'bg-[#1877f2] text-white' },
                  ].map(s => (
                    <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                      className={`${s.cls} text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity`}>
                      {s.label}
                    </a>
                  ))}
                  <button onClick={copyLink}
                    className={`text-xs font-semibold px-4 py-2 rounded-xl transition-colors ${copied ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    {copied ? '✓ Copied!' : 'Copy link'}
                  </button>
                </div>
              </div>

              {/* CTA Banner */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mt-12 relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-8 md:p-10 text-white shadow-2xl"
              >
                <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full" />
                <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-white/10 rounded-full" />
                <div className="relative">
                  <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-2">Start for free today</p>
                  <h3 className="text-2xl md:text-3xl font-extrabold mb-3 leading-tight">
                    Close deals 3× faster with DocSignerHub
                  </h3>
                  <p className="text-indigo-100 text-sm md:text-base mb-6 max-w-lg">
                    Join 10,000+ businesses who automate their document workflows. No credit card required.
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Link
                      href="/auth/register"
                      className="inline-block bg-white text-indigo-700 font-bold px-6 py-3 rounded-2xl hover:bg-indigo-50 transition-colors shadow-lg text-sm"
                    >
                      Start free trial →
                    </Link>
                    <Link
                      href="/how-to-use"
                      className="text-indigo-200 font-semibold text-sm hover:text-white transition-colors"
                    >
                      See how it works
                    </Link>
                  </div>
                  <p className="text-indigo-300 text-xs mt-4">✓ 14-day free trial &nbsp; ✓ No card required &nbsp; ✓ Cancel anytime</p>
                </div>
              </motion.div>
            </article>

            {/* Sticky sidebar */}
            <aside className="w-full lg:w-72 flex-shrink-0 space-y-6 self-start sticky top-20">
              {/* Author card */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    AI
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">DocSignerHub AI</p>
                    <p className="text-xs text-gray-400">AI-generated content, expert-reviewed</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 pt-3 border-t border-gray-50">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {mins} min read
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {blog.viewCount.toLocaleString()} views
                  </span>
                </div>
              </div>

              {/* Related articles */}
              {related.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-4 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Related Articles</h3>
                  </div>
                  <div className="space-y-4">
                    {related.map(r => (
                      <Link key={r.id} href={`/blog/${r.slug}`} className="flex gap-3 group">
                        {r.coverImageUrl ? (
                          <div className="relative w-16 h-12 rounded-lg overflow-hidden flex-shrink-0">
                            <Image src={r.coverImageUrl} alt={r.title} fill className="object-cover group-hover:scale-105 transition-transform" />
                          </div>
                        ) : (
                          <div className="w-16 h-12 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 flex-shrink-0" />
                        )}
                        <div>
                          <p className="text-xs font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
                            {r.title}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-1">{formatDate(r.publishedAt)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-50">
                    <Link href="/blog" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                      View all articles
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </Link>
                  </div>
                </div>
              )}

              {/* Newsletter mini CTA */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 p-5 text-white shadow-lg">
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-indigo-500/20 rounded-full" />
                <div className="relative">
                  <p className="text-base mb-1">📬 Weekly digest</p>
                  <h4 className="font-bold text-sm mb-2">Expert insights, every Tuesday.</h4>
                  <p className="text-xs text-slate-400 mb-3">Join 8,000+ professionals</p>
                  <Link href="/auth/register" className="block w-full text-center bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold py-2.5 rounded-xl transition-colors">
                    Get it free →
                  </Link>
                </div>
              </div>

              {/* Back to blog */}
              <Link
                href="/blog"
                className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors group"
              >
                <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to all articles
              </Link>
            </aside>
          </div>

          {/* ── RELATED ARTICLES (full grid at bottom) ─────────────── */}
          {related.length > 0 && (
            <section className="mt-20 pt-12 border-t border-gray-100">
              <div className="flex items-center gap-3 mb-8">
                <span className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full" />
                <h2 className="text-xl font-extrabold text-gray-900">You might also like</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {related.map(r => <RelatedCard key={r.id} blog={r} />)}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
