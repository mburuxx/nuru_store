let t = null;

export function toast(msg){
  const el = document.getElementById("toast");
  if (!el) return;

  el.textContent = msg;
  el.style.display = "block";

  clearTimeout(t);
  t = setTimeout(() => {
    el.style.display = "none";
    el.textContent = "";
  }, 2500);
}