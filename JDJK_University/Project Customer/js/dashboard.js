/* ---------- SECTIONS (approved dashboard) ---------- */
function renderSection(r){
  if (r==="overview") return renderOverview();
  if (r==="settings") return renderSettings();
  if (r==="events") return renderEvents();
  if (r==="calendar") return renderCalendar();
  if (r==="reports") return renderReports();
  if (r==="profile") return renderProfile();
  return "";
}
function wireSection(r){
  if (r==="overview") wireOverview();
  if (r==="settings") wireSettings();
  if (r==="events") wireEvents();
  if (r==="calendar") wireCalendar();
  if (r==="reports") wireReports();
  if (r==="profile") wireProfile();
}

/* ---- Overview ---- */
function renderOverview(){
  var upcoming = activeClub.events.filter(function(e){ return eventStatusAuto(e)==="upcoming"; }).length;
  var totalTarget = activeClub.events.reduce(function(a,e){ return a + (e.targetParticipants||0); }, 0);
  var app = activeClub.account.application;
  var recentEvents = activeClub.events.slice().sort(function(a,b){ return b.date.localeCompare(a.date); }).slice(0,5);
  return pageHead("Overview", "A snapshot of "+esc(app.clubName)+"'s current standing.") +
    '<div class="grid stats" style="margin-bottom:20px;">' +
      statCard(activeClub.members.length, "Members") +
      statCard(activeClub.events.length, "Total events") +
      statCard(upcoming, "Upcoming events") +
      statCard(totalTarget, "Target participants") +
    '</div>' +
    '<div class="card">' +
      '<h3 class="card-title">Recent events</h3><p class="card-sub">Most recently dated, any status.</p>' +
      renderEventsTable(recentEvents, true) +
    '</div>';
}
function statCard(num,label){
  return '<div class="card stat-card"><div class="num">'+num+'</div><div class="label">'+esc(label)+'</div></div>';
}
function pageHead(title, sub, actionsHtml){
  return '<div class="page-head"><div><h1>'+esc(title)+'</h1><p>'+esc(sub)+'</p></div><div class="head-actions">'+(actionsHtml||"")+'</div></div>';
}
function wireOverview(){}

