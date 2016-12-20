//Handles form interception
function analyze_form(form){
	if(!has_password_field(form)) return false;

	form.onsubmit = on_form_sent;
	return true;
}

function add_form_listeners(){
	var count = 0;
	for (var i = 0; i < document.forms.length; i++) {
		var form = document.forms[i];
		if(analyze_form(form)) count++;
	}
	console.log("Attached listeners to " + count + " forms");
}

function has_password_field(form){
	for(var j = 0; j < form.elements.length; j++){
		var field = form.elements[j];
		if(field.type == "password"){ //Identify as password field
			return true;
		}
	}
}

function add_observer(){
	//Lets go NSA on this page
	var onUpdate = function(mutation) {
		console.log("Update deteced");
		//FIXME improve -- should only evaluate forms that were modified
		add_form_listeners();
	}
	var config = { attributes: true, childList: true, characterData: true, subtree: true}; //Things to watch for i.e. everything
	var obs = new MutationObserver(onUpdate);
	obs.observe(document.body, config); //observe everything
}


//Handles swap out of form variables
function on_form_sent(event){
	console.log(event)
	form = event.target
	var data = extract_form_fields(form);
	
	console.log(event);
	
	console.log("Extracted form fields: ");
	console.log(data)
	
	if(data[0].length == 0){
		return true; //No action necessary, not a password form
	}
	if(data[1] == -1){
		alert("Unable to continue; Unknown username");
		return false;
	} else if (data[0].length > 2) {
		alert("More than 2 password fields");
		return false;
	} else if (data[0].length == 1){
		console.log("Is login");
		var username = form.elements[data[1]].value;
		//FIXME: Might be worth asking if we've never seen this username on this site
		var keypair = derived_keypair(derived_password(form.elements[data[0][0]].value, username, window.location.hostname));
		//var nonce = get_nonce(form, username, location.protocol + "//" + window.location.host);
		nonce = cryptico.encrypt("ITestThe*W4tsupCl13nt)(", get_public_key(keypair)).cipher; //Hardcoded encrypted "nonce" password
		var nonce = decrypt_nonce(keypair, nonce);
		console.log("Nonce:" + nonce);
		form.elements[data[0][0]].value = nonce;
	} else if (data[0].length == 2) {
		console.log("Is registration");
		//Note this check really isn't a great solution. Someone could easily duplicate the contents of one field into a hidden field and we wouldn't know. They could then recover the public key and do an offline attack against the password
		if (form.elements[data[0][0]].value !== form.elements[data[0][1]].value){ 
			console.log(form.elements[data[0][0]].value);
			console.log(form.elements[data[0][1]].value);
			alert("Mismatched password fields -- is this actually a registration form?");
			return false;
		}
		var username = form.elements[data[1]].value;
		var keypair = derived_keypair(derived_password(form.elements[data[0][0]].value, username, window.location.hostname));
		var pubkey = get_public_key(keypair);
		console.log(pubkey);
		form.elements[data[0][0]].value = pubkey;
		form.elements[data[0][1]].value = pubkey;
	} else {
		alert("Unknown case. Please report to devs");
		return false;
	}
	console.log(form.elements[data[0][0]].value);
	return true;
}

function get_nonce(form, username, hostname){
	xhr.open("POST", hostname + "/auth", false); //synchronous
	xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
	xhr.send(JSON.stringify({
		username: username,
	}));
	return xhr.responseText;
}
	
function extract_form_fields(form){
	password_fields = []; //Len 1 -> login; Len 2 -> Registration, must match value; Len 3 -> Suspicious
	username_field = -1; //If -1, username field could not be identified
	for(var j = 0; j < form.elements.length; j++){
		var field = form.elements[j];
		if(field.type == "password"){ //Identify as password field
			password_fields.push(j);
		}
	}
	
	if(password_fields.length >= 1){ //Should look for a username field
		//FIXME this needs to be seriously improved. Looking for the first field up could cause problems.
		//Since the username is half of the salt, failure is very bad
		for(var j = password_fields[0]; j >= 0; j--){ //Finds the first text field above the first password field
			var field = form.elements[j];
			if(field.type == "email" || field.type == "text"){
				username_field = j;
				break;
			}
		}
	}
	
	return [password_fields, username_field];
}

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

//Main
function main(){
	console.log("Initializing");
	add_observer();
	add_form_listeners();
}
main();