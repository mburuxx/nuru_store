export function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

export function setJson(id, obj) {
  const el = document.getElementById(id);
  if (el) el.textContent = JSON.stringify(obj, null, 2);
}