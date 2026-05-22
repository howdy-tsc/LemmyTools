"use strict";

const KEY = "LemmyToolsOptions";

const FIELDS = {
  instance: "instance",
  commposSide: "commposSide",
  commposVertical: "commposVertical",
  hoverCheck: "hoverCheck",
  commsSortMode: "commsSortMode",
  hideSideBar: "hideSideBar",
  expandImages: "expandImages",
  expandImagesize: "expandImagesize",
  expandImageSpeed: "expandImageSpeed",
  unblurNSFW: "unblurNSFW",
  blockContent: "blockContent"
};

// Storage keeps two booleans (showAllImages, hideShowAllImagesButton)
// that the content script reads. The options UI collapses them into a
// single 3-way select since (showAllImages=true, hide=true) is a
// nonsense state — auto-open already hides the button.
function imagePostModeFromSettings(s) {
  if (s.showAllImages) return "auto";
  if (s.hideShowAllImagesButton) return "hidden";
  return "manual";
}
function imagePostModeToSettings(mode) {
  switch (mode) {
    case "auto":   return { showAllImages: true,  hideShowAllImagesButton: false };
    case "hidden": return { showAllImages: false, hideShowAllImagesButton: true  };
    default:       return { showAllImages: false, hideShowAllImagesButton: false };
  }
}

function updateVerticalVisibility() {
  const row = $("commposVerticalRow");
  if (!row) return;
  row.style.display = $("commposSide").value === "top" ? "none" : "";
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
  linksInNewTab: "off",
  commsSortMode: "alpha"
};

const LINKS_IN_NEW_TAB_VALUES = new Set(["off", "external", "all"]);
function normalizeLinksInNewTab(v) {
  if (v === true) return "all";
  if (v === false || v == null) return "off";
  return LINKS_IN_NEW_TAB_VALUES.has(v) ? v : "off";
}

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

  $("imagePostMode").value = imagePostModeFromSettings(settings);
  updateVerticalVisibility();

  const linksMode = normalizeLinksInNewTab(settings.linksInNewTab);
  const linksRadio = document.querySelector(
    `input[name="linksInNewTab"][value="${linksMode}"]`
  );
  if (linksRadio) linksRadio.checked = true;

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
  settings.commposVertical = clamp($("commposVertical").value, 0, 85, 0);
  settings.hoverCheck = $("hoverCheck").checked;
  settings.commsSortMode = $("commsSortMode").value === "recent" ? "recent" : "alpha";
  settings.hideSideBar = $("hideSideBar").checked;
  settings.expandImages = $("expandImages").checked;
  settings.expandImagesize = clamp($("expandImagesize").value, 1, 2000, 50);
  settings.expandImageSpeed = clamp($("expandImageSpeed").value, 0, 1, 0.5);
  Object.assign(settings, imagePostModeToSettings($("imagePostMode").value));
  settings.unblurNSFW = $("unblurNSFW").checked;
  const checkedLinks = document.querySelector('input[name="linksInNewTab"]:checked');
  settings.linksInNewTab = normalizeLinksInNewTab(checkedLinks ? checkedLinks.value : "off");
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

const DISCOVERED_KEY = "LT_discoveredCommunities";
const GROUPS_KEY = "LT_communityGroups";

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function loadDiscovered() {
  const r = await browser.storage.local.get(DISCOVERED_KEY);
  const list = Array.isArray(r[DISCOVERED_KEY]) ? r[DISCOVERED_KEY] : [];
  renderDiscovered(list);
}

function renderDiscovered(list) {
  const ul = $("discoveredList");
  const count = $("discoveredCount");
  ul.innerHTML = "";
  if (!list.length) {
    count.textContent = "No discovered communities yet.";
    return;
  }
  count.textContent = `${list.length} discovered ${list.length === 1 ? "community" : "communities"}.`;
  const sorted = list
    .slice()
    .sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
  for (const c of sorted) {
    const li = document.createElement("li");
    li.innerHTML = `<span>${escapeHtml(c.name)}@${escapeHtml(c.instance)}</span>
      <button type="button" data-name="${escapeHtml(c.name)}" data-instance="${escapeHtml(c.instance)}">remove</button>`;
    ul.appendChild(li);
  }
  ul.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const name = btn.dataset.name;
      const instance = btn.dataset.instance;
      const r = await browser.storage.local.get(DISCOVERED_KEY);
      const next = (Array.isArray(r[DISCOVERED_KEY]) ? r[DISCOVERED_KEY] : [])
        .filter((c) => !(c && c.name === name && c.instance === instance));
      await browser.storage.local.set({ [DISCOVERED_KEY]: next });
      renderDiscovered(next);
    });
  });
}

