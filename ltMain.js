const LogDebug = 0;
const LogInformation = 1;
const LogImportant = 2;
const logLevel = LogDebug;
const mobile = isltMobile();
let remoteCommunityArray = [];
let prevSearchCommsQueries = [];
prevSearchCommsQueries.push("");
let currentUrl = document.location.href;

const blockFilterArray = ["Elon", "Telsa", "Hexbear" ];
let userOptions = {
  commposSide: mobile ? "top" : "top",
  reverseSide: mobile ? "left" : "right",
  instance: "",
  commposVertical: 0,
  expandImages: true,
  hideSideBar: false,
  expandImagesize: mobile ? 100 : 50,
  hoverCheck: false,
  unblurNSFW: false,
  widthPixels: false,
  blockContent: false,
  blockFilters: blockFilterArray,
  expandImageSpeed: 0.5,
  showAllImages: false,
  hideShowAllImagesButton: false,
  linksInNewTab:false,
  currentBlockCount: 0,
  totalBlockCount: 0,
  communities: [""],
  communityDescriptions: [""],
  communityUpdateDateTime: ""
};

const readLocalStorage = async (key) => {
  return new Promise((resolve, reject) => {
    browser.storage.local.get([key], function (result) {
      if (result[key] === undefined) {
        browser.storage.local.set({userOptions}).then(setItem("userOptions"), onError);
        let userTagger = {};
        browser.storage.local.set({userTagger}).then(setItem("userTagger"), onError);
      } else {
        browser.storage.local.set({userOptions}).then(setItem("userOptions"), onError);
        resolve(result[key]);
      }
    });
  });
};

//Kicks off addon if lemmy.
(function () {
  "use strict";
  if (!isLemmySite()) { //not lemmy
    return;
  }
  else //is Lemmy Do!
  {
  getData();
  }
})();

//MAIN ------------------------------
function lemmyTools(values){

  let settings = values[0];
  let tags = values[1];

  if (!settings) {
    ltLog("settings not found");
  }
  else if (!tags) {
    ltLog("userTags not found");
  }
  else {
    ltLog(settings);
    userOptions.instance="https://lemmy.zip";
    browser.storage.local.set({userOptions}).then(setItem("userOptions"), onError);
    ltLog(tags);
  }

//observe
waitForElm('#app').then((elm) => {
  var tgt = document.querySelector('#app');

  var cfg = {
        childList: true,
        attributes: true,
        characterData: true,
        subtree: true,
        attributeOldValue: true,
        characterDataOldValue: true
      };
    
  var monitor = new MutationObserver(function(mutations){
    refresh(settings);
    monitor.disconnect();
    monitor.observe(tgt, cfg);
  });
  monitor.observe(tgt, cfg);
});


addElements(settings);
getCommunities(settings);

//

     
}

//When page refresh do.
function refresh(settings){
  blockContent(settings.blockFilters);
  showAllTheImages(settings);
  expandImages(settings);
  getCommunities(settings);

}

function getData() {
  const key1 = readLocalStorage('userOptions');
  const key2 = readLocalStorage('userTagger');

  Promise.all([key1, key2]).then(values => {
    
      lemmyTools(values);
  });
}

