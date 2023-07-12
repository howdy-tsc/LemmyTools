// ==UserScript==
// @name         LemmyTools
// @namespace    https://thesimplecorner.org/c/lemmytools
// @version      0.2.0
// @description  A small suite of tools to make Lemmy easier.
// @author       howdy@thesimplecorner.org
// @author       @cwagner@lemmy.cwagner.me
// @grant        none
// @include      https://*
// ==/UserScript==

//If lemmy do
(function () {
  "use strict";
  if (!isLemmySite()) {
    return;
  }
  const LogDebug = 0;
  const LogInformation = 1;
  const LogImportant = 2;
  // ------------ EDIT THIS VARIABLE ---------------------
  const homeInstance = "";

  // Choose a log level for the console:
  const logLevel = LogDebug;
  // const logLevel = LogInformation;
  // const logLevel = LogImportant;
  // ------------ END EDIT AREA --------------------------
  // Fixes remote Instance home link. Example: var homeInstance = 'https://lemmy.world';
  //Nothing below needs editing.
  // -------------- VERSION -------------------
  const ltVer = "0.2.0.0";
  const ltTestedVer = "0.18.1";
  //--------------------------------------------

  /* Globals */

  const mobile = isltMobile();
  let remoteCommunityArray = [];

  function isHomeInstanceSet(i2c) {
    return i2c.length > 3;
  }

  function ltLog(msg, level) {
    level = level || LogImportant;
    if (level < logLevel) return;
    console.log("[LemmyTools]", msg);
  }

  function isLemmySite() {
    return (
      document.querySelector('meta[name="Description"]').content === "Lemmy"
    );
  }

  function notHomeAndInCommunity(url) {
    return (
      url.includes(settings.instance) === false &&
      (url.includes("/c/") ||
        url.includes("/post/") ||
        url.includes("/comment/") ||
        url.includes("/communities"))
    );
  }

  function isltMobile() {
    if (/Android|iPhone/i.test(navigator.userAgent)) {
      ltLog("is mobile!");
      return true;
    } else {
      ltLog("is desktop!");
      return false;
    }
  }

  //Remote Instance
  function update(comm, page, subString) {
    try {
      if (comm) {
        const browsedComm = `<li><h5>${comm}</h5></li>
<li>
    <a href='${homeInstance}/c/${page}' target='_blank'><button type="button" class='ltbutton'>Browse/Sub on Home Instance</button></a>
    <br />
    <a href='${subString}' target='_blank'><button type="button" class='ltbutton'>Alternative Subscribe Method</button></a>
</li>`;
        remoteCommunityArray.push(browsedComm);
      }
    } catch {}

    return remoteCommunityArray;
  }

  //Searches communityArray for results in LemmyTools Sidebar.
  function searchComms(query, full) {
    ltLog(`commsearch evt searchinput${query}${div}`, LogDebug);
    const url = window.location.href;
    query = query || "";
    query = query.toLowerCase();

    if (query === "") {
      const commsCount = localStorage.getItem("commsCount");
      if (commsCount == null || full.length < 1) {
        div.innerHTML = `<hr /><b>Welcome to LemmyTools! Ver ${ltVer}</b><br /><br />
If this is your first time running the script, set your lemmy homeinstance in the option page.
[${ltVer}] - Manually enter your home lemmy instance in script for offsite home button functionality. (temporary)]. <br /><br />
If you don’t see your subscribed communities here, simply login to your lemmy instance and then click the LemmyTools home button above. `;
      } else {
        div.innerHTML = `Communities: ${commsCount}<hr />${full}`;
      }
    } else {
      //This searches the pushed communityArray with the query, saves it to a array, removes any duplicate values, sorts and then pushes to the commupdate function.
      div.innerHTML = full;
      ltLog(`Searching for:${query}`, LogDebug);
      const children = div.getElementsByTagName("li");
      ltLog(`Children found: ${children.length}`, LogDebug);
      let data = [""];
      let found;
      for (let i = 0; i < children.length; i++) {
        if (children[i].innerHTML.toLowerCase().indexOf(query) !== -1) {
          found = children[i].innerHTML + "<br />";
          ltLog(`Found: ${found}`, LogDebug);
          data.push(found);
        }
      }
      const resultSet = [...new Set(data)];
      resultSet.sort();
      commupdate(url, resultSet);
    }
  }

  function commupdate(page, data) {
    ltLog("LTbar Update");
    let count = -1;
    data.forEach((_) => count++);
    data = data.join("");
    div.innerHTML = `Results: ${count}<hr /><br />${data}`;
  }
  const optionsKey = "LemmyToolsOptions";

  function getSettingsFromLocalStorage() {
    try {
      return JSON.parse(localStorage.getItem(optionsKey) || "{}");
    } catch (_) {
      return {};
    }
  }
  function options(open) {
    const odiv = document.getElementById("ltOptions");
    ltLog(`Options Functions: ${open}`);
    let userOptions = {};
    if (open === 1) {
      odiv.style.display = "block";
    } else if (open === 2) {
      //First run set defaults or pull from localstorage.
      const mobile = isltMobile();
      userOptions = Object.assign(
        {},
        {
          commposSide: mobile ? "left" : "right",
          reverseSide: mobile ? "right" : "left",
          instance: homeInstance || window.location.origin,
          commposVertical: 0,
          expandImages: true,
          hideSideBar: false,
          expandImagesize: mobile ? 100 : 50,
          hoverCheck: false,
          unblurNSFW: false,
          alienSiteOld: !mobile,
          alienSiteOldReadWidth: 740,
          expandImageSpeed: 0.5,
          showAllImages: false,
          hideShowAllImagesButton: false,
        },
        getSettingsFromLocalStorage()
      );
      localStorage.setItem(optionsKey, JSON.stringify(userOptions));
    } else if (open === 3) {
      //save button
      odiv.style.display = "none";

      userOptions.commposSide =
        document.getElementById("option_commposSide").value;
      userOptions.instance = document.getElementById(
        "option_homeInstance"
      ).value;
      userOptions.commposVertical = parseInt(
        document.getElementById("option_commposVertical").value
      );
      userOptions.expandImages = document.getElementById(
        "option_expandImages"
      ).checked;
      userOptions.expandImagesize = parseInt(
        document.getElementById("option_expandImagesize").value,
        10
      );
      userOptions.expandImageSpeed = parseFloat(
        document.getElementById("option_expandImageSpeed").value
      );
      userOptions.hideSideBar =
        document.getElementById("option_hideSideBar").checked;
      userOptions.hoverCheck =
        document.getElementById("option_hoverCheck").checked;
      userOptions.unblurNSFW =
        document.getElementById("option_unblurNSFW").checked;
      userOptions.alienSiteOld = document.getElementById(
        "option_alienSiteOld"
      ).checked;
      userOptions.alienSiteOldReadWidth = parseInt(
        document.getElementById("option_alienSiteOldReadWidth").value
      );
      userOptions.showAllImages = document.getElementById(
        "option_showAllImages"
      ).checked;
      userOptions.hideShowAllImagesButton = document.getElementById(
        "option_hideShowAllImagesButton"
      ).checked;

      if (userOptions.commposVertical > 85) {
        userOptions.commposVertical = 85;
      } else if (userOptions.commposVertical <= -1) {
        userOptions.commposVertical = 0;
      }

      if (userOptions.expandImageSpeed > 1) {
        userOptions.expandImageSpeed = 1;
      } else if (userOptions.expandImageSpeed < 0) {
        userOptions.expandImageSpeed = 0;
      }

      if (userOptions.commposSide === "left") {
        userOptions.reverseSide = "right";
      } else {
        userOptions.reverseSide = "left";
      }

      localStorage.setItem(optionsKey, JSON.stringify(userOptions));
      location.reload(true);
    }

    userOptions = getSettingsFromLocalStorage();
    ltLog(`Settings ${JSON.stringify(userOptions)}`);
    return userOptions;
  }

  //Used for offset removal
  function removeClassByWildcard(divClass) {
    // If the class ends with a "*", then it matches all classes that start with the given class name.
    if (divClass.endsWith("*")) {
      divClass = divClass.replace("*", "");
      // Get all elements with the given class name.
      const elements = document.getElementsByTagName("div");
      const re = new RegExp("(^|s)" + divClass + "(s|$)");
      const result = [];
      let className = "";

      for (let i = 0; i < elements.length; i++) {
        if (re.test(elements[i].className)) {
          console.log("Match: " + elements[i]);
          result.push(elements[i]);
          for (let y = 0; y < elements[i].classList.length; y++) {
            if (elements[i].classList[y].indexOf(divClass) !== -1) {
              className = elements[i].classList[y];
              console.log(className);
            }
          }
        }
      }
      // Remove the class from all elements.
      for (let i = 0; i < result.length; i++) {
        result[i].classList.remove(className);
      }
    } else {
      // Otherwise, the class must match exactly.
      const elements = document.querySelectorAll("[class=" + divClass + "]");

      // Remove the class from all elements.
      for (let i = 0; i < elements.length; i++) {
        elements[i].classList.remove(divClass);
      }
    }
  }
  //Expand all images on page
  function allImages(show) {
    const clickableImages = document.getElementsByClassName("thumbnail rounded overflow-hidden d-inline-block position-relative p-0 border-0 bg-transparent");
    ltLog(clickableImages.length, LogDebug);
    ltLog(clickableImages, LogDebug);
    if (show) {
      for (let i = 0; i < clickableImages.length; i = i + 2) {
        try {
          clickableImages[i].click();
          clickableImages[i].show();
        } catch {}
      }
    } else {
      //lazy - need to figure out way to handle on dom iter
      location.reload(true);
    }
  }

  // todo maybe something safer
  function alienSiteOldStyle_compact() {
    const xhr = new XMLHttpRequest();
    xhr.open(
      "GET",
      "https://cdn.jsdelivr.net/gh/soundjester/lemmy_monkey@main/old.reddit.compact.user.js"
    );
    xhr.onload = function () {
      document.head.appendChild(document.createElement("script")).innerHTML =
        xhr.responseText;
    };
    xhr.send();
  }

  function linksInNewTab () {
   const links = document.getElementsByTagName("a");
   for (let i = 0; i < links.length; i++)
   {
     links[i].setAttribute('target', '_blank');
     links[i].setAttribute('rel', 'noreferrer');
   }

  }
  // LemmyTools

  //check if first run or load saved settings
  let settings = options(2);

  /* The provided restyling was graciously used with permission from the developer(s) of Compact Lemmy to old.Reddit Re-format (Lemmy v0.18)

      // @name         Compact Lemmy to old.Reddit Re-format (Lemmy v0.18)
      // @namespace    https://github.com/soundjester/lemmy_monkey
      // @description  Reformat widescreen desktop to look more like Reddit
      // @author       mershed_perderders, DarkwingDuck, dx1@lemmy.world, Djones4822, Jakylla

      Thank you.
      */

  //Add Compact AlienSiteOld Theme
  if (settings.alienSiteOld === true) {
    console.log("LemmyTools: Adding alienSiteOld");
    alienSiteOldStyle_compact();
  }

  function checkedIfTrue(val) {
    return val ? "checked" : "";
  }

  /* Script */
  let url = document.location.href;
  window.onload = () => {
    if (settings.showAllImages) allImages(true); // initial expansion
    const body = document.querySelector("body");
    const observer = new MutationObserver((_) => {
      if (url !== document.location.href) {
        url = document.location.href;
        if (settings.showAllImages) {
          setTimeout(() => {
            allImages(true);
          }, 1000); // todo there has to be a better way to wait for the content to be loaded …
        }
      }
    });
    observer.observe(body, { childList: true, subtree: true });
  };
  let count = 0;
  let eIcheck = checkedIfTrue(settings.expandImages);
  let hSBcheck = checkedIfTrue(settings.hideSideBar);
  let hoverCheck = checkedIfTrue(settings.hoverCheck);
  let unblurCheck = checkedIfTrue(settings.unblurNSFW);
  let aSOcheck = checkedIfTrue(settings.alienSiteOld);
  let showAllImagesCheck = checkedIfTrue(settings.showAllImages);
  let hideShowAllImagesButtonCheck = checkedIfTrue(settings.hideShowAllImagesButton);

  //Option Divs
  //Is HomeInstance Manually Set For WorkAround

  var hIAlertString = isHomeInstanceSet(homeInstance)
    ? ""
    : "<b style='color: red;'>Your Home Instance has not been manually set in the UserScript.</b><br />";


  //Create Lemmy Tools Elements ----------------------------------------

  const odiv = document.createElement("div");
  odiv.setAttribute("id", "ltOptions");
  odiv.classList.add("ltoptions", "border-secondary", "card");
  odiv.innerHTML = `
    <h4>LemmyTools ${ltVer} Options</h4>
  </hr>
  <div class='table-responsive'>
    <table class='table'>
      <thead class='pointer'>
        <tr>
          <th>Option:</th>
          <th>Value:</th>
      </thead>
      </tr>
      <tbody>
        <tr>
          <td><b>LemmyTools Settings:</b></td>
          <td></td>
        </tr>
        <tr>
          <td><b>HomeInstance URL</b><br /> Make sure to edit the homeInstance variable of<br /> the UserScript for the
            remote instance Home button fix. (Temporary workaround).<br />(Ex:
            https://yourinstance.lemmy)<br />${hIAlertString}</td>
          <td><textarea id='option_homeInstance'>${settings.instance}</textarea></td>
        </tr>
        <tr>
          <td><b>LemmyTools bar window side</b><br /> - default: right</td>
          <td><select id="option_commposSide">
              <option value='${settings.commposSide}'>${settings.commposSide}</option>
              <option value='right'>right</option>
              <option value='left'>left</option>
            </select></td>
        </tr>
        <tr>
          <td><b>LemmyTools bar vertical position </b><br />% from top [0-85] - default: 0</td>
          <td><textarea id='option_commposVertical'>${settings.commposVertical}</textarea></td>
        </tr>
        <tr>
          <td><b>Keep LemmyTools Bar Open</b><br />Works best for widescreen desktops.</td>
          <td><input type='checkbox' id='option_hoverCheck' ${hoverCheck} /></td>
        </tr>
        <tr>
          <td><br /><br /></td>
          <td></td>
        </tr>
        <tr>
          <td><b>Site Style and Behaviors:</b></td>
          <td></td>
        </tr>
        <tr>
          <td><b>Compact Lemmy to old.Reddit Re-format (Lemmy v0.18) style</b><br />Like the old alien.site but lemmy!
            <br />Defaults - Desktop: On / Mobile: Off <br /><br /> Post width / comment width setting in pixels.
            Increase or Decrease to your reading preference while viewing posts. (Default 740) </td>
          <td><input type='checkbox' id='option_alienSiteOld' ${aSOcheck} /><br /><br /><br /><textarea
              id='option_alienSiteOldReadWidth'>${settings.alienSiteOldReadWidth}</textarea></td>
        </tr>
        <tr>
          <td><b>Hide Lemmy Sidebars</b><br /> (Trending, ServerInfo, Communities)<br /> More room for images on feed.
          </td>
          <td><input type='checkbox' id='option_hideSideBar' ${hSBcheck} /></td>
        </tr>
        <tr>
          <td><b>Expandable Images</b><br />Acts as an auto-expander and adds the ability to manually<br /> expand
            images by clicking and dragging.<br />Doubleclick to open full image.</td>
          <td><input type='checkbox' id='option_expandImages' ${eIcheck} /></td>
        </tr>
        <tr>
          <td><b>Auto Expand Size</b><br />Size of post image after opening a image post.<br /> Desktop Default: 50 /
            Mobile: 100</td>
          <td><textarea id='option_expandImagesize'>${settings.expandImagesize}</textarea></td>
        </tr>
        <tr>
          <td><b>Expand Image Speed</b><br />Speed multiplier for click&drag expanding images. If your images seem to
            expand<br /> too fast or slow, increase or decrease this value. [Values 0 to 1.0]<br /> Default: 0.50 </td>
          <td><textarea id='option_expandImageSpeed'>${settings.expandImageSpeed}</textarea></td>
        </tr>
        <tr>
            <td><b>Automatically open image posts</b><br /></td>
            <td><input type='checkbox' id='option_showAllImages'${showAllImagesCheck}/></td>
        </tr>
        <tr>
            <td><b>Hide the Show All Images button (when Auto open image posts is disabled)</b><br /></td>
            <td><input type='checkbox' id='option_hideShowAllImagesButton'${hideShowAllImagesButtonCheck}/></td>
        </tr>
        <tr>
          <td><b>Auto unblur NSFW images</b><br /></td>
          <td><input type='checkbox' id='option_unblurNSFW' ${unblurCheck} /></td>
        </tr>
        <tr>
          <td></td>
          <td><button id='LTsaveoptions'>Save / Close</button></td>
        </tr>
      </tbody>
    </table>
  </div>
  <p> Tested on Lemmy Version: ${ltTestedVer} on firefox. <br />
  <h5>LemmyTools Links</h5>
  <hr /><a href='https://thesimplecorner.org/c/lemmytools'>!lemmytools@thesimplecorner.org</a><br />Get it here: <a
    href='https://github.com/howdy-tsc/LemmyTools'>GitHub</a> or <a
    href='https://greasyfork.org/en/scripts/469169-lemmytools'>GreasyFork</a><br />Please submit issues to the GitHub
  for feature requests and problems: <a href='https://github.com/howdy-tsc/LemmyTools/issues'>GitHub LemmyTools
    Issues</a><br /></p>

	<h5>Attributes/Credit: </h5>
	<li><b>@cwagner@lemmy.cwagner.me</b> - For coding, code cleanup, and mentoring.</li>
  <li>The provided style pack option of 'Compact Lemmy to old.Reddit Re-format (Lemmy v0.18)' was graciously used with
    permission from the developer(s). <br />Please support their project here:<a
      href='https://github.com/soundjester/lemmy_monkey'> Compact Lemmy to old.Reddit Re-format (Lemmy v0.18)</a></li>
<br /><br /><a href='https://ko-fi.com/lemmytools'><img
      src='https://storage.ko-fi.com/cdn/nav-logo-stroke.png' width='32' /><br />Enjoy LemmyTools?<br />Tip with
    coffee!</a>
`;

  //Adjust clickable area for mobile (add brandingString if desktop)
  let brandingString = "";
  if (mobile !== true) {
    brandingString =
      "<span style='vertical-align: super !important; writing-mode: vertical-lr; text-orientation: mixed;'>LemmyTools</span>";
  }

  //Comm divs
  const touchdiv = document.createElement("div");
  touchdiv.setAttribute("id", "touchdiv");
  const idiv = document.createElement("div");
  idiv.setAttribute("id", "searchdiv");
  idiv.classList.add("ltmenu", "border-secondary", "card");
  // todo on input
  idiv.innerHTML = `
  <div id='ltActiveSearchDiv' class='ltActiveSearchDiv'>
    <header id='ltBarHeader' class='card-header'>
      <h6><a href=${settings.instance}>Home</a> - <a href='https://lemmyverse.net/communities' target='_new'>Find
          Subs</a> - <img width=22 height=22 class='targetImg'
          src='data:image/webp;base64,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' />
      </h6>
    </header><input type='text' id='commsearch' name='commsearchinput'
      placeholder='Search your subscriptions (or visted subs)' />
    <div id='ltBarSubHeader' class='clickAble'>LemmyTools ${ltVer} - <a href='#' id='LToptions'>Options</a></div>
    <div style='clear:both;'></div>
  </div>
  <div id='ltPassiveSearchDiv' class='ltPassiveSearchDiv'><img width=30 height=30 class='targetImg'
      src='data:image/webp;base64,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' />${brandingString}
  </div><br />`;

  const div = document.createElement("div");
  div.setAttribute("id", "myDiv");
  div.classList.add("ltcommsbar");

  let styleString = `
  .ltmenu {
      position: fixed;
      top: ${settings.commposVertical}%;
      ${settings.commposSide}: 0;
      font-size: .75rem;
      display: block;
      height: 100%;
      min-height: auto;
      z-index: 999;
      overflow: scroll;
      border: thick double;
      border-right: none !important;
      outline: 1px solid grey !important;
    }

    .ltActiveSearchDiv {
      font-size: 0.9rem;
      width: 100%;
    }

    .ltmenu input {
      width: 100%;
    }

    .ltPassiveSearchDiv {
      display: none;
      width: 100%;
    }

    .post-listings .img-fluid {
      width: ${settings.expandImagesize}%
    }

    #myDiv li {
      list-style-type: none;
    }

    #myDiv hr {
      display: block;
    }

    #searchdiv {
      ${settings.commposSide}: 0;
      position: fixed;
      height: 100%;
      min-height: auto;
      width: 240px;
      display: block;
      z-index: 999;
      overflow: scroll;
      transition-timing-function: ease;
      transition: ${settings.commposSide} .25s;
      transition-delay: 0, 0.25s;
      overflow: auto;
      -ms-overflow-style: none;
      scrollbar-width: none;
    }

    .ltbutton {
      background-color: #ccffe5;
    }

    .ltPassiveSearchDiv {
      display: none;
    }

    .ltoptions {
      position: fixed;
      min-width: auto;
      min-height: auto;
      width: auto;
      height: 100%;
      top: 0;
      display: none;
      left: 0;
      overflow: scroll;
      z-index: 1000;
      padding: 0.5%;
      border: thick double;
    }

    #myDiv::-webkit-scrollbar {
      display: none;
    }

    #myDiv {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }

    #searchdiv::-webkit-scrollbar {
      display: none;
    }`;

  if (settings.unblurNSFW) {
    styleString +=
      " .img-blur {filter: none !important; -webkit-filter: none !important; -moz-filter: none !important; -o-filter: none !important; -ms-filter: none !important;} ";
  } else {
    styleString +=
      " .img-blur {filter: blur !important; -webkit-filter: blur !important; -moz-filter: blur !important; -o-filter: blur !important; -ms-filter: blur !important;} ";
  }

  if (settings.hideSideBar) {
    styleString +=
      ".container, .container-lg, .container-md, .container-sm, .container-xl { }" +
      ".col-md-8 {flex: 0 0 80% !important;max-width: 80%;}";
  } else {
    styleString +=
      ".container, .container-lg, .container-md, .container-sm, .container-xl {}";
  }
  if (!settings.hoverCheck) {
    styleString += `
    #myDiv:not(:hover) {
      animation: showNavOut 500ms ease-in-out both;
      display: none;
      height: 0;
      transition-timing-function: ease;
      transition: height;
      transition-duration: 1.0;
      transition-delay: 0.5s;
    }

    .ltPassiveSearchDiv {
      display: block;
      float: ${settings.reverseSide};
      padding-${settings.commposSide}: 200px;
    }

    #ltActiveSearchDiv {
      display: none;
      animation: showNav 500ms ease-in-out both;
    }

    #sidebarSubscribed {
      display: none;
    }

    #searchdiv {
      ${settings.commposSide}: -200px;
      position: fixed;
      height: 110px;
      min-height: auto;
      width: 240px;
      display: block;
      z-index: 999;
      overflow: auto;
      display: block;
      transition-timing-function: ease;
      transition: ${settings.commposSide},
      height;
      transition-duration: 0.25s, 0.25s;
      transition-delay: 0.25s, 0.25s;
      /*animation: showNavOut 250ms ease-in-out both;*/ /*Breaks things?*/
    }

    #searchdiv:hover .ltActiveSearchDiv {
      display: block;
    }

    #searchdiv:hover .ltPassiveSearchDiv {
      display: none;
    }

    #searchdiv:hover {
      ${settings.commposSide}: 0;
      position: fixed;
      height: 100%;
      min-height: auto;
      width: 240px;
      display: block;
      z-index: 999;
      display: block;
      overflow: auto;
    }

    #searchdiv:hover>#myDiv {
      ${settings.commposSide}: 0;
      word-wrap: break-word;
      overflow: auto;
      display: block;
      height: 100%;
      width: 240px;
      animation: showNav 500ms ease-in-out both;
    }

    @keyframes showNav {
      from {
        opacity: 0;
      }

      to {
        opacity: 1;
      }
    }
    @keyframes showNavOut {  from {opacity: 1;}  to {opacity: 0;}}`;
  } else {
    styleString +=
      " myDiv {visibility: visible; height: auto; width: auto; overflow:scroll !important;}";
  }

  //Adjust clickable area for mobile (remove brandingString)
  if (mobile === true) {
    styleString += " #searchdiv {height: 35px;}";
  }

  //Adjust Comment/Post width (for reading with compact old style)
  if (settings.alienSiteOld === true) {
    styleString += `
    #postContent,
    .md-div,
    .alert-warning {
      max-width: 740px !important;
    }

    .mb-3.row {
      max-width: ${settings.alienSiteOldReadWidth}px !important;
    }

    .comment {
      max-width: ${settings.alienSiteOldReadWidth}px !important;
    }`;
  }

  // ADD MAIN CSS
  document.head.appendChild(document.createElement("style")).innerHTML =
    styleString;

  //add lemmytools elements to page
  document.body.appendChild(odiv);
  document.body.appendChild(idiv);
  idiv.appendChild(div);

  document.getElementById("LToptions").addEventListener("click", (e) => {
    e.preventDefault();
    options(1);
  });

  const searchInput = document.getElementById("commsearch");
  searchInput.addEventListener("input", (e) => {
    e.preventDefault();
    searchComms(searchInput.value, communityArray);
  });

  document.getElementById("LTsaveoptions").addEventListener("click", (e) => {
    e.preventDefault();
    options(3);
  });

  //Easier Subscribe Buttons ---------------------------
  ltLog("url is " + url);
  let rCommunityArray = [];
  //Browsing remote instance
  setInterval(function () {
    const broken = url.split("/c/");
    const site = broken[0].replace("https://", "");
    let community = broken[1];
    let communityName = community;
    try {
      const broken2 = community.split("?");
      community = broken2[0];
      communityName =
        community.indexOf("@") > -1 ? community : community + "@" + site;
    } catch {}

    const subString =
      `${settings.instance}/search?q=!${communityName}&type=All&listingType=All&page=1`.replace(
        "#",
        ""
      );

    if (notHomeAndInCommunity(url)) {
      ltLog(`On remote instance community - DIRECT - Button to: ${subString}`);
      rCommunityArray = update(community, url, subString);
      rCommunityArray = [...new Set(rCommunityArray)];
      rCommunityArray = rCommunityArray.reverse();
      div.innerHTML = rCommunityArray;
      communityArray = rCommunityArray;
    }
  }, 1000);

  // Update homeInstance Comms for bar to use
  let communityArray = [];
  if (url.includes(settings.instance)) {
    ltLog("home instance do bar");
    document
      .querySelectorAll('[class="list-inline-item d-inline-block"]')
      .forEach(function (el) {
        communityArray.push("<li>" + el.innerHTML + "</li>");
      });
    communityArray = [...new Set(communityArray)];
    if (count === 0 || count == null) {
      count = communityArray.length;
    }

    communityArray = communityArray.join("");

    div.innerHTML += communityArray;
    if (div.innerHTML.length >= 20) {
      ltLog("Got Results >= 20", LogDebug);
      ltLog("setting localcomms localstore", LogDebug);
      localStorage.setItem("localComms", communityArray);
      localStorage.setItem("commsCount", count.toString()); // todo why store the count? communityArray.length everywhere should be easier
      //force update the page
      searchComms("", communityArray);
    } else {
      ltLog("get localcomms from localstore", LogDebug);
      communityArray = localStorage.getItem("localComms");

      div.innerHTML += communityArray;
      //force update the page
      searchComms("", communityArray);
    }
  } else {
    ltLog("On Remote Instance - Bar", LogDebug);
  }

  //Expand Images----------------------------------------------

  setInterval(function () {
    if (settings.expandImages === true) {
      let theImages = document.getElementsByClassName("img-expanded");
      for (let i = 0; i < theImages.length; i++) {
        theImages[i].addEventListener("mousedown", startDrag);
      }

      let posX;
      let node;

      function startDrag(e) {
        e.preventDefault();

        node = e.currentTarget;
        node.style.cursor = "nwse-resize";
        try {
          node.closest("a").setAttribute("onclick", "return false;");
          node.target.closest("a").setAttribute("overflow", "auto;");
          node.preventDefault();
        } catch {}

        posX = e.clientX;
        document.addEventListener("mousemove", resize);
        document.addEventListener("mouseup", stopDrag);
      }

      function resize(e) {
        e.preventDefault();
        const nextPosX = e.pageX;
        node.style.width =
          node.offsetWidth +
          (nextPosX - posX) * settings.expandImageSpeed +
          "px";
        posX = nextPosX;
      }

      function stopDrag(e) {
        e.preventDefault();
        node.style.cursor = "default";
        document.removeEventListener("mousemove", resize);
        document.removeEventListener("mouseup", stopDrag);
      }
    } // if expand images

    //Removes the offset from images.
    try {
      removeClassByWildcard("offset-*");
    } catch {}

    //sidebar settings do
    if (settings.hideSideBar === true) {
      try {
        const sidebarSubscribed = document.getElementById("sidebarContainer");
        sidebarSubscribed.style.display = "none";
        removeClassByWildcard("site-sideba*");

        const serverInfo = document.getElementById("sidebarInfo");
        serverInfo.style.display = "none";
      } catch {}
    }

    //Show All Images Functionality on button toggle.
    try {
      let addImageButtonArea = document.getElementsByClassName(
        "mb-3"
      );
      if (
        addImageButtonArea[0].innerHTML.indexOf("showAllImages") === -1 &&
        !settings.showAllImages && !settings.hideShowAllImagesButton
      ) {
        addImageButtonArea[0].appendChild(
          document.createElement("div")
        ).innerHTML =
          "<div class='col-auto'><input type='button' id='showAllImages' class='pointer btn btn-secondary text-bg-primary' value='Show All Images' /> </div>";
        const showImagesButton = document.getElementById("showAllImages");
        showImagesButton.addEventListener("click", function () {
          if (showImagesButton.value === "Show All Images") {
            showImagesButton.value = "Hide All Images";
            allImages(true);
          } else {
            showImagesButton.value = "Show All Images";
            allImages(false);
          }
        });
      }
    } catch {}
  	//Links Open In New Tab
		linksInNewTab();
  }, 500);

})();
