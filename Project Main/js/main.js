"use strict";
/* ---------- boot ---------- */
load();
renderApp();
/* pick up club activity live (applications, event submissions, member and event counts) */
Store.subscribe(function(){
  if (userIsBusy()) return;
  syncShared(); renderApp();
});
