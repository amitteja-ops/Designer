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
const BUDGETS = ["Under ₹5L","₹5L–₹10L","₹10L–₹15L","₹15L–₹20L","₹20L–₹25L","₹25L–₹30L","₹30L–₹35L","₹35L–₹50L","₹45L–₹70L","Above ₹70L"];
const TIMELINES = ["30 Days","45 Days","60 Days","75 Days","90 Days","120 Days","Custom"];

// ── Project Plan Phases — based on actual interior work sequence ──────
// Each phase has: id, name, color, icon, depends (phase ids that must start first),
// defaultStart (day offset from project start), defaultDuration (days)
// Work types from quotation: Box, Frame, Ceiling, Kitchen, Wardrobe, Bed, Panel, Tiles, Granite, Mirror, Drawer, Service, Transport
// PROJECT_PHASES — stored as % of total duration so they scale to 30/45/60/90 days
// startPct: when phase begins (0–100%), durPct: how long it runs as % of total
// payBefore: true = payment due BEFORE this phase starts
// PROJECT_PHASES — from High Rise Interiors official project plan (Excel)
// Base: 120 days. startPct/durPct scale to any project duration automatically.
// Sub-activities shown in desc for designer/client visibility.
const PROJECT_PHASES = [
  { id:"requirements", name:"Requirement Gathering",    icon:"📋", color:"#0A84FF",
    startPct:0,  durPct:6,
    payBefore:true,
    customer:false,
    subActivities:[],
    desc:"Understanding client needs, site measurements, scope finalisation" },
  { id:"design",       name:"Design",                   icon:"📐", color:"#5E5CE6",
    startPct:6,  durPct:6,
    payBefore:false,
    customer:true,
    subActivities:[],
    desc:"2D/3D design preparation, mood boards, concept presentation" },
  { id:"designFinal",  name:"Design Finalization",      icon:"✅", color:"#BF5AF2",
    startPct:12, durPct:6,
    payBefore:false,
    customer:true,
    subActivities:[],
    desc:"Layout, wall design, ceiling, lights, laminates — type & colour finalised by client" },
  { id:"ceiling",      name:"False Ceiling Work",       icon:"💡", color:"#FF9F0A",
    startPct:18, durPct:8,
    payBefore:false,
    customer:false,
    subActivities:["Channels (2 days)","Wiring (1 day)","Board Installation (3 days)","Putty (3 days)","Lights (1 day)"],
    desc:"GI channels, electrical wiring, gypsum board, putty, ceiling lights" },
  { id:"procurement",  name:"Material Procurement",     icon:"🚚", color:"#FF6B9D",
    startPct:26, durPct:22,
    payBefore:true,
    customer:true,
    subActivities:["Procurement (2 days)","Carcass (10 days)","Lamination & Door Framing (15 days)"],
    desc:"Order plywood & laminates, carcass fabrication, lamination & door framing. Client to finalise granite, lights, kitchen stone, crockery stone, basins" },
  { id:"graniteTiles", name:"Granite & Tiles",          icon:"🪨", color:"#FF9F0A",
    startPct:48, durPct:6,
    payBefore:true,
    customer:true,
    subActivities:["Kitchen Tiles","Crockery Tiles","Kitchen Backslash","Crockery Backslash","Utility Wall"],
    desc:"Kitchen & crockery tiles, backslash, utility wall. Client to finalise glass door." },
  { id:"woodFraming",  name:"Wood Framing",             icon:"🪚", color:"#30D158",
    startPct:54, durPct:15,
    payBefore:true,
    customer:true,
    subActivities:["Edge Binding Finishing","Profile Glass Installation","Door Installation","Wall Decoration"],
    desc:"Edge binding, profile glass, door installation, wall decoration. Client to finalise paint selection." },
  { id:"deco",         name:"Deco & Polish",            icon:"✨", color:"#FF453A",
    startPct:69, durPct:7,
    payBefore:true,
    customer:false,
    subActivities:[],
    desc:"PVD polishing, acrylic work, profile touch-ups, panel deco" },
  { id:"painting",     name:"Painting",                 icon:"🎨", color:"#FF453A",
    startPct:76, durPct:7,
    payBefore:false,
    customer:false,
    subActivities:[],
    desc:"Putty, primer, 2 coats wall paint all rooms" },
  { id:"cleaning",     name:"Deep Cleaning",            icon:"🧹", color:"#8E8E93",
    startPct:83, durPct:3,
    payBefore:false,
    customer:false,
    subActivities:[],
    desc:"Full deep clean — all rooms, fixtures, glass, floors" },
  { id:"handover",     name:"Handover",                 icon:"🏠", color:"#30D158",
    startPct:86, durPct:1,
    payBefore:false,
    customer:true,
    subActivities:[],
    desc:"Client walkthrough, snag list fixes, key handover" },
  { id:"cooling",      name:"Cooling Period",           icon:"❄️", color:"#0A84FF",
    startPct:87, durPct:13,
    payBefore:false,
    customer:false,
    subActivities:[],
    desc:"Post-handover settling, warranty period, minor touch-up support" },
];

// Compute actual days from % given total duration
const phaseDay = (phasePct, total) => Math.max(1, Math.round(phasePct/100 * total) + 1);
const phaseDur = (durPct, total)   => Math.max(1, Math.round(durPct/100 * total));

// Payment schedule — payment due BEFORE each phase starts
// Tied to project phases so days scale automatically
// Payment schedule — exact milestones from High Rise Interiors project plan
// All payments due BEFORE the referenced phase begins
const buildPaymentSchedule = (total, quotation) => {
  const q = parseFloat(quotation) || 0;
  return [
    { pct:30, label:"Advance",               when:"Before Design begins (Day 1)",
      phaseRef:"requirements", day:1 },
    { pct:20, label:"Before Procurement",    when:"Before Material Procurement starts",
      phaseRef:"procurement",  day:phaseDay(26, total) },
    { pct:20, label:"Before Granite & Tiles",when:"Before Granite & Tiles work begins",
      phaseRef:"graniteTiles", day:phaseDay(48, total) },
    { pct:10, label:"Before Wood Framing",   when:"Before Wood Framing begins",
      phaseRef:"woodFraming",  day:phaseDay(54, total) },
    { pct:10, label:"Before Deco & Polish",  when:"Before Deco & Polish begins",
      phaseRef:"deco",         day:phaseDay(69, total) },
    { pct:5,  label:"Before Painting",       when:"Before Painting begins",
      phaseRef:"painting",     day:phaseDay(76, total) },
    { pct:5,  label:"On Handover",           when:"On the day of handover",
      phaseRef:"handover",     day:phaseDay(86, total) },
  ].map(p => ({ ...p, amount: Math.round(q * p.pct / 100) }));
};

// ── Property type → budget + rooms defaults ───────────────────────────
const PROPERTY_TYPES = ["Studio","1 BHK","2 BHK","3 BHK","4 BHK","Villa","Independent House","Commercial","Office"];

const PROPERTY_BUDGET_MAP = {
  "Studio":            "₹15L–₹20L",
  "1 BHK":             "₹20L–₹25L",
  "2 BHK":             "₹25L–₹30L",
  "3 BHK":             "₹30L–₹35L",
  "4 BHK":             "₹35L–₹50L",
  "Villa":             "₹45L–₹70L",
  "Independent House": "₹45L–₹70L",
  "Commercial":        "₹25L–₹30L",
  "Office":            "₹20L–₹25L",
};

const PROPERTY_ROOMS_MAP = {
  "Studio":            ["Entrance","Living Area","Kitchen","Bathroom","Others","Add On"],
  "1 BHK":             ["Entrance","Living Area","Kitchen","Master Bedroom","Bathroom","Others","Add On"],
  "2 BHK":             ["Entrance","Drawing Room","Living Area","Kitchen","Master Bedroom","Children Bedroom","Bathroom","Others","Add On"],
  "3 BHK":             ["Entrance","Drawing Room","Living Area","Dining","Kitchen","Pooja","Master Bedroom","Children Bedroom","Guest Bedroom","Bathroom","Others","Add On"],
  "4 BHK":             ["Entrance","Drawing Room","Living Area","Dining","Kitchen","Pooja","Master Bedroom","Children Bedroom","Guest Bedroom","Study Room","Bathroom","Balcony","Others","Add On"],
  "Villa":             ["Entrance","Drawing Room","Living Area","Dining","Kitchen","Pooja","Master Bedroom","Children Bedroom","Guest Bedroom","Study Room","Bathroom","Balcony","Others","Add On"],
  "Independent House": ["Entrance","Drawing Room","Living Area","Dining","Kitchen","Pooja","Master Bedroom","Children Bedroom","Guest Bedroom","Study Room","Bathroom","Balcony","Others","Add On"],
  "Commercial":        ["Entrance","Living Area","Bathroom","Others"],
  "Office":            ["Entrance","Living Area","Bathroom","Others"],
};

// ── Default room work items from Ajay quotation ───────────────────────
// These are pre-filled when a client is created, based on property type
const DEFAULT_ROOM_WORK = {
  "Entrance": [
    {id:1, product:"Shoe Rack",     type:"Box",   height:"4",  width:"5",  qty:"1", matType:"plywood", brand:"Sainik 710", notes:"",  price:""},
    {id:2, product:"Entrance Frame",type:"Frame", height:"8.5",width:"4",  qty:"1", matType:"plywood", brand:"Sainik 710", notes:"",  price:""},
  ],
  "Drawing Room": [
    {id:1, product:"TV Unit Bottom Box",      type:"Box",         height:"2",  width:"8",  qty:"1", matType:"plywood", brand:"Sainik 710", notes:"", price:""},
    {id:2, product:"TV Unit Back Panel",      type:"Panel",       height:"8",  width:"8",  qty:"1", matType:"plywood", brand:"Sainik 710", notes:"", price:""},
    {id:3, product:"TV Unit Long Unit",       type:"Box",         height:"7",  width:"1.5",qty:"1", matType:"plywood", brand:"Sainik 710", notes:"", price:""},
    {id:4, product:"TV Unit Long Unit Profile",type:"Profile Door",height:"7", width:"1.5",qty:"1", matType:"plywood", brand:"Sainik 710", notes:"", price:""},
    {id:5, product:"TV Unit Side Louvers",    type:"Louvers",     height:"9",  width:"4",  qty:"1", matType:"plywood", brand:"Sainik 710", notes:"", price:""},
    {id:6, product:"TV Unit Partition",       type:"Frame",       height:"8",  width:"5",  qty:"1", matType:"plywood", brand:"Sainik 710", notes:"", price:""},
    {id:7, product:"Ceiling",           type:"Ceiling",     height:"13", width:"12", qty:"1", matType:"ceiling", brand:"Saint Gobin Gyproc", notes:"Dining ceiling", price:""},
  ],
  "Living Area": [
    {id:1, product:"Crockery Top Box",        type:"Open Box",    height:"3.5",width:"7.5",qty:"1", matType:"plywood", brand:"Sainik 710", notes:"", price:""},
    {id:2, product:"Crockery Profile Glass",  type:"Profile Door",height:"3.5",width:"7.5",qty:"1", matType:"glass",   brand:"Modi Guard Mirror", notes:"", price:""},
    {id:3, product:"Crockery Long Glass Box", type:"Open Box",    height:"7",  width:"1.5",qty:"1", matType:"plywood", brand:"Sainik 710", notes:"", price:""},
    {id:4, product:"Crockery Bottom Box",     type:"Box",         height:"3",  width:"8",  qty:"1", matType:"plywood", brand:"Sainik 710", notes:"", price:""},
    {id:5, product:"Crockery Top Loft",       type:"Frame",       height:"3",  width:"9.5",qty:"1", matType:"plywood", brand:"Sainik 710", notes:"", price:""},
    {id:6, product:"Diamond Mirror",          type:"Diamond Mirror",height:"2",width:"8",  qty:"1", matType:"glass",   brand:"Modi Guard Mirror", notes:"", price:""},
    {id:7, product:"Ceiling",           type:"Ceiling",     height:"12", width:"9.8",qty:"1", matType:"ceiling", brand:"Saint Gobin Gyproc", notes:"", price:""},
  ],
  "Dining": [
    {id:1, product:"Ceiling",           type:"Ceiling",     height:"13", width:"12", qty:"1", matType:"ceiling", brand:"Saint Gobin Gyproc", notes:"", price:""},
  ],
  "Pooja": [
    {id:1, product:"Pooja Box",               type:"Box",         height:"8",  width:"5",  qty:"1", matType:"plywood", brand:"Sainik 710", notes:"", price:""},
    {id:2, product:"Pooja Door",              type:"Pooja Profile Door",height:"8",width:"5",qty:"1",matType:"plywood",brand:"Century Club Prime", notes:"", price:""},
    {id:3, product:"Pooja Tiles",             type:"Tiles",       height:"7",  width:"14", qty:"1", matType:"",        brand:"", notes:"", price:""},
    {id:4, product:"Pooja Draws",             type:"Drawer",      height:"",   width:"",   qty:"3", matType:"hardware",brand:"Hettich KA5632 250mm Black Coated Telescopic Channel", notes:"", price:""},
    {id:5, product:"Ceiling",           type:"Ceiling",     height:"5.5",width:"3.5",qty:"1", matType:"ceiling", brand:"Saint Gobin Gyproc", notes:"", price:""},
  ],
  "Master Bedroom": [
    {id:1, product:"Wardrobe",                type:"Box",         height:"7",  width:"7",  qty:"1", matType:"plywood", brand:"Sainik 710", notes:"", price:""},
    {id:2, product:"Wardrobe Loft",           type:"Frame",       height:"2.5",width:"11", qty:"1", matType:"plywood", brand:"Sainik 710", notes:"", price:""},
    {id:3, product:"Bed Back Panel",          type:"Panel",       height:"3",  width:"14", qty:"1", matType:"plywood", brand:"Sainik 710", notes:"", price:""},
    {id:4, product:"Study Table",             type:"Box",         height:"2.6",width:"4",  qty:"1", matType:"plywood", brand:"Sainik 710", notes:"", price:""},
    {id:5, product:"Hydraulic Bed",           type:"Bed",         height:"6",  width:"6.5",qty:"1", matType:"",        brand:"", notes:"Queen size", price:""},
    {id:6, product:"Bed Cushion",             type:"Cushion",     height:"2",  width:"24", qty:"1", matType:"",        brand:"", notes:"", price:""},
    {id:7, product:"Dressing Wardrobe",       type:"Box",         height:"7",  width:"7.8",qty:"1", matType:"plywood", brand:"Sainik 710", notes:"", price:""},
    {id:8, product:"Dressing Wardrobe Loft",  type:"Box",         height:"2",  width:"7.8",qty:"1", matType:"plywood", brand:"Sainik 710", notes:"", price:""},
    {id:9, product:"Dressing Mirror Wall",    type:"Box",         height:"8",  width:"5",  qty:"1", matType:"plywood", brand:"Sainik 710", notes:"", price:""},
    {id:10,product:"Dressing Mirror",         type:"Mirror",      height:"4",  width:"3",  qty:"1", matType:"glass",   brand:"Modi Guard Mirror", notes:"", price:""},
    {id:11,product:"Ceiling",           type:"Ceiling",     height:"15", width:"13", qty:"1", matType:"ceiling", brand:"Saint Gobin Gyproc", notes:"", price:""},
  ],
  "Children Bedroom": [
    {id:1, product:"Wardrobe",                type:"Box",         height:"7",  width:"6",  qty:"1", matType:"plywood", brand:"Sainik 710", notes:"", price:""},
    {id:2, product:"Wardrobe Loft",           type:"Frame",       height:"2",  width:"6",  qty:"1", matType:"plywood", brand:"Sainik 710", notes:"", price:""},
    {id:3, product:"Window Below Box",        type:"Box",         height:"2.3",width:"4",  qty:"1", matType:"plywood", brand:"Sainik 710", notes:"", price:""},
    {id:4, product:"Hydraulic Bed",           type:"Bed",         height:"6",  width:"6.5",qty:"1", matType:"",        brand:"", notes:"", price:""},
    {id:5, product:"Bed Cushion",             type:"Cushion",     height:"2",  width:"24", qty:"1", matType:"",        brand:"", notes:"", price:""},
    {id:6, product:"Dressing",               type:"Box",          height:"7",  width:"2.5",qty:"1", matType:"plywood", brand:"Sainik 710", notes:"", price:""},
    {id:7, product:"Dressing Mirror",         type:"Mirror",      height:"4",  width:"2.5",qty:"1", matType:"glass",   brand:"Modi Guard Mirror", notes:"", price:""},
    {id:8, product:"Ceiling",           type:"Ceiling",     height:"11.6",width:"12",qty:"1", matType:"ceiling", brand:"Saint Gobin Gyproc", notes:"", price:""},
  ],
  "Guest Bedroom": [
    {id:1, product:"Wardrobe",                type:"Box",         height:"7",  width:"6",  qty:"1", matType:"plywood", brand:"Sainik 710", notes:"", price:""},
    {id:2, product:"Wardrobe Loft",           type:"Frame",       height:"2",  width:"7",  qty:"1", matType:"plywood", brand:"Sainik 710", notes:"", price:""},
    {id:3, product:"Used Clothes Pullout",    type:"Box",         height:"7",  width:"1",  qty:"1", matType:"plywood", brand:"Sainik 710", notes:"", price:""},
    {id:4, product:"Hydraulic Bed",           type:"Bed",         height:"6",  width:"6.5",qty:"1", matType:"",        brand:"", notes:"", price:""},
    {id:5, product:"Bed Cushion",             type:"Cushion",     height:"2",  width:"24", qty:"1", matType:"",        brand:"", notes:"", price:""},
    {id:6, product:"Ceiling",           type:"Ceiling",     height:"12", width:"12", qty:"1", matType:"ceiling", brand:"Saint Gobin Gyproc", notes:"", price:""},
  ],
  "Kitchen": [
    {id:1, product:"Kitchen Counter Below",   type:"Kitchen",     height:"3",  width:"16", qty:"1", matType:"plywood", brand:"Sainik 710", notes:"", price:""},
    {id:2, product:"Kitchen Long Unit",       type:"Kitchen",     height:"7.5",width:"3",  qty:"1", matType:"plywood", brand:"Sainik 710", notes:"", price:""},
    {id:3, product:"Kitchen Loft",            type:"Kitchen",     height:"2",  width:"20", qty:"1", matType:"plywood", brand:"Sainik 710", notes:"Loft 2", price:""},
    {id:4, product:"Kitchen Loft Acrylic",    type:"Acrylic Box Frame",height:"2.5",width:"8",qty:"1",matType:"plywood",brand:"Century Club Prime",notes:"Loft 1", price:""},
    {id:5, product:"Kitchen Loft Profile",    type:"Profile Door",height:"2.5",width:"8",  qty:"1", matType:"glass",   brand:"Modi Guard Mirror", notes:"", price:""},
    {id:6, product:"Kitchen Backslash Tiles", type:"Tiles",       height:"2",  width:"30", qty:"1", matType:"",        brand:"", notes:"", price:""},
    {id:7, product:"Granite Platform",        type:"Granite",     height:"3",  width:"4",  qty:"1", matType:"",        brand:"", notes:"Wash area", price:""},
    {id:8, product:"Sink",                    type:"Sink",        height:"",   width:"",   qty:"3", matType:"",        brand:"", notes:"", price:""},
    {id:9, product:"Ceiling",           type:"Ceiling",     height:"13.4",width:"8.6",qty:"1",matType:"ceiling", brand:"Saint Gobin Gyproc", notes:"", price:""},
  ],
  "Bathroom": [
    {id:1, product:"Bathroom Mirror",         type:"Mirror",      height:"",   width:"",   qty:"1", matType:"glass",   brand:"Modi Guard Mirror", notes:"", price:""},
    {id:2, product:"Bathroom Accessories",    type:"Service",     height:"",   width:"",   qty:"1", matType:"",        brand:"", notes:"", price:""},
    {id:3, product:"Bathroom Lighting",       type:"Service",     height:"",   width:"",   qty:"1", matType:"lights",  brand:"Gola Profile", notes:"", price:""},
  ],
  "Others": [
    {id:1, product:"Electrical",             type:"Service",   height:"", width:"", qty:"1",  matType:"",       brand:"",                   notes:"", price:""},
    {id:2, product:"Channels & Accessories", type:"Channels",  height:"", width:"", qty:"1",  matType:"hardware",brand:"Hettich KA5632 250mm Black Coated", notes:"", price:""},
    {id:3, product:"Small Drawers",          type:"Drawer",    height:"", width:"", qty:"15", matType:"hardware",brand:"Hettich KA5632 250mm Black Coated", notes:"", price:""},
    {id:4, product:"Medium Drawers",         type:"Drawer",    height:"", width:"", qty:"10", matType:"hardware",brand:"Hettich KA5632 250mm Black Coated", notes:"", price:""},
    {id:5, product:"Transport & Cleaning",   type:"Transport", height:"", width:"", qty:"1",  matType:"",       brand:"",                   notes:"", price:""},
  ],
  "Add On": [
    {id:1,  product:"Balcony Wooden PVC Ceiling",        type:"PVC Ceiling",  height:"",   width:"",  qty:"1",  matType:"ceiling", brand:"Saint Gobain Gyproc", notes:"", price:""},
    {id:2,  product:"Mesh Doors",                         type:"Service",      height:"",   width:"",  qty:"1",  matType:"",        brand:"",                   notes:"", price:""},
    {id:3,  product:"Invisible Grill",                    type:"Grill",        height:"",   width:"",  qty:"152",matType:"",        brand:"",                   notes:"", price:""},
    {id:4,  product:"Pleated Mosquito Net Entrance Door", type:"Service",      height:"",   width:"",  qty:"1",  matType:"",        brand:"",                   notes:"", price:""},
    {id:5,  product:"Bathroom Mirror without Light",      type:"Mirror",       height:"",   width:"",  qty:"3",  matType:"glass",   brand:"Modi Guard Mirror",   notes:"", price:""},
    {id:6,  product:"Bathroom Accessories",               type:"Accessories",  height:"",   width:"",  qty:"1",  matType:"",        brand:"",                   notes:"", price:""},
    {id:7,  product:"Bathroom Lighting & Exhaust Fan",    type:"Lights",       height:"",   width:"",  qty:"3",  matType:"lights",  brand:"Phillips 3W",         notes:"", price:""},
    {id:8,  product:"Cloth Dry Hanger",                   type:"Service",      height:"",   width:"",  qty:"1",  matType:"",        brand:"",                   notes:"", price:""},
    {id:9,  product:"Granite on Utility & Balcony Wall",  type:"Granite",      height:"",   width:"",  qty:"2",  matType:"",        brand:"",                   notes:"", price:""},
    {id:10, product:"Bed",                                type:"Bed",          height:"6",  width:"6.5",qty:"1", matType:"",        brand:"",                   notes:"", price:""},
    {id:11, product:"Bed Side Cushion",                   type:"Cushion",      height:"2",  width:"20",qty:"1",  matType:"",        brand:"",                   notes:"", price:""},
    {id:12, product:"Bed Head Board",                     type:"Head Board",   height:"4",  width:"6", qty:"1",  matType:"plywood", brand:"Sainik 710",          notes:"", price:""},
    {id:13, product:"Paints",                             type:"Service",      height:"",   width:"",  qty:"1",  matType:"",        brand:"",                   notes:"", price:""},
  ],
};

