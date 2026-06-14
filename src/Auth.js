import { useState } from "react";
import { signIn, signUp } from "./supabase";

export default function Auth({ onLogin }) {
  const [mode,     setMode]     = useState("login");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");
  const [debug,    setDebug]    = useState("");

  const S = {
    page:  { minHeight:"100vh", background:"#0F1923", display:"flex", alignItems:"center",
             justifyContent:"center", fontFamily:"'DM Sans','Inter',system-ui,sans-serif" },
    card:  { background:"#fff", borderRadius:4, padding:"40px 36px", width:420,
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
};port { useState } from "react";
import { signIn, signUp } from "./supabase";

export default function Auth({ onLogin }) {
  const [mode,     setMode]     = useState("login");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");
  const [debug,    setDebug]    = useState("");

  const S = {
    page:    { minHeight:"100vh", background:"linear-gradient(135deg,#0F1923 0%,#5C3D1E 50%,#8B6F47 100%)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans','Inter',system-ui,sans-serif" },
    card:    { background:"#fff", borderRadius:4, padding:"40px 36px", width:420, boxShadow:"0 24px 60px rgba(0,0,0,0.3)" },
    title:   { fontSize:26, fontWeight:700, color:"#0F1923", letterSpacing:3, textTransform:"uppercase", textAlign:"center" },
    sub:     { fontSize:11, color:"#C9A882", letterSpacing:6, marginTop:4, textAlign:"center", display:"block", marginBottom:32 },
    label:   { fontSize:11, letterSpacing:2, color:"#9A8070", textTransform:"uppercase", marginBottom:6, display:"block" },
    input:   { width:"100%", padding:"12px 16px", borderRadius:3, border:"1.5px solid #DDD0C0", fontFamily:"inherit", fontSize:14, color:"#0F1923", background:"#FDFAF6", outline:"none", boxSizing:"border-box", marginBottom:16 },
    btn:     { width:"100%", padding:"14px", borderRadius:12, border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:13, letterSpacing:2, textTransform:"uppercase", fontWeight:700, background:"linear-gradient(135deg,#5C3D1E,#8B6F47)", color:"#fff", marginTop:8 },
    error:   { background:"#FDF0F0", border:"1px solid #F5C6C6", borderRadius:3, padding:"12px 16px", fontSize:13, color:"#7A0000", marginBottom:14, lineHeight:1.6 },
    success: { background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:3, padding:"12px 16px", fontSize:13, color:"#166534", marginBottom:14, lineHeight:1.6 },
    debug:   { background:"#1E1E1E", color:"#A8D8A8", borderRadius:3, padding:"12px 14px", fontSize:11, fontFamily:"monospace", marginBottom:14, lineHeight:1.7, whiteSpace:"pre-wrap", wordBreak:"break-all" },
    toggle:  { textAlign:"center", marginTop:18, fontSize:13, color:"#9A8070" },
    link:    { color:"#8B6F47", cursor:"pointer", fontWeight:700, textDecoration:"underline" },
  };

  const handle = async () => {
    setError(""); setSuccess(""); setDebug("");
    if (!email.trim() || !password) { setError("Please fill in all fields."); return; }
    if (mode==="signup" && password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }

    setLoading(true);
    setDebug("Step 1: Calling Supabase signIn…");

    try {
      if (mode === "login") {
        const data = await signIn(email.trim(), password);
        setDebug(prev => prev + "\nStep 2: Response received\n" +
          "access_token: " + (data.access_token ? "✓ EXISTS ("+data.access_token.substring(0,20)+"...)" : "✗ MISSING") + "\n" +
          "refresh_token: " + (data.refresh_token ? "✓ EXISTS" : "✗ MISSING") + "\n" +
          "user: " + (data.user?.email || "MISSING") + "\n" +
          "expires_in: " + (data.expires_in || "MISSING")
        );

        if (!data.access_token) {
          setDebug(prev => prev + "\nStep 3: ✗ No token — likely email not confirmed");
          setError("Login failed: No token received. Did you confirm your email?");
          setLoading(false);
          return;
        }

        // Build session
        const session = {
          token:        data.access_token,
          user:         data.user,
          refreshToken: data.refresh_token || null,
          expiresAt:    Date.now() + ((data.expires_in || 3600) * 1000),
        };

        setDebug(prev => prev + "\nStep 3: ✓ Session built\nStep 4: Saving to localStorage…");

        // Save to localStorage directly
        try {
          localStorage.setItem("crm_session", JSON.stringify(session));
          const verify = localStorage.getItem("crm_session");
          setDebug(prev => prev + "\nStep 5: localStorage " + (verify ? "✓ SAVED" : "✗ FAILED"));
        } catch(storageErr) {
          setDebug(prev => prev + "\nStep 5: ✗ localStorage ERROR: " + storageErr.message);
        }

        setDebug(prev => prev + "\nStep 6: Calling onLogin…");
        onLogin(data.access_token, data.user, data.refresh_token, data.expires_in);
        setDebug(prev => prev + "\nStep 7: onLogin called ✓");

      } else {
        await signUp(email.trim(), password);
        setSuccess("✓ Account created! Check your email to confirm it, then log in.");
        setMode("login"); setPassword(""); setConfirm("");
      }
    } catch(e) {
      setDebug(prev => prev + "\n✗ ERROR: " + e.message);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.title}>High Rise Interiors</div>
        <span style={S.sub}>Studio CRM</span>

        <div style={{ fontSize:15, fontWeight:700, color:"#0F1923", marginBottom:18, textAlign:"center" }}>
          {mode==="login" ? "Sign in to your account" : "Create an account"}
        </div>

        {error   && <div style={S.error}>⚠️ {error}</div>}
        {success && <div style={S.success}>{success}</div>}
        {debug   && <div style={S.debug}>{debug}</div>}

        <label style={S.label}>Email Address</label>
        <input style={S.input} type="email" value={email}
          onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"
          autoComplete="email" onKeyDown={e=>e.key==="Enter"&&handle()} />

        <label style={S.label}>Password</label>
        <input style={{ ...S.input, marginBottom:mode==="signup"?16:20 }}
          type="password" value={password} onChange={e=>setPassword(e.target.value)}
          placeholder="••••••••" autoComplete="current-password"
          onKeyDown={e=>e.key==="Enter"&&handle()} />

        {mode==="signup" && <>
          <label style={S.label}>Confirm Password</label>
          <input style={S.input} type="password" value={confirm}
            onChange={e=>setConfirm(e.target.value)} placeholder="••••••••"
            onKeyDown={e=>e.key==="Enter"&&handle()} />
        </>}

        <button style={{ ...S.btn, opacity:loading?0.7:1 }} onClick={handle} disabled={loading}>
          {loading ? "Signing in…" : mode==="login" ? "Sign In →" : "Create Account →"}
        </button>

        <div style={S.toggle}>
          {mode==="login"
            ? <>No account? <span style={S.link} onClick={()=>{setMode("signup");setError("");setDebug("");}}>Sign up</span></>
            : <>Have account? <span style={S.link} onClick={()=>{setMode("login");setError("");setDebug("");}}>Sign in</span></>}
        </div>
        <div style={{ textAlign:"center", marginTop:16, fontSize:11, color:"#C9A882" }}>© Genovatech IT Services Pvt. Ltd. · Secured by Supabase</div>
      </div>
    </div>
  );
}
