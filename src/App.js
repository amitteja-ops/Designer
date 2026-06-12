import { useState, useEffect, useCallback } from "react";
import { sb, toRow, fromRow, TABLE } from "./supabase";

const ROOMS = ["Drawing Room","Living Area","Dining","Master Bedroom","Children Bedroom","Guest Bedroom","Kitchen","Pooja","Entrance","Balcony","Bathroom","Study Room"];
const STYLES = ["Modern Contemporary","Classic Traditional","Minimalist","Luxury","Scandinavian","Industrial","Bohemian","Art Deco","Mediterranean","Rustic"];
const STATUSES = ["Lead","Active","In Progress","Completed","On Hold"];
const BUDGETS = ["Under ₹5L","₹5L–₹10L","₹10L–₹15L","₹15L–₹20L","₹20L–₹25L","₹25L–₹30L","Above ₹30L"];
const TIMELINES = ["30 Days","45 Days","60 Days","75 Days","90 Days","120 Days","Custom"];
const PLYWOOD_OPTIONS = ["Century Club Prime","Green Ply HDHMR","Sainik 710","Block Boards","WPVC"];
const LAMINATE_OPTIONS = ["Virgo","Croma","Acrylic Sheets"];
const HARDWARE_OPTIONS = ["Nimmi Hinges","Nimmi Channels","Hettich Tandem"];
const GLASS_OPTIONS = ["Modi Guard 4mm Black Tinted","Modi Guard Mirror"];
const CEILING_OPTIONS = ["Saint Gobin Gyproc","PVC"];
const LIGHTS_OPTIONS = ["Phillips","Wipro","Panasonic"];
const HANDLES_OPTIONS = ["Gola Profile","Standard"];

// ── Material Catalog with Prices (₹ per sq ft unless noted) ────────
const MATERIAL_CATALOG = {
  plywood: [
    { name:"Century Club Prime", price:120, unit:"sq ft" },
    { name:"Green Ply HDHMR",    price:100, unit:"sq ft" },
    { name:"Sainik 710",         price:75,  unit:"sq ft" },
    { name:"Block Boards",       price:90,  unit:"sq ft" },
    { name:"WPVC",               price:110, unit:"sq ft" },
  ],
  laminate: [
    { name:"Virgo",           price:35,  unit:"sq ft" },
    { name:"Croma",           price:40,  unit:"sq ft" },
    { name:"Acrylic Sheets",  price:85,  unit:"sq ft" },
  ],
  hardware: [
    { name:"Nimmi Hinges",     price:180, unit:"piece" },
    { name:"Nimmi Channels",   price:650, unit:"piece" },
    { name:"Hettich Tandem",   price:2200,unit:"piece" },
  ],
  glass: [
    { name:"Modi Guard 4mm Black Tinted", price:95,  unit:"sq ft" },
    { name:"Modi Guard Mirror",           price:80,  unit:"sq ft" },
  ],
  ceiling: [
    { name:"Saint Gobin Gyproc", price:55, unit:"sq ft" },
    { name:"PVC",                price:45, unit:"sq ft" },
  ],
  lights: [
    { name:"Phillips 3W",   price:350,  unit:"piece" },
    { name:"Phillips 12W",  price:650,  unit:"piece" },
    { name:"Phillips 15W",  price:850,  unit:"piece" },
    { name:"Wipro 3W",      price:320,  unit:"piece" },
    { name:"Wipro 12W",     price:600,  unit:"piece" },
    { name:"Panasonic 12W", price:580,  unit:"piece" },
  ],
  handles: [
    { name:"Gola Profile", price:280, unit:"piece" },
    { name:"Standard",     price:120, unit:"piece" },
  ],
};

// Materials applicable per room type
const ROOM_MATERIALS = {
  "Drawing Room":    ["plywood","laminate","glass","ceiling","lights"],
  "Living Area":     ["plywood","laminate","ceiling","lights"],
  "Dining":          ["plywood","laminate","glass","ceiling","lights"],
  "Master Bedroom":  ["plywood","laminate","hardware","glass","ceiling","lights"],
  "Children Bedroom":["plywood","laminate","hardware","ceiling","lights"],
  "Guest Bedroom":   ["plywood","laminate","hardware","ceiling","lights"],
  "Kitchen":         ["plywood","laminate","hardware","glass","ceiling","lights","handles"],
  "Pooja":           ["plywood","laminate","glass","ceiling","lights"],
  "Entrance":        ["plywood","laminate","ceiling","lights"],
  "Balcony":         ["ceiling","lights"],
  "Bathroom":        ["glass","lights"],
  "Study Room":      ["plywood","laminate","hardware","ceiling","lights"],
};

const MATERIAL_LABELS = {
  plywood:"Plywood", laminate:"Laminate", hardware:"Hardware",
  glass:"Glass/Mirror", ceiling:"Ceiling Board", lights:"Ceiling Lights", handles:"Handles",
};

const PAYMENT_PHASES = [
  { day:"Day 1",  label:"Advance (before project starts)",          pct:35 },
  { day:"Day 15", label:"Phase 2 (After box frame work)",            pct:35 },
  { day:"Day 25", label:"Phase 3 (After wardrobes, before deco)",   pct:20 },
  { day:"Day 45", label:"Phase 4 (On handover day)",                pct:10 },
];

const EMPTY = {
  id:null, name:"", email:"", phone:"", address:"",
  status:"Lead", projectType:"Residential",
  budget:"", timeline:"", startDate:"",
  rooms:[], dimensions:{ length:"", width:"", height:"" },
  style:"", notes:"",
  quotation:"", previousQuotation:"", revisedQuotation:"",
  plywood:"", laminate:"", hardware:"", glass:"", ceiling:"", lights:"", handles:"",
  roomDetails:{},
  roomMaterials:{},
  rebateType:"amount", rebateValue:"", couponCode:"",
};

const fmt = (v) => v ? `₹${Number(v).toLocaleString("en-IN")}` : "";

// Generate unique referral coupon from customer name + id
const genCoupon = (name, id) => {
  const prefix = (name||"HRI").toUpperCase().replace(/[^A-Z]/g,"").slice(0,4)||"HRI";
  const suffix  = String(id||Date.now()).slice(-4);
  return `${prefix}${suffix}`;
};

// ── Styles ────────────────────────────────────────────────────────────
const C = {
  red:   "#8B1A1A",
  light: "#FFEEEE",
  bg:    "#FBF8F5",
  border:"#F0E0E0",
  muted: "#9A7070",
  dark:  "#1A0A00",
};

