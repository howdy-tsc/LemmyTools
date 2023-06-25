// ==UserScript==
// @name         LemmyTools
// @namespace    https://thesimplecorner.org/c/lemmytools
// @version      0.1.1
// @description  A small suite of tools to make Lemmy easier.
// @author       howdy@thesimplecorner.org
// @match        https://*/*
// ==/UserScript==




const homeString = `
// ------------ EDIT THIS FOR MANUAL HOME INSTANCE FIX: var homeInstance = 'https://lemmy.ml'; Should be temporary.
var homeInstance = '';
// -------------- VERSION ------------------- 
const ltVer = "0.1.1";
const ltTestedVer = "BE: 0.18.0";

var comm = '';
`;
//--------------------------------------------



/* SCRIPT BELOW */
const funcsString = `
function isltMobile(){
if (/Android|iPhone/i.test(navigator.userAgent)) {
console.log("LemmyTools: " + "is mobile!");
 return true;
}
else
{
console.log("LemmyTools: " + "is desktop!");
return false;
}
}


function update(comm, page, subString, hI) {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      console.log("LemmyTools: " + "update()" + subString);
      document.querySelectorAll('[role="alert"]').forEach(function(el) {
        el.innerHTML += "<br /><br /><a href=" + subString + " target='_blank'><button class='ltbutton'>Easy Subscribe</button></a>";
      });

/*
      let commPageArray = [];
      let remoteLinks = [];
      if (url.includes("/communities")) {
        document.querySelectorAll('[class="overflow-wrap-anywhere"]').forEach(function(el) {
          commPageArray.push(el.innerText);
        });
        if (commPageArray.count > 1)
        {
        console.log("LemmyTools: " + "setting remoteComms to localstore");
        localStorage.setItem("remoteComms", commPageArray);
        site = site.replace("/communities", "");
        for (const comm of commPageArray) {
          //subString = hI + "/search/?q=!" + comm + "@" + site + "&type=All&listingType=Communities&page=1&sort=TopAll";
          remoteLinks.push(subString);
          //div.innerHTML += comm + "<br /><a href=" + subString + " target='_blank'><button class='ltbutton'>Easy Subscribe</button></a><hr />";
        }
          console.log("LemmyTools: " + "setting remoteLinks to localstore");
      localStorage.setItem("remoteLinks", remoteLinks);
      }
      
      }
*/
    }
  }
  xhttp.open("GET", page, true);
  xhttp.send(page);
}

function commupdate(id, page, data) {
console.log("LemmyTools: " + "Comm Update");
  var count = -1;
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      console.log("LemmyTools: " + "updating " + id + " commsearch with: " + data);
      data.forEach(_ => count++);
      id.innerHTML = "";
      id.innerHTML += "Results: " + count + "<hr />";
      id.innerHTML += data;
    }
  }
  xhttp.open("GET", page, true);
  xhttp.send(page);
}



function Toggle(overide) {

	let settings = options();
  var s = document.getElementById("searchdiv");
  var size = s.getBoundingClientRect();
  var x = document.getElementById("myDiv");
  var b = document.getElementById("toggle");

//on remote instance just hide the bar.
    if (overide == 0)
    {
		console.log("LemmyTools: " + "overiding bar to hide.");
    x.style.display = "none";
    }


  	if (x.style.display === "none") {
    x.style.display = "block";
    b.innerHTML = "<<";
    s.style[settings.positionSide] = "0%";
  	} 
  	else {
    x.style.display = "none";
    b.innerHTML = ">>";

		if (size.width > 261){
    s.style[settings.positionSide] = "-7.33%";
		}
		else{
    s.style[settings.positionSide] = "-200px";
		}
		}

}

function searchComms(id, full, commsdiv) {
  var url = window.location.href;
  var query = id.value.toLowerCase();
 
  if (query == "") {
		var commsCount = localStorage.getItem("commsCount");
if (commsCount == null)
{
commsdiv.innerHTML = "<hr /><b>Welcome to LemmyTools! Ver " + ltVer + "</b><br /><br />If this is your first time running the script, set your lemmy homeinstance in the option page. [0.1.1 - Manually enter your home lemmy instance in script for offsite home button functionality. (temporary)]. <br /><br /> If you dont see your subscribed communities here simply login to your lemmy and then click the LemmyTools home button above. ";
}
else
{
    commsdiv.innerHTML = "Communities: " + commsCount + "<hr />";
    commsdiv.innerHTML += full;
}
  } else {
    commsdiv.innerHTML = full;
    console.log("LemmyTools: " + "Searching for:" + query)
    var children = commsdiv.getElementsByTagName("li"); // any tag could be used here..
    console.log("LemmyTools: " + "Children found: " + children.length);
    let data = [""];
    var found;
    for (var i = 0; i < children.length; i++) {
      if (children[i].innerHTML.toLowerCase().indexOf(query) !== -1) {
        found = children[i].innerHTML + "<hr />";
        console.log("LemmyTools: " + "Found " + query + " in " + found);
        data.push(found);
      }
    }
    let dup = [...new Set(data)];
    data = dup;
    data.sort();
    commupdate(commsdiv, url, data);
  }
}


function options(open){
var odiv = document.getElementById("ltOptions");
console.log("LemmyTools: " + "Options Functions");
if (open == 1)
{
odiv.style.display = "block";






}
else if (open == 2){
//First run set defaults or pull from localstorage.


commposSide = localStorage.getItem("option_commposSide");
reverseSide = localStorage.getItem("option_reverseSide");
var instance = localStorage.getItem("option_homeInstance");
commposVertical = localStorage.getItem("option_commposVertical");

if (localStorage.getItem('option_commposSide') == null)
{
		console.log("LemmyTools: First Run Defaults");
    commposSide = "right";
	  reverseSide = "left";
}
if (localStorage.getItem('option_reverseSide') == null)
{
	  reverseSide = "left";
}
if (localStorage.getItem('option_homeInstance') == null)
{
	 if (homeInstance != '')
         {
	    instance = homeInstance;
  	 }
    	else 
     {
	  instance = window.location.origin;
      }
		//alert('LemmyTools has defaulted to this lemmy instance. You can change this setting by clicking the options button on the sidebar.');
}
if (localStorage.getItem('option_commposVertical') == null)
{
	  commposVertical = "0";
}

localStorage.setItem("option_commposSide", commposSide);
localStorage.setItem("option_reverseSide", reverseSide);
localStorage.setItem("option_homeInstance", instance);
localStorage.setItem("option_commposVertical", commposVertical);



}
else if (open == 3)
{
//save button
odiv.style.display = "none";



var commposSide = document.getElementsByName("option_commposSide")[0];
var value = commposSide.options[commposSide.selectedIndex].value;
commposSide  = value;

theHomeinstance = document.getElementsByName("option_homeInstance")[0];
value = theHomeinstance.value;
theHomeinstance  = value;

var commposVertical = document.getElementsByName("option_commposVertical")[0];
value = commposVertical.value;
commposVertical  = value;

if (commposVertical > 85)
{
commposVertical = 85;
}
else if (commposVertical <= -1)
{
commposVertical = 0;
}


var reverseSide = "";

if (commposSide == "left")
{
reverseSide = "right";
}
else
{
reverseSide = "left";
}

localStorage.setItem("option_commposSide", commposSide);
localStorage.setItem("option_reverseSide", reverseSide);
localStorage.setItem("option_homeInstance", theHomeinstance);
localStorage.setItem("option_commposVertical", commposVertical);

location.reload(true);
}

commposSide = localStorage.getItem("option_commposSide");
reverseSide = localStorage.getItem("option_reverseSide");
instance = localStorage.getItem("option_homeInstance");
commposVertical = localStorage.getItem("option_commposVertical");


const userOptions = {theInstance: instance, positionSide: commposSide, reverseSide: reverseSide, positionVertical: commposVertical};
return userOptions;


}

`;


