const SUPABASE_URL = "https://utctflrqhjzxhzyuhsnn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0Y3RmbHJxaGp6eGh6eXVoc25uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3Mzg0MzYsImV4cCI6MjA5NjMxNDQzNn0.9RC2YnbSnvtWN5EmyzSxuXvzpgV4a-A3YU6iwDBgKhY";
export const TABLE = "customers";

// ── Auth ──────────────────────────────────────────────────────────────
export const signUp = async (email, password) => {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "Signup failed");
  return data;
};

export const signIn = async (email, password) => {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data.error || data.error_description)
    throw new Error(data.error_description || data.error || "Login failed");
  return data;
};

export const refreshSession = async (refreshToken) => {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.access_token) return null;
    return {
      token:        data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt:    Date.now() + ((data.expires_in || 3600) * 1000),
      user:         data.user,
    };
  } catch { return null; }
};

export const signOut = async (token) => {
  try {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: "POST",
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${token}` },
    });
  } catch (_) {}
};

// ── Database ──────────────────────────────────────────────────────────
export const sb = async (path, method = "GET", body = null, token = null) => {
  const headers = {
    "apikey":        SUPABASE_KEY,
    "Authorization": `Bearer ${token || SUPABASE_KEY}`,
    "Content-Type":  "application/json",
  };
  if (method === "POST" || method === "PATCH") headers["Prefer"] = "return=representation";

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method, headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) { const e = new Error("SESSION_EXPIRED"); e.code = "SESSION_EXPIRED"; throw e; }
    throw new Error(err.message || err.hint || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
};

// ── Map form → Supabase row (ALL fields) ─────────────────────────────
// NOTE: 'id' is intentionally excluded — Supabase auto-manages primary key
export const toRow = (f) => {
  const row = {
    name:               f.name               || null,
    email:              f.email              || null,
    phone:              f.phone              || null,
    address:            f.address            || null,
    status:             f.status             || "Lead",
    project_type:       f.projectType        || null,
    property_type:      f.propertyType       || null,
    budget:             f.budget             || null,
    timeline:           f.timeline           || null,
    rooms:              f.rooms              || [],
    dim_length:         f.dimensions?.length ? parseFloat(f.dimensions.length) : null,
    dim_width:          f.dimensions?.width  ? parseFloat(f.dimensions.width)  : null,
    dim_height:         f.dimensions?.height ? parseFloat(f.dimensions.height) : null,
    style:              f.style              || null,
    palette:            f.palette            ? JSON.stringify(f.palette) : null,
    notes:              f.notes              || null,
    quotation:          f.quotation          ? parseFloat(f.quotation)          : null,
    previous_quotation: f.previousQuotation  ? parseFloat(f.previousQuotation)  : null,
    revised_quotation:  f.revisedQuotation   ? parseFloat(f.revisedQuotation)   : null,
    start_date:         f.startDate          || null,
    plywood:            f.plywood            || null,
    laminate:           f.laminate           || null,
    hardware:           f.hardware           || null,
    glass:              f.glass              || null,
    ceiling:            f.ceiling            || null,
    lights:             f.lights             || null,
    handles:            f.handles            || null,
    room_materials:     f.roomMaterials && Object.keys(f.roomMaterials).length > 0
                          ? JSON.stringify(f.roomMaterials)
                          : null,
    floor_plan_url:     f.floorPlanUrl  || null,
    floor_plan_data:    f.floorPlanData ? JSON.stringify(f.floorPlanData) : null,
    client_signatures:  f.clientSignatures
                          ? JSON.stringify(f.clientSignatures)
                          : null,
    audit_log:          f.auditLog && f.auditLog.length > 0
                          ? JSON.stringify(f.auditLog.map(e=>({
                              ...e,
                              signatures: e.signatures
                                ? { client: !!e.signatures.client, hri: !!e.signatures.hri }
                                : undefined
                            })))
                          : null,
    inventory:          f.inventory && Object.keys(f.inventory).length > 0 ? JSON.stringify(f.inventory) : null,
    referral_code:      f.referralCode       || null,
    client_access_code: f.clientAccessCode   || null,
    room_work:          f.roomWork && Object.keys(f.roomWork).length ? JSON.stringify(f.roomWork) : null,
    project_plan:       f.projectPlan && Object.keys(f.projectPlan).length ? JSON.stringify(f.projectPlan) : null,
    quotation_includes_addon: f.quotationIncludesAddOn !== undefined ? f.quotationIncludesAddOn : true,
    payment_tracking:   f.paymentTracking && Object.keys(f.paymentTracking).length ? JSON.stringify(f.paymentTracking) : null,
  applied_referral:   f.appliedReferralCode|| null,
  referral_discount:  f.referralDiscount   || false,
  labour_pct:         f.labourPct          != null ? Number(f.labourPct) : 50,
  rebate_type:        f.rebateType         || null,
  rebate_value:       f.rebateValue        ? parseFloat(f.rebateValue) : null,

  room_details:       f.roomDetails && Object.keys(f.roomDetails).length > 0
                        ? JSON.stringify(
                            // Save all fields including photos and subsections
                            Object.fromEntries(
                              Object.entries(f.roomDetails).map(([k,v]) => [k, {
                                length:     v.length,
                                width:      v.width,
                                height:     v.height,
                                notes:      v.notes,
                                photos:     v.photos   || [],
                                subsections:v.subsections || {},
                              }])
                            )
                          )
                        : null,
    email_log:          f.emailLog && f.emailLog.length > 0
                          ? JSON.stringify(f.emailLog)
                          : null,
    service_costs:      f.serviceCosts && Object.keys(f.serviceCosts).length > 0
                          ? JSON.stringify(f.serviceCosts)
                          : null,
    margin_vendors:     f.marginVendors && Object.keys(f.marginVendors).length > 0
                          ? JSON.stringify(f.marginVendors)
                          : null,
    margin_actual:      f.marginActual && Object.keys(f.marginActual).length > 0
                          ? JSON.stringify(f.marginActual)
                          : null,
    custom_room_products: f.customRoomProducts && Object.keys(f.customRoomProducts).length > 0
                          ? JSON.stringify(f.customRoomProducts)
                          : null,
  };
  return row;
};

// ── Map Supabase row → form (ALL fields) ─────────────────────────────
export const fromRow = (r) => {
  const form = {
    id:                 r.id != null ? r.id : null,
    name:               r.name               || "",
    email:              r.email              || "",
    phone:              r.phone              || "",
    address:            r.address            || "",
    status:             r.status             || "Lead",
    projectType:        r.project_type       || "Residential",
    propertyType:       r.property_type      || "3 BHK",
    budget:             r.budget             || "",
    timeline:           r.timeline           || "",
    startDate:          r.start_date         || "",
    rooms:              Array.isArray(r.rooms) ? r.rooms : (r.rooms ? JSON.parse(r.rooms) : []),
    dimensions: {
      length:           r.dim_length  != null ? String(r.dim_length)  : "",
      width:            r.dim_width   != null ? String(r.dim_width)   : "",
      height:           r.dim_height  != null ? String(r.dim_height)  : "",
    },
    style:              r.style              || "",
    notes:              r.notes              || "",
    quotation:          r.quotation          != null ? String(r.quotation)          : "",
    previousQuotation:  r.previous_quotation != null ? String(r.previous_quotation) : "",
    revisedQuotation:   r.revised_quotation  != null ? String(r.revised_quotation)  : "",
    plywood:            r.plywood            || "",
    laminate:           r.laminate           || "",
    hardware:           r.hardware           || "",
    glass:              r.glass              || "",
    ceiling:            r.ceiling            || "",
    lights:             r.lights             || "",
    handles:            r.handles            || "",
    labourPct:          r.labour_pct         != null ? Number(r.labour_pct) : 50,
    rebateType:         r.rebate_type        || "amount",
    rebateValue:        r.rebate_value       != null ? String(r.rebate_value) : "",
    couponApplied:      r.coupon_applied     || false,
    referralCode:       r.referral_code      || "",
    clientAccessCode:   r.client_access_code  || "",
    roomWork:           r.room_work ? (typeof r.room_work==="string"?JSON.parse(r.room_work):r.room_work) : {},
    projectPlan:        r.project_plan ? (typeof r.project_plan==="string"?JSON.parse(r.project_plan):r.project_plan) : {},
    quotationIncludesAddOn: r.quotation_includes_addon !== undefined ? r.quotation_includes_addon : true,
    paymentTracking:    r.payment_tracking ? (typeof r.payment_tracking==="string"?JSON.parse(r.payment_tracking):r.payment_tracking) : {},
    appliedReferralCode:r.applied_referral   || "",
    referralDiscount:   r.referral_discount  || false,
    roomMaterials:      r.room_materials
                          ? (typeof r.room_materials === "string" ? JSON.parse(r.room_materials) : r.room_materials)
                          : {},
    roomDetails:        r.room_details
                          ? (typeof r.room_details   === "string" ? JSON.parse(r.room_details)   : r.room_details)
                          : {},
    inventory:          r.inventory
                          ? (typeof r.inventory      === "string" ? JSON.parse(r.inventory)      : r.inventory)
                          : {},
    floorPlanUrl:       r.floor_plan_url  || "",
    floorPlanData:      r.floor_plan_data
                          ? (typeof r.floor_plan_data==="string" ? JSON.parse(r.floor_plan_data) : r.floor_plan_data)
                          : null,
    clientSignatures:   r.client_signatures
                          ? (typeof r.client_signatures==="string" ? JSON.parse(r.client_signatures) : r.client_signatures)
                          : null,
    auditLog:           r.audit_log
                          ? (typeof r.audit_log      === "string" ? JSON.parse(r.audit_log)      : r.audit_log)
                          : [],
    emailLog:           r.email_log
                          ? (typeof r.email_log      === "string" ? JSON.parse(r.email_log)      : r.email_log)
                          : [],
    serviceCosts:       r.service_costs
                          ? (typeof r.service_costs  === "string" ? JSON.parse(r.service_costs)  : r.service_costs)
                          : {},
    marginVendors:      r.margin_vendors
                          ? (typeof r.margin_vendors === "string" ? JSON.parse(r.margin_vendors) : r.margin_vendors)
                          : {},
    marginActual:       r.margin_actual
                          ? (typeof r.margin_actual  === "string" ? JSON.parse(r.margin_actual)  : r.margin_actual)
                          : {},
    customRoomProducts: r.custom_room_products
                          ? (typeof r.custom_room_products === "string" ? JSON.parse(r.custom_room_products) : r.custom_room_products)
                          : {},
  };
  return form;
}
