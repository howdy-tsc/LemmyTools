"use strict";

// Single async wrapper around browser.storage.local with a one-time
// migration that copies the legacy userscript's localStorage values.
// Exposed as window.LemmyToolsStorage; the content script awaits init()
// before doing anything else.

(function () {
  const OPTIONS_KEY = "LemmyToolsOptions";
  const NOTES_KEY = "LemmyToolsOptions-userNotes";
  const COMMS_KEY = "localComms";
  const SEARCH_HISTORY_KEY = "prevSearchCommsQueries";
  const MIGRATION_FLAG = "LT_migrated_from_localStorage";

  const DEFAULTS = {
    commposSide: "top",
    reverseSide: "right",
    instance: "",
    commposVertical: 0,
    expandImages: true,
    hideSideBar: false,
    expandImagesize: 50,
    hoverCheck: false,
    unblurNSFW: false,
    widthPixels: false,
    blockContent: false,
    blockFilters: [],
    expandImageSpeed: 0.5,
    showAllImages: false,
    hideShowAllImagesButton: false,
    linksInNewTab: false
  };

  async function migrateFromLocalStorageOnce() {
    try {
      const flag = await browser.storage.local.get(MIGRATION_FLAG);
      if (flag[MIGRATION_FLAG]) return;
    } catch (_) {
      return;
    }

    const updates = { [MIGRATION_FLAG]: true };

    try {
      const opts = window.localStorage.getItem(OPTIONS_KEY);
      if (opts) {
        const parsed = JSON.parse(opts);
        // legacy stored blockFilters as comma-string sometimes
        if (typeof parsed.blockFilters === "string") {
          parsed.blockFilters = parsed.blockFilters
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }
        updates[OPTIONS_KEY] = parsed;
      }
    } catch (_) {}

    try {
      const notes = window.localStorage.getItem(NOTES_KEY);
      if (notes) updates[NOTES_KEY] = JSON.parse(notes);
    } catch (_) {}

    try {
      const comms = window.localStorage.getItem(COMMS_KEY);
      if (comms) updates[COMMS_KEY] = comms;
    } catch (_) {}

    try {
      const hist = window.localStorage.getItem(SEARCH_HISTORY_KEY);
      if (hist) updates[SEARCH_HISTORY_KEY] = hist.split(",").filter(Boolean);
    } catch (_) {}

    await browser.storage.local.set(updates);
  }

  async function getSettings() {
    const r = await browser.storage.local.get(OPTIONS_KEY);
    const stored = r[OPTIONS_KEY] || {};
    const merged = Object.assign({}, DEFAULTS, stored);
    if (!merged.instance) merged.instance = window.location.origin;
    if (typeof merged.blockFilters === "string") {
      merged.blockFilters = merged.blockFilters
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return merged;
  }

  async function setSettings(next) {
    await browser.storage.local.set({ [OPTIONS_KEY]: next });
  }

  async function getUserNotes() {
    const r = await browser.storage.local.get(NOTES_KEY);
    try {
      return new Map(r[NOTES_KEY] || []);
    } catch (_) {
      return new Map();
    }
  }

  async function setUserNotes(map) {
    await browser.storage.local.set({
      [NOTES_KEY]: Array.from(map)
    });
  }

  async function getCachedComms() {
    const r = await browser.storage.local.get(COMMS_KEY);
    return r[COMMS_KEY] || "";
  }

  async function setCachedComms(html) {
    await browser.storage.local.set({ [COMMS_KEY]: html });
  }

  async function getSearchHistory() {
    const r = await browser.storage.local.get(SEARCH_HISTORY_KEY);
    return r[SEARCH_HISTORY_KEY] || [];
  }

  async function pushSearchHistory(query) {
    const hist = await getSearchHistory();
    if (hist[hist.length - 1] === query) return;
    hist.push(query);
    if (hist.length > 50) hist.splice(0, hist.length - 50);
    await browser.storage.local.set({ [SEARCH_HISTORY_KEY]: hist });
  }

  function onChanged(callback) {
    browser.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      callback(changes);
    });
  }

  window.LemmyToolsStorage = {
    DEFAULTS,
    init: migrateFromLocalStorageOnce,
    getSettings,
    setSettings,
    getUserNotes,
    setUserNotes,
    getCachedComms,
    setCachedComms,
    getSearchHistory,
    pushSearchHistory,
    onChanged
  };
})();
