"use strict";
function pageHead(title, sub, actionsHtml){
  return '<div class="page-head"><div><h1>'+esc(title)+'</h1><p>'+esc(sub)+'</p></div><div class="head-actions">'+(actionsHtml||"")+'</div></div>';
}
function statCard(num,label){ return '<div class="card stat-card"><div class="num">'+num+'</div><div class="label">'+esc(label)+'</div></div>'; }
function emptyState(big, small){ return '<div class="empty"><div class="big">'+esc(big)+'</div><div>'+esc(small)+'</div></div>'; }

/* ---- Dashboard ---- */
function renderDashboard(){
  var active = state.clubs.filter(function(c){return c.status==="active";}).length;
  var totalEvents = state.events.length;
  var totalTarget = state.events.reduce(function(a,e){return a+(e.target||0);},0);
  var recentApps = state.applications.slice().sort(function(a,b){return b.submittedAt.localeCompare(a.submittedAt);}).slice(0,5);
  return pageHead("Dashboard", "Org-wide standing across all registered clubs — no member-level detail here, only counts.") +
    '<div class="grid stats" style="margin-bottom:20px;">' +
      statCard(active, "Active clubs") + statCard(pendingCount(), "Pending applications") +
      statCard(totalEvents, "Logged events") + statCard(totalTarget, "Target participants") +
    '</div>' +
    '<div class="card"><h3 class="card-title">Recent applications</h3><p class="card-sub">Latest submissions, any status.</p>' +
      (recentApps.length ? '<div class="table-wrap"><table><thead><tr><th>Club</th><th>Category</th><th>Submitted</th><th>Status</th></tr></thead><tbody>' +
        recentApps.map(function(a){ return '<tr><td>'+esc(a.clubName)+'</td><td>'+esc(a.category)+'</td><td>'+fmtDateTime(a.submittedAt)+'</td><td><span class="badge '+a.status+'">'+a.status+'</span></td></tr>'; }).join("") +
        '</tbody></table></div>' : emptyState("No applications yet","")) +
    '</div>';
}

