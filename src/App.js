import { useState, useEffect, useCallback } from "react";
import { sb, toRow, fromRow, TABLE } from "./supabase";

const ROOMS   = ["Living Room","Master Bedroom","Kitchen","Bathroom","Dining Room","Home Office","Children's Room","Guest Room"];
const STYLES  = ["Modern Minimalist","Classic Traditional","Bohemian","Scandinavian","Industrial","Art Deco","Mediterranean","Contemporary","Rustic Farmhouse","Mid-Century Modern"];
const PALETTES = [
  { name:"Warm Neutrals", colors:["#F5E6D3","#C9A882","#8B6F47","#4A3728"] },
  { name:"Cool Blues",    colors:["#E8F4F8","#90CAE0","#3A86A8","#1A3A4A"] },
  { name:"Earthy Greens", colors:["#E8EDD8","#A8BF8A","#5C8A4A","#2C4A24"] },
  { name:"Bold Contrast", colors:["#F5F0E8","#E8C87A","#2A2A2A","#8B1A1A"] },
  { name:"Blush & Gold",  colors:["#FAF0EC","#E8A898","#C8926A","#7A4A3A"] },
  { name:"Monochrome",    colors:["#F8F8F8","#C0C0C0","#606060","#1A1A1A"] },
];
const STATUSES = ["Lead","Active","Completed","On Hold"];
const emptyForm = {
  id:null, name:"", email:"", phone:"", address:"",
  projectType:"Residential", budget:"", timeline:"",
  rooms:[], dimensions:{length:"",width:"",height:""},
  style:"", palette:null, notes:"", status:"Lead",
};

function Toast({ msg, type }) {
  const bg = { success:"#27AE60", error:"#C0392B", info:"#8B6F47", warning:"#E67E22" }[type]||"#8B6F47";
  return <div style={{ position:"fixed",bottom:24,right:24,zIndex:9999,background:bg,color:"#fff",padding:"14px 22px",borderRadius:12,fontSize:13,boxShadow:"0 4px 20px rgba(0,0,0,0.2)",fontFamily:"inherit",maxWidth:380,lineHeight:1.5,animation:"slideIn 0.3s ease" }}>{msg}</div>;
}
function Badge({ status }) {
  const m = { Lead:{bg:"#FFF3CD",c:"#856404"}, Active:{bg:"#D1ECF1",c:"#0C5460"}, Completed:{bg:"#D4EDDA",c:"#155724"}, "On Hold":{bg:"#F8D7DA",c:"#721C24"} };
  const s = m[status]||m.Lead;
  return <span style={{ background:s.bg,color:s.c,padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:700,letterSpacing:1 }}>{status}</span>;
}
function ColorSwatch({ colors }) {
  return <div style={{ display:"flex",gap:3 }}>{colors.map((c,i)=><div key={i} style={{ width:16,height:16,borderRadius:3,background:c,border:"1px solid #ddd" }}/>)}</div>;
}
function Spinner() {
  return <div style={{ display:"flex",justifyContent:"center",padding:80 }}><div style={{ width:40,height:40,border:"3px solid #EDE0CE",borderTop:"3px solid #8B6F47",borderRadius:"50%",animation:"spin 0.8s linear infinite" }}/></div>;
}