// Build default roomWork for a given property type
const buildDefaultRoomWork = (propType) => {
  const rooms = PROPERTY_ROOMS_MAP[propType] || [];
  const rw = {};
  rooms.forEach((room, ri) => {
    const items = DEFAULT_ROOM_WORK[room];
    if (items) {
      rw[room] = items.map((item, ii) => ({
        ...item,
        id: Date.now() + ri * 100 + ii,
      }));
    }
  });
  return rw;
};
const PLYWOOD_OPTIONS = ["Century Club Prime","Green Ply HDHMR","Sainik 710","Block Boards","WPVC"];
const LAMINATE_OPTIONS = ["Virgo","Croma","Acrylic Sheets"];
const HARDWARE_OPTIONS = ["Nimmi Hinges","Nimmi Channels","Hettich Tandem"];
const GLASS_OPTIONS = ["Modi Guard 4mm Black Tinted","Modi Guard Mirror"];
const CEILING_OPTIONS = ["Saint Gobin Gyproc","PVC"];
const LIGHTS_OPTIONS = ["Phillips","Wipro","Panasonic"];
const HANDLES_OPTIONS = ["Gola Profile","Standard"];

// ── Material Catalog with Prices (₹ per sq ft unless noted) ────────
// ── Price sheet from High Rise Interiors (Sheet1 + Sheet2) ──────────
// Sheet1: base price per sq ft by work TYPE
const WORK_TYPE_PRICES = {
  "Frame":                   1250,
  "Panel":                    850,
  "Box":                     1450,
  "Open Box":                1150,
  "Acrylic Box":             1850,
  "Acrylic Box Frame":       1850,
  "Kitchen":                 2000,
  "Wall Panel":               350,
  "Glass":                    850,
  "Cushion":                  850,
  "Tiles":                    550,
  "Granite":                  950,
  "Stone":                    550,
  "Track Light":             3000,
  "Table":                   1250,
  "Wall paper":               150,
  "Partition glass":         1250,
  "Partition PVD":           1350,
  "Louvers":                  800,
  "45 mm Pooja Profile Door":1050,
  "20 mm Pooja Profile Door":1500,
  "Pooja Profile Door":      1050,
  "Profile Door":            1250,
  "Veneer Louvers":          1500,
  "Ceiling":                  300,
  "Ceiling 2":                190,
  "Drawer":                  2100,
  "Quartz Installation":      450,
  "Big Drawers":             2100,
  "CNC":                      450,
  "POP Design":               200,
  "Lights":                   150,
  "Diamond Mirror":           850,
  "PVC Ceiling":              450,
  "Murphy Bed":              2000,
  "Glass Door":              1250,
  "Bed":                     1500,
  "Bunk bed":                3500,
  "Aristo":                  1350,
  "Aristo SBR":              1000,
  "Mirror":                   850,
  "Sink":                    5000,  // per unit estimate
  "Service":                    0,
  "Transport":                  0,
  "45mm Profile Door":       1050,
  "20mm Profile Door":       1500,
  "Head Board":               850,
  "Channels":                   0,
  "Stone":                    550,
  "Roller Shutter":             0,
  "Accessories":                0,  // fixed price item (per unit/set)
  "Grill":                      0,  // fixed price per item
};

// Sheet2: Plywood grade → base plywood price per sqft (16mm)
const PLYWOOD_GRADES = [
  { name:"Local 100% Gurjan",       price:1250 },
  { name:"Century Sainik 710 BWP",  price:1400 },
  { name:"Century Bond Shield",     price:1550 },
  { name:"Century Classic Marine",  price:1650 },
  { name:"Century Club Prime",      price:1850 },
  { name:"Century Architect",       price:2200 },
];

// Sheet2: Laminate type → % increase on work cost
const LAMINATE_TYPES = [
  { name:"Economy Laminate",   range:"₹1,000–1,500", pct:0    },
  { name:"Premium Laminate",   range:"₹1,500–1,800", pct:0.15 },
  { name:"Luxury Laminate",    range:"₹1,800–2,000", pct:0.33 },
  { name:"Ultra Luxury",       range:"₹2,000–2,400", pct:0.50 },
  { name:"Acrylic",            range:"₹2,800–3,500", pct:0.70 },
];

// Sheet2: Built type → % increase
const BUILT_TYPES = [
  { name:"Manual",           pct:0    },
  { name:"Semi Modular",     pct:0.10 },
  { name:"Complete Modular", pct:0.25 },
];

// Sheet2: Hardware → % increase
const HARDWARE_TYPES = [
  { name:"Nimmi",   pct:0    },
  { name:"Hettich", pct:0.10 },
];

// Types that use PER UNIT pricing (not H×W sq ft)
const QTY_UNIT_TYPES = new Set([
  "Drawer","Big Drawers","Bed","Cushion","Sink","Lights","Track Light",
  "Service","Transport","Murphy Bed","Bunk bed","Roller Shutter","Channels",
  "Accessories","Grill","Mirror",
]);
// Alias used throughout the UI (rooms tab, inventory, reports)
const QTY_TYPES = QTY_UNIT_TYPES;

