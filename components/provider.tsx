'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { AlertCircle, CheckCircle2, X, WifiOff } from 'lucide-react';
import type { Role, Snapshot } from '@/lib/domain';
import { createIdempotencyKey } from '@/lib/client/idempotency';
import { orderNotices } from '@/lib/client/notifications';
import { usePathname } from 'next/navigation';
import { LoadingExperience } from './loading-experience';

interface AppContextValue {
  state: Snapshot | null;
  loading: boolean;
  busy: boolean;
  error: string;
  refresh: () => Promise<boolean>;
  refreshing: boolean;
  clearError: () => void;
  action: (payload: Record<string, unknown>) => Promise<boolean>;
  login: (
    role: Role,
    demo: boolean,
    email?: string,
    password?: string,
  ) => Promise<boolean>;
  logout: () => Promise<boolean>;
  account: (payload: Record<string, unknown>) => Promise<boolean>;
  toast: (message: string) => void;
  notices: string[];
}
const AppContext = createContext<AppContextValue | null>(null);

// The loading screen belongs to the signed-in workspaces only. Landing and the
// sign-in pages never show it; they simply fade between each other. From the
// moment a sign-in succeeds the screen stays up, uninterrupted, until the
// workspace has its data, and never for less than MIN_SPLASH_MS so it can be
// seen and does not flash.
const APP_ROUTES = ['/customer', '/mahasiswa', '/gerai', '/pengelola'];
const MIN_SPLASH_MS = 2400;
const HANDOFF_TIMEOUT_MS = 12000;
const isAppRoute = (pathname: string) =>
  APP_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

