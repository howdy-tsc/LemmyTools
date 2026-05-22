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
  const DISCOVERED_COMMS_KEY = "LT_discoveredCommunities";
  const DISCOVERED_COMMS_LIMIT = 200;
  const COMM_VISITS_KEY = "LT_communityVisits";
  const COMM_GROUPS_KEY = "LT_communityGroups";

  const DEFAULTS = {
    commposSide: "top",
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
    linksInNewTab: "off",
    commsSortMode: "alpha"
  };

  // Tri-state values for linksInNewTab. Older builds stored a boolean —
  // normalize that on read so existing profiles upgrade transparently.
  const LINKS_MODES = new Set(["off", "external", "all"]);
  function normalizeLinksInNewTab(v) {
    if (v === true) return "all";
    if (v === false || v == null) return "off";
    return LINKS_MODES.has(v) ? v : "off";
  }

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
    merged.linksInNewTab = normalizeLinksInNewTab(merged.linksInNewTab);
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

  async function getDiscoveredCommunities() {
    const r = await browser.storage.local.get(DISCOVERED_COMMS_KEY);
    const raw = r[DISCOVERED_COMMS_KEY];
    return Array.isArray(raw) ? raw : [];
  }

  async function recordDiscoveredCommunity(name, instance) {
    if (!name || !instance) return;
    const list = await getDiscoveredCommunities();
    const idx = list.findIndex(
      (c) => c && c.name === name && c.instance === instance
    );
    const now = Date.now();
    if (idx >= 0) {
      list[idx].lastSeen = now;
      list[idx].visits = (list[idx].visits || 1) + 1;
    } else {
      list.push({
        name,
        instance,
        firstSeen: now,
        lastSeen: now,
        visits: 1
      });
      if (list.length > DISCOVERED_COMMS_LIMIT) {
        list.splice(0, list.length - DISCOVERED_COMMS_LIMIT);
      }
    }
    await browser.storage.local.set({ [DISCOVERED_COMMS_KEY]: list });
    return list;
  }

  async function removeDiscoveredCommunity(name, instance) {
    const list = await getDiscoveredCommunities();
    const next = list.filter(
      (c) => !(c && c.name === name && c.instance === instance)
    );
    await browser.storage.local.set({ [DISCOVERED_COMMS_KEY]: next });
    return next;
  }

  async function clearDiscoveredCommunities() {
    await browser.storage.local.set({ [DISCOVERED_COMMS_KEY]: [] });
  }

  async function getCommunityVisits() {
    const r = await browser.storage.local.get(COMM_VISITS_KEY);
    const v = r[COMM_VISITS_KEY];
    return v && typeof v === "object" ? v : {};
  }

  async function recordCommunityVisit(key) {
    if (!key) return;
    const visits = await getCommunityVisits();
    visits[key] = Date.now();
    await browser.storage.local.set({ [COMM_VISITS_KEY]: visits });
    return visits;
  }

  async function clearCommunityVisits() {
    await browser.storage.local.set({ [COMM_VISITS_KEY]: {} });
  }

  async function getCommunityGroups() {
    const r = await browser.storage.local.get(COMM_GROUPS_KEY);
    const list = r[COMM_GROUPS_KEY];
    if (!Array.isArray(list)) return [];
    return list
      .filter((g) => g && typeof g === "object" && g.id && g.name)
      .map((g) => ({
        id: String(g.id),
        name: String(g.name),
        members: Array.isArray(g.members)
          ? g.members.filter(Boolean).map(String)
          : []
      }));
  }

  async function setCommunityGroups(groups) {
    const safe = Array.isArray(groups) ? groups : [];
    await browser.storage.local.set({ [COMM_GROUPS_KEY]: safe });
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
    getDiscoveredCommunities,
    recordDiscoveredCommunity,
    removeDiscoveredCommunity,
    clearDiscoveredCommunities,
    getCommunityVisits,
    recordCommunityVisit,
    clearCommunityVisits,
    getCommunityGroups,
    setCommunityGroups,
    onChanged
  };
})();
