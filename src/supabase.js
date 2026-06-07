const SUPABASE_URL = "https://utctflrqhjzxhzyuhsnn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0Y3RmbHJxaGp6eGh6eXVoc25uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3Mzg0MzYsImV4cCI6MjA5NjMxNDQzNn0.9RC2YnbSnvtWN5EmyzSxuXvzpgV4a-A3YU6iwDBgKhY";
const TABLE = "customers";

// ── Sign Up ───────────────────────────────────────────────────────────
export const signUp = async (email, password) => {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || data.msg || "Signup failed");
  return data;
};

// ── Sign In ───────────────────────────────────────────────────────────
export const signIn = async (email, password) => {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data.error || data.error_description)
    throw new Error(data.error_description || data.error || "Login failed");
  return data; // { access_token, refresh_token, expires_in, user }
};

// ── Refresh Token ─────────────────────────────────────────────────────
export const refreshSession = async (refreshToken) => {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    const data = await res.json();
    if (!res.ok || data.error || !data.access_token) return null;
    return {
      token:        data.access_token,
      refreshToken: data.refresh_token,
      expiresAt:    Date.now() + ((data.expires_in || 3600) * 1000),
      user:         data.user,
    };
  } catch { return null; }
};

// ── Sign Out ──────────────────────────────────────────────────────────
export const signOut = async (token) => {
  try {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: "POST",
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${token}` },
    });
  } catch(_) {}
};

// ── Database calls ────────────────────────────────────────────────────
export const sb = async (path, method = "GET", body = null, token = null) => {
  const headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${token || SUPABASE_KEY}`,
    "Content-Type": "application/json",
  };
  if (method === "POST" || method === "PATCH") headers["Prefer"] = "return=representation";

  let res;
  try {
    res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method, headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch(networkErr) {
    throw new Error("Network error — check your connection");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) {
      const e = new Error("Session expired — refreshing…");
      e.code = "SESSION_EXPIRED";
      throw e;
    }
    if (res.status === 403) throw new Error("Access denied — check RLS policy in Supabase");
    if (res.status === 404) throw new Error(`Table '${TABLE}' not found`);
    throw new Error(err.message || err.hint || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
};

// ── Row mappers ───────────────────────────────────────────────────────
export const toRow = (f) => ({
  name: f.name, email: f.email, phone: f.phone, address: f.address,
  status: f.status, project_type: f.projectType, budget: f.budget, timeline: f.timeline,
  rooms: f.rooms,
  dim_length: f.dimensions.length ? parseFloat(f.dimensions.length) : null,
  dim_width:  f.dimensions.width  ? parseFloat(f.dimensions.width)  : null,
  dim_height: f.dimensions.height ? parseFloat(f.dimensions.height) : null,
  style: f.style,
  palette: f.palette ? JSON.stringify(f.palette) : null,
  notes: f.notes,
});

export const fromRow = (r) => ({
  id: r.id, name: r.name||"", email: r.email||"", phone: r.phone||"", address: r.address||"",
  status: r.status||"Lead", projectType: r.project_type||"Residential",
  budget: r.budget||"", timeline: r.timeline||"",
  rooms: Array.isArray(r.rooms) ? r.rooms : (r.rooms ? JSON.parse(r.rooms) : []),
  dimensions: { length: r.dim_length||"", width: r.dim_width||"", height: r.dim_height||"" },
  style: r.style||"",
  palette: r.palette ? (typeof r.palette==="string" ? JSON.parse(r.palette) : r.palette) : null,
  notes: r.notes||"",
});

export { TABLE };
