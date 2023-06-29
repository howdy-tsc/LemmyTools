// ==UserScript==
// @name         LemmyTools_dev
// @namespace    https://thesimplecorner.org/c/lemmytools
// @version      0.1.2
// @description  A small suite of tools to make Lemmy easier.
// @author       howdy@thesimplecorner.org
// @include      https://*
// @run-at 			document-end
// ==/UserScript==

const ltConfig = `
// ------------ EDIT THIS VARIABLE ---------------------
var homeInstance = 'https://thesimplecorner.org';
// ------------ END EDIT AREA --------------------------
// Fixes remote Instance home linl 


//Nothing below needs edited.



// -------------- VERSION ------------------- 
const ltVer = '0.1.2';
const ltTestedVer = '0.18';
var comm = '';

//--------------------------------------------
`;


const funcs = `

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
 
      console.log("LemmyTools: " + "update()" + subString);
      document.querySelectorAll('[role="alert"]').forEach(function(el) {
        el.innerHTML += "<br /><br /><a href=" + subString + " target='_blank'><button class='ltbutton'>Easy Subscribe</button></a>";
      });

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

    s.style[settings.positionSide] = "0%";
  	} 
  	else {
    x.style.display = "none";

		if (size.width > 261){
    s.style[settings.positionSide] = "-7.33%";
		}
		else{
    s.style[settings.positionSide] = "-210px";
		}
		}

}


function searchComms(id, full, commsdiv) {
  
console.log("LemmyTools: " + "commsearch evt searchinput" + id + commsdiv);
  var url = window.location.href;
  var query = id.toLowerCase();
 
if (query == "") {
		var commsCount = localStorage.getItem("commsCount");
if ((commsCount == null) || (full.length < 1))
{
commsdiv.innerHTML = "<hr /><b>Welcome to LemmyTools! Ver " + ltVer + "</b><br /><br />If this is your first time running the script, set your lemmy homeinstance in the option page. [" + ltVer  + "] - Manually enter your home lemmy instance in script for offsite home button functionality. (temporary)]. <br /><br /> If you dont see your subscribed communities here simply login to your lemmy and then click the LemmyTools home button above. ";
}
else
{
    commsdiv.innerHTML = "Communities: " + commsCount + '<hr />';
    commsdiv.innerHTML += full;
}
} 
else {
    commsdiv.innerHTML = full;
    console.log("LemmyTools: " + "Searching for:" + query);
    var children = commsdiv.getElementsByTagName("li");
    console.log("LemmyTools: " + "Children found: " + children.length);
    let data = [""];
    var found;
    for (var i = 0; i < children.length; i++) {
      if (children[i].innerHTML.toLowerCase().indexOf(query) !== -1) {
        found = children[i].innerHTML + '<br /><hr />';
        console.log("LemmyTools: " + "Found: " + found);
        data.push(found);
      }
    }
    let dup = [...new Set(data)];
    data = dup;
    data.sort();
    commupdate(commsdiv, url, data);
  }
}


function commupdate(id, page, data) {
console.log("LemmyTools: " + "Comm Update");
  var count = -1;

      //console.log("LemmyTools: " + "updating " + id + " commsearch with: " + data);
      data.forEach(_ => count++);
      id.innerHTML = "";
      id.innerHTML += "Results: " + count + "<hr /><br />";
      id.innerHTML += data;
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

mobile = isltMobile();

commposSide = localStorage.getItem("option_commposSide");
reverseSide = localStorage.getItem("option_reverseSide");
var instance = localStorage.getItem("option_homeInstance");
commposVertical = localStorage.getItem("option_commposVertical");
expandImages = localStorage.getItem("option_expandImages");
expandImagesize = localStorage.getItem("option_expandImageSize");
hoverCheck = localStorage.getItem("option_hoverCheck");
hideSideBar = localStorage.getItem("option_hideSideBar");
unblurNSFW = localStorage.getItem("option_unblurNSFW");
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
		//alert('Welcome to LemmyTools. LemmyTools has defaulted to this lemmy instance.');
	  //instance = window.location.origin;
      }
		
}
if (localStorage.getItem('option_commposVertical') == null)
{
		if (mobile)
{
	  commposVertical = "65";
}
else
{
	commposVertical = "5";
}
}
if (localStorage.getItem('option_expandImages') == null)
{
	  expandImages = "true";
}
if (localStorage.getItem('option_hideSideBar') == null)
{
	  hideSideBar = "false";
}
if (localStorage.getItem('option_expandImageSize') == null)
{
	  expandImagesize = "50";
}
if (localStorage.getItem('option_hoverCheck') == null)
{
	  hoverCheck = "false";
}
if (localStorage.getItem('option_unblurNSFW') == null)
{
	  unblurNSFW = "false";
}

localStorage.setItem("option_commposSide", commposSide);
localStorage.setItem("option_reverseSide", reverseSide);
localStorage.setItem("option_homeInstance", instance);
localStorage.setItem("option_commposVertical", commposVertical);
localStorage.setItem("option_expandImages", expandImages);
localStorage.setItem("option_expandImageSize", expandImagesize);
localStorage.setItem("option_hideSideBar", hideSideBar);
localStorage.setItem("option_hoverCheck", hoverCheck);
localStorage.setItem("option_unblurNSFW", unblurNSFW);
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

var expandImages = document.getElementsByName("option_expandImages")[0];
value = expandImages.checked;
expandImages  = value;

var expandImagesize = document.getElementsByName("option_expandImageSize")[0];
value = expandImagesize.value;
expandImagesize  = value;

var hideSideBar = document.getElementsByName("option_hideSideBar")[0];
value = hideSideBar.checked;
hideSideBar  = value;

var hoverCheck = document.getElementsByName("option_hoverCheck")[0];
value = hoverCheck.checked;
hoverCheck  = value;

var unblurNSFW = document.getElementsByName("option_unblurNSFW")[0];
value = unblurNSFW.checked;
unblurNSFW  = value;

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
localStorage.setItem("option_hideSideBar", hideSideBar);
localStorage.setItem("option_expandImages", expandImages);
localStorage.setItem("option_expandImageSize", expandImagesize);
localStorage.setItem("option_hoverCheck", hoverCheck);
localStorage.setItem("option_unblurNSFW", unblurNSFW);
location.reload(true);
}

commposSide = localStorage.getItem("option_commposSide");
reverseSide = localStorage.getItem("option_reverseSide");
instance = localStorage.getItem("option_homeInstance");
commposVertical = localStorage.getItem("option_commposVertical");
expandImages = localStorage.getItem("option_expandImages");
expandImagesize = localStorage.getItem("option_expandImageSize");
hideSideBar = localStorage.getItem("option_hideSideBar");
hoverCheck = localStorage.getItem("option_hoverCheck");
unblurNSFW = localStorage.getItem("option_unblurNSFW");

const userOptions = {theInstance: instance, positionSide: commposSide, reverseSide: reverseSide, positionVertical: commposVertical,expandImages: expandImages, expandImagesize: expandImagesize, hideSideBar: hideSideBar, hoverCheck: hoverCheck, unblurNSFW: unblurNSFW};
return userOptions;


}
function scrollToElement(pageElement) {    
    var positionX = 0,         
        positionY = -100;    

    while(pageElement != null){        
        positionX += pageElement.offsetLeft;        
        positionY += pageElement.offsetTop;        
        pageElement = pageElement.offsetParent;        
        window.scrollTo(positionX, positionY);    
    }
}

`;