/* ---- Applications ---- */
var importCodeText = "";
function renderApplications(){
  var rows = state.applications.filter(function(a){ return !filters.apps || a.clubName.toLowerCase().indexOf(filters.apps.toLowerCase())>-1; })
    .slice().sort(function(a,b){ if(a.status==="pending"&&b.status!=="pending")return -1; if(b.status==="pending"&&a.status!=="pending")return 1; return b.submittedAt.localeCompare(a.submittedAt); });
  return pageHead("Applications", "Clubs that register in the Club Console appear here automatically. Open one to approve or reject it.") +
    '<div class="search-bar"><input id="appSearch" placeholder="Search applications…" value="'+esc(filters.apps)+'"></div>' +
    '<div class="card"><div class="table-wrap">' + renderAppsTable(rows) + '</div></div>';
}
function renderAppsTable(rows){
  if (!rows.length) return emptyState("No applications", "Club applications will show up here.");
  return '<table><thead><tr><th>Club</th><th>Category</th><th>President</th><th>Submitted</th><th>Status</th><th></th></tr></thead><tbody>' +
    rows.map(function(a){
      return '<tr><td>'+esc(a.clubName)+'</td><td>'+esc(a.category)+'</td><td>'+esc(fullName(a.presidentFirstName,a.presidentMiddleName,a.presidentLastName,a.presidentExtName))+'</td><td>'+fmtDateTime(a.submittedAt)+'</td>' +
        '<td><span class="badge '+a.status+'">'+a.status+'</span></td>' +
        '<td><div class="row-actions"><button class="btn small" data-view-app="'+a.id+'">View</button></div></td></tr>';
    }).join("") + '</tbody></table>';
}
function wireApplications(){
  document.getElementById("appSearch").addEventListener("input", function(e){
    filters.apps = e.target.value;
    var rows = state.applications.filter(function(a){ return !filters.apps || a.clubName.toLowerCase().indexOf(filters.apps.toLowerCase())>-1; });
    document.querySelector("#main .card:last-child .table-wrap").innerHTML = renderAppsTable(rows);
    wireAppRowActions();
  });
  wireAppRowActions();
}
function wireAppRowActions(){
  document.querySelectorAll("[data-view-app]").forEach(function(b){
    b.addEventListener("click", function(){ openAppModal(b.getAttribute("data-view-app")); });
  });
}
function openAppModal(id){
  var a = state.applications.find(function(x){ return x.id===id; });
  var body = '<h2>'+esc(a.clubName)+'</h2>' +
    '<div class="app-detail">' +
      '<div><span>Category</span><span>'+esc(a.category)+'</span></div>' +
      '<div><span>President</span><span>'+esc(fullName(a.presidentFirstName,a.presidentMiddleName,a.presidentLastName,a.presidentExtName))+' · '+esc(a.presidentEmail)+'</span></div>' +
      '<div><span>Adviser</span><span>'+esc(fullName(a.adviserFirstName,a.adviserMiddleName,a.adviserLastName,a.adviserExtName))+' · '+esc(a.adviserEmail)+'</span></div>' +
      '<div><span>Submitted</span><span>'+fmtDateTime(a.submittedAt)+'</span></div>' +
      '<div><span>Status</span><span><span class="badge '+a.status+'">'+a.status+'</span></span></div>' +
    '</div>' +
    (a.description ? '<p style="font-size:13px;color:var(--ink-soft);">'+esc(a.description)+'</p>' : "") +
    (a.status==="pending" ?
      '<div class="modal-actions"><button class="btn ghost" data-close-modal>Close</button><button class="btn danger" id="rejectApp">Reject</button><button class="btn primary" id="approveApp">Approve</button></div>'
      : a.status==="approved" ?
      '<p style="font-size:12.5px;color:var(--ink-soft);">Assigned club ID: <span class="mono">'+esc(a.assignedClubId)+'</span></p><div class="modal-actions"><button class="btn ghost" data-close-modal>Close</button></div>'
      :
      '<p style="font-size:12.5px;color:var(--ink-soft);">Reason: '+esc(a.reason||"—")+'</p><div class="modal-actions"><button class="btn ghost" data-close-modal>Close</button></div>'
    );
  openModal(body);
  function findRec(db){ return db.clubs.find(function(c){ return c.account.application.adviserEmail===a.clubEmail; }); }
  var approveBtn = document.getElementById("approveApp");
  if (approveBtn) approveBtn.addEventListener("click", function(){
    var clubId = uid("CLB"), when = new Date().toISOString();
    if (a.shared){
      Store.update(function(db){ var rec = findRec(db); if (rec){ rec.account.status="approved"; rec.account.officialClubId=clubId; rec.account.approvedAt=when; rec.account.rejectionReason=null; } });
    } else {
      a.status = "approved"; a.decidedAt = when; a.assignedClubId = clubId;
      state.clubs.push({id:clubId, name:a.clubName, category:a.category,
        adviserFirstName:a.adviserFirstName, adviserMiddleName:a.adviserMiddleName, adviserLastName:a.adviserLastName, adviserExtName:a.adviserExtName, adviserEmail:a.adviserEmail,
        presidentFirstName:a.presidentFirstName, presidentMiddleName:a.presidentMiddleName, presidentLastName:a.presidentLastName, presidentExtName:a.presidentExtName, presidentEmail:a.presidentEmail,
        status:"active", approvedAt:when, members:null});
    }
    save(); syncShared(); closeModal(); toast("Club approved — their dashboard unlocks automatically."); renderApp();
  });
  var rejectBtn = document.getElementById("rejectApp");
  if (rejectBtn) rejectBtn.addEventListener("click", function(){
    var reason = prompt("Reason for rejecting this application:") || "No reason given.", when = new Date().toISOString();
    if (a.shared){
      Store.update(function(db){ var rec = findRec(db); if (rec){ rec.account.status="rejected"; rec.account.rejectionReason=reason; } });
    } else { a.status = "rejected"; a.decidedAt = when; a.reason = reason; }
    save(); syncShared(); closeModal(); toast("Application rejected — the club can see the reason."); renderApp();
  });
}

