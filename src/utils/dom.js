/* ============================================================
   UTILS / DOM HELPER
   ============================================================ */

export function $(sel, ctx = document) {
  return ctx.querySelector(sel);
}

export function $all(sel, ctx = document) {
  return Array.from(ctx.querySelectorAll(sel));
}

export function showLoading(show) {
  const overlay = $('#loadingOverlay');
  if (overlay) {
    overlay.classList.toggle('show', Boolean(show));
  }
}
