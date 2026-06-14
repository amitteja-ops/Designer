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

  const handleLogin = (sessionOrToken, user, refreshToken, expiresIn) => {
    // Accept either a session object OR individual params
    const s = (sessionOrToken && typeof sessionOrToken === "object" && sessionOrToken.token)
      ? sessionOrToken  // Auth.js passes full session object
      : {
          token:        sessionOrToken,
          user:         user,
          refreshToken: refreshToken || null,
          expiresAt:    Date.now() + ((expiresIn || 3600) * 1000),
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
    <div style={{ minHeight:"100vh", background:"#0F1923", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16, fontFamily:"'DM Sans',system-ui,sans-serif" }}>
      <div style={{ width:36, height:36, border:"2px solid rgba(26,82,118,0.3)", borderTop:"2px solid #1A5276", borderRadius:"50%", animation:"spin 0.7s linear infinite" }}/>
      <div style={{ color:"#1A5276", fontSize:10, letterSpacing:4, textTransform:"uppercase" }}>Loading</div>
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