/* ---- Clubs Registry ---- */
function renderClubsRegistry(){
  var rows = state.clubs.filter(function(c){ return !filters.clubs || c.name.toLowerCase().indexOf(filters.clubs.toLowerCase())>-1; });
  return pageHead("Clubs Registry", "All officially approved clubs and their current standing.") +
    '<div class="search-bar"><input id="clubSearch" placeholder="Search clubs…" value="'+esc(filters.clubs)+'"></div>' +
    '<div class="card"><div class="table-wrap">' + renderClubsTable(rows) + '</div></div>';
}
function renderClubsTable(rows){
  if (!rows.length) return emptyState("No clubs yet", "Approve an application to add a club to the registry.");
  return '<table><thead><tr><th>Club</th><th>Category</th><th>Adviser</th><th>Approved</th><th>Members</th><th>Status</th><th></th></tr></thead><tbody>' +
    rows.map(function(c){
      return '<tr><td>'+esc(c.name)+'</td><td>'+esc(c.category)+'</td><td>'+esc(fullName(c.adviserFirstName,c.adviserMiddleName,c.adviserLastName,c.adviserExtName))+'</td><td>'+fmtDate((c.approvedAt||"").slice(0,10))+'</td><td>'+(c.members==null?"—":c.members)+'</td>' +
        '<td><span class="badge '+c.status+'">'+c.status+'</span></td>' +
        '<td><div class="row-actions"><button class="btn small" data-toggle-club="'+c.id+'">'+(c.status==="active"?"Suspend":"Reactivate")+'</button></div></td></tr>';
    }).join("") + '</tbody></table>';
}
function wireClubsRegistry(){
  document.getElementById("clubSearch").addEventListener("input", function(e){
    filters.clubs = e.target.value;
    var rows = state.clubs.filter(function(c){ return !filters.clubs || c.name.toLowerCase().indexOf(filters.clubs.toLowerCase())>-1; });
    document.querySelector("#main .card .table-wrap").innerHTML = renderClubsTable(rows);
    wireClubRowActions();
  });
  wireClubRowActions();
}
function wireClubRowActions(){
  document.querySelectorAll("[data-toggle-club]").forEach(function(b){
    b.addEventListener("click", function(){
      var c = state.clubs.find(function(x){ return x.id===b.getAttribute("data-toggle-club"); });
      c.status = c.status==="active" ? "suspended" : "active";
      if (c.shared) Store.update(function(db){ db.standing[c.id] = c.status; });
      save(); toast("Club "+(c.status==="active"?"reactivated":"suspended")+"."); renderApp();
    });
  });
}

