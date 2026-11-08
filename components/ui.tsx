'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  Inbox,
  LoaderCircle,
  X,
  type LucideIcon,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useApp } from './provider';

export function Brand({
  light = false,
  compact = false,
}: {
  light?: boolean;
  compact?: boolean;
}) {
  return (
    <Link
      href="/"
      className={`brand ${light ? 'brand-light' : ''}`}
      aria-label="PORSI LOOP, beranda"
    >
      <span className="brand-symbol">
        <Image src="/brand/logo.png" alt="" width={160} height={136} priority />
      </span>
      {!compact && (
        <span>
          PORSI
          <span className="brand-loop">
            L
            <Image
              className="brand-loop-mark"
              src="/brand/loop.png"
              alt="OO"
              width={47}
              height={18}
              unoptimized
            />
            P
          </span>
          <span className="brand-dot">.</span>
        </span>
      )}
    </Link>
  );
}
export function Button({
  children,
  variant = 'primary',
  className = '',
  loading,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'dark';
  loading?: boolean;
}) {
  return (
    <button
      className={`button button-${variant} ${className}`}
      {...props}
      disabled={props.disabled || loading}
    >
      {loading && <LoaderCircle size={18} className="spin" />}
      {children}
    </button>
  );
}
export function Badge({
  children,
  tone = 'green',
}: {
  children: React.ReactNode;
  tone?: 'green' | 'orange' | 'neutral';
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon size={28} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
export function Stat({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  note?: string;
  icon?: LucideIcon;
}) {
  return (
    <article className="stat">
      <div className="stat-top">
        <span>{label}</span>
        {Icon && <Icon size={18} />}
      </div>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </article>
  );
}
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const openRef = useRef(open);
  openRef.current = open;
  const [present, setPresent] = useState(false);
  const titleId = useId();
  const reduced = useReducedMotion();
  const { error, clearError } = useApp();
  useEffect(() => {
    if (open) {
      clearError();
      setPresent(true);
      if (dialog.current && !dialog.current.open) dialog.current.showModal();
    }
  }, [open, clearError]);
  useEffect(() => {
    if (!present) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [present]);
  const finishExit = () => {
    if (!openRef.current) {
      dialog.current?.close();
      setPresent(false);
    }
  };
  return (
    <dialog
      ref={dialog}
      className="modal-dialog"
      data-closing={!open && present ? 'true' : undefined}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialog.current) onClose();
      }}
    >
      <AnimatePresence initial={false} onExitComplete={finishExit}>
        {open && (
          <motion.div
            key="sheet"
            className="modal-content"
            initial={{
              opacity: 0,
              y: reduced ? 0 : 28,
              scale: reduced ? 1 : 0.98,
            }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{
              opacity: 0,
              y: reduced ? 0 : 18,
              scale: reduced ? 1 : 0.985,
            }}
            transition={{
              duration: reduced ? 0.08 : 0.22,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <div className="modal-header">
              <h2 id={titleId}>{title}</h2>
              <button
                className="icon-button"
                aria-label="Tutup dialog"
                onClick={onClose}
              >
                <X size={22} />
              </button>
            </div>
            {error && (
              <p className="form-error modal-error" role="alert">
                {error}
              </p>
            )}
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </dialog>
  );
}
export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  level = 2,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  level?: 1 | 2;
}) {
  const Heading = level === 1 ? 'h1' : 'h2';
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <Heading>{title}</Heading>
        {description && <p className="muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function LinkButton({
  href,
  children,
  variant = 'primary',
  arrow = false,
  className = '',
}: {
  href: string;
  children: React.ReactNode;
  variant?: string;
  arrow?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={`button button-${variant} ${className}`}>
      {children}
      {arrow && <ArrowRight size={18} />}
    </Link>
  );
}
export function PageLoading() {
  return (
    <div className="page-loading" aria-label="Memuat halaman" role="status">
      <span className="skeleton skeleton-title" />
      <span className="skeleton skeleton-subtitle" />
      <div className="stat-grid">
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className="skeleton skeleton-card" />
        ))}
      </div>
      <span className="skeleton skeleton-large" />
    </div>
  );
}
