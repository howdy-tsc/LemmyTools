// ==UserScript==
// @name         LemmyTools
// @namespace    https://thesimplecorner.org/c/lemmytools
// @version      0.2.1.0
// @description  A small suite of tools to make Lemmy easier.
// @author       howdy@thesimplecorner.org
// @author       @cwagner@lemmy.cwagner.me
// @grant        none
// @include      https://*
// @downloadURL https://update.greasyfork.org/scripts/469169/LemmyTools.user.js
// @updateURL https://update.greasyfork.org/scripts/469169/LemmyTools.meta.js
// ==/UserScript==

(function () {
  "use strict";
  if (!isLemmySite()) { //not lemmy
    return;
  }
  else //is Lemmy Do!
  {
  // ------------ EDIT THIS VARIABLE ---------------------
  const homeInstance = "";
	// -----------------------------------------------------
  // homeInstance - Fixes remote Instance home link. Example: const homeInstance = "https://lemmy.world";
    
    
  /* NOTHING NEEDS CHANGED BELOW */
    
    
  const LogDebug = 0;
  const LogInformation = 1;
  const LogImportant = 2;
    
  // Choose a log level for the console:
  const logLevel = LogDebug;
  // const logLevel = LogInformation;
  // const logLevel = LogImportant;
  // ------------ END EDIT AREA --------------------------
 
  //Nothing below needs editing.
  // -------------- VERSION -------------------
  const ltVer = "0.2.1.0";
  const ltTestedVer = "0.19.1";
  //--------------------------------------------

  /* Globals */

  const mobile = isltMobile();
  let remoteCommunityArray = [];
  let prevSearchCommsQueries = [];
  prevSearchCommsQueries.push("");
  let currentUrl = document.location.href;

  /**
   * @type {Map<string, {Text: string, Color: string, Url?: string}>}
   */
  let userMap;

  function isHomeInstanceSet(i2c) {
    return i2c.length > 3;
  }

  function ltLog(msg, level) {
    level = level || LogImportant;
    if (level < logLevel) return;
    console.log("[LemmyTools]", msg);
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
  function update(comm, commName, subString) {
    try {
      if (comm) {
        const browsedComm = `<li><h5>${comm}</h5></li>
<li>
    <a href='${homeInstance}/c/${commName}' target='_blank'><button type="button" class='ltbutton'>Browse/Sub on Home Instance</button></a>
</li>`;
        remoteCommunityArray.push(browsedComm);
      }
    } catch {}

    return remoteCommunityArray;
  }

  //Searches communityArray for results in LemmyTools Sidebar.
  function searchComms(query, full) {
    ltLog(`commsearch evt searchinput${query}${commsAreaStatic}`, LogDebug);
    const url = window.location.href;
    query = query || "";
    query = query.toLowerCase();
  
    if ((query == "-f") && (prevSearchCommsQueries.length < 2)) {
      const commsCount = localStorage.getItem("commsCount");
      if (commsCount == null || commsCount == 0 || full.length < 1) {
        commsAreaStatic[0].innerHTML = `<hr /><b>Welcome to LemmyTools! Ver ${ltVer}!</b><br /><br />
First time? Set your lemmy homeinstance in the option page and in the UserScript.<br />
No communities? Login to lemmy and reload page.`;
      } else {
        commsAreaStatic[0].innerHTML = `Communities: ${commsCount} - <hr />${full}`;
      }
    } else {
      //This searches the pushed communityArray with the query, saves it to a array, removes any duplicate values, sorts and then pushes to the commupdate function.
      commsAreaStatic[0].innerHTML = full;
      //if searchInput query, store it for use on another page
      if (query.length > 2)
      {
      prevSearchCommsQueries.push(query);
   	  localStorage.setItem("prevSearchCommsQueries", prevSearchCommsQueries);
      }
      //ltLog(`Searching for:${query}`, LogDebug);
      const children = commsAreaStatic[0].getElementsByTagName("li");
      //ltLog(`Children found: ${children.length}`, LogDebug);
      let data = [""];
      let found;
      for (let i = 0; i < children.length; i++) {
        if (children[i].innerHTML.toLowerCase().indexOf(query) !== -1) {
          found = children[i].innerHTML + "<br />";
          //ltLog(`Found: ${found}`, LogDebug);
          data.push(found);
        }
      }
      const resultSet = [...new Set(data)];
      resultSet.sort();
      
      if (currentUrl.indexOf(query) !== -1)
      {
      	commupdate(url, resultSet, query);
      }
      else
      {
        commupdate(url, resultSet, query);  
      }
    }
  }

  function commupdate(page, data, query) {
    ltLog("LTbar Update");
    let count = -1;
    data.forEach((_) => count++);
    data = data.join("");
   
    for (let i = 0; i < commsAreaSearch.length; i++)
    {
  	  commsAreaSearch[i].innerHTML = `Communities: ${count}<hr /> ${data}`;
    }

    for (let i = 0; i < commsAreaStatic.length; i++)
    {
  	commsAreaStatic[i].innerHTML = `Communities: ${count}<hr /> ${data}`;
    }
    if (query.length > 2)
    {
   	searchInput.value = query;
    }
  }
  const optionsKey = "LemmyToolsOptions";

  function getSettingsFromLocalStorage() {
    try {
      return JSON.parse(localStorage.getItem(optionsKey) || "{}");
    } catch (_) {
      return {};
    }
  }

  /**
   * Gets all currently tagged users
   *
   * @return {Map<string, {Text: string, Color: string, Url: string}>} A Map of tagged users
   */
  function getUserCommentsFromLocalStorage() {
    try {
      const notes = localStorage.getItem(optionsKey + "-userNotes") || "[]";
      return new Map(JSON.parse(notes));
    } catch (e) {
      console.error(e);
      return new Map();
    }
  }

  function saveUserCommentsToLocalStorage() {
    localStorage.setItem(
      optionsKey + "-userNotes",
      JSON.stringify(Array.from(userMap))
    );
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
          commposSide: mobile ? "top" : "top",
          reverseSide: mobile ? "left" : "right",
          instance: homeInstance || window.location.origin,
          commposVertical: 0,
          expandImages: true,
          hideSideBar: false,
          expandImagesize: mobile ? 100 : 50,
          hoverCheck: false,
          unblurNSFW: false,
          widthPixels: false,
          blockContent: false,
          blockFilters: "",
          expandImageSpeed: 0.5,
          showAllImages: false,
          hideShowAllImagesButton: false,
          linksInNewTab:false,
        },
        getSettingsFromLocalStorage()
      );
      localStorage.setItem(optionsKey, JSON.stringify(userOptions));
      userMap = getUserCommentsFromLocalStorage();
    } else if (open === 3) {
      //save button
      odiv.style.display = "none";
      localStorage.setItem("currentBlockCount", 0);

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
      userOptions.blockContent =
        document.getElementById("option_blockContent").checked;
      userOptions.blockFilters =
        document.getElementById("option_blockFilters").value.split(",");
      userOptions.linksInNewTab = document.getElementById(
        "option_linksInNewTab"
      ).checked;
      userOptions.widthPixels =
        document.getElementById("option_widthPixels").checked;
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

  const colors = new Map([
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
    ["teal", "white"],
    ["darkslategray", "white"],
  ]);

  function addNotesToLinks(userNodes) {
	const userNameRegex = /\/u\/(.+)$/;
    for (const node of userNodes) {
      let userName;
      try {
        userName = node.href.match(userNameRegex)[1];
      } catch (error) {
        console.error(error, node, node.href);
      }
      let alreadyHadSpan = false;
      let span;
      const existing = node.getElementsByClassName("userNote");
      if (existing.length === 1) {
        alreadyHadSpan = true;
        span = existing[0];
      } else span = document.createElement("span");

      span.innerHTML = "🏷";
      if (userMap.has(userName)) {
        span.innerHTML = userMap.get(userName).Text;
        span.style.backgroundColor = userMap.get(userName).Color;
        span.style.color = colors.get(userMap.get(userName).Color);
      }
      span.classList.add("userNote", "badge");
      span.dataset.user = userName;
      if (!alreadyHadSpan) {
        span.addEventListener("click", tagClick);
        node.appendChild(span);
      }
      node.classList.add("hasNote");
    }
  }

  function tagUsers() {
    setInterval(() => {
      const userNodes = document.querySelectorAll(
        ".person-listing:not(.hasNote)"
      );
      addNotesToLinks(userNodes);
    }, 500);
  }

  function tagClick(clickEvent) {
    clickEvent.preventDefault();
    const userName = clickEvent.currentTarget.dataset.user;
    const dialog = document.createElement("dialog");
    let colorOptions = "";
    colors.forEach(
      (val, key) =>
        (colorOptions += `<option style="color: ${val}; background-color: ${key}" value="${key}">${key}</option>`)
    );
    dialog.classList.add("userTagger");
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) {
        closeDialog(dialog);
      }
    });
    dialog.innerHTML = `<div style="width: 350px;">
  <strong>${userName}</strong>
  <form id="userTag">
    <div>
      <label for="userTagText">Text</label>
      <input type="text" id="userTagText" value="">
    </div>
    <div>
      <label for="userTagColor">Color</label>
      <select id="userTagColor">
        ${colorOptions}
      </select>
    </div>
    <div>
      <button type="submit">✓ save tag</button>
      <button formmethod="dialog">× cancel</button>
    </div>
  </form>
</div>`;

    const userTagText = dialog.querySelector("#userTagText");
    const userTagColor = dialog.querySelector("#userTagColor");
    if (userMap.has(userName)) {
      userTagText.value = userMap.get(userName).Text;
      userTagColor.value = userMap.get(userName).Color;
    }
    const form = dialog.querySelector("#userTag");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (e.submitter.formMethod === "dialog") {
        closeDialog(dialog);
        return;
      }
      if (userTagText.value.length) {
        if (!userMap.has(userName))
          userMap.set(userName, { Text: "", Color: "" });
        userMap.get(userName).Text = userTagText.value;
        userMap.get(userName).Color = userTagColor.value;
      } else {
        userMap.delete(userName);
      }
      addNotesToLinks(document.querySelectorAll(`[href="/u/${userName}"]`));
      saveUserCommentsToLocalStorage();
      closeDialog(dialog);
    });
    document.body.appendChild(dialog);
    dialog.showModal();
  }
  function closeDialog(dialog) {
    dialog.close();
    dialog.remove();
  }
  function ready(fn) {
    if (document.readyState !== "loading") {
      fn();
    } else {
      document.addEventListener("DOMContentLoaded", fn);
    }
  }

  //Expand all images on page
  function allImages(show) {
    let clickableImages = document.getElementsByClassName(
      "thumbnail rounded overflow-hidden d-inline-block position-relative p-0 border-0 bg-transparent"
    );

    //ltLog(clickableImages.length, LogDebug);
    //ltLog(clickableImages, LogDebug);
    if (show) {
      for (let i = 0; i < clickableImages.length; i++) {
        try {
          console.log(clickableImages[i]);

          clickableImages[i].click();
        } catch {}
      }
    } else {
      //lazy - need to figure out way to handle on dom iter
      location.reload(true);
      // for (let i = 0; i < clickableImages.length; i++) {
      //   try {
      //     clickableImages[i].click();
      //     clickableImages[i].click();
      //   } catch {}
      // }
    }
  }


  function linksInNewTab() {
    const links = document.getElementsByTagName("a");
    for (let i = 0; i < links.length; i++) {
      links[i].setAttribute("target", "_blank");
      links[i].setAttribute("rel", "noreferrer");
    }
  }
    
  function blockContent(filters) {
    const blockFilters = filters;
    const posts = document.getElementsByClassName("post-listing");
    const comments = document.getElementsByClassName("comment");
   
   
    var blockedCount = 0;
    for (let y = 0; y < blockFilters.length; y++) {
      if (blockFilters[y].length >= 1)
        {
          blockFilters[y] = addslashes(blockFilters[y]);
        for (let i = 0; i < posts.length; i++) {
          if (posts[i].innerHTML.toLowerCase().indexOf(blockFilters[y].toLowerCase()) !== -1) {
            blockedCount++
            
            posts[i].setAttribute("style", "display: none !important;");
            //posts[i].innerHTML = "<div class='card small'>Post blocked due to filter: " + blockFilters[y] + "</div>"
          }
        }
        for (let x = 0; x < comments.length; x++) {
          if (comments[x].innerHTML.toLowerCase().indexOf(blockFilters[y].toLowerCase()) !== -1) {
            blockedCount++
            comments[x].setAttribute("style", "display: none !important;");
            //comments[x].innerHTML = "<div class='card small'>Post blocked due to filter: " + blockFilters[y] + "</div>"
          }
        }
         
      }
    }
    localStorage.setItem("currentBlockCount", blockedCount);
    ltLog("content blocking has blocked: " + blockedCount + " posts.", 2)
  }
    
	function addslashes( str ) {
    return (str + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
	}

  // LemmyTools

  //check if first run or load saved settings
  let settings = options(2);


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
          // todo there has to be a better way to wait for the content to be loaded …
          var imagesTimer = setTimeout(allImages, 5000);
          clearTimeout(imagesTimer);
          //allImages(true);
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
  let blockContentCheck = checkedIfTrue(settings.blockContent);
  let widthPixelCheck = checkedIfTrue(settings.widthPixels);
  let widthPercentCheck = checkedIfTrue(!settings.widthPixels);
  let showAllImagesCheck = checkedIfTrue(settings.showAllImages);
  let linksCheck = checkedIfTrue(settings.linksInNewTab);
  let hideShowAllImagesButtonCheck = checkedIfTrue(
    settings.hideShowAllImagesButton
  );

  //Option Divs
  //Is HomeInstance Manually Set For WorkAround

  var hIAlertString = isHomeInstanceSet(homeInstance)
    ? ""
    : "<b style='color: red;'>Your Home Instance has not been manually set in the UserScript.</b><br />";

  //Create Lemmy Tools Elements ----------------------------------------

  const odiv = document.createElement("div");
  odiv.setAttribute("id", "ltOptions");
  odiv.setAttribute("style", "display: none;")
  odiv.classList.add("card", "border-secondary", "ltoptions");
  odiv.innerHTML = `
    <h4>LemmyTools ${ltVer} Options - <button class='pointer btn btn-secondary text-bg-primary' id='LTsaveoptions'>Save&Close</button></h4>
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
          <td><b>LemmyTools Settings: </b></td>
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
							<option value='top'>top</option>
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
          <td><b>Hide Lemmy Sidebars</b><br /> (Trending, ServerInfo, Communities)<br /> 
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
          <td><textarea id='option_expandImagesize'>${settings.expandImagesize}</textarea>
          <br /> <label for="option_widthPixels">Pixels</label> <input type='radio' id='option_widthPixels' name="widthScaler" ${widthPixelCheck}/> 
          <label for="option_widthPercent">Percent</label> <input type='radio' id='option_widthPercent' name="widthScaler" ${widthPercentCheck}/>
          </td>
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
          <td><b>Open ALL links in new tab.</b><br /></td>
          <td><input type='checkbox' id='option_linksInNewTab' ${linksCheck} /></td>
        </tr>
        <tr>
          <td><b>Content Blocking: (Blocks posts and comments matching your desired filters).</b><br /></td>
          <td><input type='checkbox' id='option_blockContent' ${blockContentCheck} /></td>
        </tr>
        <tr>
          <td>Add filters seperated by commas. Ex: filter,filter two,filter3 <br />
          <textarea style="width:100%; "id='option_blockFilters'>${settings.blockFilters}</textarea></td>
          <td>Posts/Comments blocked from filters on this page:<br />${localStorage.getItem("currentBlockCount")}</td>
        </tr>
 
        <tr>
          <td></td>
          <td></td>
        </tr>
      </tbody>
    </table>
  </div>
  <p> Tested on Lemmy Version: ${ltTestedVer} on Firefox. <br />

  <hr /><Get it here: <a
    href='https://github.com/howdy-tsc/LemmyTools'>GitHub</a> or <a
    href='https://greasyfork.org/en/scripts/469169-lemmytools'>GreasyFork</a><br />Please submit issues to the GitHub
  for feature requests and problems: <a href='https://github.com/howdy-tsc/LemmyTools/issues'>GitHub LemmyTools
    Issues</a><br /></p>

	<h5>Attributes/Credit: </h5>
	<li><b>@cwagner@lemmy.cwagner.me</b> - For coding, code cleanup, and mentoring.</li>
 	<li><b>Charles Machalow - csm10495</b> - Coding contribution(s).</li> 
  	<li><b>jimmyhiggs337</b> - Coding contribution(s).</li>
`;

  //Adjust clickable area for mobile (add brandingString if desktop)
  let brandingString = "";
  if (mobile !== true) {
    brandingString =
      "<span id='brandingText' style='vertical-align: super !important; writing-mode: vertical-lr; text-orientation: mixed;'>LemmyTools</span>";
  }

  //Comm divs


    const div = document.createElement("div");
    div.setAttribute("id", "myDiv");
    div.classList.add("ltcommsbar");

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
            Subs</a> - <img id="lemmyLogo" width=22 height=22 class='targetImg'
            <img id="lemmyOptionsIcon" width=22 height=22 class='targetImg' alt"LemmyTools Options" title="LemmyTools Options"

  </h6>
      </header><input type='text' id='commsearch' name='commsearchinput'
        placeholder='Search your subscriptions (or visted subs)' />
      <div id='ltBarSubHeader' class='clickAble'>LemmyTools ${ltVer}</div>
      <div style='clear:both;'></div>
    </div>
    <div id='ltPassiveSearchDiv' class='ltPassiveSearchDiv'><img width=30 height=30 class='targetImg'
    </div><br />`;


    
  let styleString = `
  .ltmenu {
      position: fixed;
      top: ${settings.commposVertical}%;
      ${settings.commposSide}: 0;
      font-size: .9rem;
      display: block;
      height: 100%;
      min-height: auto;
      z-index: 999;
      overflow: scroll;
      outline: 1px solid grey !important;
    }

    .ltActiveSearchDiv {
      font-size: 0.9rem;
      width: 100%;
    }

	  .ltActiveSearchDiv img:hover{
      margin-top:-5px;
      border:10px yellow;
      }


    .ltmenu input {
      width: 100%;
    }

    .ltPassiveSearchDiv {
      display: none;
      width: 100%;
    }	

    .post-listings .img-expanded {
      width: ${settings.expandImagesize}${settings.widthPixels ? "px" : "%"};
			max-height: none !important;
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
			margin-top:35px;
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
    }
    .userNote {
      margin-left: 0.5em;
      //padding-left: 0.25em;
      //padding-right: 0.25em;
      font-size: 0.9em;
    }
    .userTagger {
        border-radius: var(--bs-border-radius);
    }
    .userTagger::backdrop {
      background: rgba(0, 0, 0, 0.7);
    }
    form#userTag {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    form#userTag label {
        width: 60px;
    }
