'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { BlogDto, BlogSummaryDto, publicBlogApi } from '@/lib/api';

// ── HELPERS ───────────────────────────────────────────────────────────────────
function formatDate(d?: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function readingTime(content?: string | null) {
  if (!content) return 1;
  const text = content.replace(/<[^>]+>/g, ' ');
  return Math.max(1, Math.ceil(text.split(/\s+/).filter(Boolean).length / 200));
}

// ── READING PROGRESS BAR ──────────────────────────────────────────────────────
function ReadingProgressBar() {
  const { scrollYProgress } = useScroll();
  const width = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);
  return (
    <div className="fixed top-0 left-0 right-0 h-[3px] z-50 pointer-events-none">
      <motion.div
        className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 origin-left"
        style={{ width }}
      />
    </div>
  );
}

// ── TOP NAV (breadcrumb + back to home) ───────────────────────────────────────
function TopNav({ title }: { title: string }) {
  return (
    <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-2 min-w-0">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors group flex-shrink-0"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="hidden sm:inline">Home</span>
        </Link>
        <span className="text-gray-200 flex-shrink-0">/</span>
        <Link href="/blog" className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors flex-shrink-0">
          Blog
        </Link>
        <span className="text-gray-200 flex-shrink-0">/</span>
        <span className="text-sm text-gray-400 truncate min-w-0">{title}</span>
      </div>
    </div>
  );
}

// ── TABLE OF CONTENTS ─────────────────────────────────────────────────────────
interface TocItem { id: string; text: string; level: number }

