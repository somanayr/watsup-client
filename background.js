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
	
	var u = new URL(tab.url);
	var watsupUrl = u.protocol + "//" + u.hostname + "/watsup/"; //fixme
	watsupGet(watsupUrl, function(response, status) {
		var txt = "Fail";
		var color = "#FF0000";
		var popup = "fail_popup.html"
		
		if(status == 200){
			txt = "Pass";
			color = "#00FF00";
			popup = "login_popup.html";
		
		
			if(response == "logged in"){
				txt = "In";
				color = "#0000FF";
				popup = "logged_in_popup.html";
			}
		}
		
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
	});
}


chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	onUpdate(tab);
});

chrome.tabs.onCreated.addListener(function(tab) {         
   onUpdate(tab);
});

chrome.runtime.onMessage.addListener(function(msg,sender,callback){
	if(msg.tab){
		onUpdate(msg.tab);
	}
});

chrome.tabs.query({}, function(tabs) { 
	tabs.forEach(function(tab) {
		onUpdate(tab);
	});
} );