import { useState, useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";
import App from "./App";
import Auth from "./Auth";
import { signOut } from "./supabase";

const SESSION_KEY = "crm_session";

export default function Root() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      try { setSession(JSON.parse(stored)); }
      catch { localStorage.removeItem(SESSION_KEY); }
    }
    setChecking(false);
  }, []);

  const handleLogin = (token, user) => {
    const s = { token, user };
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    setSession(s);
  };

  const handleLogout = async () => {
    if (session?.token) {
      try { await signOut(session.token); } catch(_) {}
    }
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  };

  if (checking) return (
    <>
      <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#2C1F0E,#8B6F47)", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ width:40, height:40, border:"3px solid rgba(255,255,255,0.3)", borderTop:"3px solid #F5E6D3", borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
      <Analytics />
    </>
  );

  if (!session) return (
    <>
      <Auth onLogin={handleLogin} />
      <Analytics />
    </>
  );
  return (
    <>
      <App token={session.token} user={session.user} onLogout={handleLogout} />
      <Analytics />
    </>
  );
}
