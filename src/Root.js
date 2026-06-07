import { useState, useEffect, useRef } from "react";
import App from "./App";
import Auth from "./Auth";
import { signOut, refreshSession } from "./supabase";

const KEY = "crm_session";

export default function Root() {
  const [session,  setSession]  = useState(null);
  const [checking, setChecking] = useState(true);
  const timerRef = useRef(null);

  // ── Save & schedule ───────────────────────────────────────────────
  const applySession = (s) => {
    localStorage.setItem(KEY, JSON.stringify(s));
    setSession(s);
    scheduleRefresh(s);
  };

  const clearSession = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    localStorage.removeItem(KEY);
    setSession(null);
  };

  // ── Poll every 60s — refresh if within 10 mins of expiry ─────────
  const scheduleRefresh = (s) => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(async () => {
      const stored = localStorage.getItem(KEY);
      if (!stored) return;
      try {
        const current = JSON.parse(stored);
        const minsLeft = (current.expiresAt - Date.now()) / 60000;
        if (minsLeft < 10) {
          const refreshed = await refreshSession(current.refreshToken);
          if (refreshed) {
            localStorage.setItem(KEY, JSON.stringify(refreshed));
            setSession(refreshed);
          } else {
            clearSession();
          }
        }
      } catch { clearSession(); }
    }, 60 * 1000); // check every 60 seconds
  };

  // ── On startup ────────────────────────────────────────────────────
  useEffect(() => {
    const run = async () => {
      const stored = localStorage.getItem(KEY);
      if (!stored) { setChecking(false); return; }
      try {
        const s = JSON.parse(stored);
        const expired = s.expiresAt && Date.now() > s.expiresAt;
        if (expired) {
          // Try to silently refresh
          const refreshed = await refreshSession(s.refreshToken);
          if (refreshed) applySession(refreshed);
          else clearSession();
        } else {
          applySession(s);
        }
      } catch { clearSession(); }
      setChecking(false);
    };
    run();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleLogin = (token, user, refreshToken, expiresIn) => {
    applySession({
      token,
      user,
      refreshToken,
      expiresAt: Date.now() + ((expiresIn || 3600) * 1000),
    });
  };

  const handleLogout = async () => {
    if (session?.token) { try { await signOut(session.token); } catch(_) {} }
    clearSession();
  };

  // Called by App when a 401 is received mid-session
  const handleSessionExpired = async () => {
    const stored = localStorage.getItem(KEY);
    if (stored) {
      try {
        const s = JSON.parse(stored);
        const refreshed = await refreshSession(s.refreshToken);
        if (refreshed) { applySession(refreshed); return true; }
      } catch(_) {}
    }
    clearSession();
    return false;
  };

  if (checking) return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#2C1F0E,#8B6F47)", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16 }}>
      <div style={{ width:40, height:40, border:"3px solid rgba(255,255,255,0.3)", borderTop:"3px solid #F5E6D3", borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
      <div style={{ color:"#C9A882", fontSize:12, letterSpacing:3, fontFamily:"Georgia,serif" }}>LOADING</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!session) return <Auth onLogin={handleLogin} />;
  return <App token={session.token} user={session.user} onLogout={handleLogout} onSessionExpired={handleSessionExpired} />;
}
