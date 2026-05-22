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
  let discoveredComms = await window.LemmyToolsStorage.getDiscoveredCommunities();
  let commVisits = await window.LemmyToolsStorage.getCommunityVisits();
  let commGroups = await window.LemmyToolsStorage.getCommunityGroups();

  // Re-pull settings whenever the options page writes them.
  window.LemmyToolsStorage.onChanged((changes) => {
    if (changes.LemmyToolsOptions) {
      const prevSort = settings.commsSortMode;
      const prevInstance = settings.instance;
      settings = Object.assign(
        {},
        window.LemmyToolsStorage.DEFAULTS,
        changes.LemmyToolsOptions.newValue || {}
      );
      applyDynamicStyles();
      // Filter regex is cached — without this, edits to blockFilters
      // would not take effect until page reload.
      compileFilters(settings.blockFilters);
      if (prevSort !== settings.commsSortMode) rebuildCommunityList();
      if (prevInstance !== settings.instance) {
        refreshHomeHeaderLink();
        // The off-home CTA depends on settings.instance — re-evaluate it
        // so "Browse / subscribe on home" appears/disappears in step.
        checkRemoteCommunity();
      }
    }
    if (changes["LemmyToolsOptions-userNotes"]) {
      try {
        userMap = new Map(changes["LemmyToolsOptions-userNotes"].newValue || []);
      } catch (_) {
        userMap = new Map();
      }
    }
    if (changes.LT_discoveredCommunities) {
      const next = changes.LT_discoveredCommunities.newValue;
      discoveredComms = Array.isArray(next) ? next : [];
      rebuildCommunityList();
    }
    if (changes.LT_communityVisits) {
      const v = changes.LT_communityVisits.newValue;
      commVisits = v && typeof v === "object" ? v : {};
      if (settings.commsSortMode === "recent") rebuildCommunityList();
    }
    if (changes.LT_communityGroups) {
      const g = changes.LT_communityGroups.newValue;
      commGroups = Array.isArray(g) ? g : [];
      rebuildCommunityList();
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

  // ---------------- Discover tab + filter -----------------------------

  // "Discover" is a virtual fourth tab next to Subscribed / Local / All.
  // It loads the All feed but hides posts from communities the user is
  // already subscribed to — surfacing only unfamiliar communities.
  //
  // State carrier: a `?ltDiscover=1` URL param on top of `?listingType=All`.
  // Putting it in the URL keeps it bookmarkable, survives Lemmy SPA
  // navigation, and lets the filter activate on first paint without
  // having to read storage. The filter only acts when both params are
  // present *and* we're on the user's home instance.

  let subscribedKeyCache = null;
  function invalidateSubscribedKeyCache() {
    subscribedKeyCache = null;
  }
  function getSubscribedKeySet() {
    if (subscribedKeyCache) return subscribedKeyCache;
    const set = new Set();
    if (subscribedHtml) {
      const tpl = document.createElement("template");
      tpl.innerHTML = `<ul>${subscribedHtml}</ul>`;
      tpl.content.querySelectorAll("a[href*='/c/']").forEach((a) => {
        const key = extractCommKeyFromHref(a.getAttribute("href"));
        if (key) set.add(key.toLowerCase());
      });
    }
    subscribedKeyCache = set;
    return set;
  }

  // sessionStorage carries Discover state across SPA navigation —
  // Lemmy's pagination buttons (Next/Prev) don't know about our
  // ltDiscover URL param and would strip it on click. The URL param
  // is still primary on initial load (so bookmarks / shared links
  // work); the flag is the "stickiness" mechanism for navigation.
  const DISCOVER_FLAG_KEY = "ltDiscoverActive";

  function readDiscoverFlag() {
    try { return sessionStorage.getItem(DISCOVER_FLAG_KEY) === "1"; }
    catch (_) { return false; }
  }
  function setDiscoverFlag(on) {
    try {
      if (on) sessionStorage.setItem(DISCOVER_FLAG_KEY, "1");
      else sessionStorage.removeItem(DISCOVER_FLAG_KEY);
    } catch (_) {}
  }

  // Active when on home + listingType=All AND (URL says ltDiscover=1
  // OR session flag is set).
  function isDiscoverActive() {
    if (!isOnHomeInstance()) return false;
    try {
      const u = new URL(window.location.href);
      const lt = u.searchParams.get("listingType");
      if (!lt || lt.toLowerCase() !== "all") return false;
      if (u.searchParams.get("ltDiscover") === "1") return true;
      return readDiscoverFlag();
    } catch (_) {
      return false;
    }
  }

  // Reconcile the session flag with the new URL after each navigation.
  //   * URL has ltDiscover=1 → set flag (e.g. fresh page, bookmarked link).
  //   * URL has listingType not equal to All → user left Discover, clear flag.
  //   * URL is All without ltDiscover → preserve current flag (this is
  //     what makes Next/Prev pagination keep Discover active).
  function syncDiscoverFlagFromUrl() {
    if (!isOnHomeInstance()) return;
    try {
      const u = new URL(window.location.href);
      const lt = u.searchParams.get("listingType");
      if (u.searchParams.get("ltDiscover") === "1") {
        setDiscoverFlag(true);
        return;
      }
      if (lt && lt.toLowerCase() !== "all") {
        setDiscoverFlag(false);
      }
    } catch (_) {}
  }

  function applyDiscoverFilter() {
    if (!isDiscoverActive()) return;
    const subs = getSubscribedKeySet();
    if (!subs.size) return;
    const posts = document.querySelectorAll(
      ".post-listing:not([data-lt-sub-filtered])"
    );
    let hidden = 0;
    posts.forEach((post) => {
      const a = post.querySelector("a[href*='/c/']");
      if (!a) return;
      const key = extractCommKeyFromHref(a.getAttribute("href"));
      if (!key) return;
      if (subs.has(key.toLowerCase())) {
        post.style.setProperty("display", "none", "important");
        post.dataset.ltSubFiltered = "1";
        hidden++;
      }
    });
    if (hidden) ltLog(`discover: hid ${hidden} subscribed post(s)`, LOG_INFO);
  }

  // Reverses applyDiscoverFilter for posts we previously hid. Called when
  // we navigate away from a Discover URL so they aren't stuck collapsed
  // on the next page.
  function unhideSubscribedFiltered() {
    document
      .querySelectorAll(".post-listing[data-lt-sub-filtered]")
      .forEach((post) => {
        post.style.removeProperty("display");
        delete post.dataset.ltSubFiltered;
      });
  }

  // ---- Discover pagination top-up ----------------------------------
  //
  // Lemmy's All page is 20 posts; if the user is subscribed to most of
  // what's there, the Discover filter can leave only 3-5 visible. This
  // fetches subsequent API pages and appends posts that pass *both* the
  // sub filter and a cross-post content dedup, so the page fills out
  // with actually-novel communities.
  //
  // Critically, filtering happens *before* the post hits the DOM —
  // that's what kept the previous infinite-scroll attempt from working
  // here (a single user spamming crossposts could blow past ID dedup
  // and the page would explode). The dedup tuple (url|name|creator)
  // catches crossposts cleanly because they share all three.
  //
  // Bounded: max DISCOVER_FILL_MAX_FETCHES batches per URL, only fires
  // once per URL navigation, all guards self-clear on Lemmy SPA-nav.

  const DISCOVER_FILL_TARGET_VISIBLE = 15;
  const DISCOVER_FILL_MAX_FETCHES = 8;

  let discoverFetchInflight = false;
  let discoverFetchDone = false;
  let discoverNextCursor = null;
  let discoverPageNum = 2;
  let discoverSeenIds = new Set();
  let discoverSeenContent = new Set();
  let discoverFillAttempted = false;
  let discoverFillUrl = "";

  function resetDiscoverFillState() {
    discoverFetchInflight = false;
    discoverFetchDone = false;
    discoverNextCursor = null;
    discoverSeenIds = new Set();
    discoverSeenContent = new Set();
    discoverFillAttempted = false;
    // lemmy-ui 0.19.x's "Next" button puts the cursor in the URL, not a
    // page=N. If we see a page_cursor we seed our own cursor with it —
    // the first fetch will dedup against the SSR'd posts (Lemmy's
    // response includes a `next_page` cursor we then step forward
    // with). Falling back to page-based for older servers / first load.
    try {
      const u = new URL(window.location.href);
      const urlCursor = u.searchParams.get("page_cursor");
      if (urlCursor) {
        discoverNextCursor = urlCursor;
        discoverPageNum = 1;
      } else {
        const startPage =
          parseInt(u.searchParams.get("page") || "1", 10) || 1;
        discoverPageNum = startPage + 1;
      }
    } catch (_) {
      discoverPageNum = 2;
    }
    // Seed *both* seen IDs and content keys from posts already in the
    // DOM. Lemmy SSRs page 1 (and any subsequent page after the Next
    // button) with its own posts; without this, an API response that
    // includes those same posts (or a crosspost variant of the same
    // content) would slip past dedup and appear a second time below.
    document.querySelectorAll(".post-listing").forEach((post) => {
      if (post.dataset.postId) discoverSeenIds.add(post.dataset.postId);
      const a = post.querySelector("a[href*='/post/']");
      if (a) {
        const m = (a.getAttribute("href") || "").match(/\/post\/(\d+)/);
        if (m) discoverSeenIds.add(m[1]);
      }
      const ckey = extractDomContentKey(post);
      if (ckey) discoverSeenContent.add(ckey);
    });
    discoverFillUrl = window.location.href;
  }

  // Pull a (title|author) tuple out of a real Lemmy post-listing
  // already in the DOM. Matched in lowercase, with @instance stripped
  // from the author so it lines up with what `pv.creator.name` gives
  // us on the API side. Falls back to whatever-text-content if heading
  // selectors miss (themes vary).
  function extractDomContentKey(post) {
    const titleEl =
      post.querySelector(
        "h1 a[href*='/post/'], h2 a[href*='/post/'], h3 a[href*='/post/'], " +
        "h4 a[href*='/post/'], h5 a[href*='/post/'], h6 a[href*='/post/']"
      ) ||
      post.querySelector(".post-title a[href*='/post/']") ||
      post.querySelector("a.post-title[href*='/post/']");
    const title = ((titleEl && titleEl.textContent) || "").trim().toLowerCase();
    if (!title) return null;
    const personEl = post.querySelector(".person-listing, a[href*='/u/']");
    const author = normalizeAuthor(personEl && personEl.textContent);
    return `${title}|${author}`;
  }

  function normalizeAuthor(s) {
    return (s || "").trim().toLowerCase().split("@")[0];
  }

  // Same shape as extractDomContentKey above so DOM-seeded keys and
  // API-derived keys collide on crossposts (same title + creator).
  function discoverPostContentKey(pv) {
    const post = pv && pv.post ? pv.post : {};
    const creator = pv && pv.creator ? pv.creator : {};
    const name = (post.name || "").trim().toLowerCase();
    if (!name) return null;
    const author = normalizeAuthor(creator.name || creator.display_name);
    return `${name}|${author}`;
  }

  // Live-DOM safety net for append time: catches the race where Lemmy
  // painted new posts between our reset (which seeded seenIds) and the
  // moment we're about to append. We re-check both ID and content
  // against whatever is currently rendered.
  function discoverIsAlreadyShown(id, ckey) {
    if (id) {
      try {
        if (
          document.querySelector(
            `.post-listing[data-post-id="${CSS.escape(id)}"]`
          )
        ) return true;
      } catch (_) {}
      const anchors = document.querySelectorAll(
        ".post-listing a[href*='/post/']"
      );
      for (const a of anchors) {
        const m = (a.getAttribute("href") || "").match(/\/post\/(\d+)/);
        if (m && m[1] === id) return true;
      }
    }
    if (ckey) {
      const posts = document.querySelectorAll(".post-listing");
      for (const p of posts) {
        if (extractDomContentKey(p) === ckey) return true;
      }
    }
    return false;
  }

  function discoverCommunityKey(pv) {
    const c = (pv && pv.community) || {};
    const name = (c.name || "").toLowerCase();
    if (c.local) return name;
    try {
      const host = new URL(c.actor_id).hostname.toLowerCase();
      return `${name}@${host}`;
    } catch (_) {
      return name;
    }
  }

  function discoverGetJwt() {
    try {
      const v = localStorage.getItem("jwt");
      if (v) return v.replace(/^"|"$/g, "");
    } catch (_) {}
    return null;
  }

  function discoverBuildFetchUrl() {
    let sort = "Active";
    try {
      sort = new URL(window.location.href).searchParams.get("sort") || "Active";
    } catch (_) {}
    const qs = new URLSearchParams();
    qs.set("type_", "All");
    qs.set("sort", sort);
    qs.set("limit", "20");
    if (discoverNextCursor) qs.set("page_cursor", discoverNextCursor);
    else qs.set("page", String(discoverPageNum));
    return `/api/v3/post/list?${qs.toString()}`;
  }

  function discoverFindFeedContainer() {
    return (
      document.querySelector(".post-listings") ||
      document.querySelector(".posts") ||
      null
    );
  }

  function discoverCountVisible() {
    let count = 0;
    document.querySelectorAll(".post-listing").forEach((post) => {
      if (post.dataset.ltSubFiltered) return;
      const cs = window.getComputedStyle(post);
      if (cs.display === "none" || cs.visibility === "hidden") return;
      count++;
    });
    return count;
  }

  function discoverIsImageUrl(u) {
    return /\.(jpg|jpeg|png|gif|webp|avif)(\?|#|$)/i.test(u || "");
  }
  function discoverHostname(u) {
    try { return new URL(u).hostname.replace(/^www\./, ""); }
    catch (_) { return ""; }
  }
  function discoverRelTime(iso) {
    if (!iso) return "";
    const t = Date.parse(iso);
    if (Number.isNaN(t)) return "";
    const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    if (day < 30) return `${day}d ago`;
    return `${Math.floor(day / 30)}mo ago`;
  }

  // ---- Vote / save against Lemmy's API for our appended posts -----
  //
  // Inferno owns the click handlers on its own .post-listing buttons,
  // so we can't piggyback those for posts we render ourselves — they'd
  // be no-ops. Instead we render our own up/down/save controls and
  // call /api/v3/post/{like,save} directly. Cookie auth is sent via
  // credentials:"same-origin"; if the user keeps a JWT in localStorage
  // (older lemmy-ui versions did), we send it as Bearer too.

  const DISC_COLOR_UP = "var(--bs-warning, #ff8b60)";
  const DISC_COLOR_DOWN = "var(--bs-info, #6cb2eb)";
  const DISC_COLOR_NEUTRAL = "var(--bs-secondary-color, #888)";

  function discoverAuthHeaders() {
    const h = {
      "Content-Type": "application/json",
      Accept: "application/json"
    };
    const jwt = discoverGetJwt();
    if (jwt) h.Authorization = `Bearer ${jwt}`;
    return h;
  }

  function discoverApplyVoteUi(article, vote, score) {
    article.dataset.myVote = String(vote);
    article.dataset.score = String(score);
    const up = article.querySelector(".lt-disc-up");
    const down = article.querySelector(".lt-disc-down");
    const sc = article.querySelector(".lt-disc-vote-score");
    if (up) up.style.color = vote === 1 ? DISC_COLOR_UP : DISC_COLOR_NEUTRAL;
    if (down) down.style.color = vote === -1 ? DISC_COLOR_DOWN : DISC_COLOR_NEUTRAL;
    if (sc) {
      sc.textContent = String(score);
      sc.style.color =
        vote === 1 ? DISC_COLOR_UP :
        vote === -1 ? DISC_COLOR_DOWN : "";
    }
  }

  async function discoverCastVote(postId, score, article) {
    const prevVote = parseInt(article.dataset.myVote || "0", 10) || 0;
    const prevScore = parseInt(article.dataset.score || "0", 10) || 0;
    const optimisticScore = prevScore - prevVote + score;
    discoverApplyVoteUi(article, score, optimisticScore);
    try {
      const res = await fetch("/api/v3/post/like", {
        method: "POST",
        credentials: "same-origin",
        headers: discoverAuthHeaders(),
        body: JSON.stringify({ post_id: postId, score })
      });
      if (res.status === 401) {
        discoverApplyVoteUi(article, prevVote, prevScore);
        ltLog("discover: log in to vote", LOG_INFO);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const pv = data && data.post_view;
      if (pv) {
        const my = pv.my_vote || 0;
        const sc = (pv.counts && pv.counts.score) || 0;
        discoverApplyVoteUi(article, my, sc);
      }
    } catch (e) {
      ltLog(`discover vote failed: ${e}`, LOG_INFO);
      discoverApplyVoteUi(article, prevVote, prevScore);
    }
  }

  async function discoverToggleSave(postId, btn) {
    const wasSaved = btn.dataset.saved === "true";
    const next = !wasSaved;
    btn.dataset.saved = String(next);
    btn.textContent = next ? "★" : "☆";
    btn.title = next ? "Saved" : "Save";
    btn.style.color = next ? DISC_COLOR_UP : DISC_COLOR_NEUTRAL;
    try {
      const res = await fetch("/api/v3/post/save", {
        method: "PUT",
        credentials: "same-origin",
        headers: discoverAuthHeaders(),
        body: JSON.stringify({ post_id: postId, save: next })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      ltLog(`discover save failed: ${e}`, LOG_INFO);
      btn.dataset.saved = wasSaved ? "true" : "false";
      btn.textContent = wasSaved ? "★" : "☆";
      btn.title = wasSaved ? "Saved" : "Save";
      btn.style.color = wasSaved ? DISC_COLOR_UP : DISC_COLOR_NEUTRAL;
    }
  }

  // Hand-rolled post element. We're NOT cloning a native lemmy-ui
  // post-listing — the previous attempt had subtle patching bugs that
  // re-emerged whenever Lemmy shifted markup. This is plain HTML
  // styled to blend with the surrounding native posts, with our own
  // vote/save buttons that talk to Lemmy's API directly.
  function buildDiscoverPostElement(pv) {
    const post = pv.post || {};
    const community = pv.community || {};
    const creator = pv.creator || {};
    const counts = pv.counts || {};

    const article = document.createElement("article");
    article.className = "post-listing lt-disc-post";
    article.dataset.postId = String(post.id);
    article.dataset.ltAppended = "1";

    const postHref = `/post/${post.id}`;
    const commHost = (() => {
      if (community.local) return null;
      try { return new URL(community.actor_id).hostname; } catch (_) { return null; }
    })();
    const commHref = commHost
      ? `/c/${encodeURIComponent(community.name)}@${commHost}`
      : `/c/${encodeURIComponent(community.name)}`;
    const creatorHost = (() => {
      if (creator.local) return null;
      try { return new URL(creator.actor_id).hostname; } catch (_) { return null; }
    })();
    const creatorHref = creatorHost
      ? `/u/${encodeURIComponent(creator.name)}@${creatorHost}`
      : `/u/${encodeURIComponent(creator.name)}`;

    const thumb =
      post.thumbnail_url || (discoverIsImageUrl(post.url) ? post.url : null);
    const externalHost = post.url ? discoverHostname(post.url) : "";
    const ago = discoverRelTime(post.published);

    const thumbHtml = thumb
      ? `<a href="${escapeHtml(postHref)}" class="thumbnail lt-disc-thumb">
           <img src="${escapeHtml(thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer">
         </a>`
      : `<a href="${escapeHtml(postHref)}" class="thumbnail lt-disc-thumb lt-disc-placeholder">
           <span>${post.url ? "↗" : "💬"}</span>
         </a>`;
    const externalHtml = post.url
      ? ` <a class="lt-disc-extlink" href="${escapeHtml(post.url)}" rel="noopener noreferrer nofollow" target="_blank">${escapeHtml(externalHost)}</a>`
      : "";

    const initialVote = pv.my_vote || 0;
    const initialScore = counts.score || 0;
    const saved = !!pv.saved;

    // Element classes deliberately reuse Lemmy's own (.post-title,
    // .community-link, .person-listing, .thumbnail, .text-body, .badge)
    // so the native theme's CSS picks them up automatically. The
    // .person-listing class is also what annotateUserListings() looks
    // for, which is how 🏷 badges show up on appended posts.
    article.innerHTML = `
      <div class="lt-disc-row">
        <aside class="lt-disc-votes">
          <button type="button" class="lt-disc-up" title="Upvote" aria-label="Upvote">▲</button>
          <span class="lt-disc-vote-score" title="Score">${initialScore}</span>
          <button type="button" class="lt-disc-down" title="Downvote" aria-label="Downvote">▼</button>
        </aside>
        ${thumbHtml}
        <div class="lt-disc-main">
          <h5 class="post-title lt-disc-title d-inline mb-0">
            <a class="text-body" href="${escapeHtml(postHref)}">${escapeHtml(post.name || "")}</a>
            ${externalHtml}
            ${post.nsfw ? ' <span class="badge text-bg-danger ms-1">NSFW</span>' : ""}
          </h5>
          <div class="lt-disc-meta">
            <a class="community-link lt-disc-comm" href="${escapeHtml(commHref)}">${escapeHtml(community.title || community.name || "?")}</a>
            <span class="lt-disc-by">by</span>
            <a class="person-listing lt-disc-author" href="${escapeHtml(creatorHref)}">${escapeHtml(creator.display_name || creator.name || "?")}</a>
            ${ago ? ` <span class="lt-disc-time">${escapeHtml(ago)}</span>` : ""}
            <a class="lt-disc-comments" href="${escapeHtml(postHref)}">💬 ${counts.comments || 0}</a>
            <button type="button" class="lt-disc-save" data-saved="${saved ? "true" : "false"}"
                    title="${saved ? "Saved" : "Save"}">${saved ? "★" : "☆"}</button>
          </div>
        </div>
      </div>`;

    discoverApplyVoteUi(article, initialVote, initialScore);

    const upBtn = article.querySelector(".lt-disc-up");
    if (upBtn) upBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const cur = parseInt(article.dataset.myVote || "0", 10) || 0;
      discoverCastVote(post.id, cur === 1 ? 0 : 1, article);
    });
    const downBtn = article.querySelector(".lt-disc-down");
    if (downBtn) downBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const cur = parseInt(article.dataset.myVote || "0", 10) || 0;
      discoverCastVote(post.id, cur === -1 ? 0 : -1, article);
    });
    const saveBtn = article.querySelector(".lt-disc-save");
    if (saveBtn) {
      saveBtn.style.color = saved ? DISC_COLOR_UP : DISC_COLOR_NEUTRAL;
      saveBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        discoverToggleSave(post.id, saveBtn);
      });
    }

    return article;
  }

  function showDiscoverLoadingIndicator() {
    const target = discoverFindFeedContainer();
    if (!target) return;
    if (document.getElementById("ltDiscoverLoading")) return;
    const div = document.createElement("div");
    div.id = "ltDiscoverLoading";
    div.className = "lt-disc-loading";
    div.textContent = "Looking for more unsubscribed posts…";
    target.appendChild(div);
  }
  function hideDiscoverLoadingIndicator() {
    const div = document.getElementById("ltDiscoverLoading");
    if (div) div.remove();
  }

  async function fetchAndAppendDiscoverPage() {
    if (discoverFetchInflight || discoverFetchDone) return;
    if (!isDiscoverActive()) return;
    const target = discoverFindFeedContainer();
    if (!target) return;

    discoverFetchInflight = true;
    try {
      const apiUrl = discoverBuildFetchUrl();
      const headers = { Accept: "application/json" };
      const jwt = discoverGetJwt();
      if (jwt) headers.Authorization = `Bearer ${jwt}`;

      const res = await fetch(apiUrl, { credentials: "same-origin", headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const posts = Array.isArray(data.posts) ? data.posts : [];

      discoverNextCursor = data.next_page || null;
      discoverPageNum++;

      if (!posts.length) {
        discoverFetchDone = true;
        return;
      }

      const subs = getSubscribedKeySet();
      let added = 0;
      let crossSkipped = 0;
      let subSkipped = 0;
      for (const pv of posts) {
        if (!pv || !pv.post) continue;
        const id = String(pv.post.id);
        if (discoverSeenIds.has(id)) continue;

        const ckey = discoverPostContentKey(pv);
        if (ckey && discoverSeenContent.has(ckey)) {
          discoverSeenIds.add(id);
          crossSkipped++;
          continue;
        }
        // Live-DOM check: catches anything Lemmy painted between our
        // reset and now (or content the SSR'd posts share with this
        // fetch's results).
        if (discoverIsAlreadyShown(id, ckey)) {
          discoverSeenIds.add(id);
          if (ckey) discoverSeenContent.add(ckey);
          crossSkipped++;
          continue;
        }
        const commKey = discoverCommunityKey(pv);
        if (subs.has(commKey)) {
          discoverSeenIds.add(id);
          subSkipped++;
          continue;
        }

        discoverSeenIds.add(id);
        if (ckey) discoverSeenContent.add(ckey);
        const node = buildDiscoverPostElement(pv);
        target.appendChild(node);
        // Run user tagger so 🏷 badges appear on appended posts too.
        annotateUserListings(node);
        added++;
      }

      ltLog(
        `discover top-up: +${added} (skipped ${subSkipped} subbed, ${crossSkipped} crossposts)`,
        LOG_INFO
      );

      if (!discoverNextCursor && added === 0) discoverFetchDone = true;
    } catch (e) {
      ltLog(`discover top-up fetch failed: ${e}`, LOG_INFO);
      discoverFetchDone = true;
    } finally {
      discoverFetchInflight = false;
    }
  }

  let fillDiscoverInProgress = false;

  // Two callers:
  //   "initial" → runs once per URL, fills until visible-count target
  //               or DISCOVER_FILL_MAX_FETCHES, whichever comes first.
  //   "scroll"  → runs whenever the user is within ~1500px of the
  //               bottom; pulls a small batch per call.
  // Both share the same fetchAndAppendDiscoverPage pipeline (dedup +
  // sub-filter + crosspost-filter) and the same in-progress guard, so
  // they can't double-fetch.
  async function fillDiscoverPage(reason) {
    if (fillDiscoverInProgress) return;
    if (!isDiscoverActive()) return;
    reason = reason || "initial";

    // Reset on URL change. Done here rather than in the URL-change
    // observer branch so it always runs before a fill attempt.
    if (discoverFillUrl !== window.location.href) {
      resetDiscoverFillState();
    }
    if (discoverFetchDone) return;

    // Wait for Lemmy to actually finish painting the new page before we
    // top up — running against an empty/half-rendered .post-listings
    // would seed an empty seen-IDs set, then anything Lemmy paints
    // afterwards would survive our dedup and look like duplicates of
    // our injected posts.
    if (document.querySelectorAll(".post-listing").length === 0) return;

    // Initial fill is a one-shot per URL — protects against MO-tick
    // re-entry while it's running. Scroll-triggered calls aren't gated
    // by this so they can run as many times as the scroll handler
    // fires (subject to in-progress + fetch-done guards).
    if (reason === "initial" && discoverFillAttempted) return;

    if (
      reason === "initial" &&
      discoverCountVisible() >= DISCOVER_FILL_TARGET_VISIBLE
    ) {
      discoverFillAttempted = true;
      return;
    }

    fillDiscoverInProgress = true;
    if (reason === "initial") discoverFillAttempted = true;
    showDiscoverLoadingIndicator();
    try {
      const maxAttempts =
        reason === "initial" ? DISCOVER_FILL_MAX_FETCHES : 3;
      let attempts = 0;
      while (attempts < maxAttempts && !discoverFetchDone) {
        // Initial mode stops once enough visible posts are on screen;
        // scroll mode just pulls a fixed small batch each trigger.
        if (
          reason === "initial" &&
          discoverCountVisible() >= DISCOVER_FILL_TARGET_VISIBLE
        ) break;
        attempts++;
        await fetchAndAppendDiscoverPage();
        if (!isDiscoverActive()) break;
      }
    } finally {
      hideDiscoverLoadingIndicator();
      fillDiscoverInProgress = false;
    }
  }

  let discoverScrollBound = false;
  function bindDiscoverScroll() {
    if (discoverScrollBound) return;
    discoverScrollBound = true;
    window.addEventListener("scroll", onDiscoverScroll, { passive: true });
    window.addEventListener("resize", onDiscoverScroll, { passive: true });
  }

  function onDiscoverScroll() {
    if (!isDiscoverActive()) return;
    if (fillDiscoverInProgress || discoverFetchDone) return;
    const fromBottom =
      document.documentElement.scrollHeight -
      (window.scrollY + window.innerHeight);
    if (fromBottom < 1500) fillDiscoverPage("scroll");
  }

  // Inject a "Discover" tab next to Lemmy's Subscribed / Local / All
  // button group. Lemmy re-renders the tabs on SPA navigation so we
  // call this from the MutationObserver tick; the early-return on an
  // existing instance keeps it cheap.
  function ensureDiscoverTab() {
    if (!isOnHomeInstance()) return;
    if (document.querySelector(".ltDiscoverTab")) {
      syncDiscoverTabActive();
      return;
    }
    const found = findListingTypeGroup();
    if (!found) return;
    const { group, wrapper } = found;

    // Clone the wrapper so we inherit whatever theme styling (Bootstrap
    // .btn classes, label structure, etc.) Lemmy is using for its own
    // tabs. The wrapper might *be* the clickable (a bare <button>) or
    // contain it (a <label> wrapping a radio + text). Either case is
    // handled by stripping the inner radio (so we don't pollute Lemmy's
    // form state) and overwriting the visible label.
    const tabNode = wrapper.cloneNode(true);
    tabNode.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
    tabNode.querySelectorAll("input").forEach((el) => el.remove());

    // Find the element we want to mark + style as active. If the wrapper
    // is itself a button/anchor/label, that's it; otherwise pick the
    // first such descendant.
    let clickable = tabNode;
    if (!isClickableTag(tabNode)) {
      clickable = tabNode.querySelector("button, a, label, [role='button']") || tabNode;
    }
    clickable.classList.add("ltDiscoverTab");
    clickable.title = "Browse only posts from communities you don't subscribe to";
    clickable.textContent = "Discover";
    if (clickable.tagName.toLowerCase() === "a") {
      clickable.href = buildDiscoverHref();
    }

    // Capture-phase handler so we beat any of Lemmy's own delegated
    // listeners that might intercept and SPA-route (which can strip
    // unknown URL params like ltDiscover). Clicking again while
    // Discover is active is treated as "exit Discover" so users always
    // have an obvious way back to plain All.
    tabNode.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isDiscoverActive()) {
        setDiscoverFlag(false);
        window.location.href = buildAllHref();
      } else {
        setDiscoverFlag(true);
        window.location.href = buildDiscoverHref();
      }
    }, true);

    if (wrapper.nextSibling) group.insertBefore(tabNode, wrapper.nextSibling);
    else group.appendChild(tabNode);
    ltLog(`discover tab injected (${clickable.tagName.toLowerCase()})`, LOG_INFO);
    syncDiscoverTabActive();
  }

  function isClickableTag(el) {
    if (!el || !el.tagName) return false;
    const t = el.tagName.toLowerCase();
    return t === "button" || t === "a" || t === "label";
  }

  function buildDiscoverHref() {
    return buildHomeListingHref({ ltDiscover: "1" });
  }

  function buildAllHref() {
    return buildHomeListingHref({});
  }

  function buildHomeListingHref(extra) {
    const home = (settings.instance || "").replace(/\/+$/, "");
    // Carry the user's current sort over so flipping in/out of Discover
    // doesn't reset Active/Hot/etc.
    let sort = "";
    try {
      sort = new URL(window.location.href).searchParams.get("sort") || "";
    } catch (_) {}
    const qs = new URLSearchParams();
    qs.set("listingType", "All");
    if (sort) qs.set("sort", sort);
    for (const [k, v] of Object.entries(extra || {})) qs.set(k, v);
    return `${home}/?${qs.toString()}`;
  }

  // Locate Lemmy's listing-type tab group. The tabs render as <button>,
  // <a>, or — in lemmy-ui 0.19.x — <label class="btn"> wrapping a hidden
  // radio. Strategy:
  //   1. Find any candidate (button/anchor/label/.btn/[role=button])
  //      whose text is exactly "All".
  //   2. Walk up the DOM looking for an ancestor that also contains
  //      candidates labeled Subscribed / Local / Moderator view.
  //      That ancestor is the tab group.
  //   3. Find the immediate child of the group that contains the All
  //      candidate — that's the wrapper to clone for our Discover tab,
  //      so we inherit whatever wrapping markup Lemmy uses.
  function findListingTypeGroup() {
    const TAB_LABELS = ["all", "subscribed", "local", "moderator view"];
    const SEL = "button, a, label, [role='button'], .btn";
    const candidates = document.querySelectorAll(SEL);
    for (const allBtn of candidates) {
      if (allBtn.classList.contains("ltDiscoverTab")) continue;
      const text = (allBtn.textContent || "").trim().toLowerCase();
      if (text !== "all") continue;

      let ancestor = allBtn.parentElement;
      let depth = 0;
      while (ancestor && depth < 6) {
        const inner = ancestor.querySelectorAll(SEL);
        const seen = new Set();
        for (const el of inner) {
          if (el.classList.contains("ltDiscoverTab")) continue;
          const t = (el.textContent || "").trim().toLowerCase();
          if (TAB_LABELS.includes(t)) seen.add(t);
        }
        if (seen.has("all") && seen.size >= 2) {
          let wrapper = allBtn;
          while (wrapper.parentElement && wrapper.parentElement !== ancestor) {
            wrapper = wrapper.parentElement;
          }
          return { group: ancestor, allBtn, wrapper };
        }
        ancestor = ancestor.parentElement;
        depth++;
      }
    }
    return null;
  }

  function syncDiscoverTabActive() {
    const tab = document.querySelector(".ltDiscoverTab");
    if (!tab) return;
    const inDiscover = isDiscoverActive();
    tab.classList.toggle("active", inDiscover);
    if (inDiscover) {
      // The URL still has listingType=All so Lemmy will mark its own
      // All tab active too. Strip it so Discover visually wins —
      // Lemmy may re-add on its own renders, we'll re-strip on ours.
      const found = findListingTypeGroup();
      if (found && found.allBtn) found.allBtn.classList.remove("active");
    }
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

  // Only image posts have a `<button class="thumbnail">` — link posts use
  // `<a class="thumbnail" href="…">` which we must NOT click, otherwise
  // we'd navigate to every external URL on the page.
  const THUMB_SELECTORS = [
    "button.thumbnail",
    ".post-listing button.thumbnail"
  ];

  function findThumbnails() {
    for (const sel of THUMB_SELECTORS) {
      const found = document.querySelectorAll(sel);
      if (found.length) return found;
    }
    return [];
  }

  // Tracks which thumbs we ourselves expanded, so "Hide All Images"
  // can collapse them by re-clicking (and we don't fight against the
  // user's manual expansions).
  const ltExpanded = new WeakSet();

  // Firefox content scripts run in an isolated world. Lemmy's lemmy-ui is
  // built with Inferno, whose onClick handlers attach in the page's JS
  // context — and a plain `el.click()` from this script doesn't reliably
  // fire them across the Xray boundary. Going through `wrappedJSObject`
  // (Firefox's escape hatch) calls .click() in the page's context so
  // Inferno actually sees the click and toggles its expand state.
  function clickInPage(el) {
    const target = (el && el.wrappedJSObject) || el;
    target.click();
  }

  // Pull the underlying image URL out of a Lemmy image_proxy proxy URL.
  // Returns the original (unwrapped) URL if the input is a proxy, else
  // the original input.
  function unwrapImageProxyUrl(url) {
    try {
      const u = new URL(url, window.location.origin);
      if (u.pathname.endsWith("/api/v3/image_proxy")) {
        const inner = u.searchParams.get("url");
        if (inner) return inner;
      }
    } catch (_) {}
    return url;
  }

  function pickThumbSrc(t) {
    // Prefer a non-webp source so we don't fight format negotiation.
    const sources = t.querySelectorAll("source[srcset]");
    for (const s of sources) {
      if (!/webp/i.test(s.type || "")) {
        const first = (s.getAttribute("srcset") || "").split(",")[0].trim().split(" ")[0];
        if (first) return first;
      }
    }
    if (sources[0]) {
      const first = (sources[0].getAttribute("srcset") || "").split(",")[0].trim().split(" ")[0];
      if (first) return first;
    }
    const img = t.querySelector("img");
    if (img && img.src) return img.src;
    return null;
  }

  // Render images directly into each post — bypassing Lemmy's own expand
  // handler entirely. Avoids state-machine fights with whatever click
  // behavior the current frontend has (single-expand, lightbox, etc.).
  function expandThumbnails(open) {
    const thumbs = findThumbnails();
    if (!open) {
      document
        .querySelectorAll(".lt-inline-wrap")
        .forEach((el) => el.remove());
      ltLog("expand(false): removed injected images", LOG_INFO);
      return;
    }
    if (!thumbs.length) {
      ltLog("expand: no thumbnails matched", LOG_INFO);
      return;
    }
    let count = 0;
    thumbs.forEach((t) => {
      const article = t.closest("article, .post-listing") || t.parentElement;
      if (!article) return;
      if (article.querySelector(":scope > .lt-inline-wrap")) return;
      const raw = pickThumbSrc(t);
      if (!raw) return;
      // Use the unwrapped (original) URL so we get full resolution rather
      // than the proxy's auto-thumbnailed copy.
      const src = unwrapImageProxyUrl(raw);
      const wrap = document.createElement("div");
      wrap.className = "lt-inline-wrap";
      const img = document.createElement("img");
      img.className = "lt-inline-img";
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      img.src = src;
      img.alt = "";
      wrap.appendChild(img);
      article.appendChild(wrap);
      count++;
    });
    ltLog(`expand(true): inserted ${count} inline image(s)`, LOG_INFO);
  }

  // ---------------- Open all links in new tab -------------------------

  // Tri-state mode: "off" | "external" | "all". Defensive — anything
  // unexpected (legacy boolean true/false, undefined) gets coerced.
  function linksInNewTabMode() {
    const v = settings.linksInNewTab;
    if (v === true) return "all";
    if (v === "external" || v === "all") return v;
    return "off";
  }

  // External = different origin (host/port/scheme) from current page.
  // mailto:/tel:/javascript: and other non-http schemes return false
  // so they fall through to native browser behavior.
  function isExternalUrl(href) {
    if (!href) return false;
    try {
      const u = new URL(href, window.location.href);
      if (u.protocol !== "http:" && u.protocol !== "https:") return false;
      return u.origin !== window.location.origin;
    } catch (_) {
      return false;
    }
  }

  function rewriteLinksInNewTab(root) {
    const mode = linksInNewTabMode();
    if (mode === "off") return;
    (root || document).querySelectorAll("a[href]:not([data-lt-newtab])").forEach((a) => {
      if (mode === "external" && !isExternalUrl(a.getAttribute("href"))) return;
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noreferrer");
      a.dataset.ltNewtab = "1";
    });
  }

  // Lemmy's SPA router intercepts internal-link clicks and calls
  // preventDefault before the browser honors target="_blank", so
  // attribute rewriting alone leaves internal navigation in-tab. This
  // capturing handler runs first, hijacks the click, and forces a real
  // window.open. Mode is checked at click-time so toggling in options
  // takes effect without reload. Modifier keys / non-primary buttons
  // fall through to native behavior (their UX is already what the user
  // expects). External-only mode never fights the SPA router for
  // internal links — it only intercepts off-origin links, which the
  // router wouldn't catch anyway.
  function installNewTabClickInterceptor() {
    document.addEventListener("click", (e) => {
      const mode = linksInNewTabMode();
      if (mode === "off") return;
      if (e.button !== 0) return;
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest && e.target.closest("a[href]");
      if (!a) return;
      // Skip our own bar / CTA UI so we don't disrupt internal LemmyTools flows.
      if (a.closest("#searchdiv, .topDivBar, .ltCtaCard")) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
      if (mode === "external" && !isExternalUrl(href)) return;
      e.preventDefault();
      e.stopPropagation();
      window.open(a.href, "_blank", "noopener,noreferrer");
    }, { capture: true });
  }

  // ---------------- Image click+drag resize (delegated) ---------------

  let dragNode = null;
  let dragPosX = 0;
  function startDrag(e) {
    if (!settings.expandImages) return;
    if (!e.target) return;
    const cls = e.target.classList;
    if (!cls.contains("img-expanded") && !cls.contains("lt-inline-img")) return;
    e.preventDefault();
    dragNode = e.target;
    dragNode.style.cursor = "nwse-resize";
    // Our injected images have a max-width: 100% safety cap; lift it during
    // active drag so the user can grow them past the column width.
    if (cls.contains("lt-inline-img")) dragNode.style.maxWidth = "none";
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

  // ---------------- Host normalisation --------------------------------

  // Lowercase, drop leading "www." and any stray whitespace. The comparison
  // surface for "is this URL on the user's home instance?" — and avoids
  // false negatives when settings.instance has a trailing slash, capital
  // letters, or %20-encoded whitespace, and when window.location.href has
  // %40-encoded "@" markers in /c/foo%40bar paths.
  function normalizeHost(s) {
    if (!s) return "";
    let h = String(s).trim();
    try { h = new URL(h.includes("://") ? h : `https://${h}`).hostname; }
    catch (_) {}
    return h.toLowerCase().replace(/^www\./, "");
  }

  function homeHost() {
    return normalizeHost(settings.instance);
  }

  function isOnHomeInstance() {
    const home = homeHost();
    return !!home && normalizeHost(window.location.hostname) === home;
  }

  // Conservative — default to "logged in" on any auth signal so the
  // logged-out CTA never wrongly appears for an actually-logged-in user.
  // Only returns true when we see a positive logged-out marker (the
  // /login link) AND no logged-in markers.
  function isLoggedOut() {
    try {
      if (localStorage.getItem("jwt")) return false;
    } catch (_) {}
    if (document.cookie && /(?:^|;\s*)jwt=/.test(document.cookie)) return false;
    if (document.querySelector('a[href="/inbox"]')) return false;
    if (document.querySelector('.notifications-link, .notifications-icon')) return false;
    return !!document.querySelector('a[href="/login"]');
  }

  // Sign-in (or set-home) CTA shown to logged-out users, prepended to
  // the bar's community list. Two states: instance set → sign-in link;
  // instance unset → "set home in options" link.
  function loggedOutCtaHtml() {
    const home = (settings.instance || "").replace(/\/+$/, "");
    if (home) {
      const loginUrl = `${home}/login`;
      const homeLabel = escapeHtml(homeHost() || home);
      return (
        `<li class="ltCtaCard ltLoginCta">` +
        `<div class="ltCtaTitle">Logged out</div>` +
        `<a class="ltCtaPrimary" href="${escapeHtml(loginUrl)}" ` +
        `target="_blank" rel="noreferrer" ` +
        `title="Sign in on your home instance to subscribe, vote, and comment">` +
        `<span class="ltCtaPrimaryIcon" aria-hidden="true">→</span>` +
        `<span class="ltCtaPrimaryLabel">Sign in on ${homeLabel}</span>` +
        `</a></li>`
      );
    }
    const optsUrl = browser.runtime.getURL("options/options.html");
    return (
      `<li class="ltCtaCard ltLoginCta">` +
      `<div class="ltCtaTitle">No home instance set</div>` +
      `<a class="ltCtaPrimary" href="${escapeHtml(optsUrl)}" ` +
      `target="_blank" rel="noreferrer" ` +
      `title="Pick your home instance to enable browsing &amp; subscribing">` +
      `<span class="ltCtaPrimaryIcon" aria-hidden="true">⚙</span>` +
      `<span class="ltCtaPrimaryLabel">Set home in options</span>` +
      `</a></li>`
    );
  }

  // Recently visited communities — fallback list for logged-out users
  // who have no subscribed list to scrape. Keys are e.g. "programming"
  // or "programming@lemmy.ml"; we link to /c/{key} relative to the
  // current page (works on any instance).
  function recentVisitedAsHtml(limit) {
    const entries = Object.entries(commVisits || {})
      .filter(([k, t]) => k && typeof t === "number")
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
    if (!entries.length) return "";
    const rows = entries.map(([key]) => {
      const safe = escapeHtml(key);
      const href = `/c/${escapeHtml(encodeURIComponent(key))}`;
      return (
        `<li class="ltDiscoveredItem ltRecentItem" data-lt-comm="${safe}">` +
        `<a href="${href}">${safe}</a></li>`
      );
    });
    return (
      `<li class="ltDiscoveredHeader ltRecentHeader">` +
      `<strong>Recently visited (${entries.length})</strong></li>` +
      rows.join("")
    );
  }

  // Renders the "Home" anchor for the bar header. Falls back to a
  // call-to-action that opens settings when the user hasn't set one yet —
  // off-instance features silently no-op without it, so the header is the
  // best place to nag.
  function homeHeaderLinkHtml() {
    const trimmed = (settings.instance || "").trim();
    if (!trimmed) {
      return `<a href="#" class="ltSetHomeLink" title="Set your home Lemmy instance">Set home &rarr;</a>`;
    }
    return `<a href="${escapeHtml(trimmed)}">Home</a>`;
  }

  function refreshHomeHeaderLink() {
    document.querySelectorAll(".ltHomeLinkSlot").forEach((slot) => {
      slot.innerHTML = homeHeaderLinkHtml();
    });
  }

  // ---------------- Sidebar / top bar UI ------------------------------

  let commsAreaStatic;
  let commsAreaSearch;
  let searchInput;
  let subscribedHtml = "";
  let combinedHtml = "";
  let currentRemoteCtaHtml = "";

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
                 placeholder='Search subs'
                 title='Search your subscriptions and recently visited communities.' />
          <a id='dropDownComms' href="#" title="Show all communities"> (Show All) </a>
          <a class='ltSettingsBtn' href="#" title='LemmyTools settings'
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
          <span class='ltHomeLinkSlot'>${homeHeaderLinkHtml()}</span> -
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
            <span class='ltHomeLinkSlot'>${homeHeaderLinkHtml()}</span> ·
            <a href="https://lemmyverse.net/communities" target="_blank" rel="noreferrer">Find</a> ·
            <a class='ltSettingsBtn' href="#" title='LemmyTools settings'
               aria-label='Open LemmyTools settings'>&#9881;</a>
            <img id="lemmyLogo" width="22" height="22" class='targetImg'
                 src="${browser.runtime.getURL("icons/lemmy-logo.webp")}" />
          </h6>
        </header>
        <input type='text' id='commsearch' name='commsearchinput'
               placeholder='Search subs'
               title='Search your subscriptions and recently visited communities.' />
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

    // Delegated so it survives the live-refresh innerHTML swap done by
    // refreshHomeHeaderLink() when settings.instance changes.
    document.addEventListener("click", (e) => {
      const link = e.target.closest && e.target.closest(".ltSetHomeLink");
      if (!link) return;
      e.preventDefault();
      openSettings();
    });

    const barClickHandler = (e) => {
      const cta = e.target.closest && e.target.closest(".ltCtaAddGroup");
      if (cta) {
        e.preventDefault();
        e.stopPropagation();
        const key = extractCommKeyFromHref(window.location.pathname);
        if (key) openGroupPicker(key);
        return;
      }
      const liBtn = e.target.closest && e.target.closest(".ltLiAddGroup");
      if (liBtn) {
        e.preventDefault();
        e.stopPropagation();
        const li = liBtn.closest("li");
        const a = li ? li.querySelector("a[href*='/c/']") : null;
        const key = a ? extractCommKeyFromHref(a.getAttribute("href")) : null;
        if (key) openGroupPicker(key);
        return;
      }
      const a = e.target.closest && e.target.closest("a[href*='/c/']");
      if (!a) return;
      const key = extractCommKeyFromHref(a.getAttribute("href"));
      if (!key) return;
      window.LemmyToolsStorage.recordCommunityVisit(key).catch(() => {});
    };
    for (const root of [commsAreaStatic, commsAreaSearch]) {
      if (!root) continue;
      for (let i = 0; i < root.length; i++) {
        root[i].addEventListener("click", barClickHandler);
      }
    }

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

  function decorateLiWithGroupPicker(root) {
    if (!root) return;
    const items = root.getElementsByTagName("li");
    for (let i = 0; i < items.length; i++) {
      const li = items[i];
      if (li.classList.contains("ltDiscoveredHeader")) continue;
      if (li.querySelector(".ltLiAddGroup")) continue;
      const a = li.querySelector("a[href*='/c/']");
      if (!a) continue;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ltLiAddGroup";
      btn.title = "Add to group";
      btn.setAttribute("aria-label", "Add to group");
      btn.textContent = "+";
      li.appendChild(btn);
    }
  }

  function makeGroupId() {
    return "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function openGroupPicker(commKey) {
    if (!commKey) return;
    document.querySelectorAll("dialog.ltGroupPicker").forEach((d) => {
      try { d.close(); } catch (_) {}
      d.remove();
    });

    const dialog = document.createElement("dialog");
    dialog.className = "ltGroupPicker userTagger";

    const wrap = document.createElement("div");
    wrap.className = "ltGroupPickerWrap";
    dialog.appendChild(wrap);

    const title = document.createElement("strong");
    title.textContent = `Groups for ${commKey}`;
    wrap.appendChild(title);

    const list = document.createElement("ul");
    list.className = "ltGroupPickerList";
    wrap.appendChild(list);

    const newForm = document.createElement("form");
    newForm.className = "ltGroupPickerNew";
    const newInput = document.createElement("input");
    newInput.type = "text";
    newInput.placeholder = "New group name";
    const newSubmit = document.createElement("button");
    newSubmit.type = "submit";
    newSubmit.textContent = "+ Create";
    newForm.appendChild(newInput);
    newForm.appendChild(newSubmit);
    wrap.appendChild(newForm);

    const closeRow = document.createElement("div");
    closeRow.className = "ltGroupPickerClose";
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.textContent = "Done";
    closeRow.appendChild(closeBtn);
    wrap.appendChild(closeRow);

    function renderList() {
      list.innerHTML = "";
      if (!commGroups.length) {
        const empty = document.createElement("li");
        empty.className = "ltGroupPickerEmpty";
        empty.textContent = "No groups yet — create one below.";
        list.appendChild(empty);
        return;
      }
      for (const g of commGroups) {
        const li = document.createElement("li");
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.id = `lt-gp-${g.id}`;
        cb.checked = (g.members || []).includes(commKey);
        const lbl = document.createElement("label");
        lbl.htmlFor = cb.id;
        lbl.textContent = " " + g.name;
        li.appendChild(cb);
        li.appendChild(lbl);
        list.appendChild(li);

        cb.addEventListener("change", async () => {
          const target = commGroups.find((x) => x.id === g.id);
          if (!target) return;
          if (cb.checked) {
            if (!target.members.includes(commKey)) target.members.push(commKey);
          } else {
            target.members = target.members.filter((m) => m !== commKey);
          }
          await window.LemmyToolsStorage.setCommunityGroups(commGroups);
        });
      }
    }
    renderList();

    newForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = (newInput.value || "").trim();
      if (!name) return;
      commGroups.push({ id: makeGroupId(), name, members: [commKey] });
      await window.LemmyToolsStorage.setCommunityGroups(commGroups);
      newInput.value = "";
      // Creating a group from this picker implies the community is the
      // first member — closing afterwards saves an extra "Done" click.
      closeDialog(dialog);
    });

    closeBtn.addEventListener("click", () => closeDialog(dialog));
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) closeDialog(dialog);
    });

    document.body.appendChild(dialog);
    dialog.showModal();
    // Focus the new-group input only when there are no groups yet (typical
    // first run); otherwise let focus land on the dialog so existing-group
    // checkboxes stay one Tab away.
    if (!commGroups.length) {
      try { newInput.focus(); } catch (_) {}
    }
  }

  function discoveredAsHtml(list) {
    if (!list || !list.length) return "";
    const sorted = list
      .slice()
      .sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
    const rows = sorted.map((c) => {
      const fqn = `${c.name}@${c.instance}`;
      const homeUrl = `${settings.instance.replace(/\/+$/, "")}/c/${encodeURIComponent(fqn)}`;
      return (
        `<li class="ltDiscoveredItem" data-lt-comm="${escapeHtml(fqn)}">` +
        `<a href="${escapeHtml(homeUrl)}" target="_blank" rel="noreferrer" ` +
        `title="Browse / subscribe on your home instance">${escapeHtml(fqn)}</a></li>`
      );
    });
    return (
      `<li class="ltDiscoveredHeader"><strong>Discovered (${sorted.length})</strong></li>` +
      rows.join("")
    );
  }

  function extractCommKeyFromHref(href) {
    if (!href) return null;
    const idx = href.indexOf("/c/");
    if (idx < 0) return null;
    const tail = href.slice(idx + 3).split(/[?#/]/)[0];
    return tail ? decodeURIComponent(tail) : null;
  }

  function extractCommKeyFromLi(li) {
    const a = li.querySelector("a[href*='/c/']");
    return a ? extractCommKeyFromHref(a.getAttribute("href")) : null;
  }

  function sortItemsByVisit(items) {
    items.sort((a, b) => {
      const keyA = extractCommKeyFromLi(a);
      const keyB = extractCommKeyFromLi(b);
      const tA = (keyA && commVisits[keyA]) || 0;
      const tB = (keyB && commVisits[keyB]) || 0;
      if (tA !== tB) return tB - tA;
      return (keyA || "").localeCompare(keyB || "");
    });
  }

  function parseSubscribedItems(html) {
    if (!html) return [];
    const tpl = document.createElement("template");
    tpl.innerHTML = `<ul>${html}</ul>`;
    const ul = tpl.content.querySelector("ul");
    return ul
      ? Array.from(ul.children).filter((n) => n.tagName === "LI")
      : [];
  }

  // Re-orders the cached subscribed `<li>` items by most recent visit. Items
  // never visited fall to the bottom in alphabetical order.
  function sortSubscribedHtmlByRecent(html) {
    const items = parseSubscribedItems(html);
    if (items.length < 2) return html;
    sortItemsByVisit(items);
    return items.map((n) => n.outerHTML).join("");
  }

  // Renders subscribed items partitioned into the user's groups, with an
  // "Ungrouped" tail. Returns the original html if no groups exist.
  function renderGroupedSubscribed(html) {
    if (!commGroups.length) {
      return settings.commsSortMode === "recent"
        ? sortSubscribedHtmlByRecent(html)
        : html;
    }
    const items = parseSubscribedItems(html);
    if (!items.length) return html;

    const buckets = new Map();
    for (const g of commGroups) buckets.set(g.id, []);
    const ungrouped = [];

    const memberOf = (key) => {
      if (!key) return null;
      for (const g of commGroups) {
        if (g.members.includes(key)) return g.id;
      }
      return null;
    };

    for (const li of items) {
      const key = extractCommKeyFromLi(li);
      const gid = memberOf(key);
      if (gid) buckets.get(gid).push(li);
      else ungrouped.push(li);
    }

    const useRecent = settings.commsSortMode === "recent";
    const out = [];
    for (const g of commGroups) {
      const list = buckets.get(g.id);
      if (!list || !list.length) continue;
      if (useRecent) sortItemsByVisit(list);
      out.push(
        `<details open class="ltGroup"><summary class="ltGroupSummary">` +
          `${escapeHtml(g.name)} <span class="ltGroupCount">(${list.length})</span>` +
          `</summary><ul class="ltGroupList">` +
          list.map((n) => n.outerHTML).join("") +
          `</ul></details>`
      );
    }
    if (ungrouped.length) {
      if (useRecent) sortItemsByVisit(ungrouped);
      out.push(ungrouped.map((n) => n.outerHTML).join(""));
    }
    return out.join("");
  }

  function rebuildCommunityList() {
    const parts = [];
    if (currentRemoteCtaHtml) parts.push(currentRemoteCtaHtml);
    // Logged-out users have no subscribed list to scrape; surface a
    // sign-in CTA + recent visits so the bar isn't empty.
    const loggedOut = isLoggedOut();
    if (loggedOut) parts.push(loggedOutCtaHtml());
    if (subscribedHtml) {
      parts.push(renderGroupedSubscribed(subscribedHtml));
    }
    if (loggedOut) {
      const recent = recentVisitedAsHtml(15);
      if (recent) parts.push(recent);
    }
    const discoveredHtml = discoveredAsHtml(discoveredComms);
    if (discoveredHtml) parts.push(discoveredHtml);
    combinedHtml = parts.join("");
    if (commsAreaStatic && commsAreaStatic[0]) {
      commsAreaStatic[0].innerHTML = combinedHtml;
      decorateLiWithGroupPicker(commsAreaStatic[0]);
    }
    if (searchInput && searchInput.value) runSearch(searchInput.value);
  }

  function runSearch(rawQuery) {
    if (!commsAreaStatic || !commsAreaStatic[0]) return;
    const query = (rawQuery || "").toLowerCase();
    const root = commsAreaStatic[0];

    if (query === "-f" && combinedHtml) {
      root.innerHTML = combinedHtml;
      decorateLiWithGroupPicker(root);
      return;
    }

    root.innerHTML = combinedHtml;
    decorateLiWithGroupPicker(root);
    if (!query) {
      // Keep the "Show All" popup in sync — without this, clicking the
      // top-bar's (Show All) toggle would reveal an empty box.
      for (let i = 0; i < commsAreaSearch.length; i++) {
        commsAreaSearch[i].innerHTML = combinedHtml;
        decorateLiWithGroupPicker(commsAreaSearch[i]);
      }
      return;
    }

    if (query.length > 2) {
      window.LemmyToolsStorage.pushSearchHistory(query).catch(() => {});
    }

    const items = root.getElementsByTagName("li");
    const data = [];
    for (let i = 0; i < items.length; i++) {
      const li = items[i];
      // Skip section headers — they shouldn't survive filtering.
      if (li.classList.contains("ltDiscoveredHeader")) continue;
      if (li.textContent.toLowerCase().indexOf(query) !== -1) {
        data.push(li.outerHTML);
      }
    }
    const unique = [...new Set(data)].sort();
    const out = unique.join("");
    for (let i = 0; i < commsAreaSearch.length; i++) {
      commsAreaSearch[i].innerHTML = `Communities: ${unique.length}<hr />${out}`;
      decorateLiWithGroupPicker(commsAreaSearch[i]);
    }
    root.innerHTML = `Communities: ${unique.length}<hr />${out}`;
    decorateLiWithGroupPicker(root);
  }

  async function populateLocalCommunities() {
    if (!isOnHomeInstance()) {
      ltLog("Not on home instance — skipping local comms scan", LOG_DEBUG);
      const cached = await window.LemmyToolsStorage.getCachedComms();
      if (cached) subscribedHtml = cached;
      invalidateSubscribedKeyCache();
      rebuildCommunityList();
      return;
    }
    const items = new Set();
    document
      .querySelectorAll('[class="list-inline-item d-inline-block"]')
      .forEach((el) => {
        items.add(`<li>${el.innerHTML.toLowerCase()}</li>`);
      });
    if (items.size) {
      subscribedHtml = [...items].join("");
      await window.LemmyToolsStorage.setCachedComms(subscribedHtml);
    } else {
      const cached = await window.LemmyToolsStorage.getCachedComms();
      if (cached) subscribedHtml = cached;
    }
    invalidateSubscribedKeyCache();
    rebuildCommunityList();
  }

  // Parse the community at `/c/<name>[@instance]` into its canonical
  // {name, instance} form. The host the page is loaded on is used as a
  // fallback when the URL doesn't carry an explicit @instance suffix.
  // The tail is URL-decoded so /c/foo%40bar.com (which is what we get
  // when an `@` survives encodeURIComponent on the way in) still splits
  // cleanly on `@`.
  function parseCommunityFromUrl(url) {
    const broken = url.split("/c/");
    if (broken.length < 2) return null;
    const host = normalizeHost(broken[0]);
    let tail = broken[1].split("?")[0].split("#")[0].split("/")[0];
    if (!tail) return null;
    try { tail = decodeURIComponent(tail); } catch (_) {}
    const at = tail.indexOf("@");
    if (at >= 0) {
      const name = tail.slice(0, at);
      const instance = tail.slice(at + 1);
      if (!name || !instance) return null;
      return { name, instance: normalizeHost(instance) };
    }
    return { name: tail, instance: host };
  }

  // Render a CTA at the top of the bar for whatever /c/ page we're on:
  //   - community name
  //   - "Browse / subscribe on home" (only when the page itself isn't home)
  //   - "+ Add to group" (always)
  // Also persists off-home sightings into the discovered list.
  //
  // "On home" is decided by the *page host*, not the federation tag in the
  // URL — visiting otherinstance.com/c/foo@home.com is still off-home, even
  // though the federation tag matches your home host.
  function checkRemoteCommunity() {
    currentRemoteCtaHtml = "";
    const parsed = parseCommunityFromUrl(window.location.href);
    if (!parsed) {
      rebuildCommunityList();
      return;
    }
    const fqn = `${parsed.name}@${parsed.instance}`;
    const homeBase = (settings.instance || "").replace(/\/+$/, "");
    const home = homeHost();
    const onHome = isOnHomeInstance();

    // When the federation tag already matches home, link to the bare
    // `/c/<name>` — the home instance addresses its own communities
    // without an @home suffix and a redirect would just bounce.
    const homeCommPath = home && parsed.instance === home
      ? `/c/${encodeURIComponent(parsed.name)}`
      : `/c/${encodeURIComponent(fqn)}`;

    const parts = [`<li class="ltCtaCard"><div class="ltCtaTitle">${escapeHtml(fqn)}</div>`];
    if (!onHome && homeBase) {
      parts.push(
        `<a class="ltCtaPrimary" ` +
          `href="${escapeHtml(homeBase)}${homeCommPath}" ` +
          `target="_blank" rel="noreferrer" ` +
          `title="Open this community on your home instance to browse or subscribe">` +
          `<span class="ltCtaPrimaryIcon" aria-hidden="true">⤴</span>` +
          `<span class="ltCtaPrimaryLabel">Browse / subscribe on home</span>` +
          `</a>`
      );
    }
    parts.push(
      `<button type="button" class="ltCtaSecondary ltCtaAddGroup" ` +
        `title="Add this community to one of your groups">+ Add to group</button>`
    );
    parts.push(`</li>`);
    currentRemoteCtaHtml = parts.join("");
    rebuildCommunityList();

    if (onHome) return;

    window.LemmyToolsStorage
      .recordDiscoveredCommunity(parsed.name, parsed.instance)
      .then((list) => {
        if (Array.isArray(list)) {
          discoveredComms = list;
          rebuildCommunityList();
        }
      })
      .catch((e) => ltLog(`record discovered failed: ${e}`, LOG_INFO));
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

  // Dumps a diagnostic snapshot to the page console. Called from the
  // Show-All-Images click handler so we can see what's actually on the
  // page when the user reports the feature isn't working.
  function dumpShowAllImagesDiagnostic(label) {
    /* eslint-disable no-console */
    console.group(`[LemmyTools] ${label}`);
    console.log("URL:", window.location.href);
    console.log("Settings (relevant):", {
      instance: settings.instance,
      showAllImages: settings.showAllImages,
      hideShowAllImagesButton: settings.hideShowAllImagesButton
    });
    console.log(".post-listings container:", document.querySelector(".post-listings"));
    console.log(".posts container:", document.querySelector(".posts"));
    for (const sel of THUMB_SELECTORS) {
      console.log(`  ${sel}: ${document.querySelectorAll(sel).length}`);
    }
    console.log(
      "  any .thumbnail:",
      document.querySelectorAll(".thumbnail").length
    );
    const sample = document.querySelector(".thumbnail");
    if (sample) {
      console.log("Sample .thumbnail tagName:", sample.tagName);
      console.log("Sample .thumbnail className:", sample.className);
      console.log(
        "Sample .thumbnail outerHTML (first 500 chars):",
        sample.outerHTML.slice(0, 500)
      );
    } else {
      console.log("No element with class 'thumbnail' anywhere on the page.");
      // Look for likely image triggers as a fallback hint.
      const fallback =
        document.querySelector(".post-listing img") ||
        document.querySelector("[class*='thumbnail']") ||
        document.querySelector(".post-listing button");
      if (fallback) {
        console.log("Possible fallback element:", fallback.outerHTML.slice(0, 500));
      }
    }
    console.groupEnd();
    /* eslint-enable no-console */
  }

  let warnedNoPostListings = false;
  function injectShowAllImagesButton() {
    if (settings.showAllImages || settings.hideShowAllImagesButton) return;
    const target =
      document.querySelector(".post-listings") ||
      document.querySelector(".posts");
    if (!target) {
      if (!warnedNoPostListings) {
        warnedNoPostListings = true;
        ltLog("Show-all-images: no .post-listings/.posts container yet", LOG_INFO);
      }
      return;
    }
    if (target.querySelector("#showAllImages")) return;
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
      dumpShowAllImagesDiagnostic(`Show All Images clicked (target=${showing ? "expand" : "collapse"})`);
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
    rewriteLinksInNewTab(document);
    installNewTabClickInterceptor();
    if (settings.showAllImages) expandThumbnails(true);
    blockContent();
    // Seed the session flag from the current URL so a bookmarked
    // Discover link (or a tab restored after browser restart) lights
    // up Discover mode immediately on first paint.
    syncDiscoverFlagFromUrl();
    ensureDiscoverTab();
    applyDiscoverFilter();
    fillDiscoverPage();
    bindDiscoverScroll();
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
        // Reconcile our session flag with the new URL — pagination keeps
        // us in Discover, leaving for Subscribed/Local clears it.
        syncDiscoverFlagFromUrl();
        // Navigated off Discover — restore posts we had hidden so they
        // aren't stuck collapsed on the next view.
        if (!isDiscoverActive()) unhideSubscribedFiltered();
      }
      applyHideSidebar();
      injectShowAllImagesButton();
      rewriteLinksInNewTab(document);
      blockContent();
      ensureDiscoverTab();
      applyDiscoverFilter();
      fillDiscoverPage();
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
