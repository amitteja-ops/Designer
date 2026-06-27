import React, { useState, useEffect, useCallback, useRef } from "react";
import "./index.css";
import { sb, toRow, fromRow, TABLE } from "./supabase";

// Default rooms — extended dynamically when floor plan is uploaded
const DEFAULT_ROOMS = ["Drawing Room","Living Area","Dining","Master Bedroom","Children Bedroom","Guest Bedroom","Kitchen","Pooja","Entrance","Balcony","Bathroom","Study Room"];
// ROOMS is computed from form — see getRooms(form) helper below
const getRooms = (form) => {
  const extra = (form.customRooms || []).filter(r => r && !DEFAULT_ROOMS.includes(r));
  return [...DEFAULT_ROOMS, ...extra];
};
const ROOMS = DEFAULT_ROOMS; // fallback for places that don't have form context
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

// ── Work Types — what is being built in each room ─────────────────────
// Each entry: { label, materials[], icon }
const WORK_TYPES = {
  frame:      { label:"Frame Work",       icon:"🪵", materials:["plywood","laminate"] },
  box:        { label:"Box Work",         icon:"📦", materials:["plywood","laminate","hardware"] },
  wardrobe:   { label:"Wardrobe",         icon:"🚪", materials:["plywood","laminate","hardware","handles","glass"] },
  kitchen:    { label:"Kitchen Cabinet",  icon:"🍳", materials:["plywood","laminate","hardware","handles","glass"] },
  tv_unit:    { label:"TV Unit",          icon:"📺", materials:["plywood","laminate","hardware","glass"] },
  crockery:   { label:"Crockery Unit",    icon:"🍽",  materials:["plywood","laminate","hardware","glass"] },
  study:      { label:"Study Table",      icon:"📚", materials:["plywood","laminate","hardware"] },
  ceiling:    { label:"False Ceiling",    icon:"✨", materials:["ceiling","lights"] },
  partition:  { label:"Partition",        icon:"🧱", materials:["plywood","laminate","glass"] },
  foyer:      { label:"Foyer / Entrance", icon:"🚪", materials:["plywood","laminate"] },
  pooja_unit: { label:"Pooja Unit",       icon:"🪔", materials:["plywood","laminate","glass","lights"] },
  mirror:     { label:"Mirror / Glass",   icon:"🪞", materials:["glass"] },
  custom:     { label:"Custom Work",      icon:"🔧", materials:["plywood","laminate","hardware","glass","ceiling","lights","handles"] },
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
  customRooms:[],          // room names extracted from floor plan
  floorPlanUrl:"",         // uploaded floor plan image URL
  floorPlanData:null,       // analysed room data from AI
  floorPlanPending:null,    // detected rooms awaiting user mapping
  referralCode:"",         // this client's own permanent referral code
  appliedReferralCode:"",  // referral code from another customer applied to this project
  referralDiscount:false,  // whether the applied code gives 5% discount
};

const SUPABASE_URL = "https://utctflrqhjzxhzyuhsnn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0Y3RmbHJxaGp6eGh6eXVoc25uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3Mzg0MzYsImV4cCI6MjA5NjMxNDQzNn0.9RC2YnbSnvtWN5EmyzSxuXvzpgV4a-A3YU6iwDBgKhY";
const fmt = (v) => v ? `₹${Number(v).toLocaleString("en-IN")}` : "";

// ── Universal Claude API helper — always goes through /api/claude proxy ──
const callClaude = async ({ system, user, images=[], maxTokens=1000 }) => {
  const msgContent = [];
  images.forEach(({ base64, mediaType }) => {
    msgContent.push({ type:"image", source:{ type:"base64", media_type:mediaType, data:base64 } });
  });
  msgContent.push({ type:"text", text:user });

  const body = {
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    messages: [{ role:"user", content:msgContent }],
  };
  if (system) body.system = system;

  const res = await fetch("/api/claude", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });

  // Read as text first — proxy may return HTML error pages
  const raw = await res.text();
  let data;
  try { data = JSON.parse(raw); }
  catch(_) { throw new Error(`Proxy returned non-JSON (${res.status}): ${raw.slice(0,150)}`); }

  if (!res.ok || data.error) throw new Error(data.error || `Claude API error ${res.status}`);
  const text = data.content?.[0]?.text || "";
  return text;
};

// Parse JSON from Claude response — handles all response formats robustly
const parseClaudeJSON = (text) => {
  if (!text) throw new Error("Empty response from AI");
  // Try 1: direct parse
  try { return JSON.parse(text.trim()); } catch(_) {}
  // Try 2: strip markdown fences
  try { return JSON.parse(text.replace(/```json|```/gi,"").trim()); } catch(_) {}
  // Try 3: extract first { ... } block
  const match = text.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch(_) {} }
  // Try 4: extract first [ ... ] block
  const arrMatch = text.match(/\[[\s\S]*\]/);
  if (arrMatch) { try { return JSON.parse(arrMatch[0]); } catch(_) {} }
  // Try 5: fix common issues — trailing commas, single quotes
  try {
    const fixed = text
      .replace(/```json|```/gi,"")
      .replace(/,\s*([}\]])/g,"$1")   // trailing commas
      .replace(/'/g,'"')               // single → double quotes
      .replace(/(\w+):/g,'"$1":')      // unquoted keys
      .trim();
    const m2 = fixed.match(/\{[\s\S]*\}/);
    if (m2) return JSON.parse(m2[0]);
  } catch(_) {}
  throw new Error(`Could not parse AI response: ${text.slice(0,120)}`);
};

// Returns "Quotation" for Lead, "Order" for all other statuses
const getDocTerm = (status) =>
  (!status || status === "Lead") ? "Quotation" : "Order";

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

// ── iOS Glass Design Tokens ──────────────────────────────────────────
const IOS = {
  blur:    "blur(40px) saturate(200%) brightness(1.1)",
  blurNav: "blur(60px) saturate(220%)",
  glass:   "rgba(255,255,255,0.10)",
  border:  "rgba(255,255,255,0.18)",
  shadow:  "0 8px 32px rgba(0,0,0,0.4),0 2px 8px rgba(0,0,0,0.3),inset 0 1px 0 rgba(255,255,255,0.18)",
  glow:    (c) => `0 0 0 1px ${c}55,0 4px 24px ${c}44,inset 0 1px 0 rgba(255,255,255,0.3)`,
};

const C = {
  // Dark glass palette
  ink:    "rgba(255,255,255,0.95)",
  teal:   "#0A84FF",
  tealL:  "rgba(10,132,255,0.20)",
  sand:   "#0A0A1A",
  white:  "rgba(255,255,255,0.12)",
  line:   "rgba(255,255,255,0.18)",
  muted:  "rgba(255,255,255,0.50)",
  smoke:  "rgba(255,255,255,0.08)",
  green:  "#30D158",
  amber:  "#FF9F0A",
  violet: "#BF5AF2",
  rust:   "#FF453A",
  red:    "#FF453A",
  // Legacy aliases — keep blank page away
  light:  "rgba(255,255,255,0.06)",   // was light smoke bg
  dark:   "rgba(0,0,0,0.25)",         // was dark overlay
  border: "rgba(255,255,255,0.18)",   // was border colour
};

