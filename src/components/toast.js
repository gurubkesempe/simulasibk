/* ============================================================
   COMPONENTS / TOAST
   ============================================================ */
import { $ } from '../utils/dom.js';

let toastTimer = null;

export function toast(msg, type = '') {
  const t = $('#toast');
  if (!t) return;
  
  let icon = '';
  if (type === 'success') icon = '<i class="fa-solid fa-circle-check"></i> ';
  else if (type === 'error') icon = '<i class="fa-solid fa-circle-exclamation"></i> ';
  
  t.innerHTML = `${icon}<span>${msg}</span>`;
  t.className = 'toast show' + (type ? ' ' + type : '');
  
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.classList.remove('show');
  }, 3200);
}
