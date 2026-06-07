const SUPABASE_URL = "https://utctflrqhjzxhzyuhsnn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0Y3RmbHJxaGp6eGh6eXVoc25uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3Mzg0MzYsImV4cCI6MjA5NjMxNDQzNn0.9RC2YnbSnvtWN5EmyzSxuXvzpgV4a-A3YU6iwDBgKhY";
const TABLE = "customers";

export const signUp = async (email, password) => {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method:"POST", headers:{"apikey":SUPABASE_KEY,"Content-Type":"application/json"},
    body:JSON.stringify({email,password}),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message||"Signup failed");
  return data;
};

export const signIn = async (email, password) => {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method:"POST", headers:{"apikey":SUPABASE_KEY,"Content-Type":"application/json"},
    body:JSON.stringify({email,password}),
  });
  const data = await res.json();
  if (data.error||data.error_description) throw new Error(data.error_description||data.error||"Login failed");
  return data;
};

export const refreshSession = async (refreshToken) => {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method:"POST", headers:{"apikey":SUPABASE_KEY,"Content-Type":"application/json"},
      body:JSON.stringify({refresh_token:refreshToken}),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.access_token) return null;
    return { token:data.access_token, refreshToken:data.refresh_token||refreshToken, expiresAt:Date.now()+((data.expires_in||3600)*1000), user:data.user };
  } catch { return null; }
};

export const signOut = async (token) => {
  try { await fetch(`${SUPABASE_URL}/auth/v1/logout`,{method:"POST",headers:{"apikey":SUPABASE_KEY,"Authorization":`Bearer ${token}`}}); } catch(_){}
};

export const sb = async (path, method="GET", body=null, token=null) => {
  const headers = { "apikey":SUPABASE_KEY, "Authorization":`Bearer ${token||SUPABASE_KEY}`, "Content-Type":"application/json" };
  if (method==="POST"||method==="PATCH") headers["Prefer"]="return=representation";
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{method,headers,...(body?{body:JSON.stringify(body)}:{})});
  if (!res.ok) {
    const err = await res.json().catch(()=>({}));
    if (res.status===401){const e=new Error("SESSION_EXPIRED");e.code="SESSION_EXPIRED";throw e;}
    throw new Error(err.message||err.hint||`HTTP ${res.status}`);
  }
  if (res.status===204) return null;
  return res.json();
};

export const toRow = (f) => ({
  name:         f.name,
  email:        f.email,
  phone:        f.phone,
  address:      f.address,
  status:       f.status,
  project_type: f.projectType,
  budget:       f.budget,
  timeline:     f.timeline,
  rooms:        f.rooms,
  dim_length:   f.dimensions?.length ? parseFloat(f.dimensions.length) : null,
  dim_width:    f.dimensions?.width  ? parseFloat(f.dimensions.width)  : null,
  dim_height:   f.dimensions?.height ? parseFloat(f.dimensions.height) : null,
  style:        f.style,
  palette:      f.palette ? JSON.stringify(f.palette) : null,
  notes:        f.notes,
  // High Rise specific fields
  quotation:          f.quotation          ? parseFloat(f.quotation)          : null,
  previous_quotation: f.previousQuotation  ? parseFloat(f.previousQuotation)  : null,
  revised_quotation:  f.revisedQuotation   ? parseFloat(f.revisedQuotation)   : null,
  start_date:   f.startDate  || null,
  plywood:      f.plywood    || null,
  laminate:     f.laminate   || null,
  hardware:     f.hardware   || null,
  glass:        f.glass      || null,
  ceiling:      f.ceiling    || null,
  lights:       f.lights     || null,
  handles:      f.handles    || null,
});

export const fromRow = (r) => ({
  id:r.id, name:r.name||"", email:r.email||"", phone:r.phone||"", address:r.address||"",
  status:r.status||"Lead", projectType:r.project_type||"Residential",
  budget:r.budget||"", timeline:r.timeline||"",
  rooms:Array.isArray(r.rooms)?r.rooms:(r.rooms?JSON.parse(r.rooms):[]),
  dimensions:{length:r.dim_length||"",width:r.dim_width||"",height:r.dim_height||""},
  style:r.style||"",
  palette:r.palette?(typeof r.palette==="string"?JSON.parse(r.palette):r.palette):null,
  notes:r.notes||"",
  quotation:r.quotation||"",
  previousQuotation:r.previous_quotation||"",
  revisedQuotation:r.revised_quotation||"",
  startDate:r.start_date||"",
  plywood:r.plywood||"",
  laminate:r.laminate||"",
  hardware:r.hardware||"",
  glass:r.glass||"",
  ceiling:r.ceiling||"",
  lights:r.lights||"",
  handles:r.handles||"",
});

export { TABLE };