/* ---- Members ---- */
function renderSettings(){
  var b = activeClub.branding || {};
  return pageHead("Settings", "Personalize your console and manage your club's members.") +
    personalizationCard('margin-bottom:18px;') +
    renderMembers();
}
function renderMembers(){
  return '<div style="display:flex; align-items:flex-end; justify-content:space-between; gap:12px; margin-bottom:10px;">' +
      '<div><h3 class="card-title" style="margin:0;">Members</h3><p class="card-sub" style="margin:2px 0 0;">Your club\'s roster.</p></div>' +
      '<button class="btn primary" data-action="addMember">Add member</button></div>' +
    '<div class="search-bar"><input id="memberSearch" placeholder="Search by name or program…" value="'+esc(filters.members)+'"></div>' +
    '<div class="card"><div class="table-wrap" id="membersWrap">' + renderMembersTable() + '</div></div>';
}
function personalizationCard(style){
  var b = activeClub.branding || {};
  var clubName = activeClub.account.application.clubName;
  return '<div class="card" style="'+(style||"")+'">' +
    '<h3 class="card-title">Personalization</h3><p class="card-sub">Change the names shown at the top of the sidebar. Leave a field blank to use the default. Names can only be changed here in Settings.</p>' +
    '<div class="field-row">' +
      '<div class="field"><label>Top name</label><input id="brandTitle" maxlength="40" placeholder="Club Console" value="'+esc(b.title||"")+'"></div>' +
      '<div class="field"><label>Bottom name</label><input id="brandSub" maxlength="60" placeholder="'+esc(clubName)+'" value="'+esc(b.sub||"")+'"></div>' +
    '</div>' +
    '<div class="brand" style="background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:10px 14px;margin-bottom:12px;display:inline-flex;" aria-label="Sidebar preview">' +
      '<div class="brand-mark">'+logoImg()+'</div><div class="brand-text"><div class="name" id="brandPrevTitle">'+esc(brandTitle())+'</div><div class="sub" id="brandPrevSub">'+esc(brandSub())+'</div></div></div>' +
    '<div style="display:flex; gap:8px;"><button class="btn primary" id="saveBrand">Save names</button><button class="btn ghost" id="resetBrand">Reset to default</button></div>' +
  '</div>';
}
function wirePersonalization(){
  var clubName = activeClub.account.application.clubName;
  function prev(){
    document.getElementById("brandPrevTitle").textContent = val("brandTitle") || "Club Console";
    document.getElementById("brandPrevSub").textContent = val("brandSub") || clubName;
  }
  document.getElementById("brandTitle").addEventListener("input", prev);
  document.getElementById("brandSub").addEventListener("input", prev);
  document.getElementById("saveBrand").addEventListener("click", function(){
    activeClub.branding = { title: val("brandTitle").trim(), sub: val("brandSub").trim() };
    save(); toast("Names updated."); renderApp();
  });
  document.getElementById("resetBrand").addEventListener("click", function(){
    activeClub.branding = { title:"", sub:"" };
    save(); toast("Names reset to default."); renderApp();
  });
}
function wireSettings(){
  wirePersonalization();
  wireMembers();
}
function renderMembersTable(){
  var q = filters.members.toLowerCase();
  var rows = activeClub.members.filter(function(m){
    return !q || fullName(m.firstName,m.middleName,m.lastName,m.extName).toLowerCase().indexOf(q)>-1 || m.program.toLowerCase().indexOf(q)>-1;
  });
  if (!rows.length) return emptyState("No members yet", "Add your first member to start building your roster.");
  return '<table><thead><tr><th>Name</th><th>Program</th><th>Year</th><th>Role</th><th>Email</th><th>Joined</th><th></th></tr></thead><tbody>' +
    rows.map(function(m){
      return '<tr><td>'+esc(fullName(m.firstName,m.middleName,m.lastName,m.extName))+'</td><td>'+esc(m.program)+'</td><td>'+esc(m.year)+'</td><td>'+esc(m.role)+'</td><td>'+esc(m.email)+'</td><td>'+fmtDate(m.joinedAt)+'</td>' +
        '<td><div class="row-actions"><button class="btn small" data-edit-member="'+m.id+'">Edit</button><button class="btn small danger" data-del-member="'+m.id+'">Remove</button></div></td></tr>';
    }).join("") + '</tbody></table>';
}
function wireMembers(){
  document.getElementById("memberSearch").addEventListener("input", function(e){
    filters.members = e.target.value;
    document.getElementById("membersWrap").innerHTML = renderMembersTable();
    wireMemberRowActions();
  });
  document.querySelector('[data-action="addMember"]').addEventListener("click", function(){ openMemberModal(null); });
  wireMemberRowActions();
}
function wireMemberRowActions(){
  document.querySelectorAll("[data-edit-member]").forEach(function(b){
    b.addEventListener("click", function(){ openMemberModal(b.getAttribute("data-edit-member")); });
  });
  document.querySelectorAll("[data-del-member]").forEach(function(b){
    b.addEventListener("click", function(){
      var id = b.getAttribute("data-del-member");
      if (!confirm("Remove this member?")) return;
      activeClub.members = activeClub.members.filter(function(m){ return m.id!==id; });
      save(); toast("Member removed."); renderApp();
    });
  });
}
function openMemberModal(id){
  var m = id ? memberById(id) : null;
  var body = '<h2>'+(m?"Edit member":"Add member")+'</h2>' +
    personFieldsHtml("m","Member",true,m||{}) +
    '<div class="field-row">'+
      '<div class="field"><label>Program</label><input id="mProgram"></div>'+
      '<div class="field"><label>Year level</label><select id="mYear">'+YEAR_LEVELS.map(function(y){return '<option>'+y+'</option>';}).join("")+'</select></div>'+
    '</div>' +
    '<div class="field"><label>Role</label><select id="mRole">'+ROLES.map(function(r){return '<option>'+r+'</option>';}).join("")+'</select></div>' +
    '<div class="modal-actions"><button class="btn ghost" data-close-modal>Cancel</button><button class="btn primary" id="saveMember">Save</button></div>';
  openModal(body);
  if (m){ document.getElementById("mProgram").value=m.program; document.getElementById("mYear").value=m.year; document.getElementById("mRole").value=m.role; }
  document.getElementById("saveMember").addEventListener("click", function(){
    var p = readPersonFields("m");
    if (!p.firstName || !p.lastName){ toast("First and last name are required.", true); return; }
    if (p.email && !isEmail(p.email)){ toast("Enter a valid email.", true); return; }
    var data = {firstName:p.firstName, middleName:p.middleName, lastName:p.lastName, extName:p.extName, email:p.email, program:val("mProgram"), year:val("mYear")||YEAR_LEVELS[0], role:val("mRole")||ROLES[ROLES.length-1]};
    if (m){ Object.assign(m, data); toast("Member updated."); }
    else { activeClub.members.push(Object.assign({id:uid("MEM"), joinedAt:todayStr()}, data)); toast("Member added."); }
    save(); closeModal(); renderApp();
  });
}

