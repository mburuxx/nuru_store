export function $(sel, root=document){ return root.querySelector(sel); }

export function setAuthStatus(text){
  const el = document.getElementById("authStatus");
  if (el) el.textContent = text;
}

export function showLogoutBtn(show){
  const btn = document.getElementById("btnLogout");
  if (!btn) return;
  btn.style.display = show ? "inline-flex" : "none";
}

export function mount(html){
  document.getElementById("app").innerHTML = html;
}