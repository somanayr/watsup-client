
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
				}
				return;
			}
			var response = JSON.parse(xmlHttp.responseText);
			if(response.Error){
				document.getElementById("error_login").textContent = response.Error;
				document.getElementById("error_register").textContent = response.Error;
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
				encr_nonce = new Uint8Array(response);//response.nonce;
				console.log("Encrypted nonce:");console.log(encr_nonce);
				decrypt_nonce(derived_keypair(derived_password(document.getElementById("login_password").value, url.hostname, username)), encr_nonce, function(nonce){
					console.log("Nonce: ");
					console.log(nonce);
					request(baseurl + "/login/", function(response, status){
						console.log("Logged in???")
						console.log(response);
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

function decrypt_nonce(key, ciphertext, callback){
	//var hexAr = [];
	//for(var i = 0; i < encr_nonce.length; i++){
	//	hexAr.push(encr_nonce.charCodeAt(i).toString(16));
	//}
	//console.log(hexAr.join(""));
	//return key.decrypt(hexAr.join(""));
	
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
	console.log(jwk);
	crypto.importKey("jwk", jwk, {name: "RSA-OAEP", hash: {name: "SHA-1"}}, true, ["decrypt"]).then(function(mykey){
		/*var ar = new Uint8Array(cyphertext.length*2);
		for (var i=0; i<ciphertext.length; i++) {
			console.log(ciphertext.charCodeAt(i));
			ar[i*2] = ciphertext.charCodeAt(i);
			ar[i*2+1] = ciphertext.charCodeAt(i)>>8;
		}*/
		window.crypto.subtle.exportKey("pkcs8",mykey).then(function(key_buf){
			key_buffer = key_buf;
			console.log(spkiToPEM(key_buffer));
		});
		console.log(ciphertext);
		var buf = [];
		for(var i = 0; i < ciphertext.length; i++){
			buf.push((Array(2).join("0") + ciphertext[i].toString(16)).substr(-2))
		}
		console.log(cryptico.b16to64(buf.join("")));
		crypto.decrypt({name: "RSA-OAEP", hash: {name: "SHA-1"}}, mykey, ciphertext).then(function(_plaintext){
			var chars = [];
			var plaintext = new Uint8Array(_plaintext);
			for(var i = 0; i < plaintext.length; i++){
				chars.push(String.fromCharCode(plaintext[i]));
			}
			callback(chars.join(""));
		}).catch(function(err){
			console.error(err);
		});
	}).catch(function(err){
		console.error(err);
		console.error(err.stack);
	});
}

function get_public_key(key) {
	function padHexTo(hex, len) {return (Array(11).join("0")+hex).substr(-len);}
	
	
	var n = key.n.toString(16);
	var e = key.e.toString(16);
	if(n.length % 2 == 1) n = "0" + n;
	else n = "00" + n;
	if(e.length % 2 == 1) e = "0" + e;
	var base16key = "3082" + padHexTo(((n.length/2)+(e.length/2)+6).toString(16),4) + "0282" + padHexTo((n.length/2).toString(16),4) + n + "02" + padHexTo((e.length/2).toString(16),2) + e;
	console.log(["3082", padHexTo(((n.length/2)+(e.length/2)+6).toString(16),4), "0282" + padHexTo((n.length/2).toString(16),4), 0, "02", padHexTo((e.length/2).toString(16),2),e].join("\n"));
	
	var key = cryptico.b16to64(base16key);
	var spacedKey = "";
	for(var i = 0; i <= key.length; i+=63){
		spacedKey += key.substring(i, Math.min(key.length,i+63)) + "\n";
	}
	return "-----BEGIN RSA PUBLIC KEY-----\n" + spacedKey + "-----END RSA PUBLIC KEY-----"; 
}


function spkiToPEM(keydata){
    var keydataS = arrayBufferToString(keydata);
    var keydataB64 = window.btoa(keydataS);
    var keydataB64Pem = formatAsPem(keydataB64);
    return keydataB64Pem;
}

function arrayBufferToString( buffer ) {
    var binary = '';
    var bytes = new Uint8Array( buffer );
	var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode( bytes[ i ] );
    }
    return binary;
}


function formatAsPem(str) {
    var finalString = '-----BEGIN RSA PRIVATE KEY-----\n';

    while(str.length > 0) {
        finalString += str.substring(0, 64) + '\n';
        str = str.substring(64);
    }

    finalString = finalString + "-----END RSA PRIVATE KEY-----";

    return finalString;
}

var key_buffer;