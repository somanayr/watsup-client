//Passive listening
function checkCompliance(url){
	
}

function onUpdate(tab){
	
	var tabId = tab.id;
	
	var txt = "Fail";
	var color = "#FF0000";
	
	if(checkCompliance(tab.url)){
		txt = "Pass";
		color = "#00FF00";
	}
	
	chrome.browserAction.setBadgeText({
		text: txt,
		tabId: tabId
	});
	
	chrome.browserAction.setBadgeBackgroundColor({
		color: color,
		tabId: tabId
	});
}


chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	if(changeInfo.url)
		onUpdate(tab);
});

chrome.tabs.onCreated.addListener(function(tab) {         
   onUpdate(tab);
});