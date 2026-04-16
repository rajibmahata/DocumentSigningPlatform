'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';

/**
 * Replace DEMO_VIDEO_ID with your real YouTube video ID.
 * e.g. for https://www.youtube.com/watch?v=abc123  →  'abc123'
 */
const DEMO_VIDEO_ID = 'REPLACE_WITH_YOUR_VIDEO_ID';

export function VideoExplainer() {
  const [playing, setPlaying] = useState(false);

  return (
    <section id="demo" className="py-24 bg-gray-900">
      <div className="mx-auto max-w-5xl px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block rounded-full bg-brand-900 border border-brand-700 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-brand-300 mb-4">
            Watch &amp; Learn
          </span>
          <h2 className="text-3xl font-bold text-white sm:text-4xl">See It in Action</h2>
          <p className="mt-4 text-gray-400 max-w-xl mx-auto text-base">
            A quick 2-minute walkthrough showing exactly how to send and sign a document — start to finish.
          </p>
        </div>

        {/* Video container */}
        <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-video bg-gray-800 ring-1 ring-white/10">
          {playing && DEMO_VIDEO_ID !== 'REPLACE_WITH_YOUR_VIDEO_ID' ? (
            <iframe
              className="absolute inset-0 w-full h-full"
              src={`https://www.youtube.com/embed/${DEMO_VIDEO_ID}?autoplay=1&rel=0&modestbranding=1`}
              title="DocSignerHub — How to Send &amp; Sign Documents"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            /* Thumbnail / play overlay */
            <div className="absolute inset-0 bg-gradient-to-br from-brand-900/70 via-gray-900/60 to-gray-900/80 flex flex-col items-center justify-center">
              {/* Decorative blobs */}
              <div className="pointer-events-none absolute -top-20 -left-20 h-64 w-64 rounded-full bg-brand-600 opacity-20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-blue-500 opacity-20 blur-3xl" />

              {/* Playback steps preview */}
              <div className="mb-8 flex items-center gap-3 flex-wrap justify-center px-4">
                {['Upload', 'Add Signers', 'Send', 'Sign', 'Download'].map((label, i) => (
                  <span
                    key={label}
                    className="flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs text-white/80"
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
                      {i + 1}
                    </span>
                    {label}
                  </span>
                ))}
              </div>

              {/* Play button */}
              <button
                onClick={() => setPlaying(true)}
                aria-label="Play demo video"
                className="group flex h-20 w-20 items-center justify-center rounded-full bg-brand-600 text-white shadow-2xl hover:bg-brand-500 hover:scale-105 active:scale-95 transition-all"
              >
                <Play className="h-8 w-8 ml-1" fill="currentColor" />
              </button>

              <p className="mt-5 text-white font-semibold text-lg">Watch the Demo</p>
              <p className="text-gray-400 text-sm mt-1">2 min · No sign-up needed to watch</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
