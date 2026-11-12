var LOGO_SRC = "assets/logo.png";
function logoImg(){ return '<img src="'+LOGO_SRC+'" alt="Logo">'; }

/* ---------- constants ---------- */
var SESSION_KEY = "campus_club_session_v5";
var CATEGORIES = ["Academic","Arts & Culture","Community Service","Environmental","Religious","Sports & Recreation","Special Interest","Student Governance"];
var YEAR_LEVELS = ["1st Year","2nd Year","3rd Year","4th Year","5th Year","Graduate"];
var ROLES = ["President","Vice President","Secretary","Treasurer","Public Information Officer","Committee Head","Member"];
var MAX_EVENT_PHOTOS = 6;
var REVIEW_LABELS = {draft:"Not submitted", pending:"Pending review", approved:"Approved", declined:"Declined", missing:"Missing info"};

/* ---------- utils ---------- */
function esc(s){
  return String(s==null?"":s).replace(/[&<>"']/g, function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
  });
}
function uid(prefix){
  if (window.crypto && crypto.randomUUID) return prefix + "-" + crypto.randomUUID().split("-")[0].toUpperCase();
  return prefix + "-" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,6).toUpperCase();
}
function todayStr(){
  var d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
}
function fmtDate(s){
  if(!s) return "—";
  var d = new Date(s + "T00:00:00");
  if (isNaN(d)) return s;
  return d.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});
}
function fmtDateTime(iso){
  if(!iso) return "—";
  var d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}) + ", " + d.toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"});
}
function toast(msg, isErr){
  var region = document.getElementById("toastRegion");
  var el = document.createElement("div");
  el.className = "toast" + (isErr ? " err" : "");
  el.textContent = msg;
  region.appendChild(el);
  setTimeout(function(){ el.remove(); }, 3400);
}
async function sha256Hex(text){
  var enc = new TextEncoder().encode(text);
  var buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(function(b){ return b.toString(16).padStart(2,"0"); }).join("");
}
function val(id){ var el=document.getElementById(id); return el ? el.value.trim() : ""; }
function copyText(text){
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(function(){ toast("Copied to clipboard."); }).catch(function(){ toast("Couldn't copy — select and copy manually.", true); });
  } else { toast("Copy not supported here — select and copy manually.", true); }
}
function normalizeEmail(s){ return (s||"").trim().toLowerCase(); }
function isEmail(s){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((s||"").trim()); }
function fullName(first, middle, last, ext){
  var parts = [first, middle, last].map(function(s){ return (s||"").trim(); }).filter(Boolean);
  var out = parts.join(" ");
  var e = (ext||"").trim();
  if (e) out += (out ? " " : "") + e;
  return out;
}
/* shared markup for a first/middle/last/ext + email name block, used for adviser and members */
function personFieldsHtml(prefix, label, required, prefill){
  prefill = prefill || {};
  return '<div class="field-row-3">' +
      field((label?label+" first name":"First name"), prefix+"First","text",required,prefill.firstName) +
      field((label?label+" middle name":"Middle name"), prefix+"Middle","text",false,prefill.middleName) +
      field((label?label+" last name":"Last name"), prefix+"Last","text",required,prefill.lastName) +
    '</div>' +
    '<div class="field-row">' +
      field((label?label+" ext. (Jr., III)":"Ext. (Jr., III)"), prefix+"Ext","text",false,prefill.extName) +
      field((label?label+" email":"Email"), prefix+"Email","email",required,prefill.email) +
    '</div>';
}
function readPersonFields(prefix){
  return { firstName: val(prefix+"First"), middleName: val(prefix+"Middle"), lastName: val(prefix+"Last"), extName: val(prefix+"Ext"), email: normalizeEmail(val(prefix+"Email")) };
}