/* ---- Events ---- */
function renderEvents(){
  return pageHead("Events", "Create and manage your club's events. Status auto-updates by date, or set Cancelled manually.",
    '<button class="btn primary" data-action="addEvent">New event</button>') +
    '<div class="search-bar"><input id="eventSearch" placeholder="Search events…" value="'+esc(filters.events)+'"></div>' +
    '<div class="card"><div class="table-wrap">' + renderEventsTableFiltered() + '</div></div>' + renderIncomingCollabs();
}
function renderIncomingCollabs(){
  var inc = incomingCollabs().sort(function(a,b){ return b.event.date.localeCompare(a.event.date); });
  if (!inc.length) return "";
  return '<div class="card" style="margin-top:16px;"><h3 class="card-title">Collaborations with other clubs</h3><p class="card-sub">Events hosted by another club that you are co-hosting. Managed by the host club.</p><div class="table-wrap"><table><thead><tr><th>Event</th><th>Host club</th><th>Date</th><th>Venue</th><th>Status</th></tr></thead><tbody>' +
    inc.map(function(x){ var st = eventStatusAuto(x.event); return '<tr><td>'+esc(x.event.name)+'</td><td>'+esc(x.host)+'</td><td>'+fmtDate(x.event.date)+'</td><td>'+esc(x.event.venue)+'</td><td><span class="badge '+st+'">'+st+'</span></td></tr>'; }).join("") +
    '</tbody></table></div></div>';
}
function renderEventsTableFiltered(){
  var q = filters.events.toLowerCase();
  var rows = activeClub.events.filter(function(e){ return !q || e.name.toLowerCase().indexOf(q)>-1; })
    .slice().sort(function(a,b){ return b.date.localeCompare(a.date); });
  return renderEventsTable(rows, false);
}
function renderEventsTable(rows, compact){
  if (!rows.length) return emptyState("No events yet", "Create your first event, then submit it to the admin for approval.");
  return '<table><thead><tr><th>Event</th><th>Date</th><th>Venue</th><th>Status</th><th>Target participants</th>'+(compact?"":"<th>Admin review</th><th></th>")+'</tr></thead><tbody>' +
    rows.map(function(e){
      var st = eventStatusAuto(e);
      var cap = e.targetParticipants ? e.targetParticipants : "—";
      var rv = reviewOf(e);
      var submitLabel = rv.status==="draft" ? "Submit to admin" : rv.status==="pending" ? "" : rv.status==="approved" ? "" : "Resubmit";
      var rvCell = '<span class="badge rv-'+rv.status+'">'+REVIEW_LABELS[rv.status]+'</span>' +
        ((rv.status==="declined"||rv.status==="missing") && rv.note ? '<div class="review-note"><b>'+(rv.status==="declined"?"Reason":"Missing")+':</b> '+esc(rv.note)+'</div>' : "");
      return '<tr><td>'+esc(e.name)+collabNote(e)+((e.photos&&e.photos.length)?' <span style="font-size:11px;color:var(--ink-soft);">· '+e.photos.length+' photo'+(e.photos.length>1?"s":"")+'</span>':"")+'</td><td>'+fmtDate(e.date)+'</td><td>'+esc(e.venue)+'</td><td><span class="badge '+st+'">'+st+'</span></td><td>'+cap+'</td>' +
        (compact ? "" : '<td>'+rvCell+'</td><td><div class="row-actions"><button class="btn small" data-edit-event="'+e.id+'">Edit</button>'+(submitLabel?'<button class="btn small primary" data-submit-event="'+e.id+'">'+submitLabel+'</button>':"")+'</div></td>') +
      '</tr>';
    }).join("") + '</tbody></table>';
}
function wireEvents(){
  document.getElementById("eventSearch").addEventListener("input", function(e){
    filters.events = e.target.value;
    document.querySelector("#main .card .table-wrap").innerHTML = renderEventsTableFiltered();
    wireEventRowActions();
  });
  document.querySelector('[data-action="addEvent"]').addEventListener("click", function(){ openEventModal(null); });
  wireEventRowActions();
}
function submitEvent(id){
  var e = eventById(id); if (!e) return;
  if (isSuspended(activeClub)){ toast("This club is suspended — events can't be submitted right now.", true); return; }
  var prev = reviewOf(e).status;
  e.review = {status:"pending", note:"", submittedAt:new Date().toISOString(), resubmitted:(prev==="declined"||prev==="missing")};
  save(); toast("Event sent to the registrar for review."); renderApp();
}
function wireEventRowActions(){
  document.querySelectorAll("[data-submit-event]").forEach(function(b){
    b.addEventListener("click", function(){ submitEvent(b.getAttribute("data-submit-event")); });
  });
  document.querySelectorAll("[data-edit-event]").forEach(function(b){
    b.addEventListener("click", function(){ openEventModal(b.getAttribute("data-edit-event")); });
  });
}
function openEventModal(id){
  var e = id ? eventById(id) : null;
  var body = '<h2>'+(e?"Edit event":"New event")+'</h2>' +
    field("Event name","eName","text",true) +
    '<div class="field"><label>Category</label><select id="eCategory">'+CATEGORIES.map(function(c){return '<option>'+c+'</option>';}).join("")+'</select></div>' +
    '<div class="field"><label>Description</label><textarea id="eDesc"></textarea></div>' +
    '<div class="field-row">'+field("Date","eDate","date",true)+field("Target participants","eTarget","number",false)+'</div>' +
    '<div class="field-row">'+field("Start time","eStart","time",false)+field("End time","eEnd","time",false)+'</div>' +
    '<div class="field-row">'+field("Venue","eVenue","text",false)+'</div>' +
    '<div class="field"><label>Collaborating clubs <span style="font-weight:400;color:var(--ink-soft);">(optional — co-hosted with other clubs)</span></label>' +
      (otherApprovedClubs().length ? '<div style="border:1px solid var(--line);border-radius:var(--radius-sm);padding:8px 10px;max-height:130px;overflow-y:auto;background:var(--paper);">' + otherApprovedClubs().map(function(c){
        var cid = c.account.officialClubId, on = e && (e.collaborators||[]).some(function(x){ return x.clubId===cid; });
        return '<label style="display:flex;gap:8px;align-items:center;font-weight:400;margin:3px 0;color:var(--ink);"><input type="checkbox" data-collab="'+esc(cid)+'" data-collab-name="'+esc(c.account.application.clubName)+'" style="width:auto;"'+(on?' checked':'')+'> '+esc(c.account.application.clubName)+'</label>';
      }).join("") + '</div>' : '<div class="hint">No other registered clubs yet.</div>') +
      '<input id="eExternal" placeholder="Other partners not on the console (comma-separated)" style="margin-top:8px;" value="'+esc(e && e.externalPartners ? e.externalPartners.join(", ") : "")+'">' +
      '<div class="hint">Collaborating clubs will see this event in their Events list and Calendar.</div></div>' +
    '<div class="field"><label>Photos <span style="font-weight:400;color:var(--ink-soft);">(up to '+MAX_EVENT_PHOTOS+' — add more any time)</span></label>' +
      '<div class="photo-grid" id="photoGrid"></div>' +
      '<input id="ePhotoInput" type="file" accept="image/*" multiple></div>' +
    '<div class="field"><label>Status override</label><select id="eStatus"><option value="">Auto (by date)</option><option value="cancelled">Cancelled</option></select></div>' +
    '<div class="modal-actions">'+(e?'<button class="btn danger" id="deleteEvent" style="margin-right:auto;">Delete</button>':"")+'<button class="btn ghost" data-close-modal>Cancel</button><button class="btn primary" id="saveEvent">Save</button></div>';
  openModal(body);
  if (e){
    document.getElementById("eName").value=e.name; document.getElementById("eCategory").value=e.category; document.getElementById("eDesc").value=e.description||"";
    document.getElementById("eDate").value=e.date;
    document.getElementById("eStart").value=e.startTime||""; document.getElementById("eEnd").value=e.endTime||"";
    document.getElementById("eVenue").value=e.venue||""; document.getElementById("eTarget").value=e.targetParticipants||"";
    document.getElementById("eStatus").value = e.status==="cancelled" ? "cancelled" : "";
  }
  var photos = e && e.photos ? e.photos.slice() : [];
  function drawPhotos(){
    var g = document.getElementById("photoGrid");
    g.innerHTML = photos.map(function(src,i){ return '<div class="photo-thumb"><img src="'+src+'" alt="Event photo '+(i+1)+'"><button type="button" data-rm-photo="'+i+'" title="Remove">×</button></div>'; }).join("");
    g.querySelectorAll("[data-rm-photo]").forEach(function(b){
      b.addEventListener("click", function(){ photos.splice(parseInt(b.getAttribute("data-rm-photo")),1); drawPhotos(); });
    });
  }
  drawPhotos();
  document.getElementById("ePhotoInput").addEventListener("change", async function(ev){
    var files = Array.from(ev.target.files || []);
    ev.target.value = "";
    for (var i=0;i<files.length;i++){
      if (photos.length >= MAX_EVENT_PHOTOS){ toast("Up to "+MAX_EVENT_PHOTOS+" photos per event.", true); break; }
      try{ photos.push(await compressImage(files[i])); }catch(err){ toast("Couldn't read "+files[i].name+".", true); }
    }
    drawPhotos();
  });
  var delBtn = document.getElementById("deleteEvent");
  if (delBtn) delBtn.addEventListener("click", function(){
    if (!confirm("Delete this event?")) return;
    activeClub.events = activeClub.events.filter(function(x){ return x.id!==e.id; });
    save(); toast("Event deleted."); closeModal(); renderApp();
  });
  document.getElementById("saveEvent").addEventListener("click", function(){
    var name = val("eName"), date = val("eDate");
    if (!name || !date){ toast("Event name and date are required.", true); return; }
    var start = val("eStart"), end = val("eEnd");
    if (start && end && end <= start){ toast("End time must be after start time.", true); return; }
    var data = {
      name:name, category:val("eCategory")||CATEGORIES[0], description:val("eDesc"), date:date,
      startTime:start, endTime:end, venue:val("eVenue"), targetParticipants: parseInt(val("eTarget"))||null,
      status: val("eStatus")==="cancelled" ? "cancelled" : "auto", photos: photos,
      collaborators: Array.from(document.querySelectorAll("[data-collab]:checked")).map(function(cb){ return {clubId:cb.getAttribute("data-collab"), clubName:cb.getAttribute("data-collab-name")}; }),
      externalPartners: val("eExternal").split(",").map(function(s){ return s.trim(); }).filter(Boolean)
    };
    if (e){ Object.assign(e, data); toast("Event updated."); }
    else { activeClub.events.push(Object.assign({id:uid("EVT"), review:{status:"draft"}}, data)); toast("Event created — submit it to the admin from the Events list."); }
    save(); closeModal(); renderApp();
  });
}

