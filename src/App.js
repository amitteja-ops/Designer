import React, { useState, useEffect, useCallback } from "react";
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
  hardware: {
    channels: [
      { name:"Hettich KA5632 250mm Black Coated Telescopic Channel", price:378,  unit:"set" },
      { name:"Hettich KA5632 250mm Zinc Coated Telescopic Channel",  price:378,  unit:"set" },
      { name:"Hettich KA5632 300mm Zinc Coated Telescopic Channel",  price:396,  unit:"set" },
      { name:"Hettich KA5632 300mm Black Coated Telescopic Channel", price:415,  unit:"set" },
      { name:"Hettich KA5632 350mm Zinc Coated Telescopic Channel",  price:416,  unit:"set" },
      { name:"Hettich KA5632 400mm Zinc Coated Telescopic Channel",  price:435,  unit:"set" },
      { name:"Hettich KA5632 350mm Black Coated Telescopic Channel", price:439,  unit:"set" },
      { name:"Hettich KA5632 450mm Zinc Coated Telescopic Channel",  price:453,  unit:"set" },
      { name:"Hettich KA5632 400mm Black Coated Telescopic Channel", price:459,  unit:"set" },
      { name:"Hettich KA5632 500mm Zinc Coated Telescopic Channel",  price:473,  unit:"set" },
      { name:"Hettich KA5632 450mm Black Coated Telescopic Channel", price:479,  unit:"set" },
      { name:"Hettich KA5632 500mm Black Coated Telescopic Channel", price:499,  unit:"set" },
      { name:"Hettich KA5632 550mm Zinc Coated Telescopic Channel",  price:568,  unit:"set" },
      { name:"Hettich KA5632 550mm Black Coated Telescopic Channel", price:568,  unit:"set" },
      { name:"Hettich KA5632 600mm Zinc Coated Telescopic Channel",  price:662,  unit:"set" },
      { name:"Hettich KA5632 600mm Black Coated Telescopic Channel", price:699,  unit:"set" },
      { name:"Hettich KA5632 650mm Zinc Coated Telescopic Channel",  price:757,  unit:"set" },
      { name:"Hettich KA5632 650mm Black Coated Telescopic Channel", price:799,  unit:"set" },
      { name:"Hettich 24 inch Steel Zinc Wardrobe Telescopic Channel",price:848, unit:"set" },
      { name:"Hettich KA5632 700mm Zinc Coated Telescopic Channel",  price:852,  unit:"set" },
      { name:"Hettich KA5632 700mm Black Coated Telescopic Channel", price:899,  unit:"set" },
      { name:"Hettich KA5740 300mm Drawer Runner",                   price:1009, unit:"set" },
      { name:"Hettich KA4532 300mm Zinc Push to Open Runner",        price:1022, unit:"set" },
      { name:"Hettich KA4532 300mm Silent System Runner",            price:1022, unit:"set" },
      { name:"Hettich KA4632 300mm Black Coated Silent System Runner",price:1022,unit:"set" },
      { name:"Hettich KA4532 350mm Zinc Push to Open Runner",        price:1058, unit:"set" },
      { name:"Hettich KA4532 350mm Silent System Runner",            price:1058, unit:"set" },
      { name:"Hettich KA4632 350mm Black Coated Silent System Runner",price:1058,unit:"set" },
      { name:"Hettich KA4632 400mm Black Coated Silent System Runner",price:1095,unit:"set" },
      { name:"Hettich KA4532 400mm Zinc Push to Open Runner",        price:1095, unit:"set" },
      { name:"Hettich KA4532 400mm Silent System Runner",            price:1095, unit:"set" },
      { name:"Hettich KA4532 450mm Zinc Push to Open Runner",        price:1113, unit:"set" },
      { name:"Hettich KA4532 450mm Silent System Runner",            price:1113, unit:"set" },
      { name:"Hettich KA4632 450mm Black Coated Silent System Runner",price:1113,unit:"set" },
      { name:"Hettich KA4632 500mm Black Coated Silent System Runner",price:1132,unit:"set" },
      { name:"Hettich KA4532 500mm Zinc Push to Open Runner",        price:1132, unit:"set" },
      { name:"Hettich KA4532 500mm Silent System Runner",            price:1132, unit:"set" },
      { name:"Hettich KA5740 400mm Drawer Runner",                   price:1145, unit:"set" },
      { name:"Hettich KA4532 550mm Zinc Push to Open Runner",        price:1189, unit:"set" },
      { name:"Hettich KA4532 550mm Silent System Runner",            price:1189, unit:"set" },
      { name:"Hettich KA4632 550mm Black Coated Silent System Runner",price:1189,unit:"set" },
      { name:"Hettich KA5740 350mm Drawer Runner",                   price:1214, unit:"set" },
      { name:"Hettich 20 inch Steel Chrome Ball Bearing Channel",    price:1252, unit:"set" },
      { name:"Hettich 20 inch Wardrobe Channel",                     price:1253, unit:"set" },
      { name:"Hettich KA4532 600mm Zinc Push to Open Runner",        price:1281, unit:"set" },
      { name:"Hettich KA4532 600mm Silent System Runner",            price:1281, unit:"set" },
      { name:"Hettich KA5740 450mm Drawer Runner",                   price:1335, unit:"set" },
      { name:"Hettich KA4532 650mm Zinc Push to Open Runner",        price:1374, unit:"set" },
      { name:"Hettich KA4532 650mm Silent System Runner",            price:1374, unit:"set" },
      { name:"Hettich KA5740 500mm Drawer Runner",                   price:1400, unit:"set" },
      { name:"Hettich KA5740 650mm Drawer Runner",                   price:1436, unit:"set" },
      { name:"Hettich KA5740 550mm Drawer Runner",                   price:1455, unit:"set" },
      { name:"Hettich KA4532 700mm Silent System Runner",            price:1467, unit:"set" },
      { name:"Hettich KA4532 700mm Zinc Push to Open Runner",        price:1467, unit:"set" },
      { name:"Hettich KA5740 600mm Drawer Runner",                   price:1520, unit:"set" },
      { name:"Hettich KA4620 400mm Drawer Runner",                   price:1545, unit:"set" },
      { name:"Hettich KA4620 450mm Drawer Runner",                   price:1545, unit:"set" },
      { name:"Hettich KA5740 700mm Drawer Runner",                   price:1645, unit:"set" },
      { name:"Hettich KA4620 500mm Drawer Runner",                   price:1718, unit:"set" },
      { name:"Hettich KA4620 550mm Drawer Runner",                   price:1737, unit:"set" },
      { name:"Hettich KA4620 600mm Drawer Runner",                   price:1888, unit:"set" },
      { name:"Hettich KA4620 650mm Drawer Runner",                   price:2371, unit:"set" },
      { name:"Hettich KA4620 700mm Drawer Runner",                   price:2567, unit:"set" },
    ],
    hinges: [
      { name:"Hettich Cover Cap for Sensys Hinge Arm",               price:16,   unit:"piece" },
      { name:"Hettich Cover Cap for Sensys Hinge Cup",               price:25,   unit:"piece" },
      { name:"Hettich 200mm Aluminium Folding Door Hinge",           price:37,   unit:"piece" },
      { name:"Hettich 14-25mm Auto Closing Concealed Hinge (Eco)",   price:89,   unit:"set" },
      { name:"Hettich Black Cross Mounting Plate Eccentric Cam",      price:89,   unit:"piece" },
      { name:"Hettich 14-25mm Auto Closing Concealed Hinge (Std)",   price:94,   unit:"set" },
      { name:"Hettich 14-25mm Auto Closing Concealed Hinge",         price:98,   unit:"set" },
      { name:"Hettich Linear Mounting Plate for Sensys Hinge",       price:121,  unit:"piece" },
      { name:"Hettich D7-GP9 Black Magnetic Catch",                  price:155,  unit:"piece" },
      { name:"Hettich 15-25mm Intermat 9943 Hinge Set",              price:286,  unit:"set" },
      { name:"Hettich 14-32mm Intermat 9936 Hinge Set",              price:288,  unit:"set" },
      { name:"Hettich 15-25mm Intermat 9943 Hinge Set (Mid)",        price:316,  unit:"set" },
      { name:"Hettich 14-32mm Intermat 9936 Hinge Set (Mid)",        price:320,  unit:"set" },
      { name:"Hettich 15-25mm Intermat 9943 Hinge Set (Premium)",    price:324,  unit:"set" },
      { name:"Hettich 14-32mm Intermat 9936 Hinge Set (Eco)",        price:352,  unit:"set" },
      { name:"Hettich 14-25mm Onsys 4447i Hinge Set (Eco)",          price:356,  unit:"set" },
      { name:"Hettich 15-24mm Obsidian Black Sensys 8645i (Lite)",   price:364,  unit:"piece" },
      { name:"Hettich 15-32mm Obsidian Black Sensys 8631i (Std)",    price:388,  unit:"piece" },
      { name:"Hettich 14-25mm Onsys 4447i Hinge Set",                price:388,  unit:"set" },
      { name:"Hettich 15-24mm Obsidian Black Sensys 8645i",          price:389,  unit:"piece" },
      { name:"Hettich 14-25mm Onsys 4447i Hinge Set (Premium)",      price:393,  unit:"set" },
      { name:"Hettich KA5740 Accessory Kit",                         price:394,  unit:"set" },
      { name:"Hettich 15-32mm Obsidian Black Sensys 8631i",          price:407,  unit:"piece" },
      { name:"Hettich 15-24mm Obsidian Black Sensys 8645i (Soft)",   price:413,  unit:"piece" },
      { name:"Hettich P20 Universal Maxi Push to Open",              price:437,  unit:"piece" },
      { name:"Hettich 15-32mm Obsidian Black Sensys 8631i (Heavy)",  price:441,  unit:"piece" },
      { name:"Hettich 19mm Aluminium Profile Intermat 9936 Hinge",   price:484,  unit:"set" },
      { name:"Hettich 10-16mm Obsidian Black Sensys 8646i",          price:534,  unit:"piece" },
      { name:"Hettich 24mm Steel Silver Sensys 8645i Pair",          price:551,  unit:"set" },
      { name:"Hettich 10-16mm Obsidian Black Sensys 8646i (Ultra)",  price:558,  unit:"piece" },
      { name:"Hettich 10-16mm Obsidian Black Sensys 8646i (Heavy)",  price:582,  unit:"piece" },
      { name:"Hettich Push to Open Pin Strong",                      price:598,  unit:"piece" },
      { name:"Hettich 15-32mm Sensys 8654i Hinge Set (Std)",         price:630,  unit:"set" },
      { name:"Hettich 15-32mm Sensys 8654i Hinge Set",               price:672,  unit:"set" },
      { name:"Hettich 15-32mm Sensys 8654i Hinge Set (Premium)",     price:711,  unit:"set" },
      { name:"Hettich 16-21mm Sensys Hinge Set",                     price:832,  unit:"set" },
      { name:"Hettich 19mm Aluminium Sensys 8638i W90 Hinge",        price:873,  unit:"set" },
      { name:"Hettich 16-43mm Intermat 9935 Hinge Set",              price:889,  unit:"set" },
      { name:"Hettich 16-24mm Intermat 9956 Hinge Set",              price:889,  unit:"set" },
      { name:"Hettich 16-43mm Intermat 9935 Hinge Set (Premium)",    price:938,  unit:"set" },
      { name:"Hettich 15-32mm Obsidian Black Sensys 8657i",          price:955,  unit:"piece" },
      { name:"Hettich 5x3x3 SS Ball Bearing Hinge Set",              price:969,  unit:"set" },
      { name:"Hettich 16-43mm Intermat 9935 Hinge Set (Heavy)",      price:985,  unit:"set" },
      { name:"Hettich 65mm SS Cylindrical Door Knob Set",            price:1019, unit:"set" },
      { name:"Hettich 90 deg Sensys 8639i W90 Hinge Set",            price:1276, unit:"set" },
      { name:"Hettich 15-32mm Sensys Wide Angle Hinge Set",          price:1313, unit:"set" },
      { name:"Hettich 105 deg Glass Door Hinge Set",                 price:1370, unit:"set" },
      { name:"Hettich HTS FS-463 Floor Spring",                      price:4779, unit:"piece" },
    ],
  },
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

