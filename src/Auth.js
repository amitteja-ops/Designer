import { useState } from "react";
const AUTH_LOGO_SRC = "data:image/png;base64,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";


export default function Auth({ onLogin }) {
  const [mode,     setMode]     = useState("login");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");
  const [forgotPw, setForgotPw] = useState(false);
  const [resetMode, setResetMode] = useState(false);

  const S = {
    page:  { minHeight:"100vh",
             background:"linear-gradient(135deg,#0F1923 0%,#1a2535 50%,#0d1f2d 100%)",
             display:"flex", alignItems:"center", justifyContent:"center",
             fontFamily:"'DM Sans','Inter',system-ui,sans-serif" },
    card:  { background:"rgba(255,255,255,0.07)",
             backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)",
             borderRadius:20, padding:"44px 40px", width:420,
             border:"1px solid rgba(255,255,255,0.15)",
             boxShadow:"0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)" },
    label: { fontSize:10, letterSpacing:2, color:"rgba(255,255,255,0.5)",
             textTransform:"uppercase", marginBottom:6, display:"block", fontWeight:600 },
    input: { width:"100%", padding:"12px 16px", borderRadius:10,
             border:"1px solid rgba(255,255,255,0.15)",
             fontFamily:"inherit", fontSize:14,
             color:"rgba(255,255,255,0.9)", background:"rgba(255,255,255,0.08)",
             outline:"none", boxSizing:"border-box", marginBottom:16 },
    btn:   { width:"100%", padding:14,
             background:"linear-gradient(135deg,#0A84FF,#BF5AF2)",
             color:"#fff", border:"none", borderRadius:12, cursor:"pointer",
             fontFamily:"inherit", fontSize:12, letterSpacing:1.5,
             textTransform:"uppercase", fontWeight:700,
             boxShadow:"0 0 24px rgba(10,132,255,0.35)" },
    err:   { background:"rgba(255,69,58,0.15)", border:"1px solid rgba(255,69,58,0.3)",
             borderRadius:10, padding:"12px 16px", fontSize:13,
             color:"#FF6B6B", marginBottom:16 },
    ok:    { background:"rgba(48,209,88,0.15)", border:"1px solid rgba(48,209,88,0.3)",
             borderRadius:10, padding:"12px 16px", fontSize:13,
             color:"#30D158", marginBottom:16 },
    link:  { color:"#0A84FF", cursor:"pointer", fontWeight:700 },
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

  const handleReset = async () => {
    setError(""); setSuccess("");
    if (!email) { setError("Enter your email address above first"); return; }
    setLoading(true);
    try {
      const SUPA_URL = "https://utctflrqhjzxhzyuhsnn.supabase.co";
      const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0Y3RmbHJxaGp6eGh6eXVoc25uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3Mzg0MzYsImV4cCI6MjA5NjMxNDQzNn0.9RC2YnbSnvtWN5EmyzSxuXvzpgV4a-A3YU6iwDBgKhY";
      const res = await fetch(`${SUPA_URL}/auth/v1/recover`, {
        method: "POST",
        headers: { "apikey": SUPA_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          redirect_to: "https://designer-hd6s.vercel.app"
        }),
      });
      if (res.ok) {
        setSuccess("Password reset email sent! Check your inbox.");
        setResetMode(false);
      } else {
        throw new Error("Failed to send reset email");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError(""); setSuccess("");
    if (!email) { setError("Enter your email address above first"); return; }
    setLoading(true);
    try {
      const SUPA_URL = "https://utctflrqhjzxhzyuhsnn.supabase.co";
      const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0Y3RmbHJxaGp6eGh6eXVoc25uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3Mzg0MzYsImV4cCI6MjA5NjMxNDQzNn0.9RC2YnbSnvtWN5EmyzSxuXvzpgV4a-A3YU6iwDBgKhY";
      const res = await fetch(`${SUPA_URL}/auth/v1/recover`, {
        method: "POST",
        headers: { "apikey": SUPA_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          redirect_to: "https://designer-hd6s.vercel.app"
        }),
      });
      if (res.ok) {
        setSuccess("Password reset email sent! Check your inbox and click the link.");
        setForgotPw(false);
      } else {
        const d = await res.json();
        throw new Error(d.error_description || d.msg || "Reset failed");
      }
    } catch(e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing:border-box; }
        input::placeholder { color:rgba(255,255,255,0.3); }
        input:focus { border-color:rgba(10,132,255,0.6)!important; outline:none;
          box-shadow:0 0 0 3px rgba(10,132,255,0.15); }
      `}</style>
      <div style={S.card}>
        {/* Brand */}
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ display:"flex",justifyContent:"center",marginBottom:8 }}>
          <img src={AUTH_LOGO_SRC} alt="High Rise Interiors"
            style={{ height:52,objectFit:"contain",filter:"brightness(0) invert(1)" }}/>
        </div>
          <span style={{ color:"rgba(255,255,255,0.5)", fontSize:10, letterSpacing:3,
            display:"block", textAlign:"center", textTransform:"uppercase",
            marginTop:8 }}>Studio CRM</span>
        </div>

        <div style={{ fontSize:13, fontWeight:600, color:"rgba(255,255,255,0.7)", marginBottom:20, textAlign:"center" }}>
          {mode === "login" ? "Sign in to continue" : "Create your account"}
        </div>

        {error && (
          <div>
            <div style={S.err}>⚠️ {error}</div>
            <button onClick={()=>{
              localStorage.clear();
              setError(null);
              window.location.reload();
            }} style={{ width:"100%",marginTop:8,padding:"10px 0",
              background:"rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.8)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:8,
              cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"inherit" }}>
              🔄 Clear session &amp; reload
            </button>
          </div>
        )}
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

        {mode === "login" && (
          <div style={{ textAlign:"center", marginTop:12 }}>
            <span style={{ ...S.link, fontSize:12, color:"#5A564F", fontWeight:400 }}
              onClick={handleReset}>
              Forgot password?
            </span>
          </div>
        )}

        <div style={{ textAlign:"center", marginTop:16, fontSize:13, color:"#5A564F" }}>
          {mode === "login"
            ? <>No account? <span style={S.link} onClick={() => { setMode("signup"); setError(""); }}>Sign up</span></>
            : <>Have account? <span style={S.link} onClick={() => { setMode("login"); setError(""); }}>Sign in</span></>
          }
        </div>

        <div style={{ textAlign:"center", marginTop:24, fontSize:10, color:"rgba(255,255,255,0.3)", letterSpacing:1 }}>
          © Genovatech IT Services Pvt. Ltd. · Secured by Supabase
        </div>
      </div>
    </div>
  );
}