export function AppProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const space =
    pathname.startsWith('/gerai') ||
    pathname.startsWith('/masuk/gerai') ||
    pathname.startsWith('/pengelola') ||
    pathname.startsWith('/akses-pengelola')
      ? 'work'
      : 'customer';
  const spaceRef = useRef(space);
  spaceRef.current = space;
  const [state, setState] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [entering, setEntering] = useState(false);
  // A sign-in just succeeded and the destination workspace is still loading.
  const [handoff, setHandoff] = useState(false);
  const [entryRole, setEntryRole] = useState<Role>('student');
  const [error, setError] = useState('');
  const [notification, setNotification] = useState('');
  const [notices, setNotices] = useState<string[]>([]);
  const previousState = useRef<Snapshot | null>(null);
  const [errorToast, setErrorToast] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const clearError = useCallback(() => setError(''), []);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  const generation = useRef(0);
  const refreshTask = useRef<{
    space: string;
    controller: AbortController;
    promise: Promise<boolean>;
  } | null>(null);
  const pendingActions = useRef(new Map<string, string>());
  const appRoute = isAppRoute(pathname);
  const wantSplash = entering || handoff || (loading && appRoute);
  useEffect(() => {
    if (!handoff) return;
    if (appRoute && !loading) {
      setHandoff(false);
      return;
    }
    const id = setTimeout(() => setHandoff(false), HANDOFF_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [handoff, appRoute, loading]);
  const [splash, setSplash] = useState(appRoute);
  const splashShownAt = useRef<number | null>(null);
  const entryFailed = useRef(false);
  useEffect(() => {
    if (wantSplash) {
      splashShownAt.current ??= Date.now();
      entryFailed.current = false;
      setSplash(true);
      return;
    }
    const shownAt = splashShownAt.current;
    const hide = () => {
      splashShownAt.current = null;
      setSplash(false);
    };
    if (shownAt === null || entryFailed.current) {
      entryFailed.current = false;
      hide();
      return;
    }
    const wait = Math.max(120, MIN_SPLASH_MS - (Date.now() - shownAt));
    const id = setTimeout(hide, wait);
    return () => clearTimeout(id);
  }, [wantSplash]);
  const toast = useCallback((message: string) => {
    setErrorToast(false);
    setNotification(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotification(''), 5000);
  }, []);
  useEffect(() => {
    const previous = previousState.current;
    previousState.current = state;
    if (!state?.user || state.user.id !== previous?.user?.id) {
      setNotices([]);
      return;
    }
    const messages = orderNotices(
      [...previous.orders, ...previous.claims],
      [...state.orders, ...state.claims],
      state.user.role,
    );
    if (!messages.length) return;
    setNotices((items) => [...messages, ...items].slice(0, 20));
    const message =
      messages.length > 1
        ? `${messages.length} pembaruan pesanan. ${messages[0]}`
        : messages[0];
    toast(message);
    if (
      'Notification' in window &&
      Notification.permission === 'granted' &&
      document.hidden
    )
      new Notification('PORSI LOOP', { body: message, icon: '/icon.png' });
  }, [state, toast]);
  const refresh = useCallback((): Promise<boolean> => {
    if (inFlight.current) return Promise.resolve(false);
    const requestedSpace = spaceRef.current;
    if (refreshTask.current?.space === requestedSpace)
      return refreshTask.current.promise;
    refreshTask.current?.controller.abort();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const version = ++generation.current;
    setRefreshing(true);
    const promise = (async () => {
      try {
        const response = await fetch(`/api/state?space=${requestedSpace}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(
            result.error || 'Data belum dapat dimuat. Coba lagi.',
          );
        if (version === generation.current) {
          setState(result);
          setError('');
        }
        return true;
      } catch (e) {
        if (version === generation.current)
          setError(
            controller.signal.aborted
              ? 'Koneksi belum merespons. Periksa internet, lalu coba lagi.'
              : e instanceof Error
                ? e.message
                : 'Koneksi terputus. Coba lagi.',
          );
        return false;
      } finally {
        clearTimeout(timeout);
        if (refreshTask.current?.controller === controller) {
          refreshTask.current = null;
          setRefreshing(false);
        }
        if (version === generation.current) setLoading(false);
      }
    })();
    refreshTask.current = { space: requestedSpace, controller, promise };
    return promise;
  }, []);
  useEffect(() => {
    const sync = () => {
      if (!document.hidden) void refresh();
    };
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', sync);
    const id = setInterval(() => {
      // A hidden tab skips polling; it refreshes again when it regains focus.
      if (!inFlight.current && !document.hidden) void refresh();
    }, 4000);
    return () => {
      window.removeEventListener('focus', sync);
      document.removeEventListener('visibilitychange', sync);
      clearInterval(id);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [refresh]);
  useEffect(() => {
    refreshTask.current?.controller.abort();
    refreshTask.current = null;
    generation.current++;
    setState(null);
    setLoading(true);
    void refresh();
  }, [space, pathname, refresh]);
  const mutate = async (
    url: string,
    method: string,
    payload?: Record<string, unknown>,
  ) => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setBusy(true);
    const isEntry =
      method === 'POST' &&
      (url === '/api/auth' ||
        (url === '/api/accounts' && payload?.type === 'register'));
    if (isEntry) {
      setEntryRole(
        payload?.role === 'admin' || payload?.role === 'seller'
          ? payload.role
          : 'student',
      );
      setEntering(true);
    }
    setError('');
    generation.current += 1;
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Porsi-Space': spaceRef.current,
        },
        body: payload ? JSON.stringify(payload) : undefined,
        signal: AbortSignal.timeout(20000),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error || 'Perubahan belum tersimpan. Coba lagi.',
        );
      if (result.verificationRequired) {
        if (isEntry) entryFailed.current = true;
        toast(result.message);
        return false;
      }
      setState(result);
      if (isEntry) setHandoff(true);
      return true;
    } catch (e) {
      if (isEntry) {
        entryFailed.current = true;
        setHandoff(false);
      }
      const message =
        e instanceof TypeError ||
        (e instanceof Error && ['TimeoutError', 'AbortError'].includes(e.name))
          ? 'Koneksi belum merespons. Periksa internet lalu coba lagi; tindakan yang sama tidak akan digandakan.'
          : e instanceof Error
            ? e.message
            : 'Koneksi terputus. Coba lagi.';
      setError(message);
      toast(message);
      setErrorToast(true);
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
      setEntering(false);
      setLoading(false);
    }
  };
  const action = async (payload: Record<string, unknown>) => {
    // A lost response is ambiguous: retry the same intent with the same key.
    // Clear it only after the server confirms success, including a replay.
    const intent = JSON.stringify([state?.sessionId, payload]);
    const key = pendingActions.current.get(intent) ?? createIdempotencyKey();
    pendingActions.current.set(intent, key);
    const success = await mutate('/api/actions', 'POST', {
      ...payload,
      idempotencyKey: key,
    });
    if (success) pendingActions.current.delete(intent);
    return success;
  };
  return (
    <MotionConfig reducedMotion="user">
      <AppContext.Provider
        value={{
          state,
          loading,
          busy,
          error,
          refresh,
          refreshing,
          clearError,
          toast,
          notices,
          action,
          account: (payload) => mutate('/api/accounts', 'POST', payload),
          login: async (role, demo, email, password) => {
            const success = await mutate('/api/auth', 'POST', {
              role,
              demo,
              email,
              password,
            });
            if (success) pendingActions.current.clear();
            return success;
          },
          logout: async () => {
            const success = await mutate('/api/auth', 'DELETE');
            if (success) pendingActions.current.clear();
            return success;
          },
        }}
      >
        {children}
        <AnimatePresence initial={false}>
          {splash && (
            <motion.div
              className="session-splash"
              key="session-entry"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } }}
              exit={{ opacity: 0, transition: { duration: 0.7, ease: 'easeInOut' } }}
            >
              <LoadingExperience
                role={
                  entering || handoff
                    ? entryRole
                    : pathname.startsWith('/pengelola') ||
                        pathname.startsWith('/akses-pengelola')
                      ? 'admin'
                      : pathname.startsWith('/gerai') ||
                          pathname.startsWith('/masuk/gerai')
                        ? 'seller'
                        : 'student'
                }
              />
            </motion.div>
          )}
        </AnimatePresence>
        {error && !state && !loading && (
          <div className="connection-error" role="alert">
            <WifiOff size={20} />
            <span>{error}</span>
            <button onClick={() => void refresh()}>Coba lagi</button>
          </div>
        )}
        <div
          className="toast-region"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <AnimatePresence>
            {notification && (
              <motion.div
                className={`toast ${errorToast ? 'toast-error' : ''}`}
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12 }}
              >
                {errorToast ? (
                  <AlertCircle size={21} />
                ) : (
                  <CheckCircle2 size={21} />
                )}
                <span>{notification}</span>
                <button
                  aria-label="Tutup pemberitahuan"
                  onClick={() => setNotification('')}
                >
                  <X size={18} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </AppContext.Provider>
    </MotionConfig>
  );
}
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('AppProvider diperlukan');
  return context;
}
