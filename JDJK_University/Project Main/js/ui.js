"use strict";
/* ---- shared: modal ---- */
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
