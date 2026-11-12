/* ---------- app shell / routing ---------- */
var route = "overview";
var filters = { members:"", events:"" };
var landingTab = "signin"; /* signin | register */
var gateTab = "";          /* "" | approve | revise */

var NAV = [
  {id:"settings", label:"Settings", icon:"⚙"},
  {id:"overview", label:"Overview", icon:"◆"},
  {id:"events", label:"Events", icon:"▤"},
  {id:"calendar", label:"Calendar", icon:"▦"},
  {id:"reports", label:"Reports", icon:"◔"},
  {id:"profile", label:"Club Profile", icon:"●"}
];

function renderApp(){
  var root = document.getElementById("app");

  if (!state.sessionEmail){
    activeClub = null;
    root.innerHTML = renderLanding();
    wireLanding();
    return;
  }
  var club = cur();
  if (!club){ state.sessionEmail = null; save(); renderApp(); return; }

  if (club.account.status !== "approved"){
    activeClub = null;
    root.innerHTML = renderPendingShell(club);
    wirePendingShell(club);
    return;
  }

  activeClub = club;
  var html = '<div class="sidebar">' + renderBrand() + renderNav() + renderNavStatus() + '</div>';
  html += '<main id="main">' + (isSuspended(club)
    ? '<div class="card" style="border-color:var(--bad);background:var(--bad-bg);color:var(--bad);margin-bottom:16px;"><b>This club is suspended by the registrar.</b> You can view your records, but new events can\'t be submitted until the registrar reactivates the club.</div>'
    : '') + renderSection(route) + '</main>';
  root.innerHTML = html;
  wireGlobal();
  wireSection(route);
}
function brandTitle(){ return (activeClub && activeClub.branding && activeClub.branding.title) || "Club Console"; }
function brandSub(){ return (activeClub && activeClub.branding && activeClub.branding.sub) || (activeClub ? activeClub.account.application.clubName : "Org self-service portal"); }
function renderBrand(){
  return '<div class="brand"><div class="brand-mark">'+logoImg()+'</div><div class="brand-text"><div class="name">'+esc(brandTitle())+'</div><div class="sub">'+esc(brandSub())+'</div></div></div>';
}
function renderNav(){
  return NAV.map(function(n){
    return '<button class="nav-item'+(route===n.id?" active":"")+'" data-nav="'+n.id+'"><span>'+n.icon+'</span><span>'+n.label+'</span></button>';
  }).join("");
}
function renderNavStatus(){
  return '<div class="nav-status"><span class="status-pill '+(isSuspended(activeClub)?'rejected':'approved')+'">'+(isSuspended(activeClub)?'Suspended':'Approved')+'</span>' +
    '<div style="margin-top:8px;">Club ID: <span class="mono">'+esc(activeClub.account.officialClubId)+'</span></div>' +
    '<button class="btn ghost small" id="logoutBtn" style="width:100%;margin-top:10px;">Log out</button></div>';
}
function wireGlobal(){
  document.querySelectorAll("[data-nav]").forEach(function(btn){
    btn.addEventListener("click", function(){ route = btn.getAttribute("data-nav"); renderApp(); });
  });
  var logout = document.getElementById("logoutBtn");
  if (logout) logout.addEventListener("click", function(){ state.sessionEmail = null; save(); route="overview"; renderApp(); });
}