// Compute final price for a single work item
const calcItemPrice = (w, roomSpec) => {
  const type       = w.type || "Box";
  const baseSqft   = WORK_TYPE_PRICES[type] ?? 1000;
  const h          = parseFloat(w.height) || 0;
  const ht         = parseFloat(w.width)  || 0;
  const isQtyUnit  = QTY_UNIT_TYPES.has(type);
  // Base measure: qty-unit types use qty directly; H×W types use sq ft.
  const measure    = isQtyUnit ? 1 : (h * ht);
  // Quantity multiplier — applies on TOP of the base measure for every type,
  // e.g. 2 identical wardrobes, 3 identical drawer units. Defaults to 1.
  const quantity   = parseFloat(w.qty) || 1;
  const qty        = measure * quantity;
  if (qty <= 0) return 0;

  // Plywood grade premium (only for carpentry types)
  const carpentryTypes = new Set(["Frame","Panel","Box","Open Box","Acrylic Box","Acrylic Box Frame","Kitchen","Table","Murphy Bed","Bed","Bunk bed","Aristo","Aristo SBR"]);
  let plywoodExtra = 0;
  if (carpentryTypes.has(type) && roomSpec?.plywoodGrade) {
    const grade = PLYWOOD_GRADES.find(g => g.name === roomSpec.plywoodGrade);
    const base  = PLYWOOD_GRADES[0]; // Local Gurjan = baseline
    if (grade && base) plywoodExtra = (grade.price - base.price) / base.price;
  }

  // Base cost = baseSqft × qty × (1 + plywood premium)
  const baseCost = baseSqft * qty * (1 + plywoodExtra);

  // Laminate % increase
  const lam      = LAMINATE_TYPES.find(l => l.name === (roomSpec?.laminateType || "Economy Laminate"));
  const lamPct   = lam ? lam.pct : 0;

  // Built type % increase
  const built    = BUILT_TYPES.find(b => b.name === (roomSpec?.builtType || "Manual"));
  const builtPct = built ? built.pct : 0;

  // Hardware % increase
  const hw       = HARDWARE_TYPES.find(h => h.name === (roomSpec?.hardware || "Nimmi"));
  const hwPct    = hw ? hw.pct : 0;

  const total = baseCost * (1 + lamPct + builtPct + hwPct);
  return Math.round(total);
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

// ── Material brand catalog (for dropdown options in rooms tab) ─────────
const MATERIAL_CATALOG = {
  plywood: [
    { name:"Century Club Prime",        price:1850, unit:"sq ft" },
    { name:"Century Architect Plywood", price:2200, unit:"sq ft" },
    { name:"Century Classic Marine",    price:1650, unit:"sq ft" },
    { name:"Century Bond Shield",       price:1550, unit:"sq ft" },
    { name:"Century Sainik 710 BWP",    price:1400, unit:"sq ft" },
    { name:"Local 100% Gurjan",         price:1250, unit:"sq ft" },
  ],
  laminate: [
    { name:"Virgo",          price:35,  unit:"sq ft" },
    { name:"Croma",          price:40,  unit:"sq ft" },
    { name:"Acrylic Sheets", price:85,  unit:"sq ft" },
  ],
  hardware: {
    channels: [
      { name:"Hettich KA5632 250mm Black Coated", price:378, unit:"set" },
      { name:"Hettich KA5632 300mm Black Coated", price:415, unit:"set" },
      { name:"Nimmi Channels 250mm",              price:180, unit:"set" },
      { name:"Nimmi Channels 300mm",              price:210, unit:"set" },
    ],
    hinges: [
      { name:"Hettich Clip-on 170°",     price:85,  unit:"pcs" },
      { name:"Hettich Soft Close 110°",  price:120, unit:"pcs" },
      { name:"Nimmi Hinges",             price:45,  unit:"pcs" },
    ],
  },
  glass: [
    { name:"Modi Guard Mirror",          price:180, unit:"sq ft" },
    { name:"Modi Guard 4mm Black Tinted",price:220, unit:"sq ft" },
    { name:"Clear Glass 4mm",            price:120, unit:"sq ft" },
  ],
  ceiling: [
    { name:"Saint Gobain Gyproc",  price:48,  unit:"sq ft" },
    { name:"PVC Ceiling Panel",    price:60,  unit:"sq ft" },
    { name:"Armstrong",            price:85,  unit:"sq ft" },
  ],
  lights: [
    { name:"Phillips 3W",   price:280, unit:"unit" },
    { name:"Phillips 12W",  price:480, unit:"unit" },
    { name:"Gola Profile",  price:350, unit:"rft" },
  ],
  handles: [
    { name:"Gola Profile",  price:280, unit:"rft" },
    { name:"Standard",      price:80,  unit:"unit" },
  ],
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
// ── Products per room — matches High Rise Interiors quotation format ─────
const ROOM_PRODUCTS = {
  "Entrance": [
    { name:"Shoe Rack",              type:"Box",               mats:["plywood","laminate","hardware"] },
    { name:"Entrance Frame",         type:"Frame",             mats:["plywood","laminate"] },
    { name:"Entrance Ceiling",       type:"Ceiling",           mats:["ceiling","lights"] },
    { name:"Tiles",                  type:"Tiles",             mats:[] },
    { name:"Main Door Frame",        type:"Frame",             mats:["plywood","laminate"] },
  ],
    "Drawing Room": [
    { name:"TV Unit Bottom Box",         type:"Box",               mats:["plywood","laminate","hardware"] },
    { name:"TV Unit Back Panel",         type:"Frame",             mats:["plywood","laminate"] },
    { name:"TV Unit Glass Profile",      type:"45mm Profile Door", mats:["glass"] },
    { name:"TV Unit Long Unit",          type:"Box",               mats:["plywood","laminate","hardware"] },
    { name:"Crockery Tall Unit",         type:"Box",               mats:["plywood","laminate","hardware"] },
    { name:"Crockery Tall Unit Profile", type:"45mm Profile Door", mats:["glass"] },
    { name:"Crockery Top Box",           type:"Box",               mats:["plywood","laminate","hardware"] },
    { name:"Crockery Bottom Box",        type:"Box",               mats:["plywood","laminate","hardware"] },
    { name:"Crockery Top Box Profile",   type:"45mm Profile Door", mats:["glass"] },
    { name:"Diamond Mirror",             type:"Mirror",            mats:["glass"] },
    { name:"Wooden Ceiling",             type:"Ceiling",           mats:["ceiling","lights"] },
    { name:"Ceiling",                    type:"Ceiling",           mats:["ceiling","lights"] },
    { name:"POP Design",                 type:"POP Design",        mats:[] },
    { name:"TV Unit Louvers",            type:"Louvers",           mats:["plywood","laminate"] },
    { name:"TV Unit Partition",          type:"Partition glass",   mats:["glass"] },
  ],
  "Living Area": [
    { name:"Crockery Top Box",       type:"Open Box",      mats:["plywood","laminate"] },
    { name:"Crockery Profile Glass", type:"Profile Door",  mats:["plywood","laminate","glass"] },
    { name:"Crockery Long Glass Box",type:"Open Box",      mats:["plywood","laminate"] },
    { name:"Crockery Bottom Box",    type:"Box",           mats:["plywood","laminate","hardware"] },
    { name:"Crockery Top Loft",      type:"Frame",         mats:["plywood","laminate"] },
    { name:"Granite Platform",       type:"Granite",       mats:[] },
    { name:"Diamond Mirror",         type:"Diamond Mirror",mats:["glass"] },
    { name:"POP Design",             type:"POP Design",    mats:[] },
    { name:"Ceiling",                type:"Ceiling",       mats:["ceiling","lights"] },
  ],
  "Dining": [
    { name:"Ceiling",                type:"Ceiling",       mats:["ceiling","lights"] },
    { name:"POP Design",             type:"POP Design",    mats:[] },
    { name:"Crockery Unit",          type:"Box",           mats:["plywood","laminate","hardware"] },
    { name:"Granite Platform",       type:"Granite",       mats:[] },
    { name:"Tiles",                  type:"Tiles",         mats:[] },
  ],
  "Master Bedroom": [
    { name:"Wardrobe",                   type:"Box",               mats:["plywood","laminate","hardware"] },
    { name:"Wardrobe Loft",              type:"Frame",             mats:["plywood","laminate"] },
    { name:"Study Table",                type:"Box",               mats:["plywood","laminate","hardware"] },
    { name:"Used Clothes Section",       type:"Box",               mats:["plywood","laminate","hardware"] },
    { name:"Side Table",                 type:"Box",               mats:["plywood","laminate","hardware"] },
    { name:"Dressing Mirror",            type:"Mirror",            mats:["glass"] },
    { name:"Bed Back Panel",             type:"Panel",             mats:["plywood","laminate"] },
    { name:"Hydraulic Bed",              type:"Bed",               mats:[] },
    { name:"Bed Cushion",                type:"Cushion",           mats:[] },
    { name:"Head Board",                 type:"Head Board",        mats:["plywood","laminate"] },
    { name:"Wardrobe Sensor Lighting",   type:"Lights",            mats:["lights"] },
    { name:"TV Unit",                    type:"Box",               mats:["plywood","laminate","hardware"] },
    { name:"Ceiling",                    type:"Ceiling",           mats:["ceiling","lights"] },
  ],
  "Children Bedroom": [
    { name:"Wardrobe",                   type:"Box",               mats:["plywood","laminate","hardware"] },
    { name:"Wardrobe Loft",              type:"Frame",             mats:["plywood","laminate"] },
    { name:"Side Table",                 type:"Box",               mats:["plywood","laminate","hardware"] },
    { name:"Dressing",                   type:"Box",               mats:["plywood","laminate","hardware"] },
    { name:"Dressing Mirror",            type:"Mirror",            mats:["glass"] },
    { name:"Hydraulic Bed",              type:"Bed",               mats:[] },
    { name:"Bed Cushion",                type:"Cushion",           mats:[] },
    { name:"Study Table",                type:"Box",               mats:["plywood","laminate","hardware"] },
    { name:"Window Below Box",           type:"Box",               mats:["plywood","laminate","hardware"] },
    { name:"Wardrobe Sensor Lighting",   type:"Lights",            mats:["lights"] },
    { name:"Ceiling",                    type:"Ceiling",           mats:["ceiling","lights"] },
  ],
  "Guest Bedroom": [
    { name:"Wardrobe",                   type:"Box",               mats:["plywood","laminate","hardware"] },
    { name:"Wardrobe Loft",              type:"Frame",             mats:["plywood","laminate"] },
    { name:"Study",                      type:"Frame",             mats:["plywood","laminate"] },
    { name:"Dressing",                   type:"Box",               mats:["plywood","laminate","hardware"] },
    { name:"Dressing Mirror",            type:"Mirror",            mats:["glass"] },
    { name:"Hydraulic Bed",              type:"Bed",               mats:[] },
    { name:"Bed Cushion",                type:"Cushion",           mats:[] },
    { name:"Head Board",                 type:"Head Board",        mats:["plywood","laminate"] },
    { name:"Used Clothes Pullout",       type:"Box",               mats:["plywood","laminate","hardware"] },
    { name:"Ceiling",                    type:"Ceiling",           mats:["ceiling","lights"] },
  ],
  "Study Room": [
    { name:"Study Table",            type:"Box",           mats:["plywood","laminate","hardware"] },
    { name:"Bookshelf",              type:"Open Box",      mats:["plywood","laminate"] },
    { name:"Wardrobe",               type:"Box",           mats:["plywood","laminate","hardware"] },
    { name:"Ceiling",                type:"Ceiling",       mats:["ceiling","lights"] },
  ],

  "Kitchen": [
    { name:"Kitchen Counter Below",      type:"Kitchen",           mats:["plywood","laminate","hardware"] },
    { name:"Kitchen Stone Installation", type:"Stone",             mats:[] },
    { name:"Kitchen Backslash Tiles",    type:"Tiles",             mats:[] },
    { name:"Kitchen Loft 1",             type:"Kitchen",           mats:["plywood","laminate","hardware"] },
    { name:"Kitchen Loft 1 Profile",     type:"45mm Profile Door", mats:["glass"] },
    { name:"Kitchen Loft 2",             type:"Kitchen",           mats:["plywood","laminate","hardware"] },
    { name:"Roller Shutter",             type:"Roller Shutter",    mats:[] },
    { name:"Wash Area",                  type:"Box",               mats:["plywood","laminate","hardware"] },
    { name:"Utility Granite Platform",   type:"Granite",           mats:[] },
    { name:"Kitchen Ceiling",            type:"Ceiling",           mats:["ceiling","lights"] },
    { name:"Sink",                       type:"Sink",              mats:[] },
  ],
  "Pooja": [
    { name:"Pooja Box",                  type:"Box",               mats:["plywood","laminate","hardware"] },
    { name:"Pooja Door",                 type:"20mm Profile Door", mats:["glass"] },
    { name:"Pooja Back Glass",           type:"Glass",             mats:["glass"] },
    { name:"Pooja Drawer",               type:"Drawer",            mats:["hardware"] },
    { name:"Pooja Tiles",                type:"Tiles",             mats:[] },
    { name:"Pooja Ceiling",              type:"Ceiling",           mats:["ceiling","lights"] },
  ],
  "Bathroom": [
    { name:"Bathroom Mirror",            type:"Mirror",            mats:["glass"] },
    { name:"Bathroom Accessories",       type:"Service",           mats:[] },
    { name:"Bathroom Lighting & Exhaust",type:"Lights",            mats:["lights"] },
    { name:"Bathroom Tiles",             type:"Tiles",             mats:[] },
    { name:"Bathroom Granite",           type:"Granite",           mats:[] },
  ],
  "Balcony": [
    { name:"Balcony Wooden PVC Ceiling", type:"PVC Ceiling",       mats:["ceiling"] },
    { name:"Invisible Grill",            type:"Service",           mats:[] },
    { name:"Granite on Utility Wall",    type:"Granite",           mats:[] },
    { name:"Cloth Dry Hanger",           type:"Service",           mats:[] },
    { name:"Balcony Ceiling",            type:"Ceiling",           mats:["ceiling","lights"] },
  ],
  "Others": [
    { name:"Electrical",                 type:"Service",           mats:[] },
    { name:"Channels & Accessories",     type:"Channels",          mats:["hardware"] },
    { name:"Small Drawers",              type:"Drawer",            mats:["hardware"] },
    { name:"Medium Drawers",             type:"Drawer",            mats:["hardware"] },
    { name:"Transport & Cleaning",       type:"Transport",         mats:[] },
    { name:"Bed",                        type:"Bed",               mats:[] },
    { name:"Head Board",                 type:"Head Board",        mats:["plywood","laminate"] },
    { name:"Bed Cushion",                type:"Cushion",           mats:[] },
    { name:"Paints",                     type:"Service",           mats:[] },
    { name:"Mesh Doors",                 type:"Service",           mats:[] },
    { name:"Mosquito Net",               type:"Service",           mats:[] },
  ],
  "Add On": [
    { name:"Balcony Wooden PVC Ceiling",       type:"PVC Ceiling",  mats:["ceiling"] },
    { name:"Mesh Doors",                        type:"Service",      mats:[] },
    { name:"Invisible Grill",                   type:"Grill",        mats:[] },
    { name:"Pleated Mosquito Net Entrance Door",type:"Service",      mats:[] },
    { name:"Bathroom Mirror without Light",     type:"Mirror",       mats:["glass"] },
    { name:"Bathroom Accessories",              type:"Accessories",  mats:[] },
    { name:"Bathroom Lighting & Exhaust Fan",   type:"Lights",       mats:["lights"] },
    { name:"Cloth Dry Hanger",                  type:"Service",      mats:[] },
    { name:"Granite on Utility & Balcony Wall", type:"Granite",      mats:[] },
    { name:"Bed",                               type:"Bed",          mats:[] },
    { name:"Bed Side Cushion",                  type:"Cushion",      mats:[] },
    { name:"Bed Head Board",                    type:"Head Board",   mats:["plywood","laminate"] },
    { name:"Paints",                            type:"Service",      mats:[] },
  ],
};

// Returns the product list for a given room (always an array, never undefined)
const getProductsForRoom = (room) => ROOM_PRODUCTS[room] || [];

// Flattened list of every product across all rooms — used as last-resort fallback
const ALL_PRODUCTS = Object.values(ROOM_PRODUCTS).flat();


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
const LOGO_SRC = "data:image/png;base64,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";


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
function ClientReport({ selected, setView, customers, setCustomers, showToast }) {
  // Inline makeEntry so it's available without App() scope
  const makeEntry = (type, summary, snapshot={}, user="", signatures={}) => ({
    ts: new Date().toISOString(), type, user, summary, snapshot, signatures,
  });
  const [showSigPad,   setShowSigPad]   = React.useState(null);
  const [includeAddOn, setIncludeAddOn] = React.useState(selected.quotationIncludesAddOn !== false);
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
  // "Out of scope" = only lines that explicitly say "out of scope" or "not included"
  // "Included" items (lines starting with "Included :") are shown separately
  const outOfScope  = noteLines.filter(l=>/^out of scope|not included|excluded/i.test(l.trim()));
  const includedItems = noteLines.filter(l=>/^(✗\s*)?included\s*:/i.test(l.trim()));
  const discussions = noteLines.filter(l=>!scopeLines.includes(l)&&!outOfScope.includes(l)&&!includedItems.includes(l));
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

  // ── Print styles ─────────────────────────────────────────────────────

  // ── Generate plain HTML for print (no React, no CSS class issues) ───
  // ── Shared calculations (used by both on-screen and print) ─────────
  const fmtN = (n) => '₹' + Number(n).toLocaleString('en-IN');
  const ADD_ON_ROOMS_P  = new Set(["Add On"]);
  const allRoomsP       = selected.rooms || [];
  const lp              = selected.labourPct != null ? selected.labourPct : 50;
  const labourMult      = 1 + lp / 100;
  // calcRoomP returns raw material cost; calcRoomWithLabour includes labour
  const calcRoomP       = (room) => {
    const works = selected.roomWork?.[room] || [];
    const spec  = selected.roomDetails?.[room] || {};
    return works.reduce((t, w) => t + (w.price ? parseFloat(w.price) : calcItemPrice(w, spec)), 0);
  };
  const calcRoomWithLabour = (room) => Math.round(calcRoomP(room) * labourMult);
  const rawInteriorP    = allRoomsP.filter(r => !ADD_ON_ROOMS_P.has(r)).reduce((t,r) => t + calcRoomP(r), 0);
  const rawAddOnP       = allRoomsP.filter(r =>  ADD_ON_ROOMS_P.has(r)).reduce((t,r) => t + calcRoomP(r), 0);
  const rawTotalP       = rawInteriorP + rawAddOnP;
  // With-labour totals for interior and add-on
  const interiorWithLabourP = Math.round(rawInteriorP * labourMult);
  const addOnWithLabourP    = Math.round(rawAddOnP    * labourMult);
  const totalWithLabourP    = interiorWithLabourP + addOnWithLabourP;
  // finalQuoteP: use saved quotation if set, otherwise auto-calc with labour
  const finalQuoteP     = parseFloat(selected.quotation) || totalWithLabourP;
  const interiorQuoteP  = rawTotalP > 0 ? Math.round(finalQuoteP * (rawInteriorP / rawTotalP)) : finalQuoteP;
  const addOnQuoteP     = rawTotalP > 0 ? Math.round(finalQuoteP * (rawAddOnP    / rawTotalP)) : 0;
  const effectiveQuoteP = includeAddOn ? finalQuoteP : interiorQuoteP;
  // Per-room amount: proportional slice of effectiveQuote, includes labour since effectiveQuote does
  const roomAmtP        = (room) => {
    const denom = includeAddOn ? rawTotalP : rawInteriorP;
    return denom > 0 ? Math.round(effectiveQuoteP * (calcRoomP(room) / denom)) : 0;
  };

  const generatePrintHTML = () => {

    const td = (val, bold, right, color) =>
      `<td style="padding:6px 10px;border-bottom:1px solid #ddd;font-size:11px;${bold?'font-weight:700;':''}${right?'text-align:right;':''}${color?'color:'+color+';':''}">${val||'—'}</td>`;
    const th = (val, right) =>
      `<th style="padding:6px 10px;border-bottom:2px solid #1e3a5f;font-size:9px;text-align:${right?'right':'left'};text-transform:uppercase;letter-spacing:1px;color:#1e3a5f;font-weight:700;">${val}</th>`;

    // Scope rows
    let scopeHTML = '';
    roomsP.forEach(r => {
      const works = (selected.roomWork?.[r] || []).filter(w => w.product);
      if (!works.length) return;
      const isAddon = ADD_ON_ROOMS_P.has(r);
      const rAmt = roomAmtP(r);
      const borderColor = isAddon ? '#92400e' : '#1e3a5f';
      scopeHTML += `
        <div style="margin-bottom:16px;border:1px solid #ddd;">
          <div style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:2px solid ${borderColor};">
            <span style="font-weight:700;font-size:13px;color:${borderColor};">&#127  ${r}</span>
            ${finalQuoteP > 0 ? `<span style="font-weight:700;font-size:13px;color:${borderColor};">${fmtN(rAmt)}</span>` : ''}
          </div>
          <table style="width:100%;border-collapse:collapse;">
            <thead><tr style="background:#f5f5f5;">
              ${th('Product')}${th('Type')}${th('H × W')}${th('Qty',true)}${th('Brand')}
            </tr></thead>
            <tbody>
              ${works.map((w,i) => {
                const sqft = w.height && w.width
                  ? w.height + '×' + w.width + ' (' + (parseFloat(w.height)*parseFloat(w.width)).toFixed(1) + ' sft)'
                  : '—';
                const qty = parseFloat(w.qty) || 1;
                return `<tr style="background:${i%2===0?'#fff':'#fafafa'};">
                  ${td('<b>'+w.product+'</b>'+(w.notes?'<br><small style=color:#999>'+w.notes+'</small>':''),false)}
                  ${td(w.type)}
                  ${td((QTY_TYPES&&QTY_TYPES.has(w.type))?'—':sqft)}
                  ${td('×'+qty,true,true)}
                  ${td(w.brand||'—')}
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`;
    });

    // Materials list
    const matList = [];
    allRoomsP.forEach(room => {
      (selected.roomWork?.[room]||[]).forEach(w => {
        if (!w.brand || !w.matType) return;
        const ex = matList.find(m => m.matType === w.matType && m.brand === w.brand);
        if (!ex) matList.push({ matType: w.matType, brand: w.brand, rooms: [room] });
        else if (!ex.rooms.includes(room)) ex.rooms.push(room);
      });
    });

    // Cost breakdown
    const interiorRoomsP = roomsP.filter(r => !ADD_ON_ROOMS_P.has(r) && calcRoomP(r) > 0);
    const addOnRoomsP    = roomsP.filter(r =>  ADD_ON_ROOMS_P.has(r) && calcRoomP(r) > 0);
    const interiorAmtP = includeAddOn
      ? (rawTotalP > 0 ? Math.round(finalQuoteP*(rawInteriorP/rawTotalP)) : finalQuoteP)
      : effectiveQuoteP;
    const addOnAmtP = includeAddOn
      ? (rawTotalP > 0 ? Math.round(finalQuoteP*(rawAddOnP/rawTotalP)) : 0)
      : 0;

    const addOnQuoteP = rawTotalP > 0 ? Math.round(finalQuoteP*(rawAddOnP/rawTotalP)) : 0;
    const lp = selected.labourPct != null ? selected.labourPct : 50;

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Client Report — ${selected.name}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size:12px; color:#222; background:#fff; padding:20px; }
  h1 { font-size:20px; font-weight:900; color:#111; }
  h2 { font-size:9px; font-weight:700; letter-spacing:3px; text-transform:uppercase;
       color:#1e3a5f; border-bottom:2px solid #1e3a5f; padding-bottom:5px;
       margin:24px 0 12px; }
  table { width:100%; border-collapse:collapse; font-size:11px; }
  th { padding:6px 10px; text-align:left; border-bottom:2px solid #1e3a5f;
       font-size:9px; text-transform:uppercase; letter-spacing:1px; color:#1e3a5f; }
  td { padding:6px 10px; border-bottom:1px solid #eee; vertical-align:top; }
  .row { display:flex; justify-content:space-between; padding:8px 0;
         border-bottom:1px solid #eee; }
  .hdr { display:flex; justify-content:space-between; margin-bottom:24px;
         padding-bottom:12px; border-bottom:2px solid #1e3a5f; }
  .final-bar { display:flex; justify-content:space-between; padding:12px 16px;
               border:2px solid #1e3a5f; margin-top:8px; }
  @media print {
    body { padding:0; }
    @page { margin:12mm 10mm; size:A4; }
  }
</style>
</head>
<body>

<!-- HEADER -->
<div class="hdr">
  <div>
    <h1>HIGH RISE INTERIORS</h1>
    <div style="font-size:10px;color:#666;letter-spacing:2px;text-transform:uppercase;margin-top:4px;">Interior Design Proposal</div>
  </div>
  <div style="text-align:right;">
    <div style="font-size:11px;color:#666;">${d}</div>
    ${finalQuoteP > 0 ? `<div style="font-size:20px;font-weight:900;color:#1e3a5f;margin-top:4px;">${fmtN(effectiveQuoteP)}</div>` : ''}
    ${!includeAddOn && addOnQuoteP > 0 ? `<div style="font-size:10px;color:#92400e;">(Add On ${fmtN(addOnQuoteP)} in Annexure)</div>` : ''}
  </div>
</div>

<!-- 1. CLIENT INFORMATION -->
<h2>1. Client Information</h2>
<table>
  <tbody>
    ${[['Client Name',selected.name],['Phone',selected.phone],['Email',selected.email],
       ['Address',selected.address],['Property Type',selected.propertyType],
       ['Style',selected.style],['Timeline',selected.timeline],['Start Date',selected.startDate]]
      .filter(([,v])=>v).map(([l,v])=>`<tr><td style="color:#666;width:30%">${l}</td><td><b>${v}</b></td></tr>`).join('')}
  </tbody>
</table>

<!-- 2. PROJECT SUMMARY -->
<h2>2. Project Summary</h2>
${(()=>{
  const irms = allRoomsP.filter(r => !ADD_ON_ROOMS_P.has(r) && calcRoomP(r)>0);
  const adrms = allRoomsP.filter(r => ADD_ON_ROOMS_P.has(r) && calcRoomP(r)>0);
  const totalSqft = irms.reduce((t,r)=>{
    return t+(selected.roomWork?.[r]||[]).reduce((s,w)=>
      s+(w.height&&w.width?parseFloat(w.height)*parseFloat(w.width)*(parseFloat(w.qty)||1):0),0);
  },0);
  const matSet={};
  allRoomsP.forEach(r=>(selected.roomWork?.[r]||[]).forEach(w=>{if(w.brand&&w.matType&&!matSet[w.matType])matSet[w.matType]=w.brand;}));
  const matLine=[matSet.plywood&&'Plywood: '+matSet.plywood,matSet.ceiling&&'Ceiling: '+matSet.ceiling,matSet.glass&&'Glass: '+matSet.glass,matSet.hardware&&'Hardware: '+matSet.hardware].filter(Boolean).join(' · ');
  return `<p style="font-size:12px;line-height:1.9;margin-bottom:12px;">
    High Rise Interiors is pleased to present this interior design proposal for <b>${selected.name}</b>'s
    ${selected.propertyType||'residence'}${selected.address?' at '+selected.address:''}.
    Designed in a <b>${selected.style||'contemporary'}</b> aesthetic, scheduled for completion in
    <b>${selected.timeline||'120 days'}</b>${selected.startDate?', commencing '+new Date(selected.startDate).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}):''},
    covering <b>${irms.length} interior room${irms.length!==1?'s':''}</b>${adrms.length?' plus '+adrms.length+' add-on area':''}
    ${totalSqft>0?'with approximately <b>'+Math.round(totalSqft)+' sq ft</b> of carpentry work':''}.
    ${matLine?'<br><b>Primary Materials:</b> '+matLine:''}
  </p>
  <table>
    <thead><tr><th>Room</th><th>Items</th><th>Work Area (sq ft)</th><th>Plywood Grade</th></tr></thead>
    <tbody>
      ${irms.map((r,i)=>{
        const works=(selected.roomWork?.[r]||[]).filter(w=>w.product);
        const sqft=works.reduce((s,w)=>s+(w.height&&w.width?parseFloat(w.height)*parseFloat(w.width)*(parseFloat(w.qty)||1):0),0);
        const spec=selected.roomDetails?.[r]||{};
        return `<tr style="background:${i%2===0?'#fff':'#fafafa'}">
          <td>&#127 ${r}</td>
          <td style="text-align:center">${works.length}</td>
          <td style="text-align:center">${sqft>0?sqft.toFixed(0)+' sq ft':'—'}</td>
          <td>${spec.plywoodGrade||matSet.plywood||'—'}</td>
        </tr>`;
      }).join('')}
      ${totalSqft>0?`<tr style="background:#f0f0f0;font-weight:700;"><td>Total</td><td style="text-align:center">${irms.reduce((t,r)=>t+(selected.roomWork?.[r]||[]).filter(w=>w.product).length,0)}</td><td style="text-align:center">${Math.round(totalSqft)} sq ft</td><td></td></tr>`:''}
    </tbody>
  </table>`;
})()}

<!-- 3. SCOPE OF WORK -->
<h2>3. Scope of Work</h2>
${scopeHTML}

<!-- 4. MATERIALS ORDER LIST -->
<h2>4. Materials Order List &amp; Specifications</h2>
<table>
  <thead><tr><th>#</th><th>Category</th><th>Brand / Specification</th><th>Used In</th></tr></thead>
  <tbody>
    ${matList.map((m,i)=>`<tr style="background:${i%2===0?'#fff':'#fafafa'}">
      <td>${i+1}</td><td style="text-transform:capitalize">${m.matType}</td>
      <td><b>${m.brand}</b></td><td style="color:#666;font-size:10px">${m.rooms.join(', ')}</td>
    </tr>`).join('')}
  </tbody>
</table>

${includedItems.length>0?`<h2>5. Included in Scope</h2>
<div style="padding:10px 14px;border-left:3px solid #16a34a;margin-bottom:16px;">
  ${includedItems.map(l=>`<div style="color:#166534;margin-bottom:4px;">✓ ${l.replace(/^(✗\s*)?included\s*:\s*/i,'')}</div>`).join('')}
</div>`:''}

${outOfScope.length>0?`<h2>${includedItems.length>0?'6.':'5.'} Out of Scope</h2>
<div style="padding:10px 14px;border-left:3px solid #dc2626;margin-bottom:16px;">
  ${outOfScope.map(l=>`<div style="color:#7A0000;margin-bottom:4px;">✗ ${l.replace(/^(out of scope|not included|excluded)\s*:?\s*/i,'')}</div>`).join('')}
</div>`:''}

<!-- 7. COST BREAKDOWN -->
${finalQuoteP>0?`<h2>7. Cost Breakdown</h2>
<p style="font-size:10px;color:#666;margin-bottom:8px;">All amounts include materials &amp; labour</p>
${interiorRoomsP.length>0?`
<table style="margin-bottom:8px;">
  <thead><tr><th colspan="2" style="color:#1e3a5f;">Interior Works</th><th style="text-align:right;color:#1e3a5f;">${fmtN(interiorAmtP)}</th></tr></thead>
  <tbody>
    ${interiorRoomsP.map((r,i)=>`<tr style="background:${i%2===0?'#fff':'#fafafa'}">
      <td style="padding-left:20px;width:10px;color:#666">&#127</td>
      <td>${r}</td>
      <td style="text-align:right;font-weight:600;">${fmtN(roomAmtP(r))}</td>
    </tr>`).join('')}
  </tbody>
</table>`:''}
${addOnRoomsP.length>0?`
<table style="margin-bottom:8px;">
  <thead><tr><th colspan="2" style="color:#92400e;">Add On</th><th style="text-align:right;color:#92400e;">${fmtN(addOnAmtP)}</th></tr></thead>
  <tbody>
    ${addOnRoomsP.map((r,i)=>`<tr style="background:${i%2===0?'#fff':'#fffbf0'}">
      <td style="padding-left:20px;width:10px;color:#666">&#127</td>
      <td>${r}</td>
      <td style="text-align:right;font-weight:600;">${fmtN(roomAmtP(r))}</td>
    </tr>`).join('')}
  </tbody>
</table>`:''}
<div class="final-bar">
  <span style="font-weight:700;font-size:14px;">Final Quotation</span>
  <span style="font-weight:900;font-size:16px;color:#1e3a5f;">${fmtN(effectiveQuoteP)}</span>
</div>`:''}

<!-- 8. BUDGET SUMMARY -->
<h2>8. Budget Summary</h2>
${selected.previousQuotation?`<div class="row"><span style="color:#666">Previous Quotation</span><span style="text-decoration:line-through;color:#999">${fmtN(selected.previousQuotation)}</span></div>`:''}
${selected.rebateValue&&Number(selected.rebateValue)>0?`<div class="row"><span style="color:#166534;font-weight:600">Rebate / Discount</span><span style="color:#166534;font-weight:700">- ${fmtN(selected.rebateValue)}</span></div>`:''}
<div class="row"><span style="font-weight:600">Final Quotation</span><span style="font-weight:900;font-size:15px;color:#1e3a5f;">${fmtN(effectiveQuoteP)}</span></div>
${!includeAddOn&&addOnQuoteP>0?`<div style="padding:8px 12px;border:1px solid #fde68a;margin-top:8px;color:#92400e;font-size:11px;">ℹ Add On (${fmtN(addOnQuoteP)}) not included — see Annexure below</div>`:''}

<!-- 9. FINAL QUOTATION -->
${finalQuoteP>0?`<h2>9. Final Quotation</h2>
<div style="display:flex;justify-content:space-between;align-items:center;border:2px solid #1e3a5f;padding:16px 20px;margin-bottom:16px;">
  <div><div style="font-size:11px;color:#666;">Inclusive of materials &amp; labour</div></div>
  <div style="font-size:26px;font-weight:900;color:#1e3a5f;">${fmtN(effectiveQuoteP)}</div>
</div>`:''}

<!-- 10. PROJECT TIMELINE -->
<h2>10. Project Timeline</h2>
${(()=>{
  const totalD=parseInt(selected.timeline)||120;
  const start=selected.startDate?new Date(selected.startDate):null;
  const plan=selected.projectPlan||{};
  const PHASES=[
    {key:'requirements',label:'Requirements & Planning',from:0,to:6},
    {key:'design',label:'Design Finalisation',from:6,to:12},
    {key:'designFinal',label:'Design Approval',from:12,to:18},
    {key:'ceiling',label:'Ceiling & Civil Work',from:18,to:26},
    {key:'procurement',label:'Material Procurement',from:26,to:48},
    {key:'graniteTiles',label:'Granite & Tiles',from:48,to:54},
    {key:'woodFraming',label:'Wood Framing & Carpentry',from:54,to:69},
    {key:'deco',label:'Decoration & Finishing',from:69,to:76},
    {key:'painting',label:'Painting',from:76,to:83},
    {key:'cleaning',label:'Site Cleaning',from:83,to:86},
    {key:'handover',label:'Handover',from:86,to:87},
    {key:'cooling',label:'Settling & Cooling',from:87,to:100},
  ];
  return `<table>
    <thead><tr><th>Phase</th><th>Day Start</th><th>Duration</th><th>Status</th></tr></thead>
    <tbody>
      ${PHASES.map((ph,i)=>{
        const startDay=Math.max(1,Math.round(ph.from/100*totalD)+1);
        const dur=Math.max(1,Math.round((ph.to-ph.from)/100*totalD));
        const sd=start?new Date(start.getTime()+(startDay-1)*86400000).toLocaleDateString('en-IN',{day:'numeric',month:'short'}):'Day '+startDay;
        const status=plan[ph.key]?.status||'Not Started';
        return `<tr style="background:${i%2===0?'#fff':'#fafafa'}">
          <td><b>${ph.label}</b></td><td>${sd}</td><td>${dur} days</td>
          <td style="color:${status==='Completed'?'#16a34a':status==='In Progress'?'#1e3a5f':'#666'}">${status}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>`;
})()}

<!-- 11. DISCLAIMERS -->
<h2>11. Disclaimers &amp; Terms</h2>
<div style="font-size:12px;line-height:2;">
  <div><b>1. No Refund Policy:</b> All payments are strictly non-refundable once work has commenced.</div>
  <div><b>2. Draft Quotation:</b> This is a draft and may vary based on final quantity and material selection.</div>
  <div><b>3. Material Prices:</b> Subject to market fluctuations. Valid for 30 days from date of issue.</div>
  <div><b>4. Scope Changes:</b> Any additions will be quoted and billed separately with written approval.</div>
  <div><b>5. Timeline:</b> ${selected.timeline||'Agreed duration'} is indicative. Delays due to civil work or approvals not included.</div>
  <div><b>6. Warranty:</b> 1-year workmanship warranty. Material warranty per manufacturer.</div>
  <div><b>7. Cancellation:</b> Amounts paid till date are forfeited upon cancellation after commencement.</div>
  <div><b>8. Dispute Resolution:</b> Subject to jurisdiction of Hyderabad courts only.</div>
</div>

<!-- SIGNATURES -->
<div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:40px;border-top:2px solid #eee;padding-top:20px;">
  <div>
    <div style="font-size:9px;color:#666;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Client Signature</div>
    <div style="font-weight:700;font-size:14px;margin-bottom:40px;">${selected.name}</div>
    <div style="border-top:1px solid #333;padding-top:6px;font-size:10px;color:#666;">Signature &amp; Date</div>
  </div>
  <div>
    <div style="font-size:9px;color:#666;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Authorised By</div>
    <div style="font-weight:700;font-size:14px;color:#1e3a5f;margin-bottom:40px;">High Rise Interiors</div>
    <div style="border-top:1px solid #333;padding-top:6px;font-size:10px;color:#666;">Signature &amp; Date</div>
  </div>
</div>

${!includeAddOn&&rawAddOnP>0?`
<div style="margin-top:40px;border-top:2px solid #eee;padding-top:24px;">
  <h2 style="margin-top:0;">ANNEXURE — Additional Works (Add On)</h2>
  <p style="font-size:11px;color:#666;margin-bottom:12px;">These items are not included in the Final Quotation above. If selected, the estimated total increases as shown.</p>
  ${allRoomsP.filter(r=>ADD_ON_ROOMS_P.has(r)).map(r=>{
    const works=(selected.roomWork?.[r]||[]).filter(w=>w.product);
    if(!works.length)return '';
    return `<div style="margin-bottom:12px;border:1px solid #fde68a;">
      <div style="padding:8px 12px;border-bottom:2px solid #92400e;display:flex;justify-content:space-between;">
        <span style="font-weight:700;color:#92400e;">&#127 ${r}</span>
        <span style="font-weight:700;color:#92400e;">${fmtN(rawTotalP>0?Math.round(addOnQuoteP*(calcRoomP(r)/rawAddOnP)):0)}</span>
      </div>
      <table>
        <thead><tr style="background:#fef3c7;"><th>Product</th><th>Type</th><th>H×W</th><th>Qty</th><th>Brand</th></tr></thead>
        <tbody>
          ${works.map((w,i)=>{
            const sq=w.height&&w.width?w.height+'×'+w.width:'—';
            return `<tr style="background:${i%2===0?'#fff':'#fffbf0'}">
              <td><b>${w.product}</b></td><td>${w.type}</td><td>${sq}</td>
              <td style="text-align:right">×${parseFloat(w.qty)||1}</td><td>${w.brand||'—'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
  }).join('')}
  <div style="border:2px solid #92400e;padding:14px 16px;margin-top:12px;">
    <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>Interior Works</span><span style="font-weight:700">${fmtN(effectiveQuoteP)}</span></div>
    <div style="display:flex;justify-content:space-between;padding-bottom:8px;border-bottom:1px solid #fde68a;"><span>Add On (estimated)</span><span style="font-weight:700;color:#92400e;">+ ${fmtN(addOnQuoteP)}</span></div>
    <div style="display:flex;justify-content:space-between;margin-top:8px;"><span style="font-weight:700;font-size:14px;">Estimated Total</span><span style="font-weight:900;font-size:18px;color:#92400e;">${fmtN(effectiveQuoteP+addOnQuoteP)}</span></div>
  </div>
</div>`:''}

<div style="margin-top:30px;border-top:1px solid #eee;padding-top:12px;display:flex;justify-content:space-between;font-size:10px;color:#999;">
  <span>High Rise Interiors — Powered by Genovatech IT Services Pvt. Ltd.</span>
  <span>${d}</span>
</div>

</body>
</html>`;
  };

  // Simple on-screen view (no colored backgrounds to cause issues)
  return (
    <div style={{ background:"#fff", minHeight:"100vh",
      fontFamily:"'DM Sans',system-ui,sans-serif", color:"#0F1923" }}>

      {/* ── TOOLBAR ── */}
      <div className="no-print" style={{ position:"sticky",top:0,zIndex:100,
        background:"rgba(255,255,255,0.97)",backdropFilter:"blur(8px)",
        borderBottom:"1px solid #e5e7eb",padding:"10px 24px",
        display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8 }}>
        <div style={{ display:"flex",alignItems:"center",gap:12 }}>
          <button onClick={()=>setView("list")}
            style={{ fontSize:12,padding:"6px 14px",fontWeight:600,cursor:"pointer",
              background:"#f3f4f6",color:"#374151",border:"1px solid #d1d5db",
              borderRadius:8,fontFamily:"inherit" }}>← Back</button>
          <div style={{ fontWeight:700,fontSize:13,color:C.teal }}>
            📄 Client Report — {selected.name}
          </div>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:12 }}>
          <label style={{ display:"flex",alignItems:"center",gap:6,cursor:"pointer",
            fontSize:12,fontWeight:600,color:"#374151",
            background:includeAddOn?"rgba(255,159,10,0.1)":"#f3f4f6",
            border:`1px solid ${includeAddOn?"#FF9F0A":"#d1d5db"}`,
            borderRadius:20,padding:"5px 12px" }}>
            <input type="checkbox" checked={includeAddOn}
              onChange={e=>setIncludeAddOn(e.target.checked)}
              style={{ accentColor:"#FF9F0A",width:14,height:14 }}/>
            Include Add On in Quotation
          </label>
          <button style={{ fontSize:11,padding:"7px 16px",fontWeight:600,cursor:"pointer",
              background:"#1e3a5f",color:"#fff",border:"none",borderRadius:8,fontFamily:"inherit" }}
            onClick={()=>{
              const html=generatePrintHTML();
              const w=window.open('','_blank','width=900,height=700');
              w.document.write(html); w.document.close(); w.focus();
              setTimeout(()=>w.print(),800);
            }}>🖨 Print / Save PDF</button>
        </div>
      </div>

      <div style={{ maxWidth:820,margin:"0 auto",padding:"32px 40px" }}>

        {/* ── HEADER ── */}
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",
          marginBottom:32,paddingBottom:20,borderBottom:`3px solid ${C.teal}` }}>
          <div>
            <img src={LOGO_SRC} alt="High Rise Interiors" style={{ height:40,objectFit:"contain" }}/>
            <div style={{ fontSize:10,color:"#6b7280",letterSpacing:2,textTransform:"uppercase",marginTop:4 }}>
              Interior Design Proposal
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:11,color:"#6b7280" }}>Date: {d}</div>
            {selected.quotation&&(<div style={{ fontSize:18,fontWeight:800,color:C.teal,marginTop:4 }}>
              {fmtN(effectiveQuoteP)}
              {!includeAddOn&&addOnQuoteP>0&&(<div style={{ fontSize:11,color:"#9ca3af",fontWeight:400,marginTop:2 }}>
                (Add On {fmtN(addOnQuoteP)} in Annexure)
              </div>)}
            </div>)}
          </div>
        </div>

        {/* ── 1. CLIENT INFORMATION ── */}
        <div style={{ marginBottom:28 }}>
          <div style={{ fontSize:10,fontWeight:700,letterSpacing:3,textTransform:"uppercase",
            color:C.teal,borderBottom:`2px solid ${C.teal}`,paddingBottom:6,marginBottom:14 }}>
            1. Client Information
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px 24px" }}>
            {[["Client Name",selected.name],["Phone",selected.phone],["Email",selected.email],
              ["Address",selected.address],["Property Type",selected.propertyType],
              ["Style",selected.style],["Timeline",selected.timeline],["Start Date",selected.startDate]]
              .filter(([,v])=>v).map(([l,v])=>(
              <div key={l} style={{ display:"flex",justifyContent:"space-between",
                padding:"7px 0",borderBottom:"1px solid #f3f4f6",fontSize:13 }}>
                <span style={{ color:"#6b7280" }}>{l}</span>
                <span style={{ fontWeight:600,maxWidth:"55%",textAlign:"right" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── 2. PROJECT SUMMARY ── */}
        <div style={{ marginBottom:28 }}>
          <div style={{ fontSize:10,fontWeight:700,letterSpacing:3,textTransform:"uppercase",
            color:C.teal,borderBottom:`2px solid ${C.teal}`,paddingBottom:6,marginBottom:14 }}>
            2. Project Summary
          </div>
          {(()=>{
            const irms=allRoomsP.filter(r=>!ADD_ON_ROOMS_P.has(r)&&calcRoomP(r)>0);
            const adrms=allRoomsP.filter(r=>ADD_ON_ROOMS_P.has(r)&&calcRoomP(r)>0);
            const totalSqft=irms.reduce((t,r)=>{
              return t+(selected.roomWork?.[r]||[]).reduce((s,w)=>
                s+(w.height&&w.width?parseFloat(w.height)*parseFloat(w.width)*(parseFloat(w.qty)||1):0),0);
            },0);
            const matSet={};
            allRoomsP.forEach(r=>(selected.roomWork?.[r]||[]).forEach(w=>{if(w.brand&&w.matType&&!matSet[w.matType])matSet[w.matType]=w.brand;}));
            const matLine=[matSet.plywood&&"Plywood: "+matSet.plywood,matSet.ceiling&&"Ceiling: "+matSet.ceiling,
              matSet.glass&&"Glass: "+matSet.glass,matSet.hardware&&"Hardware: "+matSet.hardware].filter(Boolean).join(" · ");
            return (<div>
              <div style={{ fontSize:13,lineHeight:2,color:"#374151",marginBottom:16 }}>
                High Rise Interiors is pleased to present this interior design proposal for{" "}
                <strong>{selected.name}</strong>'s {selected.propertyType||"residence"}
                {selected.address?` at ${selected.address}`:""}.
                Designed in a <strong>{selected.style||"contemporary"}</strong> aesthetic,
                scheduled for <strong>{selected.timeline||"120 days"}</strong>
                {selected.startDate?`, commencing ${new Date(selected.startDate).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}`:""},
                covering <strong>{irms.length} interior room{irms.length!==1?"s":""}</strong>
                {adrms.length>0?` plus ${adrms.length} add-on area`:""}.
                {totalSqft>0?<span> Approximately <strong>{Math.round(totalSqft)} sq ft</strong> of carpentry work.</span>:null}
              </div>
              {matLine&&<div style={{ fontSize:13,color:"#374151",marginBottom:4 }}><strong>Primary Materials:</strong> {matLine}</div>}
            </div>);
          })()}
        </div>

        {/* ── 3. MATERIALS LIST ── */}
        <div style={{ marginBottom:28 }}>
          <div style={{ fontSize:10,fontWeight:700,letterSpacing:3,textTransform:"uppercase",
            color:C.teal,borderBottom:`2px solid ${C.teal}`,paddingBottom:6,marginBottom:14 }}>
            4. Materials Order List &amp; Specifications
          </div>
          {(()=>{
            const matList=[];
            // Only include rooms in current scope (respects includeAddOn toggle)
            const matRooms = includeAddOn ? allRoomsP : allRoomsP.filter(r=>!ADD_ON_ROOMS_P.has(r));
            matRooms.forEach(room=>{
              (selected.roomWork?.[room]||[]).forEach(w=>{
                if(!w.brand||!w.matType)return;
                const ex=matList.find(m=>m.matType===w.matType&&m.brand===w.brand);
                if(!ex)matList.push({matType:w.matType,brand:w.brand,rooms:[room]});
                else if(!ex.rooms.includes(room))ex.rooms.push(room);
              });
            });
            return matList.length>0?(
              <table style={{ width:"100%",borderCollapse:"collapse",fontSize:12 }}>
                <thead><tr style={{ borderBottom:"2px solid #1e3a5f" }}>
                  {["#","Category","Brand / Specification","Used In"].map(h=>(
                    <th key={h} style={{ padding:"7px 12px",textAlign:"left",fontSize:10,
                      fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:"#1e3a5f" }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>{matList.map((m,i)=>(
                  <tr key={i} style={{ background:i%2===0?"#fff":"#f8fafc",borderBottom:"1px solid #f3f4f6" }}>
                    <td style={{ padding:"7px 12px",color:"#6b7280" }}>{i+1}</td>
                    <td style={{ padding:"7px 12px",fontWeight:700,textTransform:"capitalize" }}>{m.matType}</td>
                    <td style={{ padding:"7px 12px",fontWeight:600 }}>{m.brand}</td>
                    <td style={{ padding:"7px 12px",color:"#6b7280",fontSize:11 }}>{m.rooms.join(", ")}</td>
                  </tr>
                ))}</tbody>
              </table>
            ):<div style={{ color:"#6b7280",fontSize:13 }}>No material specs set.</div>;
          })()}
        </div>

        {/* ── 4. SCOPE OF WORK ── */}
        <div style={{ marginBottom:28 }}>
          <div style={{ fontSize:10,fontWeight:700,letterSpacing:3,textTransform:"uppercase",
            color:C.teal,borderBottom:`2px solid ${C.teal}`,paddingBottom:6,marginBottom:14 }}>
            3. Scope of Work
          </div>
          {(allRoomsP.filter(r=>includeAddOn||!ADD_ON_ROOMS_P.has(r))).map(r=>{
            const works=(selected.roomWork?.[r]||[]).filter(w=>w.product);
            if(!works.length)return null;
            const isAddon=ADD_ON_ROOMS_P.has(r);
            const rAmt=roomAmtP(r);
            const hdrColor=isAddon?"#92400e":"#1e3a5f";
            const hdrBg=isAddon?"#fef3c7":"#dbeafe";
            return (<div key={r} style={{ marginBottom:12,border:"1px solid #e5e7eb" }}>
              <div style={{ padding:"8px 14px",display:"flex",justifyContent:"space-between",
                alignItems:"center",background:hdrBg,borderBottom:`2px solid ${hdrColor}` }}>
                <span style={{ fontWeight:700,fontSize:13,color:hdrColor }}>🏠 {r}</span>
                {finalQuoteP>0&&<span style={{ fontWeight:700,fontSize:13,color:hdrColor }}>{fmtN(rAmt)}</span>}
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"2.5fr 1.2fr 1fr 0.6fr 1fr",
                padding:"5px 14px",background:"#f9fafb",borderBottom:"1px solid #e5e7eb" }}>
                {["Product","Type","H × W","Qty","Brand"].map(h=>(
                  <div key={h} style={{ fontSize:9,fontWeight:700,color:"#6b7280",
                    letterSpacing:1,textTransform:"uppercase" }}>{h}</div>
                ))}
              </div>
              {works.map((w,wi)=>{
                const sqft=w.height&&w.width?`${w.height}×${w.width} (${(parseFloat(w.height)*parseFloat(w.width)).toFixed(1)} sft)`:"—";
                const isQtyT=QTY_TYPES&&QTY_TYPES.has(w.type);
                const qty=parseFloat(w.qty)||1;
                return (<div key={wi} style={{ display:"grid",gridTemplateColumns:"2.5fr 1.2fr 1fr 0.6fr 1fr",
                  padding:"6px 14px",borderBottom:"1px solid #f3f4f6",
                  background:wi%2===0?"#fff":"#f9fafb",alignItems:"center" }}>
                  <div>
                    <div style={{ fontWeight:600,fontSize:12,color:"#0F1923" }}>{w.product}</div>
                    {w.notes&&<div style={{ fontSize:10,color:"#9ca3af" }}>{w.notes}</div>}
                  </div>
                  <div style={{ fontSize:11,color:"#6b7280" }}>{w.type}</div>
                  <div style={{ fontSize:11,color:"#374151" }}>{isQtyT?"—":sqft}</div>
                  <div style={{ fontSize:11,fontWeight:700,color:qty>1?"#FF9F0A":"#374151" }}>×{qty}</div>
                  <div style={{ fontSize:11,color:"#374151" }}>{w.brand||"—"}</div>
                </div>);
              })}
            </div>);
          })}
        </div>

        {/* ── 5. INCLUDED ── */}
        {includedItems.length>0&&(<div style={{ marginBottom:28 }}>
          <div style={{ fontSize:10,fontWeight:700,letterSpacing:3,textTransform:"uppercase",
            color:C.teal,borderBottom:`2px solid ${C.teal}`,paddingBottom:6,marginBottom:14 }}>
            5. Included in Scope
          </div>
          <div style={{ padding:"12px 16px",borderLeft:"3px solid #16a34a" }}>
            {includedItems.map((l,i)=><div key={i} style={{ color:"#166534",marginBottom:4,fontSize:13 }}>
              ✓ {l.replace(/^(✗\s*)?included\s*:\s*/i,"")}
            </div>)}
          </div>
        </div>)}

        {/* ── 6. OUT OF SCOPE ── */}
        {outOfScope.length>0&&(<div style={{ marginBottom:28 }}>
          <div style={{ fontSize:10,fontWeight:700,letterSpacing:3,textTransform:"uppercase",
            color:C.teal,borderBottom:`2px solid ${C.teal}`,paddingBottom:6,marginBottom:14 }}>
            {includedItems.length>0?"6.":"5."} Out of Scope
          </div>
          <div style={{ padding:"12px 16px",borderLeft:"3px solid #dc2626" }}>
            {outOfScope.map((l,i)=><div key={i} style={{ color:"#7A0000",marginBottom:4,fontSize:13 }}>
              ✗ {l.replace(/^(out of scope|not included|excluded)\s*:?\s*/i,"")||l}
            </div>)}
          </div>
        </div>)}

        {/* ── 7. COST BREAKDOWN ── */}
        {finalQuoteP>0&&(<div style={{ marginBottom:28 }}>
          <div style={{ fontSize:10,fontWeight:700,letterSpacing:3,textTransform:"uppercase",
            color:C.teal,borderBottom:`2px solid ${C.teal}`,paddingBottom:6,marginBottom:14 }}>
            7. Cost Breakdown
          </div>
          <div style={{ fontSize:11,color:"#6b7280",marginBottom:8 }}>All amounts include materials &amp; labour</div>
          {(()=>{
            const iRooms=allRoomsP.filter(r=>!ADD_ON_ROOMS_P.has(r)&&calcRoomP(r)>0);
            const aRooms=allRoomsP.filter(r=> ADD_ON_ROOMS_P.has(r)&&calcRoomP(r)>0);
            const iAmt=includeAddOn?(rawTotalP>0?Math.round(finalQuoteP*(rawInteriorP/rawTotalP)):finalQuoteP):effectiveQuoteP;
            const aAmt=includeAddOn?(rawTotalP>0?Math.round(finalQuoteP*(rawAddOnP/rawTotalP)):0):0;
            return (<div>
              {iRooms.length>0&&(<div style={{ marginBottom:4 }}>
                <div style={{ display:"flex",justifyContent:"space-between",padding:"8px 14px",
                  background:"#dbeafe",borderBottom:"2px solid #1e3a5f" }}>
                  <span style={{ fontWeight:700,color:"#1e3a5f",fontSize:13 }}>Interior Works <span style={{fontSize:10,fontWeight:400,color:"#64748b"}}>(incl. {lp}% labour)</span></span>
                  <strong style={{ color:"#1e3a5f",fontSize:13 }}>{fmtN(iAmt)}</strong>
                </div>
                {iRooms.map((r,i)=>(
                  <div key={r} style={{ display:"flex",justifyContent:"space-between",
                    padding:"6px 14px 6px 28px",fontSize:12,
                    background:i%2===0?"#f8fafc":"#f3f4f6",borderBottom:"1px solid #e5e7eb" }}>
                    <span style={{ color:"#374151" }}>🏠 {r}</span>
                    <span style={{ fontWeight:600,color:"#374151" }}>{fmtN(roomAmtP(r))}</span>
                  </div>
                ))}
              </div>)}
              {aRooms.length>0&&(<div style={{ marginTop:8,marginBottom:4 }}>
                <div style={{ display:"flex",justifyContent:"space-between",padding:"8px 14px",
                  background:"#fef3c7",borderBottom:"2px solid #92400e" }}>
                  <span style={{ fontWeight:700,color:"#92400e",fontSize:13 }}>Add On</span>
                  <strong style={{ color:"#92400e",fontSize:13 }}>{fmtN(aAmt)}</strong>
                </div>
                {aRooms.map((r,i)=>(
                  <div key={r} style={{ display:"flex",justifyContent:"space-between",
                    padding:"6px 14px 6px 28px",fontSize:12,
                    background:i%2===0?"#fffbf0":"#fef9ec",borderBottom:"1px solid #fde68a" }}>
                    <span style={{ color:"#374151" }}>🏠 {r}</span>
                    <span style={{ fontWeight:600,color:"#92400e" }}>{fmtN(roomAmtP(r))}</span>
                  </div>
                ))}
              </div>)}
              <div style={{ display:"flex",justifyContent:"space-between",padding:"12px 14px",
                marginTop:8,borderTop:"2px solid #1e3a5f",borderBottom:"2px solid #1e3a5f" }}>
                <span style={{ fontWeight:700,color:"#1e3a5f",fontSize:14 }}>Final Quotation</span>
                <strong style={{ color:"#1e3a5f",fontSize:16 }}>{fmtN(effectiveQuoteP)}</strong>
              </div>
            </div>);
          })()}
        </div>)}

        {/* ── 8. BUDGET SUMMARY ── */}
        <div style={{ marginBottom:28 }}>
          <div style={{ fontSize:10,fontWeight:700,letterSpacing:3,textTransform:"uppercase",
            color:C.teal,borderBottom:`2px solid ${C.teal}`,paddingBottom:6,marginBottom:14 }}>
            8. Budget Summary
          </div>
          {selected.previousQuotation&&(
            <div style={{ display:"flex",justifyContent:"space-between",padding:"9px 0",
              borderBottom:"1px solid #f3f4f6",fontSize:13 }}>
              <span style={{ color:"#6b7280" }}>Previous Quotation</span>
              <span style={{ textDecoration:"line-through",color:"#9ca3af" }}>{fmtN(selected.previousQuotation)}</span>
            </div>
          )}
          {selected.rebateValue&&Number(selected.rebateValue)>0&&(
            <div style={{ display:"flex",justifyContent:"space-between",padding:"9px 0",
              borderBottom:"1px solid #f3f4f6",fontSize:13 }}>
              <span style={{ fontWeight:600,color:"#166534" }}>Rebate / Discount</span>
              <span style={{ fontWeight:700,color:"#166534" }}>- {fmtN(selected.rebateValue)}</span>
            </div>
          )}
          <div style={{ display:"flex",justifyContent:"space-between",padding:"9px 0",
            borderBottom:"1px solid #f3f4f6",fontSize:13 }}>
            <span style={{ fontWeight:600 }}>Final Quotation</span>
            <span style={{ fontWeight:800,fontSize:15,color:"#1e3a5f" }}>{fmtN(effectiveQuoteP)}</span>
          </div>
          {!includeAddOn&&addOnQuoteP>0&&(
            <div style={{ padding:"8px 12px",borderLeft:"3px solid #92400e",marginTop:8,
              color:"#92400e",fontSize:12 }}>
              ℹ Add On ({fmtN(addOnQuoteP)}) not included — see Annexure below
            </div>
          )}
          {selected.referralCode&&selected.status==="Active"&&(
            <div style={{ padding:"12px 16px",marginTop:12,borderLeft:"3px solid #30D158" }}>
              <div style={{ fontSize:9,fontWeight:700,color:"#30D158",letterSpacing:2,marginBottom:6,textTransform:"uppercase" }}>🎁 Your Referral Code</div>
              <div style={{ fontSize:22,fontWeight:800,letterSpacing:5,color:"#30D158",fontFamily:"monospace",marginBottom:6 }}>{selected.referralCode}</div>
            </div>
          )}
        </div>

        {/* ── 9. FINAL QUOTATION BANNER ── */}
        {finalQuoteP>0&&(
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",
            padding:"18px 24px",marginBottom:28,border:"2px solid #1e3a5f" }}>
            <div>
              <div style={{ fontSize:11,fontWeight:700,color:"#1e3a5f",letterSpacing:2,
                textTransform:"uppercase",marginBottom:4 }}>9. Final Quotation</div>
              <div style={{ fontSize:12,color:"#374151" }}>Inclusive of materials &amp; labour</div>
            </div>
            <div style={{ fontSize:28,fontWeight:900,color:"#1e3a5f" }}>{fmtN(effectiveQuoteP)}</div>
          </div>
        )}

        {/* ── 10. TIMELINE ── */}
        <div style={{ marginBottom:28 }}>
          <div style={{ fontSize:10,fontWeight:700,letterSpacing:3,textTransform:"uppercase",
            color:C.teal,borderBottom:`2px solid ${C.teal}`,paddingBottom:6,marginBottom:14 }}>
            10. Project Timeline
          </div>
          {(()=>{
            const totalD=parseInt(selected.timeline)||120;
            const start=selected.startDate?new Date(selected.startDate):null;
            const plan=selected.projectPlan||{};
            const PHASES=[
              {key:"requirements",label:"Requirements & Planning",from:0,to:6},
              {key:"design",label:"Design Finalisation",from:6,to:12},
              {key:"designFinal",label:"Design Approval",from:12,to:18},
              {key:"ceiling",label:"Ceiling & Civil Work",from:18,to:26},
              {key:"procurement",label:"Material Procurement",from:26,to:48},
              {key:"graniteTiles",label:"Granite & Tiles",from:48,to:54},
              {key:"woodFraming",label:"Wood Framing & Carpentry",from:54,to:69},
              {key:"deco",label:"Decoration & Finishing",from:69,to:76},
              {key:"painting",label:"Painting",from:76,to:83},
              {key:"cleaning",label:"Site Cleaning",from:83,to:86},
              {key:"handover",label:"Handover",from:86,to:87},
              {key:"cooling",label:"Settling & Cooling",from:87,to:100},
            ];
            return (<table style={{ width:"100%",borderCollapse:"collapse",fontSize:12 }}>
              <thead><tr style={{ borderBottom:"2px solid #1e3a5f" }}>
                {["Phase","Day Start","Duration","Status"].map(h=>(
                  <th key={h} style={{ padding:"7px 12px",textAlign:"left",fontSize:10,
                    fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:"#1e3a5f" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{PHASES.map((ph,i)=>{
                const sd=Math.max(1,Math.round(ph.from/100*totalD)+1);
                const dur=Math.max(1,Math.round((ph.to-ph.from)/100*totalD));
                const dt=start?new Date(start.getTime()+(sd-1)*86400000).toLocaleDateString("en-IN",{day:"numeric",month:"short"}):"Day "+sd;
                const status=plan[ph.key]?.status||"Not Started";
                const col=status==="Completed"?"#16a34a":status==="In Progress"?"#1e3a5f":"#6b7280";
                return (<tr key={ph.key} style={{ background:i%2===0?"#fff":"#f8fafc",borderBottom:"1px solid #f3f4f6" }}>
                  <td style={{ padding:"7px 12px",fontWeight:600 }}>{ph.label}</td>
                  <td style={{ padding:"7px 12px",color:"#374151" }}>{dt}</td>
                  <td style={{ padding:"7px 12px",color:"#374151" }}>{dur} days</td>
                  <td style={{ padding:"7px 12px",fontWeight:600,color:col }}>{status}</td>
                </tr>);
              })}</tbody>
            </table>);
          })()}
        </div>

        {/* ── 11. PAYMENT SCHEDULE ── */}
        {selected.quotation&&(<div style={{ marginBottom:28 }}>
          <div style={{ fontSize:10,fontWeight:700,letterSpacing:3,textTransform:"uppercase",
            color:C.teal,borderBottom:`2px solid ${C.teal}`,paddingBottom:6,marginBottom:14 }}>
            11. Payment Schedule
          </div>
          <table style={{ width:"100%",borderCollapse:"collapse",fontSize:12 }}>
            <thead><tr style={{ borderBottom:"2px solid #1e3a5f" }}>
              {["Milestone","When","Day","Amount"].map(h=>(
                <th key={h} style={{ padding:"7px 12px",textAlign:"left",fontSize:10,
                  fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:"#1e3a5f" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {buildPaymentSchedule(parseInt(selected.timeline)||120, selected.quotation).map((p,i)=>(
                <tr key={i} style={{ background:i%2===0?"#fff":"#f8fafc",borderBottom:"1px solid #f3f4f6" }}>
                  <td style={{ padding:"7px 12px",fontWeight:600 }}>{p.label}</td>
                  <td style={{ padding:"7px 12px",color:"#374151",fontSize:11 }}>{p.when}</td>
                  <td style={{ padding:"7px 12px",color:"#374151" }}>Day {p.day}</td>
                  <td style={{ padding:"7px 12px",fontWeight:700,color:"#1e3a5f" }}>
                    {p.amount>0?fmtN(p.amount):`${p.pct}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>)}

        {/* ── 12. DISCLAIMERS ── */}
        <div style={{ marginBottom:28 }}>
          <div style={{ fontSize:10,fontWeight:700,letterSpacing:3,textTransform:"uppercase",
            color:C.teal,borderBottom:`2px solid ${C.teal}`,paddingBottom:6,marginBottom:14 }}>
            11. Disclaimers &amp; Terms
          </div>
          <div style={{ fontSize:13,lineHeight:2.1,color:"#374151" }}>
            {[
              "No Refund Policy: All payments are strictly non-refundable once work has commenced.",
              "Draft Quotation: This is a draft and may vary based on final quantity and material selection.",
              "Material Prices: Subject to market fluctuations. Valid for 30 days from date of issue.",
              "Scope Changes: Any additions will be quoted and billed separately with written approval.",
              `Timeline: ${selected.timeline||"Agreed duration"} is indicative. Delays due to civil work or approvals not included.`,
              "Warranty: 1-year workmanship warranty. Material warranty per manufacturer.",
              "Cancellation: Amounts paid till date are forfeited upon cancellation after commencement.",
              "Dispute Resolution: Subject to jurisdiction of Hyderabad courts only.",
            ].map((t,i)=>(
              <div key={i} style={{ marginBottom:4 }}><strong>{i+1}. {t.split(":")[0]}:</strong> {t.split(":").slice(1).join(":")}</div>
            ))}
          </div>
        </div>

        {/* ── 12. SIGNATURES ── */}
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:32,
          marginBottom:28,paddingTop:20,borderTop:"2px solid #e5e7eb" }}>
          <div>
            <div style={{ fontSize:9,color:"#6b7280",letterSpacing:2,textTransform:"uppercase",marginBottom:8 }}>Client Signature</div>
            <div style={{ fontWeight:700,fontSize:14,marginBottom:40 }}>{selected.name}</div>
            <div style={{ borderTop:"1px solid #333",paddingTop:6,fontSize:10,color:"#6b7280" }}>Signature &amp; Date</div>
          </div>
          <div>
            <div style={{ fontSize:9,color:"#6b7280",letterSpacing:2,textTransform:"uppercase",marginBottom:8 }}>Authorised By</div>
            <div style={{ fontWeight:700,fontSize:14,color:C.teal,marginBottom:40 }}>High Rise Interiors</div>
            <div style={{ borderTop:"1px solid #333",paddingTop:6,fontSize:10,color:"#6b7280" }}>Signature &amp; Date</div>
          </div>
        </div>

        {/* ── ANNEXURE ── */}
        {!includeAddOn&&addOnQuoteP>0&&allRoomsP.filter(r=>ADD_ON_ROOMS_P.has(r)).length>0&&(
          <div style={{ marginTop:40,paddingTop:24,borderTop:"2px solid #e5e7eb" }}>
            <div style={{ fontSize:10,fontWeight:700,letterSpacing:3,textTransform:"uppercase",
              color:"#92400e",borderBottom:"2px solid #92400e",paddingBottom:6,marginBottom:14 }}>
              Annexure — Additional Works (Add On)
            </div>
            <div style={{ fontSize:12,color:"#6b7280",marginBottom:12 }}>
              These items are not included in the Final Quotation above. If selected, the estimated total increases as shown.
            </div>
            {allRoomsP.filter(r=>ADD_ON_ROOMS_P.has(r)).map(r=>{
              const works=(selected.roomWork?.[r]||[]).filter(w=>w.product);
              if(!works.length)return null;
              return (<div key={r} style={{ marginBottom:12,border:"1px solid #fde68a" }}>
                <div style={{ padding:"8px 14px",display:"flex",justifyContent:"space-between",
                  background:"#fef3c7",borderBottom:"2px solid #92400e" }}>
                  <span style={{ fontWeight:700,color:"#92400e" }}>🏠 {r}</span>
                  <span style={{ fontWeight:700,color:"#92400e" }}>{fmtN(rawTotalP>0?Math.round(addOnQuoteP*(calcRoomP(r)/rawAddOnP)):0)}</span>
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"2.5fr 1.2fr 1fr 0.6fr 1fr",
                  padding:"5px 14px",background:"#fffbf0",borderBottom:"1px solid #fde68a" }}>
                  {["Product","Type","H×W","Qty","Brand"].map(h=>(
                    <div key={h} style={{ fontSize:9,fontWeight:700,color:"#92400e",letterSpacing:1,textTransform:"uppercase" }}>{h}</div>
                  ))}
                </div>
                {works.map((w,wi)=>(
                  <div key={wi} style={{ display:"grid",gridTemplateColumns:"2.5fr 1.2fr 1fr 0.6fr 1fr",
                    padding:"6px 14px",borderBottom:"1px solid #fef3c7",
                    background:wi%2===0?"#fff":"#fffbf0",alignItems:"center" }}>
                    <div style={{ fontWeight:600,fontSize:12 }}>{w.product}</div>
                    <div style={{ fontSize:11,color:"#6b7280" }}>{w.type}</div>
                    <div style={{ fontSize:11 }}>{w.height&&w.width?`${w.height}×${w.width}`:"—"}</div>
                    <div style={{ fontSize:11,fontWeight:700,color:"#FF9F0A" }}>×{parseFloat(w.qty)||1}</div>
                    <div style={{ fontSize:11,color:"#374151" }}>{w.brand||"—"}</div>
                  </div>
                ))}
              </div>);
            })}
            <div style={{ padding:"14px 16px",marginTop:12,border:"2px solid #92400e" }}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6,fontSize:13 }}>
                <span>Interior Works</span><span style={{ fontWeight:700 }}>{fmtN(effectiveQuoteP)}</span>
              </div>
              <div style={{ display:"flex",justifyContent:"space-between",paddingBottom:8,
                borderBottom:"1px solid #fde68a",fontSize:13 }}>
                <span>Add On (estimated)</span>
                <span style={{ fontWeight:700,color:"#92400e" }}>+ {fmtN(addOnQuoteP)}</span>
              </div>
              <div style={{ display:"flex",justifyContent:"space-between",marginTop:8 }}>
                <span style={{ fontWeight:700,fontSize:14 }}>Estimated Total</span>
                <span style={{ fontWeight:900,fontSize:18,color:"#92400e" }}>{fmtN(effectiveQuoteP+addOnQuoteP)}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── FOOTER ── */}
        <div style={{ borderTop:"2px solid #e5e7eb",paddingTop:16,marginTop:8,
          display:"flex",justifyContent:"space-between",fontSize:11,color:"#6b7280" }}>
          <span>High Rise Interiors — Powered by Genovatech IT Services Pvt. Ltd.</span>
          <span>{d}</span>
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