const S = {
  app: {
    minHeight:"100vh",
    background:"linear-gradient(160deg,#0D1B3E 0%,#0A0A1A 40%,#1A0D2E 100%)",
    fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',sans-serif",
    color:"rgba(255,255,255,0.95)",
    position:"relative",
  },
  hdr: {
    background:"rgba(10,10,30,0.6)",
    backdropFilter:IOS.blurNav, WebkitBackdropFilter:IOS.blurNav,
    borderBottom:`1px solid ${IOS.border}`,
    padding:"0 24px", height:54,
    display:"flex", alignItems:"center", justifyContent:"space-between",
    position:"sticky", top:0, zIndex:200,
  },
  logo:  { color:"rgba(255,255,255,0.95)", fontSize:15, fontWeight:700, letterSpacing:0.3 },
  sub:   { color:"rgba(255,255,255,0.45)", fontSize:9, letterSpacing:3,
           marginTop:2, display:"block", textTransform:"uppercase" },
  main:  { maxWidth:1140, margin:"0 auto", padding:"24px 24px 80px 24px", position:"relative", zIndex:1 },
  card:  {
    background: "rgba(255,255,255,0.09)",
    backdropFilter: IOS.blur, WebkitBackdropFilter: IOS.blur,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.2)",
    boxShadow: IOS.shadow,
    position:"relative", overflow:"visible",
  },
  input: {
    width:"100%", padding:"11px 14px", borderRadius:12,
    border:"1px solid rgba(255,255,255,0.25)",
    fontFamily:"inherit", fontSize:14,
    color:"rgba(255,255,255,0.95)",
    background:"rgba(255,255,255,0.12)",
    backdropFilter:IOS.blur, WebkitBackdropFilter:IOS.blur,
    outline:"none", boxSizing:"border-box",
    transition:"border-color 0.18s,box-shadow 0.18s",
  },
  label: {
    fontSize:11, letterSpacing:1.5, color:"rgba(255,255,255,0.7)",
    textTransform:"uppercase", marginBottom:6, display:"block", fontWeight:600,
  },
  row:   { display:"flex", gap:16, marginBottom:18, flexWrap:"wrap" },
  sec:   {
    fontSize:11, fontWeight:700, letterSpacing:2,
    color:"rgba(255,255,255,0.75)", textTransform:"uppercase",
    borderBottom:"1px solid rgba(255,255,255,0.2)",
    paddingBottom:8, marginBottom:16, marginTop:4,
  },
  btn: (v="primary") => ({
    padding:"10px 22px", borderRadius:12, border:"none",
    cursor:"pointer", fontFamily:"inherit", fontSize:12,
    letterSpacing:0.4, fontWeight:600,
    transition:"all 0.18s cubic-bezier(0.25,0.1,0.25,1)",
    backdropFilter:IOS.blur, WebkitBackdropFilter:IOS.blur,
    ...(v==="primary"
      ? { background:"linear-gradient(135deg,#0A84FF,#BF5AF2)", color:"#fff",
          boxShadow:"0 0 20px rgba(10,132,255,0.4),0 4px 12px rgba(0,0,0,0.3)" }
    : v==="dark"
      ? { background:"rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.9)",
          border:`1px solid ${IOS.border}` }
    : v==="ghost"
      ? { background:"rgba(255,255,255,0.06)", color:"rgba(255,255,255,0.6)",
          border:`1px solid ${IOS.border}` }
    : v==="danger"
      ? { background:"rgba(255,69,58,0.18)", color:"#FF453A",
          border:"1px solid rgba(255,69,58,0.35)" }
    : { background:"rgba(10,132,255,0.15)", color:"#0A84FF",
        border:"1px solid rgba(10,132,255,0.35)" }),
  }),
  pill: (active) => ({
    padding:"8px 18px", borderRadius:20, border:"none",
    cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:600,
    letterSpacing:0.2, whiteSpace:"nowrap",
    transition:"all 0.18s cubic-bezier(0.25,0.1,0.25,1)",
    backdropFilter:IOS.blur, WebkitBackdropFilter:IOS.blur,
    background: active ? "rgba(10,132,255,0.3)" : "rgba(255,255,255,0.12)",
    color:       active ? "rgba(255,255,255,0.95)"              : "rgba(255,255,255,0.85)",
    border:      active ? "1px solid rgba(10,132,255,0.5)" : "1px solid rgba(255,255,255,0.2)",
    boxShadow:   active ? IOS.glow("#0A84FF")    : IOS.shadow,
  }),
  // Status badge — coloured pill per status
  badge: (status) => {
    const cfg = {
      Lead:          { bg:"rgba(255,159,10,0.18)",  color:"#FF9F0A", border:"rgba(255,159,10,0.4)"  },
      Active:        { bg:"rgba(10,132,255,0.18)",  color:"#0A84FF", border:"rgba(10,132,255,0.4)"  },
      "In Progress": { bg:"rgba(191,90,242,0.18)",  color:"#BF5AF2", border:"rgba(191,90,242,0.4)"  },
      Completed:     { bg:"rgba(48,209,88,0.18)",   color:"#30D158", border:"rgba(48,209,88,0.4)"   },
      "On Hold":     { bg:"rgba(255,69,58,0.18)",   color:"#FF453A", border:"rgba(255,69,58,0.4)"   },
    }[status] || { bg:"rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.6)", border:"rgba(255,255,255,0.2)" };
    return {
      display:"inline-block", padding:"3px 10px", borderRadius:20,
      fontSize:10, fontWeight:700, letterSpacing:0.5,
      background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`,
    };
  },
  // Tab button — for list filter tabs and form tabs
  tab: (active) => ({
    padding:"8px 18px", borderRadius:20, border:"none",
    cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:600,
    transition:"all 0.18s ease",
    backdropFilter:IOS.blur, WebkitBackdropFilter:IOS.blur,
    background: active ? "rgba(10,132,255,0.3)" : "rgba(255,255,255,0.12)",
    color:       active ? "rgba(255,255,255,0.95)"              : "rgba(255,255,255,0.85)",
    boxShadow:   active ? IOS.glow("#0A84FF")    : IOS.shadow,
    border:      active ? "1px solid rgba(10,132,255,0.5)" : "1px solid rgba(255,255,255,0.2)",
  }),
  td: (i) => ({ padding:"10px 14px", fontSize:13,
        background:i%2===0?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.02)",
        borderBottom:"1px solid rgba(255,255,255,0.07)",
        color:"rgba(255,255,255,0.85)" }),
  th: { padding:"10px 14px", fontSize:10, fontWeight:700, letterSpacing:1.5,
        textTransform:"uppercase", background:"rgba(255,255,255,0.08)",
        color:"rgba(255,255,255,0.7)", borderBottom:"1px solid rgba(255,255,255,0.12)" },
  sTitle: { fontSize:10, fontWeight:700, letterSpacing:2.5, textTransform:"uppercase",
            color:"rgba(255,255,255,0.6)", marginBottom:8, display:"block" },
  bullet: { fontSize:13, lineHeight:2, paddingLeft:16, color:"rgba(255,255,255,0.8)" },
  payRow: { display:"flex", justifyContent:"space-between", alignItems:"center",
            padding:"10px 14px", borderBottom:"1px solid rgba(255,255,255,0.08)" }
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
    ctx.strokeStyle = "#0F1923"; // dark ink — visible on white canvas
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };

  const stopDraw = (e) => { e.preventDefault(); setDrawing(false); };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
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
      <div style={{ background:"#ffffff", borderRadius:4, padding:28, width:"100%", maxWidth:540,
        boxShadow:"0 24px 60px rgba(0,0,0,0.4)" }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:3, color:C.teal,
          textTransform:"uppercase", marginBottom:6 }}>Sign Here</div>
        <div style={{ fontSize:13, color:"#6b7280", marginBottom:16 }}>{label}</div>

        {/* Canvas */}
        <div style={{ border:"2px solid rgba(10,132,255,0.6)", borderRadius:12,
          background:"#ffffff", marginBottom:16, cursor:"crosshair", touchAction:"none",
          boxShadow:"0 4px 20px rgba(0,0,0,0.3)", overflow:"hidden" }}>
          <canvas ref={canvasRef} width={480} height={180}
            style={{ display:"block", width:"100%", height:180, background:"#fff" }}
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}/>
        </div>

        <div style={{ borderTop:`1px solid ${C.line}`, paddingTop:12, marginBottom:16,
          fontSize:11, color:"#6b7280", textAlign:"center" }}>
          Draw your signature above using your finger or stylus
        </div>

        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button className="pill" style={{background:"rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.75)",border:"1px solid rgba(255,255,255,0.16)"}} onClick={clear}>Clear</button>
          <button className="pill" style={{background:"rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.75)",border:"1px solid rgba(255,255,255,0.16)"}} onClick={onClose}>Cancel</button>
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
    <div style={{ position:"fixed", bottom:28, right:28, zIndex:9999, background:"#060812",
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
      <span style={{ fontSize:11, letterSpacing:3, color:"#6b7280", textTransform:"uppercase" }}>Loading</span>
    </div>
  );
}

function Field({ label, children }) {
  return <div style={{ flex:1 }}><label style={S.label}>{label}</label>{children}</div>;
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <select className="glass-input" style={{}} value={value} onChange={e => onChange(e.target.value)}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}


// ── Room Planner — Isometric 3D + Floor Plan ─────────────────────────
function ClientReport({ selected, setView, customers }) {
  const [showSigPad, setShowSigPad] = React.useState(null);
  // Load saved signatures from last audit log entry that has them
  const [signatures, setSignatures] = React.useState({ client:null, hri:null });

  // Load saved signatures from dedicated clientSignatures field
  React.useEffect(() => {
    const sigs = selected.clientSignatures;
    if (sigs && (sigs.clientImg || sigs.hriImg)) {
      setSignatures({
        client: sigs.clientImg || null,
        hri:    sigs.hriImg    || null,
      });
    } else {
      // Fallback: check audit log
      const lastSigEntry = [...(selected.auditLog||[])].reverse()
        .find(e => e.type==="signed" && (e.signatures?.clientImg||e.signatures?.hriImg));
      if (lastSigEntry) {
        setSignatures({
          client: lastSigEntry.signatures?.clientImg || null,
          hri:    lastSigEntry.signatures?.hriImg    || null,
        });
      }
    }
  }, [selected.clientSignatures, selected.auditLog]);
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
             borderBottom:"1px solid #e5e7eb",fontSize:13,fontFamily:"'DM Sans',sans-serif" },
    payRow:{ display:"flex",justifyContent:"space-between",alignItems:"center",
             background:"rgba(255,255,255,0.07)",borderRadius:3,padding:"12px 18px",marginBottom:6,
             border:"1px solid #e5e7eb",fontFamily:"'DM Sans',sans-serif" },
    bullet:{ fontSize:13,lineHeight:2,paddingLeft:16,fontFamily:"'DM Sans',sans-serif" },
    pill:  (bg,c)=>({ background:bg,color:c,padding:"3px 12px",borderRadius:2,
                      fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",
                      fontFamily:"'DM Sans',sans-serif" }),
  };
    return (
    <div style={{ background:"#fff",minHeight:"100vh",
                  fontFamily:"'DM Sans',system-ui,sans-serif",
                  color:"#0F1923",paddingBottom:60 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes slideIn{from{transform:translateX(20px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
      <div className="np" style={{ background:"rgba(6,8,18,0.85)",padding:"12px 36px",display:"flex",gap:12,alignItems:"center",borderBottom:`3px solid ${C.teal}` }}>
        <button onClick={()=>setView("detail")} className="pill" style={{background:"rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.75)",border:"1px solid rgba(255,255,255,0.16)"}}>← Back</button>
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
          const ml = document.createElement("a");
            ml.href = `mailto:${selected.email||""}?subject=${subject}&body=${body}`;
            ml.style.display = "none";
            document.body.appendChild(ml);
            ml.click();
            setTimeout(() => document.body.removeChild(ml), 500);
        }} className="pill" style={{background:"rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.75)",border:"1px solid rgba(255,255,255,0.16)"}}>📧 Email Client</button>
        <span style={{ color:"#6b7280",fontSize:11,marginLeft:"auto" }}>
          {signatures.client&&signatures.hri?"✓ Both signed — ready to print"
            :signatures.client?"Client signed — awaiting HRI"
            :signatures.hri?"HRI signed — awaiting client"
            :"Sign below before printing"}
        </span>
      </div>
      <div style={{ background:"#060812",padding:"28px 48px",marginBottom:36,borderBottom:`3px solid ${C.teal}` }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
          <div>
            <div style={{ color:"#fff",fontSize:20,fontWeight:700,letterSpacing:4,textTransform:"uppercase",fontFamily:"'DM Sans',sans-serif" }}>High Rise Interiors</div>
            <div style={{ color:C.teal,fontSize:10,letterSpacing:5,marginTop:6,textTransform:"uppercase" }}>Project Summary Report</div>
          </div>
          <div style={{ textAlign:"right",color:"#6b7280",fontSize:11,letterSpacing:1 }}><div>{d}</div><div style={{ color:"#fff",fontSize:11,marginTop:4 }}>CONFIDENTIAL</div></div>
        </div>
      </div>
      <div style={{ maxWidth:820,margin:"0 auto",padding:"0 48px" }}>
        {/* Client */}
        <div style={{ marginBottom:32 }}>
          <div style={RS.sTitle}>Client Information</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 32px" }}>
            {[["Client Name",selected.name],["Phone",selected.phone],["Email",selected.email],["Project Type",selected.projectType],["Address",selected.address],["Style",selected.style],["Start Date",selected.startDate],["Duration",selected.timeline]].filter(([,v])=>v).map(([l,v])=>(
              <div key={l} style={RS.row}><span style={{ color:"#6b7280" }}>{l}</span><strong>{v}</strong></div>
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
                  <div key={r} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr", gap:8, padding:"10px 12px", background:i%2===0?"rgba(255,255,255,0.06)":C.light, borderBottom:"1px solid #e5e7eb" }}>
                    <div style={{ fontWeight:700, fontSize:13, color:"#0F1923" }}>🏠 {r}</div>
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
                ) : <div style={{ borderRadius:"0 0 10px 10px", border:"1px solid #e5e7eb", borderTop:"none" }}/>;
              })()}
              {/* Room photos */}
              {(selected.rooms||[]).some(r=>(selected.roomDetails?.[r]?.photos||[]).length>0) && (
                <div style={{ marginTop:16 }}>
                  <div style={{ fontSize:11, letterSpacing:2, color:"#6b7280", textTransform:"uppercase", marginBottom:10 }}>Room Photos</div>
                  {(selected.rooms||[]).map(r => {
                    const photos = selected.roomDetails?.[r]?.photos||[];
                    if (!photos.length) return null;
                      return (
                      <div key={r} style={{ marginBottom:12 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:C.red, marginBottom:6 }}>🏠 {r}</div>
                        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                          {photos.map((p,i)=><img key={i} src={p} alt={r} style={{ width:100, height:100, objectFit:"cover", borderRadius:8, border:"1px solid #d1d5db" }}/>)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div style={{ color:"#6b7280", fontSize:13 }}>No rooms selected</div>
          )}
          {/* Scope notes */}
          {scopeLines.length>0 && (
            <div style={{ marginTop:16 }}>
              <div style={{ fontSize:11, letterSpacing:2, color:"#6b7280", textTransform:"uppercase", marginBottom:8 }}>Work Description</div>
              {scopeLines.map((l,i)=><div key={i} style={RS.bullet}>• {l}</div>)}
            </div>
          )}

          {/* Room Photos in Client Report */}
          {(selected.rooms||[]).some(r=>(selected.roomDetails?.[r]?.photos||[]).length>0) && (
            <div style={{ marginTop:20 }}>
              <div style={{ fontSize:11, letterSpacing:2, color:"#6b7280", textTransform:"uppercase", marginBottom:14 }}>Room Reference Photos</div>
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
                            objectFit:"cover", borderRadius:3, border:"1px solid #e5e7eb" }}/>
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
                <div key={room} style={{ marginBottom:16, border:"1px solid #e5e7eb", borderRadius:3, overflow:"hidden" }}>
                  {/* Room header */}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                    background:"#060812", padding:"10px 16px" }}>
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
                        padding:"9px 14px", background:i%2===0?"#ffffff":"#f8f9fa",
                        borderTop:`1px solid ${C.line}`, alignItems:"center" }}>
                        <div style={{ fontSize:11, color:"#6b7280", fontWeight:700,
                          textTransform:"uppercase", letterSpacing:1 }}>{MATERIAL_LABELS[matType]}</div>
                        <div style={{ fontSize:12, fontWeight:600, color:"#0F1923" }}>{sel.name}</div>
                        <div style={{ fontSize:12, color:"#6b7280" }}>
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
            <div style={{ background:"rgba(255,69,58,0.08)",borderRadius:3,padding:"16px 20px",border:"1px solid #FECACA" }}>
              {outOfScope.map((l,i)=><div key={i} style={{ ...RS.bullet,color:"#7A0000" }}>✗ {l}</div>)}
            </div>
          </div>
        )}
        {/* Budget */}
        <div style={{ marginBottom:32 }}>
          <div style={RS.sTitle}>Budget Summary</div>
          {selected.previousQuotation && (
            <div style={RS.row}>
              <span style={{ color:"#6b7280" }}>Previous Quotation</span>
              <span style={{ textDecoration: selected.revisedQuotation?"line-through":"none", color:"#6b7280" }}>{fmt(selected.previousQuotation)}</span>
            </div>
          )}
          {selected.rebateValue && (
            <div style={{ background:"rgba(48,209,88,0.15)", borderRadius:3, padding:"10px 14px", margin:"6px 0", border:"1px solid #86EFAC" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ color:"#30D158", fontWeight:700 }}>
                  🎁 Rebate Applied {selected.appliedReferralCode && `(Referral: ${selected.appliedReferralCode})`}
                </span>
                <span style={{ color:"#30D158", fontWeight:700 }}>
                  - {selected.rebateType==="percent" ? `${selected.rebateValue}%` : fmt(selected.rebateValue)}
                  {selected.previousQuotation && ` = - ${fmt(selected.rebateType==="percent" ? Math.round(Number(selected.previousQuotation)*Number(selected.rebateValue)/100) : Number(selected.rebateValue))}`}
                </span>
              </div>
            </div>
          )}
          {selected.referralCode && (
            <div style={{ background:"rgba(48,209,88,0.15)", borderRadius:3, padding:"14px 18px", margin:"8px 0", border:"1px solid #86EFAC" }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#30D158", letterSpacing:2, marginBottom:10, textTransform:"uppercase" }}>🎁 Your Referral Code</div>
              <div style={{ fontSize:24, fontWeight:800, letterSpacing:5, color:"#30D158", fontFamily:"monospace", marginBottom:8 }}>{selected.referralCode}</div>
              <div style={{ fontSize:12, color:"#30D158", lineHeight:1.9 }}>
                <div>• Share this code with friends & family</div>
                <div>• Referred friend gets <strong>5% off</strong> their High Rise Interiors project</div>
                <div>• You earn <strong>5% cashback</strong> credited on your next payment</div>
              </div>
            </div>
          )}
          {selected.revisedQuotation && (
            <div style={RS.row}>
              <span style={{ color:"#6b7280" }}>Revised Quotation (After Rebate)</span>
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
            <div style={{ background:"rgba(255,255,255,0.07)",borderRadius:12,padding:"16px 20px",border:"1px solid #e5e7eb" }}>
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
                  <div style={{ fontSize:12,color:"#6b7280",marginTop:2 }}>{p.pct}% of total value</div>
                </div>
              </div>
              <strong style={{ fontSize:16,color:"#0F1923" }}>{selected.quotation ? fmt(Math.round(Number(selected.quotation)*p.pct/100)) : `${p.pct}%`}</strong>
            </div>
          ))}
          <div style={{ background:"rgba(255,255,255,0.07)",borderRadius:10,padding:"14px 18px",border:"1px solid #e5e7eb",fontSize:13,lineHeight:2,color:"#4A2A2A",marginTop:12 }}>
            <div>• Payments via <strong>Bank Transfer / Cheque</strong> in favour of <strong>High Rise Interiors</strong></div>
            <div>• Work commences only after advance payment (35%) is received</div>
            <div>• Each phase must be cleared before proceeding to next</div>
            <div>• GST @ 18% applicable as per government norms</div>
          </div>
        </div>
        {/* Disclaimers */}
        <div style={{ marginBottom:32 }}>
          <div style={RS.sTitle}>Disclaimers & Terms</div>
          <div style={{ background:"rgba(255,255,255,0.06)",borderRadius:12,padding:"20px 24px",border:`1.5px solid #E8E0C0`,fontSize:13,lineHeight:2.1,color:"#4A4A2A" }}>
            <div style={{ background:"rgba(255,69,58,0.08)",border:"1px solid #FECACA",borderRadius:3,padding:"10px 14px",marginBottom:12,color:C.rust,fontWeight:700 }}>
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
                // Save signatures in dedicated column + metadata in audit_log
                // Strip large image data from audit_log to keep it small
                const auditForDB = updatedLog.map(e => ({
                  ...e,
                  signatures: e.signatures ? {
                    client: !!e.signatures.clientImg || !!e.signatures.client,
                    hri:    !!e.signatures.hriImg    || !!e.signatures.hri,
                  } : undefined
                }));
                const sigsForDB = {
                  clientImg: newSigs.client || null,
                  hriImg:    newSigs.hri    || null,
                  savedAt:   new Date().toISOString(),
                };
                const res = await fetch(`https://utctflrqhjzxhzyuhsnn.supabase.co/rest/v1/customers?id=eq.${selected.id}`, {
                  method:"PATCH",
                  headers:{
                    "apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0Y3RmbHJxaGp6eGh6eXVoc25uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3Mzg0MzYsImV4cCI6MjA5NjMxNDQzNn0.9RC2YnbSnvtWN5EmyzSxuXvzpgV4a-A3YU6iwDBgKhY",
                    "Authorization":`Bearer ${tok}`,
                    "Content-Type":"application/json",
                    "Prefer":"return=minimal"
                  },
                  body: JSON.stringify({
                    audit_log:         JSON.stringify(auditForDB),
                    client_signatures: JSON.stringify(sigsForDB),
                  })
                });
                if (!res.ok) {
                  const err = await res.json().catch(()=>({}));
                  console.error("Signature save HTTP error:", res.status, err);
                  showToast(`Signature save failed: ${err.message||res.status}`, "error");
                } else {
                  showToast("✍ Signature saved", "success");
                  // Update customers list so signatures reload immediately
                  setCustomers(prev => prev.map(c =>
                    c.id===selected.id ? { ...c, auditLog: updatedLog, clientSignatures: sigsForDB } : c
                  ));
                }
              } catch(e) {
                console.error("Signature save error:", e);
                showToast("Signature save failed — check connection", "error");
              }
            }}
            onClose={()=>setShowSigPad(null)}
          />
        )}
        {/* Signature blocks */}
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:32,marginBottom:32 }}>
          <div style={{ borderTop:`2px solid ${C.ink}`,paddingTop:12 }}>
            <div style={{ fontSize:10,color:"#6b7280",letterSpacing:2,textTransform:"uppercase",marginBottom:6 }}>Client Signature</div>
            <div style={{ fontSize:14,fontWeight:700,marginBottom:12 }}>{selected.name}</div>
            {signatures.client ? (
              <div>
                <img src={signatures.client} alt="sig"
                  style={{ height:80,maxWidth:"100%",border:"1px solid #e5e7eb",borderRadius:3,background:"rgba(255,255,255,0.06)",display:"block" }}/>
                <div style={{ fontSize:10,color:"#6b7280",marginTop:4 }}>{new Date().toLocaleDateString("en-IN")}</div>
                <button className="no-print" style={{ ...S.btn("ghost"),fontSize:10,padding:"4px 10px",marginTop:6 }}
                  onClick={()=>setSignatures(s=>({...s,client:null}))}>✕ Clear</button>
              </div>
            ):(
              <div>
                <div style={{ height:64,border:`1.5px dashed ${C.line}`,borderRadius:3,
                  display:"flex",alignItems:"center",justifyContent:"center",marginBottom:8,background:"#f8f9fa" }}>
                  <span style={{ fontSize:11,color:"#6b7280" }}>Tap to sign</span>
                </div>
                <button className="no-print" style={{ ...S.btn(),fontSize:11,padding:"7px 16px" }}
                  onClick={()=>setShowSigPad("client")}>✍ Sign Here</button>
              </div>
            )}
          </div>
          <div style={{ borderTop:`2px solid ${C.teal}`,paddingTop:12 }}>
            <div style={{ fontSize:10,color:"#6b7280",letterSpacing:2,textTransform:"uppercase",marginBottom:6 }}>Authorised by</div>
            <div style={{ fontSize:14,fontWeight:700,color:C.teal,marginBottom:12 }}>High Rise Interiors</div>
            {signatures.hri ? (
              <div>
                <img src={signatures.hri} alt="sig"
                  style={{ height:80,maxWidth:"100%",border:"1px solid #e5e7eb",borderRadius:3,background:"rgba(255,255,255,0.06)",display:"block" }}/>
                <div style={{ fontSize:10,color:"#6b7280",marginTop:4 }}>{new Date().toLocaleDateString("en-IN")}</div>
                <button className="no-print" style={{ ...S.btn("ghost"),fontSize:10,padding:"4px 10px",marginTop:6 }}
                  onClick={()=>setSignatures(s=>({...s,hri:null}))}>✕ Clear</button>
              </div>
            ):(
              <div>
                <div style={{ height:64,border:`1.5px dashed ${C.line}`,borderRadius:3,
                  display:"flex",alignItems:"center",justifyContent:"center",marginBottom:8,background:"#f8f9fa" }}>
                  <span style={{ fontSize:11,color:"#6b7280" }}>Tap to sign</span>
                </div>
                <button className="no-print" style={{ ...S.btn("ghost"),fontSize:11,padding:"7px 16px" }}
                  onClick={()=>setShowSigPad("hri")}>✍ Sign Here</button>
              </div>
            )}
          </div>
        </div>
        {/* Footer */}
        <div style={{ borderTop:`2px solid ${C.line}`,paddingTop:16,marginTop:24 }}>
          <div style={{ display:"flex",justifyContent:"space-between",fontSize:12,color:"#6b7280",marginBottom:6 }}>
            <span>High Rise Interiors — Powered by Genovatech IT Services Pvt. Ltd.</span>
            <span>{d}</span>
          </div>
          <div style={{ fontSize:11,color:"rgba(255,255,255,0.1)",textAlign:"center",lineHeight:1.8 }}>
            Confidential — intended solely for {selected.name}. All payments are non-refundable. Prices in INR ₹.
          </div>
        </div>
      </div>
    </div>
  );
  }



