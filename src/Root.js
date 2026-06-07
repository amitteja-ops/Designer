import { useState, useEffect, useRef } from "react";
import App from "./App";
import Auth from "./Auth";
import { signOut, refreshSession } from "./supabase";

const SESSION_KEY = "crm_session";

export default function Root() {
  const [session,  setSession]  = useState(null);
  const [checking, setChecking] = useState(true);
  const refreshTimer = useRef(null);

  const clearSession = () => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
  };

  const applySession = (s) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    setSession(s);
    scheduleRefresh(s);
  };

  // Schedule a silent token refresh 10 mins before expiry
  const scheduleRefresh = (s) => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    if (!s?.refreshToken || !s?.expiresAt) return;

    const delay = s.expiresAt - Date.now() - 10 * 60 * 1000; // 10 mins before expiry
    if (delay <= 0) {
      // Already close to expiry — refresh immediately
      doRefresh(s.refreshToken);
      return;
    }
    refreshTimer.current = setTimeout(() => doRefresh(s.refreshToken), delay);
  };

  const doRefresh = async (refreshToken) => {
    try {
      const newSession = await refreshSession(refreshToken);
      if (newSession) {
        applySession(newSession);
      } else {
        clearSession();
      }
    } catch {
      clearSession();
    }
  };

  // Load session on startup
  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      try {
        const s = JSON.parse(stored);
        const isExpired = s.expiresAt && Date.now() > s.expiresAt;

        if (isExpired && s.refreshToken) {
          // Expired — try refresh before giving up
          refreshSession(s.refreshToken)
            .then(newSession => {
              if (newSession) applySession(newSession);
              else clearSession();
            })
            .catch(clearSession)
            .finally(() => setChecking(false));
          return;
        } else if (isExpired) {
          clearSession();
        } else {
          applySession(s);
        }
      } catch { clearSession(); }
    }
    setChecking(false);

    return () => { if (refreshTimer.current) clearTimeout(refreshTimer.current); };
  }, []);

  const handleLogin = (token, user, refreshToken, expiresIn) => {
    const s = {
      token,
      user,
      refreshToken,
      expiresAt: Date.now() + ((expiresIn || 3600) * 1000),
    };
    applySession(s);
  };

  const handleLogout = async () => {
    if (session?.token) {
      try { await signOut(session.token); } catch(_) {}
    }
    clearSession();
  };

  const handleSessionExpired = async () => {
    if (session?.refreshToken) {
      try {
        const newSession = await refreshSession(session.refreshToken);
        if (newSession) { applySession(newSession); return; }
      } catch(_) {}
    }
    clearSession();
  };

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
