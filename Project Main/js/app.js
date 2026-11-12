"use strict";
/* ---------- routing ---------- */
var route = "dashboard";
var filters = { clubs:"", apps:"" };
var NAV = [
  {id:"dashboard", label:"Dashboard", icon:"◆"},
  {id:"applications", label:"Applications", icon:"✉"},
  {id:"clubs", label:"Clubs Registry", icon:"☰"},
  {id:"events", label:"Event Applications", icon:"▤"},
  {id:"calendar", label:"Calendar", icon:"▦"},
  {id:"reports", label:"Reports", icon:"◔"},
  {id:"settings", label:"Settings", icon:"●"}
];

function pendingEventCount(){ return state.eventApps.filter(function(a){return a.status==="pending";}).length; }
function pendingCount(){ return state.applications.filter(function(a){return a.status==="pending";}).length; }

function renderApp(){
  var root = document.getElementById("app");
  if (!state.auth.passwordHash || !state.auth.loggedIn){
    root.innerHTML = renderAuthGate();
    wireAuthGate();
    return;
  }
  var html = '<div class="sidebar">' + renderBrand() + renderNav() + renderNavFoot() + '</div>';
  html += '<main id="main">' + renderSection(route) + '</main>';
  root.innerHTML = html;
  wireGlobal();
  wireSection(route);
}
function renderBrand(){
  return '<div class="brand"><div class="brand-mark">'+logoImg()+'</div><div class="brand-text"><div class="name">Registrar Console</div><div class="sub">Student org oversight</div></div></div>';
}
function renderNav(){
  return NAV.map(function(n){
    var cnt = n.id==="applications" ? pendingCount() : n.id==="events" ? pendingEventCount() : 0;
    var badge = cnt ? '<span class="nav-badge">'+cnt+'</span>' : "";
    return '<button class="nav-item'+(route===n.id?" active":"")+'" data-nav="'+n.id+'"><span>'+n.icon+'</span><span>'+n.label+'</span>'+badge+'</button>';
  }).join("");
}
function renderNavFoot(){
  return '<div class="nav-foot"><button class="btn ghost small" id="logoutBtn" style="width:100%;">Log out</button></div>';
}
function wireGlobal(){
  document.querySelectorAll("[data-nav]").forEach(function(btn){
    btn.addEventListener("click", function(){ route = btn.getAttribute("data-nav"); renderApp(); });
  });
  var logout = document.getElementById("logoutBtn");
  if (logout) logout.addEventListener("click", function(){ state.auth.loggedIn=false; save(); renderApp(); });
}

/* ---------- AUTH GATE ---------- */
function renderAuthGate(){
  var firstRun = !state.auth.passwordHash;
  return '<div class="landing"><div class="landing-hero"></div><div class="landing-overlay"></div>' +
    '<div class="landing-content">' +
    '<div class="landing-brandline"><div class="mark">'+logoImg()+'</div><div class="name">Registrar Console</div><div class="sub">JDJS University · Office of Student Affairs</div></div>' +
    '<div class="card">' +
      (firstRun ?
        '<h2 style="font-size:17px;margin:0 0 4px;">Set an admin password</h2><p style="font-size:12.5px;color:var(--ink-soft);margin:0 0 16px;">Choose a password to protect the Registrar Console. It is stored only on this device.</p>' +
        '<div class="field"><label>New password</label><input id="authPass" type="password"></div>' +
        '<div class="field"><label>Confirm password</label><input id="authPass2" type="password"></div>' +
        '<button class="btn primary" id="setPassBtn" style="width:100%;">Set password &amp; continue</button>'
        :
        '<h2 style="font-size:17px;margin:0 0 16px;">Sign in</h2>' +
        '<div class="field"><label>Password</label><input id="authPass" type="password"></div>' +
        '<button class="btn primary" id="loginBtn" style="width:100%;">Sign in</button>'
      ) +
    '</div>' +
    '</div></div>';
}
function wireAuthGate(){
  var setBtn = document.getElementById("setPassBtn");
  if (setBtn) setBtn.addEventListener("click", async function(){
    var p1 = val("authPass"), p2 = val("authPass2");
    if (p1.length < 6){ toast("Use at least 6 characters.", true); return; }
    if (p1 !== p2){ toast("Passwords don't match.", true); return; }
    state.auth.passwordHash = await sha256Hex(p1);
    state.auth.loggedIn = true;
    save(); renderApp();
  });
  var loginBtn = document.getElementById("loginBtn");
  if (loginBtn) loginBtn.addEventListener("click", doLogin);
  var passField = document.getElementById("authPass");
  if (passField) passField.addEventListener("keydown", function(e){ if (e.key==="Enter") (loginBtn||setBtn).click(); });
}
async function doLogin(){
  var p = val("authPass");
  var h = await sha256Hex(p);
  if (h === state.auth.passwordHash){ state.auth.loggedIn = true; save(); renderApp(); }
  else toast("Incorrect password.", true);
}

/* ---------- SECTIONS ---------- */
function renderSection(r){
  if (r==="dashboard") return renderDashboard();
  if (r==="applications") return renderApplications();
  if (r==="clubs") return renderClubsRegistry();
  if (r==="events") return renderEventApplications();
  if (r==="calendar") return renderCalendar();
  if (r==="reports") return renderReportsPage();
  if (r==="settings") return renderSettings();
  return "";
}
function wireSection(r){
  if (r==="applications") wireApplications();
  if (r==="clubs") wireClubsRegistry();
  if (r==="events") wireEventApplications();
  if (r==="calendar") wireCalendar();
  if (r==="settings") wireSettings();
}
