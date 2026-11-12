/* ---------- shared field helpers ---------- */
var MAX_ACCRED_PHOTOS = 4;
var pendingAccredPhotos = [];
function field(label,id,type,required,value){
  return '<div class="field"><label for="'+id+'">'+esc(label)+(required?" *":"")+'</label><input id="'+id+'" type="'+type+'" value="'+esc(value||"")+'"></div>';
}
function getAccredList(app){
  if (!app) return [];
  if (Array.isArray(app.accreditationPhotos) && app.accreditationPhotos.length) return app.accreditationPhotos.slice();
  if (app.accreditationProof) return [app.accreditationProof];
  return [];
}
function openImagePreviewModal(src, title){
  openModal('<h2>'+esc(title||"Accreditation Proof")+'</h2>' +
    '<div style="border:1px solid var(--line);border-radius:var(--radius-sm);overflow:hidden;background:var(--paper);max-height:70vh;display:flex;align-items:center;justify-content:center;">' +
      '<img src="'+src+'" alt="Accreditation proof" style="max-width:100%;max-height:70vh;object-fit:contain;display:block;">' +
    '</div>' +
    '<div class="modal-actions"><button class="btn primary" data-close-modal>Close</button></div>');
}
function clubDetailFieldsHtml(prefill){
  prefill = prefill || {};
  pendingAccredPhotos = getAccredList(prefill);
  return field("Club name","cdName","text",true,prefill.clubName) +
    '<div class="field"><label for="cdCategory">Category</label><select id="cdCategory">'+CATEGORIES.map(function(c){return '<option'+(c===prefill.category?" selected":"")+'>'+esc(c)+'</option>';}).join("")+'</select></div>' +
    '<h3 class="card-title" style="font-size:14px;margin-top:6px;">Adviser</h3>' +
    personFieldsHtml("cdAdviser","",true,{firstName:prefill.adviserFirstName,middleName:prefill.adviserMiddleName,lastName:prefill.adviserLastName,extName:prefill.adviserExtName,email:prefill.adviserEmail}) +
    '<div class="field"><label for="cdDesc">Short description</label><textarea id="cdDesc" placeholder="What does this club do?">'+esc(prefill.description||"")+'</textarea></div>' +
    '<div class="field">' +
      '<label for="cdAccredInput">Proof of club accreditation * <span style="font-weight:400;color:var(--ink-soft);">(Approved papers — digital copy or photo, up to '+MAX_ACCRED_PHOTOS+')</span></label>' +
      '<div class="photo-grid" id="cdAccredGrid"></div>' +
      '<input id="cdAccredInput" type="file" accept="image/*" multiple>' +
      '<div class="hint">Upload a clear picture or digital image of your club\'s approved accreditation papers.</div>' +
    '</div>';
}
function wireClubDetailFields(){
  var grid = document.getElementById("cdAccredGrid");
  var inp = document.getElementById("cdAccredInput");
  if (!grid || !inp) return;
  function drawAccred(){
    grid.innerHTML = pendingAccredPhotos.map(function(src,i){
      return '<div class="photo-thumb" style="cursor:pointer;" data-view-accred="'+i+'" title="Click to preview">' +
        '<img src="'+src+'" alt="Accreditation proof '+(i+1)+'">' +
        '<button type="button" data-rm-accred="'+i+'" title="Remove">×</button>' +
      '</div>';
    }).join("");
    grid.querySelectorAll("[data-rm-accred]").forEach(function(b){
      b.addEventListener("click", function(ev){
        ev.stopPropagation();
        pendingAccredPhotos.splice(parseInt(b.getAttribute("data-rm-accred"),10), 1);
        drawAccred();
      });
    });
    grid.querySelectorAll("[data-view-accred]").forEach(function(el){
      el.addEventListener("click", function(){
        var idx = parseInt(el.getAttribute("data-view-accred"),10);
        if (pendingAccredPhotos[idx]) openImagePreviewModal(pendingAccredPhotos[idx], "Proof of Club Accreditation ("+(idx+1)+"/"+pendingAccredPhotos.length+")");
      });
    });
  }
  drawAccred();
  inp.addEventListener("change", async function(ev){
    var files = Array.from(ev.target.files || []);
    ev.target.value = "";
    for (var i=0; i<files.length; i++){
      if (pendingAccredPhotos.length >= MAX_ACCRED_PHOTOS){
        toast("Up to "+MAX_ACCRED_PHOTOS+" accreditation images allowed.", true);
        break;
      }
      try{
        pendingAccredPhotos.push(await compressImage(files[i]));
      }catch(err){
        toast("Couldn't read "+files[i].name+".", true);
      }
    }
    drawAccred();
  });
}
function readClubDetailFields(){
  var a = readPersonFields("cdAdviser");
  var photos = pendingAccredPhotos.slice();
  return {
    clubName: val("cdName"), category: val("cdCategory")||CATEGORIES[0],
    adviserFirstName:a.firstName, adviserMiddleName:a.middleName, adviserLastName:a.lastName, adviserExtName:a.extName, adviserEmail:a.email,
    description: val("cdDesc"),
    accreditationPhotos: photos,
    accreditationProof: photos[0] || null
  };
}