// ── iOS Glass visual helpers ─────────────────────────────────────────
const Orbs = () => (
  <div style={{position:"fixed",inset:0,zIndex:0,overflow:"hidden",pointerEvents:"none"}}>
    <div style={{position:"absolute",top:"-20%",left:"-10%",width:"70%",height:"70%",
      background:"radial-gradient(ellipse,rgba(10,100,255,0.4) 0%,transparent 70%)",filter:"blur(80px)"}}/>
    <div style={{position:"absolute",top:"5%",right:"-15%",width:"60%",height:"60%",
      background:"radial-gradient(ellipse,rgba(120,40,220,0.3) 0%,transparent 70%)",filter:"blur(80px)"}}/>
    <div style={{position:"absolute",bottom:"-10%",left:"20%",width:"60%",height:"50%",
      background:"radial-gradient(ellipse,rgba(0,140,200,0.2) 0%,transparent 70%)",filter:"blur(80px)"}}/>
  </div>
);
const Shine = () => (
  <div style={{position:"absolute",top:0,left:0,right:0,height:"50%",pointerEvents:"none",
    background:"linear-gradient(180deg,rgba(255,255,255,0.13) 0%,rgba(255,255,255,0) 100%)",
    borderRadius:"20px 20px 0 0",zIndex:0}}/>
);