export default function App({ token, user, onLogout, onSessionExpired }) {
  const [customers,    setCustomers]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [view,         setView]         = useState("list");
  const [form,         setForm]         = useState(emptyForm);
  const [selectedId,   setSelectedId]   = useState(null);
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [activeTab,    setActiveTab]    = useState("personal");
  const [toast,        setToast]        = useState(null);
  const [dbStatus,     setDbStatus]     = useState("connecting");

  const showToast = (msg, type="success") => {
    setToast({msg,type});
    setTimeout(()=>setToast(null), 4000);
  };

  // ── Wrapper: auto-retry once after session refresh ────────────────
  const safeCall = useCallback(async (fn) => {
    try {
      return await fn(token);
    } catch(e) {
      if (e.code === "SESSION_EXPIRED") {
        showToast("Refreshing session…","warning");
        const ok = await onSessionExpired();
        if (ok) {
          // Get fresh token from localStorage and retry
          try {
            const stored = JSON.parse(localStorage.getItem("crm_session")||"{}");
            return await fn(stored.token || token);
          } catch(e2) { throw e2; }
        } else {
          throw new Error("Please log in again");
        }
      }
      throw e;
    }
  }, [token, onSessionExpired]);

  const fetchCustomers = useCallback(async () => {
    setLoading(true); setDbStatus("connecting");
    try {
      const rows = await safeCall(t => sb(`${TABLE}?select=*&order=created_at.desc`,"GET",null,t));
      setCustomers((rows||[]).map(fromRow));
      setDbStatus("ok");
    } catch(e) {
      setDbStatus("error");
      showToast("Error: "+e.message, "error");
    } finally { setLoading(false); }
  }, [safeCall]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const saveCustomer = async () => {
    if (!form.name.trim()) { showToast("Client name is required","error"); return; }
    setSaving(true);
    try {
      const row = toRow(form);
      if (form.id) {
        await safeCall(t => sb(`${TABLE}?id=eq.${form.id}`,"PATCH",row,t));
        showToast("✓ Client updated");
      } else {
        await safeCall(t => sb(TABLE,"POST",row,t));
        showToast("✓ Client saved to Supabase");
      }
      await fetchCustomers(); setView("list");
    } catch(e) { showToast("Save failed: "+e.message,"error"); }
    finally { setSaving(false); }
  };

  const deleteCustomer = async (id) => {
    if (!window.confirm("Delete this client permanently?")) return;
    try {
      await safeCall(t => sb(`${TABLE}?id=eq.${id}`,"DELETE",null,t));
      showToast("Client deleted","info");
      await fetchCustomers(); setView("list");
    } catch(e) { showToast("Delete failed: "+e.message,"error"); }
  };

  const exportCSV = () => {
    const headers = ["Name","Email","Phone","Address","Status","Project Type","Budget","Timeline","Rooms","Length ft","Width ft","Height ft","Style","Palette","Notes"];
    const rows = customers.map(c=>[
      c.name,c.email,c.phone,c.address,c.status,c.projectType,c.budget,c.timeline,
      (c.rooms||[]).join("|"),c.dimensions?.length||"",c.dimensions?.width||"",c.dimensions?.height||"",
      c.style,c.palette?.name||"",c.notes
    ].map(v=>`"${(v||"").toString().replace(/"/g,'""')}"`).join(","));
    const csv = [headers.join(","),...rows].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    a.download="customers.csv"; a.click();
    showToast("✓ CSV exported");
  };

  const openNew    = () => { setForm({...emptyForm}); setActiveTab("personal"); setView("form"); };
  const openEdit   = (c) => { setForm({...c}); setActiveTab("personal"); setView("form"); };
  const openDetail = (c) => { setSelectedId(c.id); setView("detail"); };
  const setF    = (k,v) => setForm(f=>({...f,[k]:v}));
  const setDim  = (k,v) => setForm(f=>({...f,dimensions:{...f.dimensions,[k]:v}}));
  const toggleRoom=(r)=> setForm(f=>({...f,rooms:f.rooms.includes(r)?f.rooms.filter(x=>x!==r):[...f.rooms,r]}));

  const filtered = customers.filter(c=>{
    const q=search.toLowerCase();
    return (c.name.toLowerCase().includes(q)||c.email.toLowerCase().includes(q)||(c.phone||"").includes(q))
      &&(filterStatus==="All"||c.status===filterStatus);
  });
  const stats = { total:customers.length, active:customers.filter(c=>c.status==="Active").length, leads:customers.filter(c=>c.status==="Lead").length, completed:customers.filter(c=>c.status==="Completed").length };
  const selected = customers.find(c=>c.id===selectedId);
  const tabs = ["personal","dimensions","design","notes"];

  const S = {
    app:   { minHeight:"100vh",background:"#F9F5F0",fontFamily:"'Cormorant Garamond',Georgia,serif",color:"#2C1F0E" },
    header:{ background:"linear-gradient(135deg,#2C1F0E 0%,#5C3D1E 60%,#8B6F47 100%)",padding:"0 40px",height:70,display:"flex",alignItems:"center",justifyContent:"space-between",boxShadow:"0 4px 20px rgba(44,31,14,0.25)" },
    logo:  { color:"#F5E6D3",fontSize:22,fontWeight:700,letterSpacing:3,textTransform:"uppercase" },
    logoSub:{ color:"#C9A882",fontSize:10,letterSpacing:6,marginTop:-4,display:"block" },
    main:  { maxWidth:1100,margin:"0 auto",padding:"36px 24px" },
    statCard:{ background:"#fff",borderRadius:16,padding:"22px 28px",flex:1,boxShadow:"0 2px 12px rgba(44,31,14,0.07)",border:"1px solid #EDE0CE" },
    card:  { background:"#fff",borderRadius:16,padding:"20px 24px",boxShadow:"0 2px 12px rgba(44,31,14,0.06)",border:"1px solid #EDE0CE",cursor:"pointer",transition:"all 0.2s",marginBottom:12 },
    input: { width:"100%",padding:"10px 14px",borderRadius:10,border:"1.5px solid #DDD0C0",fontFamily:"inherit",fontSize:14,color:"#2C1F0E",background:"#FDFAF6",outline:"none",boxSizing:"border-box" },
    label: { fontSize:11,letterSpacing:2,color:"#9A8070",textTransform:"uppercase",marginBottom:6,display:"block" },
    btn:   (v="primary")=>({ padding:"10px 24px",borderRadius:10,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,letterSpacing:1.5,textTransform:"uppercase",fontWeight:600,transition:"all 0.2s",
      ...(v==="primary"?{background:"#8B6F47",color:"#fff",boxShadow:"0 4px 12px rgba(139,111,71,0.3)"}
        :v==="ghost"?{background:"transparent",color:"#8B6F47",border:"1.5px solid #8B6F47"}
        :v==="danger"?{background:"#C0392B",color:"#fff"}
        :v==="dark"?{background:"rgba(255,255,255,0.15)",color:"#F5E6D3",border:"1px solid rgba(255,255,255,0.3)"}
        :{background:"#F5E6D3",color:"#8B6F47"}) }),
    tab:  (a)=>({ padding:"8px 20px",borderRadius:8,cursor:"pointer",fontSize:12,letterSpacing:1.5,textTransform:"uppercase",fontWeight:600,border:"none",fontFamily:"inherit",background:a?"#8B6F47":"transparent",color:a?"#fff":"#9A8070" }),
    pill: (a)=>({ padding:"6px 14px",borderRadius:20,fontSize:12,cursor:"pointer",border:"1.5px solid",borderColor:a?"#8B6F47":"#DDD0C0",background:a?"#F5E6D3":"transparent",color:a?"#5C3D1E":"#9A8070",fontFamily:"inherit" }),
    row:  { display:"flex",gap:16,marginBottom:18,flexWrap:"wrap" },
  };

  const dbColor = { connecting:"#C9A882",ok:"#27AE60",error:"#C0392B" }[dbStatus];
  const dbLabel = { connecting:"Connecting…",ok:"● Connected",error:"● Error" }[dbStatus];

  // ── LIST ──────────────────────────────────────────────────────────
  if (view==="list") return (
    <div style={S.app}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes slideIn{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      {toast && <Toast msg={toast.msg} type={toast.type}/>}
      <div style={S.header}>
        <div><div style={S.logo}>Maison Intérieur</div><span style={S.logoSub}>Customer Registry</span></div>
        <div style={{ display:"flex",alignItems:"center",gap:12 }}>
          <span style={{ background:dbColor,color:"#fff",fontSize:10,letterSpacing:1.5,padding:"3px 12px",borderRadius:20 }}>{dbLabel}</span>
          <span style={{ color:"#C9A882",fontSize:11 }}>{user?.email}</span>
          <button style={S.btn("dark")} onClick={fetchCustomers}>↻</button>
          <button style={S.btn("dark")} onClick={exportCSV}>↓ CSV</button>
          <button style={S.btn("dark")} onClick={onLogout}>Sign Out</button>
          <button style={S.btn()} onClick={openNew}>+ New Client</button>
        </div>
      </div>
      <div style={S.main}>
        <div style={{ display:"flex",gap:16,marginBottom:32,flexWrap:"wrap" }}>
          {[["Total","🏛",stats.total],["Active","✦",stats.active],["Leads","◎",stats.leads],["Completed","✓",stats.completed]].map(([label,icon,num])=>(
            <div key={label} style={S.statCard}>
              <div style={{ fontSize:36,fontWeight:700,color:"#8B6F47",lineHeight:1 }}>{loading?"…":num}</div>
              <div style={{ fontSize:11,letterSpacing:2,color:"#9A8070",textTransform:"uppercase",marginTop:4 }}>{icon} {label}</div>
            </div>
          ))}
        </div>
        <div style={{ display:"flex",gap:12,marginBottom:24,flexWrap:"wrap",alignItems:"center" }}>
          <input style={{ ...S.input,width:280,marginBottom:0 }} placeholder="Search clients…" value={search} onChange={e=>setSearch(e.target.value)}/>
          <div style={{ display:"flex",gap:6,background:"#F0E8DC",padding:5,borderRadius:10 }}>
            {["All",...STATUSES].map(s=><button key={s} style={S.tab(filterStatus===s)} onClick={()=>setFilterStatus(s)}>{s}</button>)}
          </div>
        </div>
        {loading ? <Spinner/> : filtered.length===0 ? (
          <div style={{ textAlign:"center",padding:80,color:"#C9A882" }}>
            <div style={{ fontSize:48,marginBottom:12 }}>🏛</div>
            <div style={{ fontSize:18,letterSpacing:2 }}>{customers.length===0?"No clients yet":"No results"}</div>
            {customers.length===0 && <button style={{ ...S.btn(),marginTop:24 }} onClick={openNew}>+ Add First Client</button>}
          </div>
        ) : filtered.map(c=>(
          <div key={c.id} style={S.card}
            onMouseEnter={e=>e.currentTarget.style.boxShadow="0 6px 24px rgba(44,31,14,0.12)"}
            onMouseLeave={e=>e.currentTarget.style.boxShadow="0 2px 12px rgba(44,31,14,0.06)"}
            onClick={()=>openDetail(c)}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10 }}>
              <div>
                <div style={{ fontSize:18,fontWeight:700,marginBottom:4 }}>{c.name}</div>
                <div style={{ fontSize:13,color:"#9A8070" }}>{c.email}{c.phone?` · ${c.phone}`:""}</div>
              </div>
              <div style={{ display:"flex",gap:10,alignItems:"center" }}>
                {c.palette && <ColorSwatch colors={c.palette.colors}/>}
                <Badge status={c.status}/>
                <button style={{ ...S.btn("ghost"),padding:"6px 14px",fontSize:11 }} onClick={e=>{e.stopPropagation();openEdit(c);}}>Edit</button>
              </div>
            </div>
            <div style={{ marginTop:10,display:"flex",gap:20,flexWrap:"wrap" }}>
              {c.style && <span style={{ fontSize:12,color:"#8B6F47" }}>✦ {c.style}</span>}
              {(c.rooms||[]).length>0 && <span style={{ fontSize:12,color:"#9A8070" }}>🏠 {c.rooms.slice(0,3).join(", ")}{c.rooms.length>3?` +${c.rooms.length-3}`:""}</span>}
              {c.budget && <span style={{ fontSize:12,color:"#9A8070" }}>💰 {c.budget}</span>}
              {(c.dimensions?.length||c.dimensions?.width) && <span style={{ fontSize:12,color:"#9A8070" }}>📐 {c.dimensions.length}×{c.dimensions.width} ft</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── DETAIL ────────────────────────────────────────────────────────
  if (view==="detail"&&selected) return (
    <div style={S.app}>
      {toast && <Toast msg={toast.msg} type={toast.type}/>}
      <div style={S.header}>
        <div><div style={S.logo}>Maison Intérieur</div><span style={S.logoSub}>Client Profile</span></div>
        <div style={{ display:"flex",gap:10 }}>
          <button style={S.btn("dark")} onClick={()=>setView("list")}>← Back</button>
          <button style={S.btn()} onClick={()=>openEdit(selected)}>Edit</button>
        </div>
      </div>
      <div style={S.main}>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20 }}>
          <div>
            <div style={{ ...S.statCard,marginBottom:20 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
                <div><div style={{ fontSize:26,fontWeight:700 }}>{selected.name}</div><div style={{ color:"#9A8070",fontSize:13 }}>{selected.projectType}</div></div>
                <Badge status={selected.status}/>
              </div>
              <div style={{ display:"grid",gap:10 }}>
                {[["📧",selected.email],["📞",selected.phone],["📍",selected.address],["💰",selected.budget],["📅",selected.timeline]].filter(([,v])=>v).map(([i,v])=>(
                  <div key={i} style={{ fontSize:13 }}><span style={{ color:"#9A8070" }}>{i} </span>{v}</div>
                ))}
              </div>
            </div>
            {selected.notes&&<div style={S.statCard}><div style={{ fontSize:11,letterSpacing:2,color:"#9A8070",textTransform:"uppercase",marginBottom:8 }}>Notes</div><div style={{ fontSize:14,lineHeight:1.7 }}>{selected.notes}</div></div>}
          </div>
          <div>
            <div style={{ ...S.statCard,marginBottom:20 }}>
              <div style={{ fontSize:11,letterSpacing:2,color:"#9A8070",textTransform:"uppercase",marginBottom:16 }}>Design Requirements</div>
              {selected.style&&<div style={{ marginBottom:12 }}><span style={{ color:"#9A8070",fontSize:13 }}>Style: </span><strong>{selected.style}</strong></div>}
              {(selected.dimensions?.length||selected.dimensions?.width)&&<div style={{ marginBottom:12 }}><span style={{ color:"#9A8070",fontSize:13 }}>Dimensions: </span><strong>{selected.dimensions.length} × {selected.dimensions.width}{selected.dimensions.height?` × ${selected.dimensions.height}`:""} ft</strong></div>}
              {(selected.rooms||[]).length>0&&<div><div style={{ color:"#9A8070",fontSize:13,marginBottom:8 }}>Rooms:</div><div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>{selected.rooms.map(r=><span key={r} style={{ background:"#F5E6D3",color:"#5C3D1E",padding:"4px 12px",borderRadius:20,fontSize:12 }}>{r}</span>)}</div></div>}
            </div>
            {selected.palette&&<div style={S.statCard}><div style={{ fontSize:11,letterSpacing:2,color:"#9A8070",textTransform:"uppercase",marginBottom:16 }}>Palette — {selected.palette.name}</div><div style={{ display:"flex",gap:10 }}>{selected.palette.colors.map((col,i)=><div key={i} style={{ flex:1,height:60,borderRadius:10,background:col }}/>)}</div></div>}
          </div>
        </div>
        <button style={{ ...S.btn("danger"),marginTop:24 }} onClick={()=>deleteCustomer(selected.id)}>Delete Client</button>
      </div>
    </div>
  );

  // ── FORM ──────────────────────────────────────────────────────────
  return (
    <div style={S.app}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes slideIn{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      {toast && <Toast msg={toast.msg} type={toast.type}/>}
      <div style={S.header}>
        <div><div style={S.logo}>Maison Intérieur</div><span style={S.logoSub}>{form.id?"Edit Client":"New Client"}</span></div>
        <div style={{ display:"flex",gap:10 }}>
          <button style={S.btn("dark")} onClick={()=>setView("list")}>Cancel</button>
          <button style={{ ...S.btn(),opacity:saving?0.7:1 }} onClick={saveCustomer} disabled={saving}>{saving?"Saving…":form.id?"Update":"Save to Supabase"}</button>
        </div>
      </div>
      <div style={S.main}>
        <div style={{ display:"flex",gap:8,marginBottom:28,background:"#F0E8DC",padding:6,borderRadius:12,width:"fit-content" }}>
          {[["personal","👤 Personal"],["dimensions","📐 Dimensions"],["design","🎨 Design"],["notes","📝 Notes"]].map(([k,label])=>(
            <button key={k} style={S.tab(activeTab===k)} onClick={()=>setActiveTab(k)}>{label}</button>
          ))}
        </div>
        <div style={{ background:"#fff",borderRadius:20,padding:"32px 36px",border:"1px solid #EDE0CE",boxShadow:"0 4px 20px rgba(44,31,14,0.06)" }}>
          {activeTab==="personal"&&(
            <div>
              <div style={S.row}>
                <div style={{ flex:2 }}><label style={S.label}>Full Name *</label><input style={S.input} value={form.name} onChange={e=>setF("name",e.target.value)} placeholder="Alexandra Morris"/></div>
                <div style={{ flex:1 }}><label style={S.label}>Status</label><select style={S.input} value={form.status} onChange={e=>setF("status",e.target.value)}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
              </div>
              <div style={S.row}>
                <div style={{ flex:1 }}><label style={S.label}>Email</label><input style={S.input} type="email" value={form.email} onChange={e=>setF("email",e.target.value)} placeholder="alex@email.com"/></div>
                <div style={{ flex:1 }}><label style={S.label}>Phone</label><input style={S.input} value={form.phone} onChange={e=>setF("phone",e.target.value)} placeholder="+1 (555) 000-0000"/></div>
              </div>
              <div style={{ marginBottom:18 }}><label style={S.label}>Address</label><input style={S.input} value={form.address} onChange={e=>setF("address",e.target.value)} placeholder="123 Elm Street"/></div>
              <div style={S.row}>
                <div style={{ flex:1 }}><label style={S.label}>Project Type</label><select style={S.input} value={form.projectType} onChange={e=>setF("projectType",e.target.value)}>{["Residential","Commercial","Hospitality","Office"].map(t=><option key={t}>{t}</option>)}</select></div>
                <div style={{ flex:1 }}><label style={S.label}>Budget</label><select style={S.input} value={form.budget} onChange={e=>setF("budget",e.target.value)}><option value="">Select</option>{["Under $10K","$10K–$25K","$25K–$50K","$50K–$100K","$100K–$250K","$250K+"].map(b=><option key={b}>{b}</option>)}</select></div>
                <div style={{ flex:1 }}><label style={S.label}>Timeline</label><select style={S.input} value={form.timeline} onChange={e=>setF("timeline",e.target.value)}><option value="">Select</option>{["1–2 months","3–4 months","5–6 months","6–12 months","12+ months"].map(t=><option key={t}>{t}</option>)}</select></div>
              </div>
            </div>
          )}
          {activeTab==="dimensions"&&(
            <div>
              <div style={{ fontSize:14,color:"#9A8070",marginBottom:24 }}>Enter dimensions in feet.</div>
              <div style={S.row}>{[["length","Length (ft)"],["width","Width (ft)"],["height","Ceiling Height (ft)"]].map(([k,label])=>(
                <div key={k} style={{ flex:1 }}><label style={S.label}>{label}</label><input style={S.input} type="number" value={form.dimensions[k]} onChange={e=>setDim(k,e.target.value)} placeholder="0"/></div>
              ))}</div>
              {form.dimensions.length&&form.dimensions.width&&(
                <div style={{ background:"#F9F5F0",borderRadius:12,padding:"16px 20px",marginBottom:20,border:"1px solid #EDE0CE" }}>
                  <div style={{ fontSize:11,letterSpacing:2,color:"#9A8070",textTransform:"uppercase",marginBottom:8 }}>Calculated</div>
                  <div style={{ display:"flex",gap:32 }}>
                    <div><span style={{ color:"#9A8070",fontSize:13 }}>Area: </span><strong>{(form.dimensions.length*form.dimensions.width).toFixed(0)} sq ft</strong></div>
                    {form.dimensions.height&&<div><span style={{ color:"#9A8070",fontSize:13 }}>Volume: </span><strong>{(form.dimensions.length*form.dimensions.width*form.dimensions.height).toFixed(0)} cu ft</strong></div>}
                  </div>
                </div>
              )}
              <div><label style={S.label}>Rooms to Design</label><div style={{ display:"flex",flexWrap:"wrap",gap:8,marginTop:8 }}>{ROOMS.map(r=><button key={r} style={S.pill(form.rooms.includes(r))} onClick={()=>toggleRoom(r)}>{r}</button>)}</div></div>
            </div>
          )}
          {activeTab==="design"&&(
            <div>
              <div style={{ marginBottom:28 }}><label style={S.label}>Interior Style</label><div style={{ display:"flex",flexWrap:"wrap",gap:8,marginTop:8 }}>{STYLES.map(s=><button key={s} style={S.pill(form.style===s)} onClick={()=>setF("style",s)}>{s}</button>)}</div></div>
              <div><label style={S.label}>Color Palette</label>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:12,marginTop:10 }}>
                  {PALETTES.map(p=>(
                    <div key={p.name} onClick={()=>setF("palette",form.palette?.name===p.name?null:p)}
                      style={{ border:`2px solid ${form.palette?.name===p.name?"#8B6F47":"#EDE0CE"}`,borderRadius:12,padding:14,cursor:"pointer",background:form.palette?.name===p.name?"#FBF5EE":"#fff" }}>
                      <div style={{ display:"flex",gap:6,marginBottom:8 }}>{p.colors.map((c,i)=><div key={i} style={{ flex:1,height:32,borderRadius:6,background:c }}/>)}</div>
                      <div style={{ fontSize:12,fontWeight:600,color:form.palette?.name===p.name?"#5C3D1E":"#9A8070" }}>{p.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {activeTab==="notes"&&(
            <div><label style={S.label}>Project Notes & Special Requirements</label><textarea style={{ ...S.input,minHeight:200,resize:"vertical",lineHeight:1.7 }} value={form.notes} onChange={e=>setF("notes",e.target.value)} placeholder="Client lifestyle, special requirements, furniture to keep…"/></div>
          )}
          <div style={{ display:"flex",justifyContent:"space-between",marginTop:28,paddingTop:20,borderTop:"1px solid #EDE0CE" }}>
            <button style={S.btn("ghost")} onClick={()=>{const i=tabs.indexOf(activeTab);if(i>0)setActiveTab(tabs[i-1]);}} disabled={activeTab===tabs[0]}>← Previous</button>
            {activeTab!==tabs[tabs.length-1]
              ?<button style={S.btn()} onClick={()=>{const i=tabs.indexOf(activeTab);setActiveTab(tabs[i+1]);}}>Next →</button>
              :<button style={{ ...S.btn(),opacity:saving?0.7:1 }} onClick={saveCustomer} disabled={saving}>{saving?"Saving…":form.id?"Update":"Save to Supabase"}</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