/* ---- Event Applications ---- */
var evImportText = "";
var evFilter = "all";
function renderEventApplications(){
  var rows = evAppRows();
  var counts = {pending:0, approved:0, declined:0, missing:0};
  state.eventApps.forEach(function(a){ counts[a.status]++; });
  var tabs = ["all","pending","missing","declined","approved"].map(function(k){
    var n = k==="all" ? state.eventApps.length : counts[k];
    return '<button class="btn small'+(evFilter===k?" primary":"")+'" data-ev-filter="'+k+'">'+(k==="all"?"All":EVAPP_LABELS[k])+' ('+n+')</button>';
  }).join(" ");
  return pageHead("Event Applications", "Clubs submit each event with its details and photos for your approval. Approve it, decline it, or mark it as missing information and explain what is needed.") +
    '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">'+tabs+'</div>' +
    '<div class="card"><div class="table-wrap" id="evAppsWrap">' + renderEvAppsTable(rows) + '</div></div>';
}
function evAppRows(){
  var order = {pending:0, missing:1, declined:2, approved:3};
  return state.eventApps.filter(function(a){ return evFilter==="all" || a.status===evFilter; })
    .slice().sort(function(a,b){ return (order[a.status]-order[b.status]) || b.submittedAt.localeCompare(a.submittedAt); });
}
function renderEvAppsTable(rows){
  if (!rows.length) return emptyState("No event applications", "Events that clubs submit for approval will show up here.");
  return '<table><thead><tr><th>Event</th><th>Club</th><th>Date</th><th>Photos</th><th>Submitted</th><th>Status</th><th></th></tr></thead><tbody>' +
    rows.map(function(a){
      var note = (a.status==="declined"||a.status==="missing") && a.note ? '<div class="review-note"><b>'+(a.status==="declined"?"Reason":"Missing")+':</b> '+esc(a.note)+'</div>' : "";
      return '<tr><td>'+esc(a.name)+'</td><td>'+esc(a.clubName)+'</td><td>'+fmtDate(a.date)+'</td><td>'+(a.photos||[]).length+'</td><td>'+fmtDateTime(a.submittedAt)+'</td>' +
        '<td><span class="badge rv-'+a.status+'">'+EVAPP_LABELS[a.status]+'</span>'+note+'</td>' +
        '<td><div class="row-actions"><button class="btn small" data-view-evapp="'+esc(a.key)+'">'+(a.status==="pending"?"Review":"View")+'</button></div></td></tr>';
    }).join("") + '</tbody></table>';
}
function wireEventApplications(){
  document.querySelectorAll("[data-ev-filter]").forEach(function(b){
    b.addEventListener("click", function(){ evFilter = b.getAttribute("data-ev-filter"); renderApp(); });
  });
  wireEvRowActions();
}
function wireEvRowActions(){
  document.querySelectorAll("[data-view-evapp]").forEach(function(b){
    b.addEventListener("click", function(){ openEvAppModal(b.getAttribute("data-view-evapp")); });
  });
}
function openEvAppModal(key){
  var a = state.eventApps.find(function(x){ return x.key===key; });
  if (!a) return;
  var time = a.startTime ? (a.startTime + (a.endTime ? " – "+a.endTime : "")) : "—";
  var photos = (a.photos||[]);
  var decided = a.status !== "pending";
  var body = '<h2>'+esc(a.name)+'</h2>' +
    '<div class="app-detail">' +
      '<div><span>Club</span><span>'+esc(a.clubName)+'</span></div>' +
      '<div><span>Category</span><span>'+esc(a.category)+'</span></div>' +
      '<div><span>Date</span><span>'+fmtDate(a.date)+'</span></div>' +
      '<div><span>Time</span><span>'+esc(time)+'</span></div>' +
      '<div><span>Venue</span><span>'+esc(a.venue||"—")+'</span></div>' +
      '<div><span>Target participants</span><span>'+(a.target||"—")+'</span></div>' +
      '<div><span>Submitted</span><span>'+fmtDateTime(a.submittedAt)+(a.resubmitted?' (resubmitted)':'')+'</span></div>' +
      '<div><span>Status</span><span><span class="badge rv-'+a.status+'">'+EVAPP_LABELS[a.status]+'</span></span></div>' +
    '</div>' +
    (a.description ? '<p style="font-size:13px;color:var(--ink-soft);">'+esc(a.description)+'</p>' : "") +
    '<div style="font-size:12.5px;font-weight:600;margin-top:10px;">Photos ('+photos.length+')</div>' +
    (photos.length ? '<div class="photo-grid">'+photos.map(function(src,i){ return '<button type="button" class="photo-thumb" data-zoom="'+i+'" title="Click to enlarge"><img src="'+src+'" alt="Event photo '+(i+1)+'"></button>'; }).join("")+'</div>'
                   : '<p style="font-size:12.5px;color:var(--ink-soft);margin:4px 0 12px;">No photos were attached.</p>') +
    '<div style="font-size:12.5px;font-weight:600;">Decision</div>' +
    '<div class="decide-opts">' +
      ['approved','missing','declined'].map(function(k){ return '<label data-opt="'+k+'"><input type="radio" name="evDecision" value="'+k+'">'+(k==="approved"?"Approve":k==="missing"?"Missing info":"Decline")+'</label>'; }).join("") +
    '</div>' +
    '<div class="field" id="evNoteField" style="display:none;"><label id="evNoteLabel">Explanation</label><textarea id="evNote" placeholder=""></textarea></div>' +
    '<div class="modal-actions">'+
      '<button class="btn ghost" data-close-modal>Close</button><button class="btn primary" id="evSaveDecision">'+(decided?"Update decision":"Send decision")+'</button></div>';
  openModal(body);
  var sel = decided ? a.status : "";
  var noteEl = document.getElementById("evNote");
  noteEl.value = (a.status==="declined"||a.status==="missing") ? (a.note||"") : "";
  function paint(){
    document.querySelectorAll(".decide-opts label").forEach(function(l){ l.classList.toggle("sel", l.getAttribute("data-opt")===sel); });
    var needs = sel==="declined" || sel==="missing";
    document.getElementById("evNoteField").style.display = needs ? "" : "none";
    document.getElementById("evNoteLabel").textContent = sel==="declined" ? "Why is this event declined?" : "What is missing?";
    noteEl.placeholder = sel==="declined" ? "Explain the reason so the club understands." : "List what the club still needs to provide (e.g. more photos, venue permit, adviser sign-off).";
  }
  paint();
  document.querySelectorAll(".decide-opts label").forEach(function(l){
    l.addEventListener("click", function(ev){ ev.preventDefault(); sel = l.getAttribute("data-opt"); paint(); });
  });
  document.querySelectorAll("[data-zoom]").forEach(function(b){
    b.addEventListener("click", function(){
      var lb = document.createElement("div"); lb.className = "lightbox";
      lb.innerHTML = '<img src="'+photos[parseInt(b.getAttribute("data-zoom"))]+'" alt="Event photo">';
      lb.addEventListener("click", function(e){ e.stopPropagation(); lb.remove(); });
      document.body.appendChild(lb);
    });
  });
  document.getElementById("evSaveDecision").addEventListener("click", function(){
    if (!sel){ toast("Choose Approve, Missing info or Decline first.", true); return; }
    var note = noteEl.value.trim();
    if ((sel==="declined"||sel==="missing") && !note){ toast(sel==="declined" ? "Add the reason for declining." : "Say what is missing.", true); return; }
    var when = new Date().toISOString(), finalNote = (sel==="approved") ? "" : note;
    Store.update(function(db){
      var rec = db.clubs.find(function(c){ return c.account.officialClubId===a.clubId; });
      var ev = rec && (rec.events||[]).find(function(x){ return x.id===a.eventId; });
      if (ev) ev.review = {status:sel, note:finalNote, submittedAt:a.submittedAt, decidedAt:when, resubmitted:false};
    });
    syncShared(); closeModal();
    toast({approved:"Event approved", declined:"Event declined", missing:"Marked as missing info"}[sel]+" — the club sees it right away.");
    renderApp();
  });
}

