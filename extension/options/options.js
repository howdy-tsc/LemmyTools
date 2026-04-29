"use strict";

const KEY = "LemmyToolsOptions";

const FIELDS = {
  instance: "instance",
  commposSide: "commposSide",
  commposVertical: "commposVertical",
  hoverCheck: "hoverCheck",
  hideSideBar: "hideSideBar",
  expandImages: "expandImages",
  expandImagesize: "expandImagesize",
  expandImageSpeed: "expandImageSpeed",
  showAllImages: "showAllImages",
  hideShowAllImagesButton: "hideShowAllImagesButton",
  unblurNSFW: "unblurNSFW",
  linksInNewTab: "linksInNewTab",
  blockContent: "blockContent"
};

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

async function load() {
  const r = await browser.storage.local.get(KEY);
  const settings = Object.assign({}, DEFAULTS, r[KEY] || {});

  for (const id of Object.keys(FIELDS)) {
    const el = $(id);
    if (!el) continue;
    if (el.type === "checkbox") el.checked = !!settings[id];
    else el.value = settings[id] ?? "";
  }

  $("widthPixels").checked = !!settings.widthPixels;
  $("widthPercent").checked = !settings.widthPixels;

  const filters = Array.isArray(settings.blockFilters)
    ? settings.blockFilters
    : String(settings.blockFilters || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
  $("blockFilters").value = filters.join("\n");
}

function clamp(n, lo, hi, fallback) {
  n = Number(n);
  if (Number.isNaN(n)) return fallback;
  return Math.min(hi, Math.max(lo, n));
}

async function save() {
  const settings = Object.assign({}, DEFAULTS);

  settings.instance = $("instance").value.trim();
  settings.commposSide = $("commposSide").value;
  settings.reverseSide = settings.commposSide === "left" ? "right" : "left";
  settings.commposVertical = clamp($("commposVertical").value, 0, 85, 0);
  settings.hoverCheck = $("hoverCheck").checked;
  settings.hideSideBar = $("hideSideBar").checked;
  settings.expandImages = $("expandImages").checked;
  settings.expandImagesize = clamp($("expandImagesize").value, 1, 2000, 50);
  settings.expandImageSpeed = clamp($("expandImageSpeed").value, 0, 1, 0.5);
  settings.showAllImages = $("showAllImages").checked;
  settings.hideShowAllImagesButton = $("hideShowAllImagesButton").checked;
  settings.unblurNSFW = $("unblurNSFW").checked;
  settings.linksInNewTab = $("linksInNewTab").checked;
  settings.blockContent = $("blockContent").checked;
  settings.widthPixels = $("widthPixels").checked;

  settings.blockFilters = $("blockFilters").value
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);

  await browser.storage.local.set({ [KEY]: settings });
  flashStatus("Saved.");
}

let statusTimer;
function flashStatus(msg) {
  const el = $("status");
  el.textContent = msg;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => (el.textContent = ""), 1500);
}

document.addEventListener("DOMContentLoaded", () => {
  load().catch((e) => {
    console.error(e);
    flashStatus("Failed to load.");
  });
  $("save").addEventListener("click", () =>
    save().catch((e) => {
      console.error(e);
      flashStatus("Save failed.");
    })
  );
  document.getElementById("options-form").addEventListener("submit", (e) => {
    e.preventDefault();
    save();
  });
});