/* ---------- LANDING (logged out): sign in / register ---------- */
function renderLanding(){
  return '<div class="landing"><div class="landing-hero"></div><div class="landing-overlay"></div>' +
    '<div class="landing-content">' +
      '<div class="landing-brandline"><div class="mark">'+logoImg()+'</div><div class="name">Club Console</div><div class="sub">JDJS University · Student Organizations</div></div>' +
      '<div class="gate-tabs" style="justify-content:center;">' +
        '<button class="gate-tab'+(landingTab==="signin"?" active":"")+'" data-landingtab="signin">Sign in</button>' +
        '<button class="gate-tab'+(landingTab==="register"?" active":"")+'" data-landingtab="register">Register a club</button>' +
      '</div>' +
      '<div class="card">' + (landingTab==="signin" ? renderSignInForm() : renderRegisterForm()) + '</div>' +
    '</div></div>';
}
function renderSignInForm(){
  return '<div class="field"><label for="liEmail">Email</label><input id="liEmail" type="email" autocomplete="email"></div>' +
    '<div class="field"><label for="liPassword">Password</label><input id="liPassword" type="password" autocomplete="current-password"></div>' +
    '<button class="btn primary" id="signInBtn" style="width:100%;">Sign in</button>';
}
function renderRegisterForm(){
  return '<p style="font-size:12.5px;color:var(--ink-soft);margin-top:0;">Submit your club\'s details below — the adviser\'s email becomes your sign-in. The registrar will review it, and this page updates as soon as they decide.</p>' +
    clubDetailFieldsHtml(null) +
    '<hr style="border:none;border-top:1px solid var(--line);margin:14px 0;">' +
    '<div class="field-row">'+field("Password","regPassword","password",true)+field("Confirm password","regPassword2","password",true)+'</div>' +
    '<button class="btn primary" id="submitApp" style="width:100%;">Create account &amp; submit application</button>';
}
function wireLanding(){
  document.querySelectorAll("[data-landingtab]").forEach(function(b){
    b.addEventListener("click", function(){ landingTab=b.getAttribute("data-landingtab"); renderApp(); });
  });
  var signInBtn = document.getElementById("signInBtn");
  if (signInBtn) signInBtn.addEventListener("click", async function(){
    var email = normalizeEmail(val("liEmail"));
    var pw = val("liPassword");
    if (!email || !pw){ toast("Enter your email and password.", true); return; }
    var club = state.clubs.find(function(c){ return c.account.application.adviserEmail===email; });
    if (!club){ toast("No club found with that email.", true); return; }
    var hash = await sha256Hex(pw);
    if (hash !== club.passwordHash){ toast("Incorrect password.", true); return; }
    state.sessionEmail = email;
    save(); route="overview"; renderApp();
  });
  var liPw = document.getElementById("liPassword");
  if (liPw) liPw.addEventListener("keydown", function(e){ if (e.key==="Enter") signInBtn.click(); });

  var submitApp = document.getElementById("submitApp");
  if (submitApp){
    wireClubDetailFields();
    submitApp.addEventListener("click", async function(){
      var pw = val("regPassword"), pw2 = val("regPassword2");
      var d = readClubDetailFields();
      if (!d.clubName || !d.adviserFirstName || !d.adviserLastName || !d.adviserEmail){ toast("Please fill in all required fields.", true); return; }
      if (!isEmail(d.adviserEmail)){ toast("Enter a valid email — this will be your sign-in.", true); return; }
      if (!d.accreditationPhotos || !d.accreditationPhotos.length){ toast("Please upload proof of club accreditation (picture or digital copy of approved papers).", true); return; }
      if (state.clubs.some(function(c){ return c.account.application.adviserEmail===d.adviserEmail; })){ toast("That email is already registered to a club.", true); return; }
      if (pw.length < 6){ toast("Password must be at least 6 characters.", true); return; }
      if (pw !== pw2){ toast("Passwords don't match.", true); return; }
      var appId = uid("APP");
      var application = Object.assign({appId:appId, submittedAt:new Date().toISOString()}, d);
      var passwordHash = await sha256Hex(pw);
      var club = {
        passwordHash: passwordHash,
        account: {status:"pending", application:application, officialClubId:null, approvedAt:null, rejectionReason:null, lastAppCode:null, lastApprovalCode:null},
        members: [], events: []
      };
      state.clubs.push(club);
      state.sessionEmail = d.adviserEmail;
      save();
      toast("Application submitted — the registrar will review it.");
      renderApp();
    });
  }
}