/*--- */


const mainString = `
// LemmyTools
//check if first run or load saved settings



let settings = options("2");


/* Script */
var url = window.location.href;
var currentPage = url;
var broken = url.split('/c/');
var site = broken[0];
site = site.replace('https://', '');
var community = broken[1];
var subString = settings.theInstance + "/search?q=!" + community + "@" + site + "&type=All&listingType=All&page=1&sort=TopAll";
var count = 0;

if (isltMobile())
{
//Toggle(0);
}



//Easier Subscribe Buttons ---------------------------
//Browsing remote instance
setInterval(function() {
  url = window.location.href;
  if (currentPage != location.href) {
    broken = url.split('/c/');
    site = broken[0];
    site = site.replace('https://', '');
    community = broken[1];
    //subString = settings.theInstance + "/search/?q=!" + community + "@" + site + "&type=All&listingType=Communities&page=1&sort=TopAll";
    // page has changed, set new page as 'current'
    console.log("LemmyTools: " + "Easy Sub Running...");
    if (document.querySelector('meta[name="Description"]').content.includes("Lemmy")) {
      console.log("LemmyTools: " + "On remote lemmy");
      if ((url.includes(settings.theInstance) == false) && ((url.includes("/c/") || url.includes("/post/") || url.includes("/comment/") || url.includes("/communities")))) {
        console.log("LemmyTools: " + "On remote instance community" + "Button to: " + subString);
        update(community, url, subString, settings.theInstance);
      }
    }
  }
  currentPage = location.href;
}, 500);

// Direct to community
if (document.querySelector('meta[name="Description"]').content.includes("Lemmy")) {
  console.log("LemmyTools: " + "On lemmy");
  if ((url.includes(settings.theInstance) == false) && ((url.includes("/c/") || url.includes("/post/") || url.includes("/comment/") || url.includes("/communities")))) {
    console.log("LemmyTools: " + "On remote instance community - DIRECT -" + "Button to: " + subString);
    update(community, url, subString, settings.theInstance);
  }
}





//Better Subscription List --------------------------


//Option Divs

var odiv = document.createElement("div");
odiv.setAttribute("id", "ltOptions");
odiv.classList.add("ltoptions", "border-secondary", "card");
odiv.innerHTML = "<h4>LemmyTools " + ltVer + "</h4></hr>" +
"<div class='table-responsive'><table class='table table-sm table-hover'>" +
"<thead class='pointer'>" +
"<tr><th>Option:</th>" +
"<th>Value:</th>" +
"</thead></tr>" +
"<tbody>" +
"<tr><td>HomeInstance URL (Ex: https://yourinstance.lemmy)</td><td><textarea name='option_homeInstance'>" + settings.theInstance + "</textarea></td></tr>" +
"<tr><td>Community Bar Side - default: right</td><td><select name='option_commposSide'><option value='" + settings.positionSide + "'>" + settings.positionSide + "</option><option value='right'>right</option><option value='left'>left</option></select></td></tr>" +
"<tr><td>Community Bar Side Vertical Position (% from top [0-85]) - default: 0</td><td><textarea name='option_commposVertical'>" + settings.positionVertical + "</textarea></td></tr>" +
"<tr><td><button id='LTsaveoptions' onclick='options(3)'>Save</button></td></tr></tbody></table></div>" +
"<p> Tested on Lemmy Version: " + ltTestedVer  +
"<br /><h5>LemmyTools Links</h5><hr /><a href='https://thesimplecorner.org/c/lemmytools'>!lemmytools@thesimplecorner.org</a><br />Get it here: <a href='https://github.com/howdy-tsc/LemmyTools'>Github</a> or <a href='https://greasyfork.org/en/scripts/469169-lemmytools'>GreasyFork</a><br /><br /> Please submit issues to the github for feature requests and problems: <a href='https://github.com/howdy-tsc/LemmyTools/issues'>Github LemmyTools Issues</a><br /></p>";
document.body.appendChild(odiv);


var height = window.innerHeight
|| document.documentElement.clientHeight
|| document.body.clientHeight;
height = (height/100 * 1);

//Comm divs
var idiv = document.createElement("div");
idiv.setAttribute("id", "searchdiv");
idiv.classList.add("ltmenu", "border-secondary", "card");
idiv.innerHTML = "<span style='float:" + settings.reverseSide + ";'><button class='ltbutton' id='toggle' onClick='Toggle()'" + "/> << </button></span><input type='text' id='commsearch' placeholder='Sub search' oninput='searchComms(commsearch, communityArray, div)' /><br />LemmyTools - <a href='#' id='LToptions' onclick='options(" + 1 + ")'>Options</a><br /><b><a href=" + settings.theInstance + ">Home</a> - <a href='https://lemmyverse.net/communities' target='_new'>Find Comms</a></b></span>";
var div = document.createElement("div");
div.setAttribute("id", "myDiv");
div.classList.add("ltcommsbar");

// One liner function:
 const addCSS = css => document.head.appendChild(document.createElement("style")).innerHTML = css;


// Usage: 
 addCSS(".ltmenu {position: fixed; min-width: 240px; width: 8%; top: " + settings.positionVertical +"%;" + settings.positionSide + ": 0; font-size: .75em; display: block; height:" + (100 - settings.positionVertical) + "%;  z-index:999;}" +
".ltcommsbar { word-wrap: break-word; overflow:scroll; height:100%;}" + 
".ltbutton {background-color: #ccffe5;}" +
".ltoptions {position: fixed; min-width: 500px; min-height: 500px; width: 60%; height: 45%; top: 10%; display:none; left: 20%; z-index:1000; padding:0.5%;}");






if (document.querySelector('meta[name="Description"]').content.includes("Lemmy")) {
  url = location.href;
  console.log("LemmyTools: " + "url is " + url)
  // -----------------------------------------------
  //Add divs to page;
  document.body.appendChild(idiv);
  idiv.appendChild(div);
}


var commsearch = document.getElementById("commsearch");

// -----------------------------------------------
let communityArray = new Array();
if (url.includes(settings.theInstance)) {
  console.log("LemmyTools: " + "home instance do bar");
  document.querySelectorAll('[class="list-inline-item d-inline-block"]').forEach(function(el) {
    communityArray.push("<li>" + el.innerHTML + "</li>");
  });
  let dup = [...new Set(communityArray)];
  communityArray = dup;
  if ((count == 0) || (count == null)) {
    count = 0;
    communityArray.forEach(_ => count++);
  }
  
  div.innerHTML += communityArray;
  if (div.innerHTML.length >= 20) {
    //make use of it:
console.log("LemmyTools: Got Results >20");
    
      console.log("LemmyTools: " + "setting localcomms localstore");
      localStorage.setItem("localComms", communityArray);
			localStorage.setItem("commsCount", count);
    //force update the page
    searchComms(commsearch, communityArray, div);
   
  } else {
    console.log("LemmyTools: " + "get localcomms from localstore");
    communityArray = localStorage.getItem("localComms");
   
    div.innerHTML += communityArray;
    //force update the page
    searchComms(commsearch, communityArray, div);
  }
} else {
  console.log("LemmyTools: On Remote Instance - Bar");
  //div.innerHTML = localStorage.getItem("remoteComms");
	//Toggle(0);
}
`;

//Pragmatic
const LTHome = document.head.appendChild(document.createElement("script")).innerHTML = homeString;
const LTFuncs = document.head.appendChild(document.createElement("script")).innerHTML = funcsString;
const LTMain = document.body.appendChild(document.createElement("script")).innerHTML = mainString;



