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
/* registrar standing: the registrar can suspend a club; that value lives in the shared store */
function isSuspended(club){
  var id = club && club.account && club.account.officialClubId;
  return !!id && (Store.read().standing || {})[id] === "suspended";
}
function userIsBusy(){
  var t = document.activeElement && document.activeElement.tagName;
  return !!document.getElementById("modalBackdrop") || t==="INPUT" || t==="TEXTAREA" || t==="SELECT";
}

/* ---------- state (multi-tenant: one record per club) ---------- */
var state = null;

function blankAccount(){
  return { status:"unregistered", application:null, officialClubId:null, approvedAt:null, rejectionReason:null, lastAppCode:null, lastApprovalCode:null };
}
function defaultState(){ return { clubs: [], sessionEmail: null }; }

async function load(){
  var db = Store.read();
  var sess = null;
  try{ sess = localStorage.getItem(SESSION_KEY) || null; }catch(e){}
  state = { clubs: db.clubs, sessionEmail: sess };
}
/* save(): persists the session, and upserts ONLY the signed-in club's record so other clubs'
   data (and registrar decisions made meanwhile) are never overwritten by a stale copy. */
function save(full){
  try{ localStorage.setItem(SESSION_KEY, state.sessionEmail || ""); }catch(e){}
  if (full){ Store.write({clubs: state.clubs, standing: {}}); return; }
  var mine = cur(); if (!mine) return;
  Store.update(function(db){
    var key = mine.account.application.adviserEmail;
    var f = db.clubs.find(function(c){ return c.account.application.adviserEmail===key; });
    if (!f){ db.clubs.push(mine); return; }
    if (f.account.application.appId===mine.account.application.appId && f.account.status!=="pending" && mine.account.status==="pending"){
      mine.account = Object.assign({}, mine.account, {status:f.account.status, officialClubId:f.account.officialClubId, approvedAt:f.account.approvedAt, rejectionReason:f.account.rejectionReason});
    }
    (mine.events||[]).forEach(function(ev){
      var fe = (f.events||[]).find(function(x){ return x.id===ev.id; });
      var lt = ev.review ? (ev.review.decidedAt || ev.review.submittedAt || "") : "";
      if (fe && fe.review && fe.review.decidedAt && fe.review.decidedAt > lt) ev.review = fe.review;
    });
    db.clubs[db.clubs.indexOf(f)] = mine;
  });
}

/* current club record (only valid once signed in) */
var activeClub = null;
function cur(){ return state.clubs.find(function(c){ return c.account.application.adviserEmail === state.sessionEmail; }) || null; }

/* ---------- derived helpers (operate on activeClub) ---------- */
function eventStatusAuto(ev){
  if (ev.status === "cancelled") return "cancelled";
  var t = todayStr();
  if (ev.date > t) return "upcoming";
  if (ev.date === t) return "ongoing";
  return "completed";
}
function reviewOf(ev){ return ev.review || {status:"draft"}; }
function compressImage(file){
  return new Promise(function(resolve, reject){
    var fr = new FileReader();
    fr.onerror = function(){ reject(new Error("read")); };
    fr.onload = function(){
      var img = new Image();
      img.onerror = function(){ reject(new Error("img")); };
      img.onload = function(){
        var max = 560, sc = Math.min(1, max/Math.max(img.width, img.height));
        var c = document.createElement("canvas");
        c.width = Math.round(img.width*sc); c.height = Math.round(img.height*sc);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.55));
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}
/* ---------- collaborations (events shared between multiple clubs) ---------- */
function otherApprovedClubs(){
  return state.clubs.filter(function(c){ return c!==activeClub && c.account.status==="approved" && c.account.officialClubId; });
}
function collabNote(e){
  var names = (e.collaborators||[]).map(function(x){ return x.clubName; }).concat(e.externalPartners||[]);
  return names.length ? ' <span style="font-size:11px;color:var(--ink-soft);">· Collab with '+esc(names.join(", "))+'</span>' : "";
}
function incomingCollabs(){
  var me = activeClub.account.officialClubId, out = [];
  state.clubs.forEach(function(c){
    if (c===activeClub || c.account.status!=="approved") return;
    (c.events||[]).forEach(function(ev){
      if ((ev.collaborators||[]).some(function(x){ return x.clubId===me; })) out.push({event:ev, host:c.account.application.clubName});
    });
  });
  return out;
}
function memberById(id){ return activeClub.members.find(function(m){ return m.id===id; }); }
function eventById(id){ return activeClub.events.find(function(e){ return e.id===id; }); }
