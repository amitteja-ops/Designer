import { useState, useEffect } from "react";
import App from "./App";
import Auth from "./Auth";
import { signOut, refreshSession } from "./supabase";

const SESSION_KEY = "crm_session";

export default function Root() {
  const [session,  setSession]  = useState(null);
  const [checking, setChecking] = useState(true);

  // ── Load session from localStorage on startup ──
  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      try {
        const s = JSON.parse(stored);
        // Check if token is expired
        if (s.expiresAt && Date.now() > s.expiresAt) {
          // Try to refresh using refresh_token
          if (s.refreshToken) {
            refreshSession(s.refreshToken)
              .then(newSession => {
                if (newSession) {
                  saveSession(newSession);
                  setSession(newSession);
                } else {
                  clearSession();
                }
              })
              .catch(() => clearSession())
              .finally(() => setChecking(false));
            return;
          } else {
            clearSession();
          }
        } else {
          setSession(s);
        }
      } catch { clearSession(); }
    }
    setChecking(false);
  }, []);

  // ── Auto-refresh token 5 mins before expiry ──
  useEffect(() => {
    if (!session?.refreshToken || !session?.expiresAt) return;
    const msUntilRefresh = session.expiresAt - Date.now() - 5 * 60 * 1000;
    if (msUntilRefresh <= 0) return;

    const timer = setTimeout(async () => {
      try {
        const newSession = await refreshSession(session.refreshToken);
        if (newSession) { saveSession(newSession); setSession(newSession); }
        else handleLogout();
      } catch { handleLogout(); }
    }, msUntilRefresh);

    return () => clearTimeout(timer);
  }, [session]);

  const saveSession = (s) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  };

  const clearSession = () => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setChecking(false);
  };

  const handleLogin = (token, user, refreshToken, expiresIn) => {
    const s = {
      token,
      user,
      refreshToken,
      expiresAt: Date.now() + (expiresIn || 3600) * 1000,
    };
    saveSession(s);
    setSession(s);
  };

  const handleLogout = async () => {
    if (session?.token) {
      try { await signOut(session.token); } catch(_) {}
    }
    clearSession();
  };

  // Handle session expired error from App
  const handleSessionExpired = async () => {
    if (session?.refreshToken) {
      try {
        const newSession = await refreshSession(session.refreshToken);
        if (newSession) { saveSession(newSession); setSession(newSession); return; }
      } catch(_) {}
    }
    handleLogout();
  };

  if (checking) return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#2C1F0E,#8B6F47)", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16 }}>
      <div style={{ width:40, height:40, border:"3px solid rgba(255,255,255,0.3)", borderTop:"3px solid #F5E6D3", borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
      <div style={{ color:"#C9A882", fontSize:12, letterSpacing:3 }}>LOADING</div>
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
