"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { CheckCircle2, X, WifiOff } from "lucide-react";
import type { Role, Snapshot } from "@/lib/domain";

interface AppContextValue {
  state: Snapshot | null;
  loading: boolean;
  busy: boolean;
  error: string;
  refresh: () => Promise<void>;
  action: (payload: Record<string, unknown>) => Promise<boolean>;
  login: (role: Role, demo: boolean, email?: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  toast: (message: string) => void;
}
const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  const generation = useRef(0);
  const pendingActions = useRef(new Map<string, string>());
  const toast = useCallback((message: string) => {
    setNotification(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotification(""), 5000);
  }, []);
  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    const version = ++generation.current;
    try {
      const response = await fetch("/api/state", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Data belum dapat dimuat. Coba lagi.");
      if (version === generation.current) { setState(result); setError(""); }
    } catch (e) { if (version === generation.current) setError(e instanceof Error ? e.message : "Koneksi terputus. Coba lagi."); }
    finally { if (version === generation.current) setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); const id = setInterval(() => { if (!document.hidden && !inFlight.current) void refresh(); }, 15000); return () => { clearInterval(id); if (timer.current) clearTimeout(timer.current); }; }, [refresh]);
  const mutate = async (url: string, method: string, payload?: Record<string, unknown>) => {
    if (inFlight.current) return false;
    inFlight.current = true; setBusy(true); setError("");
    generation.current += 1;
    try {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: payload ? JSON.stringify(payload) : undefined });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Perubahan belum tersimpan. Coba lagi.");
      setState(result); return true;
    } catch (e) { const message = e instanceof Error ? e.message : "Koneksi terputus. Coba lagi."; setError(message); toast(message); return false; }
    finally { inFlight.current = false; setBusy(false); setLoading(false); }
  };
  const action = async (payload: Record<string, unknown>) => {
    // A lost response is ambiguous: retry the same intent with the same key.
    // Clear it only after the server confirms success, including a replay.
    const intent = JSON.stringify([state?.sessionId, payload]);
    const key = pendingActions.current.get(intent) ?? crypto.randomUUID();
    pendingActions.current.set(intent, key);
    const success = await mutate("/api/actions", "POST", { ...payload, idempotencyKey: key });
    if (success) pendingActions.current.delete(intent);
    return success;
  };
  return <MotionConfig reducedMotion="user"><AppContext.Provider value={{ state, loading, busy, error, refresh, toast, action, login: async (role, demo, email, password) => { const success = await mutate("/api/auth", "POST", { role, demo, email, password }); if (success) pendingActions.current.clear(); return success; }, logout: async () => { if (await mutate("/api/auth", "DELETE")) pendingActions.current.clear(); } }}>
    {children}
    {error && !state && !loading && <div className="connection-error" role="alert"><WifiOff size={20}/><span>{error}</span><button onClick={() => void refresh()}>Coba lagi</button></div>}
    <div className="toast-region" role="status" aria-live="polite" aria-atomic="true"><AnimatePresence>{notification && <motion.div className="toast" initial={{ opacity: 0, y: 20, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }}><CheckCircle2 size={21}/><span>{notification}</span><button aria-label="Tutup pemberitahuan" onClick={() => setNotification("")}><X size={18}/></button></motion.div>}</AnimatePresence></div>
  </AppContext.Provider></MotionConfig>;
}
export function useApp() { const context = useContext(AppContext); if (!context) throw new Error("AppProvider diperlukan"); return context; }
