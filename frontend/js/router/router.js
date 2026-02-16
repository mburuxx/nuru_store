import { getAccess } from "../state/auth.js";

export function navigate(hash){
  window.location.hash = hash;
}

export function requireAuth(){
  return !!getAccess();
}