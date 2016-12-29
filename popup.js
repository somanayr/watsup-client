
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
				var error_label_id = "error" + activeTab.slice(0,-4);
				document.getElementById(error_label_id).textContent = response.error;
			} else {
				callback(response, xmlHttp.status);
			}
		}
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


var baseurl=window.location.protocol + "//" + window.location.hostname + "/watsup";
var encr_nonce = "";
/*document.getElementById("username")
    .addEventListener("keyup", function(event) {
		event.preventDefault();
		if (event.keyCode == 13) {
			document.getElementById(username_action).click();
		}
});*/

document.getElementById("login_button")
    .addEventListener("onclick", function(event) {
		var username = document.getElementById("username").value;
		request(baseurl + "/login", function(response, status){
			encr_nonce = response.nonce;
			var nonce = decrypt_nonce(derived_keypair(derived_password(password, window.location.hostname, username)), encr_nonce);
			request(baseurl + "/login", function(response, status){
				//TODO update plugin status
				chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
					chrome.runtime.sendMessage({tab: tabs[0]});
				});
			}, "POST", {username: username, nonce: nonce});
		}, "GET", {username: username});
});

document.getElementById("register_button")
    .addEventListener("onclick", function(event) {
		var username = document.getElementById("username").value;
		var password = document.getElementById("register_password").value;
		if(password != document.getElementById("register_password2").value) {
			document.getElementById("error_register_pass").textContent = "Passwords do not match";
			return;
		}
		var pubkey = get_public_key(derived_keypair(derived_password(password, window.location.hostname, username)));
		request(baseurl + "/login", function(response, status){
		}, "POST", {username: username, public_key: pubkey});
});


//Handles crypto calls
function derived_password(original_password, hostname, username){
	var salt = SHA256(hostname) + SHA256(username);
	var bits = sjcl.misc.pbkdf2(original_password, salt);
	var len = sjcl.bitArray.bitLength(bits);
	var chars = [];
	for(var i = 0; i < len; i += 8){
		chars.push(sjcl.bitArray.bitSlice(bits, i, i+8));
	}
	return String.fromCharCode(chars);
	
	//FIXME should use PBKDF2 instead; SHA256 is not a key derivation function
	var salted = SHA256(original_password) + salt
	var hashed = SHA256(salted);
	for(var i = 0; i < 50; i++) { //50 iterations
		hashed = SHA256(hashed + salt);
	}
	salted = 0;
	original_password = 0; //Try to get original password removed from memory ASAP
	return hashed;
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
	return cryptico.publicKeyString(key);
}
