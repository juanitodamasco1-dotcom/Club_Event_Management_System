"use strict";
/* ---------- DATA LAYER ----------
   Every read/write of shared data (clubs, events) goes through Store.
   Today it is backed by localStorage so the Club and Registrar consoles share data
   when hosted on the same origin. To move to Supabase later, re-implement only
   read / update / subscribe here (see supabase_schema.sql for the table mapping):
     read()      -> select from clubs, club_members, events
     update(fn)  -> row-level insert/update for the changed rows
     subscribe() -> supabase.channel(...).on('postgres_changes', ...)
   Nothing else in this file needs to change. */
var Store = (function(){
  var KEY = "campus_shared_v1";
  function blank(){ return {clubs:[], standing:{}}; }
  function read(){
    try{ var r = JSON.parse(localStorage.getItem(KEY)); if (r && r.clubs){ r.standing = r.standing||{}; return r; } }catch(e){}
    return blank();
  }
  function write(db){
    try{ localStorage.setItem(KEY, JSON.stringify(db)); }
    catch(e){ toast("Couldn't save — your browser storage may be full or blocked.", true); }
  }
  function update(fn){ var db = read(); fn(db); write(db); return db; }
  function subscribe(cb){
    window.addEventListener("storage", function(e){ if (e.key===KEY) cb(); });
    window.addEventListener("focus", cb);
  }
  return {read:read, write:write, update:update, subscribe:subscribe};
})();
function userIsBusy(){
  var t = document.activeElement && document.activeElement.tagName;
  return !!document.getElementById("modalBackdrop") || t==="INPUT" || t==="TEXTAREA" || t==="SELECT";
}

/* ---------- state ---------- */
var state = null;
function defaultState(){
  return { auth:{passwordHash:null, loggedIn:false}, applications:[], clubs:[], events:[], eventApps:[] };
}
function load(){
  try{ var raw = localStorage.getItem(STORAGE_KEY); if (raw) state = JSON.parse(raw); }catch(e){}
  if (!state){ state = defaultState(); save(); }
  if (!state.eventApps) state.eventApps = [];
  syncShared();
}
/* Only the registrar's own records are persisted here; club-submitted records are always
   rebuilt from the shared store (so photos are not duplicated into this console's storage). */
function save(){
  try{
    var copy = Object.assign({}, state);
    ["applications","clubs","events"].forEach(function(k){ copy[k] = state[k].filter(function(x){ return !x.shared; }); });
    copy.eventApps = [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(copy));
  }catch(e){ toast("Couldn't save — your browser storage may be full or blocked.", true); }
}
function isImg(s){ return typeof s==="string" && /^data:image\/(png|jpe?g|gif|webp);base64,/.test(s); }
/* Rebuild everything that originates from a club (applications, registry, event reviews,
   approved events) from the shared store. Club activity reaches the registrar this way, live. */
function syncShared(){
  var db = Store.read();
  ["applications","clubs","events"].forEach(function(k){ state[k] = state[k].filter(function(x){ return !x.shared; }); });
  state.eventApps = [];
  db.clubs.forEach(function(rec){
    var acc = rec.account || {}, ap = acc.application; if (!ap) return;
    var pres = (rec.members||[]).find(function(m){ return m.role==="President"; }) || {};
    var P = {presidentFirstName:pres.firstName||"", presidentMiddleName:pres.middleName||"", presidentLastName:pres.lastName||"", presidentExtName:pres.extName||"", presidentEmail:pres.email||""};
    var A = {adviserFirstName:ap.adviserFirstName, adviserMiddleName:ap.adviserMiddleName, adviserLastName:ap.adviserLastName, adviserExtName:ap.adviserExtName, adviserEmail:ap.adviserEmail};
    state.applications.push(Object.assign({shared:true, id: ap.appId || ("APP-"+(acc.officialClubId||ap.adviserEmail)), clubEmail:ap.adviserEmail,
      clubName:ap.clubName, category:ap.category, description:ap.description||"", submittedAt: ap.submittedAt || acc.approvedAt || "1970-01-01T00:00:00.000Z",
      status: acc.status==="approved" ? "approved" : acc.status==="rejected" ? "rejected" : "pending",
      decidedAt: acc.approvedAt||null, reason: acc.rejectionReason||null, assignedClubId: acc.officialClubId||null}, A, P));
    if (acc.status !== "approved") return;
    var cid = acc.officialClubId;
    state.clubs.push(Object.assign({shared:true, id:cid, name:ap.clubName, category:ap.category, status:(db.standing||{})[cid]||"active",
      approvedAt:acc.approvedAt, members:(rec.members||[]).length}, A, P));
    (rec.events||[]).forEach(function(ev){
      var rv = ev.review || {status:"draft"}; if (rv.status==="draft") return;
      var key = cid+"|"+ev.id;
      state.eventApps.push({shared:true, key:key, clubId:cid, clubName:ap.clubName, eventId:ev.id, name:ev.name, category:ev.category, description:ev.description||"",
        date:ev.date, startTime:ev.startTime||"", endTime:ev.endTime||"", venue:ev.venue||"", target:ev.targetParticipants||null,
        photos:(ev.photos||[]).filter(isImg), submittedAt:rv.submittedAt||"", status:rv.status, note:rv.note||"", decidedAt:rv.decidedAt||null, resubmitted:!!rv.resubmitted});
      if (rv.status==="approved") state.events.push({shared:true, id:ev.id, appKey:key, clubId:cid, clubName:ap.clubName, name:ev.name, category:ev.category, date:ev.date, target:ev.targetParticipants||null});
    });
  });
}
