"use strict";

const KEY = "LemmyToolsOptions";

const TOGGLES = [
  "hoverCheck",
  "hideSideBar",
  "expandImages",
  "showAllImages",
  "unblurNSFW",
  "linksInNewTab",
  "blockContent"
];

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

  const manifest = browser.runtime.getManifest();
  $("version").textContent = `v${manifest.version}`;
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    settings.reverseSide = settings.commposSide === "left" ? "right" : "left";
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
    el.textContent = `Active on ${u.host}.`;
    el.classList.add("ok");
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