/* ---- Calendar ---- */
var calState = (function(){ var d = new Date(); return { year:d.getFullYear(), month:d.getMonth(), filterClub:"", selectedDate:null }; })();
function calMonthLabel(y,m){
  var names = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return names[m] + " " + y;
}
function calPad(n){ return n<10 ? "0"+n : ""+n; }
function calEventsByDay(y,m){
  var byDay = {};
  state.events.forEach(function(e){
    if (calState.filterClub && e.clubId !== calState.filterClub) return;
    var d = new Date(e.date+"T00:00:00");
    if (isNaN(d) || d.getFullYear()!==y || d.getMonth()!==m) return;
    var day = d.getDate();
    (byDay[day] = byDay[day] || []).push(e);
  });
  return byDay;
}
function renderCalendar(){
  var y = calState.year, m = calState.month;
  var startWeekday = new Date(y,m,1).getDay();
  var daysInM = new Date(y,m+1,0).getDate();
  var prevDays = new Date(y,m,0).getDate();
  var byDay = calEventsByDay(y,m);
  var todayIso = new Date().toISOString().slice(0,10);

  var cells = "";
  for (var i=0;i<startWeekday;i++){
    cells += '<div class="cal-cell out"><div class="cal-daynum">'+(prevDays-startWeekday+1+i)+'</div></div>';
  }
  for (var d=1; d<=daysInM; d++){
    var dateStr = y+"-"+calPad(m+1)+"-"+calPad(d);
    var evs = byDay[d] || [];
    var shown = evs.slice(0,3);
    var more = evs.length - shown.length;
    cells += '<div class="cal-cell'+(dateStr===todayIso?" today":"")+(dateStr===calState.selectedDate?" selected":"")+'" data-cal-day="'+dateStr+'">' +
      '<div class="cal-daynum">'+d+'</div>' +
      shown.map(function(e){ return '<div class="cal-chip" title="'+esc(e.name+" · "+e.clubName)+'">'+esc(e.name)+'</div>'; }).join("") +
      (more>0 ? '<div class="cal-more">+'+more+' more</div>' : "") +
    '</div>';
  }
  var trailing = (7 - ((startWeekday+daysInM) % 7)) % 7;
  for (var j=1;j<=trailing;j++){ cells += '<div class="cal-cell out"><div class="cal-daynum">'+j+'</div></div>'; }
  var dow = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(function(x){return '<div class="cal-dow">'+x+'</div>';}).join("");

  var clubOptions = '<option value="">All clubs</option>' + state.clubs.slice().sort(function(a,b){return a.name.localeCompare(b.name);}).map(function(c){
    return '<option value="'+c.id+'"'+(calState.filterClub===c.id?" selected":"")+'>'+esc(c.name)+'</option>';
  }).join("");

  var details = "";
  if (calState.selectedDate){
    var selDay = parseInt(calState.selectedDate.slice(8,10),10);
    var selEvs = (byDay[selDay]||[]).filter(function(e){ return e.date===calState.selectedDate; });
    details = '<div class="card cal-details"><h3 class="card-title">'+fmtDate(calState.selectedDate)+'</h3>' +
      (selEvs.length ? '<div class="table-wrap"><table><thead><tr><th>Event</th><th>Club</th><th>Category</th><th>Target participants</th></tr></thead><tbody>' +
        selEvs.map(function(e){ var t = e.target || "—"; return '<tr><td>'+esc(e.name)+'</td><td>'+esc(e.clubName)+'</td><td>'+esc(e.category)+'</td><td>'+t+'</td></tr>'; }).join("") +
        '</tbody></table></div>' : emptyState("No events on this day","")) +
    '</div>';
  }

  return pageHead("Calendar", "Every logged event across all clubs, by date — filter to focus on one club.") +
    '<div class="card">' +
      '<div class="cal-head">' +
        '<div class="cal-nav"><button class="btn small" id="calPrev" aria-label="Previous month">&larr;</button><div class="cal-title">'+calMonthLabel(y,m)+'</div><button class="btn small" id="calNext" aria-label="Next month">&rarr;</button><button class="btn small" id="calToday">Today</button></div>' +
        '<div class="cal-filter"><select id="calClubFilter">'+clubOptions+'</select></div>' +
      '</div>' +
      '<div class="cal-grid">'+dow+cells+'</div>' +
    '</div>' +
    details;
}
function wireCalendar(){
  var prev = document.getElementById("calPrev");
  var next = document.getElementById("calNext");
  var todayBtn = document.getElementById("calToday");
  var filterSel = document.getElementById("calClubFilter");
  if (prev) prev.addEventListener("click", function(){ calState.month--; if (calState.month<0){calState.month=11; calState.year--;} renderApp(); });
  if (next) next.addEventListener("click", function(){ calState.month++; if (calState.month>11){calState.month=0; calState.year++;} renderApp(); });
  if (todayBtn) todayBtn.addEventListener("click", function(){ var d=new Date(); calState.year=d.getFullYear(); calState.month=d.getMonth(); calState.selectedDate=null; renderApp(); });
  if (filterSel) filterSel.addEventListener("change", function(){ calState.filterClub = filterSel.value; renderApp(); });
  document.querySelectorAll("[data-cal-day]").forEach(function(cell){
    cell.addEventListener("click", function(){
      var day = cell.getAttribute("data-cal-day");
      calState.selectedDate = (calState.selectedDate===day) ? null : day;
      renderApp();
    });
  });
}

