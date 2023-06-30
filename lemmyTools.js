// ==UserScript==
// @name         LemmyTools
// @namespace    https://thesimplecorner.org/c/lemmytools
// @version      0.1.2
// @description  A small suite of tools to make Lemmy easier.
// @author       howdy@thesimplecorner.org
// @include      https://*
// @run-at 	document-end
// ==/UserScript==

//todo:
//


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


 let remoteCommunityArray = [];
				
function update(comm, page, subString, hI) {

     var el = document.getElementById("myDiv");
try{
 if (comm)
{

				
       	var browsedComm = "<li><h5>" + comm + "</h5><a href=" + subString + " target='_blank'><button class='ltbutton'>Easy Subscribe</button></a></li>";
				remoteCommunityArray.push(browsedComm);
				
 }
}
catch{}
       
return remoteCommunityArray;

}





function Toggle(overide) {

	let settings = options();
  var s = document.getElementById("searchdiv");
  var size = s.getBoundingClientRect();
  var x = document.getElementById("myDiv");
  var b = document.getElementById("toggle");
	var h = document.getElementById("ltBarHeader");
	var cs = document.getElementById("commsearch");

//on remote instance just hide the bar.
    if (overide == 0)
    {
		console.log("LemmyTools: " + "overiding bar to hide.");
    x.style.display = "none";
    }

  	if (x.style.display === "none") {
    x.style.display = "block";
			s.style.height = "100%";
		cs.style.display = "inline";
    h.innerHTML = "<h6><a href=" + settings.theInstance + ">Home</a> - <a href='https://lemmyverse.net/communities' target='_new'>Find Comms</a> - <a href='#' id='LToptions' onclick='options(" + 1 + ")'>Options</a></h6>";
    s.style[settings.positionSide] = "0%";

  	} 
  	else {
    x.style.display = "none";
		s.style.height = "auto";
h.innerHTML = '<img style="margin-' + settings.positionSide + ': 120px !Important; position:static;" class="targetImg" src="data:image/webp;base64,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"  width="32" height="32"  />';
cs.style.display = "none";

		if (size.width > 261){
    s.style[settings.positionSide] = "-7.33%";
		}
		else{
    s.style[settings.positionSide] = "-190px";
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
alienSiteOld = localStorage.getItem("option_alienSiteOld");
if (localStorage.getItem('option_commposSide') == null)
{
		console.log("LemmyTools: First Run Defaults");
    commposSide = "right";
	  reverseSide = "left";
		if (mobile)
{
    commposSide = "left";
	  reverseSide = "right";
}
else
{
    commposSide = "right";
	  reverseSide = "left";
}
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
	  commposVertical = "5";
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
{		if (mobile)
{
	 	  expandImagesize = "100";
}
else
{
		  expandImagesize = "50";
}

}
if (localStorage.getItem('option_hoverCheck') == null)
{
	  hoverCheck = "false";
}
if (localStorage.getItem('option_unblurNSFW') == null)
{
	  unblurNSFW = "false";
}
if (localStorage.getItem('option_alienSiteOld') == null)
{
if (mobile)
{
	 	  alienSiteOld = "false";
}
else
{
		  alienSiteOld = "true";
}
}

localStorage.setItem("option_commposSide", commposSide);
localStorage.setItem("option_reverseSide", reverseSide);
localStorage.setItem("option_homeInstance", instance);
localStorage.setItem("option_commposVertical", commposVertical);
localStorage.setItem("option_expandImages", expandImages);
localStorage.setItem("option_expandImageSize", expandImagesize);
localStorage.setItem("option_hideSideBar", hideSideBar);
localStorage.setItem("option_hoverCheck", hoverCheck);
localStorage.setItem("option_unblurNSFW", unblurNSFW);alienSiteOld
localStorage.setItem("option_alienSiteOld", alienSiteOld);
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

var alienSiteOld = document.getElementsByName("option_alienSiteOld")[0];
value = alienSiteOld.checked;
alienSiteOld = value;

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
localStorage.setItem("option_alienSiteOld", alienSiteOld);
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
alienSiteOld= localStorage.getItem("option_alienSiteOld");

const userOptions = {theInstance: instance, positionSide: commposSide, reverseSide: reverseSide, positionVertical: commposVertical,expandImages: expandImages, expandImagesize: expandImagesize, hideSideBar: hideSideBar, hoverCheck: hoverCheck, unblurNSFW: unblurNSFW, alienSiteOld: alienSiteOld};
return userOptions;


}
function scrollToElement(pageElement) {    
    var positionX = 0,         
        positionY = -130;    

    while(pageElement != null){        
        positionX += pageElement.offsetLeft;        
        positionY += pageElement.offsetTop;        
        pageElement = pageElement.offsetParent;        
        window.scrollTo(positionX, positionY, "smooth");    
    }
}
function removeClassByWildcard(divClass) {
  // If the class ends with a "*", then it matches all classes that start with the given class name.
  if (divClass.endsWith("*")) {
		divClass = divClass.replace('*', '');
    // Get all elements with the given class name.
    var elements = document.getElementsByTagName("div");
    var re = new RegExp("(^|\\s)" + divClass + "(\\s|$)"); 
		let result = [];
		let className = "";
    
		for (var i=0; i<elements.length; i++) {
      if (re.test(elements[i].className)) {
				console.log("Match: " + elements[i]);
				result.push(elements[i]);
				for (var y=0; y<elements[i].classList.length; y++)
				{
					if (elements[i].classList[y].indexOf(divClass) !== -1)
						{
							className = elements[i].classList[y];
							console.log(className);
						}
				}
      }
    }
    // Remove the class from all elements.
    for (var i = 0; i < result.length; i++) {
      result[i].classList.remove(className);
    }
  } else {
    // Otherwise, the class must match exactly.
    var elements = document.querySelectorAll("[class=" + divClass + "]");

    // Remove the class from all elements.
    for (var i = 0; i < elements.length; i++) {
      elements[i].classList.remove(divClass);
    }
  }

}
`;

/*--- */

const main = `
// LemmyTools
//check if first run or load saved settings
let settings = options("2");

//settings.alienSiteOld = "true";
if (settings.alienSiteOld == "true")
{
alienSiteOldStyle_compact();
}


/* Script */
var url = window.location.href;
var currentPage = url;
var broken = url.split('/c/');
var site = broken[0];
site = site.replace('https://', '');
var community = broken[1];
var subString = settings.theInstance + "/search?q=!" + community + "@" + site + "&type=All&listingType=All&page=1";
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
  
    document.addEventListener("dblclick", function(e) {
    mouseReference.buttonDown = false; 
		window.location = img.src;
  	});


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

      deltaY = ((initialY / 2) + mouseY) * 1.1;   
		
   
    imgTimeout = setTimeout(function() {
    img.style.height = deltaY + "px";  
    img.style.width = img.height / ratio + "px";
    }, 10);

 
} // if e.which
});
}
else if ((e.target.id == 'searchdiv') || (e.target.id == 'myDiv') || (e.target.classList.contains('card-header')) || (e.target.classList.contains('clickAble')) || (e.target.classList.contains('targetImg')) )
{
if (settings.hoverCheck !== "true")
{
Toggle();
}
}
}		// if expand images
}	// document body e  

