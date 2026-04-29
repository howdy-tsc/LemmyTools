"use strict";

// LemmyTools content script — refactored from the userscript.
//
// Major changes vs. lemmyTools.js:
//   * async settings via browser.storage.local
//   * polling (setInterval) replaced with MutationObserver + delegation
//   * embedded <style> moved to content/lemmytools.css; only dynamic
//     values are pushed via CSS custom properties on documentElement
//   * stricter Lemmy detection so we don't inject on unrelated sites
//   * concrete bug fixes (regex, dead branches, null checks, etc.)

(async function () {
  const VERSION = "0.3.0.0";
  const TESTED_VERSION = "0.19.1";

  const LOG_DEBUG = 0;
  const LOG_INFO = 1;
  const LOG_IMPORTANT = 2;
  const logLevel = LOG_IMPORTANT;

  function ltLog(msg, level) {
    if ((level ?? LOG_IMPORTANT) < logLevel) return;
    console.log("[LemmyTools]", msg);
  }

  if (!isLemmySite()) return;

  await window.LemmyToolsStorage.init();
  let settings = await window.LemmyToolsStorage.getSettings();
  let userMap = await window.LemmyToolsStorage.getUserNotes();

  // Re-pull settings whenever the options page writes them.
  window.LemmyToolsStorage.onChanged((changes) => {
    if (changes.LemmyToolsOptions) {
      settings = Object.assign(
        {},
        window.LemmyToolsStorage.DEFAULTS,
        changes.LemmyToolsOptions.newValue || {}
      );
      applyDynamicStyles();
    }
    if (changes["LemmyToolsOptions-userNotes"]) {
      try {
        userMap = new Map(changes["LemmyToolsOptions-userNotes"].newValue || []);
      } catch (_) {
        userMap = new Map();
      }
    }
  });

  const mobile = /Android|iPhone/i.test(navigator.userAgent);

  // ---------------- Dynamic CSS variables -----------------------------

  function applyDynamicStyles() {
    const root = document.documentElement;
    root.style.setProperty(
      "--lt-comm-pos-vertical",
      `${clamp(settings.commposVertical, 0, 85)}%`
    );
    const sizeUnit = settings.widthPixels ? "px" : "%";
    root.style.setProperty(
      "--lt-expand-image-size",
      `${settings.expandImagesize}${sizeUnit}`
    );
    root.dataset.ltSide = settings.commposSide === "left" ? "left" : "right";
    root.dataset.ltHover = settings.hoverCheck ? "always" : "auto";
    root.dataset.ltUnblur = settings.unblurNSFW ? "on" : "off";
    root.dataset.ltHideSidebar = settings.hideSideBar ? "on" : "off";
    root.dataset.ltTopbar = settings.commposSide === "top" ? "on" : "off";
  }
  applyDynamicStyles();

  function clamp(n, lo, hi) {
    n = Number(n);
    if (Number.isNaN(n)) return lo;
    return Math.min(hi, Math.max(lo, n));
  }

  // ---------------- HTML escaping -------------------------------------

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // ---------------- Compiled block-content matcher --------------------

  let compiledFilter = null;
  function compileFilters(filters) {
    if (!filters || !filters.length) {
      compiledFilter = null;
      return;
    }
    const escaped = filters
      .map((f) => String(f).trim())
      .filter(Boolean)
      .map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    compiledFilter = escaped.length
      ? new RegExp(escaped.join("|"), "i")
      : null;
  }
  compileFilters(settings.blockFilters);

  function blockContent() {
    if (!settings.blockContent || !compiledFilter) return;
    const targets = document.querySelectorAll(
      ".post-listing:not([data-lt-blocked]), .comment:not([data-lt-blocked])"
    );
    let count = 0;
    targets.forEach((el) => {
      // textContent dodges class names / attributes in innerHTML
      if (compiledFilter.test(el.textContent || "")) {
        el.style.setProperty("display", "none", "important");
        el.dataset.ltBlocked = "1";
        count++;
      }
    });
    if (count) ltLog(`blocked ${count} item(s)`, LOG_INFO);
  }

  // ---------------- User tagger ---------------------------------------

  const tagColors = new Map([
    ["transparent", "inherit"],
    ["tomato", "white"],
    ["darkorange", "white"],
    ["gold", "black"],
    ["yellowgreen", "white"],
    ["lightseagreen", "white"],
    ["teal", "white"],
    ["indianred", "black"],
    ["lightcoral", "black"],
    ["lightpink", "black"],
    ["mistyrose", "black"],
    ["purple", "white"],
    ["crimson", "white"],
    ["darkslategray", "white"]
  ]);

  const USER_NAME_RX = /\/u\/(.+)$/;

  function annotateUserListings(root) {
    const nodes = (root || document).querySelectorAll(
      ".person-listing:not(.hasNote)"
    );
    for (const node of nodes) {
      const m = (node.href || "").match(USER_NAME_RX);
      if (!m) {
        node.classList.add("hasNote");
        continue;
      }
      const userName = m[1];
      const existing = node.querySelector(".userNote");
      const span = existing || document.createElement("span");
      span.textContent = "🏷";
      if (userMap.has(userName)) {
        const note = userMap.get(userName);
        span.textContent = note.Text || "🏷";
        span.style.backgroundColor = note.Color;
        span.style.color = tagColors.get(note.Color) || "inherit";
      }
      span.classList.add("userNote", "badge");
      span.dataset.user = userName;
      if (!existing) {
        span.addEventListener("click", openTagDialog);
        node.appendChild(span);
      }
      node.classList.add("hasNote");
    }
  }

  function openTagDialog(clickEvent) {
    clickEvent.preventDefault();
    clickEvent.stopPropagation();
    const userName = clickEvent.currentTarget.dataset.user;
    const dialog = document.createElement("dialog");
    dialog.classList.add("userTagger");

    const wrap = document.createElement("div");
    wrap.style.width = "350px";

    const title = document.createElement("strong");
    title.textContent = userName;
    wrap.appendChild(title);

    const form = document.createElement("form");
    form.id = "userTag";
    form.innerHTML = `
      <div>
        <label for="userTagText">Text</label>
        <input type="text" id="userTagText" value="">
      </div>
      <div>
        <label for="userTagColor">Color</label>
        <select id="userTagColor"></select>
      </div>
      <div>
        <button type="submit">✓ save tag</button>
        <button formmethod="dialog">× cancel</button>
      </div>`;
    wrap.appendChild(form);
    dialog.appendChild(wrap);

    const select = form.querySelector("#userTagColor");
    tagColors.forEach((textColor, bgColor) => {
      const opt = document.createElement("option");
      opt.value = bgColor;
      opt.textContent = bgColor;
      opt.style.backgroundColor = bgColor;
      opt.style.color = textColor;
      select.appendChild(opt);
    });

    const textInput = form.querySelector("#userTagText");
    if (userMap.has(userName)) {
      textInput.value = userMap.get(userName).Text || "";
      select.value = userMap.get(userName).Color || "transparent";
    }

    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) closeDialog(dialog);
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (e.submitter && e.submitter.formMethod === "dialog") {
        closeDialog(dialog);
        return;
      }
      if (textInput.value.length) {
        userMap.set(userName, {
          Text: textInput.value,
          Color: select.value
        });
      } else {
        userMap.delete(userName);
      }
      annotateUserListings(document);
      await window.LemmyToolsStorage.setUserNotes(userMap);
      closeDialog(dialog);
    });

    document.body.appendChild(dialog);
    dialog.showModal();
  }

  function closeDialog(dialog) {
    dialog.close();
    dialog.remove();
  }

  // ---------------- Auto-expand thumbnails ----------------------------

  const THUMB_SELECTOR =
    ".thumbnail.rounded.overflow-hidden.d-inline-block.position-relative.p-0.border-0.bg-transparent";

  function expandThumbnails(open) {
    const thumbs = document.querySelectorAll(THUMB_SELECTOR);
    if (!thumbs.length) return;
    if (open) {
      thumbs.forEach((t) => {
        try { t.click(); } catch (_) {}
      });
    }
    // For "hide", we used to call location.reload(true). That's user-
    // hostile inside an extension; let the user click again on the post
    // if they want to collapse. Most Lemmy themes already toggle on
    // re-click anyway.
  }

  // ---------------- Open all links in new tab -------------------------

  function rewriteLinksInNewTab(root) {
    (root || document).querySelectorAll("a[href]:not([data-lt-newtab])").forEach((a) => {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noreferrer");
      a.dataset.ltNewtab = "1";
    });
  }

  // ---------------- Image click+drag resize (delegated) ---------------

  let dragNode = null;
  let dragPosX = 0;
  function startDrag(e) {
    if (!settings.expandImages) return;
    if (!e.target || !e.target.classList.contains("img-expanded")) return;
    e.preventDefault();
    dragNode = e.target;
    dragNode.style.cursor = "nwse-resize";
    const a = dragNode.closest("a");
    if (a) a.removeAttribute("href");
    dragPosX = e.clientX;
    document.addEventListener("mousemove", onDrag);
    document.addEventListener("mouseup", endDrag);
  }
  function onDrag(e) {
    if (!dragNode) return;
    e.preventDefault();
    const dx = (e.pageX - dragPosX) * (settings.expandImageSpeed ?? 0.5);
    dragNode.style.width = `${dragNode.offsetWidth + dx}px`;
    dragPosX = e.pageX;
  }
  function endDrag() {
    if (dragNode) dragNode.style.cursor = "default";
    dragNode = null;
    document.removeEventListener("mousemove", onDrag);
    document.removeEventListener("mouseup", endDrag);
  }
  document.addEventListener("mousedown", startDrag, true);

  // ---------------- Sidebar / top bar UI ------------------------------

  function notHomeAndInCommunity(url) {
    return (
      !url.includes(settings.instance) &&
      (url.includes("/c/") ||
        url.includes("/post/") ||
        url.includes("/comment/") ||
        url.includes("/communities"))
    );
  }

  let commsAreaStatic;
  let commsAreaSearch;
  let searchInput;
  let communityArrayHtml = "";
  let remoteCommunityArray = [];

  function buildTopBar() {
    const topDiv = document.createElement("div");
    topDiv.id = "topDiv";
    topDiv.innerHTML = `
      <div class='topDivRoot card border-secondary'>
        <div class='topDivSearch'>
          <img id="lemmyLogo" width="22" height="22" class='targetImg'
               alt="${escapeHtml(settings.instance)}"
               title="${escapeHtml(settings.instance)}"
               src="${browser.runtime.getURL("icons/lemmy-logo.webp")}" />
          <input type='text' id='commsearch' name='commsearchinput'
                 placeholder='Search subs · type !settings for options'
                 title='Search your subscriptions (or visited subs). Type !settings to open the LemmyTools options page.' />
          <a id='dropDownComms' href="#" title="Show all communities"> (Show All) </a>
          <a class='ltSettingsBtn' href="#" title='LemmyTools settings (or type !settings)'
             aria-label='Open LemmyTools settings'>&#9881;</a>
        </div>
        <div class='topDivBar'>
          <div class='commsAreaStatic'></div>
        </div>
      </div>`;

    const box = document.createElement("div");
    box.id = "topDivCommsBox";
    box.style.display = "none";
    box.innerHTML = `
      <header id='ltBarHeader' class='card-header'>
        <h5>
          <a href="${escapeHtml(settings.instance)}">Home</a> -
          <a href="https://lemmyverse.net/communities" target="_blank" rel="noreferrer">Find Communities</a>
        </h5>
      </header>
      LemmyTools ${VERSION}
      <div class="commsAreaSearch"></div>`;

    document.body.prepend(box);
    document.body.prepend(topDiv);

    topDiv.querySelector("#dropDownComms").addEventListener("click", (e) => {
      e.preventDefault();
      const a = e.currentTarget;
      const showing = box.style.display !== "none";
      box.style.display = showing ? "none" : "block";
      a.textContent = showing ? " (Show All) " : " (Hide All) ";
      window.scrollTo(0, 0);
      runSearch(searchInput.value);
    });
  }

  function buildSidebar() {
    const wrap = document.createElement("div");
    wrap.id = "searchdiv";
    wrap.dataset.ltSide = settings.commposSide === "left" ? "left" : "right";
    wrap.classList.add("ltmenu", "border-secondary", "card");
    wrap.innerHTML = `
      <div id='ltActiveSearchDiv' class='ltActiveSearchDiv'>
        <header id='ltBarHeader' class='card-header'>
          <h6>
            <a href="${escapeHtml(settings.instance)}">Home</a> ·
            <a href="https://lemmyverse.net/communities" target="_blank" rel="noreferrer">Find</a> ·
            <a class='ltSettingsBtn' href="#" title='LemmyTools settings (or type !settings)'
               aria-label='Open LemmyTools settings'>&#9881;</a>
            <img id="lemmyLogo" width="22" height="22" class='targetImg'
                 src="${browser.runtime.getURL("icons/lemmy-logo.webp")}" />
          </h6>
        </header>
        <input type='text' id='commsearch' name='commsearchinput'
               placeholder='Search subs · type !settings for options'
               title='Search your subscriptions (or visited subs). Type !settings to open the LemmyTools options page.' />
        <div id='ltBarSubHeader' class='clickAble'>LemmyTools ${VERSION}</div>
      </div>
      <div id='ltPassiveSearchDiv' class='ltPassiveSearchDiv' role='button' aria-label='Open LemmyTools sidebar'>
        <img class='ltPassiveLogo' alt=''
             src="${browser.runtime.getURL("icons/lemmy-logo.webp")}" />
        <span class='ltPassiveChevron' aria-hidden='true'></span>
      </div>
      <div id='myDiv' class='ltcommsbar'>
        <div class='commsAreaStatic'></div>
      </div>`;
    document.body.appendChild(wrap);
  }

  async function openSettings() {
    try {
      await browser.runtime.sendMessage({ type: "openOptions" });
    } catch (e) {
      console.error("[LemmyTools] failed to open settings", e);
    }
  }

  const SETTINGS_COMMANDS = new Set(["!settings", "!options"]);
  function isSettingsCommand(value) {
    return SETTINGS_COMMANDS.has((value || "").trim().toLowerCase());
  }

  function attachUiBindings() {
    commsAreaStatic = document.getElementsByClassName("commsAreaStatic");
    commsAreaSearch = document.getElementsByClassName("commsAreaSearch");
    searchInput = document.getElementById("commsearch");
    if (!searchInput) return;

    document.querySelectorAll(".ltSettingsBtn").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        openSettings();
      });
    });

    let debounce;
    searchInput.addEventListener("input", (e) => {
      e.preventDefault();
      if (isSettingsCommand(searchInput.value)) {
        searchInput.value = "";
        clearTimeout(debounce);
        openSettings();
        runSearch("");
        return;
      }
      clearTimeout(debounce);
      debounce = setTimeout(() => runSearch(searchInput.value), 100);
    });
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && isSettingsCommand(searchInput.value)) {
        e.preventDefault();
        searchInput.value = "";
        openSettings();
        runSearch("");
      }
    });

    const logo = document.getElementById("lemmyLogo");
    if (logo) {
      logo.addEventListener("click", (e) => {
        e.preventDefault();
        if (settings.instance) window.location.href = settings.instance;
      });
    }
  }

  function runSearch(rawQuery) {
    if (!commsAreaStatic || !commsAreaStatic[0]) return;
    const query = (rawQuery || "").toLowerCase();
    const root = commsAreaStatic[0];

    if (query === "-f" && communityArrayHtml) {
      root.innerHTML = communityArrayHtml;
      return;
    }

    root.innerHTML = communityArrayHtml;
    if (!query) return;

    if (query.length > 2) {
      window.LemmyToolsStorage.pushSearchHistory(query).catch(() => {});
    }

    const items = root.getElementsByTagName("li");
    const data = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].textContent.toLowerCase().indexOf(query) !== -1) {
        data.push(items[i].outerHTML);
      }
    }
    const unique = [...new Set(data)].sort();
    const out = unique.join("");
    for (let i = 0; i < commsAreaSearch.length; i++) {
      commsAreaSearch[i].innerHTML = `Communities: ${unique.length}<hr />${out}`;
    }
    root.innerHTML = `Communities: ${unique.length}<hr />${out}`;
  }

  async function populateLocalCommunities() {
    const url = window.location.href;
    if (!settings.instance || !url.includes(settings.instance)) {
      ltLog("Not on home instance — skipping local comms scan", LOG_DEBUG);
      const cached = await window.LemmyToolsStorage.getCachedComms();
      if (cached) {
        communityArrayHtml = cached;
        if (commsAreaStatic && commsAreaStatic[0]) {
          commsAreaStatic[0].innerHTML = cached;
        }
      }
      return;
    }
    const items = new Set();
    document
      .querySelectorAll('[class="list-inline-item d-inline-block"]')
      .forEach((el) => {
        items.add(`<li>${el.innerHTML.toLowerCase()}</li>`);
      });
    if (items.size) {
      communityArrayHtml = [...items].join("");
      await window.LemmyToolsStorage.setCachedComms(communityArrayHtml);
      if (commsAreaStatic && commsAreaStatic[0]) {
        commsAreaStatic[0].innerHTML = communityArrayHtml;
      }
      runSearch(searchInput ? searchInput.value : "");
    } else {
      const cached = await window.LemmyToolsStorage.getCachedComms();
      if (cached) {
        communityArrayHtml = cached;
        if (commsAreaStatic && commsAreaStatic[0]) {
          commsAreaStatic[0].innerHTML = cached;
        }
      }
    }
  }

  function checkRemoteCommunity() {
    const url = window.location.href;
    if (!notHomeAndInCommunity(url)) return;
    const broken = url.split("/c/");
    if (broken.length < 2) return;
    const site = broken[0].replace(/^https?:\/\//, "");
    let community = broken[1].split("?")[0].split("#")[0];
    const communityName = community.includes("@") ? community : `${community}@${site}`;
    const html = `<li><h5>${escapeHtml(community)}</h5></li>
      <li>
        <a href="${escapeHtml(settings.instance)}/c/${encodeURIComponent(communityName)}"
           target="_blank" rel="noreferrer">
          <button type="button" class="ltbutton">Browse/Sub on Home Instance</button>
        </a>
      </li>`;
    if (!remoteCommunityArray.includes(html)) remoteCommunityArray.push(html);
    if (commsAreaStatic && commsAreaStatic[0]) {
      commsAreaStatic[0].innerHTML = remoteCommunityArray.join("");
    }
  }

  // ---------------- Hide-sidebar quick action -------------------------

  function applyHideSidebar() {
    if (!settings.hideSideBar) return;
    const subs = document.getElementById("sidebarContainer");
    if (subs) subs.style.display = "none";
    const info = document.getElementById("sidebarInfo");
    if (info) info.style.display = "none";
  }

  // ---------------- "Show All Images" injected button -----------------

  function injectShowAllImagesButton() {
    if (settings.showAllImages || settings.hideShowAllImagesButton) return;
    const target = document.querySelector(".post-listings");
    if (!target || target.querySelector("#showAllImages")) return;
    const wrap = document.createElement("div");
    wrap.className = "col-auto";
    const btn = document.createElement("input");
    btn.type = "button";
    btn.id = "showAllImages";
    btn.className = "pointer btn btn-secondary text-bg-primary";
    btn.value = "Show All Images";
    wrap.appendChild(btn);
    target.prepend(wrap);
    btn.addEventListener("click", () => {
      const showing = btn.value === "Show All Images";
      btn.value = showing ? "Hide All Images" : "Show All Images";
      expandThumbnails(showing);
    });
  }

  // ---------------- Bootstrap UI --------------------------------------

  function buildUi() {
    if (settings.commposSide === "top") {
      buildTopBar();
    } else {
      buildSidebar();
    }
    attachUiBindings();
  }

  // Wait for DOM. With run_at=document_idle the body is usually ready,
  // but Lemmy frontends mount React after that, so observe and run.
  function ready(fn) {
    if (document.readyState !== "loading" && document.body) fn();
    else document.addEventListener("DOMContentLoaded", fn, { once: true });
  }

  ready(async () => {
    buildUi();
    await populateLocalCommunities();
    runSearch(searchInput ? searchInput.value : "");
    applyHideSidebar();
    annotateUserListings(document);
    if (settings.linksInNewTab) rewriteLinksInNewTab(document);
    if (settings.showAllImages) expandThumbnails(true);
    blockContent();
    injectShowAllImagesButton();

    // Single MutationObserver replaces every former setInterval poll.
    let lastUrl = window.location.href;
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        for (const n of m.addedNodes) {
          if (!(n instanceof Element)) continue;
          if (n.matches?.(".person-listing") || n.querySelector?.(".person-listing")) {
            annotateUserListings(n);
          }
        }
      }
      if (lastUrl !== window.location.href) {
        lastUrl = window.location.href;
        if (settings.showAllImages) {
          // Lemmy SPA-navigates; give the post list a moment to render
          setTimeout(() => expandThumbnails(true), 800);
        }
        checkRemoteCommunity();
      }
      applyHideSidebar();
      injectShowAllImagesButton();
      if (settings.linksInNewTab) rewriteLinksInNewTab(document);
      blockContent();
    });
    mo.observe(document.body, { childList: true, subtree: true });

    checkRemoteCommunity();
  });

  // ---------------- Lemmy site detection ------------------------------

  function isLemmySite() {
    const meta = document.querySelector('meta[name="Description"]');
    if (meta && (meta.content || "").trim() === "Lemmy") return true;

    const generator = document.querySelector('meta[name="generator"]');
    if (generator && /lemmy/i.test(generator.content || "")) return true;

    if (document.querySelector('link[rel="search"][href*="/api/v3/search"]')) {
      return true;
    }

    // navItems / sidebar markers we know Lemmy frontends emit
    if (document.querySelector('a[href="/communities"]') &&
        document.querySelector('a[href="/instances"]')) {
      return true;
    }

    return false;
  }
})();