function TableOfContents({ items, activeId }: { items: TocItem[]; activeId: string }) {
  if (items.length < 2) return null;
  return (
    <nav aria-label="Table of contents">
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-3">On this page</p>
      <ul className="space-y-0.5">
        {items.map(item => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={e => {
                e.preventDefault();
                document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`flex text-xs leading-snug py-1.5 pl-3 transition-all duration-150 border-l-2 rounded-r
                ${item.level === 3 ? 'ml-3 text-[11px]' : ''}
                ${activeId === item.id
                  ? 'border-indigo-500 text-indigo-600 font-semibold bg-indigo-50/60'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-200 hover:bg-gray-50'}`}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ── SHARE BAR ─────────────────────────────────────────────────────────────────
function ShareBar({ url, title, copied, onCopy }: {
  url: string; title: string; copied: boolean; onCopy: () => void;
}) {
  const enc = encodeURIComponent;
  const btns = [
    {
      label: 'Twitter / X',
      href: `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`,
      bg: 'bg-black hover:bg-gray-800',
      icon: <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.73-8.835L1.254 2.25H8.08l4.261 5.638 5.903-5.638Zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>,
    },
    {
      label: 'LinkedIn',
      href: `https://www.linkedin.com/shareArticle?mini=true&url=${enc(url)}&title=${enc(title)}`,
      bg: 'bg-[#0077b5] hover:bg-[#006097]',
      icon: <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>,
    },
    {
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
      bg: 'bg-[#1877f2] hover:bg-[#1465d1]',
      icon: <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>,
    },
    {
      label: 'Email',
      href: `mailto:?subject=${enc(title)}&body=${enc(url)}`,
      bg: 'bg-gray-500 hover:bg-gray-600',
      icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
    },
  ];
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Share</span>
      {btns.map(b => (
        <a key={b.label} href={b.href} target="_blank" rel="noopener noreferrer" title={`Share on ${b.label}`}
          className={`${b.bg} text-white w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 hover:scale-110 shadow-sm`}>
          {b.icon}
        </a>
      ))}
      <button onClick={onCopy} title="Copy link"
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 hover:scale-110 shadow-sm mt-0.5 ${copied ? 'bg-emerald-500 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}>
        {copied
          ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
          : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>}
      </button>
    </div>
  );
}

// ── RELATED CARD (bottom grid) ────────────────────────────────────────────────
function RelatedCard({ blog }: { blog: BlogSummaryDto }) {
  return (
    <Link href={`/blog/${blog.slug}`}
      className="group flex flex-col rounded-2xl overflow-hidden border border-gray-100 hover:border-indigo-100 hover:shadow-xl transition-all duration-300 bg-white">
      <div className="relative h-44 bg-gradient-to-br from-indigo-50 to-purple-50 flex-shrink-0 overflow-hidden">
        {blog.coverImageUrl ? (
          <Image src={blog.coverImageUrl} alt={blog.title} fill
            className="object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-10 h-10 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        )}
        {blog.category && (
          <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
            {blog.category}
          </span>
        )}
      </div>
      <div className="flex flex-col flex-1 p-5">
        <h3 className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug mb-2">
          {blog.title}
        </h3>
        {blog.metaDescription && (
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-3">{blog.metaDescription}</p>
        )}
        <div className="mt-auto flex items-center justify-between text-[10px] text-gray-400 pt-3 border-t border-gray-50">
          <span>{formatDate(blog.publishedAt)}</span>
          <span className="text-indigo-500 font-semibold flex items-center gap-1 group-hover:gap-1.5 transition-all">
            Read
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function BlogDetailClient({ blog, related }: { blog: BlogDto; related: BlogSummaryDto[] }) {
  const [copied, setCopied] = useState(false);
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState('');
  const articleRef = useRef<HTMLDivElement>(null);

  useEffect(() => { publicBlogApi.trackView(blog.slug); }, [blog.slug]);

  // Extract headings from HTML for Table of Contents
  useEffect(() => {
    if (!blog.content) return;
    const div = document.createElement('div');
    div.innerHTML = blog.content;
    setTocItems(Array.from(div.querySelectorAll('h2, h3')).map((h, i) => ({
      id: h.id || `heading-${i}`,
      text: h.textContent?.trim() || '',
      level: parseInt(h.tagName[1]),
    })));
  }, [blog.content]);

  // Inject IDs + track active heading with IntersectionObserver
  useEffect(() => {
    if (!articleRef.current) return;
    const headings = Array.from(articleRef.current.querySelectorAll('h2, h3'));
    headings.forEach((h, i) => { if (!h.id) h.id = `heading-${i}`; });
    const obs = new IntersectionObserver(
      entries => { entries.forEach(e => { if (e.isIntersecting) setActiveId(e.target.id); }); },
      { rootMargin: '-15% 0% -75% 0%' }
    );
    headings.forEach(h => obs.observe(h));
    return () => obs.disconnect();
  }, [tocItems]);

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
      <TopNav title={blog.title} />

      <main className="min-h-screen bg-gray-50">

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section className="relative bg-black">
          {blog.coverImageUrl ? (
            <div className="relative h-[52vh] min-h-[340px] w-full">
              <Image src={blog.coverImageUrl} alt={blog.title} fill priority className="object-cover opacity-60" />
            </div>
          ) : (
            <div className="relative h-[44vh] min-h-[300px] w-full overflow-hidden bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]">
              <div className="absolute inset-0 opacity-30"
                style={{ backgroundImage: 'radial-gradient(circle at 25% 55%, #6366f1 0%, transparent 55%), radial-gradient(circle at 75% 20%, #a855f7 0%, transparent 50%)' }} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />

          <div className="absolute inset-0 flex flex-col justify-end">
            <div className="max-w-4xl mx-auto px-6 pb-10 w-full">
              <div className="flex items-center gap-2 flex-wrap mb-4">
                {blog.category && (
                  <span className="bg-indigo-500 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    {blog.category}
                  </span>
                )}
                <span className="bg-white/10 backdrop-blur-sm text-gray-200 text-xs px-2.5 py-1 rounded-full border border-white/10">
                  {formatDate(blog.publishedAt)}
                </span>
                <span className="bg-white/10 backdrop-blur-sm text-gray-200 text-xs px-2.5 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {mins} min read
                </span>
                <span className="bg-white/10 backdrop-blur-sm text-gray-200 text-xs px-2.5 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  {blog.viewCount.toLocaleString()} views
                </span>
              </div>

              <motion.h1
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}
                className="text-3xl md:text-[2.6rem] font-extrabold text-white leading-tight tracking-tight max-w-3xl"
              >
                {blog.title}
              </motion.h1>

              {blog.metaDescription && (
                <motion.p
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }}
                  className="text-gray-300 mt-3 text-base md:text-[1.05rem] max-w-2xl leading-relaxed"
                >
                  {blog.metaDescription}
                </motion.p>
              )}
            </div>
          </div>
        </section>

        {/* ── CONTENT ───────────────────────────────────────────────────────── */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex gap-8 xl:gap-10 items-start">

            {/* Left share bar — xl only */}
            <div className="hidden xl:flex flex-col items-center pt-4 w-10 flex-shrink-0 sticky top-20 self-start">
              <ShareBar url={canonicalUrl} title={blog.title} copied={copied} onCopy={copyLink} />
            </div>

            {/* ── ARTICLE ─────────────────────────────────────────────────── */}
            <article className="flex-1 min-w-0">

              {/* White article card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 md:px-10 py-8 md:py-10">
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-7">
                    {tags.map(t => (
                      <span key={t} className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full font-medium">#{t}</span>
                    ))}
                  </div>
                )}
                <div
                  ref={articleRef}
                  className="prose prose-lg prose-gray max-w-none
                    prose-headings:font-extrabold prose-headings:text-gray-900 prose-headings:tracking-tight prose-headings:scroll-mt-24
                    prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:border-b prose-h2:border-gray-100 prose-h2:pb-3
                    prose-h3:text-lg prose-h3:mt-7 prose-h3:mb-3
                    prose-p:text-gray-700 prose-p:leading-[1.88] prose-p:text-[16.5px]
                    prose-a:text-indigo-600 prose-a:font-medium prose-a:no-underline hover:prose-a:underline
                    prose-strong:text-gray-900 prose-strong:font-semibold
                    prose-blockquote:border-l-[3px] prose-blockquote:border-indigo-400 prose-blockquote:bg-indigo-50/60
                    prose-blockquote:rounded-r-xl prose-blockquote:pl-5 prose-blockquote:py-2 prose-blockquote:not-italic prose-blockquote:text-gray-700
                    prose-code:text-indigo-700 prose-code:bg-indigo-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[0.9em] prose-code:font-medium
                    prose-pre:bg-gray-950 prose-pre:rounded-xl prose-pre:shadow-lg
                    prose-img:rounded-xl prose-img:shadow-md prose-img:mx-auto
                    prose-li:text-gray-700 prose-li:leading-relaxed prose-hr:border-gray-100"
                  dangerouslySetInnerHTML={{ __html: blog.content }}
                />
              </div>

              {/* Mobile share */}
              <div className="xl:hidden mt-6 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Share this article</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { label: '𝕏 Twitter', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(blog.title)}&url=${encodeURIComponent(canonicalUrl)}`, cls: 'bg-black text-white' },
                    { label: 'LinkedIn', href: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(canonicalUrl)}&title=${encodeURIComponent(blog.title)}`, cls: 'bg-[#0077b5] text-white' },
                    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonicalUrl)}`, cls: 'bg-[#1877f2] text-white' },
                  ].map(s => (
                    <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                      className={`${s.cls} text-xs font-semibold px-3 py-1.5 rounded-xl hover:opacity-90 transition-opacity`}>
                      {s.label}
                    </a>
                  ))}
                  <button onClick={copyLink}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors ${copied ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    {copied ? '✓ Copied!' : 'Copy link'}
                  </button>
                </div>
              </div>

              {/* CTA Banner */}
              <motion.div
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="mt-6 relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-7 md:p-9 text-white shadow-xl"
              >
                <div className="absolute -top-8 -right-8 w-36 h-36 bg-white/10 rounded-full pointer-events-none" />
                <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-white/10 rounded-full pointer-events-none" />
                <div className="relative">
                  <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest mb-2">Start for free today</p>
                  <h3 className="text-xl md:text-2xl font-extrabold mb-2.5 leading-tight">
                    Close deals 3× faster with DocSignerHub
                  </h3>
                  <p className="text-indigo-100 text-sm mb-5 max-w-md">
                    Join 10,000+ businesses who automate their document workflows. No credit card required.
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Link href="/auth/register" className="bg-white text-indigo-700 font-bold px-5 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors shadow-md text-sm">
                      Start free trial →
                    </Link>
                    <Link href="/" className="text-indigo-200 font-semibold text-sm hover:text-white transition-colors flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      Back to home
                    </Link>
                  </div>
                  <p className="text-indigo-300 text-xs mt-4">✓ 14-day free trial · ✓ No card required · ✓ Cancel anytime</p>
                </div>
              </motion.div>

              {/* Related articles grid */}
              {related.length > 0 && (
                <section className="mt-10">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <span className="w-1 h-5 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full" />
                      <h2 className="text-base font-extrabold text-gray-900">You might also like</h2>
                    </div>
                    <Link href="/blog" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors">
                      All articles
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {related.map(r => <RelatedCard key={r.id} blog={r} />)}
                  </div>
                </section>
              )}
            </article>

            {/* ── SIDEBAR ───────────────────────────────────────────────────── */}
            <aside className="hidden lg:flex flex-col w-64 xl:w-72 flex-shrink-0 gap-5 self-start sticky top-20">

              {/* Author card */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    AI
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">DocSignerHub AI</p>
                    <p className="text-xs text-gray-400">Expert-reviewed content</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 pt-3 border-t border-gray-100">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {mins} min read
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    {blog.viewCount.toLocaleString()} views
                  </span>
                </div>
              </div>

              {/* Table of Contents */}
              {tocItems.length >= 2 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <TableOfContents items={tocItems} activeId={activeId} />
                </div>
              )}

              {/* Related articles */}
              {related.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-1 h-4 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Related Articles</h3>
                  </div>
                  <div className="space-y-3">
                    {related.slice(0, 4).map(r => (
                      <Link key={r.id} href={`/blog/${r.slug}`} className="flex gap-3 group py-2 border-b border-gray-50 last:border-0">
                        <div className="relative w-14 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-indigo-50 to-purple-50">
                          {r.coverImageUrl && <Image src={r.coverImageUrl} alt={r.title} fill className="object-cover group-hover:scale-105 transition-transform" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">{r.title}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(r.publishedAt)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <Link href="/blog" className="mt-4 flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                    View all articles
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </Link>
                </div>
              )}

              {/* Newsletter */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 p-5 text-white shadow-lg">
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-indigo-500/20 rounded-full pointer-events-none" />
                <div className="relative">
                  <p className="text-base mb-1">📬 Weekly digest</p>
                  <h4 className="font-bold text-sm mb-1.5">Expert insights, every Tuesday.</h4>
                  <p className="text-xs text-slate-400 mb-3">Join 8,000+ professionals</p>
                  <Link href="/auth/register" className="block w-full text-center bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold py-2.5 rounded-xl transition-colors">
                    Get it free →
                  </Link>
                </div>
              </div>

              {/* Back links */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col gap-2.5">
                <Link href="/blog" className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors group">
                  <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  All articles
                </Link>
                <Link href="/" className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors group">
                  <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                  Back to home
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