// ---------------- Community groups ----------------------------------

const COMMS_KEY = "localComms";

let groupsCache = [];
// Lowercased, deduped, sorted list of community keys scraped from the
// user's home-instance sidebar (populated by the content script and
// cached under `localComms`). Drives the per-group search picker.
let subscribedKeys = [];

async function loadGroups() {
  const r = await browser.storage.local.get(GROUPS_KEY);
  const list = Array.isArray(r[GROUPS_KEY]) ? r[GROUPS_KEY] : [];
  groupsCache = list.map((g) => ({
    id: String(g.id || ""),
    name: String(g.name || ""),
    members: Array.isArray(g.members) ? g.members.map(String) : []
  }));
  renderGroups();
}

async function loadSubscribedKeys() {
  try {
    const r = await browser.storage.local.get(COMMS_KEY);
    const html = r[COMMS_KEY] || "";
    if (!html) {
      subscribedKeys = [];
      return;
    }
    const tpl = document.createElement("template");
    tpl.innerHTML = `<ul>${html}</ul>`;
    const seen = new Set();
    tpl.content.querySelectorAll("a[href*='/c/']").forEach((a) => {
      const href = a.getAttribute("href") || "";
      const idx = href.indexOf("/c/");
      if (idx < 0) return;
      const tail = href.slice(idx + 3).split(/[?#/]/)[0];
      if (!tail) return;
      let key = tail;
      try { key = decodeURIComponent(tail); } catch (_) {}
      seen.add(key.toLowerCase());
    });
    subscribedKeys = [...seen].sort();
  } catch (e) {
    console.error("[LemmyTools options] subscribed-keys load failed", e);
    subscribedKeys = [];
  }
}

async function saveGroups() {
  await browser.storage.local.set({ [GROUPS_KEY]: groupsCache });
}

function makeGroupId() {
  return "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Compact group manager: each group is a small pill with an inline-edit
// name input, a member count, reorder buttons, and a delete X. The
// shared chip picker (above) is the only way to assign communities to
// groups now — there's no per-group textarea anymore.
function renderGroups() {
  const root = $("groupsList");
  root.innerHTML = "";
  if (!groupsCache.length) {
    const note = document.createElement("div");
    note.className = "muted-note";
    note.textContent = "No groups yet — add one below.";
    root.appendChild(note);
    return;
  }

  const bar = document.createElement("div");
  bar.className = "lt-groups-bar";

  for (const g of groupsCache) {
    const pill = document.createElement("div");
    pill.className = "lt-group-pill";
    pill.dataset.id = g.id;
    const memberCount = g.members.length;
    pill.innerHTML = `
      <input type="text" class="lt-group-name" value="${escapeHtml(g.name)}"
             aria-label="Group name" />
      <span class="lt-group-count" title="${memberCount} member${memberCount === 1 ? "" : "s"}">${memberCount}</span>
      <button type="button" class="lt-group-up" title="Move up" aria-label="Move up">↑</button>
      <button type="button" class="lt-group-down" title="Move down" aria-label="Move down">↓</button>
      <button type="button" class="lt-group-delete" title="Delete group" aria-label="Delete group">✕</button>
    `;
    bar.appendChild(pill);

    pill.querySelector(".lt-group-name").addEventListener("input", (e) => {
      const target = groupsCache.find((x) => x.id === g.id);
      if (target) {
        target.name = e.target.value;
        saveGroups();
        refreshSharedPicker();
      }
    });
    pill.querySelector(".lt-group-delete").addEventListener("click", () => {
      groupsCache = groupsCache.filter((x) => x.id !== g.id);
      saveGroups();
      renderGroups();
      refreshSharedPicker();
    });
    pill.querySelector(".lt-group-up").addEventListener("click", () => {
      const idx = groupsCache.findIndex((x) => x.id === g.id);
      if (idx > 0) {
        const [item] = groupsCache.splice(idx, 1);
        groupsCache.splice(idx - 1, 0, item);
        saveGroups();
        renderGroups();
        refreshSharedPicker();
      }
    });
    pill.querySelector(".lt-group-down").addEventListener("click", () => {
      const idx = groupsCache.findIndex((x) => x.id === g.id);
      if (idx >= 0 && idx < groupsCache.length - 1) {
        const [item] = groupsCache.splice(idx, 1);
        groupsCache.splice(idx + 1, 0, item);
        saveGroups();
        renderGroups();
        refreshSharedPicker();
      }
    });
  }

  root.appendChild(bar);
}

// Surgical update of a single group's pill count without a full
// renderGroups (which would blow away the user's focus inside the name
// input). Called from the chip toggle handler.
function updateGroupPillCount(groupId, count) {
  const pill = document.querySelector(`.lt-group-pill[data-id="${groupId}"]`);
  if (!pill) return;
  const el = pill.querySelector(".lt-group-count");
  if (!el) return;
  el.textContent = String(count);
  el.title = `${count} member${count === 1 ? "" : "s"}`;
}

// One-search-for-all-groups picker. Lives above the group list, shows
// each subscribed community once, and exposes a chip per group so the
// user can toggle a community across multiple groups in a single pass.
//
// Built once, then `render()` is re-invoked any time something the
// chips depend on changes (groups added/removed/renamed, textarea
// edits, etc.). Re-render only swaps out the result list — the search
// input and its focus/value persist, so the user can keep typing after
// every toggle.
let sharedPickerRender = null;

function refreshSharedPicker() {
  if (sharedPickerRender) sharedPickerRender();
}

function setupSharedPicker() {
  const root = $("groupsPicker");
  if (!root) return;
  root.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "lt-shared-picker";

  const label = document.createElement("div");
  label.className = "lt-shared-picker-label";
  wrap.appendChild(label);

  if (!subscribedKeys.length) {
    label.classList.add("muted-note");
    label.textContent =
      "No subscribed communities cached yet. Open your home Lemmy instance once with the LemmyTools sidebar enabled and reload this page.";
    root.appendChild(wrap);
    sharedPickerRender = null;
    return;
  }

  const input = document.createElement("input");
  input.type = "text";
  input.className = "lt-shared-picker-search";
  input.placeholder = "Search subscribed communities…";
  wrap.appendChild(input);

  const list = document.createElement("ul");
  list.className = "lt-shared-picker-results";
  wrap.appendChild(list);

  function render() {
    label.textContent = `Search your ${subscribedKeys.length} subscribed communities — toggle the chips to add/remove from each group:`;

    const q = (input.value || "").trim().toLowerCase();
    const max = q ? 100 : 25;
    list.innerHTML = "";

    if (!groupsCache.length) {
      const li = document.createElement("li");
      li.className = "lt-shared-picker-more";
      li.textContent = "Add a group below first, then come back here to fill it.";
      list.appendChild(li);
      return;
    }

    let shown = 0;
    let matched = 0;
    for (const key of subscribedKeys) {
      if (q && !key.includes(q)) continue;
      matched++;
      if (shown >= max) continue;
      shown++;

      const li = document.createElement("li");

      const keyEl = document.createElement("div");
      keyEl.className = "lt-shared-picker-key";
      keyEl.textContent = key;
      li.appendChild(keyEl);

      const chips = document.createElement("div");
      chips.className = "lt-shared-picker-chips";
      for (const g of groupsCache) {
        const inGroup = g.members.some((m) => m.toLowerCase() === key);
        const chip = document.createElement("label");
        chip.className = "lt-shared-picker-chip";
        if (inGroup) chip.classList.add("on");
        chip.title = inGroup
          ? `In "${g.name}" — click to remove`
          : `Add to "${g.name}"`;

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = inGroup;
        cb.tabIndex = -1; // chip itself is focusable via the label
        const txt = document.createElement("span");
        txt.textContent = g.name || "(unnamed)";
        chip.appendChild(cb);
        chip.appendChild(txt);
        chips.appendChild(chip);

        cb.addEventListener("change", () => {
          const target = groupsCache.find((x) => x.id === g.id);
          if (!target) return;
          if (cb.checked) {
            if (!target.members.some((m) => m.toLowerCase() === key)) {
              target.members.push(key);
            }
          } else {
            target.members = target.members.filter(
              (m) => m.toLowerCase() !== key
            );
          }
          chip.classList.toggle("on", cb.checked);
          chip.title = cb.checked
            ? `In "${target.name}" — click to remove`
            : `Add to "${target.name}"`;
          updateGroupPillCount(target.id, target.members.length);
          saveGroups();
        });
      }
      li.appendChild(chips);
      list.appendChild(li);
    }

    if (q && matched > shown) {
      const more = document.createElement("li");
      more.className = "lt-shared-picker-more";
      more.textContent = `…${matched - shown} more — refine your search`;
      list.appendChild(more);
    } else if (!q && subscribedKeys.length > shown) {
      const more = document.createElement("li");
      more.className = "lt-shared-picker-more";
      more.textContent = `Showing ${shown} of ${subscribedKeys.length}. Type to find more.`;
      list.appendChild(more);
    } else if (q && matched === 0) {
      const empty = document.createElement("li");
      empty.className = "lt-shared-picker-more";
      empty.textContent = "No matches in your subscriptions.";
      list.appendChild(empty);
    }
  }

  let debounce;
  input.addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(render, 60);
  });

  root.appendChild(wrap);
  sharedPickerRender = render;
  render();
}

async function loadCredits() {
  const ul = $("creditsList");
  if (!ul) return;
  try {
    const url = browser.runtime.getURL("data/credits.json");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const list = await res.json();
    ul.innerHTML = "";
    for (const c of list) {
      const li = document.createElement("li");
      const name = document.createElement("strong");
      name.textContent = c.name || "";
      li.appendChild(name);
      if (c.contribution) {
        li.appendChild(document.createTextNode(` — ${c.contribution}`));
      }
      ul.appendChild(li);
    }
  } catch (e) {
    console.error("[LemmyTools options] credits load failed", e);
    ul.innerHTML = "";
    const li = document.createElement("li");
    li.className = "muted-note";
    li.textContent = "Credits unavailable.";
    ul.appendChild(li);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  load().catch((e) => {
    console.error(e);
    flashStatus("Failed to load.");
  });
  loadDiscovered().catch((e) => console.error("[LemmyTools] discovered load", e));
  loadCredits().catch((e) => console.error("[LemmyTools] credits load", e));
  $("commposSide").addEventListener("change", updateVerticalVisibility);
  // Pull subscribed keys first so the shared picker has data on first
  // paint, then load groups (which the picker references for chips),
  // then build the picker once. Subsequent group edits call
  // refreshSharedPicker() to update its results in place.
  loadSubscribedKeys()
    .then(() => loadGroups())
    .then(() => setupSharedPicker())
    .catch((e) => console.error("[LemmyTools] groups load", e));
  $("addGroup").addEventListener("click", () => {
    const nameInput = $("newGroupName");
    const name = (nameInput.value || "").trim() || "New group";
    groupsCache.push({ id: makeGroupId(), name, members: [] });
    nameInput.value = "";
    saveGroups();
    renderGroups();
    refreshSharedPicker();
  });
  $("newGroupName").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      $("addGroup").click();
    }
  });
  $("save").addEventListener("click", () =>
    save().catch((e) => {
      console.error(e);
      flashStatus("Save failed.");
    })
  );
  $("discoveredClear").addEventListener("click", async () => {
    await browser.storage.local.set({ [DISCOVERED_KEY]: [] });
    renderDiscovered([]);
  });
  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes[DISCOVERED_KEY]) {
      renderDiscovered(
        Array.isArray(changes[DISCOVERED_KEY].newValue)
          ? changes[DISCOVERED_KEY].newValue
          : []
      );
    }
    if (changes[GROUPS_KEY]) {
      const next = Array.isArray(changes[GROUPS_KEY].newValue)
        ? changes[GROUPS_KEY].newValue
        : [];
      // Skip if change came from this page (groupsCache identity preserved)
      const sameLength = next.length === groupsCache.length;
      const sameContent =
        sameLength &&
        next.every((g, i) => {
          const local = groupsCache[i];
          return (
            local &&
            local.id === g.id &&
            local.name === g.name &&
            JSON.stringify(local.members) === JSON.stringify(g.members)
          );
        });
      if (!sameContent) {
        groupsCache = next.map((g) => ({
          id: String(g.id || ""),
          name: String(g.name || ""),
          members: Array.isArray(g.members) ? g.members.map(String) : []
        }));
        renderGroups();
        refreshSharedPicker();
      }
    }
  });
  document.getElementById("options-form").addEventListener("submit", (e) => {
    e.preventDefault();
    save();
  });
});
