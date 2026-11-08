'use client';
import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, ArrowLeft, Send } from 'lucide-react';
import { useApp } from './provider';
import { clock } from '@/lib/domain';
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
  return (
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
      {open && (
        <section
          className="order-chat glass"
          role="dialog"
          aria-modal="false"
          aria-label="Chat pesanan"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
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
              onClick={() => setOpen(false)}
            >
              <X size={20} />
            </button>
          </header>
          {!ticket ? (
            <div className="chat-list">
              {tickets.length === 0 ? (
                <p className="muted">
                  Chat tersedia setelah kamu membuat pesanan. Pilih menu
                  terlebih dahulu.
                </p>
              ) : (
                tickets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelected(t.id);
                      setDraft('');
                    }}
                  >
                    <MessageCircle size={22} />
                    <span>
                      <strong>
                        {user.role === 'seller'
                          ? t.customer
                          : t.outletName || t.menuName}
                      </strong>
                      <small>
                        {t.code} · {t.menuName}
                      </small>
                      <p>
                        {t.messages?.at(-1)?.text ||
                          'Ada yang ingin dikonfirmasi? Kirim pesan.'}
                      </p>
                    </span>
                    <small>{t.messages?.length || 0}</small>
                  </button>
                ))
              )}
            </div>
          ) : (
            <>
              <div
                className="chat-messages"
                aria-live="polite"
                aria-relevant="additions"
              >
                <p className="chat-context">
                  Pesan hanya dibaca customer dan gerai terkait. Pembayaran dan
                  pengambilan tetap melalui tiket pesanan.
                </p>
                {!ticket.messages?.length && (
                  <p className="muted">
                    Mulai dengan sapaan atau konfirmasi pesananmu.
                  </p>
                )}
                {ticket.messages?.map((m) => (
                  <div
                    className={`chat-bubble ${m.role === user.role ? 'mine' : ''}`}
                    key={m.id}
                  >
                    <strong>{m.role === 'seller' ? 'Gerai' : m.name}</strong>
                    <p>{m.text}</p>
                    <small>{clock(m.at)}</small>
                  </div>
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
        </section>
      )}
    </>
  );
}