// ── Default empty client form ──────────────────────────────────────
const EMPTY = {
  id:null, name:"", email:"", phone:"", address:"",
  status:"Lead", projectType:"Residential", propertyType:"3 BHK",
  budget:"₹30L–₹35L", timeline:"120 Days", startDate:"",
  rooms:["Entrance","Drawing Room","Living Area","Dining","Kitchen","Pooja","Master Bedroom","Children Bedroom","Guest Bedroom","Bathroom","Others","Add On"],
  dimensions:{ length:"", width:"", height:"" },
  style:"Luxury", notes:"",
  quotation:"", previousQuotation:"", revisedQuotation:"",
  plywood:"", laminate:"", hardware:"", glass:"", ceiling:"", lights:"", handles:"",
  roomDetails:{},
  roomMaterials:{},
  roomWork: {},
  projectPlan: {},
  paymentTracking: {},
  rebateType:"amount", rebateValue:"", labourPct:50,
  auditLog:[],
  inventory:{},
  customRooms:[],
  floorPlanUrl:"",
  floorPlanData:null,
  floorPlanPending:false,
  referralCode:"",
  appliedReferralCode:"",
  referralDiscount:0,
  couponCode:"",
  couponApplied:false,
  clientAccessCode:"",
  quotationIncludesAddOn:true,
};

