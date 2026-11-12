/* ---------- boot ---------- */
async function boot(){
  await load();
  renderApp();
  /* pick up registrar decisions live (approval, event reviews) */
  Store.subscribe(function(){
    if (userIsBusy()) return;
    state.clubs = Store.read().clubs;
    renderApp();
  });
}
window.addEventListener("hashchange", function(){ renderApp(); });
boot();
