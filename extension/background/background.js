"use strict";

// Minimal background script. Currently used only to open the options
// page when requested by the content script's gear icon, and to install
// a default settings record on first run.

browser.runtime.onInstalled.addListener(async () => {
  const r = await browser.storage.local.get("LemmyToolsOptions");
  if (!r.LemmyToolsOptions) {
    await browser.storage.local.set({
      LemmyToolsOptions: {
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
      }
    });
  }
});

browser.runtime.onMessage.addListener((msg, _sender) => {
  if (msg && msg.type === "openOptions") {
    return browser.runtime.openOptionsPage();
  }
  return undefined;
});
