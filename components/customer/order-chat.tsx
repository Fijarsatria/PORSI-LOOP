'use client';
import { useState, useRef, useEffect } from 'react';
import {
  MessageCircle,
  X,
  ArrowLeft,
  Send,
  ChevronRight,
  ShieldCheck,
  Utensils,
  ShoppingBag,
} from 'lucide-react';
import { useApp } from '../provider';
import { AnimatePresence, motion } from 'motion/react';
import { createPortal } from 'react-dom';
import { clock, statusNames } from '@/lib/domain';
export function OrderChat() {
  const { state, action, busy } = useApp();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('');
  const [draft, setDraft] = useState('');
  const [seen, setSeen] = useState<Record<string, number>>({});
  const bottom = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const tickets = [...(state?.orders ?? []), ...(state?.claims ?? [])].sort(
    (a, b) =>
      (b.messages?.at(-1)?.at ?? b.createdAt).localeCompare(
        a.messages?.at(-1)?.at ?? a.createdAt,
      ),
  );
  const ticket = tickets.find((t) => t.id === selected);
  const user = state?.user;
  useEffect(() => {
    if (open) {
      if (ticket) composer.current?.focus();
      else close.current?.focus();
    }
  }, [open, ticket?.id]);
  useEffect(() => {
    if (open && ticket) {
      setSeen((s) => ({ ...s, [ticket.id]: ticket.messages?.length ?? 0 }));
      bottom.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [open, ticket?.id, ticket?.messages?.length]);
  if (!user || user.role === 'admin') return null;
  const unread = tickets.reduce(
    (n, t) =>
      n +
      (t.messages ?? [])
        .slice(seen[t.id] ?? 0)
        .filter((m) => m.role !== user.role).length,
    0,
  );
  const dismiss = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  return createPortal(
    <>
      <button
        ref={trigger}
        className="chat-fab"
        aria-label="Buka chat pesanan"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MessageCircle size={24} />
        {unread > 0 && <b>{unread > 99 ? '99+' : unread}</b>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.section
            className="order-chat glass"
            initial={{ opacity: 0, y: 22, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ type: 'spring', bounce: 0.12, duration: 0.32 }}
            role="dialog"
            aria-modal="false"
            aria-label="Chat pesanan"
            onKeyDown={(e) => {
              if (e.key === 'Escape') dismiss();
            }}
          >
            <header>
              {ticket && (
                <button
                  className="icon-button"
                  aria-label="Kembali ke daftar chat"
                  onClick={() => setSelected('')}
                >
                  <ArrowLeft size={20} />
                </button>
              )}
              {!ticket && (
                <span className="chat-header-icon">
                  <MessageCircle size={22} />
                </span>
              )}
              <div>
                <strong>
                  {ticket
                    ? user.role === 'seller'
                      ? ticket.customer
                      : ticket.outletName || ticket.menuName
                    : 'Chat pesanan'}
                </strong>
                <small>
                  {ticket ? ticket.code : 'Konfirmasi langsung dengan gerai'}
                </small>
              </div>
              <button
                ref={close}
                className="icon-button"
                aria-label="Tutup chat"
                onClick={dismiss}
              >
                <X size={20} />
              </button>
            </header>
            {!ticket ? (
              <div className="chat-list">
                {tickets.length === 0 ? (
                  <div className="chat-empty">
                    <span>
                      <MessageCircle size={32} />
                    </span>
                    <h3>Obrolan dimulai dari pesanan</h3>
                    <p>Setelah memesan, kamu bisa menghubungi gerai di sini.</p>
                  </div>
                ) : (
                  tickets.map((t) => {
                    const unreadCount = (t.messages ?? [])
                      .slice(seen[t.id] ?? 0)
                      .filter((m) => m.role !== user.role).length;
                    const last = t.messages?.at(-1);
                    return (
                      <button
                        className="chat-thread"
                        key={t.id}
                        onClick={() => {
                          setSelected(t.id);
                          setDraft('');
                        }}
                      >
                        <span className="chat-thread-avatar">
                          <Utensils size={23} />
                        </span>
                        <span className="chat-thread-copy">
                          <span className="chat-thread-title">
                            <strong>
                              {user.role === 'seller'
                                ? t.customer
                                : t.outletName || t.menuName}
                            </strong>
                            <small>{clock(last?.at ?? t.createdAt)}</small>
                          </span>
                          <span className="chat-thread-order">
                            {t.code} · {t.menuName}
                          </span>
                          <span className="chat-thread-preview">
                            {last?.role === user.role ? 'Anda: ' : ''}
                            {last?.text || 'Tanyakan atau konfirmasi pesananmu'}
                          </span>
                          <span
                            className={`chat-order-status ${t.status === 'ready' ? 'ready' : ''}`}
                          >
                            {statusNames[t.status]}
                          </span>
                        </span>
                        {unreadCount > 0 ? (
                          <b
                            className="chat-unread"
                            aria-label={`${unreadCount} pesan belum dibaca`}
                          >
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </b>
                        ) : (
                          <ChevronRight
                            size={17}
                            className="chat-thread-chevron"
                          />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            ) : (
              <>
                <div
                  className="chat-messages"
                  aria-live="polite"
                  aria-relevant="additions"
                >
                  <div className="chat-ticket-context">
                    <ShoppingBag size={18} />
                    <span>
                      <strong>{ticket.menuName}</strong>
                      <small>
                        {ticket.code} · {statusNames[ticket.status]}
                      </small>
                    </span>
                  </div>
                  <p className="chat-context">
                    <ShieldCheck size={13} /> Hanya kamu dan{' '}
                    {user.role === 'seller' ? 'customer' : 'gerai'} yang bisa
                    membaca chat ini.
                  </p>
                  {!ticket.messages?.length && (
                    <div className="chat-empty chat-empty-conversation">
                      <MessageCircle size={28} />
                      <p>Sapa gerai atau tanyakan pesananmu.</p>
                    </div>
                  )}
                  {ticket.messages?.map((m) => (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`chat-bubble ${m.role === user.role ? 'mine' : ''}`}
                      key={m.id}
                    >
                      <strong>{m.role === 'seller' ? 'Gerai' : m.name}</strong>
                      <p>{m.text}</p>
                      <small>{clock(m.at)}</small>
                    </motion.div>
                  ))}
                  <div ref={bottom} />
                </div>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (
                      await action({
                        type: 'send_message',
                        orderId: ticket.id,
                        message: draft,
                      })
                    )
                      setDraft('');
                  }}
                >
                  <label className="sr-only" htmlFor="chat-message">
                    Pesan untuk {user.role === 'seller' ? 'customer' : 'gerai'}
                  </label>
                  <textarea
                    ref={composer}
                    id="chat-message"
                    value={draft}
                    maxLength={1000}
                    rows={2}
                    placeholder="Tulis pesan…"
                    onChange={(e) => setDraft(e.target.value)}
                    required
                  />
                  <button
                    className="button button-primary"
                    disabled={busy || !draft.trim()}
                    aria-label="Kirim pesan"
                  >
                    <Send size={20} />
                  </button>
                </form>
              </>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </>,
    document.body,
  );
}
