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

  // ── REPORT VIEW ───────────────────────────────────────────────────────
  if (view==="report" && selected) {
    const reportDate  = new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"});
    const noteLines   = (selected.notes||"").split("\n").filter(l=>l.trim());
    const scopeLines  = noteLines.filter(l=>/drawing|living|bedroom|kitchen|ceiling|pooja|wardrobe|unit|partition|entrance|balcony|bathroom/i.test(l));
    const outOfScope  = noteLines.filter(l=>/out of scope|not included|excluded|accessories|appliances|curtain|mesh|invisible|ac copper|bathroom tile/i.test(l));
    const discussions = noteLines.filter(l=>!scopeLines.includes(l)&&!outOfScope.includes(l));

    const RS = {
      page:   { background:"#fff", minHeight:"100vh", fontFamily:"'Cormorant Garamond',Georgia,serif", color:"#1A0A00", padding:"0 0 60px" },
      header: { background:"linear-gradient(135deg,#8B1A1A,#C0392B)", padding:"28px 48px", marginBottom:36 },
      body:   { maxWidth:800, margin:"0 auto", padding:"0 48px" },
      section:{ marginBottom:32 },
      sTitle: { fontSize:14, fontWeight:700, letterSpacing:3, textTransform:"uppercase", color:"#8B1A1A", borderBottom:"2px solid #8B1A1A", paddingBottom:8, marginBottom:16 },
      row:    { display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid #F5EEEE", fontSize:14 },
      badge:  (bg,c)=>({ background:bg, color:c, padding:"3px 14px", borderRadius:20, fontSize:11, fontWeight:700, letterSpacing:1 }),
      payRow: { display:"flex", justifyContent:"space-between", alignItems:"center", background:"#FFF5F5", borderRadius:10, padding:"12px 18px", marginBottom:8, border:"1px solid #F0CCCC" },
      bullet: { fontSize:14, lineHeight:2, color:"#2A1A1A", paddingLeft:16 },
    };

    return (
      <div style={RS.page}>
        <style>{`@media print { .no-print{display:none!important} body{margin:0} }`}</style>

        {/* Toolbar */}
        <div className="no-print" style={{ background:"#1A0A00", padding:"12px 32px", display:"flex", gap:12, alignItems:"center" }}>
          <button onClick={()=>setView("detail")} style={{ background:"transparent", color:"#FFAAAA", border:"1px solid #FFAAAA", borderRadius:8, padding:"8px 18px", cursor:"pointer", fontFamily:"inherit", fontSize:12 }}>← Back</button>
          <button onClick={()=>window.print()} style={{ background:"#8B1A1A", color:"#fff", border:"none", borderRadius:8, padding:"8px 20px", cursor:"pointer", fontFamily:"inherit", fontSize:12, fontWeight:700 }}>🖨 Print / Save PDF</button>
          <span style={{ color:"#9A7070", fontSize:12 }}>Tip: In print dialog choose "Save as PDF"</span>
        </div>

        {/* Report Header */}
        <div style={RS.header}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div style={{ color:"#fff", fontSize:26, fontWeight:700, letterSpacing:3, textTransform:"uppercase" }}>🏗 High Rise Interiors</div>
              <div style={{ color:"#FFAAAA", fontSize:12, letterSpacing:4, marginTop:4 }}>Project Summary Report</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ color:"#FFAAAA", fontSize:12 }}>{reportDate}</div>
              <div style={{ color:"#fff", fontSize:11, marginTop:4, letterSpacing:1 }}>CONFIDENTIAL</div>
            </div>
          </div>
        </div>

        <div style={RS.body}>

          {/* 1. Client Info */}
          <div style={RS.section}>
            <div style={RS.sTitle}>Client Information</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 32px" }}>
              {[["Client Name",selected.name],["Phone",selected.phone],["Email",selected.email],
                ["Project Type",selected.projectType],["Address",selected.address],
                ["Interior Style",selected.style],["Start Date",selected.startDate],["Duration",selected.timeline]
              ].filter(([,v])=>v).map(([l,v])=>(
                <div key={l} style={RS.row}><span style={{ color:"#9A7070" }}>{l}</span><strong>{v}</strong></div>
              ))}
            </div>
          </div>

          {/* 2. Scope of Work */}
          <div style={RS.section}>
            <div style={RS.sTitle}>Scope of Work</div>
            {(selected.rooms||[]).length>0 && (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:12, letterSpacing:2, color:"#9A7070", textTransform:"uppercase", marginBottom:10 }}>Rooms Included</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {selected.rooms.map(r=><span key={r} style={RS.badge("#FFEEEE","#8B1A1A")}>{r}</span>)}
                </div>
              </div>
            )}
            {(selected.dimensions?.length&&selected.dimensions?.width) && (
              <div style={{ ...RS.row, marginBottom:8 }}>
                <span style={{ color:"#9A7070" }}>Total Area</span>
                <strong>{selected.dimensions.length} × {selected.dimensions.width} ft = {(selected.dimensions.length*selected.dimensions.width).toFixed(0)} sq ft</strong>
              </div>
            )}
            {scopeLines.length>0
              ? scopeLines.map((l,i)=><div key={i} style={RS.bullet}>• {l}</div>)
              : noteLines.length>0 && noteLines.map((l,i)=><div key={i} style={RS.bullet}>• {l}</div>)
            }
          </div>

          {/* 3. Materials */}
          {(selected.plywood||selected.laminate||selected.hardware||selected.glass||selected.ceiling||selected.lights) && (
            <div style={RS.section}>
              <div style={RS.sTitle}>Material Specifications</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 32px" }}>
                {[["Plywood",selected.plywood],["Laminate",selected.laminate],["Hardware",selected.hardware],
                  ["Glass/Mirror",selected.glass],["Ceiling Board",selected.ceiling],["Ceiling Lights",selected.lights],["Kitchen Handles",selected.handles]
                ].filter(([,v])=>v).map(([l,v])=>(
                  <div key={l} style={RS.row}><span style={{ color:"#9A7070" }}>{l}</span><strong>{v}</strong></div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Out of Scope */}
          {outOfScope.length>0 && (
            <div style={RS.section}>
              <div style={RS.sTitle}>Out of Scope</div>
              <div style={{ background:"#FFF5F5", borderRadius:12, padding:"16px 20px", border:"1px solid #F0CCCC" }}>
                {outOfScope.map((l,i)=><div key={i} style={{ ...RS.bullet, color:"#8B1A1A" }}>✗ {l.replace(/out of scope[:\-]*/i,"").trim()}</div>)}
              </div>
            </div>
          )}

          {/* 5. Budget */}
          <div style={RS.section}>
            <div style={RS.sTitle}>Budget Summary</div>
            {selected.previousQuotation && <div style={RS.row}><span style={{ color:"#9A7070" }}>Previous Quotation</span><span style={{ textDecoration:"line-through", color:"#9A7070" }}>{fmt(selected.previousQuotation)}</span></div>}
            {selected.revisedQuotation  && <div style={RS.row}><span style={{ color:"#9A7070" }}>Revised Quotation</span><span>{fmt(selected.revisedQuotation)}</span></div>}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#8B1A1A", borderRadius:12, padding:"16px 20px", marginTop:12 }}>
              <span style={{ fontWeight:700, fontSize:16, color:"#FFEEEE" }}>Final Quotation</span>
              <strong style={{ fontSize:26, color:"#fff" }}>{fmt(selected.quotation)||selected.budget||"TBD"}</strong>
            </div>
          </div>

          {/* 6. Discussions */}
          {discussions.length>0 && (
            <div style={RS.section}>
              <div style={RS.sTitle}>Discussions & Additional Notes</div>
              <div style={{ background:"#FFFAFA", borderRadius:12, padding:"16px 20px", border:"1px solid #F0E0E0" }}>
                {discussions.map((l,i)=><div key={i} style={{ ...RS.bullet, marginBottom:4 }}>• {l}</div>)}
              </div>
            </div>
          )}

          {/* 7. Payment Terms */}
          <div style={RS.section}>
            <div style={RS.sTitle}>Payment Terms & Conditions</div>
            <div style={{ display:"grid", gap:8, marginBottom:20 }}>
              {PAYMENT_PHASES.map((p,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:16, background:"#FFF5F5", borderRadius:10, padding:"12px 18px", border:"1px solid #F0CCCC" }}>
                  <div style={{ background:"#8B1A1A", color:"#fff", borderRadius:"50%", width:28, height:28, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:12, flexShrink:0 }}>{i+1}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:13, color:"#8B1A1A" }}>{p.day} — {p.label}</div>
                    <div style={{ fontSize:12, color:"#9A7070", marginTop:2 }}>Payment due: {p.pct}% of total project value{selected.quotation ? ` = ${fmt(Math.round(Number(selected.quotation)*p.pct/100))}` : ""}</div>
                  </div>
                  <div style={{ fontWeight:700, fontSize:16, color:"#8B1A1A" }}>{p.pct}%</div>
                </div>
              ))}
            </div>
            <div style={{ background:"#FFFAFA", borderRadius:10, padding:"14px 18px", border:"1px solid #F0E0E0", fontSize:13, lineHeight:2, color:"#4A2A2A" }}>
              <div>• All payments to be made via Bank Transfer / Cheque in favour of <strong>High Rise Interiors</strong></div>
              <div>• Work will commence only after receipt of advance payment (35%)</div>
              <div>• Each phase payment must be cleared before proceeding to the next phase</div>
              <div>• Delay in payment may result in corresponding delay in project timeline</div>
              <div>• GST applicable as per government norms and will be charged additionally</div>
            </div>
          </div>

          {/* 8. Disclaimers */}
          <div style={RS.section}>
            <div style={RS.sTitle}>Disclaimers & Terms</div>
            <div style={{ background:"#FFFFF8", borderRadius:12, padding:"20px 24px", border:"1.5px solid #E8E0C0", fontSize:13, lineHeight:2.1, color:"#4A4A2A" }}>
              <div style={{ fontWeight:700, fontSize:14, color:"#5C4A00", marginBottom:10 }}>⚠️ Important Notes</div>
              <div style={{ background:"#FFF0F0", border:"1px solid #F0CCCC", borderRadius:8, padding:"10px 14px", marginBottom:10, color:"#8B1A1A", fontWeight:600 }}>
                🚫 <strong>NO REFUND POLICY:</strong> All payments made are strictly non-refundable. Once payment is made and work commenced, no refunds will be issued under any circumstances.
              </div>
              <div>1. <strong>Draft Quotation:</strong> This quotation is a draft version and may vary based on final quantity confirmation and material selection at the time of execution.</div>
              <div>2. <strong>Material Prices:</strong> Prices are subject to change due to market fluctuations. Final pricing will be confirmed at the time of purchase order.</div>
              <div>3. <strong>Scope Changes:</strong> Any additions or modifications to the agreed scope of work will be quoted and charged separately with prior written approval from the client.</div>
              <div>4. <strong>Out of Scope Items:</strong> Items listed under "Out of Scope" are not included in this quotation and will be billed separately if required.</div>
              <div>5. <strong>Project Timeline:</strong> The project duration of {selected.timeline||"agreed days"} is indicative. Delays due to civil work, client approvals, or material availability are not included in this timeline.</div>
              <div>6. <strong>Warranty:</strong> High Rise Interiors provides a 1-year warranty on workmanship. Material warranty is subject to respective manufacturer terms.</div>
              <div>7. <strong>Access & Site:</strong> Client to ensure uninterrupted site access during working hours. Delay in site access may affect the project timeline.</div>
              <div>8. <strong>Dispute Resolution:</strong> Any disputes shall be subject to the jurisdiction of Hyderabad courts only.</div>
            </div>
          </div>

          {/* 9. Signature Block */}
          <div style={RS.section}>
            <div style={RS.sTitle}>Agreement & Acceptance</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:32, marginTop:8 }}>
              <div style={{ borderTop:"2px solid #1A0A00", paddingTop:12 }}>
                <div style={{ fontSize:13, color:"#9A7070", marginBottom:4 }}>Client Signature & Date</div>
                <div style={{ fontSize:14, fontWeight:700 }}>{selected.name}</div>
                <div style={{ fontSize:12, color:"#9A7070" }}>{selected.address}</div>
                <div style={{ marginTop:32, borderTop:"1px solid #9A7070", paddingTop:8, fontSize:11, color:"#9A7070" }}>Signature / Date</div>
              </div>
              <div style={{ borderTop:"2px solid #8B1A1A", paddingTop:12 }}>
                <div style={{ fontSize:13, color:"#9A7070", marginBottom:4 }}>Authorised Signatory</div>
                <div style={{ fontSize:14, fontWeight:700, color:"#8B1A1A" }}>High Rise Interiors</div>
                <div style={{ fontSize:12, color:"#9A7070" }}>Hyderabad, Telangana</div>
                <div style={{ marginTop:32, borderTop:"1px solid #9A7070", paddingTop:8, fontSize:11, color:"#9A7070" }}>Signature / Date / Stamp</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ borderTop:"2px solid #8B1A1A", paddingTop:20, marginTop:40 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#9A7070", marginBottom:8 }}>
              <span>🏗 High Rise Interiors — Hyderabad, Telangana</span>
              <span>Generated: {reportDate}</span>
            </div>
            <div style={{ fontSize:11, color:"#C0A0A0", textAlign:"center", lineHeight:1.8 }}>
              This document is confidential and intended solely for {selected.name}. Unauthorised reproduction or distribution is prohibited.<br/>
              The above quotation is a draft version and may vary based on quantity and material selection. All prices are in Indian Rupees (INR ₹).
            </div>
          </div>
        </div>
      </div>
    );
  }


  // ── INVOICE VIEW ──────────────────────────────────────────────────────
  if (view==="invoice" && selected) {
    const invoiceDate = new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"});
    const invoiceNum  = "HRI-" + String(selected.id).slice(-4).padStart(4,"0") + "-" + new Date().getFullYear();
    const total       = Number(selected.quotation)||0;
    const gst         = Math.round(total * 0.18);
    const grandTotal  = total + gst;

    const IV = {
      page:    { background:"#fff", minHeight:"100vh", fontFamily:"'Cormorant Garamond',Georgia,serif", color:"#1A0A00", padding:"0 0 60px" },
      toolbar: { background:"#1A0A00", padding:"12px 32px", display:"flex", gap:12, alignItems:"center" },
      wrap:    { maxWidth:820, margin:"0 auto", padding:"40px 48px" },
      header:  { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:36, paddingBottom:24, borderBottom:"3px solid #8B1A1A" },
      sTitle:  { fontSize:13, fontWeight:700, letterSpacing:3, textTransform:"uppercase", color:"#8B1A1A", borderBottom:"1.5px solid #F0CCCC", paddingBottom:6, marginBottom:14 },
      row:     { display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:"1px solid #F5EEEE", fontSize:14 },
      tRow:    { display:"flex", justifyContent:"space-between", padding:"10px 14px", fontSize:13 },
      pill:    (bg,c)=>({ background:bg, color:c, padding:"3px 14px", borderRadius:20, fontSize:11, fontWeight:700 }),
    };

    return (
      <div style={IV.page}>
        <style>{`@media print { .no-print{display:none!important} body{margin:0} }`}</style>

        {/* Toolbar */}
        <div className="no-print" style={IV.toolbar}>
          <button onClick={()=>setView("detail")} style={{ background:"transparent", color:"#FFAAAA", border:"1px solid #FFAAAA", borderRadius:8, padding:"8px 18px", cursor:"pointer", fontFamily:"inherit", fontSize:12 }}>← Back</button>
          <button onClick={()=>window.print()} style={{ background:"#8B1A1A", color:"#fff", border:"none", borderRadius:8, padding:"8px 20px", cursor:"pointer", fontFamily:"inherit", fontSize:12, fontWeight:700 }}>🖨 Print / Save PDF</button>
          <span style={{ color:"#9A7070", fontSize:12 }}>Tip: Choose "Save as PDF" in print dialog</span>
        </div>

        <div style={IV.wrap}>

          {/* Invoice Header */}
          <div style={IV.header}>
            <div>
              <div style={{ fontSize:28, fontWeight:700, color:"#8B1A1A", letterSpacing:2, textTransform:"uppercase" }}>🏗 High Rise Interiors</div>
              <div style={{ fontSize:12, color:"#9A7070", marginTop:4, lineHeight:1.8 }}>
                Hyderabad, Telangana, India<br/>
                GSTIN: [Your GST Number]<br/>
                Contact: [Your Phone] | [Your Email]
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:28, fontWeight:700, color:"#1A0A00", letterSpacing:1 }}>INVOICE</div>
              <div style={{ fontSize:13, color:"#9A7070", marginTop:6, lineHeight:1.9 }}>
                <div><strong>Invoice No:</strong> {invoiceNum}</div>
                <div><strong>Date:</strong> {invoiceDate}</div>
                <div><strong>Due Date:</strong> {invoiceDate}</div>
              </div>
            </div>
          </div>

          {/* Bill To & Project */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:32, marginBottom:32 }}>
            <div>
              <div style={IV.sTitle}>Bill To</div>
              <div style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>{selected.name}</div>
              <div style={{ fontSize:13, color:"#4A2A2A", lineHeight:1.9 }}>
                {selected.address && <div>📍 {selected.address}</div>}
                {selected.phone   && <div>📞 {selected.phone}</div>}
                {selected.email   && <div>📧 {selected.email}</div>}
              </div>
            </div>
            <div>
              <div style={IV.sTitle}>Project Details</div>
              <div style={{ fontSize:13, color:"#4A2A2A", lineHeight:1.9 }}>
                <div><strong>Type:</strong> {selected.projectType}</div>
                <div><strong>Style:</strong> {selected.style||"As agreed"}</div>
                <div><strong>Start Date:</strong> {selected.startDate||"As agreed"}</div>
                <div><strong>Duration:</strong> {selected.timeline||"As agreed"}</div>
              </div>
            </div>
          </div>

          {/* Rooms */}
          {(selected.rooms||[]).length>0 && (
            <div style={{ marginBottom:28 }}>
              <div style={IV.sTitle}>Scope — Rooms Covered</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {selected.rooms.map(r=><span key={r} style={IV.pill("#FFEEEE","#8B1A1A")}>{r}</span>)}
              </div>
            </div>
          )}

          {/* Line Items */}
          <div style={{ marginBottom:28 }}>
            <div style={IV.sTitle}>Invoice Items</div>
            <div style={{ border:"1.5px solid #F0CCCC", borderRadius:12, overflow:"hidden" }}>
              {/* Table Header */}
              <div style={{ ...IV.tRow, background:"#8B1A1A", color:"#fff", fontWeight:700, fontSize:12, letterSpacing:1 }}>
                <span style={{ flex:3 }}>Description</span>
                <span style={{ flex:1, textAlign:"right" }}>Amount (₹)</span>
              </div>
              {/* Main item */}
              <div style={{ ...IV.tRow, background:"#FFFAFA", borderBottom:"1px solid #F0CCCC" }}>
                <span style={{ flex:3, lineHeight:1.7 }}>
                  <strong>Interior Design & Execution Work</strong><br/>
                  <span style={{ fontSize:12, color:"#9A7070" }}>{selected.projectType} — {selected.address}</span>
                </span>
                <span style={{ flex:1, textAlign:"right", fontWeight:600 }}>{fmt(total)||"As agreed"}</span>
              </div>
              {/* Rooms breakdown */}
              {(selected.rooms||[]).map((r,i)=>(
                <div key={i} style={{ ...IV.tRow, background: i%2===0?"#fff":"#FFFAFA", borderBottom:"1px solid #F5EEEE" }}>
                  <span style={{ flex:3, fontSize:12, color:"#4A2A2A", paddingLeft:16 }}>↳ {r}</span>
                  <span style={{ flex:1, textAlign:"right", fontSize:12, color:"#9A7070" }}>Included</span>
                </div>
              ))}
              {/* Subtotal */}
              <div style={{ ...IV.tRow, background:"#FFF5F5", borderTop:"1.5px solid #F0CCCC" }}>
                <span style={{ flex:3, color:"#9A7070" }}>Subtotal (Before GST)</span>
                <span style={{ flex:1, textAlign:"right" }}>{fmt(total)||"—"}</span>
              </div>
              {/* GST */}
              {total>0 && (
                <div style={{ ...IV.tRow, background:"#FFF5F5", borderTop:"1px solid #F0CCCC" }}>
                  <span style={{ flex:3, color:"#9A7070" }}>GST @ 18%</span>
                  <span style={{ flex:1, textAlign:"right" }}>{fmt(gst)}</span>
                </div>
              )}
              {/* Grand Total */}
              <div style={{ ...IV.tRow, background:"#8B1A1A", color:"#fff" }}>
                <span style={{ flex:3, fontWeight:700, fontSize:15 }}>Grand Total (Incl. GST)</span>
                <span style={{ flex:1, textAlign:"right", fontWeight:700, fontSize:17 }}>{total>0 ? fmt(grandTotal) : fmt(total)||"As agreed"}</span>
              </div>
            </div>
          </div>

          {/* Payment Schedule */}
          <div style={{ marginBottom:28 }}>
            <div style={IV.sTitle}>Payment Schedule</div>
            <div style={{ border:"1.5px solid #F0CCCC", borderRadius:12, overflow:"hidden" }}>
              <div style={{ ...IV.tRow, background:"#8B1A1A", color:"#fff", fontWeight:700, fontSize:12, letterSpacing:1 }}>
                <span style={{ flex:1 }}>Phase</span>
                <span style={{ flex:2 }}>Milestone</span>
                <span style={{ flex:1, textAlign:"center" }}>%</span>
                <span style={{ flex:1, textAlign:"right" }}>Amount (₹)</span>
                <span style={{ flex:1, textAlign:"right" }}>Status</span>
              </div>
              {PAYMENT_PHASES.map((p,i)=>(
                <div key={i} style={{ ...IV.tRow, background:i%2===0?"#FFFAFA":"#fff", borderTop:"1px solid #F0CCCC" }}>
                  <span style={{ flex:1, fontWeight:700, color:"#8B1A1A", fontSize:12 }}>{p.day}</span>
                  <span style={{ flex:2, fontSize:12, color:"#4A2A2A" }}>{p.label}</span>
                  <span style={{ flex:1, textAlign:"center", fontSize:12 }}>{p.pct}%</span>
                  <span style={{ flex:1, textAlign:"right", fontWeight:600, fontSize:13 }}>{total>0 ? fmt(Math.round(total*p.pct/100)) : "—"}</span>
                  <span style={{ flex:1, textAlign:"right" }}><span style={i===0 ? IV.pill("#FFF3CD","#856404") : IV.pill("#F0F0F0","#9A9A9A")}>{ i===0?"Due Now":"Pending"}</span></span>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Terms */}
          <div style={{ marginBottom:28 }}>
            <div style={IV.sTitle}>Payment Terms</div>
            <div style={{ background:"#FFFAFA", borderRadius:10, padding:"16px 20px", border:"1px solid #F0E0E0", fontSize:13, lineHeight:2, color:"#4A2A2A" }}>
              <div>• All payments via <strong>Bank Transfer / Cheque</strong> in favour of <strong>High Rise Interiors</strong></div>
              <div>• Work commences only after <strong>advance payment (35%) is received</strong></div>
              <div>• Each phase payment must be cleared before proceeding to the next phase</div>
              <div>• Delay in payment may cause equivalent delay in project execution</div>
              <div>• GST @ 18% applicable and payable by the client as per government norms</div>
              <div>• All cheques to be issued in favour of: <strong>High Rise Interiors</strong></div>
            </div>
          </div>

          {/* Disclaimers */}
          <div style={{ marginBottom:28 }}>
            <div style={IV.sTitle}>Terms, Conditions & Disclaimers</div>
            <div style={{ background:"#FFFFF8", borderRadius:10, padding:"16px 20px", border:"1.5px solid #E8E0C0", fontSize:13, lineHeight:2, color:"#4A4A2A" }}>
              <div style={{ fontWeight:700, color:"#8B1A1A", marginBottom:6 }}>⚠️ NO REFUND POLICY</div>
              <div style={{ background:"#FFF0F0", border:"1px solid #F0CCCC", borderRadius:8, padding:"10px 14px", marginBottom:12, fontSize:13, color:"#8B1A1A", fontWeight:600 }}>
                All payments made to High Rise Interiors are <strong>strictly non-refundable</strong>. Once a payment is made and work has commenced, no refunds will be issued under any circumstances, including change of mind, cancellation, or partial completion requests.
              </div>
              <div>1. <strong>Cancellation:</strong> In case of cancellation by the client after commencement of work, all amounts paid till date are forfeited.</div>
              <div>2. <strong>Scope Changes:</strong> Any additions or modifications beyond agreed scope will be billed separately with prior written approval.</div>
              <div>3. <strong>Material Prices:</strong> Prices are subject to market fluctuations. Quoted rates are valid for 30 days from invoice date.</div>
              <div>4. <strong>Timeline:</strong> Project duration of {selected.timeline||"agreed period"} is indicative. Delays due to civil work, client approvals, or material availability are excluded.</div>
              <div>5. <strong>Warranty:</strong> 1-year workmanship warranty. Material warranty per manufacturer terms. Warranty void if client makes unauthorised modifications.</div>
              <div>6. <strong>Dispute Resolution:</strong> All disputes subject to exclusive jurisdiction of Hyderabad courts only.</div>
              <div>7. <strong>Force Majeure:</strong> High Rise Interiors is not liable for delays due to natural disasters, strikes, or government restrictions.</div>
            </div>
          </div>

          {/* Signature */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:32, marginBottom:32 }}>
            <div style={{ borderTop:"2px solid #1A0A00", paddingTop:12 }}>
              <div style={{ fontSize:12, color:"#9A7070", marginBottom:4 }}>Client Acceptance</div>
              <div style={{ fontSize:14, fontWeight:700 }}>{selected.name}</div>
              <div style={{ fontSize:12, color:"#9A7070" }}>{selected.address}</div>
              <div style={{ marginTop:36, borderTop:"1px dashed #9A7070", paddingTop:8, fontSize:11, color:"#9A7070" }}>Signature / Date</div>
            </div>
            <div style={{ borderTop:"2px solid #8B1A1A", paddingTop:12 }}>
              <div style={{ fontSize:12, color:"#9A7070", marginBottom:4 }}>Authorised by</div>
              <div style={{ fontSize:14, fontWeight:700, color:"#8B1A1A" }}>High Rise Interiors</div>
              <div style={{ fontSize:12, color:"#9A7070" }}>Hyderabad, Telangana</div>
              <div style={{ marginTop:36, borderTop:"1px dashed #9A7070", paddingTop:8, fontSize:11, color:"#9A7070" }}>Signature / Stamp / Date</div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ borderTop:"2px solid #8B1A1A", paddingTop:16, marginTop:24 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#9A7070", marginBottom:6 }}>
              <span>🏗 High Rise Interiors — Hyderabad, Telangana</span>
              <span>{invoiceNum} | {invoiceDate}</span>
            </div>
            <div style={{ fontSize:11, color:"#C0A0A0", textAlign:"center", lineHeight:1.8 }}>
              This invoice is computer generated and is valid without a physical signature.<br/>
              All payments are non-refundable. This document is confidential and intended solely for {selected.name}.<br/>
              Unauthorised reproduction or distribution is strictly prohibited.
            </div>
          </div>

        </div>
      </div>
    );
  }

  // ── DETAIL ────────────────────────────────────────────────────────────
  if (view==="detail" && selected) return (
    <div style={S.app}>
      {toast && <Toast msg={toast.msg} type={toast.type}/>}
      <div style={S.header}>
        <div><div style={S.logo}>🏗 High Rise Interiors</div><span style={S.logoSub}>Client Profile</span></div>
        <div style={{ display:"flex", gap:10 }}>
          <button style={S.btn("dark")} onClick={()=>setView("list")}>← Back</button>
          <button style={S.btn("dark")} onClick={()=>setView("report")}>📄 Report</button>
          <button style={S.btn("dark")} onClick={()=>setView("invoice")}>🧾 Invoice</button>
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
