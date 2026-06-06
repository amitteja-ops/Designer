import { useState } from "react";
import { signIn, signUp } from "./supabase";

export default function Auth({ onLogin }) {
  const [mode,     setMode]     = useState("login"); // login | signup
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");

  const S = {
    page:  { minHeight:"100vh", background:"linear-gradient(135deg,#2C1F0E 0%,#5C3D1E 50%,#8B6F47 100%)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Cormorant Garamond',Georgia,serif" },
    card:  { background:"#fff", borderRadius:24, padding:"48px 44px", width:400, boxShadow:"0 24px 60px rgba(0,0,0,0.3)" },
    logo:  { textAlign:"center", marginBottom:36 },
    title: { fontSize:28, fontWeight:700, color:"#2C1F0E", letterSpacing:3, textTransform:"uppercase" },
    sub:   { fontSize:11, color:"#C9A882", letterSpacing:6, marginTop:4 },
    label: { fontSize:11, letterSpacing:2, color:"#9A8070", textTransform:"uppercase", marginBottom:6, display:"block" },
    input: { width:"100%", padding:"12px 16px", borderRadius:10, border:"1.5px solid #DDD0C0", fontFamily:"inherit", fontSize:14, color:"#2C1F0E", background:"#FDFAF6", outline:"none", boxSizing:"border-box", marginBottom:18 },
    btn:   { width:"100%", padding:"14px", borderRadius:12, border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:13, letterSpacing:2, textTransform:"uppercase", fontWeight:700, background:"linear-gradient(135deg,#5C3D1E,#8B6F47)", color:"#fff", boxShadow:"0 4px 16px rgba(139,111,71,0.4)", marginTop:8 },
    error: { background:"#FDF0F0", border:"1px solid #F5C6C6", borderRadius:10, padding:"12px 16px", fontSize:13, color:"#721C24", marginBottom:16, lineHeight:1.5 },
    success:{ background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:10, padding:"12px 16px", fontSize:13, color:"#166534", marginBottom:16, lineHeight:1.5 },
    toggle:{ textAlign:"center", marginTop:20, fontSize:13, color:"#9A8070" },
    link:  { color:"#8B6F47", cursor:"pointer", fontWeight:700, textDecoration:"underline" },
    divider:{ textAlign:"center", color:"#C9A882", fontSize:11, letterSpacing:2, margin:"20px 0", position:"relative" },
  };

  const handle = async () => {
    setError(""); setSuccess("");
    if (!email || !password) { setError("Please fill in all fields."); return; }
    if (mode==="signup" && password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      if (mode==="login") {
        const data = await signIn(email, password);
        onLogin(data.access_token, data.user);
      } else {
        await signUp(email, password);
        setSuccess("Account created! Check your email to confirm, then log in.");
        setMode("login");
      }
    } catch(e) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo}>
          <div style={S.title}>Maison Intérieur</div>
          <div style={S.sub}>Customer Registry</div>
        </div>

        <div style={{ fontSize:16, fontWeight:700, color:"#2C1F0E", marginBottom:24, textAlign:"center" }}>
          {mode==="login" ? "Sign in to your account" : "Create an account"}
        </div>

        {error   && <div style={S.error}>⚠️ {error}</div>}
        {success && <div style={S.success}>✓ {success}</div>}

        <label style={S.label}>Email Address</label>
        <input style={S.input} type="email" value={email} onChange={e=>setEmail(e.target.value)}
          placeholder="you@example.com" onKeyDown={e=>e.key==="Enter"&&handle()} />

        <label style={S.label}>Password</label>
        <input style={{ ...S.input, marginBottom: mode==="signup"?18:8 }} type="password" value={password}
          onChange={e=>setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&handle()} />

        {mode==="signup" && <>
          <label style={S.label}>Confirm Password</label>
          <input style={S.input} type="password" value={confirm}
            onChange={e=>setConfirm(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&handle()} />
        </>}

        <button style={{ ...S.btn, opacity:loading?0.7:1 }} onClick={handle} disabled={loading}>
          {loading ? "Please wait…" : mode==="login" ? "Sign In" : "Create Account"}
        </button>

        <div style={S.toggle}>
          {mode==="login" ? <>Don't have an account? <span style={S.link} onClick={()=>{setMode("signup");setError("");}}>Sign up</span></>
            : <>Already have an account? <span style={S.link} onClick={()=>{setMode("login");setError("");}}>Sign in</span></>}
        </div>

        <div style={{ ...S.divider, marginTop:28, marginBottom:0 }}>
          <div style={{ fontSize:11, color:"#C9A882", letterSpacing:1 }}>
            🔒 Secured by Supabase Auth
          </div>
        </div>
      </div>
    </div>
  );
}
