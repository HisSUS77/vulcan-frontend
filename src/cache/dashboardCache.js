/**
 * Module-level dashboard cache.
 * Survives React route changes (unlike useState), cleared on page reload.
 * Invalidated explicitly when a scan or patch is triggered.
 */

const _cache = {
  summary:      null,
  recentScans:  null,
  patchStats:   null,
  notifications: null,
  dirty:        true,   // true = must re-fetch on next dashboard visit
};

export function getDashboardCache() {
  return _cache;
}

export function setDashboardCache(data) {
  Object.assign(_cache, data, { dirty: false });
  // Mirror to localStorage so a hard-reload still gets instant first paint
  try {
    if (data.summary)      localStorage.setItem("dc_summary",      JSON.stringify(data.summary));
    if (data.recentScans)  localStorage.setItem("dc_recentScans",  JSON.stringify(data.recentScans));
    if (data.patchStats)   localStorage.setItem("dc_patchStats",   JSON.stringify(data.patchStats));
    if (data.notifications)localStorage.setItem("dc_notifications", JSON.stringify(data.notifications));
  } catch {}
}

export function markDashboardDirty() {
  _cache.dirty = true;
}

/** Load localStorage into the in-memory cache on first import (page reload). */
(function hydrateFromStorage() {
  try {
    const s  = localStorage.getItem("dc_summary");
    const r  = localStorage.getItem("dc_recentScans");
    const p  = localStorage.getItem("dc_patchStats");
    const n  = localStorage.getItem("dc_notifications");
    if (s)  _cache.summary       = JSON.parse(s);
    if (r)  _cache.recentScans   = JSON.parse(r);
    if (p)  _cache.patchStats    = JSON.parse(p);
    if (n)  _cache.notifications = JSON.parse(n);
    // After reload, treat cache as dirty so fresh data is fetched in background
    _cache.dirty = true;
  } catch {}
})();

// Listen for invalidation events dispatched by ScanPage / PatchGeneratorPage
window.addEventListener("vulcan:scan-started",    markDashboardDirty);
window.addEventListener("vulcan:patch-generated", markDashboardDirty);
