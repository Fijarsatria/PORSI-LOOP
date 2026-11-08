"use client";

import { useEffect, useId, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Inbox, LoaderCircle, X, type LucideIcon } from "lucide-react";
import Link from "next/link";

export function Brand({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return <Link href="/" className={`brand ${light ? "brand-light" : ""}`} aria-label="PORSI LOOP, beranda"><span className="brand-symbol"><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M21.2 5.2a11.8 11.8 0 1 0 6.4 13" stroke="currentColor" strokeWidth="3.3" strokeLinecap="round"/><path d="M10.7 25.6a11.8 11.8 0 1 0-6.3-13" stroke="currentColor" strokeWidth="3.3" strokeLinecap="round"/><path d="M12 17.6c1.1-4.2 4-6.3 9-6.4-1.4 4.6-4.1 7-8.3 6.9" fill="currentColor"/></svg></span>{!compact && <span>PORSI<span className="brand-loop">LOOP</span><span className="brand-dot">.</span></span>}</Link>;
}
export function Button({ children, variant = "primary", className = "", loading, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "dark"; loading?: boolean }) {
  return <button className={`button button-${variant} ${className}`} {...props} disabled={props.disabled || loading}>{loading && <LoaderCircle size={18} className="spin"/>}{children}</button>;
}
export function Badge({ children, tone = "green" }: { children: React.ReactNode; tone?: "green" | "orange" | "neutral" }) { return <span className={`badge badge-${tone}`}>{children}</span>; }
export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) { return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>; }
export function EmptyState({ icon: Icon = Inbox, title, description }: { icon?: LucideIcon; title: string; description: string }) { return <div className="empty-state"><span className="empty-icon"><Icon size={28}/></span><h3>{title}</h3><p>{description}</p></div>; }
export function Stat({ label, value, note, icon: Icon }: { label: string; value: React.ReactNode; note?: string; icon?: LucideIcon }) { return <article className="stat"><div className="stat-top"><span>{label}</span>{Icon && <Icon size={18}/>}</div><strong>{value}</strong>{note && <small>{note}</small>}</article>; }
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const node = dialog.current;
    if (open && node && !node.open) node.showModal();
    if (!open && node?.open) node.close();
    if (open) { const previous = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = previous; }; }
  }, [open]);
  return <dialog ref={dialog} className="modal-dialog" aria-labelledby={titleId} onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === dialog.current) onClose(); }}><AnimatePresence>{open && <motion.div className="modal-content" initial={{ opacity: 0, y: 35, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16 }} transition={{ type: "spring", stiffness: 320, damping: 30 }}><div className="modal-header"><h2 id={titleId}>{title}</h2><button className="icon-button" aria-label="Tutup dialog" onClick={onClose}><X size={22}/></button></div>{children}</motion.div>}</AnimatePresence></dialog>;
}
export function SectionHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) { return <div className="section-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2>{description && <p className="muted">{description}</p>}</div>{action}</div>; }
export function LinkButton({ href, children, variant = "primary", arrow = false, className = "" }: { href: string; children: React.ReactNode; variant?: string; arrow?: boolean; className?: string }) { return <Link href={href} className={`button button-${variant} ${className}`}>{children}{arrow && <ArrowRight size={18}/>}</Link>; }
export function PageLoading() { return <div className="page-loading" aria-label="Memuat halaman" role="status"><span className="skeleton skeleton-title"/><span className="skeleton skeleton-subtitle"/><div className="stat-grid">{[1, 2, 3, 4].map(n => <span key={n} className="skeleton skeleton-card"/>)}</div><span className="skeleton skeleton-large"/></div>; }
