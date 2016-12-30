
var errorLabelIds = ["error_login", "error_register"];
//var formIds = ["username_form", "login_form", "register_form"];

function request(url, callback, method, params){

	if(method === undefined){
		method = "GET";
	}

	if(params && method == "GET"){
		// http://stackoverflow.com/a/31713191/582136
		url = url + "?" + Object.keys(params).map(function(key){
          return encodeURIComponent(key)+"="+encodeURIComponent(params[key]);
        }).join("&");
	}

    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( method, url, true );
	xmlHttp.onreadystatechange = function() { 
		if (xmlHttp.readyState == 4) {
			//Reset errors after each exchange:
			errorLabelIds.forEach(function(lab) {
				document.getElementById(lab).textContent = "";
			});
			var response;
			try {
				response = JSON.parse(xmlHttp.responseText);
			} catch(e) {
				if(!(e instanceof SyntaxError)){
					throw e;
				}
				if(xmlHttp.status == 200) {
					callback(xmlHttp.responseText, xmlHttp.status);
				}
				console.log(xmlHttp.responseText);
				return;
			}
			if(response.error){
				var error_label_id = "error" + activeTab.slice(0,-4);
				document.getElementById(error_label_id).textContent = response.error;
			} else {
				callback(response, xmlHttp.status);
			}
		}
	}
    if(params && method == "POST"){
		xmlHttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		// http://stackoverflow.com/a/31713191/582136
		xmlHttp.send(Object.keys(params).map(function(key){
          return encodeURIComponent(key)+"="+encodeURIComponent(params[key]);
        }).join("&"));
	} else {
		xmlHttp.send(null);
	}
}

/*function setForm(name) {
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
}*/

chrome.runtime.onMessage.addListener(function(msg){
	var tab = msg.tab;
});
var baseurl = null;


var encr_nonce = "";
/*document.getElementById("username")
    .addEventListener("keyup", function(event) {
		event.preventDefault();
		if (event.keyCode == 13) {
			document.getElementById(username_action).click();
		}
});*/

document.getElementById("login_button")
    .addEventListener("click", function(event) {
		chrome.tabs.query({
			active: true,               // Select active tabs
			currentWindow: true     // In the current window
		}, function(array_of_Tabs) {
			// Since there can only be one active tab in one active window, 
			//  the array has only one element
			var tab = array_of_Tabs[0];
			// Example:
			var url = tab.url;
			var url = new URL(tab.url);
			baseurl = url.protocol + "//" + url.host + "/watsup";
			console.log(baseurl);
			// ... do something with url variable
			var username = document.getElementById("login_username").value;
			request(baseurl + "/auth/", function(response, status){
				encr_nonce = response;//response.nonce;
				console.log("Encrypted nonce: " + encr_nonce);
				var nonce = decrypt_nonce(derived_keypair(derived_password(document.getElementById("login_password").value, url.hostname, username)), encr_nonce);
				console.log("Nonce: " + nonce);
				request(baseurl + "/login/", function(response, status){
					console.log("Logged in???")
					console.log(response);
					//TODO update plugin status
					chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
						chrome.runtime.sendMessage({tab: tabs[0]});
					});
				}, "POST", {username: username, password: nonce});
			}, "POST", {username: username});
		});
	});

document.getElementById("register_button")
    .addEventListener("click", function(event) {
		chrome.tabs.query({
			active: true,               // Select active tabs
			currentWindow: true     // In the current window
		}, function(array_of_Tabs) {
			// Since there can only be one active tab in one active window, 
			//  the array has only one element
			var tab = array_of_Tabs[0];
			// Example:
			var url = new URL(tab.url);
			baseurl = url.protocol + "//" + url.host + "/watsup";
			console.log(baseurl);
			
			var username = document.getElementById("register_username").value;
			if(document.getElementById("register_password").value != document.getElementById("register_password2").value) {
				document.getElementById("error_register").textContent = "Passwords do not match";
				return;
			}
			var pubkey = get_public_key(derived_keypair(derived_password(document.getElementById("register_password").value, url.hostname, username)));
			console.log(pubkey);
			//return;
			request(baseurl + "/register/", function(response, status){
					console.log("Registered???")
					console.log(response);
			}, "POST", {username: username, public_key: pubkey});
		});
	});


//Handles crypto calls
function derived_password(original_password, hostname, username){
	console.log(original_password + ", " + hostname + ", " + username);
	var salt = SHA256(SHA256(hostname) + SHA256(username));
	console.log("Salt: " + salt);
	var bits = sjcl.misc.pbkdf2(original_password, salt);
	console.log(bits);
	var len = sjcl.bitArray.bitLength(bits);
	var chars = [];
	for(var i = 0; i < len; i += 8){
		console.log(sjcl.bitArray.extract(bits, i, 8));
		console.log(String.fromCharCode(sjcl.bitArray.extract(bits, i, 8)));
		chars.push(String.fromCharCode(sjcl.bitArray.extract(bits, i, 8)));
	}
	console.log(chars);
	console.log("Derived key: " + (chars).join(""));
	return (chars).join("");
}

function derived_keypair(derived_password){
	return cryptico.generateRSAKey(derived_password, 2048); //1024 is breakable. Keys need to last a long time.
}

function decrypt_nonce(key, encr_nonce){
	var status = cryptico.decrypt(encr_nonce, key);
	//TODO: use signature to verify integrity
	return status.plaintext;
}

function get_public_key(key) {
	return "-----BEGIN RSA PUBLIC KEY-----\n" + cryptico.publicKeyString(key) + "\n-----END RSA PUBLIC KEY-----"; 
}