`;
  

  if (settings.unblurNSFW) {
    styleString +=
      " .img-blur {filter: none !important; -webkit-filter: none !important; -moz-filter: none !important; -o-filter: none !important; -ms-filter: none !important;} .img-blur-icon {display: none !important;} ";
  } else {
    styleString +=
      " .img-blur {filter: blur !important; -webkit-filter: blur !important; -moz-filter: blur !important; -o-filter: blur !important; -ms-filter: blur !important;} .img-blur-icon  {filter: blur !important; -webkit-filter: blur !important; -moz-filter: blur !important; -o-filter: blur !important; -ms-filter: blur !important;} ";
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

  //For mobile layouts make the ltbar tab smaller
  styleString += `
		@media (max-width: 1199.98px) {
			#brandingText {
				display:none;
			}
			#searchdiv {
				height: 35px;
			}
		}`;




  if (settings.commposSide != "top")
  {
  div.innerHTML = "<div class='commsAreaStatic'></div>";
  document.body.appendChild(idiv);
  idiv.appendChild(div);
  ltLog("here");
  }
  else if (settings.commposSide == "top")
  {

    const topDiv = document.createElement("div");
    topDiv.setAttribute("id", "topDiv");
    topDiv.innerHTML = `
    <div class='topDivRoot card border-secondary'>

    <div class='topDivSearch'>
    <img id="lemmyLogo" width=22 height=22 class='targetImg' alt="${homeInstance}" title="${homeInstance}" 
    <img id="lemmyOptionsIcon" width=22 height=22 class='targetImg' alt"LemmyTools Options" title="LemmyTools Options"
    <input type='text' id='commsearch' name='commsearchinput' placeholder='Search your subscriptions (or visted subs)' />
    <a id='dropDownComms' href="#" alt="Show All Your Communities and Manage" title="Show All Your Communities and Manage" > (Show All) </a>
    </div>
    <div class='topDivBar'>
    <div class='commsAreaStatic'>
    </div>
    </div>
    </div>
    `;
      const topDivCommsBox = document.createElement("div");
      topDivCommsBox.setAttribute("id", "topDivCommsBox");
      topDivCommsBox.style.display = "none";
      topDivCommsBox.innerHTML = `
      <header id='ltBarHeader' class='card-header'>
            <h5><a href=${settings.instance}>Home</a> - <a href='https://lemmyverse.net/communities' target='_new'>Find
                Communities</a>
            </h5>
          </header>
      LemmyTools ${ltVer}
      <div class="commsAreaSearch">
      </div>
      `;
       document.body.prepend(topDivCommsBox);
       document.body.prepend(topDiv);  

       document.getElementById("dropDownComms").addEventListener("click", (e) => {
        e.preventDefault();
        dropDownComms = e;
        window.scrollTo(0, 0);
        dropDownComms.target.innerHTML = 
          dropDownComms.target.innerHTML == " (Show All) " ? dropDownComms.target.innerHTML = " (Hide All) " : dropDownComms.target.innerHTML = " (Show All) ";
        topDivCommsBox.style.display =
          topDivCommsBox.style.display == "none" ? topDivCommsBox.style.display = "block" : topDivCommsBox.style.display = "none";
        searchComms(searchInput.value, communityArray);
      });
 
      styleString += `
      #topDiv
      {
      z-index: 99999999 !important;
      }
      #topDiv input
      {

      }
      .topDivSearch
      {
      min-width: 330px;
      overflow:hidden;
      -ms-overflow-style: none;
      scrollbar-width: none;
      z-index: 99999999 !important;
"mailx" stuck linux
      }
      #topDiv img:hover{
      margin-top:-5px;
      border:10px yellow;
      }

      .topDivBar
      {
      width: 100%;
      overflow:hidden;
      -ms-overflow-style: none;
      scrollbar-width: none;
      }
      .topDivBar br {
      display: none;
      }
      .topDivBar li, a {
      display:inline-block;
      padding-right: 5px;
      margin-top: 4px;
      }
      .topDivBar hr {
      display:none;
      }
      .topDivBar img {
      display:none;
      }
      .topDivRoot
      {
      height:35px;
      position: fixed;
      top: 0;
      left: 0;
      width:100%;
      overflow: hidden;
      white-space: nowrap;
      z-index: 99999999 !important;
      border:2px;
      display: inline-flex;
			flex-direction: row;
      }

      #topDivCommsBox
      {
      float:left;
      width: 100%;
      height: 100%;
      top: 35px;
      left: 0;
      }

      #root 
      {
      margin-top: 35px !important;
      }

      `;

  }
     // ADD MAIN CSS
  document.head.appendChild(document.createElement("style")).innerHTML = styleString;
  //add lemmytools elements to page
  document.body.appendChild(odiv); //options   
    
 let commsAreaSearch = document.getElementsByClassName("commsAreaSearch");
 let commsAreaStatic = document.getElementsByClassName("commsAreaStatic");
 let dropDownComms = document.getElementById("dropDownComms");

  const searchInput = document.getElementById("commsearch");
  searchInput.addEventListener("input", (e) => {
    e.preventDefault();
    searchComms(searchInput.value, communityArray);
  });
	document.getElementById("lemmyOptionsIcon").addEventListener("click", (e) => {
        e.preventDefault();
        options(1);
      });
  document.getElementById("LTsaveoptions").addEventListener("click", (e) => {
    e.preventDefault();
    options(3);
  });
  document.getElementById("lemmyLogo").addEventListener("click", (e) => {
    e.preventDefault();
    window.location = homeInstance;
  });    
 

  // document.onreadystatechange = () => {
  //   if (document.readyState === "interactive") {
  //     // document ready
  //     if (
  //       showImagesButton.value == "Hide All Images" ||
  //       settings.showAllImages
  //     ) {
  //       allImages(true);
  //     }
  //   }
  // };

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
      rCommunityArray = update(community, communityName, subString);
      rCommunityArray = [...new Set(rCommunityArray)];
      rCommunityArray = rCommunityArray.reverse();
      commsAreaStatic[0].innerHTML = rCommunityArray;
      communityArray = rCommunityArray;
    }
  }, 1000);
  tagUsers();
  // Update homeInstance Comms for bar to use
      

  let communityArray = [];
  if (url.includes(settings.instance)) {
    ltLog("home instance do bar");
    document
      .querySelectorAll('[class="list-inline-item d-inline-block"]')
      .forEach(function (el) {
        communityArray.push("<li>" + el.innerHTML.toLowerCase() + "</li>");
      });
    communityArray = [...new Set(communityArray)];
    if (count === 0 || count == null) {
      count = communityArray.length;
    }

    communityArray = communityArray.join("");

    commsAreaStatic[0].innerHTML += communityArray;
    if ( commsAreaStatic[0].innerHTML.length >= 20) {
      ltLog("Got Results >= 20", LogDebug);
      ltLog("setting localcomms localstore", LogDebug);
      localStorage.setItem("localComms", communityArray);
      localStorage.setItem("commsCount", count.toString()); // todo why store the count? communityArray.length everywhere should be easier
      //force update the page
      searchComms(searchInput.value, communityArray);
    } else {
      ltLog("get localcomms from localstore", LogDebug);
      communityArray = localStorage.getItem("localComms");

       commsAreaStatic[0].innerHTML += communityArray;
     
      //If previous search display previous results
      try {
      	let latestQueryString = localStorage.getItem("prevSearchCommsQueries");
        let latestQueryArray = [];
        latestQueryArray = latestQueryString.split(",");
        if (currentUrl.indexOf(latestQueryArray[latestQueryArray.length - 1]) !== -1) {
         searchComms(latestQueryArray[latestQueryArray.length - 1], communityArray);
        }
        else {
         searchComms(searchInput.value, communityArray);
       		}
     		}
     	catch {
    	 searchComms(searchInput.value, communityArray);
     		}   
    }
  } 
  else {
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
          node.closest("a").removeAttribute("href");
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
      if (settings.expandImages) {
        removeClassByWildcard("offset-*");
      }
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
      let addImageButtonArea = document.querySelector(".post-listings");
      let showImage = document.createElement("div");
      showImage.innerHTML =
        "<div class='col-auto'><input type='button' id='showAllImages' class='pointer btn btn-secondary text-bg-primary' value='Show All Images' /> </div>";
      if (
        addImageButtonArea.innerHTML.indexOf("showAllImages") === -1 &&
        !settings.showAllImages &&
        !settings.hideShowAllImagesButton
      ) {
        addImageButtonArea.prepend(showImage);
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
    if (settings.linksInNewTab == true)
    {
    	linksInNewTab();
    }
    //Block Content
    if (settings.blockContent == true)
    {
    	blockContent(settings.blockFilters);
    };
  }, 500);
    
  }
})();
  function isLemmySite() {
    const meta = document.querySelector('meta[name="Description"]');
    return (
      meta && meta.content === "Lemmy"
    );
  }
