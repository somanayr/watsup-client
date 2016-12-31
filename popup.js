
var errorLabelIds = ["error_login", "error_register"];
//var formIds = ["username_form", "login_form", "register_form"];

function request(url, callback, method, params, responseType){
	
	if(responseType === undefined) responseType = "";

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
	xmlHttp.responseType = responseType;
    xmlHttp.open( method, url, true );
	xmlHttp.onreadystatechange = function() { 
		if (xmlHttp.readyState == 4) {
			//Reset errors after each exchange:
			errorLabelIds.forEach(function(lab) {
				document.getElementById(lab).textContent = "";
			});
			if(responseType !== ""){
				if(xmlHttp.status == 200) {
					callback(xmlHttp.response, xmlHttp.status);
				} else {
					document.getElementById("error_login").textContent = "Unknown error";
					document.getElementById("error_register").textContent = "Unknown error";
					processing(false);
				}
				return;
			}
			var response = JSON.parse(xmlHttp.responseText);
			if(response.Error){
				document.getElementById("error_login").textContent = response.Error;
				document.getElementById("error_register").textContent = response.Error;
				processing(false);
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

chrome.runtime.onMessage.addListener(function(msg){
	var tab = msg.tab;
});
var baseurl = null;


var encr_nonce = "";

document.getElementById("login_button")
    .addEventListener("click", function(event) {
		processing(true);
		chrome.tabs.query({active: true,currentWindow: true}, function(tabs) {
			var tab = tabs[0];
			var url = new URL(tab.url);
			baseurl = url.protocol + "//" + url.host + "/watsup";
			console.log(baseurl);
			var username = document.getElementById("login_username").value;
			request(baseurl + "/auth/", function(response, status){
				encr_nonce = new Uint8Array(response);//response.nonce;
				console.log("Encrypted nonce:");console.log(encr_nonce);
				derived_password(document.getElementById("login_password").value, url.hostname, username).then(function(pass){
					console.log("Pass: " + pass);
					return decrypt_nonce(derived_keypair(pass), encr_nonce);
				}).then(function(nonce){
					if(nonce === undefined){
						console.log("Undefined nonce; failed to decrypt.");
						document.getElementById("error_login").textContent = "Wrong username/password";
						processing(false);
						return;
					}
					console.log("Nonce: ");
					console.log(nonce);
					request(baseurl + "/login/", function(response, status){
						console.log("Logged in???")
						console.log(response);
						//TODO response actions -- redirect, reload, nothing
						document.getElementById("error_login").textContent = "Successfully logged in!";
						processing(false);
						
						//TODO update plugin status
						chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
							chrome.runtime.sendMessage({tab: tabs[0]});
						});
					}, "POST", {username: username, password: nonce});
				});
			}, "POST", {username: username}, "arraybuffer");
		});
	});

document.getElementById("register_button")
    .addEventListener("click", function(event) {
		processing(true);
		chrome.tabs.query({active: true,currentWindow: true}, function(tabs) {
			var tab = tabs[0];
			var url = new URL(tab.url);
			baseurl = url.protocol + "//" + url.host + "/watsup";
			
			var username = document.getElementById("register_username").value;
			if(document.getElementById("register_password").value != document.getElementById("register_password2").value) {
				document.getElementById("error_register").textContent = "Passwords do not match";
				processing(false);
				return;
			}
			derived_password(document.getElementById("register_password").value, url.hostname, username).then(function(pass){
				return Promise.resolve(derived_keypair(pass));
			}).then(function(key) {
				if(key === undefined){
					document.getElementById("error_login").textContent = "Unknown error";
					document.getElementById("error_register").textContent = "Unknown error";
					processing(false);
					return;
				}
				var pubkey = get_public_key(key);
				request(baseurl + "/register/", function(response, status){
					document.getElementById("login_tab_button").click();
					//TODO add user feedback
					console.log(response);
					//TODO response actions -- redirect, reload, nothing
					document.getElementById("error_login").textContent = "Successfully registered!";
					processing(false);
				}, "POST", {username: username, public_key: pubkey});
			});
		});
	});


function processing(start){
	var elems = document.getElementsByClassName("loading");
	for (var i = 0; i < elems.length; i++){
		if(start){
			elems[i].className += " active";
		} else {
			elems[i].className = elems[i].className.replace(" active", "");
		}
	};
}
	
//Handles crypto calls
function derived_password(original_password, hostname, username){
	var salt = getUint8Buffer(SHA256(SHA256(hostname) + SHA256(username)));
	
	return crypto.subtle.importKey(
		"raw",
		getUint8Buffer(original_password),
		{ "name": "PBKDF2" },
		false,
		["deriveBits"]
	).then(function (key){
		console.log(key);
		return crypto.subtle.deriveBits({"name": "PBKDF2",salt: salt,iterations: 1000,hash: {name: "SHA-256"}},key,256)
	}).then(function(bits){
		var bytes = new Uint8Array(bits);
		var chars = [];
		for(var i = 0; i < bytes.length; i++){
			chars.push(String.fromCharCode(bytes[i]));
		}
		return Promise.resolve(chars.join(""));
	});
	//TODO: switch to window.crypto
	var salt = SHA256(SHA256(hostname) + SHA256(username));
	var bits = sjcl.misc.pbkdf2(original_password, salt);
	var len = sjcl.bitArray.bitLength(bits);
	var chars = [];
	for(var i = 0; i < len; i += 8){
		chars.push(String.fromCharCode(sjcl.bitArray.extract(bits, i, 8)));
	}
	return (chars).join("");
}

function derived_keypair(derived_password){
	return cryptico.generateRSAKey(derived_password, 2048); //1024 is breakable. Keys need to last a long time.
}

function decrypt_nonce(key, ciphertext){
	
	function url64(n){
		var s = cryptico.b16to64(n);
		return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/\=+$/, ''); //https://github.com/diafygi/webcrypto-examples/issues/7
	}
	var crypto = window.crypto.subtle;
	jwk = {
		kty: "RSA",
		n:url64(key.n.toString(16)),
		e:url64(key.e.toString(16)),
		d:url64(key.d.toString(16)),
		p:url64(key.p.toString(16)),
		q:url64(key.q.toString(16)),
		dp:url64(key.dmp1.toString(16)),
		dq:url64(key.dmq1.toString(16)),
		qi:url64(key.coeff.toString(16)),
		alg: "RSA-OAEP",
        ext: true,
	};
	return crypto.importKey("jwk", jwk, {name: "RSA-OAEP", hash: {name: "SHA-1"}}, true, ["decrypt"]).then(function(mykey){
		return crypto.decrypt({name: "RSA-OAEP", hash: {name: "SHA-1"}}, mykey, ciphertext).then(function(_plaintext){
			try{
				var chars = [];
				var plaintext = new Uint8Array(_plaintext);
				for(var i = 0; i < plaintext.length; i++){
					chars.push(String.fromCharCode(plaintext[i]));
				}
				return Promise.resolve(chars.join(""));
			} catch (err){
				console.error(err);
			}
		}, function(err){console.error(err);});
	}, function(err){console.error(err);});
}

//Returns PEM formatted public key
function get_public_key(key) {
	function padHexTo(hex, len) {return (Array(11).join("0")+hex).substr(-len);}
	
	
	var n = key.n.toString(16);
	var e = key.e.toString(16);
	if(n.length % 2 == 1) n = "0" + n;
	else n = "00" + n;
	if(e.length % 2 == 1) e = "0" + e;
	var base16key = "3082" + padHexTo(((n.length/2)+(e.length/2)+6).toString(16),4) + "0282" + padHexTo((n.length/2).toString(16),4) + n + "02" + padHexTo((e.length/2).toString(16),2) + e;
	
	var key = cryptico.b16to64(base16key);
	var spacedKey = "";
	for(var i = 0; i <= key.length; i+=63){
		spacedKey += key.substring(i, Math.min(key.length,i+63)) + "\n";
	}
	return "-----BEGIN RSA PUBLIC KEY-----\n" + spacedKey + "-----END RSA PUBLIC KEY-----"; 
}

function getUint8Buffer(s){
	var buf = new Uint8Array(s.length);
	for(var i = 0; i < s.length; i++){
		buf[i] = s.charCodeAt(i);
	}
	return buf;
}