// Room subsections from Excel quotation — Product & Type columns
const ROOM_SUBSECTIONS = {
  "Entrance": [
    { name:"Shoe Rack",              type:"Box" },
    { name:"Entrance Frame",         type:"Frame" },
  ],
  "Living Area": [
    { name:"TV Unit Bottom Box",     type:"Box" },
    { name:"TV Unit Side Louvers",   type:"Louvers" },
    { name:"TV Unit Back Panel",     type:"Panel" },
    { name:"TV Unit Wall Partition", type:"Partition PVD" },
    { name:"Living Room Wall Design",type:"POP Design" },
    { name:"Living Ceiling",         type:"Ceiling" },
  ],
  "Dining": [
    { name:"Crockery Top Box",       type:"Open Box" },
    { name:"Crockery Top Box Glass", type:"Profile Door" },
    { name:"Crockery Granite Tabletop", type:"Granite" },
    { name:"Crockery Bottom Box",    type:"Box" },
    { name:"Crockery Top Loft",      type:"Frame" },
    { name:"Diamond Mirror Backslash", type:"Diamond Mirror" },
    { name:"Crockery Mirror",        type:"Glass" },
    { name:"Dining Ceiling",         type:"Ceiling" },
    { name:"Balcony PVC Ceiling",    type:"PVC Ceiling" },
  ],
  "Master Bedroom": [
    { name:"Wardrobe Box",           type:"Box" },
    { name:"Wardrobe Loft",          type:"Box" },
    { name:"Bed",                    type:"Bed" },
    { name:"Bed Back Panel",         type:"Panel" },
    { name:"TV Unit",                type:"Box" },
    { name:"Dressing Mirror",        type:"Profile Door" },
    { name:"Ceiling",                type:"Ceiling" },
  ],
  "Children Bedroom": [
    { name:"Wardrobe",               type:"Box" },
    { name:"Wardrobe Loft",          type:"Frame" },
    { name:"Study Table",            type:"Frame" },
    { name:"Bed",                    type:"Bed" },
    { name:"Office Cabinet",         type:"Box" },
    { name:"Mirror",                 type:"Mirror" },
    { name:"Ceiling",                type:"Ceiling" },
  ],
  "Guest Bedroom": [
    { name:"Wardrobe",               type:"Box" },
    { name:"Wardrobe Loft",          type:"Box" },
    { name:"Used Clothes Pullout",   type:"Box" },
    { name:"Study Table",            type:"Table" },
    { name:"Ceiling",                type:"Ceiling" },
  ],
  "Pooja": [
    { name:"Pooja Box",              type:"Box" },
    { name:"Pooja Door",             type:"Pooja Profile Door" },
    { name:"Pooja Tiles",            type:"Tiles" },
    { name:"Pooja Drawers",          type:"Drawer" },
  ],
  "Kitchen": [
    { name:"Counter Below",          type:"Box" },
    { name:"Granite Countertop",     type:"Granite" },
    { name:"Long Unit",              type:"Box" },
    { name:"Backslash Tiles",        type:"Tiles" },
    { name:"Loft 1",                 type:"Frame" },
    { name:"Loft 1 Profile Doors",   type:"Profile Door" },
    { name:"Loft 2",                 type:"Frame" },
    { name:"Sink",                   type:"Sink" },
    { name:"Wash Area",              type:"Box" },
    { name:"Wash Area Granite",      type:"Granite" },
    { name:"Kitchen Ceiling",        type:"Ceiling" },
  ],
  "Drawing Room": [
    { name:"TV Unit Bottom Box",     type:"Box" },
    { name:"TV Unit Side Louvers",   type:"Louvers" },
    { name:"TV Unit Back Panel",     type:"Panel" },
    { name:"TV Unit Ceiling Panel",  type:"Panel" },
    { name:"TV Unit Glass Profile",  type:"Profile Door" },
    { name:"TV Unit Long Unit",      type:"Box" },
    { name:"Magnetic Track",         type:"Magnetic Track" },
    { name:"Ceiling",                type:"Ceiling" },
  ],
  "Balcony": [
    { name:"PVC Ceiling",            type:"PVC Ceiling" },
  ],
  "Bathroom": [
    { name:"Bathroom Mirror",        type:"Mirror" },
    { name:"Bathroom Partition",     type:"Partition Glass" },
    { name:"Accessories",            type:"Accessories" },
    { name:"Lighting & Exhaust Fan", type:"Lights" },
  ],
  "Study Room": [
    { name:"Wardrobe",               type:"Box" },
    { name:"Wardrobe Loft",          type:"Frame" },
    { name:"Study Table",            type:"Table" },
    { name:"Dressing Mirror",        type:"Glass" },
    { name:"Ceiling",                type:"Ceiling" },
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

// Helper — always returns flat array for any material type including hardware
const getCatalog = (matType) => matType==="hardware"
  ? [...(MATERIAL_CATALOG.hardware.channels||[]),...(MATERIAL_CATALOG.hardware.hinges||[])]
  : (MATERIAL_CATALOG[matType]||[]);

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
  rebateType:"amount", rebateValue:"", labourPct:50,
  auditLog:[],              // [{ts, type, user, summary, snapshot, signatures}]
  inventory:{},             // per-material status: { key: {status, orderedDate, deliveredDate, notes} }
  referralCode:"",         // this client's own permanent referral code
  appliedReferralCode:"",  // referral code from another customer applied to this project
  referralDiscount:false,  // whether the applied code gives 5% discount
};

const SUPABASE_URL = "https://utctflrqhjzxhzyuhsnn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0Y3RmbHJxaGp6eGh6eXVoc25uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3Mzg0MzYsImV4cCI6MjA5NjMxNDQzNn0.9RC2YnbSnvtWN5EmyzSxuXvzpgV4a-A3YU6iwDBgKhY";
const fmt = (v) => v ? `₹${Number(v).toLocaleString("en-IN")}` : "";

// ── Audit log helpers ─────────────────────────────────────────────────
const AUDIT_ICONS = {
  created:    "🆕", updated:   "✏️",  status:    "🔄",
  report:     "📄", signed:    "✍️",  invoice:   "🧾",
  quotation:  "💰", materials: "🔧",  inventory: "📦",
  internal:   "🔧", note:      "📝",
};

const makeEntry = (type, summary, snapshot={}, user="", signatures={}) => ({
  ts:         new Date().toISOString(),
  type,
  user,
  summary,
  snapshot,   // key values at this point in time
  signatures, // { client: dataUrl, hri: dataUrl } if signed
});


// ── Save a single audit entry to DB immediately (fire and forget) ────
const saveAuditEntry = async (clientId, existingLog, entry) => {
  try {
    const tok = JSON.parse(localStorage.getItem("crm_session")||"{}").token;
    if (!tok || !clientId) return;
    const updatedLog = [...(existingLog||[]), entry];
    await fetch(`https://utctflrqhjzxhzyuhsnn.supabase.co/rest/v1/customers?id=eq.${clientId}`, {
      method:"PATCH",
      headers:{
        "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0Y3RmbHJxaGp6eGh6eXVoc25uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3Mzg0MzYsImV4cCI6MjA5NjMxNDQzNn0.9RC2YnbSnvtWN5EmyzSxuXvzpgV4a-A3YU6iwDBgKhY",
        "Authorization": `Bearer ${tok}`,
        "Content-Type":"application/json",
        "Prefer":"return=minimal"
      },
      body: JSON.stringify({ audit_log: JSON.stringify(updatedLog) })
    });
    return updatedLog;
  } catch(e) { console.warn("Audit save failed:", e); return existingLog; }
};

// Diff two form states — return human-readable list of ALL changes
const diffForm = (oldF, newF) => {
  const LABELS = {
    name:"Name", phone:"Phone", email:"Email", address:"Address",
    status:"Status", projectType:"Project Type", budget:"Budget",
    timeline:"Duration", startDate:"Start Date", style:"Style",
    quotation:"Final Quotation", previousQuotation:"Previous Quotation",
    revisedQuotation:"Revised Quotation", labourPct:"Labour %",
    rebateType:"Rebate Type", rebateValue:"Rebate Value",
    couponCode:"Coupon Code", appliedReferralCode:"Referral Code Applied",
    notes:"Notes", plywood:"Plywood", laminate:"Laminate",
    hardware:"Hardware", glass:"Glass", ceiling:"Ceiling",
    lights:"Lights", handles:"Handles",
  };
  const changes = [];

  // Simple field changes
  Object.keys(LABELS).forEach(k => {
    const ov = String(oldF[k]||""), nv = String(newF[k]||"");
    if (ov !== nv) {
      if (k==="notes") changes.push("Notes updated");
      else changes.push(`${LABELS[k]}: "${ov||"—"}" → "${nv||"—"}"`);
    }
  });

  // Rooms
  const oldR = JSON.stringify((oldF.rooms||[]).sort());
  const newR = JSON.stringify((newF.rooms||[]).sort());
  if (oldR !== newR) {
    const added   = (newF.rooms||[]).filter(r=>!(oldF.rooms||[]).includes(r));
    const removed = (oldF.rooms||[]).filter(r=>!(newF.rooms||[]).includes(r));
    if (added.length)   changes.push(`Rooms added: ${added.join(", ")}`);
    if (removed.length) changes.push(`Rooms removed: ${removed.join(", ")}`);
  }

  // Room dimensions
  const oldRD = JSON.stringify(oldF.roomDetails||{});
  const newRD = JSON.stringify(newF.roomDetails||{});
  if (oldRD !== newRD) {
    Object.keys(newF.roomDetails||{}).forEach(room => {
      const o = oldF.roomDetails?.[room]||{};
      const n = newF.roomDetails?.[room]||{};
      if (o.length!==n.length||o.width!==n.width||o.height!==n.height)
        changes.push(`${room} dimensions updated (${n.length||"?"}×${n.width||"?"}×${n.height||"?"}ft)`);
    });
  }

  // Materials
  const oldRM = JSON.stringify(oldF.roomMaterials||{});
  const newRM = JSON.stringify(newF.roomMaterials||{});
  if (oldRM !== newRM) {
    Object.keys(newF.roomMaterials||{}).forEach(room => {
      const o = oldF.roomMaterials?.[room]||{};
      const n = newF.roomMaterials?.[room]||{};
      Object.keys(n).forEach(matType => {
        const ov = o[matType], nv = n[matType];
        if (JSON.stringify(ov)!==JSON.stringify(nv)) {
          if (!ov?.name && nv?.name) changes.push(`${room} — ${MATERIAL_LABELS[matType]||matType}: added ${nv.name}`);
          else if (ov?.name!==nv?.name) changes.push(`${room} — ${MATERIAL_LABELS[matType]||matType}: ${ov?.name||"—"} → ${nv?.name||"—"}`);
          else if (ov?.qty!==nv?.qty) changes.push(`${room} — ${MATERIAL_LABELS[matType]||matType} qty: ${ov?.qty||"0"} → ${nv?.qty||"0"}`);
        }
      });
    });
  }

  return changes;
};

// Generate permanent referral code: HRI + 2 deterministic letters from ID + client ID
// Deterministic — same ID always produces same code, no Math.random()
const genReferralCode = (id) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const n = parseInt(String(id).replace(/[^0-9]/g,"").slice(-8)||"0");
  const r1 = chars[n % chars.length];
  const r2 = chars[Math.floor(n / chars.length) % chars.length];
  return `HRI${r1}${r2}${String(id).slice(-6)}`;
};

// ── Design System ─────────────────────────────────────────────────────
// Signature: architectural grid with ink-on-linen palette.
// A premium studio tool — precise, confident, not decorative.
// Typeface pairing: DM Sans (utility) + DM Serif Display (brand moments)
// Accent: deep teal #1A5276 — rare, deliberate, never decorative red.

const C = {
  ink:    "#0F1923",   // near-black
  teal:   "#1A5276",   // signature accent
  tealL:  "#C5DCF0",   // teal tint — darkened for visibility
  sand:   "#F5F1EA",   // linen background
  white:  "#FFFFFF",
  line:   "#C8C2BA",   // darker hairline for visibility
  muted:  "#5A564F",   // darkened — was too light
  smoke:  "#ECEAE4",   // card background
  green:  "#145235",   // darker green for contrast
  amber:  "#7A500A",   // darker amber
  violet: "#4A2E78",   // darker violet
  rust:   "#7A2208",   // darker rust
};

const S = {
  app:   { minHeight:"100vh", background:C.sand,
           fontFamily:"'DM Sans','Inter',system-ui,sans-serif", color:C.ink },
  hdr:   { background:C.ink, padding:"0 36px", height:64,
           display:"flex", alignItems:"center", justifyContent:"space-between",
           borderBottom:`3px solid ${C.teal}` },
  logo:  { color:"#fff", fontSize:16, fontWeight:700, letterSpacing:4,
           textTransform:"uppercase", fontFamily:"'DM Sans',sans-serif" },
  sub:   { color:C.teal, fontSize:9, letterSpacing:6, marginTop:2, display:"block", textTransform:"uppercase" },
  main:  { maxWidth:1140, margin:"0 auto", padding:"28px 24px" },
  card:  { background:C.white, borderRadius:4, padding:"20px 24px",
           boxShadow:"0 1px 4px rgba(15,25,35,0.08)", border:`1px solid ${C.line}` },
  input: { width:"100%", padding:"10px 14px", borderRadius:3,
           border:`1.5px solid ${C.line}`, fontFamily:"inherit", fontSize:14,
           color:C.ink, background:C.white, outline:"none", boxSizing:"border-box",
           transition:"border-color 0.15s" },
  label: { fontSize:10, letterSpacing:2, color:C.muted, textTransform:"uppercase",
           marginBottom:5, display:"block", fontWeight:600 },
  row:   { display:"flex", gap:16, marginBottom:18, flexWrap:"wrap" },
  sec:   { fontSize:10, fontWeight:700, letterSpacing:3, color:C.teal,
           textTransform:"uppercase", borderBottom:`2px solid ${C.teal}`,
           paddingBottom:6, marginBottom:16, marginTop:4 },
  btn:   (v="primary") => ({
    padding:"9px 20px", borderRadius:3, border:"none", cursor:"pointer",
    fontFamily:"inherit", fontSize:11, letterSpacing:2, textTransform:"uppercase",
    fontWeight:700, transition:"all 0.15s",
    ...(v==="primary" ? { background:C.teal, color:"#fff" }
      : v==="dark"    ? { background:"rgba(255,255,255,0.1)", color:"#fff",
                          border:"1px solid rgba(255,255,255,0.25)" }
      : v==="ghost"   ? { background:"transparent", color:C.teal,
                          border:`1.5px solid ${C.teal}` }
      : v==="danger"  ? { background:C.rust, color:"#fff" }
      :                 { background:C.smoke, color:C.ink,
                          border:`1px solid ${C.line}` })
  }),
  tab:   (a) => ({
    padding:"8px 16px", borderRadius:3, cursor:"pointer", fontSize:10,
    letterSpacing:2, textTransform:"uppercase", fontWeight:700, border:"none",
    fontFamily:"inherit", transition:"all 0.15s",
    background: a ? C.teal     : C.smoke,
    color:       a ? "#fff"     : C.ink,
    borderBottom: a ? `2px solid ${C.teal}` : "2px solid transparent",
  }),
  pill:  (a) => ({
    padding:"5px 14px", borderRadius:2, fontSize:11, cursor:"pointer",
    border:`1.5px solid ${a ? C.teal : C.line}`,
    background: a ? C.teal   : "transparent",
    color:       a ? "#fff"   : C.muted,
    fontFamily:"inherit", fontWeight: a ? 700 : 400,
    transition:"all 0.12s",
  }),
  badge: (status) => {
    const m = {
      Lead:         { bg:"#FDE68A", c:"#5C3A00" },
      Active:       { bg:"#6EE7B7", c:"#064E3B" },
      "In Progress":{ bg:"#C4B5FD", c:"#2D1B69" },
      Completed:    { bg:"#6EE7B7", c:"#064E3B" },
      "On Hold":    { bg:"#FCA5A5", c:"#5C0A0A" },
    };
    const s = m[status]||m.Lead;
    return { background:s.bg, color:s.c, padding:"3px 10px", borderRadius:2,
             fontSize:10, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase" };
  },
};

// ── Signature Pad Component ──────────────────────────────────────────
function SignaturePad({ onSave, onClose, label }) {
  const canvasRef = React.useRef(null);
  const [drawing, setDrawing] = React.useState(false);
  const [hasSignature, setHasSignature] = React.useState(false);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches?.[0] || e;
    return {
      x: (touch.clientX - rect.left) * (canvas.width / rect.width),
      y: (touch.clientY - rect.top)  * (canvas.height / rect.height),
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setDrawing(true);
    setHasSignature(true);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!drawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };

  const stopDraw = (e) => { e.preventDefault(); setDrawing(false); };

  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const save = () => {
    if (!hasSignature) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    onSave(dataUrl);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,25,35,0.85)", zIndex:9999,
      display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:C.white, borderRadius:4, padding:28, width:"100%", maxWidth:540,
        boxShadow:"0 24px 60px rgba(0,0,0,0.4)" }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:3, color:C.teal,
          textTransform:"uppercase", marginBottom:6 }}>Sign Here</div>
        <div style={{ fontSize:13, color:C.muted, marginBottom:16 }}>{label}</div>

        {/* Canvas */}
        <div style={{ border:`2px solid ${C.teal}`, borderRadius:3, background:"#FAFAFA",
          marginBottom:16, cursor:"crosshair", touchAction:"none" }}>
          <canvas ref={canvasRef} width={480} height={180}
            style={{ display:"block", width:"100%", height:180 }}
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}/>
        </div>

        <div style={{ borderTop:`1px solid ${C.line}`, paddingTop:12, marginBottom:16,
          fontSize:11, color:C.muted, textAlign:"center" }}>
          Draw your signature above using your finger or stylus
        </div>

        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button style={S.btn("ghost")} onClick={clear}>Clear</button>
          <button style={S.btn("ghost")} onClick={onClose}>Cancel</button>
          <button style={{ ...S.btn(), opacity:hasSignature?1:0.4 }}
            onClick={save} disabled={!hasSignature}>
            ✓ Save Signature
          </button>
        </div>
      </div>
    </div>
  );
}

function Toast({ msg, type }) {
  const bg = { success:C.green, error:C.rust, info:C.teal, warning:C.amber }[type]||C.teal;
  return (
    <div style={{ position:"fixed", bottom:28, right:28, zIndex:9999, background:C.ink,
      color:"#fff", padding:"14px 20px", borderRadius:3, fontSize:13,
      boxShadow:"0 8px 32px rgba(15,25,35,0.25)", fontFamily:"inherit",
      maxWidth:360, lineHeight:1.5, animation:"slideIn 0.25s ease",
      borderLeft:`4px solid ${bg}`, display:"flex", alignItems:"center", gap:10 }}>
      <span style={{ width:8, height:8, borderRadius:"50%", background:bg, flexShrink:0 }}/>
      {msg}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:80, gap:16 }}>
      <div style={{ width:32, height:32, border:`2px solid ${C.line}`,
        borderTop:`2px solid ${C.teal}`, borderRadius:"50%", animation:"spin 0.7s linear infinite" }}/>
      <span style={{ fontSize:11, letterSpacing:3, color:C.muted, textTransform:"uppercase" }}>Loading</span>
    </div>
  );
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


