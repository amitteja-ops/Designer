import { useState } from "react";

export default function Auth({ onLogin }) {
  const [mode,     setMode]     = useState("login");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");

  const S = {
    page:  { minHeight:"100vh", background:"#0F1923", display:"flex", alignItems:"center",
             justifyContent:"center", fontFamily:"'DM Sans','Inter',system-ui,sans-serif" },
    card:  { background:"#fff", borderRadius:4, padding:"48px 44px", width:420,
             boxShadow:"0 24px 60px rgba(0,0,0,0.5)", borderTop:"3px solid #1A5276" },
    title: { fontSize:20, fontWeight:700, color:"#0F1923", letterSpacing:4,
             textTransform:"uppercase", textAlign:"center" },
    sub:   { color:"#1A5276", fontSize:9, letterSpacing:4, display:"block",
             background:"#C5DCF0", borderRadius:2, padding:"4px 0",
             marginTop:4, textAlign:"center", textTransform:"uppercase" },
    label: { fontSize:10, letterSpacing:2, color:"#5A564F", textTransform:"uppercase",
             marginBottom:6, display:"block", fontWeight:600 },
    input: { width:"100%", padding:"10px 14px", borderRadius:3,
             border:"1.5px solid #E2DDD6", fontFamily:"inherit", fontSize:14,
             color:"#0F1923", background:"#fff", outline:"none", boxSizing:"border-box" },
    btn:   { width:"100%", padding:14, background:"#1A5276", color:"#fff",
             border:"none", borderRadius:3, cursor:"pointer", fontFamily:"inherit",
             fontSize:11, letterSpacing:2, textTransform:"uppercase", fontWeight:700 },
    err:   { background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:3,
             padding:"12px 16px", fontSize:13, color:"#7A0000", marginBottom:16 },
    ok:    { background:"#DCFCE7", border:"1px solid #86EFAC", borderRadius:3,
             padding:"12px 16px", fontSize:13, color:"#166534", marginBottom:16 },
    link:  { color:"#1A5276", cursor:"pointer", fontWeight:700 },
  };

  const handle = async () => {
    setError(""); setSuccess("");
    if (!email || !password) { setError("Please fill in all fields"); return; }
    if (mode === "signup" && password !== confirm) { setError("Passwords don't match"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      const SUPA_URL = "https://utctflrqhjzxhzyuhsnn.supabase.co";
      const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0Y3RmbHJxaGp6eGh6eXVoc25uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3Mzg0MzYsImV4cCI6MjA5NjMxNDQzNn0.9RC2YnbSnvtWN5EmyzSxuXvzpgV4a-A3YU6iwDBgKhY";
      const path = mode === "login" ? "token?grant_type=password" : "signup";
      const res = await fetch(`${SUPA_URL}/auth/v1/${path}`, {
        method: "POST",
        headers: { "apikey": SUPA_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (data.error || data.error_description) throw new Error(data.error_description || data.error?.message || "Auth failed");
      if (mode === "login") {
        if (!data.access_token) throw new Error("No token — please confirm your email first");
        const session = {
          token: data.access_token,
          user: data.user,
          refreshToken: data.refresh_token,
          expiresAt: Date.now() + ((data.expires_in || 3600) * 1000),
        };
        localStorage.setItem("crm_session", JSON.stringify(session));
        onLogin(session);
      } else {
        setSuccess("Account created! You can now sign in.");
        setMode("login");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap'); * { box-sizing: border-box; } input:focus { border-color: #1A5276 !important; outline: none; box-shadow: 0 0 0 3px rgba(26,82,118,0.12); }`}</style>
      <div style={S.card}>
        {/* Brand */}
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={S.title}>High Rise Interiors</div>
          <span style={S.sub}>Studio CRM</span>
        </div>

        <div style={{ fontSize:13, fontWeight:600, color:"#0F1923", marginBottom:20, textAlign:"center" }}>
          {mode === "login" ? "Sign in to continue" : "Create your account"}
        </div>

        {error   && <div style={S.err}>⚠️ {error}</div>}
        {success && <div style={S.ok}>✓ {success}</div>}

        <label style={S.label}>Email Address</label>
        <input style={{ ...S.input, marginBottom:16 }} type="email" value={email}
          onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
          onKeyDown={e => e.key === "Enter" && handle()}/>

        <label style={S.label}>Password</label>
        <input style={{ ...S.input, marginBottom: mode === "signup" ? 16 : 24 }}
          type="password" value={password}
          onChange={e => setPassword(e.target.value)} placeholder="••••••••"
          onKeyDown={e => e.key === "Enter" && handle()}/>

        {mode === "signup" && (
          <>
            <label style={S.label}>Confirm Password</label>
            <input style={{ ...S.input, marginBottom:24 }} type="password" value={confirm}
              onChange={e => setConfirm(e.target.value)} placeholder="••••••••"
              onKeyDown={e => e.key === "Enter" && handle()}/>
          </>
        )}

        <button style={{ ...S.btn, opacity: loading ? 0.7 : 1 }} onClick={handle} disabled={loading}>
          {loading ? "Please wait…" : mode === "login" ? "Sign In →" : "Create Account →"}
        </button>

        <div style={{ textAlign:"center", marginTop:20, fontSize:13, color:"#5A564F" }}>
          {mode === "login"
            ? <>No account? <span style={S.link} onClick={() => { setMode("signup"); setError(""); }}>Sign up</span></>
            : <>Have account? <span style={S.link} onClick={() => { setMode("login"); setError(""); }}>Sign in</span></>
          }
        </div>

        <div style={{ textAlign:"center", marginTop:24, fontSize:10, color:"#8A8278", letterSpacing:1 }}>
          © Genovatech IT Services Pvt. Ltd. · Secured by Supabase
        </div>
      </div>
    </div>
  );
}