function isLemmySite() {
  const meta = document.querySelector('meta[name="Description"]');
  return (
    meta && meta.content === "Lemmy"
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
  
function ltLog(msg, level) {
    level = level || LogImportant;
    if (level < logLevel) return;
    console.log("[LemmyTools]", msg);
}

function saveUserCommentsToLocalStorage() {
  
  let userTagger = JSON.stringify(userTagger);
  browser.storage.local.set({userTagger}).then(setItem("userTagger"), onError);
}

function setItem(desc)
{
  //ltLog("Set " + desc);
}

function onError()
{
  ltLog("Something went wrong with storage");
}

function addslashes( str ) {
  return (str + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
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
            
            //posts[i].setAttribute("style", "display: none !important;");
            posts[i].innerHTML = "<div class='card small'>Post blocked due to filter: " + blockFilters[y] + "</div>"
          }
        }
        for (let x = 0; x < comments.length; x++) {
          if (comments[x].innerHTML.toLowerCase().indexOf(blockFilters[y].toLowerCase()) !== -1) {
            blockedCount++
            //comments[x].setAttribute("style", "display: none !important;");
            comments[x].innerHTML = "<div class='card small'>Post blocked due to filter: " + blockFilters[y] + "</div>"
          }
        }
         
      }
    }
    userOptions.currentBlockCount = blockedCount;
    userOptions.totalBlockCount += blockedCount;
    browser.storage.local.set(userOptions).then(setItem("userOptions"), onError);
    ltLog("content blocking has blocked: " + blockedCount + " posts.", 2)
}

