import { useState, useEffect, useRef } from "react";
import App from "./App";
import Auth from "./Auth";
import { signOut, refreshSession } from "./supabase";

const KEY = "crm_session";

export default function Root() {
  const [session,  setSession]  = useState(null);
  const [checking, setChecking] = useState(true);
  const timerRef = useRef(null);

  const applySession = (s) => {
    localStorage.setItem(KEY, JSON.stringify(s));
    setSession(s);
    startRefreshTimer(s);
  };

  const clearSession = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    localStorage.removeItem(KEY);
    setSession(null);
  };

  const startRefreshTimer = (s) => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(async () => {
      try {
        const raw = localStorage.getItem(KEY);
        if (!raw) { clearSession(); return; }
        const current = JSON.parse(raw);
        const minsLeft = (current.expiresAt - Date.now()) / 60000;
        if (minsLeft < 10 && current.refreshToken) {
          const refreshed = await refreshSession(current.refreshToken);
          if (refreshed) {
            localStorage.setItem(KEY, JSON.stringify(refreshed));
            setSession(refreshed);
          } else {
            clearSession();
          }
        }
      } catch { /* silent */ }
    }, 60000);
  };

  // ── On app load ───────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      // First check localStorage
      const raw = localStorage.getItem(KEY);
      if (!raw) { setChecking(false); return; }

      try {
        const s = JSON.parse(raw);

        // Validate session has required fields
        if (!s.token || !s.user) {
          clearSession();
          setChecking(false);
          return;
        }

        const expired = s.expiresAt && Date.now() > s.expiresAt;

        if (expired && s.refreshToken) {
          // Try to silently refresh
          const refreshed = await refreshSession(s.refreshToken);
          if (refreshed) applySession(refreshed);
          else clearSession();
        } else {
          // Valid session — restore it
          applySession(s);
        }
      } catch {
        clearSession();
      }

      setChecking(false);
    };

    init();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleLogin = (token, user, refreshToken, expiresIn) => {
    const s = {
      token,
      user,
      refreshToken: refreshToken || null,
      expiresAt: Date.now() + ((expiresIn || 3600) * 1000),
    };
    applySession(s);
  };

  const handleLogout = async () => {
    if (session?.token) { try { await signOut(session.token); } catch(_) {} }
    clearSession();
  };

  const handleSessionExpired = async () => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.refreshToken) {
          const refreshed = await refreshSession(s.refreshToken);
          if (refreshed) { applySession(refreshed); return true; }
        }
      }
    } catch(_) {}
    clearSession();
    return false;
  };

  // ── Loading screen ────────────────────────────────────────────────
  if (checking) return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#2C1F0E,#8B6F47)", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16 }}>
      <div style={{ width:40, height:40, border:"3px solid rgba(255,255,255,0.3)", borderTop:"3px solid #F5E6D3", borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
      <div style={{ color:"#C9A882", fontSize:12, letterSpacing:3, fontFamily:"Georgia,serif" }}>LOADING</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!session) return <Auth onLogin={handleLogin} />;

  return (
    <App
      token={session.token}
      user={session.user}
      onLogout={handleLogout}
      onSessionExpired={handleSessionExpired}
    />
  );
}