/* ---- Calendar (mirrors the registrar console's calendar, scoped to
   activeClub.events only — no club filter needed since there's just one club) ---- */
var calState = (function(){ var d = new Date(); return { year:d.getFullYear(), month:d.getMonth(), selectedDate:null }; })();
function calMonthLabel(y,m){
  var names = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return names[m] + " " + y;
}
function calPad(n){ return n<10 ? "0"+n : ""+n; }
function calEventsByDay(y,m){
  var byDay = {};
  activeClub.events.concat(incomingCollabs().map(function(x){ return Object.assign({}, x.event, {name:x.event.name+" (w/ "+x.host+")"}); })).forEach(function(e){
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
      shown.map(function(e){ return '<div class="cal-chip" title="'+esc(e.name)+'">'+esc(e.name)+'</div>'; }).join("") +
      (more>0 ? '<div class="cal-more">+'+more+' more</div>' : "") +
    '</div>';
  }
  var trailing = (7 - ((startWeekday+daysInM) % 7)) % 7;
  for (var j=1;j<=trailing;j++){ cells += '<div class="cal-cell out"><div class="cal-daynum">'+j+'</div></div>'; }
  var dow = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(function(x){return '<div class="cal-dow">'+x+'</div>';}).join("");

  var details = "";
  if (calState.selectedDate){
    var selDay = parseInt(calState.selectedDate.slice(8,10),10);
    var selEvs = (byDay[selDay]||[]).filter(function(e){ return e.date===calState.selectedDate; });
    details = '<div class="card cal-details"><h3 class="card-title">'+fmtDate(calState.selectedDate)+'</h3>' +
      (selEvs.length ? '<div class="table-wrap"><table><thead><tr><th>Event</th><th>Category</th><th>Target participants</th></tr></thead><tbody>' +
        selEvs.map(function(e){ var t = e.targetParticipants || "—"; return '<tr><td>'+esc(e.name)+'</td><td>'+esc(e.category)+'</td><td>'+t+'</td></tr>'; }).join("") +
        '</tbody></table></div>' : emptyState("No events on this day","")) +
    '</div>';
  }

  return pageHead("Calendar", "Your club's own events, by date.") +
    '<div class="card">' +
      '<div class="cal-head">' +
        '<div class="cal-nav"><button class="btn small" id="calPrev" aria-label="Previous month">&larr;</button><div class="cal-title">'+calMonthLabel(y,m)+'</div><button class="btn small" id="calNext" aria-label="Next month">&rarr;</button><button class="btn small" id="calToday">Today</button></div>' +
      '</div>' +
      '<div class="cal-grid">'+dow+cells+'</div>' +
    '</div>' +
    details;
}
function wireCalendar(){
  var prev = document.getElementById("calPrev");
  var next = document.getElementById("calNext");
  var todayBtn = document.getElementById("calToday");
  if (prev) prev.addEventListener("click", function(){ calState.month--; if (calState.month<0){calState.month=11; calState.year--;} renderApp(); });
  if (next) next.addEventListener("click", function(){ calState.month++; if (calState.month>11){calState.month=0; calState.year++;} renderApp(); });
  if (todayBtn) todayBtn.addEventListener("click", function(){ var d=new Date(); calState.year=d.getFullYear(); calState.month=d.getMonth(); calState.selectedDate=null; renderApp(); });
  document.querySelectorAll("[data-cal-day]").forEach(function(cell){
    cell.addEventListener("click", function(){
      var day = cell.getAttribute("data-cal-day");
      calState.selectedDate = (calState.selectedDate===day) ? null : day;
      renderApp();
    });
  });
}

/* ---- Reports (charts) ---- */
function renderReports(){
  var byYear = {};
  activeClub.members.forEach(function(m){ byYear[m.year] = (byYear[m.year]||0)+1; });
  var yearData = Object.keys(byYear).map(function(k){ return {label:k, value:byYear[k]}; });

  var byProgram = {};
  activeClub.members.forEach(function(m){ var p=m.program||"Unspecified"; byProgram[p]=(byProgram[p]||0)+1; });
  var programData = Object.keys(byProgram).map(function(k){ return {label:k, value:byProgram[k]}; });

  var eventTargetData = activeClub.events.slice().sort(function(a,b){return a.date.localeCompare(b.date);}).map(function(e){
    return {label:e.name, value:e.targetParticipants||0};
  });
  var byCat = {};
  activeClub.events.forEach(function(e){ byCat[e.category] = (byCat[e.category]||0)+1; });
  var catData = Object.keys(byCat).map(function(k){ return {label:k, value:byCat[k]}; });

  return pageHead("Reports", "Member and event analytics for your own club — this level of detail isn't shared with the administrator.") +
    '<div class="chart-row" style="margin-bottom:16px;">' +
      '<div class="card"><h3 class="card-title">Target participants per event</h3><p class="card-sub">The headcount you are aiming for at each event.</p>' + (eventTargetData.length?barChart(eventTargetData):emptyState("No events yet","")) + '</div>' +
      '<div class="card"><h3 class="card-title">Members by year level</h3><p class="card-sub">'+activeClub.members.length+' total members.</p>' + (yearData.length ? donutChart(yearData)+legend(yearData) : emptyState("No members yet","")) + '</div>' +
    '</div>' +
    '<div class="chart-row">' +
      '<div class="card"><h3 class="card-title">Events by category</h3><p class="card-sub">'+activeClub.events.length+' events in total.</p>' + (catData.length ? donutChart(catData)+legend(catData) : emptyState("No events yet","")) + '</div>' +
      '<div class="card"><h3 class="card-title">Members by program</h3><p class="card-sub">Program mix across your roster.</p>' + (programData.length ? donutChart(programData)+legend(programData) : emptyState("No members yet","")) + '</div>' +
    '</div>';
}
function wireReports(){}

/* ---- Profile ---- */
function renderProfile(){
  var a = activeClub.account.application;
  var accred = getAccredList(a);
  return pageHead("Club profile", "Your registered details on file.") +
    '<div class="card" style="max-width:560px;">' +
      profRow("Club name", a.clubName) + profRow("Category", a.category) +
      profRow("Adviser", fullName(a.adviserFirstName,a.adviserMiddleName,a.adviserLastName,a.adviserExtName)+" · "+a.adviserEmail) +
      profRow("Official club ID", activeClub.account.officialClubId) +
      profRow("Approved", fmtDateTime(activeClub.account.approvedAt)) +
      (accred.length ? '<div style="padding:9px 0;font-size:13.5px;"><div style="color:var(--ink-soft);margin-bottom:8px;">Proof of club accreditation</div><div class="photo-grid">' +
        accred.map(function(src,i){ return '<div class="photo-thumb" style="cursor:pointer;" data-prof-accred="'+i+'" title="Click to view"><img src="'+src+'" alt="Accreditation proof '+(i+1)+'"></div>'; }).join("") +
      '</div></div>' : profRow("Proof of club accreditation", "On file")) +
    '</div>' +
    '<div class="card" style="max-width:560px;margin-top:16px;">' +
      '<h3 class="card-title" style="font-size:14px;">Clear club records</h3>' +
      '<p class="card-sub">Permanently removes members and events for this club. Your registration, account login, and approved standing remain intact.</p>' +
      '<button class="btn danger" id="resetData">Clear club records</button>' +
    '</div>';
}
function profRow(label,val){
  return '<div style="display:flex;justify-content:space-between;gap:16px;padding:9px 0;border-bottom:1px solid var(--line);font-size:13.5px;"><span style="color:var(--ink-soft);">'+esc(label)+'</span><span style="text-align:right;">'+esc(val)+'</span></div>';
}
function wireProfile(){
  var accred = getAccredList(activeClub.account && activeClub.account.application);
  document.querySelectorAll("[data-prof-accred]").forEach(function(el){
    el.addEventListener("click", function(){
      var idx = parseInt(el.getAttribute("data-prof-accred"),10);
      if (accred[idx]) openImagePreviewModal(accred[idx], "Proof of Club Accreditation ("+(idx+1)+"/"+accred.length+")");
    });
  });
  document.getElementById("resetData").addEventListener("click", function(){
    if (!confirm("Are you sure you want to permanently clear all members and events for this club?")) return;
    activeClub.members = []; activeClub.events = [];
    save(); route="overview"; renderApp(); toast("Club records cleared.");
  });
}

/* ---- shared: modal / empty state ---- */
function emptyState(big, small){
  return '<div class="empty"><div class="big">'+esc(big)+'</div><div>'+esc(small)+'</div></div>';
}
function openModal(bodyHtml){
  var wrap = document.createElement("div");
  wrap.className = "modal-backdrop";
  wrap.id = "modalBackdrop";
  wrap.innerHTML = '<div class="modal" role="dialog" aria-modal="true">'+bodyHtml+'</div>';
  document.body.appendChild(wrap);
  wrap.addEventListener("click", function(e){ if (e.target===wrap) closeModal(); });
  document.addEventListener("keydown", escCloseHandler);
  var closeBtn = wrap.querySelector("[data-close-modal]");
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
}
function escCloseHandler(e){ if (e.key==="Escape") closeModal(); }
function closeModal(){
  var el = document.getElementById("modalBackdrop");
  if (el) el.remove();
  document.removeEventListener("keydown", escCloseHandler);
}