/* ---------- PENDING / REJECTED shell (logged in, not yet approved) ---------- */
function renderPendingShell(club){
  var inner = club.account.status==="rejected" ? renderGateRejected(club) : renderGatePending(club);
  return '<div style="min-height:100vh;">' +
    '<div class="pending-topbar"><div class="brand-mark">'+logoImg()+'</div><div class="brand-text"><div class="name">Club Console</div><div class="sub">'+esc(club.account.application.adviserEmail)+'</div></div>' +
      '<button class="btn ghost small" id="logoutBtnPending" style="margin-left:auto;">Log out</button></div>' +
    '<div style="padding:36px 20px;">' + inner + '</div>' +
  '</div>';
}
function renderGatePending(club){
  var a = club.account.application || {};
  var accred = getAccredList(a);
  return '<div class="gate-wrap" style="margin:0 auto;">' +
    '<h1 class="display" style="font-size:24px;margin:0 0 6px;">Application submitted</h1>' +
    '<p style="color:var(--ink-soft);font-size:14px;">"'+esc(a.clubName)+'" is waiting for the registrar\'s review. You don\'t need to do anything else — this page updates automatically as soon as a decision is made.</p>' +
    '<div class="card"><div class="card-title" style="font-size:14px;">Status</div><span class="badge pending">Pending review</span>' +
    '<div style="margin-top:10px;font-size:12.5px;color:var(--ink-soft);">Submitted '+fmtDateTime(a.submittedAt)+'</div>' +
    (accred.length ? '<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--line);"><div style="font-size:12.5px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;">Proof of club accreditation</div><div class="photo-grid">' +
      accred.map(function(src,i){ return '<div class="photo-thumb" style="cursor:pointer;" data-preview-accred="'+i+'" title="Click to view"><img src="'+src+'" alt="Accreditation proof '+(i+1)+'"></div>'; }).join("") +
    '</div></div>' : '') +
    '</div>' +
  '</div>';
}
function renderGateRejected(club){
  if (gateTab==="revise"){
    return '<div class="gate-wrap" style="margin:0 auto;">' +
      '<h1 class="display" style="font-size:22px;margin:0 0 6px;">Revise application</h1>' +
      '<div class="card">' + clubDetailFieldsHtml(club.account.application) + '<button class="btn primary" id="resubmitApp" style="width:100%;">Resubmit</button></div>' +
    '</div>';
  }
  return '<div class="gate-wrap" style="margin:0 auto;">' +
    '<h1 class="display" style="font-size:22px;margin:0 0 6px;">Application not approved</h1>' +
    '<p style="color:var(--ink-soft);font-size:14px;">Reason given: '+esc(club.account.rejectionReason||"No reason given.")+'</p>' +
    '<button class="btn primary" id="startRevise">Revise &amp; resubmit</button>' +
  '</div>';
}
function wirePendingShell(club){
  var logout = document.getElementById("logoutBtnPending");
  if (logout) logout.addEventListener("click", function(){ state.sessionEmail=null; gateTab=""; save(); renderApp(); });

  var accred = getAccredList(club.account && club.account.application);
  document.querySelectorAll("[data-preview-accred]").forEach(function(el){
    el.addEventListener("click", function(){
      var idx = parseInt(el.getAttribute("data-preview-accred"),10);
      if (accred[idx]) openImagePreviewModal(accred[idx], "Proof of Club Accreditation ("+(idx+1)+"/"+accred.length+")");
    });
  });

  var startRevise = document.getElementById("startRevise");
  if (startRevise) startRevise.addEventListener("click", function(){ gateTab="revise"; renderApp(); });
  var resubmitApp = document.getElementById("resubmitApp");
  if (resubmitApp){
    wireClubDetailFields();
    resubmitApp.addEventListener("click", function(){
      var d = readClubDetailFields();
      if (!d.clubName || !d.adviserFirstName || !d.adviserLastName || !d.adviserEmail){ toast("Please fill in all required fields.", true); return; }
      if (!isEmail(d.adviserEmail)){ toast("Enter valid email addresses.", true); return; }
      if (!d.accreditationPhotos || !d.accreditationPhotos.length){ toast("Please upload proof of club accreditation (picture or digital copy of approved papers).", true); return; }
      var appId = uid("APP");
      var application = Object.assign({appId:appId, submittedAt:new Date().toISOString()}, d);
      club.account = {status:"pending", application:application, officialClubId:null, approvedAt:null, rejectionReason:null, lastAppCode:null, lastApprovalCode:null};
      state.sessionEmail = d.adviserEmail;
      gateTab = "";
      save();
      toast("Application resubmitted.");
      renderApp();
    });
  }
}