function expandImages(settings){
      //Expand Images----------------------------------------------
  
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
}

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
        result.push(elements[i]);
        for (let y = 0; y < elements[i].classList.length; y++) {
          if (elements[i].classList[y].indexOf(divClass) !== -1) {
            className = elements[i].classList[y];
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

function showAllTheImages(settings){
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
}

function addElements(settings)
{
  const ltRootDiv = document.createElement("div");
  ltRootDiv.setAttribute("id", "ltRootDiv");
  let ltBarUrl = browser.runtime.getURL("ltBar.html");
  let ltBarStyleUrl = browser.runtime.getURL("ltBar.css");
  let ltSettingsUrl = browser.runtime.getURL("ltSettings.html");

  document.body.prepend(ltRootDiv);

  fetch(ltBarUrl).then((response) => response.text())
  .then((html) => {
      document.getElementById("ltRootDiv").innerHTML = html;
      if (settings.commposSide == "top"){
        let notUsing = document.getElementById("myDiv");
        notUsing.parentNode.removeChild(notUsing);
      }
      else
      {
        let notUsing = document.getElementById("topDiv");
        notUsing.pa
        rentNode.removeChild(notUsing);
      }
        document.getElementById("lemmyLogo").src = browser.runtime.getURL("ltLogo.png");
        document.getElementById("lemmyOptionsIcon").src = browser.runtime.getURL("ltOptionsLogo.png");


  let commsAreaSearch = document.getElementsByClassName("commsAreaSearch");
  let commsAreaStatic = document.getElementsByClassName("commsAreaStatic");
  let dropDownComms = document.getElementById("dropDownComms");
  let topDivCommsBox = document.getElementById("topDivCommsBox");
 
   document.getElementById("lemmyOptionsIcon").addEventListener("click", (e) => {
         e.preventDefault();
         options(1);
       });
   document.getElementById("lemmyLogo").addEventListener("click", (e) => {
     e.preventDefault();
     window.location = settings.instance;
   });    
   const searchInput = document.getElementById("#commsearch");
   dropDownComms.addEventListener("click", (e) => {
    ltLog("Dropdown click");
    e.preventDefault();
    dropDownComms = e;
    window.scrollTo(0, 0);
    dropDownComms.target.innerHTML = 
      dropDownComms.target.innerHTML == " (Show All) " ? dropDownComms.target.innerHTML = " (Hide All) " : dropDownComms.target.innerHTML = " (Show All) ";
    topDivCommsBox.style.display =
      topDivCommsBox.style.display == "block" ? topDivCommsBox.style.display = "none" : topDivCommsBox.style.display = "block";
    searchComms(searchInput.value, settings.communities);
  });



});
const ltSettingsDiv = document.createElement("div");
ltSettingsDiv.setAttribute("id", "ltSettingsDiv");
document.body.prepend(ltSettingsDiv);

fetch(ltSettingsUrl).then((response) => response.text())
.then((html) => {
  document.getElementById("ltSettingsDiv").innerHTML = html;
  document.getElementById("LTsaveoptions").addEventListener("click", (e) => {
    e.preventDefault();
    options(3);
  });
});

fetch(ltBarStyleUrl).then((response) => response.text())
.then((style) => {
  document.head.appendChild(document.createElement("style")).innerHTML = style;
});
  
}

function searchComms(query, full) {
    searchInput = document.getElementById("commsearch");
    ltLog(`Searching for: ${query}`, LogDebug);
    const url = window.location.href;
    query = query || "";
    query = query.toLowerCase();
  
      //This searches the pushed communityArray with the query, saves it to a array, removes any duplicate values, sorts and then pushes to the commupdate function.
      document.querySelector('.commsAreaStatic').innerHTML = full;
      //if searchInput query, store it for use on another page
      if (query.length > 2)
      {
      prevSearchCommsQueries.push(query);
   	  localStorage.setItem("prevSearchCommsQueries", prevSearchCommsQueries);
      }
      else
      {
        commupdate(url, full, '');
        return
      }
      
      //ltLog(`Searching for:${query}`, LogDebug);
      const children = document.querySelector('.commsAreaStatic').getElementsByTagName('li');
      ltLog(`${children}`);
      ltLog(`Children found: ${children.length}`, LogDebug);
      let data = [""];
      let found;
      for (let i = 0; i < children.length; i++) {
        if (children[i].innerHTML.toLowerCase().indexOf(query) !== -1) {
          found = "<li>" + children[i].innerHTML + "</li>";
          //ltLog(`Found: ${found}`, LogDebug);
          data.push(found);
        }
      }
      const resultSet = [...new Set(data)];
      resultSet.sort();
      ltLog(`Found: ${resultSet}`);
      
      if (currentUrl.indexOf(query) !== -1)
      {
      	commupdate(url, resultSet, query);
      }
      else
      {
        commupdate(url, resultSet, query);  
      }

}

function commupdate(page, data, query) {
   searchInput = document.getElementById("commsearch");
   commsAreaSearch = document.querySelector('.commsAreaSearch');
   commsAreaStatic = document.querySelector('.commsAreaStatic');
   let arrayCount = data.length -1;
   

    data = data.join("");
    document.querySelector('.commsAreaStatic').innerHTML = "Communities: " + arrayCount;
    document.querySelector('.commsAreaSearch').innerHTML = "Communities: " + arrayCount;
    document.querySelector('.commsAreaStatic').innerHTML += data;
    document.querySelector('.commsAreaSearch').innerHTML += data;

    if (query.length > 2) 
    {
        searchInput.value=query;
    }

}

function getSettingsFromLocalStorage() {
    try {
      return JSON.parse(localStorage.getItem(optionsKey) || "{}");
    } catch (_) {
      return {};
    }
}

function checkAuthenticated(){
  if (document.cookie.indexOf('jwt=') == -1){
    ltLog("Not logged in!");
    return false
  }
  else
  {
    return true
  }
}

function getCommunities(settings){

    function updateCommsAreas(userData, settings){
      let communityNames = [];
      let communityDescriptions = [];
      userData.my_user.follows.forEach(function(value, index, array) {
        let icon = "";
        try {
          if (value["community"]["icon"])
          {
            icon ="<img src='" 
            + value["community"]["icon"] 
            + "' width=\"20\" height=\"20\" />";
          }
        }
        catch {
          icon = "";
        }
        let commShortName = value["community"]["actor_id"];
        commShortName=commShortName.split("//")[1];
        commShortName=commShortName.split("/c/")[0];
        try{
          if (value["community"]["description"].length > 3){
          let commShortDescription=value["community"]["description"];
          trimmedDesc = commShortDescription.substr(0, 250);
          trimmedDesc += "..."
          }
          else
          trimmedDesc=""
        }
        catch{trimmedDesc=""}

        let commArrayItem = "<li>" 
          + "<a href='" 
          + settings.instance + "/c/" + value["community"]["name"] + "@" + commShortName
          + "'> ► "
          + icon
          + "<span class='lt-postTitle'>"
          + value["community"]["title"]
          + "</span>"
          + "<span class='description'>"
          + "@" + commShortName + "<br />"
          + trimmedDesc
          + "</span>"
          + "</a></li> ";
        communityNames.push(commArrayItem.toLowerCase());

        let commDescItem = "<span class='description'>"
        + "@" + commShortName + "<br />"
        + trimmedDesc
        + "</span>";

        communityDescriptions.push(commDescItem);
      });
      let arrayCount = communityNames.length;
      communityNames = communityNames.join("");
      settings.communities = communityNames;
      settings.communityUpdateDateTime = Date.now();
      browser.storage.local.set({userOptions}).then(setItem("userOptions.communities"), onError);
      localStorage.setItem("communityNames", communityNames);
      localStorage.setItem("communityDescriptions", communityDescriptions);
      document.querySelector('.commsAreaStatic').innerHTML = "Communities: " + arrayCount;
      document.querySelector('.commsAreaSearch').innerHTML = "Communities: " + arrayCount;
      document.querySelector('.commsAreaStatic').innerHTML += communityNames;
      document.querySelector('.commsAreaSearch').innerHTML += communityNames;
    
      
    }
  
      waitForElm('#commsearch').then(elm => {
      console.log('Element is ready');
      const searchInput = document.getElementById('commsearch');
      let latestQueryString = "";
      try{latestQueryString = localStorage.getItem("prevSearchCommsQueries");
      latestQueryArray = latestQueryString.split(",");}
      catch{};
      let latestQueryArray = [];
      
      
      if (searchInput.getAttribute('listener') !== 'true') {
      searchInput.addEventListener("input", (e) => {
        e.preventDefault();
        searchComms(searchInput.value, localStorage.getItem('communityNames'));
      });
      }

      if (currentUrl.indexOf(latestQueryArray[latestQueryArray.length - 1]) !== -1) {
        ltLog("current search query" + latestQueryArray);
        const lastSearch = latestQueryArray[latestQueryArray.length - 1];
        searchComms(lastSearch, localStorage.getItem('communityNames'));   
      }
      else
      {
        if (checkAuthenticated()){
        const token = getCookie("jwt");
        const element = document.querySelector('.commsAreaStatic');
        const headers = { 'Authorization': 'Bearer ' + token,
        'mode': 'no-cors',
        'Content-Type': 'application/json'}; 
        // get from API every 5 mins.
        if (((Date.now() - settings.communityUpdateDateTime) >= 300000) || (settings.communityUpdateDateTime == ""))
        {
          ltLog("Updating Comms from API");
        fetch(settings.instance+'/api/v3/site', { headers })
          .then(response => response.json())
          .then(data => updateCommsAreas(data, settings));
        }
    
        }
        else
        {
          ltLog("Not Authenticated");
          ltLog("Get Comms from Storage...");
          communityNames = settings.communities
          let arrayCount = communityNames.length
          document.querySelector('.commsAreaStatic').innerHTML = "Communities: " + arrayCount;
          document.querySelector('.commsAreaSearch').innerHTML = "Communities: " + arrayCount;
          document.querySelector('.commsAreaStatic').innerHTML += communityNames;
          document.querySelector('.commsAreaSearch').innerHTML += communityNames;
        }
      }
    });


}

function getCookie(name) {
  var nameEQ = name + "=";
  var ca = document.cookie.split(';');
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function options(open) {
  const odiv = document.getElementById("ltOptions");
  ltLog(`Options Functions: ${open}`);
  let userOptions = {};
  if (open === 1) {
    odiv.style.display = "block";
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

function waitForElm(selector) {
  return new Promise(resolve => {
      if (document.querySelector(selector)) {
          return resolve(document.querySelector(selector));
      }

      const observer = new MutationObserver(mutations => {
          if (document.querySelector(selector)) {
              observer.disconnect();
              resolve(document.querySelector(selector));
          }
      });

      observer.observe(document.body, {
          childList: true,
          subtree: true
      });
  });
}