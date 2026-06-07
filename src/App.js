import { useState, useEffect, useCallback } from "react";
import { sb, toRow, fromRow, TABLE } from "./supabase";

// ── Master Data from High Rise Interiors ─────────────────────────────
const ROOMS = [
  "Drawing Room", "Living Area", "Dining", "Master Bedroom",
  "Children Bedroom", "Guest Bedroom", "Kitchen", "Pooja",
  "Entrance", "Balcony", "Bathroom", "Study Room"
];

const STYLES = [
  "Modern Contemporary", "Classic Traditional", "Minimalist",
  "Luxury", "Scandinavian", "Industrial", "Bohemian",
  "Art Deco", "Mediterranean", "Rustic"
];

const MATERIALS = {
  plywood: ["Century Club Prime", "Green Ply HDHMR", "Sainik 710", "Block Boards", "WPVC"],
  laminate: ["Virgo", "Croma", "Acrylic Sheets"],
  glass: ["Modi Guard 4mm Black Tinted", "Modi Guard Mirror"],
  handles: ["Gola Profile", "Standard"],
  hardware: ["Nimmi Hinges", "Nimmi Channels", "Hettich Tandem"],
  ceiling: ["Saint Gobin Gyproc", "PVC"],
  lights: ["Phillips", "Wipro", "Panasonic"],
  tiles: ["AMS 2X4"],
};

const BUDGETS = [
  "Under ₹5L", "₹5L–₹10L", "₹10L–₹15L",
  "₹15L–₹20L", "₹20L–₹25L", "₹25L–₹30L", "Above ₹30L"
];

const TIMELINES = [
  "30 Days", "45 Days", "60 Days", "75 Days",
  "90 Days", "120 Days", "Custom"
];

const PAYMENT_PHASES = [
  { day: "Day 1",  label: "Advance (before project starts)", pct: 35 },
  { day: "Day 15", label: "Phase 2 (After box frame work)",   pct: 35 },
  { day: "Day 25", label: "Phase 3 (After wardrobes, before deco)", pct: 20 },
  { day: "Day 45", label: "Phase 4 (On handover day)",        pct: 10 },
];

const STATUSES = ["Lead", "Active", "In Progress", "Completed", "On Hold"];

const emptyForm = {
  id: null, name: "", email: "", phone: "", address: "",
  projectType: "Residential", budget: "", timeline: "",
  rooms: [], dimensions: { length: "", width: "", height: "" },
  style: "", palette: null, notes: "",
  status: "Lead",
  quotation: "", previousQuotation: "", revisedQuotation: "",
  startDate: "", plywood: "", laminate: "", hardware: "",
};

// ── Helpers ───────────────────────────────────────────────────────────
const fmt = (v) => v ? `₹${Number(v).toLocaleString("en-IN")}` : "";

function Toast({ msg, type }) {
  const bg = { success:"#1A7A4A", error:"#C0392B", info:"#5C3D1E", warning:"#E67E22" }[type]||"#5C3D1E";
  return <div style={{ position:"fixed",bottom:24,right:24,zIndex:9999,background:bg,color:"#fff",padding:"14px 22px",borderRadius:12,fontSize:13,boxShadow:"0 4px 20px rgba(0,0,0,0.2)",fontFamily:"inherit",maxWidth:400,lineHeight:1.5,animation:"slideIn 0.3s ease" }}>{msg}</div>;
}

function Badge({ status }) {
  const m = {
    Lead:         { bg:"#FFF3CD", c:"#856404" },
    Active:       { bg:"#D1ECF1", c:"#0C5460" },
    "In Progress":{ bg:"#E8D5FF", c:"#6A1B9A" },
    Completed:    { bg:"#D4EDDA", c:"#155724" },
    "On Hold":    { bg:"#F8D7DA", c:"#721C24" },
  };
  const s = m[status]||m.Lead;
  return <span style={{ background:s.bg,color:s.c,padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:700,letterSpacing:1 }}>{status}</span>;
}

function Spinner() {
  return <div style={{ display:"flex",justifyContent:"center",padding:80 }}><div style={{ width:40,height:40,border:"3px solid #EDE0CE",borderTop:"3px solid #8B1A1A",borderRadius:"50%",animation:"spin 0.8s linear infinite" }}/></div>;
}

