
var errorLabelIds = ["error", "error_username", "error_login_pass", "error_register_pass"];
var formIds = ["username_form", "login_form", "register_form"];

function request(url, callback, method, params){

	if(method === undefined){
		method = "GET";
	}

	if(params && method == "GET"){
		// http://stackoverflow.com/a/31713191/582136
		url = url + "?" + Object.keys(params).map(function(key){
          return encodeURIComponent(key)+"="+encodeURIComponent(params[key]);
        }).join("&")
	}

    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", watsupUrl, true );
    if(params && method == "POST"){
		// http://stackoverflow.com/a/31713191/582136
		xmlHttp.send(Object.keys(params).map(function(key){
          return encodeURIComponent(key)+"="+encodeURIComponent(params[key]);
        }).join("&"));
	} else {
		xmlHTttp.send(null);
	}
	xmlHttp.onreadystatechange = function() { 
		if (xmlHttp.readyState == 4) {
			//Reset errors after each exchange:
			errorLabelIds.forEach(function(lab) {
				document.getElementById(lab).textContent = "";
			});
			var response = response = JSON.parse(xmlHttp.responseText);
			if(response.error){
				var type = response.errorType;
				if(type === "username"){
					document.getElementById("error_username").textContent = response.error;
					setFormUsername();
				} else if(type === "password") {
					document.getElementById("error_login_pass").textContent = response.error;
				} else {
					document.getElementById("error").textContent = ((type === undefined) ? "" : type + ": ") + response.error;
				}
			} else {
				callback(response, xmlHttp.status);
			}
		}
	}
}

function setForm(name) {
	activeForm = name;
	document.getElementById(name).style.display="block";
	formIds.forEach(function(f) {
		f.style.display="none";
	});
}

function setFormUsername() {
	setForm("username_form");
	document.getElementById("username").value = "";
	document.getElementById("login_password").value = "";
	document.getElementById("register_password").value = "";
	document.getElementById("register_password2").value = "";
}

function setFormLogin() {
	setForm("login_form");
}

function setFormRegister() {
	setForm("register_form");
}


var username_action="login_button";
var baseurl=window.location.protocol + "//" + window.location.hostname + "/watsup";
document.getElementById("username")
    .addEventListener("keyup", function(event) {
		event.preventDefault();
		if (event.keyCode == 13) {
			document.getElementById(username_action).click();
		}
});

document.getElementById("login_button")
    .addEventListener("onclick", function(event) {
		username_action = "login_button";
		request(baseurl + "/login", function(response, status){
			
		}, "GET", {username: document.getElementById("username").value});
});

document.getElementById("register_button")
    .addEventListener("onclick", function(event) {
		username_action = "register_button";
		request(baseurl + "/login", function(response, status){
		}, "GET", {username: document.getElementById("username").value});
});

document.getElementById("login_button2")
    .addEventListener("onclick", function(event) {
		request(baseurl + "/login", function(response, status){
		}, "POST", {username: document.getElementById("username").value, nonce: nonce});
});

document.getElementById("register_button2")
    .addEventListener("onclick", function(event) {
		
		request(baseurl + "/login", function(response, status){
		}, "POST", {username: document.getElementById("username").value, public_key: pubkey});
});
