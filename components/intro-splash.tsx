'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'motion/react';
import { INTRO_KEY } from './intro-gate';
import './intro-splash.css';

const INTRO_MS = 3000;
const INTRO_REDUCED_MS = 1400;

/** Brand intro shown the first time the site opens in a tab. */
export function IntroSplash() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const root = document.documentElement;
    if (root.getAttribute('data-intro') === 'skip') {
      setVisible(false);
      return;
    }
    try {
      sessionStorage.setItem(INTRO_KEY, '1');
    } catch {
      /* private mode: the intro may show again, which is harmless */
    }
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)')
      .matches
      ? INTRO_REDUCED_MS
      : INTRO_MS;
    root.classList.add('intro-lock');
    const timer = setTimeout(() => {
      // Release scrolling as the intro starts to fade, not on unmount: the
      // intro lives in the root layout and never unmounts.
      root.classList.remove('intro-lock');
      setVisible(false);
    }, duration);
    return () => {
      clearTimeout(timer);
      root.classList.remove('intro-lock');
    };
  }, []);

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          key="intro"
          className="intro-splash"
          role="status"
          aria-label="Memuat PORSI LOOP"
          exit={{ opacity: 0, transition: { duration: 0.8, ease: 'easeInOut' } }}
          style={{ ['--intro-ms' as string]: `${INTRO_MS}ms` }}
        >
          <div className="intro-stage">
            <div className="intro-orbit" aria-hidden="true">
              <span />
              <span />
            </div>
            <Image
              className="intro-logo"
              src="/brand/logo.png"
              alt=""
              width={160}
              height={136}
              priority
              unoptimized
            />
          </div>
          <p className="intro-word" aria-hidden="true">
            PORSI
            <span>
              L
              <Image
                src="/brand/loop.png"
                alt=""
                width={47}
                height={18}
                priority
                unoptimized
              />
              P
            </span>
            <i>.</i>
          </p>
          <ul className="intro-tagline" aria-hidden="true">
            <li>Rencanakan sebelum memasak</li>
            <li>Selamatkan bila tersisa</li>
            <li>Ukur dampaknya</li>
          </ul>
          <div className="intro-progress" aria-hidden="true">
            <span />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