// ── CLIENT REPORT (standalone component so hooks work) ───────────────
function ClientReport({ selected, setView, customers }) {
  const [showSigPad, setShowSigPad] = React.useState(null);
  // Load saved signatures from last audit log entry that has them
  const lastSigEntry = [...(selected.auditLog||[])].reverse().find(e=>e.type==="signed"&&(e.signatures?.clientImg||e.signatures?.hriImg));
  const [signatures, setSignatures] = React.useState({
    client: lastSigEntry?.signatures?.clientImg || null,
    hri:    lastSigEntry?.signatures?.hriImg    || null,
  });
  const d = new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"});
  const noteLines   = (selected.notes||"").split("\n").filter(l=>l.trim());
  const scopeLines  = noteLines.filter(l=>/drawing|living|bedroom|kitchen|ceiling|pooja|wardrobe|unit|partition|entrance|balcony|bathroom/i.test(l));
  const outOfScope  = noteLines.filter(l=>/out of scope|not included|excluded|accessories|appliances|curtain|mesh|invisible|ac copper|bathroom tile/i.test(l));
  const discussions = noteLines.filter(l=>!scopeLines.includes(l)&&!outOfScope.includes(l));
  const RS = {
    sTitle:{ fontSize:10,fontWeight:700,letterSpacing:3,textTransform:"uppercase",
             color:C.teal,borderBottom:`2px solid ${C.teal}`,paddingBottom:6,marginBottom:14,
             fontFamily:"'DM Sans',sans-serif" },
    row:   { display:"flex",justifyContent:"space-between",padding:"10px 0",
             borderBottom:`1px solid ${C.line}`,fontSize:13,fontFamily:"'DM Sans',sans-serif" },
    payRow:{ display:"flex",justifyContent:"space-between",alignItems:"center",
             background:C.smoke,borderRadius:3,padding:"12px 18px",marginBottom:6,
             border:`1px solid ${C.line}`,fontFamily:"'DM Sans',sans-serif" },
    bullet:{ fontSize:13,lineHeight:2,paddingLeft:16,fontFamily:"'DM Sans',sans-serif" },
    pill:  (bg,c)=>({ background:bg,color:c,padding:"3px 12px",borderRadius:2,
                      fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",
                      fontFamily:"'DM Sans',sans-serif" }),
  };
    return (
    <div style={{ background:C.white,minHeight:"100vh",
                  fontFamily:"'DM Sans','Inter',system-ui,sans-serif",
                  color:C.ink,paddingBottom:60 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap'); @media print{.np{display:none!important}}`}</style>
      <div className="np" style={{ background:C.ink,padding:"12px 36px",display:"flex",gap:12,alignItems:"center",borderBottom:`3px solid ${C.teal}` }}>
        <button onClick={()=>setView("detail")} style={S.btn("dark")}>← Back</button>
        <button onClick={()=>window.print()} style={S.btn()}>🖨 Print / Save PDF</button>
        <button onClick={()=>{
          const subject = encodeURIComponent(`High Rise Interiors — Project Report for ${selected.name}`);
          const body = encodeURIComponent(`Dear ${selected.name},

Please find your project summary report attached.

Project: ${selected.projectType} at ${selected.address||"your location"}
Quotation: ${selected.quotation?"₹"+Number(selected.quotation).toLocaleString("en-IN"):"TBD"}

Kindly review and sign.

Warm regards,
High Rise Interiors
Hyderabad`);
          window.location.href = `mailto:${selected.email||""}?subject=${subject}&body=${body}`;
        }} style={S.btn("dark")}>📧 Email Client</button>
        <span style={{ color:C.muted,fontSize:11,marginLeft:"auto" }}>
          {signatures.client&&signatures.hri?"✓ Both signed — ready to print"
            :signatures.client?"Client signed — awaiting HRI"
            :signatures.hri?"HRI signed — awaiting client"
            :"Sign below before printing"}
        </span>
      </div>
      <div style={{ background:C.ink,padding:"28px 48px",marginBottom:36,borderBottom:`3px solid ${C.teal}` }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
          <div>
            <div style={{ color:"#fff",fontSize:20,fontWeight:700,letterSpacing:4,textTransform:"uppercase",fontFamily:"'DM Sans',sans-serif" }}>High Rise Interiors</div>
            <div style={{ color:C.teal,fontSize:10,letterSpacing:5,marginTop:6,textTransform:"uppercase" }}>Project Summary Report</div>
          </div>
          <div style={{ textAlign:"right",color:C.muted,fontSize:11,letterSpacing:1 }}><div>{d}</div><div style={{ color:"#fff",fontSize:11,marginTop:4 }}>CONFIDENTIAL</div></div>
        </div>
      </div>
      <div style={{ maxWidth:820,margin:"0 auto",padding:"0 48px" }}>
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
                  <div key={r} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr", gap:8, padding:"10px 12px", background:i%2===0?"#FFFAFA":C.light, borderBottom:`1px solid ${C.line}` }}>
                    <div style={{ fontWeight:700, fontSize:13, color:C.ink }}>🏠 {r}</div>
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
                    <div style={{ fontWeight:700, fontSize:13, color:"#fff" }}>Total</div>
                    <div/><div/><div/>
                    <div style={{ fontWeight:700, fontSize:14, color:"#fff" }}>{totalArea.toFixed(0)} sq ft</div>
                  </div>
                ) : <div style={{ borderRadius:"0 0 10px 10px", border:`1px solid ${C.line}`, borderTop:"none" }}/>;
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
                          {photos.map((p,i)=><img key={i} src={p} alt={r} style={{ width:100, height:100, objectFit:"cover", borderRadius:8, border:`1.5px solid ${C.line}` }}/>)}
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

          {/* Room Photos in Client Report */}
          {(selected.rooms||[]).some(r=>(selected.roomDetails?.[r]?.photos||[]).length>0) && (
            <div style={{ marginTop:20 }}>
              <div style={{ fontSize:11, letterSpacing:2, color:C.muted, textTransform:"uppercase", marginBottom:14 }}>Room Reference Photos</div>
              {(selected.rooms||[]).map(r => {
                const photos = selected.roomDetails?.[r]?.photos||[];
                if (!photos.length) return null;
                  return (
                  <div key={r} style={{ marginBottom:20 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:C.teal, marginBottom:8 }}>🏠 {r}</div>
                    <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                      {photos.map((p,i)=>(
                        <div key={i}>
                          <img src={p} alt={`${r} ${i+1}`} style={{ width:140, height:105,
                            objectFit:"cover", borderRadius:3, border:`1px solid ${C.line}` }}/>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Room-wise Materials & Cost — show brand/qty, hide rates */}
        {selected.roomMaterials && Object.keys(selected.roomMaterials).length > 0 && (
          <div style={{ marginBottom:32 }}>
            <div style={RS.sTitle}>Material Specifications by Room</div>
            {Object.entries(selected.roomMaterials).map(([room, mats], ri) => {
              const matEntries = Object.entries(mats).filter(([,v])=>v?.name);
              if (!matEntries.length) return null;
              const lp = selected.labourPct != null ? selected.labourPct : 50;
              const roomCost = matEntries.reduce((t,[matType,sel])=>{
                const item = getCatalog(matType).find(m=>m.name===sel.name);
                return t+(item&&sel.qty?parseFloat(sel.qty)*item.price:0);
              },0);
              const roomTotal = Math.round(roomCost*(1+lp/100));
                return (
                <div key={room} style={{ marginBottom:16, border:`1px solid ${C.line}`, borderRadius:3, overflow:"hidden" }}>
                  {/* Room header */}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                    background:C.ink, padding:"10px 16px" }}>
                    <span style={{ color:"#fff", fontWeight:700, fontSize:13 }}>🏠 {room}</span>
                    {roomTotal>0 && <span style={{ color:C.teal, fontWeight:700, fontSize:13 }}>{fmt(roomTotal)}</span>}
                  </div>
                  {/* Column headers */}
                  <div style={{ display:"grid", gridTemplateColumns:"2fr 3fr 1fr",
                    padding:"6px 14px", background:"#2A3A4A",
                    fontSize:9, fontWeight:700, letterSpacing:1.5, color:"#aaa", textTransform:"uppercase" }}>
                    <span>Category</span><span>Brand / Specification</span><span>Quantity</span>
                  </div>
                  {/* Material rows — brand + qty only, no rates */}
                  {matEntries.map(([matType, sel], i) => {
                    const item = getCatalog(matType).find(m=>m.name===sel.name);
                      return (
                      <div key={matType} style={{ display:"grid", gridTemplateColumns:"2fr 3fr 1fr",
                        padding:"9px 14px", background:i%2===0?C.white:C.smoke,
                        borderTop:`1px solid ${C.line}`, alignItems:"center" }}>
                        <div style={{ fontSize:11, color:C.muted, fontWeight:700,
                          textTransform:"uppercase", letterSpacing:1 }}>{MATERIAL_LABELS[matType]}</div>
                        <div style={{ fontSize:12, fontWeight:600, color:C.ink }}>{sel.name}</div>
                        <div style={{ fontSize:12, color:C.muted }}>
                          {sel.qty} {item?.unit||""}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {/* Grand total */}
            {(() => {
              const lp = selected.labourPct != null ? selected.labourPct : 50;
              const matCost = Object.values(selected.roomMaterials).reduce((t,mats)=>
                t+Object.entries(mats).reduce((rt,[matType,sel])=>{
                  const item = getCatalog(matType).find(m=>m.name===sel.name);
                  return rt+(item&&sel.qty?parseFloat(sel.qty)*item.price:0);
                },0),0);
              const total = Math.round(matCost*(1+lp/100));
              return total>0?(
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                  background:C.teal, padding:"14px 20px", borderRadius:3, marginTop:4 }}>
                  <span style={{ color:"#fff", fontWeight:700, fontSize:14 }}>Total Estimated Project Cost</span>
                  <strong style={{ color:"#fff", fontSize:20 }}>{fmt(total)}</strong>
                </div>
              ):null;
            })()}
          </div>
        )}

                  {/* Out of Scope */}
        {outOfScope.length>0 && (
          <div style={{ marginBottom:32 }}>
            <div style={RS.sTitle}>Out of Scope</div>
            <div style={{ background:"#FEF2F2",borderRadius:3,padding:"16px 20px",border:"1px solid #FECACA" }}>
              {outOfScope.map((l,i)=><div key={i} style={{ ...RS.bullet,color:"#7A0000" }}>✗ {l}</div>)}
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
            <div style={{ background:"#DCFCE7", borderRadius:3, padding:"10px 14px", margin:"6px 0", border:"1px solid #86EFAC" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ color:"#166534", fontWeight:700 }}>
                  🎁 Rebate Applied {selected.appliedReferralCode && `(Referral: ${selected.appliedReferralCode})`}
                </span>
                <span style={{ color:"#166534", fontWeight:700 }}>
                  - {selected.rebateType==="percent" ? `${selected.rebateValue}%` : fmt(selected.rebateValue)}
                  {selected.previousQuotation && ` = - ${fmt(selected.rebateType==="percent" ? Math.round(Number(selected.previousQuotation)*Number(selected.rebateValue)/100) : Number(selected.rebateValue))}`}
                </span>
              </div>
            </div>
          )}
          {selected.referralCode && (
            <div style={{ background:"#DCFCE7", borderRadius:3, padding:"14px 18px", margin:"8px 0", border:"1px solid #86EFAC" }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#166534", letterSpacing:2, marginBottom:10, textTransform:"uppercase" }}>🎁 Your Referral Code</div>
              <div style={{ fontSize:24, fontWeight:800, letterSpacing:5, color:"#064E3B", fontFamily:"monospace", marginBottom:8 }}>{selected.referralCode}</div>
              <div style={{ fontSize:12, color:"#166534", lineHeight:1.9 }}>
                <div>• Share this code with friends & family</div>
                <div>• Referred friend gets <strong>5% off</strong> their High Rise Interiors project</div>
                <div>• You earn <strong>5% cashback</strong> credited on your next payment</div>
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
              <span style={{ color:"#fff",fontWeight:700,fontSize:16 }}>Final Quotation</span>
              {selected.appliedReferralCode && <div style={{ color:"#7ECFF0", fontSize:11, marginTop:2 }}>Referral: {selected.appliedReferralCode}</div>}
            </div>
            <strong style={{ color:"#fff",fontSize:26 }}>{fmt(selected.quotation)||selected.budget||"TBD"}</strong>
          </div>
        </div>
        {/* Discussions */}
        {discussions.length>0 && (
          <div style={{ marginBottom:32 }}>
            <div style={RS.sTitle}>Discussions & Notes</div>
            <div style={{ background:C.smoke,borderRadius:12,padding:"16px 20px",border:`1px solid ${C.line}` }}>
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
                  <div style={{ fontWeight:700,fontSize:13,color:C.teal }}>{p.day} — {p.label}</div>
                  <div style={{ fontSize:12,color:C.muted,marginTop:2 }}>{p.pct}% of total value</div>
                </div>
              </div>
              <strong style={{ fontSize:16,color:C.ink }}>{selected.quotation ? fmt(Math.round(Number(selected.quotation)*p.pct/100)) : `${p.pct}%`}</strong>
            </div>
          ))}
          <div style={{ background:C.smoke,borderRadius:10,padding:"14px 18px",border:`1px solid ${C.line}`,fontSize:13,lineHeight:2,color:"#4A2A2A",marginTop:12 }}>
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
            <div style={{ background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:3,padding:"10px 14px",marginBottom:12,color:C.rust,fontWeight:700 }}>
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
        {/* Sign-on-Screen Pad */}
        {showSigPad && (
          <SignaturePad
            label={showSigPad==="client"?`${selected.name} — Client Signature`:"High Rise Interiors — Authorised Signatory"}
            onSave={async dataUrl=>{
              const newSigs = {...signatures, [showSigPad]: dataUrl};
              setSignatures(newSigs);
              setShowSigPad(null);
              // Build audit entry with actual image data for persistence
              const sigEntry = makeEntry(
                "signed",
                `${showSigPad==="client"?selected.name:"High Rise Interiors"} signed the report`,
                { quotation: selected.quotation, status: selected.status },
                showSigPad==="client" ? selected.name : "High Rise Interiors",
                {
                  clientImg: showSigPad==="client" ? dataUrl : (signatures.client||null),
                  hriImg:    showSigPad==="hri"    ? dataUrl : (signatures.hri||null),
                  client:    showSigPad==="client" ? true : !!signatures.client,
                  hri:       showSigPad==="hri"    ? true : !!signatures.hri,
                }
              );
              const updatedLog = [...(selected.auditLog||[]), sigEntry];
              try {
                const tok = JSON.parse(localStorage.getItem("crm_session")||"{}").token;
                await fetch(`https://utctflrqhjzxhzyuhsnn.supabase.co/rest/v1/customers?id=eq.${selected.id}`, {
                  method:"PATCH",
                  headers:{
                    "apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0Y3RmbHJxaGp6eGh6eXVoc25uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3Mzg0MzYsImV4cCI6MjA5NjMxNDQzNn0.9RC2YnbSnvtWN5EmyzSxuXvzpgV4a-A3YU6iwDBgKhY",
                    "Authorization":`Bearer ${tok}`,
                    "Content-Type":"application/json",
                    "Prefer":"return=minimal"
                  },
                  body: JSON.stringify({ audit_log: JSON.stringify(updatedLog) })
                });
              } catch(e) { console.warn("Signature save failed:", e); }
            }}
            onClose={()=>setShowSigPad(null)}
          />
        )}
        {/* Signature blocks */}
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:32,marginBottom:32 }}>
          <div style={{ borderTop:`2px solid ${C.ink}`,paddingTop:12 }}>
            <div style={{ fontSize:10,color:C.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:6 }}>Client Signature</div>
            <div style={{ fontSize:14,fontWeight:700,marginBottom:12 }}>{selected.name}</div>
            {signatures.client ? (
              <div>
                <img src={signatures.client} alt="sig"
                  style={{ height:80,maxWidth:"100%",border:`1px solid ${C.line}`,borderRadius:3,background:"#FAFAFA",display:"block" }}/>
                <div style={{ fontSize:10,color:C.muted,marginTop:4 }}>{new Date().toLocaleDateString("en-IN")}</div>
                <button className="no-print" style={{ ...S.btn("ghost"),fontSize:10,padding:"4px 10px",marginTop:6 }}
                  onClick={()=>setSignatures(s=>({...s,client:null}))}>✕ Clear</button>
              </div>
            ):(
              <div>
                <div style={{ height:64,border:`1.5px dashed ${C.line}`,borderRadius:3,
                  display:"flex",alignItems:"center",justifyContent:"center",marginBottom:8,background:C.smoke }}>
                  <span style={{ fontSize:11,color:C.muted }}>Tap to sign</span>
                </div>
                <button className="no-print" style={{ ...S.btn(),fontSize:11,padding:"7px 16px" }}
                  onClick={()=>setShowSigPad("client")}>✍ Sign Here</button>
              </div>
            )}
          </div>
          <div style={{ borderTop:`2px solid ${C.teal}`,paddingTop:12 }}>
            <div style={{ fontSize:10,color:C.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:6 }}>Authorised by</div>
            <div style={{ fontSize:14,fontWeight:700,color:C.teal,marginBottom:12 }}>High Rise Interiors</div>
            {signatures.hri ? (
              <div>
                <img src={signatures.hri} alt="sig"
                  style={{ height:80,maxWidth:"100%",border:`1px solid ${C.line}`,borderRadius:3,background:"#FAFAFA",display:"block" }}/>
                <div style={{ fontSize:10,color:C.muted,marginTop:4 }}>{new Date().toLocaleDateString("en-IN")}</div>
                <button className="no-print" style={{ ...S.btn("ghost"),fontSize:10,padding:"4px 10px",marginTop:6 }}
                  onClick={()=>setSignatures(s=>({...s,hri:null}))}>✕ Clear</button>
              </div>
            ):(
              <div>
                <div style={{ height:64,border:`1.5px dashed ${C.line}`,borderRadius:3,
                  display:"flex",alignItems:"center",justifyContent:"center",marginBottom:8,background:C.smoke }}>
                  <span style={{ fontSize:11,color:C.muted }}>Tap to sign</span>
                </div>
                <button className="no-print" style={{ ...S.btn("ghost"),fontSize:11,padding:"7px 16px" }}
                  onClick={()=>setShowSigPad("hri")}>✍ Sign Here</button>
              </div>
            )}
          </div>
        </div>
        {/* Footer */}
        <div style={{ borderTop:`2px solid ${C.line}`,paddingTop:16,marginTop:24 }}>
          <div style={{ display:"flex",justifyContent:"space-between",fontSize:12,color:C.muted,marginBottom:6 }}>
            <span>High Rise Interiors — Powered by Genovatech IT Services Pvt. Ltd.</span>
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
    try {
      const stored = localStorage.getItem("crm_session");
      if (stored) {
        const s = JSON.parse(stored);
        if (s?.token) return s.token;
      }
      return token || null;
    } catch { return token || null; }
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
      const tok = getToken();
      if (!tok) throw new Error("No session token — please log in again");
      const rows = await safeCall(t => sb(`${TABLE}?select=*&order=created_at.desc`, "GET", null, t));
      setCustomers((rows||[]).map(fromRow));
      setConnected(true);
    } catch(e) {
      setConnected(false);
      const msg = e.message || "Unknown error";
      showToast(`Load error: ${msg}`, "error");
      console.error("fetchCustomers error:", e);
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
      auditLog:            c.auditLog            || [],
      inventory:           c.inventory           || {},
      referralCode:        c.referralCode        || "",
      appliedReferralCode: c.appliedReferralCode || "",
      referralDiscount:   c.referralDiscount   || false,
      labourPct:         c.labourPct         != null ? c.labourPct : 50,
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
      const formToSave = {...form};
      if (!formToSave.id) {
        formToSave.referralCode = "";
      }

      // ── Build audit entry ──────────────────────────────────────────
      const existingClient = customers.find(c => c.id === form.id);
      let auditEntry;
      if (!formToSave.id) {
        // New client
        auditEntry = makeEntry("created", `Client created — ${formToSave.name}`, {
          status: formToSave.status,
          quotation: formToSave.quotation,
          rooms: formToSave.rooms,
        });
      } else {
        // Existing — diff changes
        const changes = existingClient ? diffForm(existingClient, formToSave) : [];
        if (changes.length > 0) {
          // Group change type
          const type = changes.some(c=>c.startsWith("Status:")) ? "status"
            : changes.some(c=>c.includes("Quotation")||c.includes("Labour %")||c.includes("Rebate")) ? "quotation"
            : changes.some(c=>c.includes("dimensions")) ? "updated"
            : changes.some(c=>["Plywood","Laminate","Hardware","Glass","Ceiling","Lights","Handles","added","qty"].some(m=>c.includes(m))) ? "materials"
            : changes.some(c=>c.includes("Inventory")) ? "inventory"
            : "updated";
          auditEntry = makeEntry(type, `Updated: ${changes.slice(0,3).join(" · ")+(changes.length>3?` +${changes.length-3} more`:"")}`, {
            status: formToSave.status,
            quotation: formToSave.quotation,
            changes,
          });
        }
      }

      // Append audit entry to log
      if (auditEntry) {
        formToSave.auditLog = [...(formToSave.auditLog||[]), auditEntry];
      }

      const row = toRow(formToSave);
      if (formToSave.id) {
        await safeCall(t => sb(`${TABLE}?id=eq.${formToSave.id}`, "PATCH", row, t));
        showToast("✓ Client updated");
      } else {
        const result = await safeCall(t => sb(TABLE, "POST", row, t));
        if (result && result[0]?.id) {
          const realCode = genReferralCode(result[0].id);
          await safeCall(t => sb(`${TABLE}?id=eq.${result[0].id}`, "PATCH", { referral_code: realCode }, t));
        }
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
  const TABS = ["personal","dimensions","materials","quotation","notes","inventory"];

  // ── REPORT ───────────────────────────────────────────────────────────
  if (view==="report" && selected) {
    return <ClientReport selected={selected} setView={setView} customers={customers}/>;
  }
  // ── INTERNAL REPORT ──────────────────────────────────────────────────
  if (view==="internal" && selected) {
    const d = new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"});
    const lp = selected.labourPct != null ? selected.labourPct : 50;

    // Build full materials order list from roomMaterials
    const allMaterials = {};
    Object.entries(selected.roomMaterials||{}).forEach(([room, mats]) => {
      Object.entries(mats).forEach(([matType, sel]) => {
        if (!sel?.name || !sel?.qty) return;
        const item = getCatalog(matType).find(m=>m.name===sel.name);
        if (!item) return;
        const k = `${matType}||${sel.name}`;
        if (!allMaterials[k]) allMaterials[k] = { matType, name:sel.name, unit:item.unit, price:item.price, qty:0, rooms:[] };
        allMaterials[k].qty += parseFloat(sel.qty);
        allMaterials[k].rooms.push(room);
      });
    });

    const matList = Object.values(allMaterials);
    const matTotal = matList.reduce((t,m)=>t+m.qty*m.price,0);

    // Build subsections list from roomDetails
    const allSubsections = [];
    (selected.rooms||[]).forEach(room => {
      const rd = selected.roomDetails?.[room] || {};
      const subs = ROOM_SUBSECTIONS[room]||[];
      subs.forEach(item => {
        const key = item.name.split(" ").join("_").toLowerCase();
        const sub = rd.subsections?.[key];
        if (sub?.included) {
          allSubsections.push({ room, item:item.name, type:item.type, qty:sub.qty||"—", dim:`${rd.length||"?"}×${rd.width||"?"}ft` });
        }
      });
    });

    const IR = {
      page:   { background:C.white, minHeight:"100vh", fontFamily:"'DM Sans',system-ui,sans-serif", color:C.ink, paddingBottom:60 },
      hdr:    { background:C.ink, padding:"20px 48px", marginBottom:0, borderBottom:`3px solid ${C.teal}` },
      body:   { maxWidth:920, margin:"0 auto", padding:"32px 48px" },
      sec:    { fontSize:10, fontWeight:700, letterSpacing:3, textTransform:"uppercase", color:C.teal,
               borderBottom:`2px solid ${C.teal}`, paddingBottom:6, marginBottom:14, marginTop:28 },
      th:     { padding:"8px 12px", fontSize:10, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase",
               background:C.ink, color:"#fff" },
      td:     (i) => ({ padding:"9px 12px", fontSize:12, background:i%2===0?C.white:C.smoke, borderBottom:`1px solid ${C.line}` }),
      tag:    (c) => ({ background:c, color:"#fff", padding:"2px 8px", borderRadius:2, fontSize:9, fontWeight:700, letterSpacing:1, textTransform:"uppercase" }),
    };

    return (
      <div style={IR.page}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap'); @media print{.np{display:none!important}}`}</style>

        {/* Toolbar */}
        <div className="np" style={{ background:C.ink, padding:"12px 36px", display:"flex", gap:12, alignItems:"center", borderBottom:`3px solid ${C.teal}` }}>
          <button onClick={()=>setView("detail")} style={S.btn("dark")}>← Back</button>
          <button onClick={()=>window.print()} style={S.btn()}>🖨 Print</button>
          <span style={{ background:"#FDE68A", color:"#5C3A00", padding:"3px 10px", borderRadius:2, fontSize:10, fontWeight:700, letterSpacing:1, textTransform:"uppercase" }}>🔒 INTERNAL — Do not share with client</span>
        </div>

        {/* Header */}
        <div style={IR.hdr}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
            <div>
              <div style={{ color:"#fff", fontSize:18, fontWeight:700, letterSpacing:4, textTransform:"uppercase" }}>High Rise Interiors</div>
              <div style={{ color:C.teal, fontSize:10, letterSpacing:5, marginTop:6, textTransform:"uppercase" }}>Internal Work Order & Material Report</div>
            </div>
            <div style={{ textAlign:"right", color:C.muted, fontSize:11 }}>
              <div>{d}</div>
              <div style={{ color:"#FDE68A", fontSize:10, marginTop:4, fontWeight:700, letterSpacing:1 }}>⚠ CONFIDENTIAL — TEAM ONLY</div>
            </div>
          </div>
        </div>

        <div style={IR.body}>

          {/* Client Summary */}
          <div style={IR.sec}>Client & Project Summary</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 40px", border:`1px solid ${C.line}`, borderRadius:3, padding:"16px 20px", background:C.smoke }}>
            {[
              ["Client",       selected.name],
              ["Phone",        selected.phone],
              ["Address",      selected.address],
              ["Project Type", selected.projectType],
              ["Start Date",   selected.startDate],
              ["Duration",     selected.timeline],
              ["Style",        selected.style],
              ["Status",       selected.status],
            ].filter(([,v])=>v).map(([l,v])=>(
              <div key={l} style={{ display:"flex", gap:8, padding:"5px 0", borderBottom:`1px solid ${C.line}`, fontSize:12 }}>
                <span style={{ color:C.muted, minWidth:100 }}>{l}</span>
                <strong>{v}</strong>
              </div>
            ))}
          </div>

          {/* Rooms & Dimensions */}
          <div style={IR.sec}>Room Dimensions</div>
          <div style={{ border:`1px solid ${C.line}`, borderRadius:3, overflow:"hidden" }}>
            <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr", gap:0 }}>
              {["Room","Length (ft)","Width (ft)","Height (ft)","Area (sq ft)"].map(h=>(
                <div key={h} style={IR.th}>{h}</div>
              ))}
            </div>
            {(selected.rooms||[]).map((r,i) => {
              const rd = selected.roomDetails?.[r]||{};
              const area = rd.length&&rd.width ? (parseFloat(rd.length)*parseFloat(rd.width)).toFixed(0) : "—";
              return (
                <div key={r} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr" }}>
                  <div style={IR.td(i)}><strong style={{ color:C.teal }}>🏠 {r}</strong></div>
                  <div style={IR.td(i)}>{rd.length||"—"}</div>
                  <div style={IR.td(i)}>{rd.width||"—"}</div>
                  <div style={IR.td(i)}>{rd.height||"—"}</div>
                  <div style={{ ...IR.td(i), fontWeight:700 }}>{area!=="—"?`${area} sq ft`:"—"}</div>
                </div>
              );
            })}
          </div>

          {/* Work Items — Subsections */}
          {allSubsections.length > 0 && (
            <>
              <div style={IR.sec}>Work Items to Execute</div>
              <div style={{ border:`1px solid ${C.line}`, borderRadius:3, overflow:"hidden" }}>
                <div style={{ display:"grid", gridTemplateColumns:"1.5fr 2fr 1fr 1fr 0.5fr", gap:0 }}>
                  {["Room","Work Item","Type","Qty (sq ft)","✓"].map(h=>(
                    <div key={h} style={IR.th}>{h}</div>
                  ))}
                </div>
                {allSubsections.map((s,i)=>(
                  <div key={i} style={{ display:"grid", gridTemplateColumns:"1.5fr 2fr 1fr 1fr 0.5fr" }}>
                    <div style={IR.td(i)}><span style={{ color:C.teal, fontWeight:600 }}>{s.room}</span></div>
                    <div style={IR.td(i)}>{s.item}</div>
                    <div style={IR.td(i)}><span style={{ ...IR.tag(C.teal) }}>{s.type}</span></div>
                    <div style={IR.td(i)}>{s.qty}</div>
                    <div style={{ ...IR.td(i), textAlign:"center", fontSize:16 }}>☐</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Materials Order List — with actual prices (internal only) */}
          {matList.length > 0 && (
            <>
              <div style={IR.sec}>Materials Order List & Specifications</div>
              <div style={{ border:`1px solid ${C.line}`, borderRadius:3, overflow:"hidden" }}>
                <div style={{ display:"grid", gridTemplateColumns:"0.5fr 2fr 3fr 1fr 2fr", gap:0 }}>
                  {["#","Category","Brand / Material","Qty","Rooms"].map(h=>(
                    <div key={h} style={IR.th}>{h}</div>
                  ))}
                </div>
                {matList.map((m,i)=>(
                  <div key={i} style={{ display:"grid", gridTemplateColumns:"0.5fr 2fr 3fr 1fr 2fr" }}>
                    <div style={IR.td(i)}>{i+1}</div>
                    <div style={IR.td(i)}><span style={IR.tag(C.teal)}>{MATERIAL_LABELS[m.matType]}</span></div>
                    <div style={{ ...IR.td(i), fontWeight:600 }}>{m.name}</div>
                    <div style={IR.td(i)}><strong>{m.qty.toFixed(1)}</strong> {m.unit}</div>
                    <div style={{ ...IR.td(i), fontSize:11, color:C.muted }}>{[...new Set(m.rooms)].join(", ")}</div>
                  </div>
                ))}
                <div style={{ display:"grid", gridTemplateColumns:"0.5fr 2fr 3fr 1fr 2fr", background:C.smoke, borderTop:`2px solid ${C.teal}` }}>
                  <div style={{ padding:"10px 12px", gridColumn:"1/4", fontWeight:700, fontSize:12, color:C.ink }}>Total Items to Order</div>
                  <div style={{ padding:"10px 12px", fontWeight:700, fontSize:13, color:C.teal }}>{matList.length} types</div>
                  <div/>
                </div>
              </div>
            </>
          )}

          {/* Payment schedule removed from internal report */}

          {/* Room Photos in Internal Report */}
          {(selected.rooms||[]).some(r=>(selected.roomDetails?.[r]?.photos||[]).length>0) && (
            <>
              <div style={IR.sec}>Room Reference Photos</div>
              {(selected.rooms||[]).map(r => {
                const photos = selected.roomDetails?.[r]?.photos||[];
                if (!photos.length) return null;
                return (
                  <div key={r} style={{ marginBottom:20 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:C.teal, letterSpacing:2,
                      textTransform:"uppercase", marginBottom:10 }}>🏠 {r}</div>
                    <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                      {photos.map((p,i)=>(
                        <div key={i} style={{ position:"relative" }}>
                          <img src={p} alt={`${r} ${i+1}`} style={{ width:160, height:120,
                            objectFit:"cover", borderRadius:3, border:`1px solid ${C.line}` }}/>
                          <div style={{ fontSize:9, color:C.muted, marginTop:4, textAlign:"center" }}>
                            {r} — Photo {i+1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Inventory Status Table */}
          {selected.inventory && Object.keys(selected.inventory).length > 0 && (
            <>
              <div style={IR.sec}>Material Inventory Status</div>
              {/* Progress summary */}
              {(() => {
                const allKeys = Object.keys(selected.inventory);
                const counts = { Pending:0, Ordered:0, Delivered:0, Installed:0 };
                allKeys.forEach(k => { const s=selected.inventory[k]?.status||"Pending"; counts[s]=(counts[s]||0)+1; });
                const total = allKeys.length;
                return (
                  <div style={{ display:"flex", gap:12, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
                    <div style={{ flex:1, height:6, borderRadius:3, overflow:"hidden", background:C.line, display:"flex" }}>
                      {[["Installed","#8B5CF6"],["Delivered","#10B981"],["Ordered","#3B82F6"],["Pending","#F59E0B"]].map(([s,col])=>(
                        counts[s]>0 && <div key={s} style={{ flex:counts[s], background:col }}/>
                      ))}
                    </div>
                    {[["Pending","#92400E","#FEF3C7"],["Ordered","#1E40AF","#DBEAFE"],["Delivered","#065F46","#D1FAE5"],["Installed","#4C1D95","#EDE9FE"]].map(([s,c,bg])=>(
                      <span key={s} style={{ background:bg, color:c, padding:"2px 10px", borderRadius:2, fontSize:10, fontWeight:700 }}>{counts[s]} {s}</span>
                    ))}
                    <span style={{ fontSize:11, color:C.muted }}>{counts.Installed}/{total} complete</span>
                  </div>
                );
              })()}
              {/* Group by room */}
              {Object.entries(selected.roomMaterials||{}).map(([room, mats]) => {
                const matEntries = Object.entries(mats).filter(([,v])=>v?.name);
                if (!matEntries.length) return null;
                const roomItems = matEntries.map(([matType, sel]) => ({
                  matType, sel,
                  inv: selected.inventory?.[`${room}__${sel.name}`] || { status:"Pending" }
                }));
                return (
                  <div key={room} style={{ marginBottom:16, border:`1px solid ${C.line}`, borderRadius:3, overflow:"hidden" }}>
                    <div style={{ background:C.ink, padding:"8px 14px", display:"flex", justifyContent:"space-between" }}>
                      <span style={{ color:"#fff", fontWeight:700, fontSize:12 }}>🏠 {room}</span>
                      <span style={{ color:C.teal, fontSize:10, letterSpacing:1 }}>
                        {roomItems.filter(({inv})=>inv.status==="Installed").length}/{roomItems.length} installed
                      </span>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"2fr 2fr 1fr 1fr 1fr 1fr 2fr", padding:"6px 14px",
                      background:"#2A3A4A", fontSize:9, fontWeight:700, letterSpacing:1.5, color:"#aaa", textTransform:"uppercase" }}>
                      {["Category","Brand","Qty","Status","Ordered","Delivered","Notes"].map(h=><span key={h}>{h}</span>)}
                    </div>
                    {roomItems.map(({matType, sel, inv}, i) => {
                      const item = getCatalog(matType).find(m=>m.name===sel.name);
                      const sc = {
                        Pending:   { bg:"#FEF3C7", c:"#92400E" },
                        Ordered:   { bg:"#DBEAFE", c:"#1E40AF" },
                        Delivered: { bg:"#D1FAE5", c:"#065F46" },
                        Installed: { bg:"#EDE9FE", c:"#4C1D95" },
                      }[inv.status||"Pending"];
                      return (
                        <div key={i} style={{ display:"grid", gridTemplateColumns:"2fr 2fr 1fr 1fr 1fr 1fr 2fr",
                          padding:"9px 14px", background:i%2===0?C.white:C.smoke, borderTop:`1px solid ${C.line}`, alignItems:"center" }}>
                          <div style={IR.td(i)}><span style={IR.tag(C.teal)}>{MATERIAL_LABELS[matType]}</span></div>
                          <div style={{ ...IR.td(i), fontWeight:600 }}>{sel.name}</div>
                          <div style={IR.td(i)}>{sel.qty} {item?.unit||""}</div>
                          <div style={{ padding:"9px 14px" }}>
                            <span style={{ ...sc, padding:"3px 8px", borderRadius:2, fontSize:9, fontWeight:700, letterSpacing:1, textTransform:"uppercase" }}>
                              {inv.status||"Pending"}
                            </span>
                          </div>
                          <div style={{ ...IR.td(i), fontSize:10, color:C.muted }}>{inv.orderedDate||"—"}</div>
                          <div style={{ ...IR.td(i), fontSize:10, color:C.muted }}>{inv.deliveredDate||"—"}</div>
                          <div style={{ ...IR.td(i), fontSize:11, color:C.muted }}>{inv.notes||""}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </>
          )}

          {/* Notes */}
          {selected.notes && (
            <>
              <div style={IR.sec}>Project Notes & Client Requirements</div>
              <div style={{ background:C.smoke, borderRadius:3, padding:"16px 20px", border:`1px solid ${C.line}`, fontSize:13, lineHeight:2, whiteSpace:"pre-wrap" }}>
                {selected.notes}
              </div>
            </>
          )}

          {/* Footer */}
          <div style={{ borderTop:`2px solid ${C.line}`, paddingTop:16, marginTop:40, display:"flex", justifyContent:"space-between", fontSize:11, color:C.muted }}>
            <span>High Rise Interiors — Internal Document</span>
            <span>Generated: {d} · Powered by Genovatech IT Services Pvt. Ltd.</span>
          </div>

        </div>
      </div>
    );
  }


  // ── VENDOR ORDER REPORT ──────────────────────────────────────────────
  if (view==="vendor" && selected) {
    const d = new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"});
    const orderNum = `HRI-PO-${String(selected.id).slice(-4).padStart(4,"0")}-${new Date().getFullYear()}`;

    // Build consolidated material list linked to inventory status
    const orderItems = [];
    Object.entries(selected.roomMaterials||{}).forEach(([room, mats]) => {
      Object.entries(mats).forEach(([matType, sel]) => {
        if (!sel?.name || !sel?.qty) return;
        const item    = getCatalog(matType).find(m=>m.name===sel.name);
        const invKey  = `${room}__${sel.name}`;
        const invStat = selected.inventory?.[invKey] || { status:"Pending" };
        const key     = `${matType}||${sel.name}`;
        const existing = orderItems.find(o=>o.key===key);
        if (existing) {
          existing.qty     += parseFloat(sel.qty);
          existing.rooms.push(room);
          // If any room shows Pending/Ordered keep that status
          if (invStat.status==="Pending") existing.status = "Pending";
          else if (invStat.status==="Ordered" && existing.status!=="Pending") existing.status = "Ordered";
        } else {
          orderItems.push({
            key, matType, name:sel.name,
            qty:     parseFloat(sel.qty),
            unit:    item?.unit||"",
            rooms:   [room],
            status:  invStat.status||"Pending",
            orderedDate:   invStat.orderedDate,
            deliveredDate: invStat.deliveredDate,
            installedDate: invStat.installedDate,
            notes:   invStat.notes||"",
          });
        }
      });
    });

    // Group by status
    const pending   = orderItems.filter(o=>o.status==="Pending");
    const ordered   = orderItems.filter(o=>o.status==="Ordered");
    const delivered = orderItems.filter(o=>o.status==="Delivered");
    const installed = orderItems.filter(o=>o.status==="Installed");

    const VR = {
      page:  { background:"#fff", minHeight:"100vh", fontFamily:"'DM Sans',system-ui,sans-serif", color:"#0F1923", paddingBottom:60 },
      body:  { maxWidth:920, margin:"0 auto", padding:"32px 48px" },
      sec:   { fontSize:10, fontWeight:700, letterSpacing:3, textTransform:"uppercase",
               color:C.teal, borderBottom:`2px solid ${C.teal}`, paddingBottom:6, marginBottom:14, marginTop:28 },
      th:    (bg="#0F1923") => ({ padding:"8px 12px", fontSize:9, fontWeight:700, letterSpacing:1.5,
               textTransform:"uppercase", background:bg, color:"#fff" }),
      td:    (i) => ({ padding:"9px 12px", fontSize:12, background:i%2===0?"#fff":"#F5F1EA",
               borderBottom:`1px solid ${C.line}`, verticalAlign:"top" }),
      badge: (s) => {
        const m = { Pending:{bg:"#FEF3C7",c:"#92400E"}, Ordered:{bg:"#DBEAFE",c:"#1E40AF"},
                    Delivered:{bg:"#D1FAE5",c:"#065F46"}, Installed:{bg:"#EDE9FE",c:"#4C1D95"} };
        const x = m[s]||m.Pending;
        return { background:x.bg, color:x.c, padding:"2px 8px", borderRadius:2,
                 fontSize:9, fontWeight:700, letterSpacing:1, textTransform:"uppercase" };
      },
    };

    const MatTable = ({ items, title, color="#0F1923" }) => {
      if (!items.length) return null;
      return (
        <div style={{ marginBottom:20 }}>
          <div style={{ background:color, padding:"10px 14px", borderRadius:"3px 3px 0 0",
            display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ color:"#fff", fontWeight:700, fontSize:13 }}>{title}</span>
            <span style={{ color:"rgba(255,255,255,0.7)", fontSize:11 }}>{items.length} item{items.length!==1?"s":""}</span>
          </div>
          <div style={{ border:`1px solid ${C.line}`, borderTop:"none", borderRadius:"0 0 3px 3px", overflow:"hidden" }}>
            <div style={{ display:"grid", gridTemplateColumns:"2fr 3fr 1fr 1fr 2fr 2fr" }}>
              {["Category","Brand / Material","Qty","Unit","Rooms","Dates / Notes"].map(h=>(
                <div key={h} style={VR.th(color==="0F1923"?"#2A3A4A":color)}>{h}</div>
              ))}
            </div>
            {items.map((o,i)=>(
              <div key={o.key} style={{ display:"grid", gridTemplateColumns:"2fr 3fr 1fr 1fr 2fr 2fr" }}>
                <div style={VR.td(i)}>
                  <span style={{ background:C.tealL, color:C.teal, padding:"2px 6px", borderRadius:2, fontSize:9, fontWeight:700 }}>
                    {MATERIAL_LABELS[o.matType]||o.matType}
                  </span>
                </div>
                <div style={{ ...VR.td(i), fontWeight:600 }}>{o.name}</div>
                <div style={{ ...VR.td(i), fontWeight:700, color:C.teal }}>{o.qty.toFixed(1)}</div>
                <div style={VR.td(i)}>{o.unit}</div>
                <div style={{ ...VR.td(i), fontSize:11, color:C.muted }}>
                  {[...new Set(o.rooms)].join(", ")}
                </div>
                <div style={{ ...VR.td(i), fontSize:10, color:C.muted, lineHeight:1.8 }}>
                  {o.orderedDate   && <div>📦 Ord: {o.orderedDate}</div>}
                  {o.deliveredDate && <div>🚚 Del: {o.deliveredDate}</div>}
                  {o.installedDate && <div>✅ Ins: {o.installedDate}</div>}
                  {o.notes         && <div style={{ color:C.ink }}>💬 {o.notes}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    };

    return (
      <div style={VR.page}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap'); @media print{.np{display:none!important}}`}</style>

        {/* Toolbar */}
        <div className="np" style={{ background:C.ink, padding:"12px 36px", display:"flex", gap:12,
          alignItems:"center", borderBottom:`3px solid ${C.teal}` }}>
          <button onClick={()=>setView("detail")} style={S.btn("dark")}>← Back</button>
          <button onClick={()=>window.print()} style={S.btn()}>🖨 Print / Save PDF</button>
          <span style={{ background:"#FDE68A", color:"#5C3A00", padding:"3px 10px", borderRadius:2,
            fontSize:10, fontWeight:700, letterSpacing:1, textTransform:"uppercase" }}>
            🔒 INTERNAL — Vendor Purchase Order
          </span>
          <div style={{ marginLeft:"auto", display:"flex", gap:12, fontSize:11, color:C.muted }}>
            <span>🔴 {pending.length} Pending</span>
            <span>🔵 {ordered.length} Ordered</span>
            <span>🟢 {delivered.length} Delivered</span>
            <span>🟣 {installed.length} Installed</span>
          </div>
        </div>

        {/* Header */}
        <div style={{ background:C.ink, padding:"24px 48px", borderBottom:`3px solid ${C.teal}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
            <div>
              <div style={{ color:"#fff", fontSize:18, fontWeight:700, letterSpacing:4, textTransform:"uppercase" }}>High Rise Interiors</div>
              <div style={{ color:C.teal, fontSize:10, letterSpacing:5, marginTop:6, textTransform:"uppercase" }}>Vendor Purchase Order</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ color:"#fff", fontSize:16, fontWeight:700 }}>{orderNum}</div>
              <div style={{ color:C.muted, fontSize:11, marginTop:4 }}>{d}</div>
            </div>
          </div>
        </div>

        <div style={VR.body}>

          {/* Project summary */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, background:C.smoke,
            borderRadius:3, padding:"16px 20px", border:`1px solid ${C.line}`, marginBottom:8 }}>
            <div>
              <div style={{ fontSize:10, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:6 }}>Client</div>
              <div style={{ fontSize:15, fontWeight:700 }}>{selected.name}</div>
              <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{selected.address}</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {[["Project",selected.projectType],["Style",selected.style],["Start",selected.startDate],["Duration",selected.timeline]].filter(([,v])=>v).map(([l,v])=>(
                <div key={l}><div style={{ fontSize:9, color:C.muted, letterSpacing:1, textTransform:"uppercase" }}>{l}</div><div style={{ fontSize:12, fontWeight:600 }}>{v}</div></div>
              ))}
            </div>
          </div>

          {/* Progress bar */}
          {orderItems.length > 0 && (
            <div style={{ marginBottom:16 }}>
              <div style={{ display:"flex", height:6, borderRadius:3, overflow:"hidden", background:C.line, marginBottom:8 }}>
                {[["Installed","#8B5CF6"],["Delivered","#10B981"],["Ordered","#3B82F6"],["Pending","#F59E0B"]].map(([s,col])=>
                  orderItems.filter(o=>o.status===s).length > 0
                    ? <div key={s} style={{ flex:orderItems.filter(o=>o.status===s).length, background:col }}/> : null
                )}
              </div>
              <div style={{ display:"flex", gap:16, fontSize:11, color:C.muted }}>
                {[["Pending","#FEF3C7","#92400E"],["Ordered","#DBEAFE","#1E40AF"],["Delivered","#D1FAE5","#065F46"],["Installed","#EDE9FE","#4C1D95"]].map(([s,bg,c])=>(
                  <div key={s}><span style={{ background:bg,color:c,padding:"2px 8px",borderRadius:2,fontSize:10,fontWeight:700 }}>{orderItems.filter(o=>o.status===s).length}</span> {s}</div>
                ))}
                <span style={{ marginLeft:"auto", fontWeight:700 }}>{installed.length}/{orderItems.length} Complete</span>
              </div>
            </div>
          )}

          {/* ── PENDING — needs ordering ── */}
          {pending.length > 0 && (
            <>
              <div style={VR.sec}>🔴 To Order — Pending ({pending.length} items)</div>
              <MatTable items={pending} title="Items to Order Immediately" color="#92400E"/>
            </>
          )}

          {/* ── ORDERED — awaiting delivery ── */}
          {ordered.length > 0 && (
            <>
              <div style={VR.sec}>🔵 Ordered — Awaiting Delivery ({ordered.length} items)</div>
              <MatTable items={ordered} title="Items Ordered — Follow Up for Delivery" color="#1E40AF"/>
            </>
          )}

          {/* ── DELIVERED — ready to install ── */}
          {delivered.length > 0 && (
            <>
              <div style={VR.sec}>🟢 Delivered — Ready to Install ({delivered.length} items)</div>
              <MatTable items={delivered} title="Items on Site — Schedule Installation" color="#065F46"/>
            </>
          )}

          {/* ── INSTALLED — complete ── */}
          {installed.length > 0 && (
            <>
              <div style={VR.sec}>🟣 Installed — Complete ({installed.length} items)</div>
              <MatTable items={installed} title="Completed Items" color="#4C1D95"/>
            </>
          )}

          {orderItems.length === 0 && (
            <div style={{ textAlign:"center", padding:48, color:C.muted }}>
              No materials added yet — add materials in the Materials tab first
            </div>
          )}

          {/* Vendor sign-off */}
          {pending.length > 0 && (
            <>
              <div style={VR.sec}>Order Confirmation</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:32, marginTop:8 }}>
                <div style={{ borderTop:`2px solid ${C.ink}`, paddingTop:12 }}>
                  <div style={{ fontSize:10, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:6 }}>Prepared by</div>
                  <div style={{ fontSize:13, fontWeight:700 }}>High Rise Interiors</div>
                  <div style={{ marginTop:40, borderTop:`1px solid ${C.line}`, paddingTop:8, fontSize:10, color:C.muted }}>Signature / Date</div>
                </div>
                <div style={{ borderTop:`2px solid ${C.teal}`, paddingTop:12 }}>
                  <div style={{ fontSize:10, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:6 }}>Vendor Acknowledgement</div>
                  <div style={{ fontSize:13, fontWeight:700, color:C.teal }}>Vendor Name: _______________</div>
                  <div style={{ marginTop:40, borderTop:`1px solid ${C.line}`, paddingTop:8, fontSize:10, color:C.muted }}>Signature / Stamp / Date</div>
                </div>
              </div>
            </>
          )}

          {/* Footer */}
          <div style={{ borderTop:`2px solid ${C.line}`, paddingTop:16, marginTop:32, display:"flex",
            justifyContent:"space-between", fontSize:10, color:C.muted }}>
            <span>High Rise Interiors — Vendor Purchase Order</span>
            <span>{orderNum} | {d} | Powered by Genovatech IT Services Pvt. Ltd.</span>
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
      sTitle:{ fontSize:10,fontWeight:700,letterSpacing:3,textTransform:"uppercase",
               color:C.teal,borderBottom:`1.5px solid ${C.line}`,paddingBottom:6,marginBottom:14,
               fontFamily:"'DM Sans',sans-serif" },
      tRow:  { display:"flex",justifyContent:"space-between",padding:"10px 14px",fontSize:13,
               fontFamily:"'DM Sans',sans-serif" },
      pill:  (bg,c)=>({ background:bg,color:c,padding:"3px 12px",borderRadius:2,
                        fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",
                        fontFamily:"'DM Sans',sans-serif" }),
    };
    return (
      <div style={{ background:C.white,minHeight:"100vh",
                    fontFamily:"'DM Sans','Inter',system-ui,sans-serif",
                    color:C.ink,paddingBottom:60 }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap'); @media print{.np{display:none!important}}`}</style>
        <div className="np" style={{ background:C.ink,padding:"12px 36px",display:"flex",gap:12,alignItems:"center",borderBottom:`3px solid ${C.teal}` }}>
          <button onClick={()=>setView("detail")} style={S.btn("dark")}>← Back</button>
          <button onClick={()=>window.print()} style={S.btn()}>🖨 Print / Save PDF</button>
          <span style={{ color:C.muted,fontSize:11,letterSpacing:1 }}>Tip: Save as PDF in print dialog</span>
        </div>
        <div style={{ maxWidth:820,margin:"0 auto",padding:"40px 48px" }}>
          {/* Header */}
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:36,paddingBottom:24,borderBottom:`3px solid ${C.teal}` }}>
            <div>
              <div style={{ fontSize:28,fontWeight:700,color:C.red,letterSpacing:2,textTransform:"uppercase" }}>High Rise Interiors</div>
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
              <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>{selected.rooms.map(r=><span key={r} style={IV.pill(C.tealL,C.teal)}>{r}</span>)}</div>
            </div>
          )}
          {/* Line Items */}
          <div style={{ marginBottom:28 }}>
            <div style={IV.sTitle}>Invoice Items</div>
            <div style={{ border:`1.5px solid ${C.line}`,borderRadius:12,overflow:"hidden" }}>
              <div style={{ ...IV.tRow,background:C.red,color:"#fff",fontWeight:700,fontSize:12,letterSpacing:1 }}>
                <span style={{ flex:3 }}>Description</span><span style={{ flex:1,textAlign:"right" }}>Amount (₹)</span>
              </div>
              <div style={{ ...IV.tRow,background:C.smoke,borderBottom:`1px solid ${C.line}` }}>
                <span style={{ flex:3,lineHeight:1.7 }}><strong>Interior Design & Execution Work</strong><br/><span style={{ fontSize:12,color:C.muted }}>{selected.projectType} — {selected.address}</span></span>
                <span style={{ flex:1,textAlign:"right",fontWeight:600 }}>{fmt(total)||"As agreed"}</span>
              </div>
              {(selected.rooms||[]).map((r,i)=>(
                <div key={i} style={{ ...IV.tRow,background:i%2===0?"#fff":"#FFFAFA",borderBottom:`1px solid ${C.line}` }}>
                  <span style={{ flex:3,fontSize:12,color:"#4A2A2A",paddingLeft:16 }}>↳ {r}</span>
                  <span style={{ flex:1,textAlign:"right",fontSize:12,color:C.muted }}>Included</span>
                </div>
              ))}
              <div style={{ ...IV.tRow,background:C.smoke,borderTop:`1.5px solid ${C.line}` }}>
                <span style={{ flex:3,color:C.muted }}>Subtotal (Before GST)</span>
                <span style={{ flex:1,textAlign:"right" }}>{fmt(total)||"—"}</span>
              </div>
              {total>0 && (
                <div style={{ ...IV.tRow,background:C.smoke,borderTop:`1px solid ${C.line}` }}>
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
            <div style={{ border:`1.5px solid ${C.line}`,borderRadius:12,overflow:"hidden" }}>
              <div style={{ ...IV.tRow,background:C.ink,color:"#fff",fontWeight:700,fontSize:11,letterSpacing:1 }}>
                <span style={{ flex:1 }}>Phase</span><span style={{ flex:2 }}>Milestone</span>
                <span style={{ flex:1,textAlign:"center" }}>%</span><span style={{ flex:1,textAlign:"right" }}>Amount</span>
                <span style={{ flex:1,textAlign:"right" }}>Status</span>
              </div>
              {PAYMENT_PHASES.map((p,i)=>(
                <div key={i} style={{ ...IV.tRow,background:i%2===0?"#FFFAFA":"#fff",borderTop:`1px solid ${C.line}` }}>
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
            <div style={{ background:C.smoke,borderRadius:10,padding:"16px 20px",border:`1px solid ${C.line}`,fontSize:13,lineHeight:2,color:"#4A2A2A" }}>
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
            <div style={{ background:C.smoke,borderRadius:3,padding:"16px 20px",border:`1px solid ${C.line}`,fontSize:13,lineHeight:2,color:"#4A4A2A" }}>
              <div style={{ background:"#FFF0F0",border:`1px solid ${C.line}`,borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:13,color:C.red,fontWeight:700 }}>
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
              <div style={{ marginTop:36,borderTop:`1px solid ${C.line}`,paddingTop:8,fontSize:11,color:C.muted }}>Signature / Date</div>
            </div>
            <div style={{ borderTop:`2px solid ${C.red}`,paddingTop:12 }}>
              <div style={{ fontSize:12,color:C.muted,marginBottom:4 }}>Authorised by</div>
              <div style={{ fontSize:14,fontWeight:700,color:C.teal,fontFamily:"'DM Sans',sans-serif" }}>High Rise Interiors</div>
              <div style={{ fontSize:12,color:C.muted }}>Hyderabad, Telangana</div>
              <div style={{ marginTop:36,borderTop:`1px solid ${C.line}`,paddingTop:8,fontSize:11,color:C.muted }}>Signature / Stamp / Date</div>
            </div>
          </div>
          {/* Footer */}
          <div style={{ borderTop:`2px solid ${C.line}`,paddingTop:16,marginTop:24 }}>
            <div style={{ display:"flex",justifyContent:"space-between",fontSize:12,color:C.muted,marginBottom:6 }}>
              <span>High Rise Interiors — Powered by Genovatech IT Services Pvt. Ltd.</span>
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
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap'); @keyframes spin{to{transform:rotate(360deg)}} @keyframes slideIn{from{transform:translateX(20px);opacity:0}to{transform:translateX(0);opacity:1}} input:focus,select:focus,textarea:focus{border-color:#1A5276!important;box-shadow:0 0 0 3px rgba(26,82,118,0.12)!important} *{box-sizing:border-box}`}</style>
      {toast && <Toast msg={toast.msg} type={toast.type}/>}
      <div style={S.hdr}>
        <div><div style={S.logo}>High Rise Interiors</div><span style={S.sub}>Client Profile</span></div>
        <div style={{ display:"flex",gap:10 }}>
          <button style={S.btn("dark")} onClick={()=>setView("list")}>← Back</button>
          <button style={S.btn("dark")} onClick={()=>setView("report")}>📄 Client Report</button>
          <button style={S.btn("dark")} onClick={()=>setView("internal")}>🔧 Internal Report</button>
          <button style={S.btn("dark")} onClick={()=>setView("vendor")}>🛒 Vendor Order</button>
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
                      <div key={r} style={{ marginBottom:12, background:C.light, borderRadius:10, padding:"12px 16px", border:`1px solid ${C.line}` }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                          <span style={{ fontWeight:700, fontSize:13, color:C.ink }}>🏠 {r}</span>
                          {area && <span style={{ fontSize:12, color:C.muted }}>{rd.length} × {rd.width} ft = <strong>{area} sq ft</strong></span>}
                        </div>
                        {rd.height && <div style={{ fontSize:12, color:C.muted, marginBottom:4 }}>Ceiling: {rd.height} ft</div>}
                        {rd.notes && <div style={{ fontSize:12, color:C.dark }}>{rd.notes}</div>}
                        {(rd.photos||[]).length>0 && (
                          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:8 }}>
                            {rd.photos.map((p,i)=>(<img key={i} src={p} alt={r} style={{ width:80, height:80, objectFit:"cover", borderRadius:8, border:`1.5px solid ${C.line}` }}/>))}
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
                    const item = getCatalog(matType).find(m=>m.name===sel.name);
                    return total + (item && sel.qty ? parseFloat(sel.qty) * item.price : 0);
                  }, 0);
                  return (
                    <div key={room} style={{ marginBottom:12, background:C.light, borderRadius:10, padding:"12px 16px", border:`1px solid ${C.line}` }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                        <span style={{ fontWeight:700, fontSize:13, color:C.ink }}>🏠 {room}</span>
                        {roomCost > 0 && <span style={{ fontWeight:700, fontSize:13, color:C.red }}>{fmt(Math.round(roomCost))}</span>}
                      </div>
                      {Object.entries(mats).filter(([,v])=>v?.name).map(([matType, sel]) => (
                        <div key={matType} style={{ fontSize:12, color:C.dark, marginBottom:3 }}>
                          <span style={{ color:C.muted }}>{MATERIAL_LABELS[matType]}: </span>
                          <strong>{sel.name}</strong>
                          {sel.qty && <span style={{ color:C.muted }}> × {sel.qty} {getCatalog(matType).find(m=>m.name===sel.name)?.unit}</span>}
                        </div>
                      ))}
                    </div>
                  );
                })}
                {(() => {
                  const grand = Object.values(selected.roomMaterials).reduce((t, mats) =>
                    t + Object.entries(mats).reduce((rt, [matType, sel]) => {
                      if (!sel?.name) return rt;
                      const item = getCatalog(matType).find(m=>m.name===sel.name);
                      return rt + (item && sel.qty ? parseFloat(sel.qty) * item.price : 0);
                    }, 0), 0);
                  return grand > 0 ? (
                    <div style={{ display:"flex", justifyContent:"space-between", background:C.red, borderRadius:10, padding:"10px 16px" }}>
                      <span style={{ color:"#fff", fontWeight:700, fontSize:13 }}>Total Material Cost</span>
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
                <div style={{ fontSize:20,fontWeight:700,color:C.teal,marginTop:8 }}>Final: {fmt(selected.quotation)}</div>
              </div>
            )}
          </div>
        </div>
        {/* ── Audit Trail Timeline ── */}
        <div style={{ ...S.card, marginTop:20 }}>
          <div style={S.sec}>Audit Trail</div>
          {(selected.auditLog||[]).length === 0 ? (
            <div style={{ textAlign:"center", color:C.muted, fontSize:13, padding:"12px 0" }}>
              No activity logged yet — edits and report prints will appear here
            </div>
          ) : (
            <div style={{ position:"relative" }}>
              <div style={{ position:"absolute", left:15, top:8, bottom:8, width:2, background:C.line }}/>
              {[...(selected.auditLog||[])].reverse().map((entry, i) => {
                const dt   = new Date(entry.ts);
                const date = dt.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
                const time = dt.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
                const icon = AUDIT_ICONS[entry.type]||"📋";
                const isSign  = entry.type==="signed";
                const isPrint = entry.type==="report";
                return (
                  <div key={i} style={{ display:"flex", gap:16, marginBottom:20, position:"relative" }}>
                    <div style={{ width:32, height:32, borderRadius:"50%", flexShrink:0, zIndex:1,
                      background: isSign?"#DCFCE7":isPrint?C.tealL:C.smoke,
                      border:`2px solid ${isSign?"#86EFAC":isPrint?C.teal:C.line}`,
                      display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>
                      {icon}
                    </div>
                    <div style={{ flex:1, paddingTop:4 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                        <div style={{ fontSize:13, fontWeight:700, color:C.ink }}>{entry.summary}</div>
                        <div style={{ fontSize:10, color:C.muted, textAlign:"right", marginLeft:12, flexShrink:0 }}>
                          <div>{date}</div><div>{time}</div>
                        </div>
                      </div>
                      {entry.snapshot?.changes?.length > 0 && (
                        <div style={{ marginTop:6, background:C.smoke, borderRadius:3, padding:"8px 12px", border:`1px solid ${C.line}` }}>
                          {entry.snapshot.changes.map((c,j)=>(
                            <div key={j} style={{ fontSize:11, color:C.muted, lineHeight:1.8 }}>• {c}</div>
                          ))}
                        </div>
                      )}
                      {isSign && (
                        <div style={{ marginTop:8 }}>
                          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:8 }}>
                            {entry.signatures?.client && <span style={{ background:"#DCFCE7", color:"#166534", fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:2 }}>✍ Client signed</span>}
                            {entry.signatures?.hri    && <span style={{ background:C.tealL, color:C.teal, fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:2 }}>✍ HRI signed</span>}
                          </div>
                          {/* Show signature images from audit log */}
                          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                            {entry.signatures?.clientImg && (
                              <div>
                                <div style={{ fontSize:9, color:C.muted, marginBottom:2 }}>{selected.name}</div>
                                <img src={entry.signatures.clientImg} alt="Client sig"
                                  style={{ height:48, border:`1px solid ${C.line}`, borderRadius:3, background:"#FAFAFA" }}/>
                              </div>
                            )}
                            {entry.signatures?.hriImg && (
                              <div>
                                <div style={{ fontSize:9, color:C.muted, marginBottom:2 }}>High Rise Interiors</div>
                                <img src={entry.signatures.hriImg} alt="HRI sig"
                                  style={{ height:48, border:`1px solid ${C.line}`, borderRadius:3, background:"#FAFAFA" }}/>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {isPrint && (
                        <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>
                          {entry.snapshot?.sigClient && entry.snapshot?.sigHRI ? "✓ Both signatures captured"
                            : entry.snapshot?.sigClient ? "Client signed only"
                            : entry.snapshot?.sigHRI   ? "HRI signed only"
                            : "Unsigned at print time"}
                        </div>
                      )}
                      {entry.snapshot?.quotation && (
                        <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>
                          Quotation: <strong style={{ color:C.teal }}>{fmt(entry.snapshot.quotation)}</strong>
                          {entry.snapshot.status && <span style={{ marginLeft:8, ...S.badge(entry.snapshot.status), fontSize:9 }}>{entry.snapshot.status}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button style={{ ...S.btn("danger"),marginTop:16 }} onClick={()=>deleteCustomer(selected.id)}>Delete Client</button>
      </div>
    </div>
  );

  // ── LIST ──────────────────────────────────────────────────────────────
  if (view==="list") return (
    <div style={S.app}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap'); @keyframes spin{to{transform:rotate(360deg)}} @keyframes slideIn{from{transform:translateX(20px);opacity:0}to{transform:translateX(0);opacity:1}} input:focus,select:focus,textarea:focus{border-color:#1A5276!important;box-shadow:0 0 0 3px rgba(26,82,118,0.12)!important} *{box-sizing:border-box}`}</style>
      {toast && <Toast msg={toast.msg} type={toast.type}/>}
      <div style={S.hdr}>
        <div><div style={S.logo}>High Rise Interiors</div><span style={S.sub}>Studio CRM</span></div>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <span style={{ background:connected?"#27AE60":"#C0392B",color:"#fff",fontSize:10,padding:"3px 10px",borderRadius:20 }}>● {connected?"Connected":"Offline"}</span>
          <span style={{ color:"#E0D0FF",fontSize:11 }}>{user?.email}</span>
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
            onMouseEnter={e=>{e.currentTarget.style.borderColor=C.teal;e.currentTarget.style.boxShadow=`0 4px 20px rgba(26,82,118,0.10)`}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.line;e.currentTarget.style.boxShadow="0 1px 4px rgba(15,25,35,0.08)"}}
            onClick={()=>openDetail(c)}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10 }}>
              <div>
                <div style={{ fontSize:18,fontWeight:700,marginBottom:3 }}>{c.name}</div>
                <div style={{ fontSize:13,color:C.muted }}>{c.phone}{c.email?` · ${c.email}`:""}</div>
                {c.address && <div style={{ fontSize:12,color:"#B0A0A0",marginTop:2 }}>📍 {c.address}</div>}
              </div>
              <div style={{ display:"flex",gap:10,alignItems:"center",flexWrap:"wrap" }}>
                {c.quotation && <span style={{ background:C.light,color:C.red,fontWeight:700,fontSize:13,padding:"4px 12px",borderRadius:20,border:`1px solid ${C.line}` }}>{fmt(c.quotation)}</span>}
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
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap'); @keyframes spin{to{transform:rotate(360deg)}} @keyframes slideIn{from{transform:translateX(20px);opacity:0}to{transform:translateX(0);opacity:1}} input:focus,select:focus,textarea:focus{border-color:#1A5276!important;box-shadow:0 0 0 3px rgba(26,82,118,0.12)!important} *{box-sizing:border-box}`}</style>
      {toast && <Toast msg={toast.msg} type={toast.type}/>}
      <div style={S.hdr}>
        <div><div style={S.logo}>High Rise Interiors</div><span style={S.sub}>{form.id?"Edit Client":"New Client"}</span></div>
        <div style={{ display:"flex",gap:10 }}>
          <button style={S.btn("dark")} onClick={()=>setView("list")}>Cancel</button>
          <button style={{ ...S.btn(),opacity:saving?0.7:1 }} onClick={saveCustomer} disabled={saving}>{saving?"Saving…":form.id?"Update Client":"Save Client"}</button>
        </div>
      </div>
      <div style={S.main}>
        {/* Tabs */}
        <div style={{ display:"flex",gap:6,marginBottom:24,background:C.smoke,padding:5,borderRadius:3,width:"fit-content" }}>
          {[["personal","👤 Client"],["dimensions","📐 Dimensions"],["materials","🔧 Materials"],["quotation","💰 Quotation"],["notes","📝 Notes"],["inventory","📦 Inventory"]].map(([k,l])=>(
            <button key={k} style={S.tab(activeTab===k)} onClick={()=>setActiveTab(k)}>{l}</button>
          ))}
        </div>

        <div style={{ ...S.card,padding:"32px 36px" }}>

          {/* ── PERSONAL ── */}
          {activeTab==="personal" && (
            <div>
              {form.id && (
                <div style={{ background:"#F5EEEE", borderRadius:10, padding:"10px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:12, border:`1px solid ${C.line}` }}>
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
              <div style={{ marginBottom:18 }}>
                <label style={S.label}>Start Date</label>
                <input style={S.input} type="date" value={form.startDate} onChange={e=>setF("startDate",e.target.value)}/>
              </div>
              <div style={{ marginBottom:18 }}>
                <label style={S.label}>Duration</label>
                <select style={S.input} value={form.timeline} onChange={e=>setF("timeline",e.target.value)}>
                  <option value="">Select duration</option>
                  {TIMELINES.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
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
                  <div key={room} style={{ background:"#fff", border:`1.5px solid ${C.line}`, borderRadius:14, padding:"20px 24px", marginBottom:16, boxShadow:"0 2px 8px rgba(139,26,26,0.05)" }}>
                    {/* Room header */}
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                      <div style={{ fontSize:15, fontWeight:700, color:C.ink }}>🏠 {room}</div>
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

                    {/* Subsections from Excel */}
                    {ROOM_SUBSECTIONS[room] && (
                      <div style={{ marginBottom:14 }}>
                        <label style={S.label}>Work Items</label>
                        <div style={{ border:`1px solid ${C.line}`, borderRadius:3, overflow:"hidden" }}>
                          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", gap:0,
                            padding:"6px 12px", background:C.ink, fontSize:10, fontWeight:700,
                            color:"#fff", letterSpacing:1.5, textTransform:"uppercase" }}>
                            <span>Item</span><span>Type</span><span>Qty (sq ft)</span><span>Include?</span>
                          </div>
                          {ROOM_SUBSECTIONS[room].map((item, idx) => {
                            const key = item.name.split(" ").join("_").toLowerCase();
                            const sub = rd.subsections?.[key] || {};
                            const setSub = (field, val) => setForm(f => ({
                              ...f,
                              roomDetails: {
                                ...(f.roomDetails||{}),
                                [room]: {
                                  ...(f.roomDetails?.[room]||{}),
                                  subsections: {
                                    ...(f.roomDetails?.[room]?.subsections||{}),
                                    [key]: { ...(f.roomDetails?.[room]?.subsections?.[key]||{}), [field]: val }
                                  }
                                }
                              }
                            }));
                            return (
                              <div key={key} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr",
                                padding:"8px 12px", background:idx%2===0?C.white:C.smoke,
                                borderTop:`1px solid ${C.line}`, alignItems:"center" }}>
                                <span style={{ fontSize:12, fontWeight:600, color:C.ink }}>{item.name}</span>
                                <span style={{ fontSize:11, color:C.muted }}>{item.type}</span>
                                <input style={{ ...S.input, padding:"4px 8px", fontSize:12, width:"80px" }}
                                  type="number" value={sub.qty||""}
                                  onChange={e=>setSub("qty",e.target.value)}
                                  placeholder="0"/>
                                <label style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer" }}>
                                  <input type="checkbox" checked={!!sub.included}
                                    onChange={e=>setSub("included",e.target.checked)}
                                    style={{ width:14, height:14, accentColor:C.teal }}/>
                                  <span style={{ fontSize:11, color:sub.included?C.teal:C.muted }}>
                                    {sub.included?"Yes":"No"}
                                  </span>
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

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
                            <img src={photo} alt={`${room} ${idx+1}`} style={{ width:100, height:100, objectFit:"cover", borderRadius:10, border:`1.5px solid ${C.line}` }}/>
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
                                  // Compress to max 800px, JPEG 0.72 quality before saving
                                  const img = new Image();
                                  img.onload = () => {
                                    const canvas = document.createElement("canvas");
                                    const maxW = 800;
                                    const scale = img.width > maxW ? maxW/img.width : 1;
                                    canvas.width  = Math.round(img.width  * scale);
                                    canvas.height = Math.round(img.height * scale);
                                    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
                                    const compressed = canvas.toDataURL("image/jpeg", 0.72);
                                    setRD("photos", [...(rd.photos||[]), compressed]);
                                  };
                                  img.src = ev.target.result;
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
                <div style={{ background:C.light, borderRadius:12, padding:"16px 20px", border:`1px solid ${C.line}`, marginTop:8 }}>
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
                      const item = getCatalog(matType).find(m=>m.name===sel.name);
                      if (!item) return total;
                      const qty = parseFloat(sel.qty || 0);
                      return total + (qty * item.price);
                    }, 0);

                    return (
                      <div key={room} style={{ background:"#fff", border:`1.5px solid ${C.line}`, borderRadius:14, padding:"20px 24px", marginBottom:16, boxShadow:"0 2px 8px rgba(139,26,26,0.05)" }}>
                        {/* Room header */}
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, paddingBottom:12, borderBottom:`1px solid ${C.line}` }}>
                          <div style={{ fontSize:15, fontWeight:700, color:C.ink }}>🏠 {room}</div>
                          {roomCost > 0 && <span style={{ background:C.red, color:"#fff", fontSize:13, fontWeight:700, padding:"4px 14px", borderRadius:20 }}>Est. {fmt(Math.round(roomCost))}</span>}
                        </div>

                        {/* Material rows */}
                        {applicableMats.map(matType => {
                          // Hardware has sub-categories (channels/hinges)
                          const items = matType==="hardware"
                            ? [...(MATERIAL_CATALOG.hardware.channels||[]), ...(MATERIAL_CATALOG.hardware.hinges||[])]
                            : getCatalog(matType);
                          const sel = rm[matType] || {};
                          const selectedItem = items.find(m => m.name === sel.name);
                          const lineTotal = selectedItem && sel.qty ? Math.round(parseFloat(sel.qty) * selectedItem.price) : null;

                          return (
                            <div key={matType} style={{ marginBottom:14, background:C.smoke, borderRadius:10, padding:"12px 16px", border:`1px solid ${C.line}` }}>
                              <div style={{ fontSize:11, letterSpacing:2, color:C.muted, textTransform:"uppercase", marginBottom:10, fontWeight:700 }}>{MATERIAL_LABELS[matType]}</div>
                              <div style={{ display:"flex", gap:12, flexWrap:"wrap", alignItems:"flex-end" }}>
                                {/* Material selector */}
                                <div style={{ flex:2 }}>
                                  <label style={S.label}>Brand / Type</label>
                                  <select style={S.input} value={sel.name||""} onChange={e => setRM(matType, "name", e.target.value)}>
                                    <option value="">Select {MATERIAL_LABELS[matType]}</option>
                                    {matType==="hardware" ? (
                                      <>
                                        <optgroup label="── Drawer Channels & Runners ──">
                                          {(MATERIAL_CATALOG.hardware.channels||[]).map(m=>(
                                            <option key={m.name} value={m.name}>{m.name} — ₹{m.price}/{m.unit}</option>
                                          ))}
                                        </optgroup>
                                        <optgroup label="── Hinges & Accessories ──">
                                          {(MATERIAL_CATALOG.hardware.hinges||[]).map(m=>(
                                            <option key={m.name} value={m.name}>{m.name} — ₹{m.price}/{m.unit}</option>
                                          ))}
                                        </optgroup>
                                      </>
                                    ) : items.map(m => (
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
                        const item = getCatalog(matType).find(m=>m.name===sel.name);
                        if (!item) return rt;
                        return rt + (parseFloat(sel.qty||0) * item.price);
                      }, 0);
                    }, 0);

                    return grandTotal > 0 ? (
                      <div style={{ background:C.red, borderRadius:14, padding:"20px 24px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <div>
                          <div style={{ color:"#fff", fontSize:12, letterSpacing:2, textTransform:"uppercase" }}>Estimated Material Cost</div>
                          <div style={{ color:"#E0D0FF", fontSize:11, marginTop:4 }}>Based on selected materials & quantities</div>
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

              {/* Configurable Labour % */}
              <div style={{ display:"flex", alignItems:"center", gap:16, background:C.light, borderRadius:10, padding:"12px 18px", marginBottom:16, border:`1px solid ${C.line}` }}>
                <div style={{ fontSize:12, fontWeight:700, color:C.red, letterSpacing:1 }}>⚙ LABOUR COST %</div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <input style={{ ...S.input, width:80, textAlign:"center", fontWeight:700 }} type="number" min="0" max="100"
                    value={form.labourPct} onChange={e=>setF("labourPct", parseFloat(e.target.value)||0)}/>
                  <span style={{ fontSize:13, color:C.muted }}>% of material cost</span>
                </div>
                <div style={{ fontSize:12, color:C.muted }}>
                  Total = Material × {1 + (form.labourPct != null ? form.labourPct : 50)/100}x
                </div>
                <div style={{ display:"flex", gap:6, marginLeft:"auto" }}>
                  {[30,40,50,60].map(p=>(
                    <button key={p} style={{ ...S.btn(form.labourPct===p?"p":"light"), padding:"6px 12px", fontSize:11 }}
                      onClick={()=>setF("labourPct",p)}>{p}%</button>
                  ))}
                </div>
              </div>

              {/* Auto-calculate from materials button */}
              {form.roomMaterials && Object.keys(form.roomMaterials).length > 0 && (() => {
                const matCost = Object.values(form.roomMaterials).reduce((t,mats)=>
                  t+Object.entries(mats).reduce((rt,[matType,sel])=>{
                    const item = getCatalog(matType).find(m=>m.name===sel.name);
                    return rt+(item&&sel.qty?parseFloat(sel.qty)*item.price:0);
                  },0),0);
                const labourMult = 1 + (form.labourPct != null ? form.labourPct : 50)/100;
                const withLabour = Math.round(matCost * labourMult);
                return matCost > 0 ? (
                  <div style={{ background:C.light, borderRadius:12, padding:"14px 18px", marginBottom:20, border:`1px solid ${C.line}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:C.red, letterSpacing:1 }}>AUTO-CALCULATED FROM MATERIALS</div>
                      <div style={{ fontSize:13, color:C.muted, marginTop:4 }}>Material cost {fmt(Math.round(matCost))} + Labour ({form.labourPct||50}%) = <strong style={{ color:C.teal }}>{fmt(withLabour)}</strong></div>
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

              {/* Rebate & Coupon — two separate discounts */}
              <div style={{ background:C.smoke, borderRadius:12, padding:"18px 20px", border:`1px solid ${C.line}`, marginBottom:20 }}>
                <div style={S.sec}>Rebate & Coupon Discount</div>

                {/* Row 1: Rebate */}
                <div style={{ fontSize:11, letterSpacing:2, color:C.muted, textTransform:"uppercase", marginBottom:8, fontWeight:700 }}>Step 1 — Rebate</div>
                <div style={S.row}>
                  <Field label="Rebate Type">
                    <select style={S.input} value={form.rebateType} onChange={e=>{
                      setF("rebateType",e.target.value);
                    }}>
                      <option value="amount">Fixed Amount (₹)</option>
                      <option value="percent">Percentage (%)</option>
                    </select>
                  </Field>
                  <Field label={form.rebateType==="percent" ? "Rebate % (max 5%)" : "Rebate Amount ₹ (max ₹25,000)"}>
                    <input style={S.input} type="number" min="0" max={form.rebateType==="percent"?"5":"25000"}
                      value={form.rebateValue}
                      onChange={e=>{
                        const val = e.target.value;
                        const rawVal = parseFloat(val||0);
                        const safePct = form.rebateType==="percent" ? Math.min(rawVal,5) : Math.min(rawVal,25000);
                        setF("rebateValue", String(safePct));
                        const base = parseFloat(form.previousQuotation||0);
                        if (!base) return;
                        const rebateAmt = form.rebateType==="percent" ? Math.round(base*safePct/100) : safePct;
                        const afterRebate = Math.round(base - rebateAmt);
                        // Also apply coupon on top if exists
                        const couponAmt = form.couponApplied ? Math.round(afterRebate*0.05) : 0;
                        const revised = afterRebate - couponAmt;
                        setF("revisedQuotation", revised.toString());
                        setF("quotation", revised.toString());
                      }}
                      placeholder={form.rebateType==="percent"?"max 5%":"e.g. 25000"}/>
                  </Field>
                  <Field label="Rebate Amount">
                    <div style={{ ...S.input, background:"#F5EEEE", color:C.red, fontWeight:700, cursor:"default" }}>
                      {form.previousQuotation && form.rebateValue
                        ? `- ${form.rebateType==="percent"
                            ? fmt(Math.round(parseFloat(form.previousQuotation)*Math.min(parseFloat(form.rebateValue||0),5)/100))
                            : fmt(parseFloat(form.rebateValue||0))}`
                        : "—"}
                    </div>
                  </Field>
                </div>

                {/* This client's own referral code */}
                <div style={{ background:C.smoke, borderRadius:3, padding:"14px 18px", marginBottom:20, border:`1px solid ${C.line}` }}>
                  <div style={{ fontSize:10, fontWeight:700, color:C.teal, letterSpacing:2, marginBottom:10, textTransform:"uppercase" }}>
                    This Client's Referral Code
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
                    <div style={{ fontSize:22, fontWeight:800, letterSpacing:4,
                      color: form.referralCode ? C.ink : C.muted,
                      fontFamily:"monospace", background:C.white, padding:"8px 20px",
                      borderRadius:3, border:`2px solid ${form.referralCode ? C.teal : C.line}` }}>
                      {form.referralCode || "— auto-generated on save —"}
                    </div>
                    <div style={{ fontSize:12, color:C.muted, lineHeight:1.8 }}>
                      <div>Share with friends to earn <strong style={{ color:C.teal }}>5% cashback</strong></div>
                      <div>Friends get <strong style={{ color:C.teal }}>5% off</strong> their project</div>
                    </div>
                  </div>
                </div>

                {/* Row 2: Apply another customer's referral code */}
                <div style={{ fontSize:11, letterSpacing:2, color:C.muted, textTransform:"uppercase", marginBottom:8, fontWeight:700, marginTop:4 }}>Step 2 — Apply Referral Code (from another client)</div>
                <div style={S.row}>
                  <Field label="Referral Code Used">
                    <input style={S.input}
                      value={form.appliedReferralCode}
                      onChange={e=>{
                        const code = e.target.value.toUpperCase();
                        setF("appliedReferralCode", code);
                        if (!code) { setF("referralDiscount", false); return; }

                        // Check if code is this client's own code
                        // For existing client: match by id. For new client: match by referralCode in form
                        const isOwnCode = form.referralCode && form.referralCode === code;

                        if (isOwnCode) {
                          setF("referralDiscount", false);
                          showToast("Cannot apply your own referral code", "error");
                          return;
                        }

                        // Find referrer — must be a different customer with this code
                        const referrer = customers.find(c =>
                          c.referralCode === code &&
                          (form.id ? c.id !== form.id : true)
                        );

                        if (referrer) {
                          setF("referralDiscount", true);
                          const base = parseFloat(form.previousQuotation||0);
                          if (base) {
                            const rebateAmt = form.rebateType==="percent"
                              ? Math.round(base*Math.min(parseFloat(form.rebateValue||0),5)/100)
                              : parseFloat(form.rebateValue||0);
                            const afterRebate = base - rebateAmt;
                            const refDiscount = Math.round(afterRebate*0.05);
                            const revised = afterRebate - refDiscount;
                            setF("revisedQuotation", revised.toString());
                            setF("quotation", revised.toString());
                          }
                          showToast(`✓ Valid — ${referrer.name} earns 5% cashback!`, "success");
                        } else {
                          setF("referralDiscount", false);
                        }
                      }}
                      placeholder="e.g. HRIAB123456"
                    />
                  </Field>
                  <Field label="Validation">
                    <div style={{ ...S.input, cursor:"default",
                      background: form.referralDiscount ? "#DCFCE7"
                        : form.appliedReferralCode ? "#FEF2F2" : C.smoke,
                      color: form.referralDiscount ? "#166534"
                        : form.appliedReferralCode ? C.rust : C.muted,
                      fontWeight:700 }}>
                      {form.referralDiscount
                        ? (() => {
                            const r = customers.find(c=>c.referralCode===form.appliedReferralCode);
                            return `✓ Valid — Referred by ${r?.name||"client"}`;
                          })()
                        : form.appliedReferralCode
                          ? (form.referralCode===form.appliedReferralCode
                              ? "✗ Cannot use own code"
                              : "✗ Code not found in system")
                          : "Enter a referral code to validate"
                      }
                    </div>
                  </Field>
                  <Field label="Referral Discount (5%)">
                    <div style={{ ...S.input, background:form.referralDiscount?"#DCFCE7":C.smoke,
                      color:form.referralDiscount?"#166534":C.muted, fontWeight:700, cursor:"default" }}>
                      {form.referralDiscount && form.previousQuotation
                        ? (() => {
                            const base = parseFloat(form.previousQuotation||0);
                            const rebateAmt = form.rebateType==="percent"
                              ? Math.round(base*Math.min(parseFloat(form.rebateValue||0),5)/100)
                              : parseFloat(form.rebateValue||0);
                            return `- ${fmt(Math.round((base-rebateAmt)*0.05))}`;
                          })()
                        : "—"}
                    </div>
                  </Field>
                </div>

                {/* Live Summary */}
                {form.previousQuotation && (
                  <div style={{ background:"#fff", borderRadius:10, padding:"12px 16px", border:`1px solid ${C.line}`, marginTop:4 }}>
                    {(() => {
                      const base = parseFloat(form.previousQuotation||0);
                      const rebateAmt = form.rebateType==="percent"
                        ? Math.round(base*Math.min(parseFloat(form.rebateValue||0),5)/100)
                        : parseFloat(form.rebateValue||0);
                      const afterRebate = base - rebateAmt;
                      const couponAmt = form.couponApplied ? Math.round(afterRebate*0.05) : 0;
                      const final = afterRebate - couponAmt;
                      return (
                        <div style={{ display:"flex", gap:16, flexWrap:"wrap", fontSize:13, alignItems:"center" }}>
                          <div><span style={{ color:C.muted }}>Base: </span><strong>{fmt(base)}</strong></div>
                          {rebateAmt>0 && <div><span style={{ color:C.muted }}>Rebate: </span><strong style={{ color:C.teal }}>-{fmt(rebateAmt)}</strong></div>}
                          {couponAmt>0 && <div><span style={{ color:C.muted }}>Coupon 5%: </span><strong style={{ color:"#166534" }}>-{fmt(couponAmt)}</strong></div>}
                          <div style={{ marginLeft:"auto" }}><span style={{ color:C.muted }}>Final: </span><strong style={{ color:C.teal, fontSize:16 }}>{fmt(final)}</strong></div>
                        </div>
                      );
                    })()}
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
                    <div key={i} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",background:C.light,borderRadius:12,padding:"14px 18px",marginBottom:10,border:`1px solid ${C.line}` }}>
                      <div><div style={{ fontWeight:700,fontSize:13,color:C.teal }}>{p.day} — {p.pct}% — {p.label}</div></div>
                      <div style={{ fontSize:18,fontWeight:700,color:C.teal }}>{fmt(Math.round(Number(form.quotation)*p.pct/100))}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── INVENTORY ── */}
          {activeTab==="inventory" && (
            <div>
              <div style={S.sec}>Project Material Inventory</div>
              {!form.roomMaterials || Object.keys(form.roomMaterials).length===0 ? (
                <div style={{ textAlign:"center", padding:40, background:C.smoke, borderRadius:3, color:C.muted, fontSize:13, border:`1px solid ${C.line}` }}>
                  ☝️ Add materials in the <strong>Materials</strong> tab first, then track them here
                </div>
              ) : (
                <>
                  {/* Status legend */}
                  <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
                    {[["Pending","#FEF3C7","#92400E"],["Ordered","#DBEAFE","#1E40AF"],["Delivered","#D1FAE5","#065F46"],["Installed","#EDE9FE","#4C1D95"]].map(([s,bg,c])=>(
                      <span key={s} style={{ background:bg, color:c, padding:"4px 12px", borderRadius:2, fontSize:11, fontWeight:700, letterSpacing:1 }}>{s}</span>
                    ))}
                    <span style={{ fontSize:11, color:C.muted }}>— tap status to cycle through stages</span>
                  </div>

                  {/* Per-room material inventory */}
                  {Object.entries(form.roomMaterials).map(([room, mats]) => {
                    const matEntries = Object.entries(mats).filter(([,v])=>v?.name);
                    if (!matEntries.length) return null;
                    const installedCount = matEntries.filter(([,sel])=>{
                      const k=`${room}__${sel.name}`;
                      return form.inventory?.[k]?.status==="Installed";
                    }).length;
                    return (
                      <div key={room} style={{ marginBottom:16, border:`1px solid ${C.line}`, borderRadius:3, overflow:"hidden" }}>
                        {/* Room header */}
                        <div style={{ background:C.ink, padding:"10px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                          <span style={{ color:"#fff", fontWeight:700, fontSize:13 }}>🏠 {room}</span>
                          <span style={{ color:installedCount===matEntries.length?C.teal:"#aaa", fontSize:10, letterSpacing:1 }}>
                            {installedCount}/{matEntries.length} installed
                          </span>
                        </div>
                        {/* Column headers */}
                        <div style={{ display:"grid", gridTemplateColumns:"2fr 2fr 1fr 1fr 1.2fr 2fr",
                          padding:"6px 14px", background:"#2A3A4A",
                          fontSize:9, fontWeight:700, letterSpacing:1.5, color:"#aaa", textTransform:"uppercase" }}>
                          {["Category","Brand","Qty","Status","Dates","Notes"].map(h=><span key={h}>{h}</span>)}
                        </div>
                        {/* Material rows */}
                        {matEntries.map(([matType, sel], i) => {
                          const invKey = `${room}__${sel.name}`;
                          const inv = form.inventory?.[invKey] || { status:"Pending" };
                          const SINV = ["Pending","Ordered","Delivered","Installed"];
                          const SC = {
                            Pending:   { bg:"#FEF3C7", c:"#92400E" },
                            Ordered:   { bg:"#DBEAFE", c:"#1E40AF" },
                            Delivered: { bg:"#D1FAE5", c:"#065F46" },
                            Installed: { bg:"#EDE9FE", c:"#4C1D95" },
                          };
                          const sc = SC[inv.status||"Pending"];
                          const setInv = (field, val) => setForm(f=>({
                            ...f,
                            inventory: {
                              ...(f.inventory||{}),
                              [invKey]: { ...(f.inventory?.[invKey]||{status:"Pending"}), [field]: val }
                            }
                          }));
                          const cycleStatus = () => {
                            const idx = SINV.indexOf(inv.status||"Pending");
                            const next = SINV[(idx+1)%SINV.length];
                            const nextIdx = SINV.indexOf(next);
                            const now = new Date().toISOString().split("T")[0];
                            setForm(f => {
                              const current = f.inventory?.[invKey] || {status:"Pending"};
                              const updated = { ...current, status: next };
                              if (nextIdx < 1) { delete updated.orderedDate;   }
                              if (nextIdx < 2) { delete updated.deliveredDate; }
                              if (nextIdx < 3) { delete updated.installedDate; }
                              if (next==="Ordered")   updated.orderedDate   = now;
                              if (next==="Delivered") updated.deliveredDate = now;
                              if (next==="Installed") updated.installedDate = now;
                              const newInv = { ...(f.inventory||{}), [invKey]: updated };
                              // Log inventory change to DB immediately
                              const entry = makeEntry(
                                "inventory",
                                `Inventory: ${sel.name} (${room}) → ${next}`,
                                { status: f.status, quotation: f.quotation, invStatus: next, material: sel.name, room }
                              );
                              const currentLog = f.auditLog||[];
                              saveAuditEntry(f.id, currentLog, entry).then(newLog => {
                                if (newLog) {
                                  setForm(prev => ({ ...prev, auditLog: newLog }));
                                  // Also update customers list so detail view shows updated log
                                  setCustomers(prev => prev.map(c =>
                                    c.id===f.id ? { ...c, auditLog: newLog, inventory: { ...(c.inventory||{}), [invKey]: {...(f.inventory?.[invKey]||{}), status: next } } } : c
                                  ));
                                }
                              });
                              return { ...f, inventory: newInv };
                            });
                          };
                          const item = getCatalog(matType).find(m=>m.name===sel.name);
                          return (
                            <div key={invKey} style={{ display:"grid", gridTemplateColumns:"2fr 2fr 1fr 1fr 1.2fr 2fr",
                              padding:"10px 14px", background:i%2===0?C.white:C.smoke,
                              borderTop:`1px solid ${C.line}`, alignItems:"center", gap:8 }}>
                              <div style={{ fontSize:11, color:C.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:1 }}>{MATERIAL_LABELS[matType]}</div>
                              <div style={{ fontSize:12, fontWeight:700, color:C.ink }}>{sel.name}</div>
                              <div style={{ fontSize:12, color:C.muted }}>{sel.qty} {item?.unit||""}</div>
                              {/* Clickable status */}
                              <div onClick={cycleStatus} title="Click to update status"
                                style={{ ...sc, padding:"5px 8px", borderRadius:2, fontSize:10,
                                  fontWeight:700, letterSpacing:1, cursor:"pointer",
                                  textTransform:"uppercase", textAlign:"center", userSelect:"none",
                                  transition:"all 0.15s" }}>
                                {inv.status||"Pending"}
                              </div>
                              {/* Auto-stamped dates */}
                              <div style={{ fontSize:10, color:C.muted, lineHeight:1.8 }}>
                                {inv.orderedDate   && <div>📦 {inv.orderedDate}</div>}
                                {inv.deliveredDate && <div>🚚 {inv.deliveredDate}</div>}
                                {inv.installedDate && <div>✅ {inv.installedDate}</div>}
                              </div>
                              {/* Notes */}
                              <input style={{ ...S.input, padding:"5px 10px", fontSize:11 }}
                                value={inv.notes||""}
                                onChange={e=>setInv("notes", e.target.value)}
                                placeholder="Supplier, PO#, remarks…"/>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}

                  {/* Overall progress summary */}
                  {(() => {
                    const allKeys = Object.entries(form.roomMaterials).flatMap(([room,mats])=>
                      Object.entries(mats).filter(([,v])=>v?.name).map(([,sel])=>`${room}__${sel.name}`)
                    );
                    const counts = {Pending:0,Ordered:0,Delivered:0,Installed:0};
                    allKeys.forEach(k=>{ const s=form.inventory?.[k]?.status||"Pending"; counts[s]=(counts[s]||0)+1; });
                    const total = allKeys.length;
                    return total>0?(
                      <div style={{ background:C.smoke, borderRadius:3, padding:"16px 20px", border:`1px solid ${C.line}`, marginTop:8 }}>
                        <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, color:C.muted, textTransform:"uppercase", marginBottom:10 }}>Overall Progress</div>
                        <div style={{ display:"flex", height:8, borderRadius:4, overflow:"hidden", marginBottom:12, background:C.line }}>
                          {[["Installed","#8B5CF6"],["Delivered","#10B981"],["Ordered","#3B82F6"],["Pending","#F59E0B"]].map(([s,col])=>(
                            counts[s]>0 ? <div key={s} style={{ flex:counts[s], background:col }}/> : null
                          ))}
                        </div>
                        <div style={{ display:"flex", gap:16, fontSize:12, flexWrap:"wrap" }}>
                          {[["Pending","#92400E","#FEF3C7"],["Ordered","#1E40AF","#DBEAFE"],["Delivered","#065F46","#D1FAE5"],["Installed","#4C1D95","#EDE9FE"]].map(([s,c,bg])=>(
                            <div key={s}><span style={{ background:bg, color:c, padding:"2px 8px", borderRadius:2, fontSize:10, fontWeight:700 }}>{counts[s]}</span> <span style={{ color:C.muted }}>{s}</span></div>
                          ))}
                          <div style={{ marginLeft:"auto", fontWeight:700, color:C.ink }}>{counts.Installed}/{total} Complete</div>
                        </div>
                      </div>
                    ):null;
                  })()}
                </>
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
          <div style={{ display:"flex",justifyContent:"space-between",marginTop:28,paddingTop:20,borderTop:`1px solid ${C.line}` }}>
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