/*--- */

const main = `
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
subString = subString.replace('#', '');
var count = 0;

if (isltMobile())
{
//Toggle(0);
}





//Better Subscription List --------------------------



const mouseReference = {
    mouseMove: false,
    buttonDown: false,
    x: false,
    y: false
}




setInterval(function() {	

document.onmousedown = e => {


if (settings.expandImages == "true")
{


    //Hide Existing Expanded images (stop pages from scrolling weird)
    if (e.srcElement.classList.contains('img-expanded'))
    {
		var mouseX = document.clientX;
		var mouseY = document.clientY;
    try{
    var alreadySeen = document.getElementsByClassName('hasExpanded');

    for (var i = 0; i < alreadySeen.length; i ++) {
          alreadySeen[i].style.display = 'none';
    		}
    } //end try
    catch {}
    

    e.srcElement.closest("a").setAttribute('onclick', 'return false;');
    e.srcElement.closest("a").setAttribute('overflow', 'auto;');
    e.preventDefault();
	
		var img = e.srcElement

   	var imgwidth = img.width;
   	var imgheight = img.height;
		ratio = imgheight / imgwidth;

    mouseReference.buttonDown = true;
    img.style.cursor = "move";
		img.classList.remove('overflow-hidden');
  
    var initialX = img.offsetTop;
    var initialY = img.offsetLeft;
  
    document.addEventListener("mousemove", function(e) {
    mouseMove = true;

    document.addEventListener("mouseup", function(e) {
    e.preventDefault();
    mouseReference.buttonDown = false; 
 		clearTimeout(imgTimeout);
  	});
    
   if(e.which === 1 &&  mouseReference.buttonDown && mouseMove) {
		scrollToElement(img);
    document.addEventListener("mouseup", function(e) {
    e.preventDefault();
    mouseReference.buttonDown = false; 
 		img.style.cursor = "auto";
 		clearTimeout(imgTimeout);
		delete window.img;
		if (img.classList.contains('thumbnail') == false)
		{
		img.classList.add("hasExpanded");
		}
  	}); //mouse up

    e.preventDefault();
    mouseX = e.clientX;
    mouseY = e.clientY;  
    var deltaY = mouseY;
    var deltaX = mouseX ;

      deltaY = ((initialY / 2) + mouseY) * .7;   
		
   
    imgTimeout = setTimeout(function() {
    img.style.height = deltaY + "px";  
    img.style.width = img.height / ratio + "px";
    }, 10);

 
} // if e.which
});
}
else if ((e.target.id == 'searchdiv') || (e.target.id == 'myDiv'))
{
if (settings.hoverCheck !== "true")
{
Toggle();
}
}
}		// if expand images
}	// document body e  

			//sidebar settings do
   		if (settings.hideSideBar == "true"){
          try{
            var sidebarSubscribed = document.getElementById("sidebarContainer");
            sidebarSubscribed.style.display = 'none';


            var serverInfo = document.getElementById("sidebarInfo");
            var serverInfoString = serverInfo.innerHtml;
            serverInfo.style.display = 'none';
          }
            catch {}
      }


//Easier Subscribe Buttons ---------------------------
//Browsing remote instance
if ((url.includes(settings.theInstance) == false) && ((url.includes("/c/") || url.includes("/post/") || url.includes("/comment/") || url.includes("/communities")))) {
setInterval(function() {
  url = window.location.href;
  if (currentPage != location.href) {
    broken = url.split('/c/');
    site = broken[0];
    site = site.replace('https://', '');
    community = broken[1];
    console.log("LemmyTools: " + "Easy Sub Running...");
    
      console.log("LemmyTools: " + "On remote lemmy");
      
        console.log("LemmyTools: " + "On remote instance community" + "Button to: " + subString);
        update(community, url, subString, settings.theInstance);
     
    }
  currentPage = location.href;
}, 500);
}
// Direct to community
  if ((url.includes(settings.theInstance) == false) && ((url.includes("/c/") || url.includes("/post/") || url.includes("/comment/") || url.includes("/communities")))) {
    console.log("LemmyTools: " + "On remote instance community - DIRECT -" + "Button to: " + subString);
    update(community, url, subString, settings.theInstance);
  }




     
       
}, 100);


//Option Divs
if (settings.expandImages == "true")
{
 eIcheck = 'checked';
}
else
{
 eIcheck = '';
}
if (settings.hideSideBar == "true")
{
 hSBcheck = 'checked';
}
else
{
 hSBcheck = '';
}
if (settings.hoverCheck == "true")
{
 hoverCheck = 'checked';
}
else
{
 hoverCheck = '';
}
if (settings.unblurNSFW == "true")
{
 unblurCheck = 'checked';
}
else
{
unblurCheck = '';
}


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
"<tr><td><b>HomeInstance URL</b> (Ex: https://yourinstance.lemmy)</td><td><textarea name='option_homeInstance'>" + settings.theInstance + "</textarea></td></tr>" +
"<tr><td><b>LemmyTools bar window side</b><br /> - default: right</td><td><select name='option_commposSide'><option value='" + settings.positionSide + "'>" + settings.positionSide + "</option><option value='right'>right</option><option value='left'>left</option></select></td></tr>" +
"<tr><td><b>LemmyTools bar vertical position </b><br />% from top [0-85] - default: desktop-5, mobile-65</td><td><textarea name='option_commposVertical'>" + settings.positionVertical + "</textarea></td></tr>" +
"<tr><td><b>Hover to activate LemmyTools bar</b><br />Otherwise click.</td><td><input type='checkbox'  name='option_hoverCheck'" + hoverCheck + "/></td></tr>" +  
"<tr><td><b>Hide Lemmy Sidebars</b><br /> (Trending, ServerInfo, Communities) </td><td><input type='checkbox'  name='option_hideSideBar'" + hSBcheck + "/></td></tr>" +
"<tr><td><b>Expandable Images</b><br />Acts as an auto-expander and adds the ability to manually<br /> expand images by clicking and dragging.</td><td><input type='checkbox'  name='option_expandImages' " + eIcheck + "/></td></tr>" +
"<tr><td><b>Auto Expand Size</b><br />Size of post image after opening a image post. - default: 50</td><td><textarea name='option_expandImageSize'>" + settings.expandImagesize + "</textarea></td></tr>" +
"<tr><td><b>Auto unblur NSFW images</b><br /></td><td><input type='checkbox'  name='option_unblurNSFW'" + unblurCheck + "/></td></tr>" +  
"<tr><td></td><td><button id='LTsaveoptions' onclick='options(3)'>Save /  Close</button></td></tr></tbody></table></div>" +
"<p> Tested on Lemmy Version: " + ltTestedVer  + " on firefox. " +
"<br /><h5>LemmyTools Links</h5><hr /><a href='https://thesimplecorner.org/c/lemmytools'>!lemmytools@thesimplecorner.org</a><br />Get it here: <a href='https://github.com/howdy-tsc/LemmyTools'>Github</a> or <a href='https://greasyfork.org/en/scripts/469169-lemmytools'>GreasyFork</a><br />Please submit issues to the github for feature requests and problems: <a href='https://github.com/howdy-tsc/LemmyTools/issues'>Github LemmyTools Issues</a><br /></p><br /><a href='https://ko-fi.com/lemmytools'><img src='https://storage.ko-fi.com/cdn/nav-logo-stroke.png' width='32' />Enjoy LemmyTools? Send a tip!</a>";
document.body.appendChild(odiv);


var height = window.innerHeight
|| document.documentElement.clientHeight
|| document.body.clientHeight;
height = (height/100 * 1);

//Comm divs
var touchdiv = document.createElement("div");
touchdiv.setAttribute("id", "touchdiv");
var idiv = document.createElement("div");
idiv.setAttribute("id", "searchdiv");
idiv.classList.add("ltmenu", "border-secondary", "card");
idiv.innerHTML = "<span style='float:" + settings.reverseSide + ";'><h5>LemmyTools " + ltVer + "</h5><b><a href=" + settings.theInstance + ">Home</a> - <a href='https://lemmyverse.net/communities' target='_new'>Find Comms</a> - <a href='#' id='LToptions' onclick='options(" + 1 + ")'>Options</a></b><br /><input type='text' id='commsearch' name='commsearchinput' oninput='searchComms(commsearch.value, communityArray, div)' placeholder='Sub search' /><br /><br /></span><div style='clear:both;'></div>";
var div = document.createElement("div");
div.setAttribute("id", "myDiv");
div.classList.add("ltcommsbar");


var styleString = ".ltmenu {position: fixed; top: " + settings.positionVertical +"%;" + settings.positionSide + ": 0; font-size: .75em; display: block; height: 100%; min-height: auto;  z-index:999; overflow:scroll; padding: 10px; border: thick double; border-right:none !important; outline: 1px solid grey !important;}" +
".ltmenu input { width: 100%;}" + 
".ltcommsbar { word-wrap: break-word; overflow:auto; height:100%; width:240px;}" + 
".ltbutton {background-color: #ccffe5;}" +
".img-fluid {width: " + settings.expandImagesize + "%}" +
"#searchdiv {position: fixed; height: 100%; min-height: auto; width: 240px; display:block;  z-index:999; overflow: auto; display: block; transition-timing-function: ease; transition: " + settings.positionSide + " .25s; " + settings.positionSide + " : 0; overflow: auto;}" +
".ltoptions {position: fixed; min-width: auto; min-height: auto; width: auto; height:auto; top: " + settings.positionVertical +"%;" + "display:none;  margin:0 auto; z-index:1000; padding:0.5%; border: thick double;}";

//Hover ltBar
if (settings.hoverCheck == "true")
{
styleString += "#searchdiv:not(:hover) {transition-timing-function: ease; transition: " + settings.positionSide + ".25s; " + settings.positionSide + " : -215px;} ";
}
else
{
styleString += "#searchdiv:not(:hover) {}";
}
if (settings.unblurNSFW == "true")
{
styleString += " .img-blur {filter: none !important; -webkit-filter: none !important; -moz-filter: none !important; -o-filter: none !important; -ms-filter: none !important;} ";
}
else
{
styleString += " .img-blur {filter: blur !important; -webkit-filter: blur !important; -moz-filter: blur !important; -o-filter: blur !important; -ms-filter: blur !important;} ";
}

const addCSS = css => document.head.appendChild(document.createElement("style")).innerHTML = css;
addCSS(styleString);






  url = location.href;
  console.log("LemmyTools: " + "url is " + url)
  // -----------------------------------------------
  //Add divs to page;
  document.body.appendChild(idiv);
	
  idiv.appendChild(div);

    
//Logged in
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
console.log("LemmyTools: Got Results >20");
    
      console.log("LemmyTools: " + "setting localcomms localstore");
      localStorage.setItem("localComms", communityArray);
			localStorage.setItem("commsCount", count);
    //force update the page
    searchComms("", communityArray, div);
   
  } else {
    console.log("LemmyTools: " + "get localcomms from localstore");
    communityArray = localStorage.getItem("localComms");
   
    div.innerHTML += communityArray;
    //force update the page
    searchComms("", communityArray, div);
  }


} 
  else {
  console.log("LemmyTools: On Remote Instance - Bar");
  //div.innerHTML = localStorage.getItem("remoteComms");
	//Toggle(0);
}

`;
  

(function() { 
    'use strict';
  	if(typeof $ == 'undefined'){ var $ = unsafeWindow.jQuery; }
    let isLemmy;
    try {
        isLemmy = true;
        isLemmy = document.head.querySelector("[name~=Description][content]").content === "Lemmy";
    } catch (_er) {
        isLemmy = false;
    }

    if (isLemmy) {
        document.body.appendChild(document.createElement("script")).innerHTML = ltConfig;
        document.head.appendChild(document.createElement("script")).innerHTML = funcs;
        document.body.appendChild(document.createElement("script")).innerHTML = main;
    }

})();
 
