'use client';
import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';

// True once the first page has mounted. The first render (server HTML and
// hydration) must not start at opacity 0 or the page would flash blank; only
// later navigations fade in.
let navigated = false;

export default function Template({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const fade = useRef(navigated).current && !reduced;
  useEffect(() => {
    navigated = true;
  }, []);
  return (
    <motion.div
      initial={fade ? { opacity: 0, y: 12 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