/* ---- Reports (org-wide, aggregate only) ---- */
function renderReportsPage(){
  var byCat = {};
  state.clubs.forEach(function(c){ byCat[c.category]=(byCat[c.category]||0)+1; });
  var catData = Object.keys(byCat).map(function(k){ return {label:k, value:byCat[k]}; });

  var appFunnel = [
    {label:"Submitted", value: state.applications.length, color:"var(--accent2)"},
    {label:"Approved", value: state.applications.filter(function(a){return a.status==="approved";}).length, color:"var(--good)"},
    {label:"Rejected", value: state.applications.filter(function(a){return a.status==="rejected";}).length, color:"var(--bad)"},
    {label:"Pending", value: state.applications.filter(function(a){return a.status==="pending";}).length, color:"var(--warn)"}
  ];

  var byClubEvents = {};
  state.events.forEach(function(e){ byClubEvents[e.clubName]=(byClubEvents[e.clubName]||0)+1; });
  var eventsPerClub = Object.keys(byClubEvents).map(function(k){ return {label:k, value:byClubEvents[k]}; });

  var byPeriod = {};
  state.events.forEach(function(e){ var k=(e.date||"").slice(0,7); if (k) byPeriod[k]=(byPeriod[k]||0)+1; });
  var trendData = Object.keys(byPeriod).sort().map(function(k){ return {label:k, value:byPeriod[k]}; });

  var activeCount = state.clubs.filter(function(c){return c.status==="active";}).length;
  var suspendedCount = state.clubs.filter(function(c){return c.status==="suspended";}).length;

  return pageHead("Reports", "Organization-wide analytics. These are club- and event-level counts only — individual member or student data isn't collected here.") +
    '<div class="chart-row" style="margin-bottom:16px;">' +
      '<div class="card"><h3 class="card-title">Clubs by category</h3><p class="card-sub">'+state.clubs.length+' clubs on record.</p>' + (catData.length?donutChart(catData)+legend(catData):emptyState("No clubs yet","")) + '</div>' +
      '<div class="card"><h3 class="card-title">Application funnel</h3><p class="card-sub">All applications received.</p>' + barChart(appFunnel) + '</div>' +
    '</div>' +
    '<div class="chart-row" style="margin-bottom:16px;">' +
      '<div class="card"><h3 class="card-title">Events per club</h3><p class="card-sub">Approved events, updated live.</p>' + (eventsPerClub.length?barChart(eventsPerClub):emptyState("No events logged yet","")) + '</div>' +
      '<div class="card"><h3 class="card-title">Active vs suspended</h3><p class="card-sub">Current club standing.</p>' +
        donutChart([{label:"Active",value:activeCount,color:"var(--good)"},{label:"Suspended",value:suspendedCount,color:"var(--bad)"}]) +
        legend([{label:"Active",value:activeCount,color:"var(--good)"},{label:"Suspended",value:suspendedCount,color:"var(--bad)"}]) +
      '</div>' +
    '</div>' +
    '<div class="card"><h3 class="card-title">Events per month</h3><p class="card-sub">Approved events across all clubs, updated live.</p>' +
      (trendData.length>1 ? lineChart(trendData) : (trendData.length===1 ? barChart(trendData) : emptyState("Not enough data yet",""))) +
    '</div>';
}

