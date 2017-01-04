
var errorLabelIds = ["error_login", "error_register"];
//var formIds = ["username_form", "login_form", "register_form"];

/* 
 * HTTP request function. On failure, updates error fields and calls `processing(false)`
 * URL - URL to request to
 * callback - calls back on success
 * method - (Optional) POST or GET
 * params - (Optional) POST or GET params as an object. Function will encode them
 * Response type - (optional) Mark if a special type of response is requested. Defaults to "" which returns a string
 */
function request(url, callback, method, params, responseType){
	
	//Defaul parameters
	if(responseType === undefined) responseType = "";
	if(method === undefined) method = "GET";

	if(params && method == "GET"){ //If GET request, append params to URL
		// http://stackoverflow.com/a/31713191/582136
		url = url + "?" + Object.keys(params).map(function(key){
          return encodeURIComponent(key)+"="+encodeURIComponent(params[key]);
        }).join("&");
	}

	//Set up connection
    var xmlHttp = new XMLHttpRequest();
	xmlHttp.responseType = responseType;
    xmlHttp.open( method, url, true );
	
	xmlHttp.onreadystatechange = function() { 
		if (xmlHttp.readyState == 4) { //Waits until ready
			//Reset errors after each exchange:
			errorLabelIds.forEach(function(lab) {
				document.getElementById(lab).textContent = "";
			});
			
			//If non-string response
			if(responseType !== ""){
				if(xmlHttp.status == 200) {
					callback(xmlHttp.response, xmlHttp.status); //Give raw response
				} else {
					document.getElementById("error_login").textContent = "Unknown error";
					document.getElementById("error_register").textContent = "Unknown error";
					processing(false);
				}
				return;
			}
			try{
				var response = JSON.parse(xmlHttp.responseText); //If string response, must be JSON string
				if(response.Error){ //If the server indicates an error, log it
					document.getElementById("error_login").textContent = response.Error;
					document.getElementById("error_register").textContent = response.Error;
					processing(false);
				} else {
					callback(response, xmlHttp.status);
				}
			} catch(err) {
				document.getElementById("error_login").textContent = response.Error;
				document.getElementById("error_register").textContent = response.Error;
				processing(false);
			}
		}
	}
	
	//Send data
    if(params && method == "POST"){ //If POST, encode and set params
		xmlHttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		// http://stackoverflow.com/a/31713191/582136
		xmlHttp.send(Object.keys(params).map(function(key){
          return encodeURIComponent(key)+"="+encodeURIComponent(params[key]);
        }).join("&"));
	} else { //Otherwise send nothing
		xmlHttp.send(null);
	}
}

document.getElementById("login_button")
    .addEventListener("click", function(event) {
		processing(true);
		//Step 1: get current tab
		chrome.tabs.query({active: true,currentWindow: true}, function(tabs) { 
			var tab = tabs[0];
			var url = new URL(tab.url);
			
			//Step 2: construct WATSUP request
			baseurl = url.protocol + "//" + url.host + "/watsup";
			console.log(baseurl);
			var username = document.getElementById("login_username").value;
			request(baseurl + "/auth/", function(response, status){
				encr_nonce = new Uint8Array(response); //Turn response into WebCrypto compatible response
				
				//Step 3: Decrypt the nonce
				//Here we use PBKDF2 to derive a key
				derived_password(document.getElementById("login_password").value, url.hostname, username).then(function(pass){
					return derived_keypair(pass); //Create the keypair
				}).then(function(key){
					return decrypt_nonce(key, encr_nonce); //Here we decrypt he nonce with the derived keypair
				}).then(function(nonce){
					if(nonce === undefined){
						console.log("Undefined nonce; failed to decrypt.");
						document.getElementById("error_login").textContent = "Wrong username/password";
						processing(false);
						return;
					}
					//Step 4: Return the nonce to the server
					request(baseurl + "/login/", function(response, status){
						//Step 5: Handle the fact they're we're now logged in
						console.log("Logged in???")
						console.log(response);
						//TODO response actions -- redirect, reload, nothing
						document.getElementById("error_login").textContent = "Successfully logged in!";
						processing(false);
						
						//Tell background.js to re-evaluate this tab's WATSUP status
						chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
							chrome.runtime.sendMessage({tab: tabs[0]});
						});
					}, "POST", {username: username, password: nonce});
				});
			}, "POST", {username: username}, "arraybuffer"); //Request type "arraybuffer" gives us the raw bytes of the response
		});
	});

