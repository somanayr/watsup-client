//Passive listening
function watsupGet(url, callback, params){

	if(params){
		// http://stackoverflow.com/a/31713191/582136
		url = url + "?" + Object.keys(params).map(function(key){
          return encodeURIComponent(key)+"="+encodeURIComponent(params[key]);
        }).join("&")
	}

    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", url, true ); // false for synchronous request
    xmlHttp.send( null );
	xmlHttp.onreadystatechange = function() { 
		if (xmlHttp.readyState == 4) {
			callback(xmlHttp.responseText, xmlHttp.status);
		}
            
	}
}

function onUpdate(tab){
	
	//First we set the tab to a "waiting" state
	var tabId = tab.id;
	chrome.browserAction.setBadgeText({
		text: "...",
		tabId: tabId
	});
		
	chrome.browserAction.setBadgeBackgroundColor({
		color: "#FFFF00",
		tabId: tabId
	});
	
	chrome.browserAction.setPopup({
		popup: "wait_popup.html",
		tabId: tabId
	});
	
	//Then we try to figure out the status of WATSUP on the server
	var u = new URL(tab.url);
	var watsupUrl = u.protocol + "//" + u.hostname + "/watsup/"; //FIXME how should we verify?
	watsupGet(watsupUrl, function(response, status) {
		var txt = "Fail"; //Default to "failed" state
		var color = "#FF0000";
		var popup = "fail_popup.html"
		
		if(status === 200){ //If got status 200, read that as the server implements WATSUP
			txt = "Pass"; //Set success, but not logged in state
			color = "#00FF00";
			popup = "login_popup.html";
		
		
			if(response === "logged in"){ //If we are told we're logged in, read that as we're logged in
				txt = "In"; //Set logged in
				color = "#0000FF";
				popup = "logged_in_popup.html";
			}
		}
		
		//Here we actually update the browser action state
		chrome.browserAction.setBadgeText({
			text: txt,
			tabId: tabId
		});
		
		chrome.browserAction.setBadgeBackgroundColor({
			color: color,
			tabId: tabId
		});
		
		chrome.browserAction.setPopup({
			popup: popup,
			tabId: tabId
		});
		
		
		if(status == 200){
			chrome.tabs.sendMessage(tab.id, {tab: tab});
		}
	});
}

/* Set up conditions on which we update tab state */
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) { //When a tab is updated
	onUpdate(tab);
});

chrome.tabs.onCreated.addListener(function(tab) { //When a tab is created
   onUpdate(tab);
});

chrome.runtime.onMessage.addListener(function(msg,sender,callback){ //When we're asked to (by the BrowserAction popup)
	if(msg.tab){
		onUpdate(msg.tab);
	}
});

chrome.tabs.query({}, function(tabs) { //Also update every tab when the application launches
	tabs.forEach(function(tab) {
		onUpdate(tab);
	});
} );