/* ---- Settings ---- */
function renderSettings(){
  return pageHead("Settings", "Console-level preferences.") +
    '<div class="card" style="max-width:480px;">' +
      '<h3 class="card-title" style="font-size:14px;">Change password</h3>' +
      '<div class="field"><label>New password</label><input id="newPass" type="password"></div>' +
      '<div class="field"><label>Confirm</label><input id="newPass2" type="password"></div>' +
      '<button class="btn primary" id="changePassBtn">Update password</button>' +
    '</div>' +
    '<div class="card" style="max-width:480px;margin-top:16px;">' +
      '<h3 class="card-title" style="font-size:14px;">Clear console data</h3>' +
      '<p class="card-sub">Permanently erases the records, admin password and settings stored by this console in this browser. Club-submitted data in the shared store is not affected.</p>' +
      '<button class="btn danger" id="resetData">Clear all data</button>' +
    '</div>';
}
function wireSettings(){
  document.getElementById("changePassBtn").addEventListener("click", async function(){
    var p1 = val("newPass"), p2 = val("newPass2");
    if (p1.length<6){ toast("Use at least 6 characters.", true); return; }
    if (p1!==p2){ toast("Passwords don't match.", true); return; }
    state.auth.passwordHash = await sha256Hex(p1);
    save(); toast("Password updated.");
  });
  document.getElementById("resetData").addEventListener("click", function(){
    if (!confirm("This permanently erases all registrar data and the admin password for this console. Continue?")) return;
    state = defaultState(); save(); route="dashboard"; renderApp(); toast("Console data cleared.");
  });
}