const S = {
  app:    { minHeight:"100vh", background:C.bg, fontFamily:"'Cormorant Garamond',Georgia,serif", color:C.dark },
  hdr:    { background:"linear-gradient(135deg,#8B1A1A,#C0392B)", padding:"0 32px", height:70, display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 4px 20px rgba(139,26,26,0.3)" },
  logo:   { color:"#FFF5F5", fontSize:20, fontWeight:700, letterSpacing:2, textTransform:"uppercase" },
  sub:    { color:"#FFAAAA", fontSize:10, letterSpacing:4, marginTop:-4, display:"block" },
  main:   { maxWidth:1100, margin:"0 auto", padding:"32px 24px" },
  card:   { background:"#fff", borderRadius:16, padding:"20px 24px", boxShadow:"0 2px 12px rgba(139,26,26,0.06)", border:`1px solid ${C.border}` },
  input:  { width:"100%", padding:"10px 14px", borderRadius:10, border:`1.5px solid ${C.border}`, fontFamily:"inherit", fontSize:14, color:C.dark, background:"#FFFAFA", outline:"none", boxSizing:"border-box" },
  label:  { fontSize:11, letterSpacing:2, color:C.muted, textTransform:"uppercase", marginBottom:6, display:"block" },
  row:    { display:"flex", gap:16, marginBottom:18, flexWrap:"wrap" },
  sec:    { fontSize:12, fontWeight:700, letterSpacing:2, color:C.red, textTransform:"uppercase", borderBottom:`1px solid ${C.border}`, paddingBottom:8, marginBottom:16, marginTop:4 },
  btn:    (v="primary") => ({
    padding:"10px 22px", borderRadius:10, border:"none", cursor:"pointer", fontFamily:"inherit",
    fontSize:12, letterSpacing:1.5, textTransform:"uppercase", fontWeight:700,
    ...(v==="primary" ? { background:C.red, color:"#fff", boxShadow:"0 4px 12px rgba(139,26,26,0.3)" }
      : v==="dark"    ? { background:"rgba(255,255,255,0.15)", color:"#FFF5F5", border:"1px solid rgba(255,255,255,0.3)" }
      : v==="ghost"   ? { background:"transparent", color:C.red, border:`1.5px solid ${C.red}` }
      : v==="danger"  ? { background:"#C0392B", color:"#fff" }
      :                 { background:C.light, color:C.red })
  }),
  tab:    (a) => ({ padding:"8px 18px", borderRadius:8, cursor:"pointer", fontSize:11, letterSpacing:1.5, textTransform:"uppercase", fontWeight:700, border:"none", fontFamily:"inherit", background:a?C.red:"transparent", color:a?"#fff":C.muted }),
  pill:   (a) => ({ padding:"6px 14px", borderRadius:20, fontSize:12, cursor:"pointer", border:`1.5px solid ${a?C.red:C.border}`, background:a?C.light:"transparent", color:a?C.red:C.muted, fontFamily:"inherit" }),
  badge:  (status) => {
    const m = { Lead:{bg:"#FFF3CD",c:"#856404"}, Active:{bg:"#D1ECF1",c:"#0C5460"}, "In Progress":{bg:"#E8D5FF",c:"#6A1B9A"}, Completed:{bg:"#D4EDDA",c:"#155724"}, "On Hold":{bg:"#F8D7DA",c:"#721C24"} };
    const s = m[status]||m.Lead;
    return { background:s.bg, color:s.c, padding:"2px 10px", borderRadius:20, fontSize:11, fontWeight:700, letterSpacing:1 };
  },
};

function Toast({ msg, type }) {
  const bg = { success:"#1A7A4A", error:"#C0392B", info:C.red, warning:"#E67E22" }[type]||C.red;
  return <div style={{ position:"fixed", bottom:24, right:24, zIndex:9999, background:bg, color:"#fff", padding:"14px 22px", borderRadius:12, fontSize:13, boxShadow:"0 4px 20px rgba(0,0,0,0.2)", fontFamily:"inherit", maxWidth:380, lineHeight:1.5, animation:"slideIn 0.3s ease" }}>{msg}</div>;
}

function Spinner() {
  return <div style={{ display:"flex", justifyContent:"center", padding:80 }}><div style={{ width:40, height:40, border:"3px solid #F0E0E0", borderTop:`3px solid ${C.red}`, borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/></div>;
}

function Field({ label, children }) {
  return <div style={{ flex:1 }}><label style={S.label}>{label}</label>{children}</div>;
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <select style={S.input} value={value} onChange={e => onChange(e.target.value)}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

export default function App({ token, user, onLogout, onSessionExpired }) {
  const [customers,    setCustomers]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [view,         setView]         = useState("list");
  const [form,         setForm]         = useState(EMPTY);
  const [selectedId,   setSelectedId]   = useState(null);
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [activeTab,    setActiveTab]    = useState("personal");
  const [toast,        setToast]        = useState(null);
  const [connected,    setConnected]    = useState(false);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),4000); };

  const getToken = () => {
    try { return JSON.parse(localStorage.getItem("crm_session")||"{}").token || token; }
    catch { return token; }
  };

  const safeCall = useCallback(async (fn) => {
    try { return await fn(getToken()); }
    catch(e) {
      if (e.code === "SESSION_EXPIRED") {
        const ok = await onSessionExpired();
        if (ok) return await fn(getToken());
        throw new Error("Please log in again");
      }
      throw e;
    }
  }, [token, onSessionExpired]);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await safeCall(t => sb(`${TABLE}?select=*&order=created_at.desc`, "GET", null, t));
      setCustomers((rows||[]).map(fromRow));
      setConnected(true);
    } catch(e) {
      setConnected(false);
      showToast("Load error: " + e.message, "error");
    } finally { setLoading(false); }
  }, [safeCall]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  // ── Open edit — explicitly map every field ────────────────────────
  const openEdit = (c) => {
    setForm({
      id:                c.id                || null,
      name:              c.name              || "",
      email:             c.email             || "",
      phone:             c.phone             || "",
      address:           c.address           || "",
      status:            c.status            || "Lead",
      projectType:       c.projectType       || "Residential",
      budget:            c.budget            || "",
      timeline:          c.timeline          || "",
      startDate:         c.startDate         || "",
      rooms:             c.rooms             || [],
      dimensions: {
        length:          c.dimensions?.length || "",
        width:           c.dimensions?.width  || "",
        height:          c.dimensions?.height || "",
      },
      style:             c.style             || "",
      notes:             c.notes             || "",
      quotation:         c.quotation         || "",
      previousQuotation: c.previousQuotation || "",
      revisedQuotation:  c.revisedQuotation  || "",
      plywood:           c.plywood           || "",
      laminate:          c.laminate          || "",
      hardware:          c.hardware          || "",
      glass:             c.glass             || "",
      ceiling:           c.ceiling           || "",
      lights:            c.lights            || "",
      handles:           c.handles           || "",
      roomDetails:       c.roomDetails       || {},
      roomMaterials:     c.roomMaterials     || {},
      rebateType:        c.rebateType        || "amount",
      rebateValue:       c.rebateValue       || "",
      couponCode:        c.couponCode        || "",
    });
    setActiveTab("personal");
    setView("form");
  };

  const openNew    = () => { setForm({...EMPTY}); setActiveTab("personal"); setView("form"); };
  const openDetail = (c) => { setSelectedId(c.id); setView("detail"); };
  const setF       = (k, v) => setForm(f => ({...f, [k]: v}));
  const setDim     = (k, v) => setForm(f => ({...f, dimensions: {...f.dimensions, [k]: v}}));
  const toggleRoom = (r)    => setForm(f => ({...f, rooms: f.rooms.includes(r) ? f.rooms.filter(x=>x!==r) : [...f.rooms, r]}));

  const saveCustomer = async () => {
    if (!form.name.trim()) { showToast("Client name is required", "error"); return; }
    setSaving(true);
    try {
      const row = toRow(form);
      if (form.id) {
        await safeCall(t => sb(`${TABLE}?id=eq.${form.id}`, "PATCH", row, t));
        showToast("✓ Client updated");
      } else {
        await safeCall(t => sb(TABLE, "POST", row, t));
        showToast("✓ Client saved");
      }
      await fetchCustomers();
      setView("list");
    } catch(e) { showToast("Save failed: " + e.message, "error"); }
    finally { setSaving(false); }
  };

  const deleteCustomer = async (id) => {
    if (!window.confirm("Delete this client permanently?")) return;
    try {
      await safeCall(t => sb(`${TABLE}?id=eq.${id}`, "DELETE", null, t));
      showToast("Client deleted", "info");
      await fetchCustomers();
      setView("list");
    } catch(e) { showToast("Delete failed: " + e.message, "error"); }
  };

  const exportCSV = () => {
    const h = ["Name","Phone","Email","Address","Status","Type","Budget","Timeline","Start","Rooms","Quotation","Style","Plywood","Laminate","Hardware","Notes"];
    const rows = customers.map(c => [
      c.name,c.phone,c.email,c.address,c.status,c.projectType,c.budget,c.timeline,c.startDate,
      (c.rooms||[]).join("|"),c.quotation||"",c.style,c.plywood||"",c.laminate||"",c.hardware||"",c.notes
    ].map(v=>`"${(v||"").toString().replace(/"/g,'""')}"`).join(","));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([[h.join(","),...rows].join("\n")],{type:"text/csv"}));
    a.download = "highrise-clients.csv"; a.click();
    showToast("✓ CSV exported");
  };

  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    return (c.name.toLowerCase().includes(q)||c.email.toLowerCase().includes(q)||(c.phone||"").includes(q)||(c.address||"").toLowerCase().includes(q))
      && (filterStatus==="All" || c.status===filterStatus);
  });

  const stats = {
    total:     customers.length,
    active:    customers.filter(c=>c.status==="Active"||c.status==="In Progress").length,
    leads:     customers.filter(c=>c.status==="Lead").length,
    completed: customers.filter(c=>c.status==="Completed").length,
    revenue:   customers.reduce((s,c)=>s+Number(c.quotation||0),0),
  };

  const selected = customers.find(c => c.id === selectedId);
  const TABS = ["personal","dimensions","materials","quotation","notes"];

  // ── REPORT ───────────────────────────────────────────────────────────
  if (view==="report" && selected) {
    const d = new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"});
    const noteLines   = (selected.notes||"").split("\n").filter(l=>l.trim());
    const scopeLines  = noteLines.filter(l=>/drawing|living|bedroom|kitchen|ceiling|pooja|wardrobe|unit|partition|entrance|balcony|bathroom/i.test(l));
    const outOfScope  = noteLines.filter(l=>/out of scope|not included|excluded|accessories|appliances|curtain|mesh|invisible|ac copper|bathroom tile/i.test(l));
    const discussions = noteLines.filter(l=>!scopeLines.includes(l)&&!outOfScope.includes(l));
    const RS = {
      sTitle:{ fontSize:13,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:C.red,borderBottom:`2px solid ${C.red}`,paddingBottom:8,marginBottom:16 },
      row:   { display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:`1px solid ${C.border}`,fontSize:14 },
      payRow:{ display:"flex",justifyContent:"space-between",alignItems:"center",background:C.light,borderRadius:10,padding:"12px 18px",marginBottom:8,border:`1px solid ${C.border}` },
      bullet:{ fontSize:14,lineHeight:2,paddingLeft:16 },
      pill:  (bg,c)=>({ background:bg,color:c,padding:"3px 14px",borderRadius:20,fontSize:11,fontWeight:700 }),
    };
    return (
      <div style={{ background:"#fff",minHeight:"100vh",fontFamily:"'Cormorant Garamond',Georgia,serif",color:C.dark,paddingBottom:60 }}>
        <style>{`@media print{.np{display:none!important}}`}</style>
        <div className="np" style={{ background:C.dark,padding:"12px 32px",display:"flex",gap:12,alignItems:"center" }}>
          <button onClick={()=>setView("detail")} style={{ background:"transparent",color:"#FFAAAA",border:"1px solid #FFAAAA",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontFamily:"inherit",fontSize:12 }}>← Back</button>
          <button onClick={()=>window.print()} style={{ background:C.red,color:"#fff",border:"none",borderRadius:8,padding:"8px 20px",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700 }}>🖨 Print / Save PDF</button>
        </div>
        <div style={{ background:`linear-gradient(135deg,${C.red},#C0392B)`,padding:"28px 48px",marginBottom:36 }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
            <div>
              <div style={{ color:"#fff",fontSize:26,fontWeight:700,letterSpacing:3,textTransform:"uppercase" }}>🏗 High Rise Interiors</div>
              <div style={{ color:"#FFAAAA",fontSize:12,letterSpacing:4,marginTop:4 }}>Project Summary Report</div>
            </div>
            <div style={{ textAlign:"right",color:"#FFAAAA",fontSize:12 }}><div>{d}</div><div style={{ color:"#fff",fontSize:11,marginTop:4 }}>CONFIDENTIAL</div></div>
          </div>
        </div>
        <div style={{ maxWidth:800,margin:"0 auto",padding:"0 48px" }}>
          {/* Client */}
          <div style={{ marginBottom:32 }}>
            <div style={RS.sTitle}>Client Information</div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 32px" }}>
              {[["Client Name",selected.name],["Phone",selected.phone],["Email",selected.email],["Project Type",selected.projectType],["Address",selected.address],["Style",selected.style],["Start Date",selected.startDate],["Duration",selected.timeline]].filter(([,v])=>v).map(([l,v])=>(
                <div key={l} style={RS.row}><span style={{ color:C.muted }}>{l}</span><strong>{v}</strong></div>
              ))}
            </div>
          </div>
          {/* Scope — Room wise Dimensions */}
          <div style={{ marginBottom:32 }}>
            <div style={RS.sTitle}>Scope of Work — Room Dimensions</div>
            {(selected.rooms||[]).length>0 ? (
              <div>
                {/* Table header */}
                <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr", gap:8, padding:"8px 12px", background:C.red, borderRadius:"10px 10px 0 0" }}>
                  {["Room","Length (ft)","Width (ft)","Height (ft)","Area (sq ft)"].map(h=>(
                    <div key={h} style={{ fontSize:11, fontWeight:700, color:"#fff", letterSpacing:1, textTransform:"uppercase" }}>{h}</div>
                  ))}
                </div>
                {selected.rooms.map((r,i) => {
                  const rd = selected.roomDetails?.[r] || {};
                  const area = rd.length && rd.width ? (parseFloat(rd.length)*parseFloat(rd.width)).toFixed(0) : "—";
                  return (
                    <div key={r} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr", gap:8, padding:"10px 12px", background:i%2===0?"#FFFAFA":C.light, borderBottom:`1px solid ${C.border}` }}>
                      <div style={{ fontWeight:700, fontSize:13, color:C.red }}>🏠 {r}</div>
                      <div style={{ fontSize:13 }}>{rd.length||"—"}</div>
                      <div style={{ fontSize:13 }}>{rd.width||"—"}</div>
                      <div style={{ fontSize:13 }}>{rd.height||"—"}</div>
                      <div style={{ fontSize:13, fontWeight:700 }}>{area !== "—" ? `${area} sq ft` : "—"}</div>
                    </div>
                  );
                })}
                {/* Total row */}
                {(() => {
                  const totalArea = (selected.rooms||[]).reduce((sum,r) => {
                    const rd = selected.roomDetails?.[r]||{};
                    return sum + (rd.length&&rd.width ? parseFloat(rd.length)*parseFloat(rd.width) : 0);
                  }, 0);
                  return totalArea > 0 ? (
                    <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr", gap:8, padding:"10px 12px", background:C.red, borderRadius:"0 0 10px 10px" }}>
                      <div style={{ fontWeight:700, fontSize:13, color:"#FFEEEE" }}>Total</div>
                      <div/><div/><div/>
                      <div style={{ fontWeight:700, fontSize:14, color:"#fff" }}>{totalArea.toFixed(0)} sq ft</div>
                    </div>
                  ) : <div style={{ borderRadius:"0 0 10px 10px", border:`1px solid ${C.border}`, borderTop:"none" }}/>;
                })()}
                {/* Room photos */}
                {(selected.rooms||[]).some(r=>(selected.roomDetails?.[r]?.photos||[]).length>0) && (
                  <div style={{ marginTop:16 }}>
                    <div style={{ fontSize:11, letterSpacing:2, color:C.muted, textTransform:"uppercase", marginBottom:10 }}>Room Photos</div>
                    {(selected.rooms||[]).map(r => {
                      const photos = selected.roomDetails?.[r]?.photos||[];
                      if (!photos.length) return null;
                      return (
                        <div key={r} style={{ marginBottom:12 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:C.red, marginBottom:6 }}>🏠 {r}</div>
                          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                            {photos.map((p,i)=><img key={i} src={p} alt={r} style={{ width:100, height:100, objectFit:"cover", borderRadius:8, border:`1.5px solid ${C.border}` }}/>)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color:C.muted, fontSize:13 }}>No rooms selected</div>
            )}
            {/* Scope notes */}
            {scopeLines.length>0 && (
              <div style={{ marginTop:16 }}>
                <div style={{ fontSize:11, letterSpacing:2, color:C.muted, textTransform:"uppercase", marginBottom:8 }}>Work Description</div>
                {scopeLines.map((l,i)=><div key={i} style={RS.bullet}>• {l}</div>)}
              </div>
            )}
          </div>

          {/* Materials — Room wise */}
          {selected.roomMaterials && Object.keys(selected.roomMaterials).length > 0 && (
            <div style={{ marginBottom:32 }}>
              <div style={RS.sTitle}>Material Specifications & Cost</div>
              {Object.entries(selected.roomMaterials).map(([room, mats]) => {
                const matEntries = Object.entries(mats).filter(([,v])=>v?.name);
                if (!matEntries.length) return null;
                const roomCost = matEntries.reduce((total,[matType,sel])=>{
                  const item = MATERIAL_CATALOG[matType]?.find(m=>m.name===sel.name);
                  return total + (item&&sel.qty ? parseFloat(sel.qty)*item.price : 0);
                },0);
                return (
                  <div key={room} style={{ marginBottom:16 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:C.red, borderRadius:"10px 10px 0 0", padding:"10px 14px" }}>
                      <span style={{ fontWeight:700, fontSize:13, color:"#fff" }}>🏠 {room}</span>
                      {roomCost>0 && <span style={{ fontWeight:700, fontSize:13, color:"#FFEEEE" }}>Est. {fmt(Math.round(roomCost*1.5))}</span>}
                    </div>
                    {/* Material table header */}
                    <div style={{ display:"grid", gridTemplateColumns:"2fr 2fr 1fr 1fr 1fr", gap:8, padding:"8px 14px", background:"#4A1A1A" }}>
                      {["Material","Brand/Type","Qty","Rate","Total"].map(h=>(
                        <div key={h} style={{ fontSize:10, fontWeight:700, color:"#FFAAAA", letterSpacing:1, textTransform:"uppercase" }}>{h}</div>
                      ))}
                    </div>
                    {matEntries.map(([matType,sel],i)=>{
                      const item = MATERIAL_CATALOG[matType]?.find(m=>m.name===sel.name);
                      const lineTotal = item&&sel.qty ? Math.round(parseFloat(sel.qty)*item.price) : null;
                      return (
                        <div key={matType} style={{ display:"grid", gridTemplateColumns:"2fr 2fr 1fr 1fr 1fr", gap:8, padding:"9px 14px", background:i%2===0?"#FFFAFA":C.light, borderBottom:`1px solid ${C.border}` }}>
                          <div style={{ fontSize:12, color:C.muted, fontWeight:700 }}>{MATERIAL_LABELS[matType]}</div>
                          <div style={{ fontSize:12 }}>{sel.name}</div>
                          <div style={{ fontSize:12 }}>{sel.qty||"—"} {item?.unit||""}</div>
                          <div style={{ fontSize:12 }}>{item?`₹${item.price}`:"—"}</div>
                          <div style={{ fontSize:12, fontWeight:700, color:C.red }}>{lineTotal?fmt(lineTotal):"—"}</div>
                        </div>
                      );
                    })}
                    <div style={{ display:"grid", gridTemplateColumns:"2fr 2fr 1fr 1fr 1fr", gap:8, padding:"9px 14px", background:C.light, borderRadius:"0 0 10px 10px", borderTop:`2px solid ${C.border}` }}>
                      <div style={{ fontSize:12, fontWeight:700, color:C.red, gridColumn:"1/5" }}>Room Total (Incl. Labour)</div>
                      <div style={{ fontSize:13, fontWeight:700, color:C.red }}>{roomCost>0?fmt(Math.round(roomCost*1.5)):"—"}</div>
                    </div>
                  </div>
                );
              })}
              {/* Grand total with 50% labour included */}
              {(() => {
                const matCost = Object.values(selected.roomMaterials).reduce((t,mats)=>
                  t+Object.entries(mats).reduce((rt,[matType,sel])=>{
                    const item = MATERIAL_CATALOG[matType]?.find(m=>m.name===sel.name);
                    return rt+(item&&sel.qty?parseFloat(sel.qty)*item.price:0);
                  },0),0);
                const totalWithLabour = Math.round(matCost * 1.5);
                return matCost>0?(
                  <div style={{ borderRadius:12, overflow:"hidden", border:`1.5px solid ${C.border}` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", padding:"12px 18px", background:"#FFFAFA", borderBottom:`1px solid ${C.border}` }}>
                      <span style={{ color:C.muted, fontSize:13 }}>Materials Subtotal</span>
                      <span style={{ fontSize:13 }}>{fmt(Math.round(matCost))}</span>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", padding:"12px 18px", background:"#FFFAFA", borderBottom:`1px solid ${C.border}` }}>
                      <span style={{ color:C.muted, fontSize:13 }}>Installation & Labour (included)</span>
                      <span style={{ fontSize:13 }}>{fmt(Math.round(matCost * 0.5))}</span>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:C.red, padding:"16px 20px" }}>
                      <span style={{ color:"#FFEEEE", fontWeight:700, fontSize:15 }}>Total Project Cost (Incl. Labour)</span>
                      <strong style={{ color:"#fff", fontSize:22 }}>{fmt(totalWithLabour)}</strong>
                    </div>
                  </div>
                ):null;
              })()}
            </div>
          )}
          {/* Out of Scope */}
          {outOfScope.length>0 && (
            <div style={{ marginBottom:32 }}>
              <div style={RS.sTitle}>Out of Scope</div>
              <div style={{ background:C.light,borderRadius:12,padding:"16px 20px",border:`1px solid ${C.border}` }}>
                {outOfScope.map((l,i)=><div key={i} style={{ ...RS.bullet,color:C.red }}>✗ {l}</div>)}
              </div>
            </div>
          )}
          {/* Budget */}
          <div style={{ marginBottom:32 }}>
            <div style={RS.sTitle}>Budget Summary</div>
            {selected.previousQuotation && (
              <div style={RS.row}>
                <span style={{ color:C.muted }}>Previous Quotation</span>
                <span style={{ textDecoration: selected.revisedQuotation?"line-through":"none", color:C.muted }}>{fmt(selected.previousQuotation)}</span>
              </div>
            )}
            {selected.rebateValue && (
              <div style={{ background:"#F0FFF4", borderRadius:8, padding:"10px 14px", margin:"6px 0", border:"1px solid #BBF7D0" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ color:"#166534", fontWeight:700 }}>
                    🎁 Rebate Applied {selected.couponCode && `(Code: ${selected.couponCode})`}
                  </span>
                  <span style={{ color:"#166534", fontWeight:700 }}>
                    - {selected.rebateType==="percent" ? `${selected.rebateValue}%` : fmt(selected.rebateValue)}
                    {selected.previousQuotation && ` = - ${fmt(selected.rebateType==="percent" ? Math.round(Number(selected.previousQuotation)*Number(selected.rebateValue)/100) : Number(selected.rebateValue))}`}
                  </span>
                </div>
              </div>
            )}
            {selected.couponCode && (
              <div style={{ background:"#F0FFF4", borderRadius:8, padding:"12px 16px", margin:"6px 0", border:"1px solid #BBF7D0" }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#166534", marginBottom:6 }}>🎁 YOUR REFERRAL CODE: <span style={{ fontSize:16, letterSpacing:3 }}>{selected.couponCode}</span></div>
                <div style={{ fontSize:12, color:"#166534", lineHeight:1.8 }}>
                  <div>• Share this code with friends & family</div>
                  <div>• They get <strong>5% off</strong> their High Rise Interiors project</div>
                  <div>• You get <strong>5% cashback</strong> credited to your account</div>
                </div>
              </div>
            )}
            {selected.revisedQuotation && (
              <div style={RS.row}>
                <span style={{ color:C.muted }}>Revised Quotation (After Rebate)</span>
                <span style={{ fontWeight:700, color:C.dark }}>{fmt(selected.revisedQuotation)}</span>
              </div>
            )}
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",background:C.red,borderRadius:12,padding:"16px 20px",marginTop:12 }}>
              <div>
                <span style={{ color:"#FFEEEE",fontWeight:700,fontSize:16 }}>Final Quotation</span>
                {selected.couponCode && <div style={{ color:"#FFAAAA", fontSize:11, marginTop:2 }}>Coupon: {selected.couponCode}</div>}
              </div>
              <strong style={{ color:"#fff",fontSize:26 }}>{fmt(selected.quotation)||selected.budget||"TBD"}</strong>
            </div>
          </div>
          {/* Discussions */}
          {discussions.length>0 && (
            <div style={{ marginBottom:32 }}>
              <div style={RS.sTitle}>Discussions & Notes</div>
              <div style={{ background:"#FFFAFA",borderRadius:12,padding:"16px 20px",border:`1px solid ${C.border}` }}>
                {discussions.map((l,i)=><div key={i} style={{ ...RS.bullet,marginBottom:4 }}>• {l}</div>)}
              </div>
            </div>
          )}
          {/* Payment Terms */}
          <div style={{ marginBottom:32 }}>
            <div style={RS.sTitle}>Payment Terms & Schedule</div>
            {PAYMENT_PHASES.map((p,i)=>(
              <div key={i} style={RS.payRow}>
                <div style={{ display:"flex",alignItems:"center",gap:14 }}>
                  <div style={{ background:C.red,color:"#fff",borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12,flexShrink:0 }}>{i+1}</div>
                  <div>
                    <div style={{ fontWeight:700,fontSize:13,color:C.red }}>{p.day} — {p.label}</div>
                    <div style={{ fontSize:12,color:C.muted,marginTop:2 }}>{p.pct}% of total value</div>
                  </div>
                </div>
                <strong style={{ fontSize:16,color:C.red }}>{selected.quotation ? fmt(Math.round(Number(selected.quotation)*p.pct/100)) : `${p.pct}%`}</strong>
              </div>
            ))}
            <div style={{ background:"#FFFAFA",borderRadius:10,padding:"14px 18px",border:`1px solid ${C.border}`,fontSize:13,lineHeight:2,color:"#4A2A2A",marginTop:12 }}>
              <div>• Payments via <strong>Bank Transfer / Cheque</strong> in favour of <strong>High Rise Interiors</strong></div>
              <div>• Work commences only after advance payment (35%) is received</div>
              <div>• Each phase must be cleared before proceeding to next</div>
              <div>• GST @ 18% applicable as per government norms</div>
            </div>
          </div>
          {/* Disclaimers */}
          <div style={{ marginBottom:32 }}>
            <div style={RS.sTitle}>Disclaimers & Terms</div>
            <div style={{ background:"#FFFFF8",borderRadius:12,padding:"20px 24px",border:`1.5px solid #E8E0C0`,fontSize:13,lineHeight:2.1,color:"#4A4A2A" }}>
              <div style={{ background:"#FFF0F0",border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",marginBottom:12,color:C.red,fontWeight:700 }}>
                🚫 NO REFUND POLICY: All payments are strictly non-refundable once work has commenced.
              </div>
              <div>1. <strong>Draft Quotation:</strong> This is a draft and may vary based on final quantity and material selection.</div>
              <div>2. <strong>Material Prices:</strong> Subject to market fluctuations. Valid for 30 days from date of issue.</div>
              <div>3. <strong>Scope Changes:</strong> Any additions will be quoted and billed separately with written approval.</div>
              <div>4. <strong>Timeline:</strong> {selected.timeline||"Agreed duration"} is indicative. Delays due to civil work or approvals not included.</div>
              <div>5. <strong>Warranty:</strong> 1-year workmanship warranty. Material warranty per manufacturer.</div>
              <div>6. <strong>Cancellation:</strong> Amounts paid till date are forfeited upon cancellation after commencement.</div>
              <div>7. <strong>Dispute Resolution:</strong> Subject to jurisdiction of Hyderabad courts only.</div>
            </div>
          </div>
          {/* Signature */}
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:32,marginBottom:32 }}>
            <div style={{ borderTop:`2px solid ${C.dark}`,paddingTop:12 }}>
              <div style={{ fontSize:12,color:C.muted,marginBottom:4 }}>Client Signature</div>
              <div style={{ fontSize:14,fontWeight:700 }}>{selected.name}</div>
              <div style={{ marginTop:36,borderTop:"1px dashed #9A7070",paddingTop:8,fontSize:11,color:C.muted }}>Signature / Date</div>
            </div>
            <div style={{ borderTop:`2px solid ${C.red}`,paddingTop:12 }}>
              <div style={{ fontSize:12,color:C.muted,marginBottom:4 }}>Authorised by</div>
              <div style={{ fontSize:14,fontWeight:700,color:C.red }}>High Rise Interiors</div>
              <div style={{ fontSize:12,color:C.muted }}>Hyderabad, Telangana</div>
              <div style={{ marginTop:36,borderTop:"1px dashed #9A7070",paddingTop:8,fontSize:11,color:C.muted }}>Signature / Stamp / Date</div>
            </div>
          </div>
          {/* Footer */}
          <div style={{ borderTop:`2px solid ${C.red}`,paddingTop:16,marginTop:24 }}>
            <div style={{ display:"flex",justifyContent:"space-between",fontSize:12,color:C.muted,marginBottom:6 }}>
              <span>🏗 High Rise Interiors — Hyderabad, Telangana</span>
              <span>{d}</span>
            </div>
            <div style={{ fontSize:11,color:"#C0A0A0",textAlign:"center",lineHeight:1.8 }}>
              Confidential — intended solely for {selected.name}. All payments are non-refundable. Prices in INR ₹.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── INVOICE ───────────────────────────────────────────────────────────
  if (view==="invoice" && selected) {
    const d         = new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"});
    const invNum    = "HRI-" + String(selected.id).slice(-4).padStart(4,"0") + "-" + new Date().getFullYear();
    const total     = Number(selected.quotation)||0;
    const gst       = Math.round(total*0.18);
    const grand     = total+gst;
    const IV = {
      sTitle:{ fontSize:13,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:C.red,borderBottom:`1.5px solid ${C.border}`,paddingBottom:6,marginBottom:14 },
      tRow:  { display:"flex",justifyContent:"space-between",padding:"10px 14px",fontSize:13 },
      pill:  (bg,c)=>({ background:bg,color:c,padding:"3px 14px",borderRadius:20,fontSize:11,fontWeight:700 }),
    };
    return (
      <div style={{ background:"#fff",minHeight:"100vh",fontFamily:"'Cormorant Garamond',Georgia,serif",color:C.dark,paddingBottom:60 }}>
        <style>{`@media print{.np{display:none!important}}`}</style>
        <div className="np" style={{ background:C.dark,padding:"12px 32px",display:"flex",gap:12,alignItems:"center" }}>
          <button onClick={()=>setView("detail")} style={{ background:"transparent",color:"#FFAAAA",border:"1px solid #FFAAAA",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontFamily:"inherit",fontSize:12 }}>← Back</button>
          <button onClick={()=>window.print()} style={{ background:C.red,color:"#fff",border:"none",borderRadius:8,padding:"8px 20px",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700 }}>🖨 Print / Save PDF</button>
          <span style={{ color:"#9A7070",fontSize:12 }}>Tip: Choose "Save as PDF" in print dialog</span>
        </div>
        <div style={{ maxWidth:820,margin:"0 auto",padding:"40px 48px" }}>
          {/* Header */}
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:36,paddingBottom:24,borderBottom:`3px solid ${C.red}` }}>
            <div>
              <div style={{ fontSize:28,fontWeight:700,color:C.red,letterSpacing:2,textTransform:"uppercase" }}>🏗 High Rise Interiors</div>
              <div style={{ fontSize:12,color:C.muted,marginTop:4,lineHeight:1.8 }}>Hyderabad, Telangana, India<br/>GSTIN: [Your GST Number]</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:28,fontWeight:700,color:C.dark }}>INVOICE</div>
              <div style={{ fontSize:13,color:C.muted,marginTop:6,lineHeight:1.9 }}>
                <div><strong>Invoice No:</strong> {invNum}</div>
                <div><strong>Date:</strong> {d}</div>
              </div>
            </div>
          </div>
          {/* Bill To */}
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:32,marginBottom:28 }}>
            <div>
              <div style={IV.sTitle}>Bill To</div>
              <div style={{ fontSize:16,fontWeight:700,marginBottom:4 }}>{selected.name}</div>
              <div style={{ fontSize:13,color:"#4A2A2A",lineHeight:1.9 }}>
                {selected.address && <div>📍 {selected.address}</div>}
                {selected.phone   && <div>📞 {selected.phone}</div>}
                {selected.email   && <div>📧 {selected.email}</div>}
              </div>
            </div>
            <div>
              <div style={IV.sTitle}>Project Details</div>
              <div style={{ fontSize:13,color:"#4A2A2A",lineHeight:1.9 }}>
                <div><strong>Type:</strong> {selected.projectType}</div>
                {selected.style     && <div><strong>Style:</strong> {selected.style}</div>}
                {selected.startDate && <div><strong>Start:</strong> {selected.startDate}</div>}
                {selected.timeline  && <div><strong>Duration:</strong> {selected.timeline}</div>}
              </div>
            </div>
          </div>
          {/* Rooms */}
          {(selected.rooms||[]).length>0 && (
            <div style={{ marginBottom:24 }}>
              <div style={IV.sTitle}>Scope — Rooms Covered</div>
              <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>{selected.rooms.map(r=><span key={r} style={IV.pill(C.light,C.red)}>{r}</span>)}</div>
            </div>
          )}
          {/* Line Items */}
          <div style={{ marginBottom:28 }}>
            <div style={IV.sTitle}>Invoice Items</div>
            <div style={{ border:`1.5px solid ${C.border}`,borderRadius:12,overflow:"hidden" }}>
              <div style={{ ...IV.tRow,background:C.red,color:"#fff",fontWeight:700,fontSize:12,letterSpacing:1 }}>
                <span style={{ flex:3 }}>Description</span><span style={{ flex:1,textAlign:"right" }}>Amount (₹)</span>
              </div>
              <div style={{ ...IV.tRow,background:"#FFFAFA",borderBottom:`1px solid ${C.border}` }}>
                <span style={{ flex:3,lineHeight:1.7 }}><strong>Interior Design & Execution Work</strong><br/><span style={{ fontSize:12,color:C.muted }}>{selected.projectType} — {selected.address}</span></span>
                <span style={{ flex:1,textAlign:"right",fontWeight:600 }}>{fmt(total)||"As agreed"}</span>
              </div>
              {(selected.rooms||[]).map((r,i)=>(
                <div key={i} style={{ ...IV.tRow,background:i%2===0?"#fff":"#FFFAFA",borderBottom:`1px solid ${C.border}` }}>
                  <span style={{ flex:3,fontSize:12,color:"#4A2A2A",paddingLeft:16 }}>↳ {r}</span>
                  <span style={{ flex:1,textAlign:"right",fontSize:12,color:C.muted }}>Included</span>
                </div>
              ))}
              <div style={{ ...IV.tRow,background:C.light,borderTop:`1.5px solid ${C.border}` }}>
                <span style={{ flex:3,color:C.muted }}>Subtotal (Before GST)</span>
                <span style={{ flex:1,textAlign:"right" }}>{fmt(total)||"—"}</span>
              </div>
              {total>0 && (
                <div style={{ ...IV.tRow,background:C.light,borderTop:`1px solid ${C.border}` }}>
                  <span style={{ flex:3,color:C.muted }}>GST @ 18%</span>
                  <span style={{ flex:1,textAlign:"right" }}>{fmt(gst)}</span>
                </div>
              )}
              <div style={{ ...IV.tRow,background:C.red,color:"#fff" }}>
                <span style={{ flex:3,fontWeight:700,fontSize:15 }}>Grand Total (Incl. GST)</span>
                <span style={{ flex:1,textAlign:"right",fontWeight:700,fontSize:17 }}>{total>0?fmt(grand):fmt(total)||"As agreed"}</span>
              </div>
            </div>
          </div>
          {/* Payment Schedule */}
          <div style={{ marginBottom:28 }}>
            <div style={IV.sTitle}>Payment Schedule</div>
            <div style={{ border:`1.5px solid ${C.border}`,borderRadius:12,overflow:"hidden" }}>
              <div style={{ ...IV.tRow,background:C.red,color:"#fff",fontWeight:700,fontSize:12,letterSpacing:1 }}>
                <span style={{ flex:1 }}>Phase</span><span style={{ flex:2 }}>Milestone</span>
                <span style={{ flex:1,textAlign:"center" }}>%</span><span style={{ flex:1,textAlign:"right" }}>Amount</span>
                <span style={{ flex:1,textAlign:"right" }}>Status</span>
              </div>
              {PAYMENT_PHASES.map((p,i)=>(
                <div key={i} style={{ ...IV.tRow,background:i%2===0?"#FFFAFA":"#fff",borderTop:`1px solid ${C.border}` }}>
                  <span style={{ flex:1,fontWeight:700,color:C.red,fontSize:12 }}>{p.day}</span>
                  <span style={{ flex:2,fontSize:12,color:"#4A2A2A" }}>{p.label}</span>
                  <span style={{ flex:1,textAlign:"center",fontSize:12 }}>{p.pct}%</span>
                  <span style={{ flex:1,textAlign:"right",fontWeight:600,fontSize:13 }}>{total>0?fmt(Math.round(total*p.pct/100)):"—"}</span>
                  <span style={{ flex:1,textAlign:"right" }}><span style={i===0?IV.pill("#FFF3CD","#856404"):IV.pill("#F0F0F0","#9A9A9A")}>{i===0?"Due Now":"Pending"}</span></span>
                </div>
              ))}
            </div>
          </div>
          {/* Payment Terms */}
          <div style={{ marginBottom:28 }}>
            <div style={IV.sTitle}>Payment Terms</div>
            <div style={{ background:"#FFFAFA",borderRadius:10,padding:"16px 20px",border:`1px solid ${C.border}`,fontSize:13,lineHeight:2,color:"#4A2A2A" }}>
              <div>• All payments via <strong>Bank Transfer / Cheque</strong> in favour of <strong>High Rise Interiors</strong></div>
              <div>• Work commences only after <strong>advance payment (35%)</strong> is received</div>
              <div>• Each phase payment must be cleared before proceeding to next phase</div>
              <div>• Delay in payment may cause equivalent delay in project execution</div>
              <div>• GST @ 18% applicable and payable by the client as per government norms</div>
            </div>
          </div>
          {/* No Refund + Disclaimers */}
          <div style={{ marginBottom:28 }}>
            <div style={IV.sTitle}>Terms, Conditions & Disclaimers</div>
            <div style={{ background:"#FFFFF8",borderRadius:10,padding:"16px 20px",border:"1.5px solid #E8E0C0",fontSize:13,lineHeight:2,color:"#4A4A2A" }}>
              <div style={{ background:"#FFF0F0",border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:13,color:C.red,fontWeight:700 }}>
                🚫 NO REFUND POLICY: All payments made are strictly non-refundable. Once payment is made and work has commenced, no refunds will be issued under any circumstances.
              </div>
              <div>1. <strong>Cancellation:</strong> Amounts paid till date are forfeited upon cancellation after commencement.</div>
              <div>2. <strong>Scope Changes:</strong> Additions beyond agreed scope billed separately with written approval.</div>
              <div>3. <strong>Material Prices:</strong> Valid for 30 days. Subject to market fluctuations.</div>
              <div>4. <strong>Timeline:</strong> {selected.timeline||"Agreed duration"} is indicative. External delays excluded.</div>
              <div>5. <strong>Warranty:</strong> 1-year workmanship warranty. Void if unauthorised modifications made.</div>
              <div>6. <strong>Dispute Resolution:</strong> Exclusive jurisdiction of Hyderabad courts.</div>
              <div>7. <strong>Force Majeure:</strong> Not liable for delays due to natural disasters or government restrictions.</div>
            </div>
          </div>
          {/* Signature */}
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:32,marginBottom:32 }}>
            <div style={{ borderTop:`2px solid ${C.dark}`,paddingTop:12 }}>
              <div style={{ fontSize:12,color:C.muted,marginBottom:4 }}>Client Acceptance</div>
              <div style={{ fontSize:14,fontWeight:700 }}>{selected.name}</div>
              <div style={{ marginTop:36,borderTop:"1px dashed #9A7070",paddingTop:8,fontSize:11,color:C.muted }}>Signature / Date</div>
            </div>
            <div style={{ borderTop:`2px solid ${C.red}`,paddingTop:12 }}>
              <div style={{ fontSize:12,color:C.muted,marginBottom:4 }}>Authorised by</div>
              <div style={{ fontSize:14,fontWeight:700,color:C.red }}>High Rise Interiors</div>
              <div style={{ fontSize:12,color:C.muted }}>Hyderabad, Telangana</div>
              <div style={{ marginTop:36,borderTop:"1px dashed #9A7070",paddingTop:8,fontSize:11,color:C.muted }}>Signature / Stamp / Date</div>
            </div>
          </div>
          {/* Footer */}
          <div style={{ borderTop:`2px solid ${C.red}`,paddingTop:16,marginTop:24 }}>
            <div style={{ display:"flex",justifyContent:"space-between",fontSize:12,color:C.muted,marginBottom:6 }}>
              <span>🏗 High Rise Interiors — Hyderabad, Telangana</span>
              <span>{invNum} | {d}</span>
            </div>
            <div style={{ fontSize:11,color:"#C0A0A0",textAlign:"center",lineHeight:1.8 }}>
              All payments are non-refundable. Confidential — intended solely for {selected.name}. Prices in INR ₹.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── DETAIL ────────────────────────────────────────────────────────────
  if (view==="detail" && selected) return (
    <div style={S.app}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes slideIn{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      {toast && <Toast msg={toast.msg} type={toast.type}/>}
      <div style={S.hdr}>
        <div><div style={S.logo}>🏗 High Rise Interiors</div><span style={S.sub}>Client Profile</span></div>
        <div style={{ display:"flex",gap:10 }}>
          <button style={S.btn("dark")} onClick={()=>setView("list")}>← Back</button>
          <button style={S.btn("dark")} onClick={()=>setView("report")}>📄 Report</button>
          <button style={S.btn("dark")} onClick={()=>setView("invoice")}>🧾 Invoice</button>
          <button style={S.btn()} onClick={()=>openEdit(selected)}>Edit</button>
        </div>
      </div>
      <div style={S.main}>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20 }}>
          <div>
            <div style={{ ...S.card,marginBottom:16 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16 }}>
                <div><div style={{ fontSize:22,fontWeight:700 }}>{selected.name}</div><div style={{ color:C.muted,fontSize:13,marginTop:2 }}>{selected.projectType}</div></div>
                <span style={S.badge(selected.status)}>{selected.status}</span>
              </div>
              {[["📞",selected.phone],["📧",selected.email],["📍",selected.address],["📅","Start: "+selected.startDate],["⏱",selected.timeline],["💰",fmt(selected.quotation)]].filter(([,v])=>v&&!v.includes("Start: ")).map(([i,v])=>(
                <div key={i} style={{ fontSize:13,marginBottom:6 }}><span style={{ color:C.muted }}>{i} </span>{v}</div>
              ))}
              {selected.startDate && <div style={{ fontSize:13,marginBottom:6 }}><span style={{ color:C.muted }}>📅 </span>Start: {selected.startDate}</div>}
            </div>
            {selected.notes && <div style={S.card}><div style={S.sec}>Notes</div><div style={{ fontSize:14,lineHeight:1.8 }}>{selected.notes}</div></div>}
          </div>
          <div>
            <div style={{ ...S.card,marginBottom:16 }}>
              <div style={S.sec}>Design & Scope</div>
              {selected.style && <div style={{ marginBottom:12 }}><span style={{ color:C.muted,fontSize:13 }}>Style: </span><strong>{selected.style}</strong></div>}
              {(selected.rooms||[]).length>0 && (
                <div>
                  {selected.rooms.map(r => {
                    const rd = selected.roomDetails?.[r] || {};
                    const area = rd.length && rd.width ? (parseFloat(rd.length)*parseFloat(rd.width)).toFixed(0) : null;
                    return (
                      <div key={r} style={{ marginBottom:12, background:C.light, borderRadius:10, padding:"12px 16px", border:`1px solid ${C.border}` }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                          <span style={{ fontWeight:700, fontSize:13, color:C.red }}>🏠 {r}</span>
                          {area && <span style={{ fontSize:12, color:C.muted }}>{rd.length} × {rd.width} ft = <strong>{area} sq ft</strong></span>}
                        </div>
                        {rd.height && <div style={{ fontSize:12, color:C.muted, marginBottom:4 }}>Ceiling: {rd.height} ft</div>}
                        {rd.notes && <div style={{ fontSize:12, color:C.dark }}>{rd.notes}</div>}
                        {(rd.photos||[]).length>0 && (
                          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:8 }}>
                            {rd.photos.map((p,i)=>(<img key={i} src={p} alt={r} style={{ width:80, height:80, objectFit:"cover", borderRadius:8, border:`1.5px solid ${C.border}` }}/>))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {selected.roomMaterials && Object.keys(selected.roomMaterials).length > 0 && (
              <div style={{ ...S.card,marginBottom:16 }}>
                <div style={S.sec}>Room Materials & Cost</div>
                {Object.entries(selected.roomMaterials).map(([room, mats]) => {
                  const roomCost = Object.entries(mats).reduce((total, [matType, sel]) => {
                    if (!sel?.name) return total;
                    const item = MATERIAL_CATALOG[matType]?.find(m => m.name === sel.name);
                    return total + (item && sel.qty ? parseFloat(sel.qty) * item.price : 0);
                  }, 0);
                  return (
                    <div key={room} style={{ marginBottom:12, background:C.light, borderRadius:10, padding:"12px 16px", border:`1px solid ${C.border}` }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                        <span style={{ fontWeight:700, fontSize:13, color:C.red }}>🏠 {room}</span>
                        {roomCost > 0 && <span style={{ fontWeight:700, fontSize:13, color:C.red }}>{fmt(Math.round(roomCost))}</span>}
                      </div>
                      {Object.entries(mats).filter(([,v])=>v?.name).map(([matType, sel]) => (
                        <div key={matType} style={{ fontSize:12, color:C.dark, marginBottom:3 }}>
                          <span style={{ color:C.muted }}>{MATERIAL_LABELS[matType]}: </span>
                          <strong>{sel.name}</strong>
                          {sel.qty && <span style={{ color:C.muted }}> × {sel.qty} {MATERIAL_CATALOG[matType]?.find(m=>m.name===sel.name)?.unit}</span>}
                        </div>
                      ))}
                    </div>
                  );
                })}
                {(() => {
                  const grand = Object.values(selected.roomMaterials).reduce((t, mats) =>
                    t + Object.entries(mats).reduce((rt, [matType, sel]) => {
                      if (!sel?.name) return rt;
                      const item = MATERIAL_CATALOG[matType]?.find(m => m.name === sel.name);
                      return rt + (item && sel.qty ? parseFloat(sel.qty) * item.price : 0);
                    }, 0), 0);
                  return grand > 0 ? (
                    <div style={{ display:"flex", justifyContent:"space-between", background:C.red, borderRadius:10, padding:"10px 16px" }}>
                      <span style={{ color:"#FFEEEE", fontWeight:700, fontSize:13 }}>Total Material Cost</span>
                      <span style={{ color:"#fff", fontWeight:700, fontSize:16 }}>{fmt(Math.round(grand))}</span>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
            {selected.quotation && (
              <div style={S.card}>
                <div style={S.sec}>Quotation</div>
                {selected.previousQuotation && <div style={{ fontSize:13,marginBottom:4 }}><span style={{ color:C.muted }}>Previous: </span><span style={{ textDecoration:"line-through" }}>{fmt(selected.previousQuotation)}</span></div>}
                {selected.revisedQuotation  && <div style={{ fontSize:13,marginBottom:4 }}><span style={{ color:C.muted }}>Revised: </span>{fmt(selected.revisedQuotation)}</div>}
                <div style={{ fontSize:20,fontWeight:700,color:C.red,marginTop:8 }}>Final: {fmt(selected.quotation)}</div>
              </div>
            )}
          </div>
        </div>
        <button style={{ ...S.btn("danger"),marginTop:20 }} onClick={()=>deleteCustomer(selected.id)}>Delete Client</button>
      </div>
    </div>
  );

  // ── LIST ──────────────────────────────────────────────────────────────
  if (view==="list") return (
    <div style={S.app}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes slideIn{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      {toast && <Toast msg={toast.msg} type={toast.type}/>}
      <div style={S.hdr}>
        <div><div style={S.logo}>🏗 High Rise Interiors</div><span style={S.sub}>Customer Management</span></div>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <span style={{ background:connected?"#27AE60":"#C0392B",color:"#fff",fontSize:10,padding:"3px 10px",borderRadius:20 }}>● {connected?"Connected":"Offline"}</span>
          <span style={{ color:"#FFAAAA",fontSize:11 }}>{user?.email}</span>
          <button style={S.btn("dark")} onClick={fetchCustomers}>↻</button>
          <button style={S.btn("dark")} onClick={exportCSV}>↓ CSV</button>
          <button style={S.btn("dark")} onClick={onLogout}>Sign Out</button>
          <button style={S.btn()} onClick={openNew}>+ New Client</button>
        </div>
      </div>
      <div style={S.main}>
        {/* Stats */}
        <div style={{ display:"flex",gap:14,marginBottom:28,flexWrap:"wrap" }}>
          {[["Total",stats.total,"👥"],["Active",stats.active,"🔨"],["Leads",stats.leads,"📋"],["Completed",stats.completed,"✅"]].map(([l,n,i])=>(
            <div key={l} style={{ ...S.card,flex:1 }}>
              <div style={{ fontSize:34,fontWeight:700,color:C.red,lineHeight:1 }}>{loading?"…":n}</div>
              <div style={{ fontSize:11,letterSpacing:2,color:C.muted,textTransform:"uppercase",marginTop:4 }}>{i} {l}</div>
            </div>
          ))}
          <div style={{ ...S.card,flex:1,background:C.light }}>
            <div style={{ fontSize:22,fontWeight:700,color:C.red,lineHeight:1 }}>{loading?"…":fmt(stats.revenue)}</div>
            <div style={{ fontSize:11,letterSpacing:2,color:C.muted,textTransform:"uppercase",marginTop:4 }}>💰 Pipeline</div>
          </div>
        </div>
        {/* Search */}
        <div style={{ display:"flex",gap:12,marginBottom:20,flexWrap:"wrap",alignItems:"center" }}>
          <input style={{ ...S.input,width:280,marginBottom:0 }} placeholder="Search name, phone, address…" value={search} onChange={e=>setSearch(e.target.value)}/>
          <div style={{ display:"flex",gap:6,background:"#F5EEEE",padding:5,borderRadius:10 }}>
            {["All",...STATUSES].map(s=><button key={s} style={S.tab(filterStatus===s)} onClick={()=>setFilterStatus(s)}>{s}</button>)}
          </div>
        </div>
        {/* List */}
        {loading ? <Spinner/> : filtered.length===0 ? (
          <div style={{ textAlign:"center",padding:80,color:"#C9A0A0" }}>
            <div style={{ fontSize:48,marginBottom:12 }}>🏗</div>
            <div style={{ fontSize:18 }}>{customers.length===0?"No clients yet":"No results"}</div>
            {customers.length===0 && <button style={{ ...S.btn(),marginTop:24 }} onClick={openNew}>+ Add First Client</button>}
          </div>
        ) : filtered.map(c=>(
          <div key={c.id} style={{ ...S.card,cursor:"pointer",transition:"all 0.2s",marginBottom:12 }}
            onMouseEnter={e=>e.currentTarget.style.boxShadow="0 6px 24px rgba(139,26,26,0.12)"}
            onMouseLeave={e=>e.currentTarget.style.boxShadow="0 2px 12px rgba(139,26,26,0.06)"}
            onClick={()=>openDetail(c)}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10 }}>
              <div>
                <div style={{ fontSize:18,fontWeight:700,marginBottom:3 }}>{c.name}</div>
                <div style={{ fontSize:13,color:C.muted }}>{c.phone}{c.email?` · ${c.email}`:""}</div>
                {c.address && <div style={{ fontSize:12,color:"#B0A0A0",marginTop:2 }}>📍 {c.address}</div>}
              </div>
              <div style={{ display:"flex",gap:10,alignItems:"center",flexWrap:"wrap" }}>
                {c.quotation && <span style={{ background:C.light,color:C.red,fontWeight:700,fontSize:13,padding:"4px 12px",borderRadius:20,border:`1px solid ${C.border}` }}>{fmt(c.quotation)}</span>}
                <span style={S.badge(c.status)}>{c.status}</span>
                <button style={{ ...S.btn("ghost"),padding:"6px 14px",fontSize:11 }} onClick={e=>{e.stopPropagation();openEdit(c);}}>Edit</button>
              </div>
            </div>
            <div style={{ marginTop:10,display:"flex",gap:16,flexWrap:"wrap" }}>
              {c.style && <span style={{ fontSize:12,color:C.red }}>✦ {c.style}</span>}
              {(c.rooms||[]).length>0 && <span style={{ fontSize:12,color:C.muted }}>🏠 {c.rooms.slice(0,3).join(", ")}{c.rooms.length>3?` +${c.rooms.length-3}`:""}</span>}
              {c.timeline && <span style={{ fontSize:12,color:C.muted }}>⏱ {c.timeline}</span>}
              {c.startDate && <span style={{ fontSize:12,color:C.muted }}>📅 {c.startDate}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── FORM ──────────────────────────────────────────────────────────────
  return (
    <div style={S.app}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes slideIn{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      {toast && <Toast msg={toast.msg} type={toast.type}/>}
      <div style={S.hdr}>
        <div><div style={S.logo}>🏗 High Rise Interiors</div><span style={S.sub}>{form.id?"Edit Client":"New Client"}</span></div>
        <div style={{ display:"flex",gap:10 }}>
          <button style={S.btn("dark")} onClick={()=>setView("list")}>Cancel</button>
          <button style={{ ...S.btn(),opacity:saving?0.7:1 }} onClick={saveCustomer} disabled={saving}>{saving?"Saving…":form.id?"Update Client":"Save Client"}</button>
        </div>
      </div>
      <div style={S.main}>
        {/* Tabs */}
        <div style={{ display:"flex",gap:6,marginBottom:24,background:"#F5EEEE",padding:5,borderRadius:12,width:"fit-content" }}>
          {[["personal","👤 Client"],["dimensions","📐 Dimensions"],["materials","🔧 Materials"],["quotation","💰 Quotation"],["notes","📝 Notes"]].map(([k,l])=>(
            <button key={k} style={S.tab(activeTab===k)} onClick={()=>setActiveTab(k)}>{l}</button>
          ))}
        </div>

        <div style={{ ...S.card,padding:"32px 36px" }}>

          {/* ── PERSONAL ── */}
          {activeTab==="personal" && (
            <div>
              {form.id && (
                <div style={{ background:"#F5EEEE", borderRadius:10, padding:"10px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:12, border:`1px solid ${C.border}` }}>
                  <span style={{ fontSize:11, letterSpacing:2, color:C.muted, textTransform:"uppercase" }}>Client ID</span>
                  <span style={{ fontSize:13, fontWeight:700, color:C.red, fontFamily:"monospace" }}>{form.id}</span>
                  <span style={{ fontSize:11, color:C.muted }}>(Read only — cannot be changed)</span>
                </div>
              )}
              <div style={S.sec}>Client Information</div>
              <div style={S.row}>
                <Field label="Full Name *">
                  <input style={S.input} value={form.name} onChange={e=>setF("name",e.target.value)} placeholder="Mr. Sashi Kanth"/>
                </Field>
                <Field label="Status">
                  <Select value={form.status} onChange={v=>setF("status",v)} options={STATUSES}/>
                </Field>
              </div>
              <div style={S.row}>
                <Field label="Phone">
                  <input style={S.input} value={form.phone} onChange={e=>setF("phone",e.target.value)} placeholder="+91 98765 43210"/>
                </Field>
                <Field label="Email">
                  <input style={S.input} type="email" value={form.email} onChange={e=>setF("email",e.target.value)} placeholder="client@email.com"/>
                </Field>
              </div>
              <div style={{ marginBottom:18 }}>
                <label style={S.label}>Project Address</label>
                <input style={S.input} value={form.address} onChange={e=>setF("address",e.target.value)} placeholder="EIPL Cornerstone T2, 803, Hyderabad, Telangana"/>
              </div>
              <div style={S.row}>
                <Field label="Project Type">
                  <Select value={form.projectType} onChange={v=>setF("projectType",v)} options={["Residential","Villa","Apartment","Commercial","Office"]}/>
                </Field>
                <Field label="Budget Range">
                  <Select value={form.budget} onChange={v=>setF("budget",v)} options={BUDGETS} placeholder="Select budget"/>
                </Field>
              </div>
              <div style={S.row}>
                <Field label="Start Date">
                  <input style={S.input} type="date" value={form.startDate} onChange={e=>setF("startDate",e.target.value)}/>
                </Field>
                <Field label="Duration">
                  <Select value={form.timeline} onChange={v=>setF("timeline",v)} options={TIMELINES} placeholder="Select duration"/>
                </Field>
              </div>
              <div style={{ marginBottom:18 }}>
                <label style={S.label}>Interior Style</label>
                <div style={{ display:"flex",flexWrap:"wrap",gap:8,marginTop:8 }}>
                  {STYLES.map(s=><button key={s} style={S.pill(form.style===s)} onClick={()=>setF("style",s)}>{s}</button>)}
                </div>
              </div>
            </div>
          )}

          {/* ── DIMENSIONS ── */}
          {activeTab==="dimensions" && (
            <div>
              <div style={S.sec}>Select Rooms & Enter Dimensions</div>
              <div style={{ fontSize:13, color:C.muted, marginBottom:16, lineHeight:1.7 }}>
                Select each room, enter its dimensions and upload a photo. All measurements in feet.
              </div>

              {/* Room selector */}
              <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:24 }}>
                {ROOMS.map(r=>(
                  <button key={r} style={S.pill(form.rooms.includes(r))} onClick={()=>toggleRoom(r)}>{r}</button>
                ))}
              </div>

              {/* Per-room dimension + photo cards */}
              {form.rooms.length === 0 && (
                <div style={{ textAlign:"center", padding:"32px", background:C.light, borderRadius:12, color:C.muted, fontSize:13 }}>
                  ☝️ Select rooms above to enter their dimensions
                </div>
              )}

              {form.rooms.map(room => {
                const rd = form.roomDetails?.[room] || {};
                const setRD = (key, val) => setForm(f => ({
                  ...f,
                  roomDetails: { ...(f.roomDetails||{}), [room]: { ...(f.roomDetails?.[room]||{}), [key]: val } }
                }));
                const area = rd.length && rd.width ? (parseFloat(rd.length) * parseFloat(rd.width)).toFixed(0) : null;

                return (
                  <div key={room} style={{ background:"#fff", border:`1.5px solid ${C.border}`, borderRadius:14, padding:"20px 24px", marginBottom:16, boxShadow:"0 2px 8px rgba(139,26,26,0.05)" }}>
                    {/* Room header */}
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                      <div style={{ fontSize:15, fontWeight:700, color:C.red }}>🏠 {room}</div>
                      {area && <span style={{ background:C.light, color:C.red, fontSize:12, fontWeight:700, padding:"3px 12px", borderRadius:20 }}>{area} sq ft</span>}
                    </div>

                    {/* Dimensions */}
                    <div style={{ display:"flex", gap:12, marginBottom:14, flexWrap:"wrap" }}>
                      <div style={{ flex:1 }}>
                        <label style={S.label}>Length (ft)</label>
                        <input style={S.input} type="number" value={rd.length||""} onChange={e=>setRD("length",e.target.value)} placeholder="0"/>
                      </div>
                      <div style={{ flex:1 }}>
                        <label style={S.label}>Width (ft)</label>
                        <input style={S.input} type="number" value={rd.width||""} onChange={e=>setRD("width",e.target.value)} placeholder="0"/>
                      </div>
                      <div style={{ flex:1 }}>
                        <label style={S.label}>Height (ft)</label>
                        <input style={S.input} type="number" value={rd.height||""} onChange={e=>setRD("height",e.target.value)} placeholder="0"/>
                      </div>
                    </div>

                    {/* Notes for this room */}
                    <div style={{ marginBottom:14 }}>
                      <label style={S.label}>Room Notes</label>
                      <input style={S.input} value={rd.notes||""} onChange={e=>setRD("notes",e.target.value)} placeholder={`Special requirements for ${room}…`}/>
                    </div>

                    {/* Photo upload */}
                    <div>
                      <label style={S.label}>Room Photo(s)</label>
                      <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"flex-start", marginTop:6 }}>
                        {/* Photo previews */}
                        {(rd.photos||[]).map((photo, idx) => (
                          <div key={idx} style={{ position:"relative", width:100, height:100 }}>
                            <img src={photo} alt={`${room} ${idx+1}`} style={{ width:100, height:100, objectFit:"cover", borderRadius:10, border:`1.5px solid ${C.border}` }}/>
                            <button
                              onClick={() => setRD("photos", (rd.photos||[]).filter((_,i)=>i!==idx))}
                              style={{ position:"absolute", top:-6, right:-6, background:C.red, color:"#fff", border:"none", borderRadius:"50%", width:20, height:20, cursor:"pointer", fontSize:12, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"inherit" }}>✕</button>
                          </div>
                        ))}
                        {/* Upload button */}
                        <label style={{ width:100, height:100, border:`2px dashed ${C.border}`, borderRadius:10, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", cursor:"pointer", color:C.muted, fontSize:11, letterSpacing:1, textAlign:"center", background:C.light }}>
                          <span style={{ fontSize:24, marginBottom:4 }}>📷</span>
                          <span>Add Photo</span>
                          <input type="file" accept="image/*" multiple style={{ display:"none" }}
                            onChange={e => {
                              const files = Array.from(e.target.files);
                              files.forEach(file => {
                                const reader = new FileReader();
                                reader.onload = ev => {
                                  setRD("photos", [...(rd.photos||[]), ev.target.result]);
                                };
                                reader.readAsDataURL(file);
                              });
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Total summary */}
              {form.rooms.length > 0 && (
                <div style={{ background:C.light, borderRadius:12, padding:"16px 20px", border:`1px solid ${C.border}`, marginTop:8 }}>
                  <div style={{ fontSize:11, letterSpacing:2, color:C.muted, textTransform:"uppercase", marginBottom:10 }}>Total Summary</div>
                  <div style={{ display:"flex", gap:32, flexWrap:"wrap" }}>
                    <div><span style={{ color:C.muted, fontSize:13 }}>Rooms: </span><strong>{form.rooms.length}</strong></div>
                    {(() => {
                      const totalArea = form.rooms.reduce((sum, r) => {
                        const rd = form.roomDetails?.[r] || {};
                        return sum + (rd.length && rd.width ? parseFloat(rd.length)*parseFloat(rd.width) : 0);
                      }, 0);
                      return totalArea > 0 ? <div><span style={{ color:C.muted, fontSize:13 }}>Total Area: </span><strong>{totalArea.toFixed(0)} sq ft</strong></div> : null;
                    })()}
                    {(() => {
                      const photos = form.rooms.reduce((sum, r) => sum + ((form.roomDetails?.[r]?.photos)||[]).length, 0);
                      return photos > 0 ? <div><span style={{ color:C.muted, fontSize:13 }}>Photos: </span><strong>{photos} uploaded</strong></div> : null;
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── MATERIALS ── */}
          {activeTab==="materials" && (
            <div>
              <div style={S.sec}>Room-wise Material Selection</div>
              {form.rooms.length === 0 ? (
                <div style={{ textAlign:"center", padding:"32px", background:C.light, borderRadius:12, color:C.muted, fontSize:13 }}>
                  ☝️ Please select rooms in the Dimensions tab first
                </div>
              ) : (
                <>
                  {form.rooms.map(room => {
                    const applicableMats = ROOM_MATERIALS[room] || ["plywood","laminate","ceiling","lights"];
                    const rm = form.roomMaterials?.[room] || {};
                    const setRM = (matType, field, val) => setForm(f => ({
                      ...f,
                      roomMaterials: {
                        ...(f.roomMaterials||{}),
                        [room]: {
                          ...(f.roomMaterials?.[room]||{}),
                          [matType]: { ...(f.roomMaterials?.[room]?.[matType]||{}), [field]: val }
                        }
                      }
                    }));

                    // Calculate room material cost
                    const roomCost = applicableMats.reduce((total, matType) => {
                      const sel = rm[matType];
                      if (!sel?.name) return total;
                      const item = MATERIAL_CATALOG[matType]?.find(m => m.name === sel.name);
                      if (!item) return total;
                      const qty = parseFloat(sel.qty || 0);
                      return total + (qty * item.price);
                    }, 0);

                    return (
                      <div key={room} style={{ background:"#fff", border:`1.5px solid ${C.border}`, borderRadius:14, padding:"20px 24px", marginBottom:16, boxShadow:"0 2px 8px rgba(139,26,26,0.05)" }}>
                        {/* Room header */}
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, paddingBottom:12, borderBottom:`1px solid ${C.border}` }}>
                          <div style={{ fontSize:15, fontWeight:700, color:C.red }}>🏠 {room}</div>
                          {roomCost > 0 && <span style={{ background:C.red, color:"#fff", fontSize:13, fontWeight:700, padding:"4px 14px", borderRadius:20 }}>Est. {fmt(Math.round(roomCost))}</span>}
                        </div>

                        {/* Material rows */}
                        {applicableMats.map(matType => {
                          const items = MATERIAL_CATALOG[matType] || [];
                          const sel = rm[matType] || {};
                          const selectedItem = items.find(m => m.name === sel.name);
                          const lineTotal = selectedItem && sel.qty ? Math.round(parseFloat(sel.qty) * selectedItem.price) : null;

                          return (
                            <div key={matType} style={{ marginBottom:14, background:"#FFFAFA", borderRadius:10, padding:"12px 16px", border:`1px solid ${C.border}` }}>
                              <div style={{ fontSize:11, letterSpacing:2, color:C.muted, textTransform:"uppercase", marginBottom:10, fontWeight:700 }}>{MATERIAL_LABELS[matType]}</div>
                              <div style={{ display:"flex", gap:12, flexWrap:"wrap", alignItems:"flex-end" }}>
                                {/* Material selector */}
                                <div style={{ flex:2 }}>
                                  <label style={S.label}>Brand / Type</label>
                                  <select style={S.input} value={sel.name||""} onChange={e => setRM(matType, "name", e.target.value)}>
                                    <option value="">Select {MATERIAL_LABELS[matType]}</option>
                                    {items.map(m => (
                                      <option key={m.name} value={m.name}>{m.name} — ₹{m.price}/{m.unit}</option>
                                    ))}
                                  </select>
                                </div>
                                {/* Quantity */}
                                <div style={{ flex:1 }}>
                                  <label style={S.label}>Qty ({selectedItem?.unit||"unit"})</label>
                                  <input style={S.input} type="number" value={sel.qty||""} onChange={e => setRM(matType, "qty", e.target.value)} placeholder="0"/>
                                </div>
                                {/* Rate display */}
                                <div style={{ flex:1 }}>
                                  <label style={S.label}>Rate</label>
                                  <div style={{ ...S.input, background:"#F5EEEE", color:C.muted, cursor:"default" }}>
                                    {selectedItem ? `₹${selectedItem.price}/${selectedItem.unit}` : "—"}
                                  </div>
                                </div>
                                {/* Line total */}
                                <div style={{ flex:1 }}>
                                  <label style={S.label}>Total</label>
                                  <div style={{ ...S.input, background:lineTotal?C.light:"#F5F5F5", color:lineTotal?C.red:C.muted, fontWeight:700, cursor:"default" }}>
                                    {lineTotal ? fmt(lineTotal) : "—"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}

                  {/* Grand total across all rooms */}
                  {(() => {
                    const grandTotal = form.rooms.reduce((total, room) => {
                      const applicableMats = ROOM_MATERIALS[room] || [];
                      const rm = form.roomMaterials?.[room] || {};
                      return total + applicableMats.reduce((rt, matType) => {
                        const sel = rm[matType];
                        if (!sel?.name) return rt;
                        const item = MATERIAL_CATALOG[matType]?.find(m => m.name === sel.name);
                        if (!item) return rt;
                        return rt + (parseFloat(sel.qty||0) * item.price);
                      }, 0);
                    }, 0);

                    return grandTotal > 0 ? (
                      <div style={{ background:C.red, borderRadius:14, padding:"20px 24px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <div>
                          <div style={{ color:"#FFEEEE", fontSize:12, letterSpacing:2, textTransform:"uppercase" }}>Estimated Material Cost</div>
                          <div style={{ color:"#FFAAAA", fontSize:11, marginTop:4 }}>Based on selected materials & quantities</div>
                        </div>
                        <div style={{ color:"#fff", fontSize:26, fontWeight:700 }}>{fmt(Math.round(grandTotal))}</div>
                      </div>
                    ) : null;
                  })()}
                </>
              )}
            </div>
          )}

          {/* ── QUOTATION ── */}
          {activeTab==="quotation" && (
            <div>
              <div style={S.sec}>Project Quotation (INR ₹)</div>

              {/* Auto-calculate from materials button */}
              {form.roomMaterials && Object.keys(form.roomMaterials).length > 0 && (() => {
                const matCost = Object.values(form.roomMaterials).reduce((t,mats)=>
                  t+Object.entries(mats).reduce((rt,[matType,sel])=>{
                    const item = MATERIAL_CATALOG[matType]?.find(m=>m.name===sel.name);
                    return rt+(item&&sel.qty?parseFloat(sel.qty)*item.price:0);
                  },0),0);
                const withLabour = Math.round(matCost * 1.5);
                return matCost > 0 ? (
                  <div style={{ background:C.light, borderRadius:12, padding:"14px 18px", marginBottom:20, border:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:C.red, letterSpacing:1 }}>AUTO-CALCULATED FROM MATERIALS</div>
                      <div style={{ fontSize:13, color:C.muted, marginTop:4 }}>Material cost {fmt(Math.round(matCost))} + Labour (50%) = <strong style={{ color:C.red }}>{fmt(withLabour)}</strong></div>
                    </div>
                    <button style={{ ...S.btn(), fontSize:11, padding:"8px 16px" }}
                      onClick={() => {
                        setF("previousQuotation", withLabour.toString());
                        setF("quotation", withLabour.toString());
                        setF("revisedQuotation", withLabour.toString());
                      }}>
                      ↓ Use This
                    </button>
                  </div>
                ) : null;
              })()}

              {/* Previous Quotation */}
              <div style={S.row}>
                <Field label="Previous Quotation ₹">
                  <input style={S.input} type="number" value={form.previousQuotation} onChange={e=>setF("previousQuotation",e.target.value)} placeholder="Auto-filled from materials"/>
                </Field>
                <Field label="Revised Quotation ₹">
                  <input style={{ ...S.input, color: form.revisedQuotation ? C.red : C.muted }} type="number" value={form.revisedQuotation} onChange={e=>setF("revisedQuotation",e.target.value)} placeholder="After rebate"/>
                </Field>
              </div>

              {/* Rebate / Coupon */}
              <div style={{ background:"#FFFAFA", borderRadius:12, padding:"18px 20px", border:`1px solid ${C.border}`, marginBottom:20 }}>
                <div style={S.sec}>Rebate / Coupon Code</div>
                <div style={S.row}>
                  <Field label="Rebate Type">
                    <select style={S.input} value={form.rebateType} onChange={e=>setF("rebateType",e.target.value)}>
                      <option value="amount">Fixed Amount (₹)</option>
                      <option value="percent">Percentage (%)</option>
                    </select>
                  </Field>
                  <Field label={form.rebateType==="percent" ? "Rebate % (max 5%)" : "Rebate Amount ₹"}>
                    <input style={S.input} type="number" min="0" max={form.rebateType==="percent"?"5":undefined} value={form.rebateValue} onChange={e=>{
                      setF("rebateValue", e.target.value);
                      const base = parseFloat(form.previousQuotation||0);
                      if (!base) return;
                      const pct = parseFloat(e.target.value||0);
                      // Cap rebate at 5% max
                      const safePct = form.rebateType==="percent" ? Math.min(pct, 5) : pct;
                      const rebate = form.rebateType==="percent"
                        ? Math.round(base * safePct / 100)
                        : parseFloat(e.target.value||0);
                      const revised = Math.round(base - rebate);
                      setF("revisedQuotation", revised.toString());
                      setF("quotation", revised.toString());
                    }} placeholder={form.rebateType==="percent"?"e.g. 10":"e.g. 25000"}/>
                  </Field>
                  <Field label="Referral Coupon Code">
                    <div style={{ display:"flex", gap:8 }}>
                      <input style={S.input} value={form.couponCode} onChange={e=>setF("couponCode",e.target.value)} placeholder="Auto-generate or type"/>
                      <button style={{ ...S.btn("light"), whiteSpace:"nowrap", padding:"10px 14px", fontSize:11 }}
                        onClick={()=>setF("couponCode", genCoupon(form.name, form.id||Date.now()))}>
                        ⚡ Generate
                      </button>
                    </div>
                  </Field>
                </div>
                {form.previousQuotation && form.rebateValue && (
                  <div style={{ display:"flex", gap:20, fontSize:13, padding:"10px 0", borderTop:`1px solid ${C.border}` }}>
                    <div><span style={{ color:C.muted }}>Base: </span><strong>{fmt(form.previousQuotation)}</strong></div>
                    <div><span style={{ color:C.muted }}>Rebate: </span><strong style={{ color:"#27AE60" }}>- {form.rebateType==="percent"?`${form.rebateValue}%`:fmt(form.rebateValue)}</strong></div>
                    <div><span style={{ color:C.muted }}>After Rebate: </span><strong style={{ color:C.red }}>{fmt(form.revisedQuotation)}</strong></div>
                  </div>
                )}
              </div>

              {/* Referral Program Info */}
              {form.couponCode && (
                <div style={{ background:"#F0FFF4", borderRadius:12, padding:"14px 18px", marginBottom:16, border:"1.5px solid #BBF7D0" }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"#166534", letterSpacing:1, marginBottom:8 }}>🎁 REFERRAL PROGRAM</div>
                  <div style={{ fontSize:13, color:"#166534", lineHeight:1.9 }}>
                    <div>• Client shares code <strong>{form.couponCode}</strong> with friends</div>
                    <div>• Referred friend gets <strong>5% off</strong> their project</div>
                    <div>• This client gets <strong>5% cashback</strong> on their final invoice</div>
                  </div>
                </div>
              )}

              {/* Final Quotation */}
              <div style={{ marginBottom:24 }}>
                <label style={S.label}>Final Quotation ₹ (Client sees this)</label>
                <input style={{ ...S.input, fontSize:18, fontWeight:700, borderColor:C.red }} type="number" value={form.quotation}
                  onChange={e=>setF("quotation",e.target.value)} placeholder="e.g. 2504040"/>
                <div style={{ fontSize:11, color:C.muted, marginTop:6, letterSpacing:1 }}>
                  💡 Tip: Set Final = Revised Quotation after applying rebate
                </div>
              </div>

              {/* Payment Schedule */}
              {form.quotation && (
                <div>
                  <div style={S.sec}>Auto Payment Schedule</div>
                  {PAYMENT_PHASES.map((p,i)=>(
                    <div key={i} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",background:C.light,borderRadius:12,padding:"14px 18px",marginBottom:10,border:`1px solid ${C.border}` }}>
                      <div><div style={{ fontWeight:700,fontSize:13,color:C.red }}>{p.day} — {p.pct}% — {p.label}</div></div>
                      <div style={{ fontSize:18,fontWeight:700,color:C.red }}>{fmt(Math.round(Number(form.quotation)*p.pct/100))}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── NOTES ── */}
          {activeTab==="notes" && (
            <div>
              <div style={S.sec}>Scope of Work & Notes</div>
              <textarea
                style={{ ...S.input,minHeight:220,resize:"vertical",lineHeight:1.8 }}
                value={form.notes}
                onChange={e=>setF("notes",e.target.value)}
                placeholder={"Describe scope of work:\n\nDrawing: TV unit 10ft with PVD partition\nKitchen: U-shape acrylic finish\nMaster Bedroom: Wall-to-wall wardrobe\n\nOut of scope: Electrical accessories, curtains\nDiscussion: Client wants delivery by March"}
              />
            </div>
          )}

          {/* Footer Nav */}
          <div style={{ display:"flex",justifyContent:"space-between",marginTop:28,paddingTop:20,borderTop:`1px solid ${C.border}` }}>
            <button style={S.btn("ghost")} onClick={()=>{const i=TABS.indexOf(activeTab);if(i>0)setActiveTab(TABS[i-1]);}} disabled={activeTab===TABS[0]}>← Previous</button>
            {activeTab!==TABS[TABS.length-1]
              ? <button style={S.btn()} onClick={()=>{const i=TABS.indexOf(activeTab);setActiveTab(TABS[i+1]);}}>Next →</button>
              : <button style={{ ...S.btn(),opacity:saving?0.7:1 }} onClick={saveCustomer} disabled={saving}>{saving?"Saving…":form.id?"Update Client":"Save Client"}</button>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