//Removes the offset from images.
try{removeClassByWildcard("offset-*");}catch{}


			//sidebar settings do
   		if (settings.hideSideBar == "true"){
          try{
            var sidebarSubscribed = document.getElementById("sidebarContainer");
            sidebarSubscribed.style.display = 'none';
					  removeClassByWildcard("site-sideba*");

            var serverInfo = document.getElementById("sidebarInfo");
            var serverInfoString = serverInfo.innerHtml;
            serverInfo.style.display = 'none';
          }
            catch {}
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
if (settings.alienSiteOld == "true")
{
 aSOcheck = 'checked';
}
else
{
aSOcheck = '';
}



var odiv = document.createElement("div");
odiv.setAttribute("id", "ltOptions");
odiv.classList.add("ltoptions", "border-secondary", "card");
odiv.innerHTML = "<h4>LemmyTools " + ltVer + " Options</h4></hr>" +
"<div class='table-responsive'><table class='table'>" +
"<thead class='pointer'>" +
"<tr><th>Option:</th>" +
"<th>Value:</th>" +
"</thead></tr>" +
"<tbody>" +
"<tr><td><b>LemmyTools Settings:</b></td><td></td></tr>" +
"<tr><td><b>HomeInstance URL</b><br /> Make sure to edit the homeInstance variable of<br /> the UserScript for the remote instance Home button fix. (Temporary workaround).<br />(Ex: https://yourinstance.lemmy)</td><td><textarea name='option_homeInstance'>" + settings.theInstance + "</textarea></td></tr>" +
"<tr><td><b>LemmyTools bar window side</b><br /> - default: right</td><td><select name='option_commposSide'><option value='" + settings.positionSide + "'>" + settings.positionSide + "</option><option value='right'>right</option><option value='left'>left</option></select></td></tr>" +
"<tr><td><b>LemmyTools bar vertical position </b><br />% from top [0-85] - default: desktop-5, mobile-65</td><td><textarea name='option_commposVertical'>" + settings.positionVertical + "</textarea></td></tr>" +
"<tr><td><b>Hover to activate LemmyTools bar</b><br />Otherwise click.</td><td><input type='checkbox'  name='option_hoverCheck'" + hoverCheck + "/></td></tr>" +  
"<tr><td><br /><br /></td><td></td></tr>" +
"<tr><td><b>Site Style and Behaviors:</b></td><td></td></tr>" +
"<tr><td><b>Compact Lemmy to old.Reddit Re-format (Lemmy v0.18) style</b><br />Like the old alien.site but lemmy! <br />Defaults - Desktop: On / Mobile: Off</td><td><input type='checkbox'  name='option_alienSiteOld'" + aSOcheck + "/></td></tr>" +
"<tr><td><b>Hide Lemmy Sidebars</b><br /> (Trending, ServerInfo, Communities)<br /> More room for images on feed.</td><td><input type='checkbox'  name='option_hideSideBar'" + hSBcheck + "/></td></tr>" +
"<tr><td><b>Expandable Images</b><br />Acts as an auto-expander and adds the ability to manually<br /> expand images by clicking and dragging.<br />Doubleclick to open full image.</td><td><input type='checkbox'  name='option_expandImages' " + eIcheck + "/></td></tr>" +
"<tr><td><b>Auto Expand Size</b><br />Size of post image after opening a image post.<br /> Desktop Default: 50 / Mobile: 100</td><td><textarea name='option_expandImageSize'>" + settings.expandImagesize + "</textarea></td></tr>" +
"<tr><td><b>Auto unblur NSFW images</b><br /></td><td><input type='checkbox'  name='option_unblurNSFW'" + unblurCheck + "/></td></tr>" +  
"<tr><td></td><td><button id='LTsaveoptions' onclick='options(3)'>Save /  Close</button></td></tr></tbody></table></div>" +
"<p> Tested on Lemmy Version: " + ltTestedVer  + " on firefox. " +
"<br /><h5>LemmyTools Links</h5><hr /><a href='https://thesimplecorner.org/c/lemmytools'>!lemmytools@thesimplecorner.org</a><br />Get it here: <a href='https://github.com/howdy-tsc/LemmyTools'>Github</a> or <a href='https://greasyfork.org/en/scripts/469169-lemmytools'>GreasyFork</a>" +
"<br />Please submit issues to the github for feature requests and problems: <a href='https://github.com/howdy-tsc/LemmyTools/issues'>Github LemmyTools Issues</a><br /></p>" + 
"<br /><a href='https://ko-fi.com/lemmytools'><img src='https://storage.ko-fi.com/cdn/nav-logo-stroke.png' width='32' /><br />Enjoy LemmyTools?<br />Tip with coffee!</a>" + 
"<br /><br /><b>Attributes/Credit: </b><br /><li>The provided style pack option of 'Compact Lemmy to old.Reddit Re-format (Lemmy v0.18)' was graciously used with permission from the developer(s). <br />Please support their project here:" +
"<a href='https://github.com/soundjester/lemmy_monkey'> Compact Lemmy to old.Reddit Re-format (Lemmy v0.18)</a></li>"; 

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
idiv.innerHTML = "<span class='clickAble'  style='float:" + settings.reverseSide + ";'> <header id='ltBarHeader' class='card-header'><h6><a href=" + settings.theInstance + ">Home</a> - <a href='https://lemmyverse.net/communities' target='_new'>Find Comms</a> - <a href='#' id='LToptions' onclick='options(" + 1 + ")'>Options</a></h6></header><input type='text' id='commsearch' name='commsearchinput' oninput='searchComms(commsearch.value, communityArray, div)' placeholder='Search your subscriptions (or visted subs)' /></span><b class='clickAble'>LemmyTools " + ltVer + "</b><div style='clear:both;'></div>";
var div = document.createElement("div");
div.setAttribute("id", "myDiv");
div.classList.add("ltcommsbar");


var styleString = ".ltmenu {position: fixed; top: " + settings.positionVertical +"%;" + settings.positionSide + ": 0; font-size: .75em; display: block; height: 100%; min-height: auto;  z-index:999; overflow:scroll; border: thick double; border-right:none !important; outline: 1px solid grey !important;}" +
".ltmenu input { width: 100%;}" + 
".ltcommsbar { word-wrap: break-word; overflow:auto; height:100%; width:240px;}" + 
".ltcommsbar hr {display:block;}" + 
".ltbutton {background-color: #ccffe5;}" +
".img-fluid {width: " + settings.expandImagesize + "%}" +
"#searchdiv {position: fixed; height: 100%; min-height: auto; width: 240px; display:block;  z-index:999; overflow: auto; display: block; transition-timing-function: ease;  transition: " + settings.positionSide + " .25s; " + settings.positionSide + " : 0; transition-delay: 0, 1s; overflow: auto;}" +
".ltoptions {position: fixed; min-width: auto; min-height: auto; width: auto; height:100%; top:0;" + "display:none; left: 0; overflow:scroll; z-index:1000; padding:0.5%; border: thick double;}";

//Hover ltBar
if (settings.hoverCheck == "true")
{
styleString += "#searchdiv:not(:hover) { transition-timing-function: ease; transition: " + settings.positionSide + ".25s; " + settings.positionSide + " : -215px;transition-delay: 1s, 2s;} ";
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

if (settings.hideSideBar == "true")
{
styleString += ".container, .container-lg, .container-md, .container-sm, .container-xl { }" + 
".col-md-8 {flex: 0 0 80% !important;max-width: 80%;}";
}
else
{
styleString += ".container, .container-lg, .container-md, .container-sm, .container-xl {}";
}

// ADD MAIN CSS
const addCSS = css => document.head.appendChild(document.createElement("style")).innerHTML = css;
addCSS(styleString);






  url = location.href;
  console.log("LemmyTools: " + "url is " + url)
  // -----------------------------------------------
  //Add divs to page;
  document.body.appendChild(idiv);
  idiv.appendChild(div);

let rCommunityArray = [];

//Easier Subscribe Buttons ---------------------------
//Browsing remote instance
setInterval(function() {	
var url = window.location.href;
var currentPage = url;
var broken = url.split('/c/');
var site = broken[0];
site = site.replace('https://', '');
var community = broken[1];
var subString = settings.theInstance + "/search?q=!" + community + "@" + site + "&type=All&listingType=All&page=1";
subString = subString.replace('#', '');


  url = window.location.href;
  if (currentPage != location.href) {
    console.log("LemmyTools: " + "Easy Sub Running...");
    if (document.querySelector('meta[name="Description"]').content.includes("Lemmy")) {
      console.log("LemmyTools: " + "On remote lemmy");
      if ((url.includes(settings.theInstance) == false) && ((url.includes("/c/") || url.includes("/post/") || url.includes("/comment/") || url.includes("/communities")))) {
        console.log("LemmyTools: " + "On remote instance community" + "Button to: " + subString);
      rCommunityArray =  update(community, url, subString, settings.theInstance);
  let rDup = [...new Set(rCommunityArray)];
  rCommunityArray = rCommunityArray.reverse();
	div.innerHTML = '';
	div.innerHTML += rCommunityArray;
	communityArray = rCommunityArray;
    
      }
    }
  }else if (document.querySelector('meta[name="Description"]').content.includes("Lemmy")) {
  console.log("LemmyTools: " + "On lemmy");
  if ((url.includes(settings.theInstance) == false) && ((url.includes("/c/") || url.includes("/post/") || url.includes("/comment/") || url.includes("/communities")))) {
    console.log("LemmyTools: " + "On remote instance community - DIRECT -" + "Button to: " + subString);
  rCommunityArray =  update(community, url, subString, settings.theInstance);
  let rDup = [...new Set(rCommunityArray)];
  rCommunityArray = rDup;
	rCommunityArray = rCommunityArray.reverse();
	div.innerHTML = '';
	div.innerHTML += rCommunityArray;
	communityArray = rCommunityArray;
    
  }
 
}



  currentPage = location.href;
}, 1000);

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

/* The provided restyling was graciously used with permission from the developer(s) of Compact Lemmy to old.Reddit Re-format (Lemmy v0.18)

// @name         Compact Lemmy to old.Reddit Re-format (Lemmy v0.18)
// @namespace    https://github.com/soundjester/lemmy_monkey
// @description  Reformat widescreen desktop to look more like Reddit
// @version      2.4
// @author       mershed_perderders, DarkwingDuck, dx1@lemmy.world, Djones4822, Jakylla

Thank you.
*/

const alienSiteOldStyle = ` ${
function alienSiteOldStyle_compact(){
'use strict';
	/***********************************/
	/* set desired thumbnail size here */
	/* 70px - compact default          */
	/* 100px - large thumbnail default */
	/***********************************/
 	var thumbnailSize = 70;
 	var readingWidth = 940; /*controls the width of comments and text posts on individual post pages - default=940*/	
	/***********************************/

	function AppendCommentCountText(container) {
		var svgElem = container.querySelectorAll("svg")[0].outerHTML;
		var numComms = container.title;
		var spanElem = container.querySelectorAll("span");
		var spanElemHTML = "";
		if(spanElem[0]){
			spanElemHTML = " " + spanElem[0].outerHTML
		}
		container.innerHTML = svgElem + numComms + spanElemHTML;
	}

	function ApplyCommentCountText(element) {
		const observer = new MutationObserver(function(mutationsList) {
			for (let mutation of mutationsList) {
				if (mutation.type === 'childList') {
					for (let addedNode of mutation.addedNodes) {
						try {
							var comm_count = addedNode.querySelectorAll(".btn.btn-link.btn-sm.text-muted.ps-0");
							comm_count.forEach(AppendCommentCountText);
						} catch (_er) {
							console.log(_er);
							return;
						}
					}
				}
			}
		});

		observer.observe(element, { childList: true, subtree: true });
	}

	function AppendPostURL(container) {
		var tld_link = container.querySelectorAll(".d-flex.text-muted.align-items-center.gap-1.small.m-0")[0];
		var post_details = container.querySelectorAll("span.small")[0];
		if (tld_link) {
			var post_detail = tld_link.nextSibling.innerText;
			post_details.innerHTML += " • " + tld_link.innerHTML
		}
	}

	function ApplyAppendPostURL(element) {
		const observer = new MutationObserver(function(mutationsList) {
			for (let mutation of mutationsList) {
				if (mutation.type === 'childList') {
					for (let addedNode of mutation.addedNodes) {
						try {
							var comm_count = addedNode.querySelectorAll("article > .col-12.col-sm-9 > .row > .col-12");
							comm_count.forEach(AppendPostURL);
						} catch (_er) {
							console.log(_er);
							return;
						}
					}
				}
			}
		});

		observer.observe(element, { childList: true, subtree: true });
	}
	
		const css = `
			/**************************/
			/* NSFW automatic un-blur */
			/**************************/
			 .img-blur {
				 filter: none !important;
				 -webkit-filter: none !important;
				 -moz-filter: none !important;
				 -o-filter: none !important;
				 -ms-filter: none !important;
			}
			/***************************/
			/* bootstrap column widths */
			/***************************/
			/*main container*/
			 .container, .container-lg, .container-md, .container-sm, .container-xl {
				 max-width: 100% !important;
			}
			.home {
				padding-left: 1em !important;
			}   
			/*sidebar width*/
			 .col-md-4 {
				 flex: 0 0 20% !important;
				 max-width: 20%;
				 padding-right: unset !important;
			}
			/*main post area (witdh optimized for widescreen)*/
			 .col-md-8 {
				 flex: 0 0 80% !important;
				 max-width: 80%;
			}
			 .col-sm-2 {
				 flex: 0 0 10% !important;
				 max-width: 10%;
			}
			 .col-sm-9 {
				 flex: 0 0 80% !important;
				 max-width: 80%;
			}
			 .col-8 {
				 max-width: 100% !important;
			}
			/* specific column combos that need padding adjustment*/
			/* .col-12.col-md-8 {
				 padding-left: unset !important;
			}
			 */
			/* .col-12.col-sm-9 {
				 padding-left: unset !important;
			}
			 */
			/* navbar padding*/
			 .navbar {
				/*padding-left: 0 !important;
				*/
				 padding-right: 1em !important;
			}
			 .navbar-nav {
				 margin-top: 0px !important;
				 margin-bottom: 0px !important;
			}
			/* control vertical padding*/
			 .mb-1, .my-1 {
				 margin-bottom: 0.1rem !important;
			}
			 .mb-2, .my-2 {
				 margin-bottom: 0.1rem !important;
			}
			 .mt-3, .my-3 {
				 margin-top: 0.1rem !important;
			}
			 .mt-4, .my-4 {
				 margin-top: 0.1rem !important;
			}
			/***************/
			/* voting area */
			/***************/
			/*can be modified as you like*/
			 .vote-bar {
				 font-size: 0.85em !important;
				 flex: 0 0 4% !important;
				 max-width: 4% !important;
				 margin-top:unset !important;
			}
			/******************/
			/* thumbnail area */
			/******************/
			/*keep thumbnails as square as we can and about the size of each post row*/
			 .post-media {
				 min-width: +thumbnailSize+px !important;
				 max-width: +thumbnailSize+px !important;
				 margin-right: 1em !important;
			}
			 .thumbnail {
				 min-height: +thumbnailSize+px !important;
				 max-height: +thumbnailSize+px !important;
				 min-width: +thumbnailSize+px !important;
				 max-width: +thumbnailSize+px !important;
			         background-color: #333;
				 object-fit: scale-down; /* instead of "cover" */
			}
			/*this is needed for videos/gifs*/
			 .embed-responsive {
				 min-height: +thumbnailSize+px !important;
				 max-height: +thumbnailSize+px !important;
				 min-width: +thumbnailSize+px !important;
				 max-width: +thumbnailSize+px !important;
			}
			/*apply specific styling to text posts*/
			.post-media a[href^="/post/"] .thumbnail {
				border: 1px solid #333;
				background-color: unset !important;
			}   
			/*******************/
			/* main page posts */
			/*******************/
			/* post title font size*/
			 .h5, h5 {
				 font-size: 1rem !important;
				 margin-bottom: 0.1rem !important;
			}
			 .small, small {
				 font-size: 80%;
				 font-weight: 400;
			}
			/*can be adjusted smaller, but beyond .25 is gets too tight and individual post spacing starts to appear overlapping*/
			 .post-listing {
				 margin: 0.25rem 0 !important;
				 padding: 0.25rem 0 !important;
			}
			 .post-listing picture img.rounded-circle {
				 width: 1.25rem;
				 height: 1.25rem;
			}
			/*hide link TLD until it is moved back to the old spot*/
			 p.d-flex.text-muted.align-items-center.gap-1.small.m-0 {
				 display: none !important;
			}
			/*thumbnail width control (keep it square, dang it!)*/
			 .post-listing .d-none .row .col-sm-2 {
				 max-width: 100px;
			}
			 .post-listing .d-none .row .col-sm-9 {
				 display: flex;
				 align-items: unset !important;
			}
			/*comment number and fediverse/lemmy links*/
			 .ps-0 {
				 font-size: 0.75rem !important;
			}
			/*the below .btn is deprecated as .py-0 (above) provides more consistent spacing;
			 however, some may prefer the look of smaller text on buttons*/
			/*.btn {
				 font-size:0.75rem !important;
			}
			*/
			/*media collapse/expand button - appears after post title for offsite links that have a thumbnail*/
			 .btn.btn-sm.text-monospace.text-muted.d-inline-block {
				 padding-top: 0;
				 padding-bottom: 0;
			}
			 .text-body.mt-2.d-block{
				 font-size: 0.8rem;
				 display: none !important;
			}
			/************/
			/* comments */
			/************/
			/* restrict post and comment width - adjust to preference */
			/* may use li[role="comment"] instead of .md-div - this fully restricts all comment elements (eg. divider lines_ */
			 #postContent, .md-div, .alert-warning  {
				 max-width: +readingWidth+px;
			}
			 .mb-3.row {
				 max-width: +(readingWidth+25)+px; /*top-comment textarea needs extra width*/
			}
			/*top comment doesn't need to hug the comment sort buttons.*/
			 .comments:first-child {
				 margin-top: 0.5rem !important;
			}
			/*allow top-level comment box to be resized*/
			 div > textarea {
				 resize: both !important;
			}
   			/*increase the indent for child comments*/
			 .ms-1 {
				 margin-left: 1em !important;
			}
			/***********/
			/* sidebar */
			/***********/
			 #sidebarContainer {
				 padding-right: 1em;
			}
			/******************************/
			/* entire page display tweaks */
			/******************************/
			 #app > div > .container-lg {
				 margin-left: 1em !important;
				 max-width: 99% !important;
				 margin-left: unset !important;
			}
			 #app > nav > .container-lg {
				 max-width: 100% !important;
			}
			 #app > navbar > .container-lg {
				 margin-left: unset !important;
			}
			/* post index layout*/
			 #app > .mt-4 > .container-lg hr.my-3 {
				 display: none;
			}
			 #app > .mt-4 > .container-lg > .row {
				 margin: unset !important;
			}
			/* post layout*/
			 #app > .mt-4 > .container-lg > .row > main {
				 max-width: 100%;
			}
			 #app > .mt-4 > .container-lg > .row > .col-md-8 {
				 width: calc(100% - 450px);
			}
			 #app > .mt-4 > .container-lg > .row > .col-md-4 {
				 width: 450px;
			}
			 hr {
				 display: none;
			}
			/* highlight number of new comments */
			 .text-muted.fst-italic {
				 color: var(--bs-orange) !important;
			}
			/* Fix user drop down menu position*/
			 .dropdown-content {
				 right: 0px;
			}
			.dropdown-menu.show {
				width: 100%;
			}   
			/* Profile and Community Banner size */
			 .position-relative.mb-2 {
				 max-width: 730px;
			}
			/*table styles - primarily used on the "Communities" page*/
			 .table-responsive {
				 margin-top: 0.5em;
			}
			 .table-sm td, .table-sm th {
				 padding: 0.1rem;
				 vertical-align: middle;
			}
			/**********************************************/
			/** Specific screen size (mobile) adjustments */
			/**********************************************/
			 @media screen and (min-width: 1981px) {
				 #app {
					 max-width: 1980px;
					 margin-left: auto;
					 margin-right: auto;
				}
			}
			 @media screen and (min-width: 1200px) and (max-width: 1640px) {
				 .col-md-4 {
					 flex: 0 0 25% !important;
					 max-width: 25%;
				}
				 .col-md-8 {
					 flex: 0 0 75% !important;
					 max-width: 75%;
				}
			}
			 @media screen and (max-width: 1199px) and (min-width: 992px) {
			        .col-12 {
				          flex: 0 0 100% !important;
				          max-width: 75%;
			        }
				 .col-md-4 {
					 flex: 0 0 25% !important;
					 max-width: 25%;
				}
			        .vote-bar {
				          flex: 0 0 8% !important;
				          max-width: 8% !important;
			        }
			}
			 @media screen and (max-width: 768px) and (min-width: 576px) {
			        .col-12 {
				          flex: 0 0 100% !important;
				          max-width: 100%;
			        }
			        .col-sm-9 {
				          flex: 0 0 72% !important;
				          max-width: 72%;
			        }
			        .vote-bar {
				          flex: 0 0 8% !important;
				          max-width: 8% !important;
			        }
			}
			 @media screen and (max-width: 575px) {
				 #tagline {
					 padding-right: 1em;
				}
				 .col-12 {
					 flex: 0 0 100% !important;
					 max-width: 100%;
				}
				 .col-8 {
					 flex: 0 0 75% !important;
					 max-width: 75%;
				}
				 .col-4 {
					 flex: 0 0 25% !important;
					 max-width: 25%;
					 justify-content: flex-end !important;
					 display: flex !important;
				}
			}`

		const styleTag = document.createElement('style');
		styleTag.appendChild(document.createTextNode(css));
		document.head.appendChild(styleTag);
		/*append comment icon with "comment" text*/
		var comm_count = document.querySelectorAll(".btn.btn-link.btn-sm.text-muted.ps-0");
		comm_count.forEach(AppendCommentCountText);

		/*Apply AppendCommentCountText to dynamically loaded elements */
		ApplyCommentCountText(document.documentElement);

		/*append post TLD link to post detail area*/
		var post_info = document.querySelectorAll("article > .col-12.col-sm-9 > .row > .col-12");
		post_info.forEach(AppendPostURL);

		/* Apply AppendPostURL to dynamically loaded elements */
		ApplyAppendPostURL(document.documentElement);
	
}
}`;

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
      	document.head.appendChild(document.createElement("script")).innerHTML = alienSiteOldStyle;
        document.body.appendChild(document.createElement("script")).innerHTML = ltConfig;
        document.head.appendChild(document.createElement("script")).innerHTML = funcs;
        document.body.appendChild(document.createElement("script")).innerHTML = main;
    }

})();
 
