//http://www.w3schools.com/howto/howto_js_tabs.asp
function openTab(evt, tabName) {
	console.log("Opening tab: " + tabId);
    // Declare all variables
    var i, tabcontent, tablinks;

    // Get all elements with class="tabcontent" and hide them
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    // Get all elements with class="tablinks" and remove the class "active"
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    // Show the current tab, and add an "active" class to the link that opened the tab
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}
var activeTab = "";
// Get all elements with class="tablinks" and remove the class "active"
var tablinks = document.getElementsByClassName("tablinks");
for (i = 0; i < tablinks.length; i++) {
	var tabId = tablinks[i].id.slice(0,-7);
	console.log("Adding for tab: " + tabId);
	console.log(tablinks[i]);
	(function (tabId) {tablinks[i].addEventListener("click",function(evt) {
		openTab(evt, tabId);
		activeTab = tabId; return false;
	});})(tabId);
}