document.getElementById("register_button")
    .addEventListener("click", function(event) {
		processing(true);
		//Step 1: figure out what tab we're in
		chrome.tabs.query({active: true,currentWindow: true}, function(tabs) {
			var tab = tabs[0];
			var url = new URL(tab.url);
			
			//Step 2: construct WATSUP register request
			baseurl = url.protocol + "//" + url.host + "/watsup";
			
			var username = document.getElementById("register_username").value;
			//Check that password fields match
			if(document.getElementById("register_password").value != document.getElementById("register_password2").value) {
				document.getElementById("error_register").textContent = "Passwords do not match";
				processing(false);
				return;
			}
			//Step 2.5 obtain the public key
			derived_password(document.getElementById("register_password").value, url.hostname, username).then(function(pass){
				return derived_keypair(pass); //Create the keypair
			}).then(function(key) {
				if(key === undefined){
					document.getElementById("error_login").textContent = "Unknown error";
					document.getElementById("error_register").textContent = "Unknown error";
					processing(false);
					return;
				}
				var pubkey = get_public_key(key); //Gets PEM encoded public key
				
				//Step 3: Send the public key
				request(baseurl + "/register/", function(response, status){
					//Step 4: Handle the fact that we're registered
					document.getElementById("login_tab_button").click();
					console.log(response);
					document.getElementById("error_login").textContent = "Successfully registered!";
					processing(false);
					//TODO response actions -- redirect, reload, nothing
				}, "POST", {username: username, public_key: pubkey});
			});
		});
	});


//Updates a loading animation GIF
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
	
/* The functions below handle crypto calls */
function derived_password(original_password, hostname, username){
	//Should we switch to window.crypto SHA256? This is pretty fast
	var salt = getUint8Buffer(SHA256(SHA256(hostname) + SHA256(username))); //Generate "salt"
	
	//First turn input password into a WebCrypto key object
	return crypto.subtle.importKey("raw",getUint8Buffer(original_password),{ "name": "PBKDF2" },false,["deriveBits"]
	).then(function (key){
		//Then run PBKDF2 with 1,000 iterations using SHA 256 to get 256 bits
		return crypto.subtle.deriveBits({"name": "PBKDF2",salt: salt,iterations: 1000,hash: {name: "SHA-256"}},key,256)
	}).then(function(bits){
		//Turn those bits into a key
		var bytes = new Uint8Array(bits);
		var chars = [];
		for(var i = 0; i < bytes.length; i++){
			chars.push(String.fromCharCode(bytes[i]));
		}
		return Promise.resolve(chars.join(""));
	});
}

function derived_keypair(derived_password){
	//We're using promises here so that in the future we can swap out a WebCrypto implementation once DeriveKey supports RSA keys
	return Promise.resolve(cryptico.generateRSAKey(derived_password, 2048)); //1024 is breakable. Keys need to last a long time.
}

function decrypt_nonce(key, ciphertext){
	
	function url64(n){ //b16 encoding -> url b64 encoding
		var s = cryptico.b16to64(n);
		return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/\=+$/, ''); //https://github.com/diafygi/webcrypto-examples/issues/7
	}
	var crypto = window.crypto.subtle;
	
	//Convert Cryptico RSA key to JWK RSA key
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
        ext: false,
	};
	//Import the key to WebCrypto
	return crypto.importKey("jwk", jwk, {name: "RSA-OAEP", hash: {name: "SHA-1"}}, false, ["decrypt"]).then(function(mykey){
		//And decrypt the ciphertext
		return crypto.decrypt({name: "RSA-OAEP", hash: {name: "SHA-1"}}, mykey, ciphertext).then(function(_plaintext){
			try{
				//And turn it into a string
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

/* Returns PEM formatted public key */
function get_public_key(key) {
	/* We do some handwavy magic here. It works, trust me. */
	function padHexTo(hex, len) {return (Array(11).join("0")+hex).substr(-len);}
	
	var n = key.n.toString(16);
	var e = key.e.toString(16);
	if(n.length % 2 == 1) n = "0" + n; //Pad to even
	else n = "00" + n; //Ensure non-negative
	if(e.length % 2 == 1) e = "0" + e; //Pad to even
	
	//Here we write the PEM key in hex
	var base16key = "3082" + padHexTo(((n.length/2)+(e.length/2)+6).toString(16),4) //Start sequence, length
		+ "0282" + padHexTo((n.length/2).toString(16),4) + n //n identifier, length, n
		+ "02" + padHexTo((e.length/2).toString(16),2)  + e; //e identifier, length, e
	
	var key = cryptico.b16to64(base16key); //Convert to b64
	
	//Insert newlines to ensure proper line length
	var spacedKey = "";
	for(var i = 0; i <= key.length; i+=63){
		spacedKey += key.substring(i, Math.min(key.length,i+63)) + "\n";
	}
	
	//Add header/footer and return
	return "-----BEGIN RSA PUBLIC KEY-----\n" + spacedKey + "-----END RSA PUBLIC KEY-----"; 
}

function getUint8Buffer(s){
	var buf = new Uint8Array(s.length);
	for(var i = 0; i < s.length; i++){
		buf[i] = s.charCodeAt(i);
	}
	return buf;
}