// ── Main App ──────────────────────────────────────────────────────────
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

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),4000); };

  const safeCall = useCallback(async (fn) => {
    try { return await fn(token); }
    catch(e) {
      if (e.code==="SESSION_EXPIRED") {
        const ok = await onSessionExpired();
        if (ok) {
          try {
            const s = JSON.parse(localStorage.getItem("crm_session")||"{}");
            return await fn(s.token||token);
          } catch(e2) { throw e2; }
        }
        throw new Error("Please log in again");
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
    } catch(e) { setDbStatus("error"); showToast("Error: "+e.message,"error"); }
    finally { setLoading(false); }
  }, [safeCall]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const saveCustomer = async () => {
    if (!form.name.trim()) { showToast("Client name is required","error"); return; }
    setSaving(true);
    try {
      const row = toRow(form);
      if (form.id) { await safeCall(t=>sb(`${TABLE}?id=eq.${form.id}`,"PATCH",row,t)); showToast("✓ Client updated"); }
      else          { await safeCall(t=>sb(TABLE,"POST",row,t)); showToast("✓ Client saved"); }
      await fetchCustomers(); setView("list");
    } catch(e) { showToast("Save failed: "+e.message,"error"); }
    finally { setSaving(false); }
  };

  const deleteCustomer = async (id) => {
    if (!window.confirm("Delete this client permanently?")) return;
    try { await safeCall(t=>sb(`${TABLE}?id=eq.${id}`,"DELETE",null,t)); showToast("Client deleted","info"); await fetchCustomers(); setView("list"); }
    catch(e) { showToast("Delete failed: "+e.message,"error"); }
  };

  const exportCSV = () => {
    const headers = ["Name","Phone","Email","Address","Status","Project Type","Budget","Timeline","Rooms","Quotation","Start Date","Style","Plywood","Laminate","Notes"];
    const rows = customers.map(c=>[
      c.name,c.phone,c.email,c.address,c.status,c.projectType,c.budget,c.timeline,
      (c.rooms||[]).join("|"),c.quotation||"",c.startDate||"",c.style,c.plywood||"",c.laminate||"",c.notes
    ].map(v=>`"${(v||"").toString().replace(/"/g,'""')}"`).join(","));
    const csv=[headers.join(","),...rows].join("\n");
    const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    a.download="highrise-customers.csv"; a.click(); showToast("✓ CSV exported");
  };

  const openNew    = () => { setForm({...emptyForm}); setActiveTab("personal"); setView("form"); };
  const openEdit   = (c) => { setForm({...c}); setActiveTab("personal"); setView("form"); };
  const openDetail = (c) => { setSelectedId(c.id); setView("detail"); };
  const setF    = (k,v) => setForm(f=>({...f,[k]:v}));
  const setDim  = (k,v) => setForm(f=>({...f,dimensions:{...f.dimensions,[k]:v}}));
  const toggleRoom=(r)=>setForm(f=>({...f,rooms:f.rooms.includes(r)?f.rooms.filter(x=>x!==r):[...f.rooms,r]}));

  const filtered = customers.filter(c=>{
    const q=search.toLowerCase();
    return (c.name.toLowerCase().includes(q)||c.email.toLowerCase().includes(q)||(c.phone||"").includes(q)||(c.address||"").toLowerCase().includes(q))
      &&(filterStatus==="All"||c.status===filterStatus);
  });

  const stats = {
    total:customers.length,
    active:customers.filter(c=>c.status==="Active"||c.status==="In Progress").length,
    leads:customers.filter(c=>c.status==="Lead").length,
    completed:customers.filter(c=>c.status==="Completed").length,
    revenue:customers.filter(c=>c.quotation).reduce((s,c)=>s+Number(c.quotation||0),0),
  };

  const selected = customers.find(c=>c.id===selectedId);
  const tabs = ["personal","dimensions","materials","quotation","notes"];

  const S = {
    app:     { minHeight:"100vh", background:"#FBF8F5", fontFamily:"'Cormorant Garamond',Georgia,serif", color:"#1A0A00" },
    header:  { background:"linear-gradient(135deg,#8B1A1A 0%,#C0392B 60%,#E74C3C 100%)", padding:"0 32px", height:70, display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 4px 20px rgba(139,26,26,0.4)" },
    logo:    { color:"#FFF5F5", fontSize:20, fontWeight:700, letterSpacing:2, textTransform:"uppercase" },
    logoSub: { color:"#FFAAAA", fontSize:10, letterSpacing:4, marginTop:-4, display:"block" },
    main:    { maxWidth:1100, margin:"0 auto", padding:"32px 24px" },
    statCard:{ background:"#fff", borderRadius:16, padding:"20px 24px", flex:1, boxShadow:"0 2px 12px rgba(139,26,26,0.07)", border:"1px solid #F0E0E0" },
    card:    { background:"#fff", borderRadius:16, padding:"20px 24px", boxShadow:"0 2px 12px rgba(139,26,26,0.06)", border:"1px solid #F0E0E0", cursor:"pointer", transition:"all 0.2s", marginBottom:12 },
    input:   { width:"100%", padding:"10px 14px", borderRadius:10, border:"1.5px solid #E0CCCC", fontFamily:"inherit", fontSize:14, color:"#1A0A00", background:"#FFFAFA", outline:"none", boxSizing:"border-box" },
    label:   { fontSize:11, letterSpacing:2, color:"#9A7070", textTransform:"uppercase", marginBottom:6, display:"block" },
    btn:     (v="primary")=>({ padding:"10px 24px", borderRadius:10, border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:13, letterSpacing:1.5, textTransform:"uppercase", fontWeight:600, transition:"all 0.2s",
      ...(v==="primary"?{background:"#8B1A1A",color:"#fff",boxShadow:"0 4px 12px rgba(139,26,26,0.3)"}
        :v==="ghost"?{background:"transparent",color:"#8B1A1A",border:"1.5px solid #8B1A1A"}
        :v==="danger"?{background:"#C0392B",color:"#fff"}
        :v==="dark"?{background:"rgba(255,255,255,0.15)",color:"#FFF5F5",border:"1px solid rgba(255,255,255,0.3)"}
        :{background:"#FFEEEE",color:"#8B1A1A"}) }),
    tab:     (a)=>({ padding:"8px 18px", borderRadius:8, cursor:"pointer", fontSize:11, letterSpacing:1.5, textTransform:"uppercase", fontWeight:600, border:"none", fontFamily:"inherit", background:a?"#8B1A1A":"transparent", color:a?"#fff":"#9A7070" }),
    pill:    (a)=>({ padding:"6px 14px", borderRadius:20, fontSize:12, cursor:"pointer", border:"1.5px solid", borderColor:a?"#8B1A1A":"#E0CCCC", background:a?"#FFEEEE":"transparent", color:a?"#8B1A1A":"#9A7070", fontFamily:"inherit" }),
    row:     { display:"flex", gap:16, marginBottom:18, flexWrap:"wrap" },
    section: { fontSize:12, letterSpacing:2, color:"#8B1A1A", textTransform:"uppercase", marginBottom:14, marginTop:4, fontWeight:700, borderBottom:"1px solid #F0E0E0", paddingBottom:8 },
  };

  const dbColor = { connecting:"#E8C97A", ok:"#27AE60", error:"#C0392B" }[dbStatus];

  // ── LIST ─────────────────────────────────────────────────────────────
  if (view==="list") return (
    <div style={S.app}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes slideIn{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      {toast && <Toast msg={toast.msg} type={toast.type}/>}
      <div style={S.header}>
        <div>
          <div style={S.logo}>🏗 High Rise Interiors</div>
          <span style={S.logoSub}>Customer Management System</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ background:dbColor, color:"#fff", fontSize:10, letterSpacing:1, padding:"3px 10px", borderRadius:20 }}>● {dbStatus==="ok"?"Connected":"..."}</span>
          <span style={{ color:"#FFAAAA", fontSize:11 }}>{user?.email}</span>
          <button style={S.btn("dark")} onClick={fetchCustomers}>↻</button>
          <button style={S.btn("dark")} onClick={exportCSV}>↓ CSV</button>
          <button style={S.btn("dark")} onClick={onLogout}>Sign Out</button>
          <button style={S.btn()} onClick={openNew}>+ New Client</button>
        </div>
      </div>

      <div style={S.main}>
        {/* Stats */}
        <div style={{ display:"flex", gap:14, marginBottom:28, flexWrap:"wrap" }}>
          {[
            ["Total Clients", stats.total, "👥"],
            ["Active Projects", stats.active, "🔨"],
            ["New Leads", stats.leads, "📋"],
            ["Completed", stats.completed, "✅"],
          ].map(([label,num,icon])=>(
            <div key={label} style={S.statCard}>
              <div style={{ fontSize:34, fontWeight:700, color:"#8B1A1A", lineHeight:1 }}>{loading?"…":num}</div>
              <div style={{ fontSize:11, letterSpacing:2, color:"#9A7070", textTransform:"uppercase", marginTop:4 }}>{icon} {label}</div>
            </div>
          ))}
          <div style={{ ...S.statCard, background:"#FFF5F5" }}>
            <div style={{ fontSize:24, fontWeight:700, color:"#8B1A1A", lineHeight:1 }}>{loading?"…":fmt(stats.revenue)}</div>
            <div style={{ fontSize:11, letterSpacing:2, color:"#9A7070", textTransform:"uppercase", marginTop:4 }}>💰 Total Pipeline</div>
          </div>
        </div>

        {/* Search & Filter */}
        <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
          <input style={{ ...S.input, width:280, marginBottom:0 }} placeholder="Search by name, phone, email…" value={search} onChange={e=>setSearch(e.target.value)}/>
          <div style={{ display:"flex", gap:6, background:"#F5EEEE", padding:5, borderRadius:10 }}>
            {["All",...STATUSES].map(s=><button key={s} style={S.tab(filterStatus===s)} onClick={()=>setFilterStatus(s)}>{s}</button>)}
          </div>
        </div>

        {loading ? <Spinner/> : filtered.length===0 ? (
          <div style={{ textAlign:"center", padding:80, color:"#C9A0A0" }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🏗</div>
            <div style={{ fontSize:18 }}>{customers.length===0?"No clients yet":"No results found"}</div>
            {customers.length===0 && <button style={{ ...S.btn(), marginTop:24 }} onClick={openNew}>+ Add First Client</button>}
          </div>
        ) : filtered.map(c=>(
          <div key={c.id} style={S.card}
            onMouseEnter={e=>e.currentTarget.style.boxShadow="0 6px 24px rgba(139,26,26,0.12)"}
            onMouseLeave={e=>e.currentTarget.style.boxShadow="0 2px 12px rgba(139,26,26,0.06)"}
            onClick={()=>openDetail(c)}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
              <div>
                <div style={{ fontSize:18, fontWeight:700, marginBottom:3 }}>{c.name}</div>
                <div style={{ fontSize:13, color:"#9A7070" }}>{c.phone}{c.email?` · ${c.email}`:""}</div>
                {c.address && <div style={{ fontSize:12, color:"#B0A0A0", marginTop:2 }}>📍 {c.address}</div>}
              </div>
              <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
                {c.quotation && <span style={{ background:"#FFF5F5", color:"#8B1A1A", fontWeight:700, fontSize:13, padding:"4px 12px", borderRadius:20, border:"1px solid #F0CCCC" }}>{fmt(c.quotation)}</span>}
                <Badge status={c.status}/>
                <button style={{ ...S.btn("ghost"), padding:"6px 14px", fontSize:11 }} onClick={e=>{e.stopPropagation();openEdit(c);}}>Edit</button>
              </div>
            </div>
            <div style={{ marginTop:10, display:"flex", gap:16, flexWrap:"wrap" }}>
              {c.style && <span style={{ fontSize:12, color:"#8B1A1A" }}>✦ {c.style}</span>}
              {(c.rooms||[]).length>0 && <span style={{ fontSize:12, color:"#9A7070" }}>🏠 {c.rooms.slice(0,4).join(", ")}{c.rooms.length>4?` +${c.rooms.length-4}`:""}</span>}
              {c.timeline && <span style={{ fontSize:12, color:"#9A7070" }}>⏱ {c.timeline}</span>}
              {c.startDate && <span style={{ fontSize:12, color:"#9A7070" }}>📅 {c.startDate}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── DETAIL ────────────────────────────────────────────────────────────
  if (view==="detail" && selected) return (
    <div style={S.app}>
      {toast && <Toast msg={toast.msg} type={toast.type}/>}
      <div style={S.header}>
        <div><div style={S.logo}>🏗 High Rise Interiors</div><span style={S.logoSub}>Client Profile</span></div>
        <div style={{ display:"flex", gap:10 }}>
          <button style={S.btn("dark")} onClick={()=>setView("list")}>← Back</button>
          <button style={S.btn()} onClick={()=>openEdit(selected)}>Edit</button>
        </div>
      </div>
      <div style={S.main}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
          {/* Left */}
          <div>
            <div style={{ ...S.statCard, marginBottom:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:24, fontWeight:700 }}>{selected.name}</div>
                  <div style={{ color:"#9A7070", fontSize:13, marginTop:2 }}>{selected.projectType}</div>
                </div>
                <Badge status={selected.status}/>
              </div>
              <div style={{ display:"grid", gap:8 }}>
                {[["📞",selected.phone],["📧",selected.email],["📍",selected.address],["📅","Start: "+selected.startDate],["⏱",selected.timeline+" duration"]].filter(([,v])=>v&&v!=="undefined"&&v!=="Start: ").map(([i,v])=>(
                  <div key={i} style={{ fontSize:13 }}><span style={{ color:"#9A7070" }}>{i} </span>{v}</div>
                ))}
              </div>
            </div>

            {/* Quotation */}
            {(selected.quotation||selected.previousQuotation) && (
              <div style={{ ...S.statCard, marginBottom:16 }}>
                <div style={S.section}>💰 Quotation</div>
                {selected.previousQuotation && <div style={{ fontSize:13, marginBottom:6 }}><span style={{ color:"#9A7070" }}>Previous: </span><span style={{ textDecoration:"line-through" }}>{fmt(selected.previousQuotation)}</span></div>}
                {selected.revisedQuotation  && <div style={{ fontSize:13, marginBottom:6 }}><span style={{ color:"#9A7070" }}>Revised: </span>{fmt(selected.revisedQuotation)}</div>}
                {selected.quotation         && <div style={{ fontSize:20, fontWeight:700, color:"#8B1A1A" }}>Final: {fmt(selected.quotation)}</div>}

                {/* Payment phases */}
                {selected.quotation && (
                  <div style={{ marginTop:16 }}>
                    <div style={{ fontSize:11, letterSpacing:2, color:"#9A7070", textTransform:"uppercase", marginBottom:10 }}>Payment Schedule</div>
                    <div style={{ display:"grid", gap:8 }}>
                      {PAYMENT_PHASES.map(p=>(
                        <div key={p.day} style={{ display:"flex", justifyContent:"space-between", background:"#FFF5F5", borderRadius:8, padding:"8px 12px", fontSize:12 }}>
                          <span style={{ color:"#9A7070" }}>{p.day} — {p.label}</span>
                          <strong style={{ color:"#8B1A1A" }}>{p.pct}% = {fmt(Math.round(Number(selected.quotation)*p.pct/100))}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right */}
          <div>
            <div style={{ ...S.statCard, marginBottom:16 }}>
              <div style={S.section}>🏠 Scope of Work</div>
              {selected.style && <div style={{ marginBottom:10 }}><span style={{ color:"#9A7070", fontSize:13 }}>Style: </span><strong>{selected.style}</strong></div>}
              {(selected.dimensions?.length||selected.dimensions?.width) && (
                <div style={{ marginBottom:10 }}>
                  <span style={{ color:"#9A7070", fontSize:13 }}>Area: </span>
                  <strong>{selected.dimensions.length} × {selected.dimensions.width}{selected.dimensions.height?` × ${selected.dimensions.height}`:""} ft</strong>
                  {selected.dimensions.length&&selected.dimensions.width&&<span style={{ color:"#9A7070", fontSize:12 }}> ({(selected.dimensions.length*selected.dimensions.width).toFixed(0)} sq ft)</span>}
                </div>
              )}
              {(selected.rooms||[]).length>0 && (
                <div>
                  <div style={{ color:"#9A7070", fontSize:12, letterSpacing:1, textTransform:"uppercase", marginBottom:8 }}>Rooms</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {selected.rooms.map(r=><span key={r} style={{ background:"#FFEEEE", color:"#8B1A1A", padding:"4px 12px", borderRadius:20, fontSize:12 }}>{r}</span>)}
                  </div>
                </div>
              )}
            </div>

            {(selected.plywood||selected.laminate||selected.hardware) && (
              <div style={S.statCard}>
                <div style={S.section}>🔧 Materials</div>
                <div style={{ display:"grid", gap:8 }}>
                  {[["Plywood",selected.plywood],["Laminate",selected.laminate],["Hardware",selected.hardware]].filter(([,v])=>v).map(([l,v])=>(
                    <div key={l} style={{ fontSize:13 }}><span style={{ color:"#9A7070" }}>{l}: </span><strong>{v}</strong></div>
                  ))}
                </div>
              </div>
            )}

            {selected.notes && (
              <div style={{ ...S.statCard, marginTop:16 }}>
                <div style={S.section}>📝 Notes</div>
                <div style={{ fontSize:14, lineHeight:1.7 }}>{selected.notes}</div>
              </div>
            )}
          </div>
        </div>
        <button style={{ ...S.btn("danger"), marginTop:20 }} onClick={()=>deleteCustomer(selected.id)}>Delete Client</button>
      </div>
    </div>
  );

  // ── FORM ──────────────────────────────────────────────────────────────
  return (
    <div style={S.app}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes slideIn{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      {toast && <Toast msg={toast.msg} type={toast.type}/>}
      <div style={S.header}>
        <div><div style={S.logo}>🏗 High Rise Interiors</div><span style={S.logoSub}>{form.id?"Edit Client":"New Client"}</span></div>
        <div style={{ display:"flex", gap:10 }}>
          <button style={S.btn("dark")} onClick={()=>setView("list")}>Cancel</button>
          <button style={{ ...S.btn(), opacity:saving?0.7:1 }} onClick={saveCustomer} disabled={saving}>{saving?"Saving…":form.id?"Update":"Save Client"}</button>
        </div>
      </div>

      <div style={S.main}>
        {/* Tab Nav */}
        <div style={{ display:"flex", gap:6, marginBottom:24, background:"#F5EEEE", padding:5, borderRadius:12, width:"fit-content" }}>
          {[["personal","👤 Client"],["dimensions","📐 Dimensions"],["materials","🔧 Materials"],["quotation","💰 Quotation"],["notes","📝 Notes"]].map(([k,label])=>(
            <button key={k} style={S.tab(activeTab===k)} onClick={()=>setActiveTab(k)}>{label}</button>
          ))}
        </div>

        <div style={{ background:"#fff", borderRadius:20, padding:"32px 36px", border:"1px solid #F0E0E0", boxShadow:"0 4px 20px rgba(139,26,26,0.05)" }}>

          {/* ── Personal ── */}
          {activeTab==="personal" && (
            <div>
              <div style={S.section}>Client Information</div>
              <div style={S.row}>
                <div style={{ flex:2 }}><label style={S.label}>Full Name *</label><input style={S.input} value={form.name} onChange={e=>setF("name",e.target.value)} placeholder="Mr. Sashi Kanth"/></div>
                <div style={{ flex:1 }}><label style={S.label}>Status</label><select style={S.input} value={form.status} onChange={e=>setF("status",e.target.value)}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
              </div>
              <div style={S.row}>
                <div style={{ flex:1 }}><label style={S.label}>Phone</label><input style={S.input} value={form.phone} onChange={e=>setF("phone",e.target.value)} placeholder="+91 98765 43210"/></div>
                <div style={{ flex:1 }}><label style={S.label}>Email</label><input style={S.input} type="email" value={form.email} onChange={e=>setF("email",e.target.value)} placeholder="client@email.com"/></div>
              </div>
              <div style={{ marginBottom:18 }}><label style={S.label}>Project Address</label><input style={S.input} value={form.address} onChange={e=>setF("address",e.target.value)} placeholder="EIPL Cornerstone T2, 803, Hyderabad, Telangana"/></div>
              <div style={S.row}>
                <div style={{ flex:1 }}><label style={S.label}>Project Type</label><select style={S.input} value={form.projectType} onChange={e=>setF("projectType",e.target.value)}>{["Residential","Villa","Apartment","Commercial","Office"].map(t=><option key={t}>{t}</option>)}</select></div>
                <div style={{ flex:1 }}><label style={S.label}>Budget Range</label><select style={S.input} value={form.budget} onChange={e=>setF("budget",e.target.value)}><option value="">Select</option>{BUDGETS.map(b=><option key={b}>{b}</option>)}</select></div>
              </div>
              <div style={S.row}>
                <div style={{ flex:1 }}><label style={S.label}>Project Start Date</label><input style={S.input} type="date" value={form.startDate} onChange={e=>setF("startDate",e.target.value)}/></div>
                <div style={{ flex:1 }}><label style={S.label}>Duration</label><select style={S.input} value={form.timeline} onChange={e=>setF("timeline",e.target.value)}><option value="">Select</option>{TIMELINES.map(t=><option key={t}>{t}</option>)}</select></div>
              </div>
              <div style={{ marginBottom:18 }}><label style={S.label}>Interior Style</label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:8 }}>{STYLES.map(s=><button key={s} style={S.pill(form.style===s)} onClick={()=>setF("style",s)}>{s}</button>)}</div>
              </div>
            </div>
          )}

          {/* ── Dimensions ── */}
          {activeTab==="dimensions" && (
            <div>
              <div style={S.section}>House Dimensions</div>
              <div style={S.row}>
                {[["length","Total Length (ft)"],["width","Total Width (ft)"],["height","Ceiling Height (ft)"]].map(([k,label])=>(
                  <div key={k} style={{ flex:1 }}><label style={S.label}>{label}</label><input style={S.input} type="number" value={form.dimensions[k]} onChange={e=>setDim(k,e.target.value)} placeholder="0"/></div>
                ))}
              </div>
              {form.dimensions.length && form.dimensions.width && (
                <div style={{ background:"#FFF5F5", borderRadius:12, padding:"14px 18px", marginBottom:20, border:"1px solid #F0CCCC" }}>
                  <div style={{ fontSize:11, letterSpacing:2, color:"#9A7070", textTransform:"uppercase", marginBottom:8 }}>Calculated</div>
                  <div style={{ display:"flex", gap:32 }}>
                    <div><span style={{ color:"#9A7070", fontSize:13 }}>Total Area: </span><strong>{(form.dimensions.length*form.dimensions.width).toFixed(0)} sq ft</strong></div>
                    {form.dimensions.height&&<div><span style={{ color:"#9A7070", fontSize:13 }}>Volume: </span><strong>{(form.dimensions.length*form.dimensions.width*form.dimensions.height).toFixed(0)} cu ft</strong></div>}
                  </div>
                </div>
              )}
              <div style={S.section}>Rooms to Design</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {ROOMS.map(r=><button key={r} style={S.pill(form.rooms.includes(r))} onClick={()=>toggleRoom(r)}>{r}</button>)}
              </div>
            </div>
          )}

          {/* ── Materials ── */}
          {activeTab==="materials" && (
            <div>
              <div style={S.section}>Material Specifications</div>
              <div style={S.row}>
                <div style={{ flex:1 }}><label style={S.label}>Plywood Brand</label><select style={S.input} value={form.plywood||""} onChange={e=>setF("plywood",e.target.value)}><option value="">Select</option>{MATERIALS.plywood.map(m=><option key={m}>{m}</option>)}</select></div>
                <div style={{ flex:1 }}><label style={S.label}>Laminate</label><select style={S.input} value={form.laminate||""} onChange={e=>setF("laminate",e.target.value)}><option value="">Select</option>{MATERIALS.laminate.map(m=><option key={m}>{m}</option>)}</select></div>
              </div>
              <div style={S.row}>
                <div style={{ flex:1 }}><label style={S.label}>Hardware</label><select style={S.input} value={form.hardware||""} onChange={e=>setF("hardware",e.target.value)}><option value="">Select</option>{MATERIALS.hardware.map(m=><option key={m}>{m}</option>)}</select></div>
                <div style={{ flex:1 }}><label style={S.label}>Glass/Mirror</label><select style={S.input} value={form.glass||""} onChange={e=>setF("glass",e.target.value)}><option value="">Select</option>{MATERIALS.glass.map(m=><option key={m}>{m}</option>)}</select></div>
              </div>
              <div style={S.row}>
                <div style={{ flex:1 }}><label style={S.label}>Ceiling Board</label><select style={S.input} value={form.ceiling||""} onChange={e=>setF("ceiling",e.target.value)}><option value="">Select</option>{MATERIALS.ceiling.map(m=><option key={m}>{m}</option>)}</select></div>
                <div style={{ flex:1 }}><label style={S.label}>Ceiling Lights</label><select style={S.input} value={form.lights||""} onChange={e=>setF("lights",e.target.value)}><option value="">Select</option>{MATERIALS.lights.map(m=><option key={m}>{m}</option>)}</select></div>
              </div>
              <div style={{ marginBottom:18 }}><label style={S.label}>Kitchen Handles</label><select style={S.input} value={form.handles||""} onChange={e=>setF("handles",e.target.value)}><option value="">Select</option>{MATERIALS.handles.map(m=><option key={m}>{m}</option>)}</select></div>
            </div>
          )}

          {/* ── Quotation ── */}
          {activeTab==="quotation" && (
            <div>
              <div style={S.section}>Project Quotation (INR ₹)</div>
              <div style={S.row}>
                <div style={{ flex:1 }}><label style={S.label}>Previous Quotation ₹</label><input style={S.input} type="number" value={form.previousQuotation||""} onChange={e=>setF("previousQuotation",e.target.value)} placeholder="2291171"/></div>
                <div style={{ flex:1 }}><label style={S.label}>Revised Quotation ₹</label><input style={S.input} type="number" value={form.revisedQuotation||""} onChange={e=>setF("revisedQuotation",e.target.value)} placeholder="2704388"/></div>
              </div>
              <div style={{ marginBottom:24 }}><label style={S.label}>Final Quotation ₹ *</label><input style={S.input} type="number" value={form.quotation||""} onChange={e=>setF("quotation",e.target.value)} placeholder="2504040"/></div>

              {form.quotation && (
                <div>
                  <div style={S.section}>Payment Schedule</div>
                  <div style={{ display:"grid", gap:10 }}>
                    {PAYMENT_PHASES.map((p,i)=>(
                      <div key={i} style={{ background:"#FFF5F5", borderRadius:12, padding:"14px 18px", border:"1px solid #F0CCCC", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <div>
                          <div style={{ fontWeight:700, fontSize:13, color:"#8B1A1A" }}>{p.day} — {p.pct}%</div>
                          <div style={{ fontSize:12, color:"#9A7070", marginTop:2 }}>{p.label}</div>
                        </div>
                        <div style={{ fontSize:18, fontWeight:700, color:"#8B1A1A" }}>{fmt(Math.round(Number(form.quotation)*p.pct/100))}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Notes ── */}
          {activeTab==="notes" && (
            <div>
              <div style={S.section}>Scope of Work & Notes</div>
              <textarea style={{ ...S.input, minHeight:220, resize:"vertical", lineHeight:1.8 }}
                value={form.notes} onChange={e=>setF("notes",e.target.value)}
                placeholder="Describe scope of work, special requirements, out of scope items, client preferences…&#10;&#10;Example:&#10;Drawing: TV unit 10ft with PVD partition&#10;Kitchen: U-Shape acrylic finish with quartz countertop&#10;Out of scope: Electrical accessories, curtains…"/>
            </div>
          )}

          {/* Footer Nav */}
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:28, paddingTop:20, borderTop:"1px solid #F0E0E0" }}>
            <button style={S.btn("ghost")} onClick={()=>{const i=tabs.indexOf(activeTab);if(i>0)setActiveTab(tabs[i-1]);}} disabled={activeTab===tabs[0]}>← Previous</button>
            {activeTab!==tabs[tabs.length-1]
              ?<button style={S.btn()} onClick={()=>{const i=tabs.indexOf(activeTab);setActiveTab(tabs[i+1]);}}>Next →</button>
              :<button style={{ ...S.btn(), opacity:saving?0.7:1 }} onClick={saveCustomer} disabled={saving}>{saving?"Saving…":form.id?"Update":"Save Client"}</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
