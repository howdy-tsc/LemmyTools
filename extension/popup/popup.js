"use strict";

const KEY = "LemmyToolsOptions";

const TOGGLES = [
  "hoverCheck",
  "hideSideBar",
  "expandImages",
  "showAllImages",
  "unblurNSFW",
  "blockContent"
];

const LINKS_IN_NEW_TAB_VALUES = new Set(["off", "external", "all"]);
function normalizeLinksInNewTab(v) {
  if (v === true) return "all";
  if (v === false || v == null) return "off";
  return LINKS_IN_NEW_TAB_VALUES.has(v) ? v : "off";
}

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
  linksInNewTab: "off"
};

function $(id) { return document.getElementById(id); }

let settings = Object.assign({}, DEFAULTS);
let saveTimer = null;

async function load() {
  const r = await browser.storage.local.get(KEY);
  settings = Object.assign({}, DEFAULTS, r[KEY] || {});

  for (const id of TOGGLES) {
    const el = $(id);
    if (el) el.checked = !!settings[id];
  }
  $("commposSide").value = settings.commposSide || "top";
  $("linksInNewTab").value = normalizeLinksInNewTab(settings.linksInNewTab);
  $("instance").value = settings.instance || "";
  refreshInstanceHint();

  const manifest = browser.runtime.getManifest();
  $("version").textContent = `v${manifest.version}`;
}

function normalizeHost(s) {
  if (!s) return "";
  let h = String(s).trim();
  try { h = new URL(h.includes("://") ? h : `https://${h}`).hostname; }
  catch (_) {}
  return h.toLowerCase().replace(/^www\./, "");
}

let activeTabHost = "";

function refreshInstanceHint() {
  const hint = $("instance-hint");
  const section = $("home-section");
  const trimmed = (settings.instance || "").trim();
  if (!trimmed) {
    section.classList.add("warn");
    hint.textContent = "Not set. Off-instance features won't work until you do.";
    return;
  }
  section.classList.remove("warn");
  const homeHost = normalizeHost(trimmed);
  if (activeTabHost && homeHost && activeTabHost === homeHost) {
    hint.textContent = `On home — ${homeHost}.`;
  } else if (activeTabHost && homeHost) {
    hint.textContent = `Off home (this tab is ${activeTabHost}). Home stays ${homeHost}.`;
  } else {
    hint.textContent = `Home: ${homeHost}.`;
  }
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await browser.storage.local.set({ [KEY]: settings });
    } catch (e) {
      console.error("[LemmyTools popup] save failed", e);
    }
  }, 80);
}

function bindToggle(id) {
  const el = $(id);
  if (!el) return;
  el.addEventListener("change", () => {
    settings[id] = el.checked;
    scheduleSave();
  });
}

async function showSiteStatus() {
  const el = $("lemmy-status");
  try {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true
    });
    if (!tab || !tab.url) {
      el.textContent = "No active tab.";
      el.classList.add("warn");
      return;
    }
    const u = new URL(tab.url);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      el.textContent = "Toggles take effect on Lemmy pages.";
      el.classList.add("warn");
      return;
    }
    activeTabHost = normalizeHost(u.host);
    el.textContent = `Active on ${u.host}.`;
    el.classList.add("ok");
    refreshInstanceHint();
  } catch (_) {
    el.classList.add("hidden");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  load().catch((e) => {
    console.error("[LemmyTools popup] load failed", e);
    const el = $("lemmy-status");
    el.textContent = "Failed to load settings.";
    el.classList.add("warn");
  });
  showSiteStatus();

  for (const id of TOGGLES) bindToggle(id);

  $("commposSide").addEventListener("change", (e) => {
    settings.commposSide = e.target.value;
    scheduleSave();
  });

  $("linksInNewTab").addEventListener("change", (e) => {
    settings.linksInNewTab = normalizeLinksInNewTab(e.target.value);
    scheduleSave();
  });

  // Persist on blur and on Enter — don't write a half-typed URL on every
  // keystroke. Re-render the hint live so the warn state clears as you type.
  const instanceEl = $("instance");
  instanceEl.addEventListener("input", () => {
    settings.instance = instanceEl.value.trim();
    refreshInstanceHint();
  });
  instanceEl.addEventListener("blur", () => {
    settings.instance = instanceEl.value.trim();
    scheduleSave();
    refreshInstanceHint();
  });
  instanceEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      settings.instance = instanceEl.value.trim();
      scheduleSave();
      refreshInstanceHint();
      instanceEl.blur();
    }
  });

  async function openSettings() {
    try {
      await browser.runtime.openOptionsPage();
    } catch (e) {
      console.error("[LemmyTools popup] openOptionsPage failed", e);
      try {
        await browser.tabs.create({
          url: browser.runtime.getURL("options/options.html")
        });
      } catch (e2) {
        console.error("[LemmyTools popup] tabs.create fallback failed", e2);
      }
    }
    window.close();
  }

  $("open-options").addEventListener("click", openSettings);
  $("header-options").addEventListener("click", openSettings);

  $("reload-link").addEventListener("click", async (e) => {
    e.preventDefault();
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true
    });
    if (tab && tab.id) browser.tabs.reload(tab.id);
    window.close();
  });
});