export default function App({ token, user, onLogout, onSessionExpired }) {
  const [customers,    setCustomers]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [isOnline,     setIsOnline]     = useState(navigator.onLine);
  const [offlineQ,     setOfflineQ]     = useState(()=>{try{return JSON.parse(localStorage.getItem("hri_q")||"[]");}catch{return [];}});
  const pendingSync = offlineQ.length;
  const [view,         setView]         = useState("list");
  const [form,         setForm]         = useState(EMPTY);
  const [selectedId,   setSelectedId]   = useState(null);
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [activeTab,    setActiveTab]    = useState("personal");
  const [toast,        setToast]        = useState(null);
  const [connected,    setConnected]    = useState(false);

  const showToast = (msg, type="success", duration=4000) => { setToast({msg,type}); setTimeout(()=>setToast(null),duration); };

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
  useEffect(()=>{
    const up  =()=>{ setIsOnline(true);  showToast("🌐 Back online — syncing…","success",3000); syncQ(); };
    const down=()=>{ setIsOnline(false); showToast("📴 Offline — changes saved locally","warning",4000); };
    window.addEventListener("online", up);
    window.addEventListener("offline",down);
    return ()=>{ window.removeEventListener("online",up); window.removeEventListener("offline",down); };
  },[]);
  useEffect(()=>{
    const up  =()=>{ setIsOnline(true);  showToast("🌐 Back online — syncing…","success",3000); syncQ(); };
    const down=()=>{ setIsOnline(false); showToast("📴 Offline — changes saved locally","warning",4000); };
    window.addEventListener("online", up);
    window.addEventListener("offline",down);
    return ()=>{ window.removeEventListener("online",up); window.removeEventListener("offline",down); };
  },[]);

  // ── Open edit — explicitly map every field ────────────────────────
  // ── Send welcome email via device mail app ───────────────────────────
  const sendWelcomeEmail = (client) => {
    if (!client.email) { showToast("No email address for this client", "warning"); return; }
    const validTill = new Date();
    validTill.setDate(validTill.getDate() + 3);
    const validDate = validTill.toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric" });
    const today = new Date().toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric" });
    const docTerm   = getDocTerm(client.status);
    const quotation = client.quotation ? `₹${Number(client.quotation).toLocaleString("en-IN")}` : "As discussed";
    const quoteRef = `HRI-Q-${String(client.id||"XXXX").slice(-6).padStart(6,"0")}-${new Date().getFullYear()}`;

    const subject = encodeURIComponent(
      `Welcome to High Rise Interiors — ${docTerm} ${quoteRef}`
    );

    const body = encodeURIComponent(
`Dear ${client.name},

Welcome to High Rise Interiors! We are pleased to share your project quotation.

${docTerm} Ref   : ${quoteRef}
Total Value     : ${quotation}

⚠️ This ${docTerm.toLowerCase()} is valid until ${validDate} (3 days from today).
Please confirm before this date to lock in the current pricing.

Kindly find the detailed project report attached to this email.

Warm regards,
High Rise Interiors
Hyderabad, Telangana`
    );

    // Remind user to attach the PDF report
    showToast("📎 Please attach the Client Report PDF before sending", "info");

    // Open mail app without navigating away from the CRM
    const mailLink = document.createElement("a");
    mailLink.href = `mailto:${client.email}?subject=${subject}&body=${body}`;
    mailLink.click();

    // Log email sent in audit trail
    const emailEntry = makeEntry(
      "note",
      `Welcome email sent to ${client.email} — ${docTerm} ${quoteRef} valid till ${validDate}`,
      { quotation: client.quotation, status: client.status, quoteRef, validTill: validDate }
    );
    const updatedLog = [...(client.auditLog||[]), emailEntry];
    saveAuditEntry(client.id, client.auditLog, emailEntry);
    setCustomers(prev => prev.map(c => c.id===client.id ? {...c, auditLog: updatedLog} : c));
    showToast("📧 Mail app opened — remember to attach the Client Report PDF", "success");
  };

  // ── Status Change Email Agent ─────────────────────────────────────────
  // Triggered automatically whenever client status changes
  const statusEmailAgent = (client, oldStatus, newStatus) => {
    if (!client.email) {
      showToast("No email — add client email first", "error"); return;
    }

    const agentDocTerm = (!newStatus||newStatus==="Lead") ? "Quotation" : "Order";
    const refPrefix    = (!newStatus||newStatus==="Lead") ? "HRI-Q" : "HRI-O";
    const quoteRef     = `${refPrefix}-${String(client.id||"").slice(-6).padStart(6,"0")}-${new Date().getFullYear()}`;
    const quotation    = client.quotation ? `₹${Number(client.quotation).toLocaleString("en-IN")}` : "As discussed";
    const validTill    = new Date(); validTill.setDate(validTill.getDate()+3);
    const validDate    = validTill.toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"});
    const advance      = client.quotation ? `₹${Math.round(Number(client.quotation)*0.35).toLocaleString("en-IN")}` : "35% of total";
    const project      = `${client.projectType||"Interior"} at ${client.address||"your property"}`;

    // Context-rich templates per status
    const EMAILS = {
      Lead: {
        sub: `Your Interior Design Quotation — ${quoteRef} | High Rise Interiors`,
        body:
`Dear ${client.name},

Thank you for choosing High Rise Interiors! We are delighted to present your quotation.

Quotation Ref : ${quoteRef}
Project       : ${project}
Total Value   : ${quotation}
Valid Until   : ${validDate} (3 days only)

To confirm, please make the advance payment of ${advance}.
Kindly find the detailed project report attached.

Warm regards,
High Rise Interiors, Hyderabad`
      },
      Active: {
        sub: `Project Confirmed — ${quoteRef} | High Rise Interiors`,
        body:
`Dear ${client.name},

Your project is confirmed! We are excited to begin.

Order Ref     : ${quoteRef}
Project       : ${project}
Total Value   : ${quotation}

Next Steps:
1. Make advance payment of ${advance} to start work
2. Our team will call you within 24 hours
3. Site visit within 48 hours

Please find the project report attached.

Warm regards,
High Rise Interiors, Hyderabad`
      },
      "In Progress": {
        sub: `Project Update — ${quoteRef} | High Rise Interiors`,
        body:
`Dear ${client.name},

Your interior project (${quoteRef}) is progressing well.

Project : ${project}

Our team is working hard to deliver your dream space on schedule. Please feel free to call us anytime for a site visit or update.

Warm regards,
High Rise Interiors, Hyderabad`
      },
      Completed: {
        sub: `Project Complete! 🎉 — ${quoteRef} | High Rise Interiors`,
        body:
`Dear ${client.name},

Congratulations! Your project (${quoteRef}) is complete. We hope you love your new space!

Project : ${project}

We'd love your feedback. Share us with friends using your referral code: ${client.referralCode||"contact us"} and earn 5% cashback!

Thank you for trusting High Rise Interiors.

Warm regards,
High Rise Interiors, Hyderabad`
      },
      "On Hold": {
        sub: `Project On Hold — ${quoteRef} | High Rise Interiors`,
        body:
`Dear ${client.name},

We acknowledge that your project (${quoteRef}) is on hold.

Your details are safely saved. Whenever you are ready to resume, we will pick up right where we left off.

We are here whenever you need us.

Warm regards,
High Rise Interiors, Hyderabad`
      },
    };

    const tmpl = EMAILS[newStatus] || EMAILS.Lead;

    // Open Mail app immediately with template — no async, no waiting
    const subEnc  = encodeURIComponent(tmpl.sub);
    const bodyEnc = encodeURIComponent(tmpl.body);
    const href    = `mailto:${client.email}?subject=${subEnc}&body=${bodyEnc}`;

    // Must append to body for iOS Safari
    const a = document.createElement("a");
    a.href   = href;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { try { document.body.removeChild(a); } catch(_){} }, 500);

    showToast(`📧 Mail app opened for ${client.name} — attach report PDF`, "success", 6000);

    // Log to audit trail
    const entry = makeEntry("note",
      `Email sent: ${newStatus} — ${client.email}`,
      { status: newStatus, quotation: client.quotation, quoteRef }
    );
    saveAuditEntry(client.id, client.auditLog, entry);
    setCustomers(prev => prev.map(c =>
      c.id===client.id ? {...c, auditLog:[...(c.auditLog||[]), entry]} : c
    ));
  };


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
      customRooms:         c.customRooms         || [],
      floorPlanUrl:        c.floorPlanUrl        || "",
      floorPlanData:       c.floorPlanData       || null,
      floorPlanPending:    c.floorPlanPending    || null,
      auditLog:            c.auditLog            || [],
      inventory:           c.inventory           || {},
      referralCode:        c.referralCode        || "",
      clientAccessCode:    c.clientAccessCode    || "",
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

  // ── Sync offline queue when back online ─────────────────────────────
  const syncOfflineQueue = async () => {
    const queue = JSON.parse(localStorage.getItem("hri_offline_queue")||"[]");
    if (!queue.length) return;
    let synced = 0, failed = 0;
    for (const item of queue) {
      try {
        if (item.type === "upsert") {
          await upsertCustomer(item.data);
          synced++;
        }
      } catch(e) { failed++; }
    }
    // Remove synced items (remove all if no failures)
    if (failed === 0) {
      localStorage.removeItem("hri_offline_queue");
      setOfflineQueue([]);
      showToast(`✅ Synced ${synced} offline change${synced>1?"s":""} to database`,"success",4000);
    } else {
      showToast(`⚠️ Synced ${synced}, failed ${failed} — will retry when online`,"warning",4000);
    }
    fetchCustomers();
  };

  // ── Save to offline queue ─────────────────────────────────────────
  const queueOffline = (formData) => {
    const entry = { type:"upsert", data:formData, ts:Date.now(), name:formData.name };
    const queue = JSON.parse(localStorage.getItem("hri_offline_queue")||"[]");
    // Replace existing entry for same client if present
    const idx = queue.findIndex(q => q.data.id === formData.id);
    if (idx >= 0) queue[idx] = entry; else queue.push(entry);
    localStorage.setItem("hri_offline_queue", JSON.stringify(queue));
    setOfflineQueue([...queue]);
  };

  const syncQ = async () => {
    const q = JSON.parse(localStorage.getItem("hri_q")||"[]");
    if (!q.length) return;
    let ok=0, fail=0;
    for (const item of q) {
      try {
        const row = toRow(item.data);
        if (item.data.id) {
          await safeCall(t => sb(`${TABLE}?id=eq.${item.data.id}`,"PATCH",row,t));
        } else {
          await safeCall(t => sb(TABLE,"POST",row,t));
        }
        ok++;
      } catch { fail++; }
    }
    if (fail===0) { localStorage.removeItem("hri_q"); setOfflineQ([]); showToast(`✅ Synced ${ok} change${ok>1?"s":""}`, "success", 4000); }
    else { showToast(`⚠️ Synced ${ok}, failed ${fail} — will retry`, "warning", 4000); }
    fetchCustomers();
  };

  const queueSave = (data) => {
    const q = JSON.parse(localStorage.getItem("hri_q")||"[]");
    const idx = q.findIndex(x => x.data.id === data.id);
    const entry = { data, ts: Date.now() };
    if (idx >= 0) q[idx] = entry; else q.push(entry);
    localStorage.setItem("hri_q", JSON.stringify(q));
    setOfflineQ([...q]);
  };

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
        const newRef = `HRI-Q-${String(Date.now()).slice(-6)}-${new Date().getFullYear()}`;
        auditEntry = makeEntry("created", `Client created — ${formToSave.name} · Ref: ${newRef}`, {
          status: formToSave.status,
          quotation: formToSave.quotation,
          rooms: formToSave.rooms,
          ref: newRef,
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
          const updRef = formToSave.id
            ? `${(!formToSave.status||formToSave.status==="Lead")?"HRI-Q":"HRI-O"}-${String(formToSave.id).slice(-6).padStart(6,"0")}-${new Date().getFullYear()}`
            : "";
          auditEntry = makeEntry(type,
            `Updated: ${changes.slice(0,3).join(" · ")+(changes.length>3?` +${changes.length-3} more`:"")}${updRef?` · Ref: ${updRef}`:""}`,
            { status: formToSave.status, quotation: formToSave.quotation, changes, ref: updRef }
          );
        }
      }

      // Append audit entry to log
      if (auditEntry) {
        formToSave.auditLog = [...(formToSave.auditLog||[]), auditEntry];
      }

      // ── Offline: queue and optimistic update ──────────────────────
      if (!navigator.onLine) {
        queueSave(formToSave);
        setCustomers(prev => {
          const i = prev.findIndex(c => c.id === formToSave.id);
          const u = {...formToSave, _offline: true};
          return i >= 0 ? prev.map((c,j) => j===i ? u : c) : [...prev, {...u, id:"off-"+Date.now()}];
        });
        showToast("📴 Saved offline — syncs when connected", "warning", 3000);
        setSaving(false); setView("list"); return;
      }
      const row = toRow(formToSave);
      const statusChanged = existingClient && existingClient.status !== formToSave.status;

      if (formToSave.id) {
        await safeCall(t => sb(`${TABLE}?id=eq.${formToSave.id}`, "PATCH", row, t));
        await fetchCustomers();
        showToast("✓ Client updated", "success");

        if (statusChanged) {
          showToast(`🔄 Status → ${formToSave.status} · Preparing email…`, "info");
          setView("list");
          // Small delay to let navigation settle before opening mail
          setTimeout(() => {
            statusEmailAgent(formToSave, existingClient.status, formToSave.status);
          }, 800);
        } else {
          setView("list");
        }

      } else {
        const result = await safeCall(t => sb(TABLE, "POST", row, t));
        let savedClient = {...formToSave};
        if (result && result[0]?.id) {
          const realCode = genReferralCode(result[0].id);
          await safeCall(t => sb(`${TABLE}?id=eq.${result[0].id}`, "PATCH", { referral_code: realCode }, t));
          savedClient = { ...formToSave, id: result[0].id, referralCode: realCode };
        }
        await fetchCustomers();
        showToast("✓ Client saved", "success");
        setView("list");

        if (formToSave.email) {
          showToast("📧 Composing welcome email…", "info");
          setTimeout(() => {
            statusEmailAgent(savedClient, "New", "Lead");
          }, 600);
        }
      }
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
  const TABS = ["personal","rooms","quotation","notes","inventory"];

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
      page:   { background:"#fff", minHeight:"100vh", fontFamily:"'DM Sans',system-ui,sans-serif", color:"#0F1923", paddingBottom:60 },
      hdr:    { background:"#060812", padding:"20px 48px", marginBottom:0, borderBottom:`3px solid ${C.teal}` },
      body:   { maxWidth:920, margin:"0 auto", padding:"32px 48px" },
      sec:    { fontSize:10, fontWeight:700, letterSpacing:3, textTransform:"uppercase", color:C.teal,
               borderBottom:`2px solid ${C.teal}`, paddingBottom:6, marginBottom:14, marginTop:28 },
      th:     { padding:"8px 12px", fontSize:10, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase",
               background:"#060812", color:"#fff" },
      td:     (i) => ({ padding:"9px 12px", fontSize:12, background:i%2===0?"#ffffff":"#f8f9fa", borderBottom:"1px solid #e5e7eb" }),
      tag:    (c) => ({ background:c, color:"#fff", padding:"2px 8px", borderRadius:2, fontSize:9, fontWeight:700, letterSpacing:1, textTransform:"uppercase" }),
    };

    return (
      <div style={IR.page}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap'); @media print{.np{display:none!important}}`}</style>

        {/* Toolbar */}
        <div className="np" style={{ background:"#060812", padding:"12px 36px", display:"flex", gap:12, alignItems:"center", borderBottom:`3px solid ${C.teal}` }}>
          <button onClick={()=>setView("detail")} className="pill" style={{background:"rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.75)",border:"1px solid rgba(255,255,255,0.16)"}}>← Back</button>
          <button onClick={()=>window.print()} style={S.btn()}>🖨 Print</button>
          <span style={{ background:"rgba(255,159,10,0.15)", color:"#5C3A00", padding:"3px 10px", borderRadius:2, fontSize:10, fontWeight:700, letterSpacing:1, textTransform:"uppercase" }}>🔒 INTERNAL — Do not share with client</span>
        </div>

        {/* Header */}
        <div style={IR.hdr}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
            <div>
              <div style={{ color:"#fff", fontSize:18, fontWeight:700, letterSpacing:4, textTransform:"uppercase" }}>High Rise Interiors</div>
              <div style={{ color:C.teal, fontSize:10, letterSpacing:5, marginTop:6, textTransform:"uppercase" }}>Internal Work Order & Material Report</div>
            </div>
            <div style={{ textAlign:"right", color:"#6b7280", fontSize:11 }}>
              <div>{d}</div>
              <div style={{ color:"rgba(255,159,10,0.15)", fontSize:10, marginTop:4, fontWeight:700, letterSpacing:1 }}>⚠ CONFIDENTIAL — TEAM ONLY</div>
            </div>
          </div>
        </div>

        <div style={IR.body}>

          {/* Client Summary */}
          <div style={IR.sec}>Client & Project Summary</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 40px", border:"1px solid #e5e7eb", borderRadius:3, padding:"16px 20px", background:"#f8f9fa" }}>
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
              <div key={l} style={{ display:"flex", gap:8, padding:"5px 0", borderBottom:"1px solid #e5e7eb", fontSize:12 }}>
                <span style={{ color:"#6b7280", minWidth:100 }}>{l}</span>
                <strong>{v}</strong>
              </div>
            ))}
          </div>

          {/* Rooms & Dimensions */}
          <div style={IR.sec}>Room Dimensions</div>
          <div style={{ border:"1px solid #e5e7eb", borderRadius:3, overflow:"hidden" }}>
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
              <div style={{ border:"1px solid #e5e7eb", borderRadius:3, overflow:"hidden" }}>
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
              <div style={{ border:"1px solid #e5e7eb", borderRadius:3, overflow:"hidden" }}>
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
                    <div style={{ ...IR.td(i), fontSize:11, color:"#6b7280" }}>{[...new Set(m.rooms)].join(", ")}</div>
                  </div>
                ))}
                <div style={{ display:"grid", gridTemplateColumns:"0.5fr 2fr 3fr 1fr 2fr", background:"rgba(255,255,255,0.07)", borderTop:`2px solid ${C.teal}` }}>
                  <div style={{ padding:"10px 12px", gridColumn:"1/4", fontWeight:700, fontSize:12, color:"#0F1923" }}>Total Items to Order</div>
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
                            objectFit:"cover", borderRadius:3, border:"1px solid #e5e7eb" }}/>
                          <div style={{ fontSize:9, color:"#6b7280", marginTop:4, textAlign:"center" }}>
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
                      {[["Installed","#8B5CF6"],["Delivered","#10B981"],["Ordered","#3B82F6"],["Pending","#FF9F0A"]].map(([s,col])=>(
                        counts[s]>0 && <div key={s} style={{ flex:counts[s], background:col }}/>
                      ))}
                    </div>
                    {[["Pending","#92400E","rgba(255,159,10,0.15)"],["Ordered","#1E40AF","rgba(10,132,255,0.15)"],["Delivered","#065F46","rgba(48,209,88,0.12)"],["Installed","#4C1D95","rgba(191,90,242,0.15)"]].map(([s,c,bg])=>(
                      <span key={s} style={{ background:bg, color:c, padding:"2px 10px", borderRadius:2, fontSize:10, fontWeight:700 }}>{counts[s]} {s}</span>
                    ))}
                    <span style={{ fontSize:11, color:"#6b7280" }}>{counts.Installed}/{total} complete</span>
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
                  <div key={room} style={{ marginBottom:16, border:"1px solid #e5e7eb", borderRadius:3, overflow:"hidden" }}>
                    <div style={{ background:"#060812", padding:"8px 14px", display:"flex", justifyContent:"space-between" }}>
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
                        Pending:   { bg:"rgba(255,159,10,0.15)", c:"#92400E" },
                        Ordered:   { bg:"rgba(10,132,255,0.15)", c:"#1E40AF" },
                        Delivered: { bg:"rgba(48,209,88,0.12)", c:"#065F46" },
                        Installed: { bg:"rgba(191,90,242,0.15)", c:"#4C1D95" },
                      }[inv.status||"Pending"];
                      return (
                        <div key={i} style={{ display:"grid", gridTemplateColumns:"2fr 2fr 1fr 1fr 1fr 1fr 2fr",
                          padding:"9px 14px", background:i%2===0?"#ffffff":"#f8f9fa", borderTop:`1px solid ${C.line}`, alignItems:"center" }}>
                          <div style={IR.td(i)}><span style={IR.tag(C.teal)}>{MATERIAL_LABELS[matType]}</span></div>
                          <div style={{ ...IR.td(i), fontWeight:600 }}>{sel.name}</div>
                          <div style={IR.td(i)}>{sel.qty} {item?.unit||""}</div>
                          <div style={{ padding:"9px 14px" }}>
                            <span style={{ ...sc, padding:"3px 8px", borderRadius:2, fontSize:9, fontWeight:700, letterSpacing:1, textTransform:"uppercase" }}>
                              {inv.status||"Pending"}
                            </span>
                          </div>
                          <div style={{ ...IR.td(i), fontSize:10, color:"#6b7280" }}>{inv.orderedDate||"—"}</div>
                          <div style={{ ...IR.td(i), fontSize:10, color:"#6b7280" }}>{inv.deliveredDate||"—"}</div>
                          <div style={{ ...IR.td(i), fontSize:11, color:"#6b7280" }}>{inv.notes||""}</div>
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
              <div style={{ background:"rgba(255,255,255,0.07)", borderRadius:3, padding:"16px 20px", border:"1px solid #e5e7eb", fontSize:13, lineHeight:2, whiteSpace:"pre-wrap" }}>
                {selected.notes}
              </div>
            </>
          )}

          {/* Footer */}
          <div style={{ borderTop:`2px solid ${C.line}`, paddingTop:16, marginTop:40, display:"flex", justifyContent:"space-between", fontSize:11, color:"#6b7280" }}>
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
      th:    (bg="#1e293b") => ({ padding:"8px 12px", fontSize:9, fontWeight:700, letterSpacing:1.5,
               textTransform:"uppercase", background:bg, color:"#fff" }),
      td:    (i) => ({ padding:"9px 12px", fontSize:12, background:i%2===0?"#ffffff":"#f8f9fa",
               borderBottom:"1px solid #e5e7eb", verticalAlign:"top" }),
      badge: (s) => {
        const m = { Pending:{bg:"rgba(255,159,10,0.15)",c:"#92400E"}, Ordered:{bg:"rgba(10,132,255,0.15)",c:"#1E40AF"},
                    Delivered:{bg:"rgba(48,209,88,0.12)",c:"#065F46"}, Installed:{bg:"rgba(191,90,242,0.15)",c:"#4C1D95"} };
        const x = m[s]||m.Pending;
        return { background:x.bg, color:x.c, padding:"2px 8px", borderRadius:2,
                 fontSize:9, fontWeight:700, letterSpacing:1, textTransform:"uppercase" };
      },
    };

    const MatTable = ({ items, title, color="rgba(255,255,255,0.95)" }) => {
      if (!items.length) return null;
      return (
        <div style={{ marginBottom:20 }}>
          <div style={{ background:color, padding:"10px 14px", borderRadius:"3px 3px 0 0",
            display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ color:"#fff", fontWeight:700, fontSize:13 }}>{title}</span>
            <span style={{ color:"rgba(255,255,255,0.7)", fontSize:11 }}>{items.length} item{items.length!==1?"s":""}</span>
          </div>
          <div style={{ border:"1px solid #e5e7eb", borderTop:"none", borderRadius:"0 0 3px 3px", overflow:"hidden" }}>
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
                <div style={{ ...VR.td(i), fontSize:11, color:"#6b7280" }}>
                  {[...new Set(o.rooms)].join(", ")}
                </div>
                <div style={{ ...VR.td(i), fontSize:10, color:"#6b7280", lineHeight:1.8 }}>
                  {o.orderedDate   && <div>📦 Ord: {o.orderedDate}</div>}
                  {o.deliveredDate && <div>🚚 Del: {o.deliveredDate}</div>}
                  {o.installedDate && <div>✅ Ins: {o.installedDate}</div>}
                  {o.notes         && <div style={{ color:"#0F1923" }}>💬 {o.notes}</div>}
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
        <div className="np" style={{ background:"#060812", padding:"12px 36px", display:"flex", gap:12,
          alignItems:"center", borderBottom:`3px solid ${C.teal}` }}>
          <button onClick={()=>setView("detail")} className="pill" style={{background:"rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.75)",border:"1px solid rgba(255,255,255,0.16)"}}>← Back</button>
          <button onClick={()=>window.print()} style={S.btn()}>🖨 Print / Save PDF</button>
          <span style={{ background:"rgba(255,159,10,0.15)", color:"#5C3A00", padding:"3px 10px", borderRadius:2,
            fontSize:10, fontWeight:700, letterSpacing:1, textTransform:"uppercase" }}>
            🔒 INTERNAL — Vendor Purchase Order
          </span>
          <div style={{ marginLeft:"auto", display:"flex", gap:12, fontSize:11, color:"#6b7280" }}>
            <span>🔴 {pending.length} Pending</span>
            <span>🔵 {ordered.length} Ordered</span>
            <span>🟢 {delivered.length} Delivered</span>
            <span>🟣 {installed.length} Installed</span>
          </div>
        </div>

        {/* Header */}
        <div style={{ background:"#060812", padding:"24px 48px", borderBottom:`3px solid ${C.teal}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
            <div>
              <div style={{ color:"#fff", fontSize:18, fontWeight:700, letterSpacing:4, textTransform:"uppercase" }}>High Rise Interiors</div>
              <div style={{ color:C.teal, fontSize:10, letterSpacing:5, marginTop:6, textTransform:"uppercase" }}>Vendor Purchase Order</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ color:"#fff", fontSize:16, fontWeight:700 }}>{orderNum}</div>
              <div style={{ color:"#6b7280", fontSize:11, marginTop:4 }}>{d}</div>
            </div>
          </div>
        </div>

        <div style={VR.body}>

          {/* Project summary */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, background:"rgba(255,255,255,0.07)",
            borderRadius:3, padding:"16px 20px", border:"1px solid #e5e7eb", marginBottom:8 }}>
            <div>
              <div style={{ fontSize:10, color:"#6b7280", letterSpacing:2, textTransform:"uppercase", marginBottom:6 }}>Client</div>
              <div style={{ fontSize:15, fontWeight:700 }}>{selected.name}</div>
              <div style={{ fontSize:12, color:"#6b7280", marginTop:2 }}>{selected.address}</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {[["Project",selected.projectType],["Style",selected.style],["Start",selected.startDate],["Duration",selected.timeline]].filter(([,v])=>v).map(([l,v])=>(
                <div key={l}><div style={{ fontSize:9, color:"#6b7280", letterSpacing:1, textTransform:"uppercase" }}>{l}</div><div style={{ fontSize:12, fontWeight:600 }}>{v}</div></div>
              ))}
            </div>
          </div>

          {/* Progress bar */}
          {orderItems.length > 0 && (
            <div style={{ marginBottom:16 }}>
              <div style={{ display:"flex", height:6, borderRadius:3, overflow:"hidden", background:C.line, marginBottom:8 }}>
                {[["Installed","#8B5CF6"],["Delivered","#10B981"],["Ordered","#3B82F6"],["Pending","#FF9F0A"]].map(([s,col])=>
                  orderItems.filter(o=>o.status===s).length > 0
                    ? <div key={s} style={{ flex:orderItems.filter(o=>o.status===s).length, background:col }}/> : null
                )}
              </div>
              <div style={{ display:"flex", gap:16, fontSize:11, color:"#6b7280" }}>
                {[["Pending","rgba(255,159,10,0.15)","#92400E"],["Ordered","rgba(10,132,255,0.15)","#1E40AF"],["Delivered","rgba(48,209,88,0.12)","#065F46"],["Installed","rgba(191,90,242,0.15)","#4C1D95"]].map(([s,bg,c])=>(
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
            <div style={{ textAlign:"center", padding:48, color:"#6b7280" }}>
              No materials added yet — add materials in the Materials tab first
            </div>
          )}

          {/* Vendor sign-off */}
          {pending.length > 0 && (
            <>
              <div style={VR.sec}>Order Confirmation</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:32, marginTop:8 }}>
                <div style={{ borderTop:`2px solid ${C.ink}`, paddingTop:12 }}>
                  <div style={{ fontSize:10, color:"#6b7280", letterSpacing:2, textTransform:"uppercase", marginBottom:6 }}>Prepared by</div>
                  <div style={{ fontSize:13, fontWeight:700 }}>High Rise Interiors</div>
                  <div style={{ marginTop:40, borderTop:`1px solid ${C.line}`, paddingTop:8, fontSize:10, color:"#6b7280" }}>Signature / Date</div>
                </div>
                <div style={{ borderTop:`2px solid ${C.teal}`, paddingTop:12 }}>
                  <div style={{ fontSize:10, color:"#6b7280", letterSpacing:2, textTransform:"uppercase", marginBottom:6 }}>Vendor Acknowledgement</div>
                  <div style={{ fontSize:13, fontWeight:700, color:C.teal }}>Vendor Name: _______________</div>
                  <div style={{ marginTop:40, borderTop:`1px solid ${C.line}`, paddingTop:8, fontSize:10, color:"#6b7280" }}>Signature / Stamp / Date</div>
                </div>
              </div>
            </>
          )}

          {/* Footer */}
          <div style={{ borderTop:`2px solid ${C.line}`, paddingTop:16, marginTop:32, display:"flex",
            justifyContent:"space-between", fontSize:10, color:"#6b7280" }}>
            <span>High Rise Interiors — Vendor Purchase Order</span>
            <span>{orderNum} | {d} | Powered by Genovatech IT Services Pvt. Ltd.</span>
          </div>

        </div>
      </div>
    );
  }

  // ── 3D ROOM PLANNER ─────────────────────────────────────────────────

  if (view==="detail" && selected) return (
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#0D1B3E 0%,#060812 45%,#1A0D2E 100%)",color:"rgba(255,255,255,0.92)",fontFamily:"Inter,-apple-system,BlinkMacSystemFont,sans-serif",position:"relative"}}>
      {/* Glow orbs */}
      <div className="orb" style={{top:"-20%",left:"-10%",width:"60%",height:"60%",background:"radial-gradient(ellipse,rgba(10,100,255,0.35) 0%,transparent 65%)"}}/>
      <div className="orb" style={{top:"10%",right:"-15%",width:"55%",height:"55%",background:"radial-gradient(ellipse,rgba(120,40,220,0.28) 0%,transparent 65%)"}}/>
      <div className="orb" style={{bottom:"-15%",left:"25%",width:"50%",height:"45%",background:"radial-gradient(ellipse,rgba(0,130,190,0.18) 0%,transparent 65%)"}}/>
      {/* Styles from index.css */}
      {toast && <Toast msg={toast.msg} type={toast.type}/>}
      <div className="crm-nav" style={{height:54,padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div><div style={S.logo}>High Rise Interiors</div><span style={S.sub}>Client Profile</span></div>
        <div style={{ display:"flex",gap:10 }}>
          <button className="pill" style={{background:"rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.75)",border:"1px solid rgba(255,255,255,0.16)"}} onClick={()=>setView("list")}>← Back</button>

          <button className="pill" style={{background:"rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.75)",border:"1px solid rgba(255,255,255,0.16)"}} onClick={()=>setView("report")}>📄 Client Report</button>
          <button className="pill" style={{background:"rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.75)",border:"1px solid rgba(255,255,255,0.16)"}} onClick={()=>setView("internal")}>🔧 Internal Report</button>
          <button className="pill" style={{background:"rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.75)",border:"1px solid rgba(255,255,255,0.16)"}} onClick={()=>setView("vendor")}>🛒 Vendor Order</button>
          <button className="pill" style={{background:"rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.75)",border:"1px solid rgba(255,255,255,0.16)"}} onClick={()=>setView("invoice")}>🧾 Invoice</button>
          <button style={S.btn()} onClick={()=>openEdit(selected)}>Edit</button>
        </div>
      </div>
      <div style={{maxWidth:1140,margin:"0 auto",padding:"20px 20px 80px",position:"relative",zIndex:1}}>
        <div style={{display:"grid",gridTemplateColumns:"minmax(0,2fr) minmax(0,3fr)",gap:16,alignItems:"start"}}>
          <div style={{minWidth:0}}>
            <div className="glass" style={{marginBottom:16,padding:"22px",background:"rgba(255,255,255,0.08)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
                <div>
                  <div style={{fontSize:24,fontWeight:700,letterSpacing:-0.5,marginBottom:4}}>{selected.name}</div>
                  <div style={{color:"rgba(255,255,255,0.5)",fontSize:13}}>{selected.projectType}</div>
                </div>
                <span className={{"Lead":"badge badge-lead","Active":"badge badge-active","In Progress":"badge badge-inprogress","Completed":"badge badge-completed","On Hold":"badge badge-onhold"}[selected.status]||"badge"} style={{fontSize:11}}>{selected.status}</span>
              </div>
              {[["📞",selected.phone],["📧",selected.email],["📍",selected.address],["📅","Start: "+selected.startDate],["⏱",selected.timeline],["💰",fmt(selected.quotation)]].filter(([,v])=>v&&!v.includes("Start: ")).map(([i,v])=>(
                <div key={i} style={{ fontSize:13,marginBottom:6 }}><span style={{ color:"rgba(255,255,255,0.5)" }}>{i} </span>{v}</div>
              ))}
              {selected.startDate && <div style={{ fontSize:13,marginBottom:6 }}><span style={{ color:"rgba(255,255,255,0.5)" }}>📅 </span>Start: {selected.startDate}</div>}
            </div>
            {selected.notes && <div className="glass" style={{padding:"20px 24px"}}><div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:"rgba(255,255,255,0.55)",textTransform:"uppercase",borderBottom:"1px solid rgba(255,255,255,0.1)",paddingBottom:8,marginBottom:14}}>Notes</div><div style={{ fontSize:14,lineHeight:1.8 }}>{selected.notes}</div></div>}
          </div>
          <div style={{minWidth:0}}>
            <div className="glass" style={{padding:"20px",marginBottom:12}}>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:"rgba(255,255,255,0.55)",textTransform:"uppercase",borderBottom:"1px solid rgba(255,255,255,0.1)",paddingBottom:8,marginBottom:14}}>Design & Scope</div>
              {selected.style && <div style={{ marginBottom:12 }}><span style={{ color:"rgba(255,255,255,0.5)",fontSize:13 }}>Style: </span><strong>{selected.style}</strong></div>}
              {(selected.rooms||[]).length>0 && (
                <div>
                  {selected.rooms.map(r => {
                    const rd = selected.roomDetails?.[r] || {};
                    const area = rd.length && rd.width ? (parseFloat(rd.length)*parseFloat(rd.width)).toFixed(0) : null;
                    return (
                      <div key={r} style={{ marginBottom:12, background:"rgba(255,255,255,0.05)", borderRadius:10, padding:"12px 16px", border:"1px solid rgba(255,255,255,0.12)" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                          <span style={{ fontWeight:700, fontSize:13, color:"rgba(255,255,255,0.92)" }}>🏠 {r}</span>
                          {area && <span style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>{rd.length} × {rd.width} ft = <strong>{area} sq ft</strong></span>}
                        </div>
                        {rd.height && <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)", marginBottom:4 }}>Ceiling: {rd.height} ft</div>}
                        {rd.notes && <div style={{ fontSize:12, color:C.dark }}>{rd.notes}</div>}
                        {(rd.photos||[]).length>0 && (
                          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:8 }}>
                            {rd.photos.map((p,i)=>(<img key={i} src={p} alt={r} style={{ width:80, height:80, objectFit:"cover", borderRadius:8, border:"1px solid rgba(255,255,255,0.18)" }}/>))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {selected.roomMaterials && Object.keys(selected.roomMaterials).length > 0 && (
              <div className="glass" style={{padding:"20px",marginBottom:16}}>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:"rgba(255,255,255,0.55)",textTransform:"uppercase",borderBottom:"1px solid rgba(255,255,255,0.1)",paddingBottom:8,marginBottom:14}}>Room Materials & Cost</div>
                {Object.entries(selected.roomMaterials).map(([room, mats]) => {
                  const roomCost = Object.entries(mats).reduce((total, [matType, sel]) => {
                    if (!sel?.name) return total;
                    const item = getCatalog(matType).find(m=>m.name===sel.name);
                    return total + (item && sel.qty ? parseFloat(sel.qty) * item.price : 0);
                  }, 0);
                  return (
                    <div key={room} style={{ marginBottom:12, background:"rgba(255,255,255,0.05)", borderRadius:10, padding:"12px 16px", border:"1px solid rgba(255,255,255,0.12)" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                        <span style={{ fontWeight:700, fontSize:13, color:"rgba(255,255,255,0.92)" }}>🏠 {room}</span>
                        {roomCost > 0 && <span style={{ fontWeight:700, fontSize:13, color:"#FF453A" }}>{fmt(Math.round(roomCost))}</span>}
                      </div>
                      {Object.entries(mats).filter(([,v])=>v?.name).map(([matType, sel]) => (
                        <div key={matType} style={{ fontSize:12, color:"rgba(255,255,255,0.75)", marginBottom:3 }}>
                          <span style={{ color:"rgba(255,255,255,0.5)" }}>{MATERIAL_LABELS[matType]}: </span>
                          <strong>{sel.name}</strong>
                          {sel.qty && <span style={{ color:"rgba(255,255,255,0.5)" }}> × {sel.qty} {getCatalog(matType).find(m=>m.name===sel.name)?.unit}</span>}
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
                    <div className="glass" style={{display:"flex",justifyContent:"space-between",padding:"14px 18px",borderRadius:12,background:"rgba(255,69,58,0.18)",border:"1px solid rgba(255,69,58,0.4)",marginTop:12,marginBottom:4}}>
                      <span style={{ color:"#fff", fontWeight:700, fontSize:13 }}>Total Material Cost</span>
                      <span style={{ color:"#fff", fontWeight:700, fontSize:16 }}>{fmt(Math.round(grand))}</span>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
            {selected.quotation && (
              <div className="glass" style={{padding:"20px",marginTop:12}}>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:"rgba(255,255,255,0.55)",textTransform:"uppercase",borderBottom:"1px solid rgba(255,255,255,0.1)",paddingBottom:8,marginBottom:14}}>{getDocTerm(selected.status)}</div>
                {selected.previousQuotation && <div style={{ fontSize:13,marginBottom:4 }}><span style={{ color:"rgba(255,255,255,0.5)" }}>Previous: </span><span style={{ textDecoration:"line-through" }}>{fmt(selected.previousQuotation)}</span></div>}
                {selected.revisedQuotation  && <div style={{ fontSize:13,marginBottom:4 }}><span style={{ color:"rgba(255,255,255,0.5)" }}>Revised: </span>{fmt(selected.revisedQuotation)}</div>}
                <div style={{ fontSize:20,fontWeight:700,color:"#0A84FF",marginTop:8 }}>Final: {fmt(selected.quotation)}</div>
              </div>
            )}
          </div>
        </div>
        {/* ── Audit Trail Timeline ── */}
        <div className="glass" style={{padding:"24px",marginTop:16}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:2.5,color:"rgba(255,255,255,0.55)",textTransform:"uppercase",borderBottom:"1px solid rgba(255,255,255,0.1)",paddingBottom:10,marginBottom:20}}>
            🕐 Audit Trail
          </div>
          {(selected.auditLog||[]).length === 0 ? (
            <div style={{textAlign:"center",color:"rgba(255,255,255,0.4)",fontSize:13,padding:"24px 0"}}>
              No activity yet — edits and report prints will appear here
            </div>
          ) : (
            <div style={{position:"relative"}}>
              {/* Timeline line */}
              <div style={{position:"absolute",left:15,top:4,bottom:4,width:2,
                background:"linear-gradient(180deg,rgba(10,132,255,0.5) 0%,rgba(191,90,242,0.3) 100%)",
                borderRadius:2}}/>
              {[...(selected.auditLog||[])].reverse().map((entry, i) => {
                const dt   = new Date(entry.ts);
                const date = dt.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
                const time = dt.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
                const icon = AUDIT_ICONS[entry.type]||"📋";
                const isSign  = entry.type==="signed";
                const isPrint = entry.type==="report";
                const dotColor = isSign?"#30D158":isPrint?"#0A84FF":"#BF5AF2";
                return (
                  <div key={i} className="slide-up" style={{display:"flex",gap:14,marginBottom:16,position:"relative",animationDelay:`${i*0.05}s`}}>
                    {/* Timeline dot */}
                    <div style={{width:32,height:32,borderRadius:"50%",flexShrink:0,zIndex:1,
                      background:`${dotColor}20`,
                      border:`2px solid ${dotColor}66`,
                      display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>
                      {icon}
                    </div>
                    {/* Entry content */}
                    <div style={{flex:1,minWidth:0,paddingTop:4}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                        <div style={{fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.92)",lineHeight:1.4}}>{entry.summary}</div>
                        <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",textAlign:"right",flexShrink:0,whiteSpace:"nowrap"}}>
                          <div>{date}</div>
                          <div style={{color:"rgba(255,255,255,0.3)"}}>{time}</div>
                        </div>
                      </div>
                      {entry.snapshot?.changes?.length > 0 && (
                        <div style={{marginTop:8,background:"rgba(255,255,255,0.05)",borderRadius:10,padding:"10px 14px",border:"1px solid rgba(255,255,255,0.1)"}}>
                          {entry.snapshot.changes.map((c,j)=>(
                            <div key={j} style={{fontSize:11,color:"rgba(255,255,255,0.5)",lineHeight:1.9,display:"flex",gap:6,alignItems:"flex-start"}}>
                              <span style={{color:"rgba(10,132,255,0.7)",flexShrink:0}}>•</span>
                              <span style={{wordBreak:"break-word"}}>{c}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {isSign && (
                        <div style={{ marginTop:8 }}>
                          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:8 }}>
                            {entry.signatures?.client && <span style={{ background:"rgba(48,209,88,0.15)", color:"#30D158", fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:2 }}>✍ Client signed</span>}
                            {entry.signatures?.hri    && <span className="glass" style={{background:"rgba(10,132,255,0.12)", color:"#0A84FF", fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:2 }}>✍ HRI signed</span>}
                          </div>
                          {/* Show signature images from audit log */}
                          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                            {entry.signatures?.clientImg && (
                              <div>
                                <div style={{ fontSize:9, color:"rgba(255,255,255,0.5)", marginBottom:2 }}>{selected.name}</div>
                                <img src={entry.signatures.clientImg} alt="Client sig"
                                  style={{ height:48, border:"1px solid rgba(255,255,255,0.12)", borderRadius:3, background:"rgba(255,255,255,0.06)" }}/>
                              </div>
                            )}
                            {entry.signatures?.hriImg && (
                              <div>
                                <div style={{ fontSize:9, color:"rgba(255,255,255,0.5)", marginBottom:2 }}>High Rise Interiors</div>
                                <img src={entry.signatures.hriImg} alt="HRI sig"
                                  style={{ height:48, border:"1px solid rgba(255,255,255,0.12)", borderRadius:3, background:"rgba(255,255,255,0.06)" }}/>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {isPrint && (
                        <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", marginTop:4 }}>
                          {entry.snapshot?.sigClient && entry.snapshot?.sigHRI ? "✓ Both signatures captured"
                            : entry.snapshot?.sigClient ? "Client signed only"
                            : entry.snapshot?.sigHRI   ? "HRI signed only"
                            : "Unsigned at print time"}
                        </div>
                      )}
                      {(entry.snapshot?.quotation || entry.snapshot?.ref) && (
                        <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", marginTop:4, display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
                          {entry.snapshot.ref && <span style={{ background:"rgba(255,255,255,0.07)", color:"#0A84FF", padding:"1px 8px", borderRadius:2, fontWeight:700, fontSize:10, letterSpacing:1 }}>{entry.snapshot.ref}</span>}
                          {entry.snapshot.quotation && <span>{getDocTerm(entry.snapshot.status)}: <strong style={{ color:"#0A84FF" }}>{fmt(entry.snapshot.quotation)}</strong></span>}
                          {entry.snapshot.status && <span style={{ ...S.badge(entry.snapshot.status), fontSize:9 }}>{entry.snapshot.status}</span>}
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
      <div className="orb" style={{top:"-20%",left:"-10%",width:"60%",height:"60%",background:"radial-gradient(ellipse,rgba(10,100,255,0.35) 0%,transparent 65%)"}}/>
      <div className="orb" style={{top:"10%",right:"-15%",width:"55%",height:"55%",background:"radial-gradient(ellipse,rgba(120,40,220,0.28) 0%,transparent 65%)"}}/>
      <div className="orb" style={{bottom:"-15%",left:"25%",width:"50%",height:"45%",background:"radial-gradient(ellipse,rgba(0,130,190,0.18) 0%,transparent 65%)"}}/>
      {/* CSS loaded via index.css */}
      
      {/* CSS loaded via index.css */}
      {toast && <Toast msg={toast.msg} type={toast.type}/>}
      <div style={S.hdr}>
        <div><div style={S.logo}>High Rise Interiors</div><span style={S.sub}>Studio CRM</span></div>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          {/* Online/Offline status */}
          {isOnline
            ? <span style={{background:"rgba(48,209,88,0.15)",color:"#30D158",fontSize:10,padding:"3px 10px",borderRadius:20,border:"1px solid rgba(48,209,88,0.3)",fontWeight:600}}>● Online</span>
            : <span style={{background:"rgba(255,69,58,0.2)",color:"#FF453A",fontSize:10,padding:"3px 10px",borderRadius:20,border:"1px solid rgba(255,69,58,0.4)",fontWeight:700}}>📴 Offline{pendingSync>0?` · ${pendingSync} queued`:""}</span>
          }
          {isOnline && pendingSync>0 && (
            <button className="pill" onClick={syncOfflineQueue}
              style={{background:"rgba(48,209,88,0.2)",border:"1px solid rgba(48,209,88,0.4)",color:"#30D158",fontWeight:700,fontSize:12}}>
              ↑ Sync {pendingSync}
            </button>
          )}
          <span style={{ color:"rgba(255,255,255,0.6)",fontSize:11 }}>{user?.email}</span>
          <button className="pill" style={{background:"rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.75)",border:"1px solid rgba(255,255,255,0.16)"}} onClick={fetchCustomers}>↻</button>
          <button className="pill" style={{background:"rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.75)",border:"1px solid rgba(255,255,255,0.16)"}} onClick={exportCSV}>↓ CSV</button>
          <button className="pill" style={{background:"rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.75)",border:"1px solid rgba(255,255,255,0.16)"}} onClick={onLogout}>Sign Out</button>
          <button style={S.btn()} onClick={openNew}>+ New Client</button>
        </div>
      </div>
      <div style={S.main}>
        {/* Stats */}
        <div style={{display:"flex",gap:12,marginBottom:24,flexWrap:"wrap"}}>
          {[
            {l:"Total",    n:stats.total,     i:"👥", cls:"stat-blue",   col:"#0A84FF"},
            {l:"Active",   n:stats.active,    i:"⚡", cls:"stat-purple", col:"#BF5AF2"},
            {l:"Leads",    n:stats.leads,     i:"🌱", cls:"stat-amber",  col:"#FF9F0A"},
            {l:"Completed",n:stats.completed, i:"✅", cls:"stat-green",  col:"#30D158"},
          ].map(({l,n,i,cls,col})=>(
            <div key={l} className={`stat-card ${cls} slide-up`} style={{flex:1,minWidth:120}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <span style={{fontSize:10,letterSpacing:1.8,color:"rgba(255,255,255,0.55)",textTransform:"uppercase",fontWeight:600}}>{l}</span>
                <span style={{fontSize:18}}>{i}</span>
              </div>
              <div style={{fontSize:32,fontWeight:700,color:col,letterSpacing:-1,lineHeight:1}}>{loading?"…":n}</div>
              <div style={{marginTop:10,height:2,borderRadius:2,background:`linear-gradient(90deg,${col} 0%,${col}00 100%)`}}/>
            </div>
          ))}
          <div className="stat-card slide-up" style={{flex:1,minWidth:140,
            background:"linear-gradient(135deg,rgba(255,159,10,0.15),rgba(255,159,10,0.05))",
            borderColor:"rgba(255,159,10,0.3)",
            boxShadow:"0 8px 32px rgba(255,159,10,0.2),inset 0 1px 0 rgba(255,255,255,0.12)"}}>
            <div style={{fontSize:10,letterSpacing:1.8,color:"rgba(255,255,255,0.55)",textTransform:"uppercase",fontWeight:600,marginBottom:8}}>💰 Pipeline</div>
            <div style={{fontSize:20,fontWeight:700,color:"#FF9F0A",letterSpacing:-0.5,lineHeight:1}}>{loading?"…":fmt(stats.revenue)}</div>
            <div style={{marginTop:10,height:2,borderRadius:2,background:"linear-gradient(90deg,#FF9F0A 0%,#FF9F0A00 100%)"}}/>
          </div>
        </div>
        {/* Search */}
        <div style={{ display:"flex",gap:12,marginBottom:20,flexWrap:"wrap",alignItems:"center" }}>
          <input className="glass-input" style={{width:280,marginBottom:0}} placeholder="Search name, phone, address…" value={search} onChange={e=>setSearch(e.target.value)}/>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {["All",...STATUSES].map(s=>{
              const cls={"All":"pill-all","Lead":"pill-lead","Active":"pill-active","In Progress":"pill-progress","Completed":"pill-completed","On Hold":"pill-onhold"}[s]||"";
              const active=filterStatus===s;
              return (
                <button key={s} className={`pill ${active?cls:""}`}
                  onClick={()=>setFilterStatus(s)}>
                  {s}
                </button>
              );
            })}
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
          <div key={c.id} className="client-row slide-up"
            style={{padding:"16px 20px",marginBottom:6}}
            onClick={()=>openDetail(c)}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10 }}>
              <div>
                <div style={{ fontSize:18,fontWeight:700,marginBottom:3 }}>{c.name}</div>
                <div style={{ fontSize:13,color:"rgba(255,255,255,0.5)" }}>{c.phone}{c.email?` · ${c.email}`:""}</div>
                {c.address && <div style={{ fontSize:12,color:"#B0A0A0",marginTop:2 }}>📍 {c.address}</div>}
              </div>
              <div style={{ display:"flex",gap:10,alignItems:"center",flexWrap:"wrap" }}>
                {c.quotation && <span style={{fontWeight:700,fontSize:13,color:"#30D158"}}>{fmt(c.quotation)}</span>}
                <span className={{"Lead":"badge badge-lead","Active":"badge badge-active","In Progress":"badge badge-inprogress","Completed":"badge badge-completed","On Hold":"badge badge-onhold"}[c.status]||"badge"}>{c.status}</span>
                <button style={{ ...S.btn("ghost"),padding:"6px 14px",fontSize:11 }} onClick={e=>{e.stopPropagation();openEdit(c);}}>Edit</button>
              </div>
            </div>
            <div style={{ marginTop:10,display:"flex",gap:16,flexWrap:"wrap" }}>
              {c.style && <span style={{ fontSize:12,color:"#FF453A" }}>✦ {c.style}</span>}
              {(c.rooms||[]).length>0 && <span style={{ fontSize:12,color:"rgba(255,255,255,0.5)" }}>🏠 {c.rooms.slice(0,3).join(", ")}{c.rooms.length>3?` +${c.rooms.length-3}`:""}</span>}
              {c.timeline && <span style={{ fontSize:12,color:"rgba(255,255,255,0.5)" }}>⏱ {c.timeline}</span>}
              {c.startDate && <span style={{ fontSize:12,color:"rgba(255,255,255,0.5)" }}>📅 {c.startDate}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── FORM ──────────────────────────────────────────────────────────────
  return (
    <div style={S.app}>
      <div className="orb" style={{top:"-20%",left:"-10%",width:"60%",height:"60%",background:"radial-gradient(ellipse,rgba(10,100,255,0.35) 0%,transparent 65%)"}}/>
      <div className="orb" style={{top:"10%",right:"-15%",width:"55%",height:"55%",background:"radial-gradient(ellipse,rgba(120,40,220,0.28) 0%,transparent 65%)"}}/>
      <div className="orb" style={{bottom:"-15%",left:"25%",width:"50%",height:"45%",background:"radial-gradient(ellipse,rgba(0,130,190,0.18) 0%,transparent 65%)"}}/>
      {/* CSS loaded via index.css */}
      
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap'); @keyframes spin{to{transform:rotate(360deg)}} @keyframes slideIn{from{transform:translateX(20px);opacity:0}to{transform:translateX(0);opacity:1}} input:focus,select:focus,textarea:focus{border-color:rgba(10,132,255,0.7)!important;box-shadow:0 0 0 3px rgba(26,82,118,0.12)!important} *{box-sizing:border-box}`}</style>
      {toast && <Toast msg={toast.msg} type={toast.type}/>}
      <div style={S.hdr}>
        <div><div style={S.logo}>High Rise Interiors</div><span style={S.sub}>{form.id?"Edit Client":"New Client"}</span></div>
        <div style={{ display:"flex",gap:10 }}>
          <button className="pill" style={{background:"rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.75)",border:"1px solid rgba(255,255,255,0.16)"}} onClick={()=>setView("list")}>Cancel</button>
          <button style={{ ...S.btn(),opacity:saving?0.7:1 }} onClick={saveCustomer} disabled={saving}>{saving?"Saving…":form.id?"Update Client":"Save Client"}</button>
        </div>
      </div>
      <div style={S.main}>
        {/* Tabs */}
        <div style={{ display:"flex",gap:6,marginBottom:24,flexWrap:"wrap" }}>
          {[["personal","👤 Client"],["rooms","🏠 Rooms & Materials"],["quotation","💰 Quotation"],["notes","📝 Notes"],["inventory","📦 Inventory"]].map(([k,l])=>(
            <button key={k} style={S.tab(activeTab===k)} onClick={()=>setActiveTab(k)}>{l}</button>
          ))}
        </div>

        <div className="glass" style={{padding:"32px 36px"}}>

          {/* ── PERSONAL ── */}
          {activeTab==="personal" && (
            <div>
              {form.id && (
                <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:10, padding:"10px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:12, border:"1px solid rgba(255,255,255,0.12)" }}>
                  <span style={{ fontSize:11, letterSpacing:2, color:"rgba(255,255,255,0.5)", textTransform:"uppercase" }}>Client ID</span>
                  <span style={{ fontSize:13, fontWeight:700, color:"#FF453A", fontFamily:"monospace" }}>{form.id}</span>
                  <span style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>(Read only — cannot be changed)</span>
                </div>
              )}
              {/* ── Floor Plan Upload ── */}
              <div style={{ marginBottom:24 }}>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:"rgba(255,255,255,0.55)",textTransform:"uppercase",borderBottom:"1px solid rgba(255,255,255,0.1)",paddingBottom:8,marginBottom:14}}>Floor Plan</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)", marginBottom:12 }}>
                  Upload a floor plan image for reference, then enter room dimensions manually or use AI analysis (requires API credits).
                </div>

                {/* Upload box */}
                {!form.floorPlanUrl ? (
                  <label style={{ display:"block", border:`2px dashed ${C.line}`, borderRadius:3,
                    padding:"24px 16px", textAlign:"center", cursor:"pointer",
                    background:"rgba(255,255,255,0.07)", transition:"border-color 0.2s" }}>
                    <input type="file" accept="image/*" style={{ display:"none" }}
                      onChange={async e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const url = URL.createObjectURL(file);
                        setF("floorPlanUrl", url);
                        setF("floorPlanPending", []);
                        showToast("🔍 Reading floor plan…", "info");

                        let detected = [];
                        try {
                          // Compress image
                          const base64 = await new Promise((res, rej) => {
                            const img = new Image();
                            const objUrl = URL.createObjectURL(file);
                            img.onload = () => {
                              const MAX = 1200;
                              let w = img.width, h = img.height;
                              if (w > MAX || h > MAX) {
                                if (w > h) { h = Math.round(h*MAX/w); w = MAX; }
                                else       { w = Math.round(w*MAX/h); h = MAX; }
                              }
                              const cv = document.createElement("canvas");
                              cv.width = w; cv.height = h;
                              cv.getContext("2d").drawImage(img, 0, 0, w, h);
                              URL.revokeObjectURL(objUrl);
                              res(cv.toDataURL("image/jpeg", 0.82).split(",")[1]);
                            };
                            img.onerror = rej;
                            img.src = objUrl;
                          });

                          // Ask Claude to read rooms AS-IS from plan — no mapping
                          const text = await callClaude({
                            maxTokens: 1500,
                            images: [{ base64, mediaType: "image/jpeg" }],
                            user: `Read this floor plan. Extract every labelled room/space using the EXACT name printed on the plan.

Return ONLY this JSON (start with {):
{
  "detected": [
    { "name": "MASTER BEDROOM", "length": "14.83", "width": "12.42", "raw": "14'10 x 12'5" },
    { "name": "BEDROOM 2",      "length": "13.25", "width": "11.67", "raw": "13'3 x 11'8"  },
    { "name": "FAMILY / DINING","length": "18.67", "width": "12.5",  "raw": "18'8 x 12'6"  },
    { "name": "KITCHEN",        "length": "8.0",   "width": "12.42", "raw": "8'0 x 12'5"   },
    { "name": "TOILET",         "length": "5.75",  "width": "8.17",  "raw": "5'9 x 8'2"    }
  ]
}

Dimension rules:
- 14'10" = 14.83 feet,  13'3" = 13.25,  11'8" = 11.67,  8'2" = 8.17
- "5'0 WIDE" → use 5.0 for width, estimate depth
- Include ALL spaces: bedrooms, toilets, kitchen, living, dining, balcony, utility, puja, sitout, dressing
- Use EXACT label text from the plan — do not rename or translate`
                          });

                          const parsed = parseClaudeJSON(text);
                          detected = (parsed.detected || []).filter(d => d.name).map(d => ({
                            ...d, height: d.height || "9"
                          }));
                          showToast(`✅ ${detected.length} rooms read from plan — review below`, "success", 5000);

                        } catch(err) {
                          console.warn("AI failed:", err.message);
                          // 3 blank rows for manual entry
                          detected = [{name:"",length:"",width:"",height:"9"},{name:"",length:"",width:"",height:"9"},{name:"",length:"",width:"",height:"9"}];
                          showToast("📐 Enter room names and dimensions from your plan below", "info", 5000);
                        }

                        setF("floorPlanPending", detected);
                      }}/>


                    <div style={{ fontSize:28, marginBottom:8 }}>🏗</div>
                    <div style={{ fontSize:13, color:"rgba(255,255,255,0.92)", fontWeight:600, marginBottom:4 }}>
                      Upload Floor Plan
                    </div>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>
                      JPG, PNG — AI will extract room names and dimensions automatically
                    </div>
                  </label>
                ) : (
                  <div>
                    <div style={{ position:"relative", display:"inline-block", marginBottom:8 }}>
                      <img src={form.floorPlanUrl} alt="Floor plan"
                        style={{ maxWidth:"100%", maxHeight:200, borderRadius:3,
                          border:"1px solid rgba(255,255,255,0.12)", objectFit:"contain", background:C.smoke }}/>
                      <button onClick={()=>setForm(f=>({...f,floorPlanUrl:"",floorPlanData:null}))}
                        style={{ position:"absolute", top:4, right:4, background:"rgba(0,0,0,0.6)",
                          color:"#fff", border:"none", borderRadius:2, cursor:"pointer",
                          padding:"2px 8px", fontSize:10 }}>✕</button>
                    </div>
                    {/* ── Room Mapping UI ── */}
                    {form.floorPlanPending && form.floorPlanPending.length > 0 && (
                      <div style={{ marginTop:12, background:"rgba(255,255,255,0.07)", borderRadius:3,
                        border:"1px solid rgba(255,255,255,0.12)", padding:14 }}>
                        <div style={{ fontSize:11, fontWeight:700, color:"#0A84FF",
                          letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>
                          📐 Enter Dimensions from Floor Plan
                        </div>
                        <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", marginBottom:12 }}>
                          Look at your floor plan and type the dimensions for each room (in feet). Leave blank to skip.
                        </div>

                        {form.floorPlanPending.map((det, idx) => (
                          <div key={idx} style={{ marginBottom:10, padding:"8px 12px",
                            background:C.white, borderRadius:3, border:"1px solid rgba(255,255,255,0.12)" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                              {/* Room name */}
                              <div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.92)", minWidth:110 }}>
                                {det.name}
                              </div>
                              {/* Length */}
                              <input
                                type="number" placeholder="L (ft)" min="0" step="0.1"
                                value={det.length||""}
                                onChange={e => {
                                  const updated = form.floorPlanPending.map((d,i) =>
                                    i===idx ? {...d, length: e.target.value} : d
                                  );
                                  setF("floorPlanPending", updated);
                                }}
                                style={{ ...S.input, width:70, fontSize:11, padding:"5px 8px" }}/>
                              {/* Width */}
                              <input
                                type="number" placeholder="W (ft)" min="0" step="0.1"
                                value={det.width||""}
                                onChange={e => {
                                  const updated = form.floorPlanPending.map((d,i) =>
                                    i===idx ? {...d, width: e.target.value} : d
                                  );
                                  setF("floorPlanPending", updated);
                                }}
                                style={{ ...S.input, width:70, fontSize:11, padding:"5px 8px" }}/>
                              <span style={{ fontSize:10, color:"rgba(255,255,255,0.5)" }}>ft</span>
                            </div>
                          </div>
                        ))}



                        {/* Apply button */}
                        <button onClick={() => {
                          const newRoomDetails = {};
                          const addedRooms    = [];
                          const newCustom     = [];

                          form.floorPlanPending.forEach(det => {
                            const roomName = (det.name || "").trim();
                            if (!roomName) return;
                            const l = parseFloat(det.length || 0);
                            const w = parseFloat(det.width  || 0);
                            if (l <= 0 && w <= 0) return; // skip rooms with no dims

                            addedRooms.push(roomName);
                            // If not in default list, add to customRooms so it works in Dimensions tab
                            if (!DEFAULT_ROOMS.includes(roomName)) newCustom.push(roomName);
                            newRoomDetails[roomName] = {
                              length:      String(l.toFixed(1)),
                              width:       String(w.toFixed(1)),
                              height:      String(parseFloat(det.height||9).toFixed(1)),
                              photos:      form.roomDetails?.[roomName]?.photos || [],
                              subsections: form.roomDetails?.[roomName]?.subsections || {},
                            };
                          });

                          if (!addedRooms.length) {
                            showToast("Enter at least one room with dimensions", "error"); return;
                          }

                          const allCustom = [...new Set([...(form.customRooms||[]), ...newCustom])];

                          setForm(f => ({
                            ...f,
                            rooms:        [...new Set(addedRooms)],
                            customRooms:  allCustom,
                            roomDetails:  { ...f.roomDetails, ...newRoomDetails },
                            floorPlanPending: null,
                          }));

                          showToast(`✅ ${addedRooms.length} rooms applied — go to Dimensions tab`, "success", 5000);
                          setTimeout(() => setActiveTab("rooms"), 600);
                        }} style={{ ...S.btn(), fontSize:12, width:"100%" }}>
                          ✓ Apply to Dimensions →
                        </button>
                      </div>
                    )}

                    {/* Already applied — show summary */}
                    {form.floorPlanData && !form.floorPlanPending && (
                      <div style={{ marginTop:10, background:"rgba(48,209,88,0.15)", border:"1px solid #86EFAC",
                        borderRadius:3, padding:"10px 14px", fontSize:12, color:"#30D158" }}>
                        ✅ {form.rooms.length} rooms populated
                        {form.floorPlanData.notes && ` · ${form.floorPlanData.notes}`}
                      </div>
                    )}
                    {!form.floorPlanPending && (
                      <button onClick={()=>setActiveTab("rooms")}
                        style={{ ...S.btn(), marginTop:10, fontSize:11 }}>
                        📐 Go to Dimensions →
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:"rgba(255,255,255,0.55)",textTransform:"uppercase",borderBottom:"1px solid rgba(255,255,255,0.1)",paddingBottom:8,marginBottom:14}}>Client Information</div>
              <div style={S.row}>
                <Field label="Full Name *">
                  <input className="glass-input" style={{}} value={form.name} onChange={e=>setF("name",e.target.value)} placeholder="Mr. Sashi Kanth"/>
                </Field>
                <Field label="Status">
                  <Select value={form.status} onChange={v=>setF("status",v)} options={STATUSES}/>
                </Field>
              </div>
              <div style={S.row}>
                <Field label="Phone">
                  <input className="glass-input" style={{}} value={form.phone} onChange={e=>setF("phone",e.target.value)} placeholder="+91 98765 43210"/>
                </Field>
                <Field label="Email">
                  <input className="glass-input" style={{}} type="email" value={form.email} onChange={e=>setF("email",e.target.value)} placeholder="client@email.com"/>
                </Field>
              </div>
              <div style={{ marginBottom:18 }}>
                <label style={{fontSize:10,letterSpacing:1.5,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",marginBottom:6,display:"block",fontWeight:600}}>Project Address</label>
                <input className="glass-input" style={{}} value={form.address} onChange={e=>setF("address",e.target.value)} placeholder="EIPL Cornerstone T2, 803, Hyderabad, Telangana"/>
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
                <label style={{fontSize:10,letterSpacing:1.5,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",marginBottom:6,display:"block",fontWeight:600}}>Start Date</label>
                <input className="glass-input" style={{}} type="date" value={form.startDate} onChange={e=>setF("startDate",e.target.value)}/>
              </div>
              <div style={{ marginBottom:18 }}>
                <label style={{fontSize:10,letterSpacing:1.5,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",marginBottom:6,display:"block",fontWeight:600}}>Duration</label>
                <select className="glass-input" style={{}} value={form.timeline} onChange={e=>setF("timeline",e.target.value)}>
                  <option value="">Select duration</option>
                  {TIMELINES.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ marginBottom:18 }}>
                <label style={{fontSize:10,letterSpacing:1.5,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",marginBottom:6,display:"block",fontWeight:600}}>Interior Style</label>
                <div style={{ display:"flex",flexWrap:"wrap",gap:8,marginTop:8 }}>
                  {STYLES.map(s=><button key={s} style={S.pill(form.style===s)} onClick={()=>setF("style",s)}>{s}</button>)}
                </div>
              </div>
            </div>
          )}

          {/* ── DIMENSIONS ── */}
          {activeTab==="rooms" && (
            <div>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:"rgba(255,255,255,0.55)",textTransform:"uppercase",borderBottom:"1px solid rgba(255,255,255,0.1)",paddingBottom:8,marginBottom:14}}>Rooms — Dimensions & Materials</div>
              <div style={{fontSize:13,color:"rgba(255,255,255,0.5)",marginBottom:16,lineHeight:1.7}}>
                Select rooms, add work items (Frame / Box / Wardrobe etc.) with dimensions and materials.
              </div>

              {/* Room selector pills */}
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:20}}>
                {getRooms(form).map(r=>(<button key={r} style={S.pill(form.rooms.includes(r))} onClick={()=>toggleRoom(r)}>{r}</button>))}
              </div>

              {form.rooms.length===0 && (
                <div style={{textAlign:"center",padding:"32px",background:"rgba(255,255,255,0.05)",borderRadius:12,color:"rgba(255,255,255,0.5)",fontSize:13}}>
                  ☝️ Select rooms above to add work items
                </div>
              )}

              {/* Per-room card */}
              {form.rooms.map(room => {
                // roomWork: { [room]: [ {id, workType, width, height, brand, qty, unit, notes}, ... ] }
                const works = form.roomWork?.[room] || [];
                const setWorks = (updater) => setForm(f => ({
                  ...f,
                  roomWork: { ...(f.roomWork||{}), [room]: typeof updater==="function" ? updater(f.roomWork?.[room]||[]) : updater }
                }));
                const addWork = () => setWorks(w => [...w, {id:Date.now(), workType:"frame", width:"", height:"", brand:"", qty:"", unit:"sq ft", price:0, notes:""}]);
                const delWork = (id) => setWorks(w => w.filter(x=>x.id!==id));
                const updWork = (id, key, val) => setWorks(w => w.map(x => x.id===id ? {...x,[key]:val} : x));

                // Also keep room-level L×W×H for reference
                const rd = form.roomDetails?.[room] || {};
                const setRD = (key,val) => setForm(f=>({...f,roomDetails:{...(f.roomDetails||{}),[room]:{...(f.roomDetails?.[room]||{}),[key]:val}}}));
                const roomArea = rd.length&&rd.width ? (parseFloat(rd.length)*parseFloat(rd.width)).toFixed(0) : null;

                // Room total cost
                const roomTotal = works.reduce((t, w) => {
                  const wt = WORK_TYPES[w.workType];
                  if (!wt || !w.brand) return t;
                  const catalog = wt.materials.flatMap(mt => getCatalog(mt));
                  const item = catalog.find(m => m.name===w.brand);
                  if (!item) return t;
                  const sqft = w.width&&w.height ? parseFloat(w.width)*parseFloat(w.height) : parseFloat(w.qty)||0;
                  return t + sqft * item.price;
                }, 0);

                return (
                  <div key={room} className="glass" style={{padding:"20px",marginBottom:16}}>
                    {/* Room header */}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                      <div style={{fontSize:15,fontWeight:700}}>🏠 {room}</div>
                      {roomTotal>0 && <div style={{fontSize:13,fontWeight:700,color:"#FF9F0A"}}>₹{roomTotal.toLocaleString("en-IN")}</div>}
                    </div>

                    {/* Room dimensions (reference) */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto",gap:8,marginBottom:14,alignItems:"end"}}>
                      {[["length","Room L (ft)"],["width","Room W (ft)"],["height","Room H (ft)"]].map(([k,lbl])=>(
                        <div key={k}>
                          <label style={{fontSize:9,letterSpacing:1.5,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",marginBottom:4,display:"block",fontWeight:600}}>{lbl}</label>
                          <input className="glass-input" type="number" min="0" step="0.1"
                            value={rd[k]||""} onChange={e=>setRD(k,e.target.value)} placeholder="0"
                            style={{padding:"7px 10px",fontSize:13}}/>
                        </div>
                      ))}
                      <div style={{background:roomArea?"rgba(10,132,255,0.2)":"rgba(255,255,255,0.05)",border:`1px solid ${roomArea?"rgba(10,132,255,0.4)":"rgba(255,255,255,0.1)"}`,borderRadius:10,padding:"8px 12px",textAlign:"center",minWidth:80}}>
                        <div style={{fontSize:15,fontWeight:800,color:roomArea?"#0A84FF":"rgba(255,255,255,0.2)"}}>{roomArea||"—"}</div>
                        <div style={{fontSize:8,letterSpacing:1,color:roomArea?"rgba(10,132,255,0.7)":"rgba(255,255,255,0.2)",fontWeight:600}}>SQ FT</div>
                      </div>
                    </div>

                    <div style={{borderTop:"1px solid rgba(255,255,255,0.08)",marginBottom:14}}/>

                    {/* Work items */}
                    <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",marginBottom:10}}>
                      Work Items
                    </div>

                    {works.length===0 && (
                      <div style={{textAlign:"center",padding:"16px",background:"rgba(255,255,255,0.03)",borderRadius:10,color:"rgba(255,255,255,0.3)",fontSize:12,marginBottom:10}}>
                        No work items yet — add Frame Work, Wardrobe, Ceiling etc.
                      </div>
                    )}

                    {works.map((w,wi) => {
                      const wt = WORK_TYPES[w.workType] || WORK_TYPES.custom;
                      // Build brand options from this work type's materials
                      const brandOptions = wt.materials.flatMap(mt =>
                        getCatalog(mt).map(item => ({...item, matType:mt}))
                      );
                      const selectedItem = brandOptions.find(b => b.name===w.brand);
                      const sqft = w.width&&w.height ? parseFloat(w.width)*parseFloat(w.height) : null;
                      const lineTotal = selectedItem && (sqft||parseFloat(w.qty)||0)
                        ? (sqft||parseFloat(w.qty)) * selectedItem.price : 0;

                      return (
                        <div key={w.id} style={{background:"rgba(255,255,255,0.04)",borderRadius:12,padding:"14px",marginBottom:10,border:"1px solid rgba(255,255,255,0.08)"}}>
                          {/* Row 1: Work type + delete */}
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                            <div style={{display:"flex",alignItems:"center",gap:8,flex:1,flexWrap:"wrap"}}>
                              <span style={{fontSize:16}}>{wt.icon}</span>
                              <select className="glass-input" style={{fontSize:12,padding:"5px 8px",width:"auto",minWidth:160}}
                                value={w.workType}
                                onChange={e=>updWork(w.id,"workType",e.target.value)}>
                                {Object.entries(WORK_TYPES).map(([k,v])=>(
                                  <option key={k} value={k}>{v.label}</option>
                                ))}
                              </select>
                              <input className="glass-input" style={{fontSize:12,padding:"5px 8px",flex:1,minWidth:120}}
                                placeholder="Notes (e.g. TV unit 10ft, L-shape kitchen...)"
                                value={w.notes||""}
                                onChange={e=>updWork(w.id,"notes",e.target.value)}/>
                            </div>
                            <button onClick={()=>delWork(w.id)}
                              style={{background:"rgba(255,69,58,0.15)",border:"1px solid rgba(255,69,58,0.3)",borderRadius:8,color:"#FF453A",padding:"4px 10px",cursor:"pointer",fontFamily:"inherit",fontSize:12,marginLeft:8,flexShrink:0}}>
                              ✕
                            </button>
                          </div>

                          {/* Row 2: W × H = sqft | Brand | Price */}
                          <div style={{display:"grid",gridTemplateColumns:"80px 10px 80px auto 1fr auto",gap:6,alignItems:"end"}}>
                            {/* Width */}
                            <div>
                              <label style={{fontSize:9,letterSpacing:1.5,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",marginBottom:3,display:"block",fontWeight:600}}>Width (ft)</label>
                              <input className="glass-input" type="number" min="0" step="0.1"
                                style={{padding:"6px 8px",fontSize:13,textAlign:"center"}}
                                placeholder="W" value={w.width||""}
                                onChange={e=>updWork(w.id,"width",e.target.value)}/>
                            </div>
                            <div style={{textAlign:"center",color:"rgba(255,255,255,0.3)",fontSize:16,paddingBottom:2}}>×</div>
                            {/* Height */}
                            <div>
                              <label style={{fontSize:9,letterSpacing:1.5,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",marginBottom:3,display:"block",fontWeight:600}}>Height (ft)</label>
                              <input className="glass-input" type="number" min="0" step="0.1"
                                style={{padding:"6px 8px",fontSize:13,textAlign:"center"}}
                                placeholder="H" value={w.height||""}
                                onChange={e=>updWork(w.id,"height",e.target.value)}/>
                            </div>
                            {/* Sq ft badge */}
                            <div style={{background:sqft?"rgba(10,132,255,0.2)":"rgba(255,255,255,0.05)",border:`1px solid ${sqft?"rgba(10,132,255,0.4)":"rgba(255,255,255,0.08)"}`,borderRadius:8,padding:"6px 10px",textAlign:"center",minWidth:68}}>
                              <div style={{fontSize:13,fontWeight:800,color:sqft?"#0A84FF":"rgba(255,255,255,0.2)"}}>{sqft?sqft.toFixed(1):"—"}</div>
                              <div style={{fontSize:8,color:sqft?"rgba(10,132,255,0.7)":"rgba(255,255,255,0.2)",letterSpacing:0.8,fontWeight:600}}>SQ FT</div>
                            </div>
                            {/* Brand selector */}
                            <div>
                              <label style={{fontSize:9,letterSpacing:1.5,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",marginBottom:3,display:"block",fontWeight:600}}>
                                Material / Brand
                              </label>
                              <select className="glass-input" style={{fontSize:12,padding:"6px 8px",width:"100%"}}
                                value={w.brand||""}
                                onChange={e=>{
                                  const item=brandOptions.find(b=>b.name===e.target.value);
                                  updWork(w.id,"brand",e.target.value);
                                  if(item?.unit)updWork(w.id,"unit",item.unit);
                                  if(item?.matType)updWork(w.id,"matType",item.matType);
                                }}>
                                <option value="">— select material —</option>
                                {wt.materials.map(mt=>(
                                  <optgroup key={mt} label={MATERIAL_LABELS[mt]||mt}>
                                    {getCatalog(mt).map(m=>(
                                      <option key={m.name} value={m.name}>{m.name} {m.price?`(₹${m.price}/${m.unit||"sq ft"})`:""}</option>
                                    ))}
                                  </optgroup>
                                ))}
                              </select>
                            </div>
                            {/* Line total */}
                            <div style={{textAlign:"right",paddingBottom:2}}>
                              <div style={{fontSize:9,letterSpacing:1,color:"rgba(255,255,255,0.4)",marginBottom:3,textTransform:"uppercase",fontWeight:600}}>Total</div>
                              <div style={{fontSize:15,fontWeight:800,color:lineTotal>0?"#FF9F0A":"rgba(255,255,255,0.2)"}}>
                                {lineTotal>0?`₹${lineTotal.toLocaleString("en-IN")}`:"—"}
                              </div>
                              {selectedItem&&<div style={{fontSize:9,color:"rgba(255,255,255,0.35)"}}>₹{selectedItem.price}/{selectedItem.unit||"sq ft"}</div>}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <button onClick={addWork}
                      style={{width:"100%",padding:"9px",borderRadius:10,border:"1px dashed rgba(10,132,255,0.4)",background:"rgba(10,132,255,0.08)",color:"#0A84FF",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600,marginTop:4}}>
                      + Add Work Item
                    </button>

                    {/* Room total */}
                    {roomTotal>0 && (
                      <div style={{marginTop:12,borderTop:"1px solid rgba(255,255,255,0.08)",paddingTop:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,textTransform:"uppercase"}}>Room Total</span>
                        <span style={{fontSize:16,fontWeight:800,color:"#FF9F0A"}}>₹{roomTotal.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Grand total */}
              {form.rooms.length>0 && (()=>{
                const grand = form.rooms.reduce((t,room)=>{
                  const works = form.roomWork?.[room]||[];
                  return t + works.reduce((rt,w)=>{
                    const wt=WORK_TYPES[w.workType]; if(!wt||!w.brand) return rt;
                    const item=wt.materials.flatMap(mt=>getCatalog(mt)).find(m=>m.name===w.brand);
                    if(!item) return rt;
                    const sqft=w.width&&w.height?parseFloat(w.width)*parseFloat(w.height):parseFloat(w.qty)||0;
                    return rt+sqft*item.price;
                  },0);
                },0);
                return grand>0?(
                  <div className="glass" style={{padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(255,69,58,0.1)",borderColor:"rgba(255,69,58,0.3)"}}>
                    <span style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.7)"}}>Total Material Cost — All Rooms</span>
                    <span style={{fontSize:22,fontWeight:800,color:"#FF453A"}}>₹{grand.toLocaleString("en-IN")}</span>
                  </div>
                ):null;
              })()}
            </div>
          )}

          {activeTab==="quotation" && (
            <div>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:"rgba(255,255,255,0.55)",textTransform:"uppercase",borderBottom:"1px solid rgba(255,255,255,0.1)",paddingBottom:8,marginBottom:14}}>{getDocTerm(form.status)} (INR ₹)</div>

              {/* Configurable Labour % */}
              <div style={{ display:"flex", alignItems:"center", gap:16, background:"rgba(255,255,255,0.05)", borderRadius:10, padding:"12px 18px", marginBottom:16, border:"1px solid rgba(255,255,255,0.12)" }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#FF453A", letterSpacing:1 }}>⚙ LABOUR COST %</div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <input style={{ ...S.input, width:80, textAlign:"center", fontWeight:700 }} type="number" min="0" max="100"
                    value={form.labourPct} onChange={e=>setF("labourPct", parseFloat(e.target.value)||0)}/>
                  <span style={{ fontSize:13, color:"rgba(255,255,255,0.5)" }}>% of material cost</span>
                </div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>
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
                  <div className="glass" style={{ borderRadius:12, padding:"14px 18px", marginBottom:20, border:"1px solid rgba(255,255,255,0.12)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:"#FF453A", letterSpacing:1 }}>AUTO-CALCULATED FROM MATERIALS</div>
                      <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", marginTop:4 }}>Material cost {fmt(Math.round(matCost))} + Labour ({form.labourPct||50}%) = <strong style={{ color:"#0A84FF" }}>{fmt(withLabour)}</strong></div>
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
                  <input className="glass-input" style={{}} type="number" value={form.previousQuotation} onChange={e=>setF("previousQuotation",e.target.value)} placeholder="Auto-filled from materials"/>
                </Field>
                <Field label="Revised Quotation ₹">
                  <input style={{ ...S.input, color: form.revisedQuotation ? C.red : C.muted }} type="number" value={form.revisedQuotation} onChange={e=>setF("revisedQuotation",e.target.value)} placeholder="After rebate"/>
                </Field>
              </div>

              {/* Rebate & Coupon — two separate discounts */}
              <div style={{ background:"rgba(255,255,255,0.07)", borderRadius:12, padding:"18px 20px", border:"1px solid rgba(255,255,255,0.12)", marginBottom:20 }}>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:"rgba(255,255,255,0.55)",textTransform:"uppercase",borderBottom:"1px solid rgba(255,255,255,0.1)",paddingBottom:8,marginBottom:14}}>Rebate & Coupon Discount</div>

                {/* Row 1: Rebate */}
                <div style={{ fontSize:11, letterSpacing:2, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", marginBottom:8, fontWeight:700 }}>Step 1 — Rebate</div>
                <div style={S.row}>
                  <Field label="Rebate Type">
                    <select className="glass-input" style={{}} value={form.rebateType} onChange={e=>{
                      setF("rebateType",e.target.value);
                    }}>
                      <option value="amount">Fixed Amount (₹)</option>
                      <option value="percent">Percentage (%)</option>
                    </select>
                  </Field>
                  <Field label={form.rebateType==="percent" ? "Rebate % (max 5%)" : "Rebate Amount ₹ (max ₹25,000)"}>
                    <input className="glass-input" style={{}} type="number" min="0" max={form.rebateType==="percent"?"5":"25000"}
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
                    <div style={{ ...S.input, background:"rgba(255,255,255,0.08)", color:"#FF453A", fontWeight:700, cursor:"default" }}>
                      {form.previousQuotation && form.rebateValue
                        ? `- ${form.rebateType==="percent"
                            ? fmt(Math.round(parseFloat(form.previousQuotation)*Math.min(parseFloat(form.rebateValue||0),5)/100))
                            : fmt(parseFloat(form.rebateValue||0))}`
                        : "—"}
                    </div>
                  </Field>
                </div>

                {/* This client's own referral code */}
                <div style={{ background:"rgba(255,255,255,0.07)", borderRadius:3, padding:"14px 18px", marginBottom:20, border:"1px solid rgba(255,255,255,0.12)" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:"#0A84FF", letterSpacing:2, marginBottom:10, textTransform:"uppercase" }}>
                    This Client's Referral Code
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
                    <div style={{ fontSize:22, fontWeight:800, letterSpacing:4,
                      color: form.referralCode ? C.ink : C.muted,
                      fontFamily:"monospace", background:C.white, padding:"8px 20px",
                      borderRadius:3, border:`2px solid ${form.referralCode ? C.teal : C.line}` }}>
                      {form.referralCode || "— auto-generated on save —"}
                    </div>
                    <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)", lineHeight:1.8 }}>
                      <div>Share with friends to earn <strong style={{ color:"#0A84FF" }}>5% cashback</strong></div>
                      <div>Friends get <strong style={{ color:"#0A84FF" }}>5% off</strong> their project</div>
                    </div>
                  </div>
                </div>

                {/* Client Portal Access Code */}
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:11, letterSpacing:2, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", marginBottom:8, fontWeight:700 }}>Client Portal Access</div>
                  <div className="glass" style={{ borderRadius:12, padding:"16px 18px", border:"1px solid rgba(10,132,255,0.3)", background:"rgba(10,132,255,0.06)" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                      <div>
                        <div style={{ fontSize:10, letterSpacing:1.5, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", marginBottom:6, fontWeight:600 }}>🔑 Access Code for Client Portal</div>
                        <input className="glass-input" style={{ width:200, letterSpacing:3, fontWeight:700, fontSize:15, textTransform:"uppercase" }}
                          placeholder="e.g. HRI-1234"
                          value={form.clientAccessCode||""}
                          onChange={e=>setF("clientAccessCode", e.target.value.toUpperCase())}/>
                      </div>
                      <div style={{ fontSize:12, color:"rgba(255,255,255,0.45)", lineHeight:1.9, marginTop:16 }}>
                        <div>Share this code + their email with the client</div>
                        <div>They use it to log in to <strong style={{ color:"#0A84FF" }}>client-portal-nu-blush.vercel.app</strong></div>
                        <button style={{ marginTop:6, background:"rgba(10,132,255,0.2)", border:"1px solid rgba(10,132,255,0.4)", borderRadius:8, color:"#0A84FF", padding:"4px 12px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}
                          onClick={()=>setF("clientAccessCode", (form.referralCode||genReferralCode(form.id||"NEW")).slice(0,8))}>
                          Auto-fill from Referral Code
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row 2: Apply another customer's referral code */}
                <div style={{ fontSize:11, letterSpacing:2, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", marginBottom:8, fontWeight:700, marginTop:4 }}>Step 2 — Apply Referral Code (from another client)</div>
                <div style={S.row}>
                  <Field label="Referral Code Used">
                    <input className="glass-input" style={{}}
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
                      background: form.referralDiscount ? "rgba(48,209,88,0.15)"
                        : form.appliedReferralCode ? "rgba(255,69,58,0.08)" : C.smoke,
                      color: form.referralDiscount ? "#30D158"
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
                    <div style={{ ...S.input, background:form.referralDiscount?"rgba(48,209,88,0.15)":C.smoke,
                      color:form.referralDiscount?"#30D158":C.muted, fontWeight:700, cursor:"default" }}>
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
                  <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:10, padding:"12px 16px", border:"1px solid rgba(255,255,255,0.12)", marginTop:4 }}>
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
                          <div><span style={{ color:"rgba(255,255,255,0.5)" }}>Base: </span><strong>{fmt(base)}</strong></div>
                          {rebateAmt>0 && <div><span style={{ color:"rgba(255,255,255,0.5)" }}>Rebate: </span><strong style={{ color:"#0A84FF" }}>-{fmt(rebateAmt)}</strong></div>}
                          {couponAmt>0 && <div><span style={{ color:"rgba(255,255,255,0.5)" }}>Coupon 5%: </span><strong style={{ color:"#30D158" }}>-{fmt(couponAmt)}</strong></div>}
                          <div style={{ marginLeft:"auto" }}><span style={{ color:"rgba(255,255,255,0.5)" }}>Final: </span><strong style={{ color:"#0A84FF", fontSize:16 }}>{fmt(final)}</strong></div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Referral Program Info */}
              {form.couponCode && (
                <div style={{ background:"#F0FFF4", borderRadius:12, padding:"14px 18px", marginBottom:16, border:"1.5px solid #BBF7D0" }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"#30D158", letterSpacing:1, marginBottom:8 }}>🎁 REFERRAL PROGRAM</div>
                  <div style={{ fontSize:13, color:"#30D158", lineHeight:1.9 }}>
                    <div>• Client shares code <strong>{form.couponCode}</strong> with friends</div>
                    <div>• Referred friend gets <strong>5% off</strong> their project</div>
                    <div>• This client gets <strong>5% cashback</strong> on their final invoice</div>
                  </div>
                </div>
              )}

              {/* Final Quotation */}
              <div style={{ marginBottom:24 }}>
                <label style={{fontSize:10,letterSpacing:1.5,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",marginBottom:6,display:"block",fontWeight:600}}>Final {getDocTerm(form.status)} ₹ (Client sees this)</label>
                <input style={{ ...S.input, fontSize:18, fontWeight:700, borderColor:C.red }} type="number" value={form.quotation}
                  onChange={e=>setF("quotation",e.target.value)} placeholder="e.g. 2504040"/>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", marginTop:6, letterSpacing:1 }}>
                  💡 Tip: Set Final = Revised Quotation after applying rebate
                </div>
              </div>

              {/* Payment Schedule */}
              {form.quotation && (
                <div>
                  <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:"rgba(255,255,255,0.55)",textTransform:"uppercase",borderBottom:"1px solid rgba(255,255,255,0.1)",paddingBottom:8,marginBottom:14}}>{getDocTerm(form.status)} Payment Schedule</div>
                  {PAYMENT_PHASES.map((p,i)=>(
                    <div key={i} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(255,255,255,0.05)",borderRadius:12,padding:"14px 18px",marginBottom:10,border:"1px solid rgba(255,255,255,0.12)" }}>
                      <div><div style={{ fontWeight:700,fontSize:13,color:"#0A84FF" }}>{p.day} — {p.pct}% — {p.label}</div></div>
                      <div style={{ fontSize:18,fontWeight:700,color:"#0A84FF" }}>{fmt(Math.round(Number(form.quotation)*p.pct/100))}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── INVENTORY ── */}
          {activeTab==="inventory" && (
            <div>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:"rgba(255,255,255,0.55)",textTransform:"uppercase",borderBottom:"1px solid rgba(255,255,255,0.1)",paddingBottom:8,marginBottom:14}}>Project Material Inventory</div>
              {!form.roomMaterials || Object.keys(form.roomMaterials).length===0 ? (
                <div style={{ textAlign:"center", padding:40, background:"rgba(255,255,255,0.07)", borderRadius:3, color:"rgba(255,255,255,0.5)", fontSize:13, border:"1px solid rgba(255,255,255,0.12)" }}>
                  ☝️ Add materials in the <strong>Materials</strong> tab first, then track them here
                </div>
              ) : (
                <>
                  {/* Status legend */}
                  <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
                    {[["Pending","rgba(255,159,10,0.15)","#92400E"],["Ordered","rgba(10,132,255,0.15)","#1E40AF"],["Delivered","rgba(48,209,88,0.12)","#065F46"],["Installed","rgba(191,90,242,0.15)","#4C1D95"]].map(([s,bg,c])=>(
                      <span key={s} style={{ background:bg, color:c, padding:"4px 12px", borderRadius:2, fontSize:11, fontWeight:700, letterSpacing:1 }}>{s}</span>
                    ))}
                    <span style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>— tap status to cycle through stages</span>
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
                      <div key={room} className="glass" style={{ marginBottom:16, borderRadius:14 }}>
                        {/* Room header */}
                        <div style={{ background:"rgba(255,255,255,0.08)", padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", borderRadius:"14px 14px 0 0", borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
                          <span style={{ color:"#fff", fontWeight:700, fontSize:13 }}>🏠 {room}</span>
                          <span style={{ color:installedCount===matEntries.length?C.teal:"#aaa", fontSize:10, letterSpacing:1 }}>
                            {installedCount}/{matEntries.length} installed
                          </span>
                        </div>
                        {/* Column headers */}
                        <div style={{ display:"grid", gridTemplateColumns:"2fr 2fr 1fr 1fr 1.2fr 2fr",
                          padding:"8px 14px", background:"rgba(255,255,255,0.08)",
                          borderBottom:"1px solid rgba(255,255,255,0.1)",
                          fontSize:9, fontWeight:700, letterSpacing:1.5,
                          color:"rgba(255,255,255,0.5)", textTransform:"uppercase" }}>
                          {["Category","Brand","Qty","Status","Dates","Notes"].map(h=><span key={h}>{h}</span>)}
                        </div>
                        {/* Material rows */}
                        {matEntries.map(([matType, sel], i) => {
                          const invKey = `${room}__${sel.name}`;
                          const inv = form.inventory?.[invKey] || { status:"Pending" };
                          const SINV = ["Pending","Ordered","Delivered","Installed"];
                          const SC = {
                            Pending:   { bg:"rgba(255,159,10,0.22)", c:"#FF9F0A" },
                            Ordered:   { bg:"rgba(10,132,255,0.22)", c:"#0A84FF" },
                            Delivered: { bg:"rgba(48,209,88,0.22)",  c:"#30D158" },
                            Installed: { bg:"rgba(191,90,242,0.22)", c:"#BF5AF2" },
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
                              padding:"10px 14px",
                              background:i%2===0?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.02)",
                              borderTop:"1px solid rgba(255,255,255,0.08)",
                              alignItems:"center", gap:8 }}>
                              <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", fontWeight:600, textTransform:"uppercase", letterSpacing:1 }}>{MATERIAL_LABELS[matType]}</div>
                              <div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.92)" }}>{sel.name}</div>
                              <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>{sel.qty} {item?.unit||""}</div>
                              {/* Clickable status */}
                              <div onClick={cycleStatus} title="Click to update status"
                                style={{ ...sc, padding:"5px 8px", borderRadius:2, fontSize:10,
                                  fontWeight:700, letterSpacing:1, cursor:"pointer",
                                  textTransform:"uppercase", textAlign:"center", userSelect:"none",
                                  transition:"all 0.15s" }}>
                                {inv.status||"Pending"}
                              </div>
                              {/* Auto-stamped dates */}
                              <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)", lineHeight:1.8 }}>
                                {inv.orderedDate   && <div>📦 {inv.orderedDate}</div>}
                                {inv.deliveredDate && <div>🚚 {inv.deliveredDate}</div>}
                                {inv.installedDate && <div>✅ {inv.installedDate}</div>}
                              </div>
                              {/* Notes */}
                              <input className="glass-input" style={{padding:"5px 10px",fontSize:11}}
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
                      <div style={{ background:"rgba(255,255,255,0.07)", borderRadius:3, padding:"16px 20px", border:"1px solid rgba(255,255,255,0.12)", marginTop:8 }}>
                        <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", marginBottom:10 }}>Overall Progress</div>
                        <div style={{ display:"flex", height:8, borderRadius:4, overflow:"hidden", marginBottom:12, background:C.line }}>
                          {[["Installed","#8B5CF6"],["Delivered","#10B981"],["Ordered","#3B82F6"],["Pending","#FF9F0A"]].map(([s,col])=>(
                            counts[s]>0 ? <div key={s} style={{ flex:counts[s], background:col }}/> : null
                          ))}
                        </div>
                        <div style={{ display:"flex", gap:16, fontSize:12, flexWrap:"wrap" }}>
                          {[["Pending","#92400E","rgba(255,159,10,0.15)"],["Ordered","#1E40AF","rgba(10,132,255,0.15)"],["Delivered","#065F46","rgba(48,209,88,0.12)"],["Installed","#4C1D95","rgba(191,90,242,0.15)"]].map(([s,c,bg])=>(
                            <div key={s}><span style={{ background:bg, color:c, padding:"2px 8px", borderRadius:2, fontSize:10, fontWeight:700 }}>{counts[s]}</span> <span style={{ color:"rgba(255,255,255,0.5)" }}>{s}</span></div>
                          ))}
                          <div style={{ marginLeft:"auto", fontWeight:700, color:"rgba(255,255,255,0.92)" }}>{counts.Installed}/{total} Complete</div>
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
              <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:"rgba(255,255,255,0.55)",textTransform:"uppercase",borderBottom:"1px solid rgba(255,255,255,0.1)",paddingBottom:8,marginBottom:14}}>Scope of Work & Notes</div>
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
            <button className="pill" style={{background:"rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.75)",border:"1px solid rgba(255,255,255,0.16)"}} onClick={()=>{const i=TABS.indexOf(activeTab);if(i>0)setActiveTab(TABS[i-1]);}} disabled={activeTab===TABS[0]}>← Previous</button>
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