export default function App({ token, user, onLogout, onSessionExpired }) {
  const [customers,    setCustomers]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [irPrintSections, setIRPrintSections] = useState({
    summary:true, timeline:true, scope:true, workItems:true,
    materials:true, photos:true, inventory:false, notes:true
  });
  const [renderStyles,    setRenderStyles]    = useState({});
  const [renderPrompts,   setRenderPrompts]   = useState({});
  const [renderingRoom,   setRenderingRoom]   = useState(null);
  const [renderErrors,    setRenderErrors]    = useState({});
  const RENDER_STYLES = ["Modern Contemporary","Luxury","Scandinavian","Industrial","Classic Traditional","Bohemian","Art Deco"];
  const [isOnline,     setIsOnline]     = useState(navigator.onLine);
  const [offlineQ,     setOfflineQ]     = useState(()=>{try{return JSON.parse(localStorage.getItem("hri_offline_queue")||"[]");}catch{return [];}});
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
      let rows;
      try {
        // Try full select first
        rows = await safeCall(t => sb(`${TABLE}?select=*&order=created_at.desc`, "GET", null, t));
      } catch(schemaErr) {
        // If schema cache error (e.g. new column not yet recognised), retry without payment_tracking
        console.warn("Full select failed, retrying without new columns:", schemaErr.message);
        rows = await safeCall(t => sb(`${TABLE}?select=*&order=created_at.desc`, "GET", null, t));
      }
      const mergeRooms = (c) => {
        // Migrate legacy room names from DB → current names
        const RENAMES = { "Additional Accessories": "Add On" };
        const migrateRoom = (r) => RENAMES[r] || r;
        const savedRaw = c.rooms || [];
        const saved = savedRaw.map(migrateRoom);
        // Migrate roomWork keys
        const roomWork = {};
        Object.entries(c.roomWork || {}).forEach(([k, v]) => {
          roomWork[migrateRoom(k)] = v;
        });
        // Add any new rooms from current property type map
        const allForType = PROPERTY_ROOMS_MAP[c.propertyType||"3 BHK"] || saved;
        const newRooms = allForType.filter(r => !saved.includes(r));
        return { ...c, rooms: [...saved, ...newRooms], roomWork };
      };
      setCustomers((rows||[]).map(r => { try { return mergeRooms(fromRow(r)); } catch(e) { console.error("fromRow error:", e, r); return null; } }).filter(Boolean));
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

  // ── Welcome Email — sent on new client creation ─────────────────────
  const welcomeEmail = (client) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
    const timeStr = now.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
    const prop    = client.propertyType || "home";
    const budget  = client.budget  || "as discussed";
    const style   = client.style   || "your preferred style";
    const addr    = client.address || "your property";

    const subject = `Welcome to High Rise Interiors, ${client.name.split(" ")[0]}! 🏠`;
    const body    =
`Dear ${client.name},

Thank you so much for visiting High Rise Interiors and for the wonderful conversation we had today (${dateStr} at ${timeStr}). It was truly a pleasure getting to know you and understanding your vision for your ${prop}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHY INTERIORS MATTER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Your home is more than four walls — it is the backdrop to every memory your family will ever create. A well-designed interior doesn't just look beautiful; it shapes how you feel when you wake up, how you unwind after a long day, and how your guests feel the moment they walk through the door. Studies show that people who live in thoughtfully designed spaces report higher productivity, better sleep, and deeper happiness. This is not a luxury — it is an investment in your quality of life.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUR COMMITMENT TO YOU
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
At High Rise Interiors, we have one promise: to treat your home exactly as we would treat our own. Every nail, every panel, every coat of paint is executed with care, precision, and pride. We do not cut corners — we cut timelines. Our team of craftsmen, designers, and project managers work as a single unit so that your ${prop} is delivered on time, within budget, and beyond expectation.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT WE DISCUSSED TODAY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Property     : ${addr}
Type         : ${prop}
Style        : ${style}
Budget Range : ${budget}
${client.startDate ? "Expected Start : "+client.startDate : "Start Date    : To be confirmed"}

We are excited about the possibilities for your space and will be preparing a detailed scope of work and quotation for your review.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEXT STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Our design consultant will reach out within 48 hours to schedule a site visit
2. We will prepare a detailed quotation within 5 working days
3. Once approved, we will share your personal project timeline

Please feel free to reach out anytime at +91-6304980890. We are here for you every step of the way.

Once again, thank you for trusting us with your dream home. We can't wait to create something extraordinary together.

Warmly,
The High Rise Interiors Team
Hyderabad · +91-6304980890`;

    // Use window.open to avoid navigating away from the CRM
    const mailUrl = `mailto:${client.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    // On iOS/iPad, window.location.href opens Mail app correctly for mailto:
    window.location.href = mailUrl;
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
    // Spread all fields from the customer object — single source of truth
    setForm({
      ...EMPTY,          // baseline defaults for any missing fields
      ...c,              // all fields from the loaded customer
      // Ensure critical fields have safe fallbacks
      id:                c.id                || null,
      dimensions:        c.dimensions        || { length:"", width:"", height:"" },
      roomDetails:       c.roomDetails       || {},
      roomMaterials:     c.roomMaterials     || {},
      roomWork:          c.roomWork          || {},
      inventory:         c.inventory         || {},
      auditLog:          c.auditLog          || [],
      rooms: c.rooms || [],  // already merged by fetchCustomers
      customRooms:       c.customRooms       || [],
      labourPct:         c.labourPct         != null ? c.labourPct : 50,
      rebateType:        c.rebateType        || "amount",
      propertyType:      c.propertyType      || "3 BHK",
    });
    setSelectedId(c.id);
    setActiveTab("personal");
    setView("form");
  };

  const openNew    = () => {
    setSelectedId(null);
    setForm({
      ...EMPTY,
      startDate:    new Date().toISOString().split("T")[0],
      propertyType: "3 BHK",
      budget:       "₹30L–₹35L",
      timeline:     "120 Days",
      style:        "Luxury",
      rooms:        PROPERTY_ROOMS_MAP["3 BHK"] || [],
      roomWork:     buildDefaultRoomWork("3 BHK"),
      projectPlan:  {},
    });
    setActiveTab("personal");
    setView("form");
  };
  const openDetail = (c) => { setSelectedId(c.id); setView("detail"); };
  const setF       = (k, v) => setForm(f => ({...f, [k]: v}));
  const setDim     = (k, v) => setForm(f => ({...f, dimensions: {...f.dimensions, [k]: v}}));
  const toggleRoom = (r)    => setForm(f => ({...f, rooms: f.rooms.includes(r) ? f.rooms.filter(x=>x!==r) : [...f.rooms, r]}));

  // ── Sync offline queue when back online ─────────────────────────────
  const upsertCustomer = async (data) => {
    const row = toRow(data);
    if (data.id) {
      await safeCall(t => sb(`${TABLE}?id=eq.${data.id}`, "PATCH", row, t));
    } else {
      await safeCall(t => sb(TABLE, "POST", row, t));
    }
  };

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
      setOfflineQ([]);
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
    setOfflineQ([...queue]);
  };

  const doRenderRoom = async (room, photoBase64) => {
    const style  = renderStyles[room]  || "Luxury";
    const prompt = renderPrompts[room] || "";
    setRenderingRoom(room);
    setRenderErrors(e => ({...e, [room]:""}));
    try {
      const res = await fetch("/api/render-room", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ imageBase64: photoBase64, style, prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Render failed");
      const newRender = { url: data.imageUrl, style, ts: Date.now() };
      setForm(f => ({
        ...f,
        roomDetails: {
          ...(f.roomDetails||{}),
          [room]: {
            ...(f.roomDetails?.[room]||{}),
            renders: [newRender, ...(f.roomDetails?.[room]?.renders||[])],
          }
        }
      }));
    } catch(e) {
      setRenderErrors(err => ({...err, [room]: e.message}));
    }
    setRenderingRoom(null);
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
          // Auto-generate referral code when going Active
          if (formToSave.status === "Active" && !formToSave.referralCode) {
            const code = `HRI-${String(formToSave.id||"").slice(-4).padStart(4,"0")}-${Math.random().toString(36).slice(2,5).toUpperCase()}`;
            await safeCall(t => sb(`${TABLE}?id=eq.${formToSave.id}`, "PATCH", { referral_code: code }, t));
            formToSave.referralCode = code;
            showToast(`🎟 Referral code generated: ${code}`, "success", 4000);
          }
          showToast(`🔄 Status → ${formToSave.status} · Preparing email…`, "info");
          setView("list");
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
          savedClient = { ...formToSave, id: result[0].id };
          // Only generate referral code when status is Active
          if (formToSave.status === "Active") {
            const realCode = genReferralCode(result[0].id);
            await safeCall(t => sb(`${TABLE}?id=eq.${result[0].id}`, "PATCH", { referral_code: realCode }, t));
            savedClient = { ...savedClient, referralCode: realCode };
          }
        }
        await fetchCustomers();
        showToast("✓ Client saved", "success");
        setView("list");

        // ── Auto-populate notes with meeting summary ──────────────
        const now = new Date();
        const meetingNote = [
          `📅 ${now.toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})} · ${now.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}`,
          `👤 Client: ${savedClient.name}${savedClient.phone?" · "+savedClient.phone:""}`,
          savedClient.address ? `📍 Property: ${savedClient.address}` : "",
          savedClient.propertyType ? `🏠 Type: ${savedClient.propertyType}` : "",
          savedClient.budget ? `💰 Budget discussed: ${savedClient.budget}` : "",
          savedClient.style ? `🎨 Style preference: ${savedClient.style}` : "",
          savedClient.startDate ? `📆 Expected start: ${savedClient.startDate}` : "",
          "",
          "📝 Discussion Summary:",
          `• Client visited / called to discuss interior work for their ${savedClient.propertyType||"property"}`,
          `• Initial brief shared. Quotation to be prepared.`,
          `• Next step: Site visit & design consultation`,
          "",
          "📋 Next Steps Committed:",
          "  1. Design consultant to reach out within 48 hours to schedule site visit",
          "  2. Detailed quotation to be prepared within 5 working days",
          "  3. Project timeline shared once quotation is approved",
        ].filter(Boolean).join("\n");

        if (!savedClient.notes) {
          await safeCall(t => sb(`${TABLE}?id=eq.${savedClient.id}`, "PATCH", { notes: meetingNote }, t));
        }

        // ── Welcome email ──────────────────────────────────────────
        if (formToSave.email) {
          showToast("📧 Composing welcome email…", "info");
          setTimeout(() => {
            welcomeEmail(savedClient);
          }, 1200);
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
  const TABS = ["personal","rooms","quotation","notes","inventory","plan"];

  // ── REPORT ───────────────────────────────────────────────────────────
  if (view==="report" && selected) {
    return <ClientReport selected={selected} setView={setView} customers={customers} setCustomers={setCustomers} showToast={showToast}/>;
  }
  // ── INTERNAL REPORT ──────────────────────────────────────────────────
  if (view==="internal" && selected) {
    const d = new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"});
    const lp = selected.labourPct != null ? selected.labourPct : 50;

    // Build full materials order list from roomMaterials
    const allMaterials = {};
    Object.entries(selected.roomWork||{}).forEach(([room, works]) => {
      (works||[]).forEach(w => {
        if (!w.brand || !w.matType) return;
        const catalog = getCatalog(w.matType);
        const item = catalog.find(m=>m.name===w.brand);
        if (!item) return;
        const sqft = w.height&&w.width ? parseFloat(w.height)*parseFloat(w.width) : 0;
        const qty  = QTY_TYPES.has(w.type) ? parseFloat(w.qty)||1 : sqft;
        if (!qty) return;
        const k = `${w.matType}||${w.brand}`;
        if (!allMaterials[k]) allMaterials[k] = { matType:w.matType, name:w.brand, unit:item.unit, price:item.price, qty:0, rooms:[] };
        allMaterials[k].qty += qty;
        if (!allMaterials[k].rooms.includes(room)) allMaterials[k].rooms.push(room);
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
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap'); @media print{.np{display:none!important}${
          Object.entries(irPrintSections).filter(([,v])=>!v).map(([k])=>`#ir-${k}{display:none!important}`).join('')
        }}`}</style>

        {/* Toolbar */}
        <div className="np" style={{ background:"#060812", padding:"12px 36px", display:"flex", gap:12, alignItems:"center", borderBottom:`3px solid ${C.teal}` }}>
          <button onClick={()=>setView("detail")} className="pill" style={{background:"rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.75)",border:"1px solid rgba(255,255,255,0.16)"}}>← Back</button>
          <button onClick={()=>window.print()} style={S.btn()}>🖨 Print</button>
          <span style={{ background:"rgba(255,159,10,0.15)", color:"#5C3A00", padding:"3px 10px", borderRadius:2, fontSize:10, fontWeight:700, letterSpacing:1, textTransform:"uppercase" }}>🔒 INTERNAL — Do not share with client</span>
        </div>

        {/* ── Section visibility toggles (hidden when printing) ── */}
        <div className="no-print" style={{background:"#f0f9ff",border:"1px solid #bae6fd",borderRadius:6,padding:"10px 16px",marginBottom:16,display:"flex",flexWrap:"wrap",gap:8,alignItems:"center"}}>
          <span style={{fontSize:11,fontWeight:700,color:"#0369a1",marginRight:4}}>Print Sections:</span>
          {[
            ["summary",   "📋 Summary"],
            ["timeline",  "📅 Timeline & Payments"],
            ["scope",     "🏠 Scope of Work"],
            ["workItems", "🔨 Work Items"],
            ["materials", "📦 Materials"],
            ["photos",    "📸 Photos"],
            ["inventory", "📊 Inventory"],
            ["notes",     "📝 Notes"],
          ].map(([k,l])=>(
            <label key={k} style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer",
              background:irPrintSections[k]?"#0A84FF":"#e5e7eb",
              color:irPrintSections[k]?"#fff":"#374151",
              padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600,
              userSelect:"none"}}>
              <input type="checkbox" checked={irPrintSections[k]}
                onChange={()=>setIRPrintSections(s=>({...s,[k]:!s[k]}))}
                style={{accentColor:"#fff",marginRight:3}}/>
              {l}
            </label>
          ))}
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
              ["Property Type",selected.propertyType],
              ["Project Type", selected.projectType],
              ["Interior Style",selected.style],
              ["Budget",       selected.budget],
              ["Start Date",   selected.startDate],
              ["Duration",     selected.timeline],
              ["Status",       selected.status],
            ].filter(([,v])=>v).map(([l,v])=>(
              <div key={l} style={{ display:"flex", gap:8, padding:"5px 0", borderBottom:"1px solid #e5e7eb", fontSize:12 }}>
                <span style={{ color:"#6b7280", minWidth:100 }}>{l}</span>
                <strong>{v}</strong>
              </div>
            ))}
          </div>


          </div>
          {/* Project Timeline */}          
          <div style={IR.sec}>Project Timeline</div>
          {(()=>{
            const total = parseInt(selected.timeline)||60;
            const start = selected.startDate ? new Date(selected.startDate) : null;
            const plan  = selected.projectPlan||{};
            const getD  = (pct) => Math.max(1,Math.round(pct/100*total)+1);
            const getDur= (pct) => Math.max(1,Math.round(pct/100*total));
            const fmtDate = (dayOff) => {
              if(!start) return `Day ${dayOff}`;
              const d=new Date(start); d.setDate(d.getDate()+dayOff-1);
              return d.toLocaleDateString("en-IN",{day:"numeric",month:"short"});
            };
            return (
              <div>
                {start&&<div style={{fontSize:11,color:C.grey,marginBottom:8}}>Duration: {total} days · Start: {start.toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}</div>}
                <div style={{border:"1px solid #e5e7eb",borderRadius:3,overflow:"hidden",marginBottom:12}}>
                  <div style={{display:"grid",gridTemplateColumns:"24px 1fr 2fr 80px 80px",gap:0}}>
                    {["","Phase","Description","Start","End"].map((h,i)=>(<div key={i} style={IR.th}>{h}</div>))}
                  </div>
                  {PROJECT_PHASES.map((ph,i)=>{
                    const st=plan[ph.id]?.status||"Not Started";
                    const sd=getD(ph.startPct); const dur=getDur(ph.durPct);
                    return (
                      <div key={ph.id} style={{display:"grid",gridTemplateColumns:"24px 1fr 2fr 80px 80px",background:i%2===0?"#fff":"#f9fafb",borderTop:"1px solid #f3f4f6"}}>
                        <div style={{...IR.td(i),fontSize:14,textAlign:"center"}}>{ph.icon}</div>
                        <div style={IR.td(i)}><strong>{ph.name}</strong>{st!=="Not Started"&&<span style={{...IR.tag(st==="Completed"?C.green:st==="In Progress"?C.teal:C.grey),marginLeft:4,fontSize:8}}>{st}</span>}</div>
                        <div style={{...IR.td(i),fontSize:10,color:C.grey}}>{ph.desc}</div>
                        <div style={IR.td(i)}>{fmtDate(sd)}</div>
                        <div style={IR.td(i)}>{fmtDate(sd+dur-1)}</div>
                      </div>
                    );
                  })}
                </div>
                {/* Payment schedule */}
                <div style={{border:"1px solid #e5e7eb",borderRadius:3,overflow:"hidden"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:0}}>
                    {["Payment","When","Day","Due Amount","Status","Received"].map(h=>(<div key={h} style={IR.th}>{h}</div>))}
                  </div>
                  {buildPaymentSchedule(total, selected.quotation).map((p,i)=>{
                    const pk       = `payment_${i}`;
                    const track    = (selected.paymentTracking||{})[pk]||{};
                    const isPaid   = track.paid||false;
                    const paidAmt  = track.amount ? `₹${Number(track.amount).toLocaleString("en-IN")}` : "";
                    const paidDate = track.date||"";
                    return (
                    <div key={i} style={{display:"grid",gridTemplateColumns:"1.5fr 1.5fr 0.7fr 1fr 1fr 1fr",
                      background:isPaid?"#f0fdf4":i%2===0?"#fff":"#f9fafb",
                      borderTop:"1px solid #f3f4f6",
                      borderLeft:isPaid?"3px solid #30D158":"3px solid transparent"}}>
                      <div style={IR.td(i)}><strong>{p.label} — {p.pct}%</strong></div>
                      <div style={{...IR.td(i),fontSize:10,color:C.grey}}>{p.when}</div>
                      <div style={IR.td(i)}>Day {p.day}</div>
                      <div style={{...IR.td(i),fontWeight:700}}>{p.amount>0?`₹${p.amount.toLocaleString("en-IN")}`:""}</div>
                      <div style={{...IR.td(i),fontWeight:700,color:isPaid?"#16a34a":"#dc2626"}}>
                        {isPaid?"✅ Paid":"⏳ Pending"}
                      </div>
                      <div style={{...IR.td(i),fontSize:10,color:C.grey}}>
                        {isPaid && paidAmt && <div>{paidAmt}</div>}
                        {isPaid && paidDate && <div>{paidDate}</div>}
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Rooms — Products, Materials & Sq Ft (no pricing) */}

          
          <div style={IR.sec}>Scope of Work — Products & Materials</div>
          {(selected.rooms||[]).map(r => {
            const works = (selected.roomWork?.[r]||[]).filter(w=>w.product);
            if (!works.length) return null;
            return (
              <div key={r} style={{ marginBottom:14, border:"1px solid #e5e7eb", borderRadius:3, overflow:"hidden" }}>
                {/* Room header */}
                <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 0.6fr 1fr", background:"#1e293b", padding:"8px 12px" }}>
                  <div style={{ color:"#fff", fontWeight:700, fontSize:13 }}>🏠 {r}</div>
                  {["Type","H × W","Sq Ft","Qty","Material"].map(h=>(
                    <div key={h} style={{ color:"rgba(255,255,255,0.6)", fontSize:10, fontWeight:700, letterSpacing:1, textTransform:"uppercase", textAlign:"center" }}>{h}</div>
                  ))}
                </div>
                {/* Work item rows */}
                {works.map((w,wi)=>{
                  const sqft  = w.height&&w.width ? parseFloat(w.height)*parseFloat(w.width) : null;
                  const isQty = QTY_TYPES.has(w.type);
                  const qty   = parseFloat(w.qty)||1;
                  return (
                    <div key={wi} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 0.6fr 1fr",
                      padding:"8px 12px", borderTop:"1px solid #f3f4f6",
                      background:wi%2===0?"#fff":"#f9fafb", alignItems:"center" }}>
                      <div>
                        <div style={{ fontWeight:600, fontSize:12, color:"#0F1923" }}>{w.product}</div>
                        {w.notes&&<div style={{ fontSize:10, color:"#9ca3af" }}>{w.notes}</div>}
                      </div>
                      <div style={{ fontSize:11, color:"#6b7280", textAlign:"center" }}>{w.type}</div>
                      <div style={{ fontSize:11, color:"#374151", textAlign:"center" }}>
                        {w.height&&w.width ? `${w.height}×${w.width}` : "—"}
                      </div>
                      <div style={{ fontSize:11, color:"#374151", textAlign:"center" }}>
                        {!isQty && sqft ? `${sqft.toFixed(1)} sft` : "—"}
                      </div>
                      <div style={{ fontSize:12, fontWeight:700, color:qty>1?"#FF9F0A":"#0A84FF", textAlign:"center" }}>×{qty}</div>
                      <div style={{ fontSize:11, color:"#374151", textAlign:"center" }}>{w.brand||"—"}</div>
                    </div>
                  );
                })}
              </div>
            );
          })}

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
    );
  }


  // ── VENDOR ORDER REPORT ──────────────────────────────────────────────
  if (view==="invoice" && selected) {
    const d = new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"});
    const invNum = `HRI-INV-${String(selected.id||"").slice(-4).padStart(4,"0")}-${new Date().getFullYear()}`;
    const lp = selected.labourPct != null ? selected.labourPct : 50;

    // Build line items from roomWork
    const lineItems = [];
    Object.entries(selected.roomWork||{}).forEach(([room, works]) => {
      const spec = selected.roomDetails?.[room] || {};
      (works||[]).forEach(w => {
        if (!w.product) return;
        const sqft     = w.height&&w.width ? parseFloat(w.height)*parseFloat(w.width) : 0;
        const quantity = parseFloat(w.qty)||1;
        const total    = w.price ? parseFloat(w.price) : calcItemPrice(w, spec);
        lineItems.push({ room, product:w.product, type:w.type, height:w.height, width:w.width,
          brand:w.brand, sqft:sqft.toFixed(1), qty:quantity, unit:QTY_TYPES.has(w.type)?"units":"sq ft",
          total, notes:w.notes });
      });
    });

    const subtotal   = lineItems.reduce((t,l)=>t+l.total,0);
    const gst        = Math.round(subtotal * 0.05);
    const grandTotal = subtotal + gst;

    const RS = {
      page:  { background:"#fff", color:"#0F1923", fontFamily:"Arial,sans-serif", padding:40, maxWidth:900, margin:"0 auto" },
      hdr:   { borderBottom:"3px solid #0F1923", paddingBottom:16, marginBottom:24 },
      co:    { fontSize:22, fontWeight:700, letterSpacing:-0.5 },
      sub:   { fontSize:12, color:"#6b7280", marginTop:4 },
      sec:   { marginBottom:24 },
      sTitle:{ fontSize:11, fontWeight:700, letterSpacing:2, textTransform:"uppercase", color:"#6b7280", borderBottom:"1px solid #e5e7eb", paddingBottom:6, marginBottom:12 },
      th:    (i) => ({ padding:"8px 10px", background:i===0?"#0F1923":"#f3f4f6", color:i===0?"#fff":"#374151", fontSize:11, fontWeight:700, letterSpacing:0.5 }),
      td:    (i) => ({ padding:"8px 10px", fontSize:12, background:i%2===0?"#fff":"#f9fafb", borderBottom:"1px solid #e5e7eb" }),
      row:   { display:"flex", justifyContent:"space-between", marginBottom:6, fontSize:13 },
      total: { display:"flex", justifyContent:"space-between", fontWeight:700, fontSize:15, borderTop:"2px solid #0F1923", paddingTop:10, marginTop:8 },
    };

    const fmt = (n) => "₹" + Math.round(n).toLocaleString("en-IN");

    return (
      <div style={{ background:"#fff", minHeight:"100vh" }}>
        <div style={{ padding:"12px 24px", background:"#0F1923", display:"flex", gap:16, alignItems:"center", displayPrint:"none" }}>
          <button onClick={()=>setView("detail")} style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", color:"#fff", padding:"7px 16px", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontSize:13 }}>← Back</button>
          <button onClick={()=>window.print()} style={{ background:"#0A84FF", border:"none", color:"#fff", padding:"7px 16px", borderRadius:8, cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:600 }}>🖨 Print / PDF</button>
          <span style={{ color:"rgba(255,255,255,0.6)", fontSize:13 }}>Invoice · {selected.name}</span>
        </div>

        <div style={RS.page}>
          {/* Header */}
          <div style={{ ...RS.hdr, display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div style={RS.co}>HIGH RISE INTERIORS</div>
              <div style={RS.sub}>+91-6304980890</div>
              <div style={RS.sub}>Hyderabad, Telangana</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:26, fontWeight:800, letterSpacing:-1, color:"#0F1923" }}>INVOICE</div>
              <div style={{ fontSize:13, color:"#6b7280", marginTop:4 }}># {invNum}</div>
              <div style={{ fontSize:13, color:"#6b7280" }}>Date: {d}</div>
            </div>
          </div>

          {/* Bill To */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:32, marginBottom:28 }}>
            <div>
              <div style={RS.sTitle}>Bill To</div>
              <div style={{ fontWeight:700, fontSize:14 }}>{selected.name}</div>
              {selected.phone   && <div style={{ fontSize:13, color:"#6b7280", marginTop:3 }}>{selected.phone}</div>}
              {selected.email   && <div style={{ fontSize:13, color:"#6b7280" }}>{selected.email}</div>}
              {selected.address && <div style={{ fontSize:13, color:"#6b7280", marginTop:3 }}>{selected.address}</div>}
            </div>
            <div>
              <div style={RS.sTitle}>Project Details</div>
              {[["Property",selected.propertyType],["Style",selected.style],["Start",selected.startDate],["Duration",selected.timeline]]
                .filter(([,v])=>v).map(([l,v])=>(
                <div key={l} style={RS.row}><span style={{ color:"#6b7280" }}>{l}</span><span style={{ fontWeight:600 }}>{v}</span></div>
              ))}
            </div>
          </div>

          {/* Line items table */}
          <div style={RS.sec}>
            <div style={RS.sTitle}>Work Items</div>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr>
                  {["Room","Product","Type","H × W","Sq Ft","Qty","Brand","Amount"].map((h,i)=>(
                    <th key={h} style={RS.th(i)}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lineItems.map((l,i)=>(
                  <tr key={i}>
                    <td style={RS.td(i)}>{l.room}</td>
                    <td style={RS.td(i)}><strong>{l.product}</strong>{l.notes&&<div style={{fontSize:10,color:"#9ca3af"}}>{l.notes}</div>}</td>
                    <td style={RS.td(i)}>{l.type}</td>
                    <td style={RS.td(i)}>{l.height&&l.width?`${l.height} × ${l.width}`:"—"}</td>
                    <td style={{ ...RS.td(i), textAlign:"center" }}>{l.unit==="sq ft"?l.sqft:"—"}</td>
                    <td style={{ ...RS.td(i), textAlign:"center", fontWeight:700, color:l.qty>1?"#FF9F0A":"#374151" }}>×{l.qty}</td>
                    <td style={RS.td(i)}>{l.brand||"—"}</td>
                    <td style={{ ...RS.td(i), textAlign:"right", fontWeight:600 }}>{l.total>0?fmt(l.total):"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div style={{ maxWidth:320, marginLeft:"auto" }}>
            <div style={RS.row}><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
            <div style={RS.row}><span>GST (5%)</span><span>{fmt(gst)}</span></div>
            <div style={RS.total}><span>Total</span><span style={{ color:"#0F1923" }}>{fmt(grandTotal)}</span></div>
          </div>

          {/* Payment terms */}
          <div style={{ marginTop:32, padding:"16px 20px", background:"#f9fafb", borderRadius:8 }}>
            <div style={RS.sTitle}>Payment Terms</div>
            {[["Advance (before project starts)","40%"],["Phase 2 (after box framework)","35%"],
              ["Phase 3 (after wardrobes, before finishing)","20%"],["Phase 4 (handover day)","5%"]]
              .map(([l,v])=>(<div key={l} style={RS.row}><span style={{ color:"#6b7280" }}>{l}</span><span style={{ fontWeight:600 }}>{v}</span></div>))}
          </div>

          {/* Footer */}
          <div style={{ marginTop:32, borderTop:"1px solid #e5e7eb", paddingTop:16, fontSize:11, color:"#9ca3af", textAlign:"center" }}>
            Thank you for choosing High Rise Interiors · +91-6304980890 · Hyderabad, Telangana
          </div>
        </div>
      </div>
    );
  }

if (view==="vendor" && selected) {
    const d = new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"});
    const orderNum = `HRI-PO-${String(selected.id).slice(-4).padStart(4,"0")}-${new Date().getFullYear()}`;

    // Build consolidated material list linked to inventory status
    const orderItems = [];
    Object.entries(selected.roomWork||{}).forEach(([room, works]) => {
      (works||[]).forEach(w => {
        if (!w.brand || !w.product) return;
        const invKey  = `${room}__${w.id}`;
        const invStat = selected.inventory?.[invKey] || { status:"Pending" };
        const catalog = getCatalog(w.matType||"plywood");
        const item    = catalog.find(m=>m.name===w.brand);
        const sqft    = w.height&&w.width ? parseFloat(w.height)*parseFloat(w.width) : 0;
        const qty     = QTY_TYPES.has(w.type) ? parseFloat(w.qty)||1 : sqft;
        const key     = `${room}__${w.id}`;
        orderItems.push({
          key, matType:w.matType||"plywood", name:w.brand,
          product: w.product, type: w.type,
          qty, unit: QTY_TYPES.has(w.type) ? "units" : "sq ft",
          rooms:   [room],
          status:  invStat.status||"Pending",
          orderedDate:   invStat.orderedDate,
          deliveredDate: invStat.deliveredDate,
          installedDate: invStat.installedDate,
          notes:   invStat.notes||"",
        });
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
                  <div style={{ fontWeight:700, fontSize:12 }}>{o.product}</div>
                  <span style={{ background:"rgba(10,132,255,0.1)", color:"#0A84FF", padding:"1px 6px", borderRadius:2, fontSize:9, fontWeight:700 }}>
                    {o.type}
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
              {[["Property",selected.propertyType],["Project",selected.projectType],["Style",selected.style],["Budget",selected.budget],["Start",selected.startDate],["Duration",selected.timeline]].filter(([,v])=>v).map(([l,v])=>(
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
        <div><div style={{ display:"flex",alignItems:"center",gap:8 }}>
              <img src={LOGO_SRC} alt="High Rise Interiors" style={{ height:28,objectFit:"contain",filter:"brightness(0) invert(1)" }}/>
            </div><span style={S.sub}>Client Profile</span></div>
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
                  <div style={{color:"rgba(255,255,255,0.5)",fontSize:13}}>
                    {selected.propertyType && <span style={{marginRight:6}}>{selected.propertyType} ·</span>}
                    {selected.projectType}
                  </div>
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
        <div><div style={{ display:"flex",alignItems:"center",gap:8 }}>
              <img src={LOGO_SRC} alt="High Rise Interiors" style={{ height:28,objectFit:"contain",filter:"brightness(0) invert(1)" }}/>
            </div><span style={S.sub}>Studio CRM</span></div>
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
        <div><div style={{ display:"flex",alignItems:"center",gap:8 }}>
              <img src={LOGO_SRC} alt="High Rise Interiors" style={{ height:28,objectFit:"contain",filter:"brightness(0) invert(1)" }}/>
            </div><span style={S.sub}>{form.id?"Edit Client":"New Client"}</span></div>
        <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
          {form.id && <>
            <button className="pill" style={{background:"rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.75)",border:"1px solid rgba(255,255,255,0.16)"}} onClick={()=>{setSelectedId(form.id);setView("report")}}>📄 Report</button>
            <button className="pill" style={{background:"rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.75)",border:"1px solid rgba(255,255,255,0.16)"}} onClick={()=>{setSelectedId(form.id);setView("invoice")}}>🧾 Invoice</button>
          </>}
          <button className="pill" style={{background:"rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.75)",border:"1px solid rgba(255,255,255,0.16)"}} onClick={()=>setView("list")}>Cancel</button>
          <button style={{ ...S.btn(),opacity:saving?0.7:1 }} onClick={saveCustomer} disabled={saving}>{saving?"Saving…":form.id?"Update Client":"Save Client"}</button>
        </div>
      </div>
      <div style={S.main}>
        {/* Tabs */}
        <div style={{ display:"flex",gap:6,marginBottom:24,flexWrap:"wrap" }}>
          {[["personal","👤 Client"],["rooms","🏠 Rooms & Materials"],["quotation","💰 Quotation"],["notes","📝 Notes"],["inventory","📦 Inventory"],["plan","📅 Project Plan"]].map(([k,l])=>(
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
                <Field label="Property Type">
                  <select className="glass-input" style={{}}
                    value={form.propertyType||"3 BHK"}
                    onChange={e=>{
                      const pt = e.target.value;
                      const budget = PROPERTY_BUDGET_MAP[pt] || "";
                      const rooms  = PROPERTY_ROOMS_MAP[pt]  || [];
                      const rw     = buildDefaultRoomWork(pt);
                      setForm(f=>({...f, propertyType:pt, budget, rooms, roomWork:rw}));
                    }}>
                    {PROPERTY_TYPES.map(p=><option key={p} value={p}>{p}</option>)}
                  </select>
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
              <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:"rgba(255,255,255,0.55)",textTransform:"uppercase",borderBottom:"1px solid rgba(255,255,255,0.1)",paddingBottom:8,marginBottom:14}}>
                Rooms, Products & Materials
              </div>
              <div style={{fontSize:13,color:"rgba(255,255,255,0.5)",marginBottom:16,lineHeight:1.7}}>
                Select rooms → Add products → Type auto-fills → Enter H×W → Select material. Room defaults carry over.
              </div>

              {/* Room selector */}
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:20}}>
                {getRooms(form).map(r=>(<button key={r} style={S.pill(form.rooms.includes(r))} onClick={()=>toggleRoom(r)}>{r}</button>))}
              </div>

              {form.rooms.length===0 && (
                <div style={{textAlign:"center",padding:"32px",background:"rgba(255,255,255,0.05)",borderRadius:12,color:"rgba(255,255,255,0.5)",fontSize:13}}>
                  ☝️ Select rooms above to start adding products
                </div>
              )}

              {form.rooms.map(room=>{
                const works   = form.roomWork?.[room] || [];
                const rd      = form.roomDetails?.[room] || {};
                const roomSpec = rd;  // alias — used by calcItemPrice and roomDefaults
                const setRD = (key,val)=>setForm(f=>({...f,roomDetails:{...(f.roomDetails||{}),[room]:{...(f.roomDetails?.[room]||{}),[key]:val}}}));
                const setWorks = (updater)=>setForm(f=>({...f,roomWork:{...(f.roomWork||{}),[room]:typeof updater==="function"?updater(f.roomWork?.[room]||[]):updater}}));
                const roomArea = rd.length&&rd.width?(parseFloat(rd.length)*parseFloat(rd.width)).toFixed(0):null;

                // Collect previous material defaults for this room (most recently selected brand per mat type)
                const roomDefaults = {};
                // First: seed from room spec (plywood grade, etc.)
                // Use roomSpec which is already defined above
                const specBrands = {
                  plywood:  roomSpec.plywoodGrade  || null,
                  laminate: roomSpec.laminateType  || null,
                  hardware: roomSpec.hardware       || null,
                };
                Object.entries(specBrands).forEach(([mt,brand])=>{ if(brand) roomDefaults[mt]=brand; });
                // Then: override with actual item brands (per-item beats room spec)
                works.forEach(w=>{
                  if(w.matType && w.brand) roomDefaults[w.matType] = w.brand;
                });

                const addWork = ()=>{
                  // Default product = first in list; auto-fill type and default material
                  const prod = getProductsForRoom(room)[0]||ALL_PRODUCTS[0];
                  const defaultBrands = {};
                  prod.mats.forEach(mt=>{
                    // Use room default if exists, otherwise lowest price item
                    if(roomDefaults[mt]) { defaultBrands[mt]=roomDefaults[mt]; }
                    else {
                      const catalog = getCatalog(mt);
                      if(catalog.length) {
                        const cheapest = [...catalog].sort((a,b)=>(a.price||0)-(b.price||0))[0];
                        defaultBrands[mt]=cheapest.name;
                      }
                    }
                  });
                  setWorks(w=>[...w,{id:Date.now(),product:prod.name,type:prod.type,
                    height:"",width:"",qty:"1",price:"",notes:"",
                    matType:prod.mats[0]||"",brand:defaultBrands[prod.mats[0]||""]||"",
                    allBrands:defaultBrands}]);
                };
                const delWork=(id)=>setWorks(w=>w.filter(x=>x.id!==id));
                const updWork=(id,key,val,extra={})=>setWorks(w=>w.map(x=>x.id===id?{...x,[key]:val,...extra}:x));

                const roomTotal = works.reduce((t,w)=>
                  t + (w.price ? parseFloat(w.price) : calcItemPrice(w, roomSpec))
                , 0);

                return (
                  <div key={room} className="glass" style={{padding:"20px",marginBottom:16}}>
                    {/* Room header */}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                      <div style={{fontSize:15,fontWeight:700}}>🏠 {room}</div>
                      {roomTotal>0&&<div style={{fontSize:14,fontWeight:700,color:"#FF9F0A"}}>₹{roomTotal.toLocaleString("en-IN")}</div>}
                    </div>

                    {/* Room L×W×H reference */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto",gap:8,marginBottom:14,alignItems:"end"}}>
                      {[["length","Room L (ft)"],["width","Room W (ft)"],["height","Room H (ft)"]].map(([k,lbl])=>(
                        <div key={k}>
                          <label style={{fontSize:9,letterSpacing:1.5,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",marginBottom:4,display:"block",fontWeight:600}}>{lbl}</label>
                          <input className="glass-input" type="number" min="0" step="0.1" value={rd[k]||""} onChange={e=>setRD(k,e.target.value)} placeholder="0" style={{padding:"7px 10px",fontSize:13}}/>
                        </div>
                      ))}
                      <div style={{background:roomArea?"rgba(10,132,255,0.15)":"rgba(255,255,255,0.04)",border:`1px solid ${roomArea?"rgba(10,132,255,0.4)":"rgba(255,255,255,0.08)"}`,borderRadius:10,padding:"8px 12px",textAlign:"center",minWidth:76}}>
                        <div style={{fontSize:14,fontWeight:800,color:roomArea?"#0A84FF":"rgba(255,255,255,0.2)"}}>{roomArea||"—"}</div>
                        <div style={{fontSize:8,color:roomArea?"rgba(10,132,255,0.7)":"rgba(255,255,255,0.2)",letterSpacing:0.8,fontWeight:600}}>SQ FT</div>
                      </div>
                    </div>

                    <div style={{borderTop:"1px solid rgba(255,255,255,0.08)",marginBottom:12}}/>

                    {/* ── Room Spec & Pricing Defaults ── */}
                    {(()=>{
                      const spec = form.roomDetails?.[room] || {};
                      const SPEC_TO_MAT = {
                        plywoodGrade:{ matType:"plywood",  getBrand:(v)=>v },
                        laminateType:{ matType:"laminate", getBrand:(v)=>v },
                        hardware:    { matType:"hardware", getBrand:(v)=>v },
                      };
                      const setSpec = (key, val) => setForm(f => {
                        // 1. Update the room spec
                        const newRoomDetails = {
                          ...(f.roomDetails||{}),
                          [room]: { ...(f.roomDetails?.[room]||{}), [key]: val }
                        };
                        // 2. If this spec key maps to a matType, propagate brand
                        //    to all items in this room with that matType,
                        //    UNLESS the item has a manual price override (w.price set)
                        const matMapping = SPEC_TO_MAT[key];
                        let newRoomWork = f.roomWork;
                        if (matMapping) {
                          const newBrand = matMapping.getBrand(val);
                          const updatedWorks = (f.roomWork?.[room] || []).map(w => {
                            // Skip if user has manually set a price (their explicit override)
                            if (w.price) return w;
                            // Only update items whose matType matches
                            if (w.matType === matMapping.matType) {
                              return { ...w, brand: newBrand };
                            }
                            return w;
                          });
                          newRoomWork = { ...(f.roomWork||{}), [room]: updatedWorks };
                        }
                        return { ...f, roomDetails: newRoomDetails, roomWork: newRoomWork };
                      });
                      const plywoodGrade  = spec.plywoodGrade  || "Century Sainik 710 BWP";
                      const laminateType  = spec.laminateType  || "Economy Laminate";
                      const builtType     = spec.builtType     || "Manual";
                      const hardware      = spec.hardware      || "Nimmi";
                      const roomSpec      = {plywoodGrade, laminateType, builtType, hardware};
                      return (
                        <div style={{background:"rgba(255,255,255,0.04)",borderRadius:10,
                          padding:"12px 14px",marginBottom:12,border:"1px solid rgba(255,255,255,0.08)"}}>
                          <div style={{fontSize:9,fontWeight:700,letterSpacing:2,
                            color:"rgba(255,255,255,0.4)",textTransform:"uppercase",marginBottom:10}}>
                            🎨 Room Pricing Spec — applies to all items in this room
                          </div>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8}}>
                            {/* Plywood Grade */}
                            <div>
                              <label style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.35)",
                                letterSpacing:1,textTransform:"uppercase",display:"block",marginBottom:3}}>
                                Plywood Grade
                              </label>
                              <select className="glass-input" style={{fontSize:11,padding:"4px 7px",width:"100%"}}
                                value={plywoodGrade} onChange={e=>setSpec("plywoodGrade",e.target.value)}>
                                {PLYWOOD_GRADES.map(g=>(
                                  <option key={g.name} value={g.name}>
                                    {g.name} (₹{g.price}/sft)
                                  </option>
                                ))}
                              </select>
                            </div>
                            {/* Laminate Type */}
                            <div>
                              <label style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.35)",
                                letterSpacing:1,textTransform:"uppercase",display:"block",marginBottom:3}}>
                                Laminate Type
                              </label>
                              <select className="glass-input" style={{fontSize:11,padding:"4px 7px",width:"100%"}}
                                value={laminateType} onChange={e=>setSpec("laminateType",e.target.value)}>
                                {LAMINATE_TYPES.map(l=>(
                                  <option key={l.name} value={l.name}>
                                    {l.name} (+{Math.round(l.pct*100)}%) {l.range}
                                  </option>
                                ))}
                              </select>
                            </div>
                            {/* Built Type */}
                            <div>
                              <label style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.35)",
                                letterSpacing:1,textTransform:"uppercase",display:"block",marginBottom:3}}>
                                Built Type
                              </label>
                              <select className="glass-input" style={{fontSize:11,padding:"4px 7px",width:"100%"}}
                                value={builtType} onChange={e=>setSpec("builtType",e.target.value)}>
                                {BUILT_TYPES.map(b=>(
                                  <option key={b.name} value={b.name}>
                                    {b.name} (+{Math.round(b.pct*100)}%)
                                  </option>
                                ))}
                              </select>
                            </div>
                            {/* Hardware */}
                            <div>
                              <label style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.35)",
                                letterSpacing:1,textTransform:"uppercase",display:"block",marginBottom:3}}>
                                Hardware
                              </label>
                              <select className="glass-input" style={{fontSize:11,padding:"4px 7px",width:"100%"}}
                                value={hardware} onChange={e=>setSpec("hardware",e.target.value)}>
                                {HARDWARE_TYPES.map(h=>(
                                  <option key={h.name} value={h.name}>
                                    {h.name} (+{Math.round(h.pct*100)}%)
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          {/* Live price preview */}
                          {works.length>0 && (()=>{
                            const roomTotal = works.reduce((t,w)=>t+calcItemPrice(w,roomSpec),0);
                            return roomTotal>0 ? (
                              <div style={{marginTop:8,fontSize:11,color:"#30D158",fontWeight:700}}>
                                📊 Est. Room Total: ₹{roomTotal.toLocaleString("en-IN")}
                                <span style={{fontSize:9,color:"rgba(255,255,255,0.3)",fontWeight:400,marginLeft:6}}>
                                  ({laminateType} · {builtType} · {hardware})
                                </span>
                              </div>
                            ) : null;
                          })()}
                        </div>
                      );
                    })()}

                    {/* Column headers */}
                    {works.length>0&&(
                      <div style={{display:"grid",gridTemplateColumns:"2fr 1.2fr 72px 16px 72px 72px 56px 1.6fr 1.4fr 90px 36px",gap:6,marginBottom:6,paddingLeft:2}}>
                        {["Product","Type","Height","×","Width","Sq Ft","Qty","Material / Brand","Notes","Price",""].map((h,i)=>(
                          <div key={i} style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.35)",letterSpacing:1,textTransform:"uppercase"}}>{h}</div>
                        ))}
                      </div>
                    )}

                    {/* Work item rows */}
                    {works.map((w,wi)=>{
                      const prod = getProductsForRoom(room).find(p=>p.name===w.product)||getProductsForRoom(room)[0]||ALL_PRODUCTS[0];
                      const useQty = QTY_TYPES.has(w.type);
                      const sqft   = w.height&&w.width?parseFloat(w.height)*parseFloat(w.width):null;
                      const catalog = getCatalog(w.matType||"plywood");
                      const item    = catalog.find(m=>m.name===w.brand);
                      const qty     = useQty?parseFloat(w.qty)||1:sqft||0;
                      const autoPrice  = w.price ? 0 : calcItemPrice(w, roomSpec);
                      const finalPrice = w.price ? parseFloat(w.price) : autoPrice;

                      return (
                        <div key={w.id} style={{marginBottom:8}}>
                          <div style={{display:"grid",gridTemplateColumns:"2fr 1.2fr 72px 16px 72px 72px 56px 1.6fr 1.4fr 90px 36px",gap:6,alignItems:"center",background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"10px 10px"}}>
                            {/* Product dropdown */}
                            <select className="glass-input" style={{fontSize:12,padding:"5px 6px"}}
                              value={w.product||""}
                              onChange={e=>{
                                const p=getProductsForRoom(room).find(x=>x.name===e.target.value)||getProductsForRoom(room)[0]||ALL_PRODUCTS[0];
                                // Auto-fill type; compute default brands
                                const defs={};
                                p.mats.forEach(mt=>{
                                  if(roomDefaults[mt]){defs[mt]=roomDefaults[mt];}
                                  else{const c=getCatalog(mt);if(c.length){const ch=[...c].sort((a,b)=>(a.price||0)-(b.price||0))[0];defs[mt]=ch.name;}}
                                });
                                updWork(w.id,"product",e.target.value,{type:p.type,matType:p.mats[0]||"",brand:defs[p.mats[0]||""]||"",allBrands:defs,price:""});
                              }}>
                              {getProductsForRoom(room).map(p=><option key={p.name} value={p.name}>{p.name}</option>)}
                            </select>

                            {/* Type (auto-filled, editable) */}
                            <select className="glass-input" style={{fontSize:11,padding:"4px 5px"}}
                              value={w.type||""}
                              onChange={e=>updWork(w.id,"type",e.target.value)}>
                              <option value="">-- Type</option>
                              {Object.keys(WORK_TYPE_PRICES).map(t=>(
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>

                            {/* Height or Qty (qty-unit types use this wide field for their qty) */}
                            {useQty?(
                              <>
                                <input className="glass-input" type="number" min="0"
                                  style={{fontSize:12,padding:"5px 6px",textAlign:"center",gridColumn:"3/7"}}
                                  placeholder="Qty" value={w.qty||""}
                                  onChange={e=>updWork(w.id,"qty",e.target.value)}/>
                                {/* Spacer for the dedicated Qty column below, since this type's
                                    qty already feeds the wide field above */}
                                <div/>
                              </>
                            ):(
                              <>
                                <input className="glass-input" type="number" min="0" step="0.1"
                                  style={{fontSize:12,padding:"5px 6px",textAlign:"center"}}
                                  placeholder="H" value={w.height||""}
                                  onChange={e=>updWork(w.id,"height",e.target.value)}/>
                                <div style={{textAlign:"center",color:"rgba(255,255,255,0.25)",fontSize:14}}>×</div>
                                <input className="glass-input" type="number" min="0" step="0.1"
                                  style={{fontSize:12,padding:"5px 6px",textAlign:"center"}}
                                  placeholder="W" value={w.width||""}
                                  onChange={e=>updWork(w.id,"width",e.target.value)}/>
                                {/* Sq ft */}
                                <div style={{background:sqft?"rgba(10,132,255,0.15)":"rgba(255,255,255,0.04)",border:`1px solid ${sqft?"rgba(10,132,255,0.3)":"rgba(255,255,255,0.06)"}`,borderRadius:8,padding:"4px 6px",textAlign:"center"}}>
                                  <div style={{fontSize:12,fontWeight:800,color:sqft?"#0A84FF":"rgba(255,255,255,0.2)"}}>{sqft?sqft.toFixed(1):"—"}</div>
                                  <div style={{fontSize:8,color:"rgba(10,132,255,0.5)",fontWeight:600}}>sqft</div>
                                </div>
                                {/* Qty multiplier — applies on top of sq ft, defaults to 1 */}
                                <input className="glass-input" type="number" min="1" step="1"
                                  style={{fontSize:12,padding:"5px 4px",textAlign:"center",
                                    color:(parseFloat(w.qty)||1)>1?"#FF9F0A":"rgba(255,255,255,0.7)"}}
                                  placeholder="1" value={w.qty||""}
                                  onChange={e=>updWork(w.id,"qty",e.target.value)}/>
                              </>
                            )}

                            {/* Material selector */}
                            {prod.mats.length>0?(
                              <div style={{display:"flex",flexDirection:"column",gap:3}}>
                                {/* Mat type (if multiple) */}
                                {prod.mats.length>1&&(
                                  <select className="glass-input" style={{fontSize:10,padding:"3px 5px"}}
                                    value={w.matType||""}
                                    onChange={e=>{
                                      const c=getCatalog(e.target.value);
                                      const def=(w.allBrands||{})[e.target.value]||(c.length?[...c].sort((a,b)=>(a.price||0)-(b.price||0))[0].name:"");
                                      updWork(w.id,"matType",e.target.value,{brand:def,price:""});
                                    }}>
                                    {prod.mats.map(mt=><option key={mt} value={mt}>{MATERIAL_LABELS[mt]||mt}</option>)}
                                  </select>
                                )}
                                <select className="glass-input" style={{fontSize:11,padding:"5px 6px"}}
                                  value={w.brand||""}
                                  onChange={e=>updWork(w.id,"brand",e.target.value,{price:""})}>
                                  <option value="">— select —</option>
                                  {getCatalog(w.matType||prod.mats[0]||"plywood").map(m=>(
                                    <option key={m.name} value={m.name}>{m.name}{m.price?` ₹${m.price}`:""}</option>
                                  ))}
                                </select>
                              </div>
                            ):(
                              <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",textAlign:"center"}}>—</div>
                            )}

                            {/* Notes */}
                            <input className="glass-input" style={{fontSize:11,padding:"5px 6px"}}
                              placeholder="e.g. 10ft wall unit..."
                              value={w.notes||""}
                              onChange={e=>updWork(w.id,"notes",e.target.value)}/>

                            {/* Price — auto-calc or manual override */}
                            <div style={{display:"flex",flexDirection:"column",gap:2}}>
                              <input className="glass-input" type="number" min="0"
                                style={{fontSize:12,padding:"5px 6px",textAlign:"right",
                                  color:w.price?"rgba(255,159,10,0.9)":"rgba(48,209,88,0.9)",
                                  background:w.price?"rgba(255,159,10,0.1)":"rgba(48,209,88,0.06)"}}
                                placeholder={autoPrice>0?`₹${autoPrice.toLocaleString("en-IN")}`:"Manual"}
                                value={w.price||""}
                                onChange={e=>updWork(w.id,"price",e.target.value)}/>
                              {autoPrice>0&&!w.price&&(
                                <div style={{fontSize:9,color:"rgba(48,209,88,0.5)",textAlign:"right"}}>auto ₹{item?.price}/{item?.unit||"sqft"}</div>
                              )}
                            </div>

                            {/* Delete */}
                            <button onClick={()=>delWork(w.id)}
                              style={{background:"rgba(255,69,58,0.15)",border:"1px solid rgba(255,69,58,0.3)",borderRadius:8,color:"#FF453A",padding:"5px 8px",cursor:"pointer",fontFamily:"inherit",fontSize:12}}>✕</button>
                          </div>
                        </div>
                      );
                    })}

                    {/* ── Room Photos + AI Render ── */}
                    {/* ── Photos & AI Renders ── */}
                    <div style={{marginTop:14,marginBottom:4}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                        <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:"rgba(255,255,255,0.4)",textTransform:"uppercase"}}>
                          📸 Photos & AI Renders
                        </div>
                        {(rd.photos||[]).length>0 && (
                          <div style={{display:"flex",gap:6,alignItems:"center"}}>
                            <select className="glass-input" style={{fontSize:11,padding:"3px 8px",width:"auto"}}
                              value={renderStyles[room]||"Luxury"}
                              onChange={e=>setRenderStyles(s=>({...s,[room]:e.target.value}))}>
                              {RENDER_STYLES.map(s=><option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Photo thumbnails */}
                      <div style={{display:"flex",flexWrap:"wrap",gap:8,alignItems:"flex-start",marginBottom:8}}>
                        {(rd.photos||[]).map((photo,pi)=>(
                          <div key={pi} style={{position:"relative",display:"flex",flexDirection:"column",gap:3}}>
                            <img src={photo} alt={`${room} ${pi+1}`}
                              style={{width:80,height:80,objectFit:"cover",borderRadius:10,
                                border:"1px solid rgba(255,255,255,0.14)",cursor:"pointer"}}
                              onClick={()=>window.open(photo,"_blank")}/>
                            <div style={{display:"flex",gap:3}}>
                              <button onClick={()=>doRenderRoom(room,photo)}
                                disabled={renderingRoom===room}
                                style={{flex:1,padding:"3px 0",borderRadius:6,
                                  border:"1px solid rgba(191,90,242,0.4)",
                                  background:renderingRoom===room?"rgba(255,255,255,0.05)":"rgba(191,90,242,0.15)",
                                  color:renderingRoom===room?"rgba(255,255,255,0.3)":"#BF5AF2",
                                  cursor:renderingRoom===room?"not-allowed":"pointer",
                                  fontFamily:"inherit",fontSize:9,fontWeight:700}}>
                                {renderingRoom===room?"⏳":"✨ AI"}
                              </button>
                              <button onClick={()=>setRD("photos",(rd.photos||[]).filter((_,i)=>i!==pi))}
                                style={{padding:"3px 6px",borderRadius:6,
                                  border:"1px solid rgba(255,69,58,0.3)",
                                  background:"rgba(255,69,58,0.12)",color:"#FF453A",
                                  cursor:"pointer",fontFamily:"inherit",fontSize:9}}>✕</button>
                            </div>
                          </div>
                        ))}

                        {/* Upload button */}
                        <label style={{width:80,height:80,borderRadius:10,
                          border:"1px dashed rgba(255,255,255,0.18)",
                          background:"rgba(255,255,255,0.04)",display:"flex",
                          flexDirection:"column",alignItems:"center",
                          justifyContent:"center",cursor:"pointer",gap:4}}>
                          <span style={{fontSize:22}}>📷</span>
                          <span style={{fontSize:9,color:"rgba(255,255,255,0.35)"}}>Add Photo</span>
                          <input type="file" accept="image/*" multiple style={{display:"none"}}
                            onChange={e=>{
                              [...e.target.files].forEach(file=>{
                                const reader=new FileReader();
                                reader.onload=ev=>setRD("photos",[...(rd.photos||[]),ev.target.result]);
                                reader.readAsDataURL(file);
                              });
                              e.target.value="";
                            }}/>
                        </label>
                      </div>

                      {/* Render error */}
                      {renderErrors[room] && (
                        <div style={{fontSize:11,color:"#FF453A",background:"rgba(255,69,58,0.1)",
                          borderRadius:8,padding:"6px 10px",marginBottom:8}}>
                          ⚠️ {renderErrors[room]}
                        </div>
                      )}

                      {/* Render results */}
                      {(rd.renders||[]).length>0 && (
                        <div style={{marginTop:8}}>
                          <div style={{fontSize:9,fontWeight:700,letterSpacing:1.5,
                            color:"rgba(191,90,242,0.6)",textTransform:"uppercase",marginBottom:6}}>
                            ✨ AI Renders
                          </div>
                          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                            {(rd.renders||[]).map((r,ri)=>(
                              <div key={ri} style={{position:"relative"}}>
                                <img src={r.url} alt={r.style}
                                  style={{width:120,height:90,objectFit:"cover",borderRadius:10,
                                    border:"1px solid rgba(191,90,242,0.4)",cursor:"pointer"}}
                                  onClick={()=>window.open(r.url,"_blank")}/>
                                <div style={{position:"absolute",bottom:3,left:3,right:3,
                                  background:"rgba(0,0,0,0.7)",borderRadius:5,padding:"2px 5px",
                                  fontSize:8,color:"#fff",textAlign:"center",fontWeight:600}}>
                                  ✨ {r.style}
                                </div>
                                <button onClick={()=>setRD("renders",(rd.renders||[]).filter((_,i)=>i!==ri))}
                                  style={{position:"absolute",top:-5,right:-5,width:16,height:16,
                                    borderRadius:"50%",background:"#FF453A",border:"none",
                                    color:"#fff",cursor:"pointer",fontSize:8,
                                    fontFamily:"inherit",padding:0,lineHeight:1}}>✕</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Add row button */}
                    <button onClick={addWork}
                      style={{width:"100%",padding:"8px",borderRadius:10,border:"1px dashed rgba(10,132,255,0.35)",background:"rgba(10,132,255,0.07)",color:"#0A84FF",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600,marginTop:4}}>
                      + Add Product Row
                    </button>

                    {roomTotal>0&&(
                      <div style={{marginTop:12,borderTop:"1px solid rgba(255,255,255,0.08)",paddingTop:10,display:"flex",justifyContent:"space-between"}}>
                        <span style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,textTransform:"uppercase"}}>Room Total</span>
                        <span style={{fontSize:16,fontWeight:800,color:"#FF9F0A"}}>₹{roomTotal.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Grand total — Interior + Add On split */}
              {(()=>{
                const ADD_ON_ROOMS = new Set(["Add On"]);
                const calcR = (room) => {
                  const works = form.roomWork?.[room]||[];
                  const rSpec = form.roomDetails?.[room]||{};
                  return works.reduce((rt,w)=>rt+(w.price?parseFloat(w.price):calcItemPrice(w,rSpec)),0);
                };
                const interiorGrand = form.rooms.filter(r=>!ADD_ON_ROOMS.has(r)).reduce((t,r)=>t+calcR(r),0);
                const addOnGrand    = form.rooms.filter(r=> ADD_ON_ROOMS.has(r)).reduce((t,r)=>t+calcR(r),0);
                const grand = interiorGrand + addOnGrand;
                return grand>0?(
                  <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    {interiorGrand>0 && (
                      <div className="glass" style={{padding:"10px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(10,132,255,0.08)",borderColor:"rgba(10,132,255,0.2)"}}>
                        <span style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.55)"}}>Interior Works</span>
                        <span style={{fontSize:16,fontWeight:800,color:"#0A84FF"}}>₹{interiorGrand.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    {addOnGrand>0 && (
                      <div className="glass" style={{padding:"10px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(255,159,10,0.08)",borderColor:"rgba(255,159,10,0.2)"}}>
                        <span style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.55)"}}>Add On</span>
                        <span style={{fontSize:16,fontWeight:800,color:"#FF9F0A"}}>₹{addOnGrand.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    <div className="glass" style={{padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(255,69,58,0.1)",borderColor:"rgba(255,69,58,0.3)"}}>
                      <span style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.7)"}}>Total — All Rooms</span>
                      <span style={{fontSize:22,fontWeight:800,color:"#FF453A"}}>₹{grand.toLocaleString("en-IN")}</span>
                    </div>
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

              {/* Auto-calculate from roomWork */}
              {form.roomWork && Object.keys(form.roomWork).length > 0 && (() => {
                // Split: interior rooms vs Add On
                const ADD_ON_ROOMS = new Set(["Add On"]);
                const calcRoomTotal = (room) => {
                  const works = form.roomWork?.[room] || [];
                  const spec  = form.roomDetails?.[room] || {};
                  return works.reduce((t, w) => t + (w.price ? parseFloat(w.price) : calcItemPrice(w, spec)), 0);
                };
                const interiorCost = Object.keys(form.roomWork||{})
                  .filter(r => !ADD_ON_ROOMS.has(r))
                  .reduce((t, r) => t + calcRoomTotal(r), 0);
                const addOnCost = Object.keys(form.roomWork||{})
                  .filter(r => ADD_ON_ROOMS.has(r))
                  .reduce((t, r) => t + calcRoomTotal(r), 0);
                const matCost = interiorCost + addOnCost;
                const labourMult = 1 + (form.labourPct != null ? form.labourPct : 50)/100;
                const interiorWithLabour = Math.round(interiorCost * labourMult);
                const addOnWithLabour    = Math.round(addOnCost * labourMult);
                const withLabour = Math.round(matCost * labourMult);
                // The effective quotation depends on whether Add On is included
                const qIncludesAddOn = form.quotationIncludesAddOn !== false;
                const effectiveTotal = qIncludesAddOn ? withLabour : interiorWithLabour;
                return matCost > 0 ? (
                  <div className="glass" style={{ borderRadius:12, padding:"14px 18px", marginBottom:20, border:"1px solid rgba(255,255,255,0.12)" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:"#FF453A", letterSpacing:1 }}>AUTO-CALCULATED FROM MATERIALS</div>
                      {/* Add On toggle in quotation tab */}
                      {addOnCost > 0 && (
                        <label style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer",
                          fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.7)",
                          background:qIncludesAddOn?"rgba(255,159,10,0.15)":"rgba(255,255,255,0.06)",
                          border:`1px solid ${qIncludesAddOn?"#FF9F0A":"rgba(255,255,255,0.15)"}`,
                          borderRadius:16, padding:"4px 10px" }}>
                          <input type="checkbox" checked={qIncludesAddOn}
                            onChange={e=>setF("quotationIncludesAddOn", e.target.checked)}
                            style={{ accentColor:"#FF9F0A", width:13, height:13 }}/>
                          Include Add On
                        </label>
                      )}
                    </div>
                    {/* Interior breakdown */}
                    {interiorCost > 0 && (
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:"rgba(255,255,255,0.6)", marginBottom:6 }}>
                        <span>Interior Works (material + {form.labourPct||50}% labour)</span>
                        <strong style={{ color:"#0A84FF" }}>{fmt(interiorWithLabour)}</strong>
                      </div>
                    )}
                    {/* Add On breakdown — shown only when included */}
                    {addOnCost > 0 && qIncludesAddOn && (
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:"rgba(255,255,255,0.6)", marginBottom:6 }}>
                        <span>Add On (material + {form.labourPct||50}% labour)</span>
                        <strong style={{ color:"#FF9F0A" }}>{fmt(addOnWithLabour)}</strong>
                      </div>
                    )}
                    {addOnCost > 0 && !qIncludesAddOn && (
                      <div style={{ fontSize:11, color:"rgba(255,159,10,0.6)", marginBottom:6 }}>
                        Add On ({fmt(addOnWithLabour)}) excluded from quotation
                      </div>
                    )}
                    {/* Divider + Grand Total */}
                    <div style={{ borderTop:"1px solid rgba(255,255,255,0.12)", marginTop:8, paddingTop:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontSize:13, color:"rgba(255,255,255,0.5)" }}>Total</span>
                      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                        <strong style={{ color:"#0A84FF", fontSize:16 }}>{fmt(effectiveTotal)}</strong>
                        <button style={{ ...S.btn(), fontSize:11, padding:"6px 14px" }}
                          onClick={() => {
                            setF("previousQuotation", effectiveTotal.toString());
                            // Auto-apply existing rebate if set
                            const rebateVal = parseFloat(form.rebateValue||0);
                            if (rebateVal > 0) {
                              const rebateAmt = form.rebateType==="percent"
                                ? Math.round(effectiveTotal * rebateVal / 100)
                                : rebateVal;
                              const couponAmt = form.couponApplied ? Math.round((effectiveTotal-rebateAmt)*0.05) : 0;
                              const revised = Math.round(effectiveTotal - rebateAmt - couponAmt);
                              setF("revisedQuotation", revised.toString());
                              setF("quotation", revised.toString());
                            } else {
                              setF("quotation", effectiveTotal.toString());
                              setF("revisedQuotation", effectiveTotal.toString());
                            }
                          }}>
                          ↓ Use This
                        </button>
                      </div>
                    </div>
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

                {/* This client's own referral code — only shown when Active */}
                {form.status === "Active" && (
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
                )}

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
                  {buildPaymentSchedule(parseInt(form.timeline)||120, form.quotation).map((p,i)=>{
                    const pk        = `payment_${i}`;
                    const payTrack  = (form.paymentTracking||{})[pk] || {};
                    const isPaid    = payTrack.paid || false;
                    const paidAmt   = payTrack.amount || "";
                    const paidDate  = payTrack.date   || "";
                    const togglePay = () => setForm(f=>({...f,
                      paymentTracking:{...(f.paymentTracking||{}),
                        [pk]:{...(f.paymentTracking?.[pk]||{}), paid:!isPaid,
                              amount:!isPaid?(p.amount||""):paidAmt, date:!isPaid?new Date().toISOString().split("T")[0]:paidDate }
                      }
                    }));
                    return (
                    <div key={i} style={{ borderRadius:12,marginBottom:10,
                      border:`1px solid ${isPaid?"rgba(48,209,88,0.4)":"rgba(255,255,255,0.12)"}`,
                      background:isPaid?"rgba(48,209,88,0.06)":"rgba(255,255,255,0.05)",
                      overflow:"hidden" }}>
                      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 18px" }}>
                        <div style={{flex:1}}>
                          <div style={{ fontWeight:700,fontSize:13,color:isPaid?"#30D158":"#0A84FF" }}>
                            {isPaid?"✅":"⏳"} {p.label} — {p.pct}%
                          </div>
                          <div style={{ fontSize:11,color:"rgba(255,255,255,0.45)",marginTop:2 }}>{p.when}</div>
                        </div>
                        <div style={{ textAlign:"right",marginLeft:12 }}>
                          {p.amount>0 && <div style={{ fontSize:16,fontWeight:700,color:isPaid?"#30D158":"#0A84FF" }}>₹{p.amount.toLocaleString("en-IN")}</div>}
                          <div style={{ fontSize:10,color:"rgba(255,255,255,0.35)" }}>Day {p.day}</div>
                        </div>
                        <button onClick={togglePay}
                          style={{marginLeft:14,padding:"6px 14px",borderRadius:20,border:"none",cursor:"pointer",
                            fontFamily:"inherit",fontSize:11,fontWeight:700,
                            background:isPaid?"rgba(255,69,58,0.15)":"rgba(48,209,88,0.15)",
                            color:isPaid?"#FF453A":"#30D158"}}>
                          {isPaid?"Mark Unpaid":"Mark Paid"}
                        </button>
                      </div>
                      {isPaid && (
                        <div style={{display:"flex",gap:10,padding:"8px 18px 12px",borderTop:"1px solid rgba(48,209,88,0.15)"}}>
                          <div style={{flex:1}}>
                            <div style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.35)",letterSpacing:1,textTransform:"uppercase",marginBottom:3}}>Amount Received</div>
                            <input className="glass-input" type="number" placeholder="₹ amount"
                              style={{fontSize:12,padding:"4px 8px"}}
                              value={paidAmt}
                              onChange={e=>setForm(f=>({...f,
                                paymentTracking:{...(f.paymentTracking||{}),[pk]:{...(f.paymentTracking?.[pk]||{}),amount:e.target.value}}
                              }))}/>
                          </div>
                          <div style={{flex:1}}>
                            <div style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.35)",letterSpacing:1,textTransform:"uppercase",marginBottom:3}}>Date Received</div>
                            <input className="glass-input" type="date"
                              style={{fontSize:12,padding:"4px 8px"}}
                              value={paidDate}
                              onChange={e=>setForm(f=>({...f,
                                paymentTracking:{...(f.paymentTracking||{}),[pk]:{...(f.paymentTracking?.[pk]||{}),date:e.target.value}}
                              }))}/>
                          </div>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── INVENTORY ── */}
          {activeTab==="inventory" && (
            <div>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:"rgba(255,255,255,0.55)",textTransform:"uppercase",borderBottom:"1px solid rgba(255,255,255,0.1)",paddingBottom:8,marginBottom:14}}>Project Material Inventory</div>
              {!form.roomWork || Object.keys(form.roomWork).length===0 ? (
                <div style={{ textAlign:"center", padding:40, background:"rgba(255,255,255,0.07)", borderRadius:3, color:"rgba(255,255,255,0.5)", fontSize:13, border:"1px solid rgba(255,255,255,0.12)" }}>
                  ☝️ Add products in the <strong>Rooms & Materials</strong> tab first, then track them here
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
                  {Object.entries(form.roomWork).map(([room, works]) => {
                    const matEntries = (works||[]).filter(w=>w.brand&&w.product);
                    if (!matEntries.length) return null;
                    const installedCount = matEntries.filter(w=>{
                      const k=`${room}__${w.id}`;
                      return form.inventory?.[k]?.status==="Installed";
                    }).length;
                    return (
                      <div key={room} className="glass" style={{ marginBottom:16, borderRadius:14 }}>
                        {/* Room header */}
                        <div style={{ background:"rgba(255,255,255,0.08)", padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", borderRadius:"14px 14px 0 0", borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
                          <span style={{ color:"#fff", fontWeight:700, fontSize:13 }}>🏠 {room}</span>
                          <span style={{ color:installedCount===matEntries.length?C.teal:"#aaa", fontSize:10, letterSpacing:1 }}>
                            {installedCount}/{matEntries.length} items installed
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
                        {matEntries.map((w, i) => {
                          const invKey = `${room}__${w.id}`;
                          const matType = w.matType||"plywood";
                          const sel = { name: w.brand, qty: w.qty };
                          const catalog = getCatalog(matType);
                          const item = catalog.find(m=>m.name===w.brand);
                          const sqft = w.height&&w.width ? parseFloat(w.height)*parseFloat(w.width) : 0;
                          const displayQty = QTY_TYPES.has(w.type) ? (parseFloat(w.qty)||1)+" units" : sqft.toFixed(1)+" sqft";
                          const lineTotal = w.price ? parseFloat(w.price) : (item&&sqft ? sqft*item.price : 0);
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
                          return (
                            <div key={invKey} style={{ display:"grid", gridTemplateColumns:"2fr 2fr 1fr 1fr 1.2fr 2fr",
                              padding:"10px 14px",
                              background:i%2===0?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.02)",
                              borderTop:"1px solid rgba(255,255,255,0.08)",
                              alignItems:"center", gap:8 }}>
                              <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", fontWeight:600, textTransform:"uppercase", letterSpacing:1 }}>{w.product}</div>
                              <div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.92)" }}>{w.brand||"—"} <span style={{fontSize:10,color:"rgba(255,255,255,0.35)"}}>{w.type}</span></div>
                              <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>{displayQty}</div>
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
                    const allKeys = Object.entries(form.roomWork||{}).flatMap(([room,works])=>
                      (works||[]).filter(w=>w.brand&&w.product).map(w=>`${room}__${w.id}`)
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

          {/* ── PROJECT PLAN TAB ── */}
          {activeTab==="plan" && (
            <div>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:"rgba(255,255,255,0.55)",textTransform:"uppercase",borderBottom:"1px solid rgba(255,255,255,0.1)",paddingBottom:8,marginBottom:16}}>
                📅 Project Plan
              </div>

              {/* Start date + duration info */}
              {form.startDate ? (
                <div style={{background:"rgba(10,132,255,0.08)",border:"1px solid rgba(10,132,255,0.2)",borderRadius:10,padding:"12px 16px",marginBottom:16,display:"flex",gap:20,flexWrap:"wrap",alignItems:"center"}}>
                  <div><span style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>Start Date</span><div style={{fontSize:14,fontWeight:700,color:"#0A84FF"}}>{form.startDate}</div></div>
                  <div><span style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>Duration</span><div style={{fontSize:14,fontWeight:700,color:"#0A84FF"}}>{form.timeline||"60 Days"}</div></div>
                  <div><span style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>Property</span><div style={{fontSize:14,fontWeight:700,color:"#0A84FF"}}>{form.propertyType||"3 BHK"}</div></div>
                  <div style={{marginLeft:"auto",fontSize:11,color:"rgba(255,255,255,0.35)"}}>Tap a phase to change its status</div>
                </div>
              ) : (
                <div style={{background:"rgba(255,159,10,0.08)",border:"1px solid rgba(255,159,10,0.2)",borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:12,color:"#FF9F0A"}}>
                  ⚠️ Set a Start Date in the Client tab to activate the project timeline
                </div>
              )}

              {/* Gantt-style phase list */}
              {(()=>{
                const startDate = form.startDate ? new Date(form.startDate) : null;
                const totalDays = parseInt(form.timeline)||60;
                const plan = form.projectPlan || {};

                // Compute actual day numbers from % for this project duration
                const getActualDay = (pct) => Math.max(1, Math.round(pct/100 * totalDays) + 1);
                const getActualDur = (pct) => Math.max(1, Math.round(pct/100 * totalDays));

                const getPhaseDate = (dayOffset) => {
                  if (!startDate) return null;
                  const d = new Date(startDate);
                  d.setDate(d.getDate() + dayOffset - 1);
                  return d.toLocaleDateString("en-IN",{day:"numeric",month:"short"});
                };

                const STATUSES = ["Not Started","In Progress","Completed","On Hold"];
                const STATUS_COLORS = {
                  "Not Started": { bg:"rgba(255,255,255,0.07)", c:"rgba(255,255,255,0.4)", dot:"#6b7280" },
                  "In Progress": { bg:"rgba(10,132,255,0.15)",  c:"#0A84FF",               dot:"#0A84FF" },
                  "Completed":   { bg:"rgba(48,209,88,0.15)",   c:"#30D158",               dot:"#30D158" },
                  "On Hold":     { bg:"rgba(255,69,58,0.15)",   c:"#FF453A",               dot:"#FF453A" },
                };

                const cycleStatus = (phaseId) => {
                  const current = plan[phaseId]?.status || "Not Started";
                  const idx = STATUSES.indexOf(current);
                  const next = STATUSES[(idx+1) % STATUSES.length];
                  setForm(f=>({...f, projectPlan:{...(f.projectPlan||{}),[phaseId]:{...(f.projectPlan?.[phaseId]||{}),status:next}}}));
                };

                const completedCount = PROJECT_PHASES.filter(p=>(plan[p.id]?.status||"Not Started")==="Completed").length;
                const progressPct = Math.round(completedCount/PROJECT_PHASES.length*100);

                return (
                  <div>
                    {/* Overall progress */}
                    <div style={{marginBottom:16}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                        <span style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.6)"}}>Overall Progress</span>
                        <span style={{fontSize:12,fontWeight:700,color:"#30D158"}}>{completedCount}/{PROJECT_PHASES.length} phases · {progressPct}%</span>
                      </div>
                      <div style={{height:6,background:"rgba(255,255,255,0.08)",borderRadius:3,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${progressPct}%`,background:"linear-gradient(90deg,#0A84FF,#30D158)",borderRadius:3,transition:"width 0.4s"}}/>
                      </div>
                    </div>

                    {/* Phase rows */}
                    {PROJECT_PHASES.map((phase,pi) => {
                      const phaseData = plan[phase.id] || {};
                      const status    = phaseData.status || "Not Started";
                      const sc        = STATUS_COLORS[status];
                      const startDay  = phaseData.startDay || getActualDay(phase.startPct);
                      const dur       = phaseData.duration || getActualDur(phase.durPct);
                      const endDay    = Math.min(startDay + dur - 1, totalDays);
                      const barLeft   = ((startDay-1)/totalDays)*100;
                      const barWidth  = Math.min((dur/totalDays)*100, 100-barLeft);

                      const paymentForPhase = buildPaymentSchedule(totalDays, form.quotation).find(p=>p.phaseRef===phase.id);
                      return (
                        <div key={phase.id} style={{marginBottom:10,background:"rgba(255,255,255,0.04)",borderRadius:12,padding:"14px 16px",border:status==="In Progress"?`1px solid ${phase.color}44`:"1px solid rgba(255,255,255,0.08)"}}>
                          {/* Phase header */}
                          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                            <span style={{fontSize:20}}>{phase.icon}</span>
                            <div style={{flex:1}}>
                              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                                <span style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.92)"}}>{phase.name}</span>
                                <button onClick={()=>cycleStatus(phase.id)}
                                  style={{padding:"2px 10px",borderRadius:100,border:"none",cursor:"pointer",
                                    fontFamily:"inherit",fontSize:10,fontWeight:700,
                                    background:sc.bg,color:sc.c}}>
                                  {status}
                                </button>
                                {phase.customer && <span style={{fontSize:9,fontWeight:700,color:"#FF9F0A",background:"rgba(255,159,10,0.15)",padding:"2px 7px",borderRadius:100}}>👤 Client Involved</span>}
                                {paymentForPhase && <span style={{fontSize:9,fontWeight:700,color:"#30D158",background:"rgba(48,209,88,0.15)",padding:"2px 7px",borderRadius:100}}>💰 {paymentForPhase.pct}% due before</span>}
                              </div>
                              <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",marginTop:2}}>{phase.desc}</div>
                              {phase.subActivities&&phase.subActivities.length>0&&(
                                <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:5}}>
                                  {phase.subActivities.map((s,si)=>(
                                    <span key={si} style={{fontSize:9,color:"rgba(255,255,255,0.45)",background:"rgba(255,255,255,0.06)",padding:"2px 7px",borderRadius:6}}>• {s}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                            {startDate && (
                              <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",textAlign:"right",flexShrink:0}}>
                                <div style={{fontWeight:600}}>Day {startDay}–{endDay}</div>
                                <div style={{color:"rgba(255,255,255,0.25)",fontSize:10}}>{getPhaseDate(startDay)} → {getPhaseDate(endDay)}</div>
                              </div>
                            )}
                          </div>

                          {/* Gantt bar */}
                          <div style={{position:"relative",height:6,background:"rgba(255,255,255,0.06)",borderRadius:3,overflow:"hidden",marginBottom:6}}>
                            <div style={{
                              position:"absolute",left:`${barLeft}%`,width:`${Math.min(barWidth, 100-barLeft)}%`,
                              height:"100%",borderRadius:3,
                              background:status==="Completed"?"#30D158":status==="In Progress"?phase.color:"rgba(255,255,255,0.12)",
                              transition:"all 0.3s"
                            }}/>
                          </div>

                          {/* Notes field */}
                          <input className="glass-input"
                            style={{fontSize:11,padding:"5px 10px",width:"100%",boxSizing:"border-box"}}
                            placeholder={`Notes for ${phase.name}…`}
                            value={phaseData.notes||""}
                            onChange={e=>setForm(f=>({...f,projectPlan:{...(f.projectPlan||{}),[phase.id]:{...(f.projectPlan?.[phase.id]||{}),notes:e.target.value}}}))}/>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
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
